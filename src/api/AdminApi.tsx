import { useEffect, useState } from "react"
import { useApp } from "../context"
import {
  Button,
  Empty,
  Heading,
  Icon,
  IconButton,
  Input,
  Modal,
  Select,
} from "../ui"
import { Pagination } from "../Store"
import { api, ApiError, isRecord, type Query } from "./client"
import { number, pageData, rows, text, treeRows, type Row } from "./adapters"
import { ApiFailure, ApiLoading, errorMessage, useBackend } from "./Backend"
import { ApiAccount } from "./CommerceApi"
import { AdminOrdersApi } from "./AdminOrdersApi"
import { CatalogPayload } from "./CatalogPayload"
import { LocationSyncAction } from "./AddressApi"

function PageTitle({
  title,
  children,
}: {
  title: string
  children?: React.ReactNode
}) {
  return (
    <div className="admin-page-title">
      <div>
        <span className="eyebrow">SPRING BOOT · API DATA</span>
        <Heading level={1}>{title}</Heading>
        <p>Dữ liệu và thay đổi được gửi tới backend đã cấu hình.</p>
      </div>
      <div className="button-row">{children}</div>
    </div>
  )
}
function Search({
  value,
  onChange,
}: {
  value: string
  onChange: (v: string) => void
}) {
  return (
    <Input
      aria-label="Tìm kiếm"
      placeholder="Tìm kiếm…"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}
export function ApiAdminSection({ section }: { section: string }) {
  const backend = useBackend()
  const { navigate } = useApp()
  if (!backend.identity)
    return (
      <Empty
        icon="shield"
        title="Đăng nhập để quản lý"
        text="Admin API sử dụng JWT thật. Không cấp quyền từ tài khoản demo."
      >
        <Button onClick={() => navigate("/auth/login")}>Đăng nhập</Button>
      </Empty>
    )
  if (!backend.canManage)
    return (
      <Empty
        icon="shield"
        title="Không có quyền quản lý"
        text="Các thao tác quản lý yêu cầu ADMIN hoặc STAFF. Backend vẫn là nơi thực thi quyền truy cập."
      >
        <Button onClick={() => navigate("/")}>Về cửa hàng</Button>
      </Empty>
    )
  if (section === "products") return <ApiProducts />
  if (section === "brands" || section === "categories")
    return <ApiTaxonomy key={section} kind={section} />
  if (section === "customers") return <ApiUsers />
  if (section === "orders") return <AdminOrdersApi />
  if (section === "profile") return <ApiAccount />
  if (section === "settings")
    return (
      <>
        <PageTitle title="Cấu hình kết nối" />
        <div className="admin-panel api-panel-pad">
          <Heading level={3}>Backend Spring Boot</Heading>
          <p className="mock-note">{backend.baseUrl}</p>
          <Button onClick={backend.showSettings}>
            Đổi Base URL / nguồn dữ liệu
          </Button>
          <LocationSyncAction />
          <p className="mock-note">
            Không có Settings API trong tài liệu. Không gửi cấu hình cửa hàng
            hoặc thông báo tới endpoint tự đặt.
          </p>
        </div>
        <ApiFiles />
      </>
    )
  return (
    <>
      <PageTitle
        title={
          section === "inventory"
            ? "Inventory"
            : section === "orders"
              ? "Orders"
              : "Dashboard"
        }
      />
      <Empty
        icon="chart"
        title="Chưa có API cho màn hình này"
        text={
          section === "inventory"
            ? "Chưa có stock adjustment/history API. Có thể quản lý stock của biến thể qua Products → Variants bằng endpoint đã cung cấp."
            : "Chưa có API thống kê doanh thu / dashboard. Đơn hàng và thanh toán của khách đã có màn hình API riêng."
        }
      >
        <Button variant="secondary" onClick={backend.showSettings}>
          Xem giao diện ở chế độ demo
        </Button>
      </Empty>
    </>
  )
}

function ApiProducts() {
  const backend = useBackend()
  const { route, navigate, toast } = useApp()
  const [keyword, setKeyword] = useState("")
  const [status, setStatus] = useState("")
  const [page, setPage] = useState(1)
  const [data, setData] = useState<{
    items: Row[]
    pages: number
    total: number
  }>({ items: [], pages: 1, total: 0 })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [reload, setReload] = useState(0)
  const [selected, setSelected] = useState<Row | null>(null)
  const [dialog, setDialog] = useState("")
  const [busy, setBusy] = useState(false)
  const [operation, setOperation] = useState("POST")
  const [resource, setResource] = useState("product")
  const [childId, setChildId] = useState("")
  const [payload, setPayload] = useState("")
  const [detail, setDetail] = useState<unknown>(null)
  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError("")
    const timer = setTimeout(
      () =>
        void api.products
          .search(
            {
              keyword,
              status,
              page: page - 1,
              size: 10,
              sortBy: "id",
              sortDirection: "DESC",
            },
            controller.signal,
          )
          .then((value) => setData(pageData(value)))
          .catch((e) => {
            if (!controller.signal.aborted) setError(errorMessage(e))
          })
          .finally(() => {
            if (!controller.signal.aborted) setLoading(false)
          }),
      250,
    )
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [keyword, status, page, reload])
  const open = (row: Row | null, action: string) => {
    setSelected(row)
    setDialog(action)
    setPayload("")
    setError("")
    setResource("product")
    setChildId("")
    setOperation(action === "create" ? "POST" : "PUT")
    setDetail(null)
    if (row && action !== "delete")
      void api.products
        .byId(text(row.id))
        .then((value) => setDetail(value))
        .catch((e) => setError(errorMessage(e)))
  }
  useEffect(() => {
    if (route.split("/")[3] === "new") {
      setSelected(null)
      setDialog("create")
      setOperation("POST")
      setResource("product")
    }
  }, [route])
  const close = () => {
    setDialog("")
    if (route.endsWith("/new")) navigate("/admin/products")
  }
  const submit = async () => {
    setError("")
    setBusy(true)
    try {
      const productId = selected ? text(selected.id) : ""
      if (dialog === "delete") await api.products.delete(productId)
      else {
        let body: unknown
        if (operation !== "DELETE") {
          try {
            body = JSON.parse(payload)
          } catch {
            throw new ApiError("Payload phải là JSON hợp lệ.")
          }
          if (!isRecord(body))
            throw new ApiError("Payload phải là một JSON object.")
          const value = body as Row
          if (
            resource === "product" &&
            (["name", "slug", "description"].some(
              (key) => !text(value[key]).trim(),
            ) ||
              Number(value.price) <= 0 ||
              Number(value.categoryId) <= 0 ||
              Number(value.brandId) <= 0)
          )
            throw new ApiError(
              "Điền tên, slug, mô tả, danh mục, thương hiệu và giá gốc > 0.",
            )
          if (
            resource === "product" &&
            value.salePrice !== null &&
            value.salePrice !== undefined &&
            (Number(value.salePrice) <= 0 ||
              Number(value.salePrice) >= Number(value.price))
          )
            throw new ApiError("Giá khuyến mãi phải > 0 và thấp hơn giá gốc.")
          if (
            resource === "attributes" &&
            (!text(value.attrName).trim() || !text(value.attrValue).trim())
          )
            throw new ApiError("Điền attrName và attrValue.")
          if (resource === "colors" && !text(value.colorName).trim())
            throw new ApiError("Điền colorName.")
          if (
            resource === "images" &&
            (!text(value.url).trim() || Number(value.colorId) <= 0)
          )
            throw new ApiError("Điền URL ảnh và colorId thật của sản phẩm.")
        }
        if (resource === "product") {
          if (!selected) await api.products.create(body)
          else await api.products.update(productId, body)
        } else {
          if (!productId)
            throw new ApiError("Tạo sản phẩm trước khi quản lý tài nguyên con.")
          if (operation !== "POST" && !childId)
            throw new ApiError("Nhập ID tài nguyên con để sửa hoặc xóa.")
          if (resource === "variants" && operation !== "DELETE") {
            if (
              !isRecord(body) ||
              typeof body.sku !== "string" ||
              !body.sku.trim()
            )
              throw new ApiError("Variant cần có SKU.")
            if (!Number.isInteger(body.stock) || Number(body.stock) < 0)
              throw new ApiError("Stock phải là số nguyên không âm.")
            if (!Number.isInteger(body.colorId) || Number(body.colorId) <= 0)
              throw new ApiError(
                "Color ID phải là ID dương của màu đã tồn tại.",
              )
          }
          await api.products.child(
            productId,
            resource as "variants",
            operation as "POST" | "PUT" | "DELETE",
            body,
            childId || undefined,
          )
        }
      }
      toast("Backend đã xác nhận thao tác.")
      close()
      setReload((n) => n + 1)
      void backend.reload()
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }
  return (
    <>
      <PageTitle title="Products">
        <Button variant="dark" onClick={() => open(null, "create")}>
          <Icon name="plus" size={16} />
          Thêm sản phẩm
        </Button>
      </PageTitle>
      <section className="admin-panel">
        <div className="table-toolbar">
          <Search
            value={keyword}
            onChange={(v) => {
              setKeyword(v)
              setPage(1)
            }}
          />
          <Select
            aria-label="Trạng thái sản phẩm"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value)
              setPage(1)
            }}
          >
            <option value="">Tất cả trạng thái</option>
            {["DRAFT", "ACTIVE", "OUT_OF_STOCK", "DISCONTINUED"].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </Select>
        </div>
        {loading ? (
          <ApiLoading />
        ) : error && !dialog ? (
          <ApiFailure error={error} retry={() => setReload((n) => n + 1)} />
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Sản phẩm</th>
                  <th>Giá backend</th>
                  <th>Trạng thái</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {data.items.map((row) => (
                  <tr key={text(row.id)}>
                    <td>{text(row.id)}</td>
                    <td>
                      <Button
                        variant="ghost"
                        onClick={() => open(row, "detail")}
                      >
                        {text(row.name)}
                      </Button>
                    </td>
                    <td>
                      {text(
                        row.salePrice || row.price || row.regularPrice,
                        "—",
                      )}
                    </td>
                    <td>{text(row.productStatus ?? row.status, "—")}</td>
                    <td>
                      <div className="table-actions">
                        <IconButton
                          name="edit"
                          label="Sửa sản phẩm"
                          onClick={() => open(row, "edit")}
                        />
                        <Button
                          variant="ghost"
                          onClick={() => {
                            open(row, "edit")
                            setResource("variants")
                            setOperation("POST")
                          }}
                        >
                          Variants
                        </Button>
                        {backend.isAdmin && (
                          <IconButton
                            name="trash"
                            label="Xóa sản phẩm"
                            onClick={() => open(row, "delete")}
                          />
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!data.items.length && (
              <Empty
                title="Không có sản phẩm"
                text="Backend trả danh sách rỗng."
              />
            )}
          </div>
        )}
        <Pagination
          page={page}
          total={Math.max(1, data.pages)}
          onChange={setPage}
        />
      </section>
      <ApiFiles />
      {dialog && (
        <Modal
          wide
          title={
            dialog === "delete"
              ? "Xóa sản phẩm thật?"
              : dialog === "detail"
                ? text(selected?.name)
                : selected
                  ? `Quản lý ${text(selected.name)}`
                  : "Tạo sản phẩm"
          }
          onClose={close}
        >
          {dialog === "delete" ? (
            <>
              <p>
                DELETE /products/{text(selected?.id)}. Thao tác chỉ dành cho
                ADMIN.
              </p>
              {error && (
                <p className="error-text" role="alert">
                  {error}
                </p>
              )}
              <div className="modal-actions">
                <Button variant="secondary" onClick={close}>
                  Hủy
                </Button>
                <Button disabled={busy} onClick={() => void submit()}>
                  Xác nhận xóa
                </Button>
              </div>
            </>
          ) : dialog === "detail" ? (
            <>
              {error && (
                <p className="error-text" role="alert">
                  {error}
                </p>
              )}
              <pre className="api-json">{JSON.stringify(detail, null, 2)}</pre>
              <Button
                onClick={() => {
                  setDialog("edit")
                  setOperation("PUT")
                }}
              >
                Chỉnh sửa
              </Button>
            </>
          ) : (
            <div className="dialog-form">
              {selected && (
                <div className="form-grid">
                  <Select
                    label="Tài nguyên"
                    value={resource}
                    onChange={(e) => {
                      setResource(e.target.value)
                      setPayload("")
                      setOperation(
                        e.target.value === "product" ? "PUT" : "POST",
                      )
                    }}
                  >
                    <option value="product">Product</option>
                    {["attributes", "colors", "images", "variants"].map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </Select>
                  {resource !== "product" && (
                    <Select
                      label="Thao tác"
                      value={operation}
                      onChange={(e) => setOperation(e.target.value)}
                    >
                      <option>POST</option>
                      <option>PUT</option>
                      <option>DELETE</option>
                    </Select>
                  )}
                </div>
              )}
              {resource !== "product" && operation !== "POST" && (
                <Input
                  label="ID tài nguyên con"
                  value={childId}
                  onChange={(e) => setChildId(e.target.value)}
                  required
                />
              )}
              {resource === "variants" && operation !== "DELETE" ? (
                <VariantPayload onChange={setPayload} />
              ) : operation !== "DELETE" ? (
                <>
                  <CatalogPayload
                    resource={resource}
                    detail={detail}
                    childId={childId}
                    operation={operation}
                    onChange={setPayload}
                  />
                  <p className="mock-note">
                    Các trường được đối chiếu với request DTO Java đính kèm.
                    JSON bên dưới cho phép kiểm tra payload trước khi gửi.
                  </p>
                  <label className="field">
                    <span>Request JSON</span>
                    <textarea
                      className="api-json-input"
                      rows={9}
                      value={payload}
                      onChange={(e) => setPayload(e.target.value)}
                      placeholder="Nhập request JSON theo DTO backend"
                    />
                  </label>
                </>
              ) : null}
              {detail !== null && (
                <details>
                  <summary>Response chi tiết để tham chiếu</summary>
                  <pre className="api-json">
                    {JSON.stringify(detail, null, 2)}
                  </pre>
                </details>
              )}
              {error && (
                <p className="error-text" role="alert">
                  {error}
                </p>
              )}
              <div className="modal-actions">
                <Button variant="secondary" onClick={close}>
                  Hủy
                </Button>
                <Button
                  disabled={busy || (operation !== "DELETE" && !payload.trim())}
                  onClick={() => void submit()}
                >
                  {busy ? "Đang gửi…" : "Gửi tới backend"}
                </Button>
              </div>
            </div>
          )}
        </Modal>
      )}
    </>
  )
}
function VariantPayload({ onChange }: { onChange: (payload: string) => void }) {
  const [variant, setVariant] = useState({
    sku: "",
    size: "",
    stock: 0,
    active: "ACTIVE",
    inventoryStatus: "IN_STOCK",
    colorId: 0,
  })
  useEffect(() => {
    onChange(JSON.stringify(variant))
  }, [variant, onChange])
  return (
    <div className="form-grid">
      <Input
        label="SKU"
        value={variant.sku}
        onChange={(e) => setVariant({ ...variant, sku: e.target.value })}
        required
      />
      <Input
        label="Size"
        value={variant.size}
        onChange={(e) => setVariant({ ...variant, size: e.target.value })}
      />
      <Input
        label="Stock"
        type="number"
        min="0"
        value={variant.stock}
        onChange={(e) => setVariant({ ...variant, stock: +e.target.value })}
      />
      <Input
        label="Color ID"
        type="number"
        min="0"
        value={variant.colorId}
        onChange={(e) => setVariant({ ...variant, colorId: +e.target.value })}
      />
      <Input
        label="active"
        value={variant.active}
        onChange={(e) => setVariant({ ...variant, active: e.target.value })}
      />
      <Input
        label="inventoryStatus"
        value={variant.inventoryStatus}
        onChange={(e) =>
          setVariant({ ...variant, inventoryStatus: e.target.value })
        }
      />
    </div>
  )
}

function ApiTaxonomy({ kind }: { kind: "categories" | "brands" }) {
  const backend = useBackend()
  const { toast } = useApp()
  const category = kind === "categories"
  const [data, setData] = useState<Row[]>([])
  const [keyword, setKeyword] = useState("")
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [retry, setRetry] = useState(0)
  const [selected, setSelected] = useState<Row | null>(null)
  const [dialog, setDialog] = useState("")
  const [busy, setBusy] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState("")
  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError("")
    const timer = setTimeout(
      () =>
        void (
          category
            ? api.categories.tree(controller.signal)
            : api.brands.search(
                {
                  keyword,
                  page: page - 1,
                  size: 10,
                  sortBy: "name",
                  sortDirection: "ASC",
                },
                controller.signal,
              )
        )
          .then((value) => {
            if (category) {
              setData(treeRows(value))
              setPages(1)
            } else {
              const p = pageData(value)
              setData(p.items)
              setPages(p.pages)
            }
          })
          .catch((e) => {
            if (!controller.signal.aborted) setError(errorMessage(e))
          })
          .finally(() => {
            if (!controller.signal.aborted) setLoading(false)
          }),
      250,
    )
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [category, keyword, page, retry])
  useEffect(() => {
    if (!file) {
      setPreview("")
      return
    }
    const url = URL.createObjectURL(file)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [file])
  const open = (record: Row | null, type: string) => {
    setSelected(record)
    setDialog(type)
    setFile(null)
    setError("")
  }
  const list = category
    ? data.filter((r) =>
        text(r.name).toLowerCase().includes(keyword.toLowerCase()),
      )
    : data
  return (
    <>
      <PageTitle title={category ? "Categories" : "Brands"}>
        <Button variant="dark" onClick={() => open(null, "edit")}>
          <Icon name="plus" size={16} />
          Thêm {category ? "danh mục" : "thương hiệu"}
        </Button>
      </PageTitle>
      <section className="admin-panel">
        <div className="table-toolbar">
          <Search
            value={keyword}
            onChange={(v) => {
              setKeyword(v)
              setPage(1)
            }}
          />
        </div>
        {loading ? (
          <ApiLoading />
        ) : error && !dialog ? (
          <ApiFailure error={error} retry={() => setRetry((n) => n + 1)} />
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Tên</th>
                  <th>Slug</th>
                  {category && <th>Parent ID</th>}
                  <th />
                </tr>
              </thead>
              <tbody>
                {list.map((row) => (
                  <tr key={text(row.id)}>
                    <td>{text(row.id)}</td>
                    <td>
                      <Button variant="ghost" onClick={() => open(row, "edit")}>
                        {text(row.name)}
                      </Button>
                    </td>
                    <td>{text(row.slug)}</td>
                    {category && (
                      <td>
                        {text(
                          row.parentId ??
                            (isRecord(row.parent) ? row.parent.id : undefined),
                          "—",
                        )}
                      </td>
                    )}
                    <td>
                      <div className="table-actions">
                        <IconButton
                          name="edit"
                          label="Chỉnh sửa"
                          onClick={() => open(row, "edit")}
                        />
                        {!category && (
                          <Button
                            variant="ghost"
                            onClick={() => open(row, "logo")}
                          >
                            Logo URL
                          </Button>
                        )}
                        {backend.isAdmin && (
                          <IconButton
                            name="trash"
                            label="Xóa"
                            onClick={() => open(row, "delete")}
                          />
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!list.length && (
              <Empty title="Danh sách trống" text="Không có bản ghi phù hợp." />
            )}
          </div>
        )}
        {!category && (
          <Pagination
            page={page}
            total={Math.max(1, pages)}
            onChange={setPage}
          />
        )}
      </section>
      {dialog && (
        <Modal
          title={
            dialog === "delete"
              ? "Xác nhận xóa?"
              : dialog === "logo"
                ? "Cập nhật logo URL"
                : `${selected ? "Sửa" : "Thêm"} ${
                    category ? "danh mục" : "thương hiệu"
                  }`
          }
          onClose={() => setDialog("")}
        >
          <form
            className="dialog-form"
            onSubmit={async (e) => {
              e.preventDefault()
              const form = new FormData(e.currentTarget)
              setBusy(true)
              setError("")
              try {
                if (dialog === "delete") {
                  if (!backend.isAdmin)
                    throw new ApiError("Yêu cầu quyền ADMIN.")
                  await (category
                    ? api.categories.delete(text(selected?.id))
                    : api.brands.delete(text(selected?.id)))
                } else if (dialog === "logo")
                  await api.brands.logo(
                    text(selected?.id),
                    String(form.get("logoUrl")),
                  )
                else if (category)
                  await api.categories.save(
                    {
                      name: String(form.get("name")),
                      slug: String(form.get("slug")),
                      parentId: Number(form.get("parentId")) || null,
                      displayOrder: Number(form.get("displayOrder")),
                    },
                    selected ? text(selected.id) : undefined,
                  )
                else {
                  let body: FormData | {
                    name: string
                    slug: string
                  } = {
                    name: String(form.get("name")),
                    slug: String(form.get("slug")),
                  }
                  if (file) {
                    const multipart = new FormData()
                    multipart.set("name", body.name)
                    multipart.set("slug", body.slug)
                    multipart.set("logo", file)
                    body = multipart
                  }
                  await (selected
                    ? api.brands.update(text(selected.id), body)
                    : api.brands.create(body))
                }
                setDialog("")
                setRetry((n) => n + 1)
                void backend.reload()
                toast("Backend đã lưu thay đổi.")
              } catch (e) {
                setError(errorMessage(e))
              } finally {
                setBusy(false)
              }
            }}
          >
            {dialog === "delete" ? (
              <p>
                Xóa {text(selected?.name)} trên backend. Không thể hoàn tác.
              </p>
            ) : dialog === "logo" ? (
              <Input name="logoUrl" label="Logo URL" type="url" required />
            ) : (
              <>
                <Input
                  name="name"
                  label="Tên"
                  defaultValue={text(selected?.name)}
                  required
                />
                <Input
                  name="slug"
                  label="Slug"
                  defaultValue={text(selected?.slug)}
                  required
                />
                {category ? (
                  <div className="form-grid">
                    <Select
                      name="parentId"
                      label="Danh mục cha"
                      defaultValue={text(selected?.parentId, "0")}
                    >
                      <option value="0">Không có (parentId = 0)</option>
                      {backend.categories
                        .filter((c) => c.id !== selected?.id)
                        .map((c) => (
                          <option key={text(c.id)} value={text(c.id)}>
                            {text(c.name)}
                          </option>
                        ))}
                    </Select>
                    <Input
                      name="displayOrder"
                      label="Thứ tự hiển thị"
                      type="number"
                      defaultValue={number(selected?.displayOrder, 1)}
                      required
                    />
                  </div>
                ) : (
                  <label className="upload-zone compact">
                    {preview ? (
                      <img src={preview} alt="Logo preview" />
                    ) : (
                      <>
                        <Icon name="upload" />
                        <span>Chọn logo (multipart/form-data)</span>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setFile(e.target.files?.[0] || null)}
                    />
                  </label>
                )}
              </>
            )}
            {error && (
              <p className="error-text" role="alert">
                {error}
              </p>
            )}
            <div className="modal-actions">
              <Button variant="secondary" onClick={() => setDialog("")}>
                Hủy
              </Button>
              <Button type="submit" disabled={busy}>
                {busy
                  ? "Đang gửi…"
                  : dialog === "delete"
                    ? "Xóa bản ghi"
                    : "Lưu"}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </>
  )
}

function ApiUsers() {
  const { toast, navigate } = useApp()
  const backend = useBackend()
  const [keyword, setKeyword] = useState("")
  const [page, setPage] = useState(1)
  const [data, setData] = useState<{
    items: Row[]
    pages: number
    total: number
  }>({ items: [], pages: 1, total: 0 })
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<Row | null>(null)
  const [busy, setBusy] = useState(false)
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError("")
    const timer = setTimeout(
      () =>
        void api.users
          .search(
            {
              keyword,
              page: page - 1,
              size: 10,
              sortBy: "id",
              sortDirection: "ASC",
            },
            controller.signal,
          )
          .then((value) => setData(pageData(value)))
          .catch((e) => {
            if (!controller.signal.aborted) setError(errorMessage(e))
          })
          .finally(() => {
            if (!controller.signal.aborted) setLoading(false)
          }),
      250,
    )
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [keyword, page, retry])
  return (
    <>
      <PageTitle title="Customers" />
      <p className="inline-note">
        Chỉ cập nhật username và phone theo API đã cung cấp. Chưa có endpoint
        đổi role, khóa tài khoản hoặc lịch sử đơn hàng.
      </p>
      <section className="admin-panel">
        <div className="table-toolbar">
          <Search
            value={keyword}
            onChange={(v) => {
              setKeyword(v)
              setPage(1)
            }}
          />
        </div>
        {loading ? (
          <ApiLoading />
        ) : error && !selected ? (
          <ApiFailure error={error} retry={() => setRetry((n) => n + 1)} />
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Username</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {data.items.map((user) => (
                  <tr key={text(user.id)}>
                    <td>{text(user.id)}</td>
                    <td>{text(user.username)}</td>
                    <td>{text(user.email)}</td>
                    <td>{text(user.phone)}</td>
                    <td>
                      <Button
                        variant="ghost"
                        onClick={async () => {
                          setError("")
                          try {
                            const value = await api.users.byId(text(user.id))
                            if (!isRecord(value))
                              throw new ApiError(
                                "User detail chưa đúng cấu trúc.",
                              )
                            setSelected(value)
                          } catch (e) {
                            setError(errorMessage(e))
                          }
                        }}
                      >
                        Chi tiết / sửa
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination
          page={page}
          total={Math.max(1, data.pages)}
          onChange={setPage}
        />
      </section>
      {selected && (
        <Modal title="Thông tin khách hàng" onClose={() => setSelected(null)}>
          <form
            className="dialog-form"
            onSubmit={async (e) => {
              e.preventDefault()
              const form = new FormData(e.currentTarget)
              setBusy(true)
              setError("")
              try {
                const changes: {
                  username?: string
                  phone?: string
                } = {}
                const username = String(form.get("username")).trim()
                const phone = String(form.get("phone")).trim()
                if (username !== text(selected.username))
                  changes.username = username
                if (phone !== text(selected.phone)) changes.phone = phone
                if (!Object.keys(changes).length) {
                  toast("Không có thay đổi.")
                  return
                }
                const result = await api.users.update(
                  text(selected.id),
                  changes,
                )
                const phoneIgnored =
                  changes.phone && (!isRecord(result) || result.phone !== phone)
                if (changes.username && selected.id === backend.profile?.id) {
                  await backend.logout()
                  navigate("/auth/login")
                  toast(
                    phoneIgnored
                      ? "Username đã đổi, phone chưa được backend lưu. Hãy đăng nhập lại."
                      : "Đăng nhập lại sau khi đổi username.",
                  )
                  return
                }
                if (phoneIgnored) {
                  if (isRecord(result)) setSelected(result)
                  throw new ApiError(
                    "UserServiceImpl hiện bỏ qua phone; backend chưa lưu số điện thoại.",
                  )
                }
                setSelected(null)
                setRetry((n) => n + 1)
                toast("Thông tin người dùng đã cập nhật.")
              } catch (e) {
                setError(errorMessage(e))
              } finally {
                setBusy(false)
              }
            }}
          >
            <Input label="Email" value={text(selected.email)} disabled />
            <Input
              label="Username"
              name="username"
              defaultValue={text(selected.username)}
              required
            />
            <Input
              label="Phone"
              name="phone"
              defaultValue={text(selected.phone)}
            />
            {error && (
              <p className="error-text" role="alert">
                {error}
              </p>
            )}
            <Button type="submit" disabled={busy}>
              Lưu thông tin
            </Button>
          </form>
        </Modal>
      )}
    </>
  )
}

function ApiFiles() {
  const { toast } = useApp()
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState("")
  const [result, setResult] = useState<{
    url?: string
    secureUrl?: string
    publicId: string
  } | null>(null)
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  const [deleting, setDeleting] = useState(false)
  useEffect(() => {
    if (!file) {
      setPreview("")
      return
    }
    const url = URL.createObjectURL(file)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [file])
  return (
    <section className="admin-panel api-panel-pad">
      <Heading level={3}>File upload · Cloudinary</Heading>
      <p className="mock-note">
        Upload qua /files/upload, sau đó điền URL và publicId vào mục Product
        Images (url, providerPublicId, colorId).
      </p>
      <form
        className="dialog-form api-upload-form"
        onSubmit={async (e) => {
          e.preventDefault()
          const form = new FormData(e.currentTarget)
          if (!file) return
          setBusy(true)
          setError("")
          try {
            const result = await api.files.upload(
              file,
              String(form.get("folder")),
            )
            if (!result?.publicId)
              throw new ApiError("Upload result chưa có publicId.")
            setResult(result)
            toast("Upload thành công.")
          } catch (e) {
            setError(errorMessage(e))
          } finally {
            setBusy(false)
          }
        }}
      >
        <Input
          name="folder"
          label="FileFolder"
          defaultValue="PRODUCT"
          required
        />
        <label className="upload-zone compact">
          {preview ? (
            <img src={preview} alt="Ảnh chuẩn bị upload" />
          ) : (
            <span>Chọn ảnh để xem trước</span>
          )}
          <input
            type="file"
            accept="image/*"
            required
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
        </label>
        <Button type="submit" disabled={busy || !file}>
          Upload tới backend
        </Button>
      </form>
      {error && (
        <p className="error-text" role="alert">
          {error}
        </p>
      )}
      {result && (
        <div className="api-file-result">
          <Input
            label="URL backend trả về"
            value={result.secureUrl || result.url || ""}
            readOnly
          />
          <Input label="Public ID" value={result.publicId} readOnly />
          <div className="button-row">
            <Button
              variant="secondary"
              onClick={() => {
                void navigator.clipboard
                  .writeText(result.secureUrl || result.url || "")
                  .then(() => toast("Đã sao chép URL."))
                  .catch(() =>
                    setError(
                      "Không thể sao chép tự động. Bạn có thể chọn URL và copy thủ công.",
                    ),
                  )
              }}
            >
              Copy URL
            </Button>
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() => setDeleting(true)}
            >
              Xóa file đã upload
            </Button>
          </div>
        </div>
      )}
      {deleting && result && (
        <Modal
          title="Xóa file trên Cloudinary?"
          onClose={() => setDeleting(false)}
        >
          <p>File sẽ được xóa bằng publicId do backend trả về.</p>
          <div className="modal-actions">
            <Button variant="secondary" onClick={() => setDeleting(false)}>
              Hủy
            </Button>
            <Button
              disabled={busy}
              onClick={async () => {
                setBusy(true)
                setError("")
                try {
                  await api.files.delete(result.publicId)
                  setResult(null)
                  setDeleting(false)
                  toast("Đã xóa file.")
                } catch (e) {
                  setError(errorMessage(e))
                  setDeleting(false)
                } finally {
                  setBusy(false)
                }
              }}
            >
              Xóa file thật
            </Button>
          </div>
        </Modal>
      )}
    </section>
  )
}
