import { useEffect, useState } from "react"
import { useApp } from "../context"
import { ProductCard, ProductDetail, Breadcrumb, Pagination } from "../Store"
import { Button, Empty, Heading, Input, Select } from "../ui"
import { text } from "./adapters"
import { ApiFailure, ApiLoading, errorMessage, useBackend } from "./Backend"
import { useProduct, useProducts } from "../hooks/useProducts"
import type { Query } from "./client"

export function ApiCatalog() {
  const { route } = useApp()
  const backend = useBackend()
  const params = new URLSearchParams(route.split("?")[1])
  const initialCategory = decodeURIComponent(
    route.split("?")[0].split("/")[2] || "",
  )
  const [keyword, setKeyword] = useState(params.get("search") || "")
  const [categoryId, setCategoryId] = useState(
    text(
      backend.categories.find(
        (c) =>
          text(c.name).toLowerCase() === initialCategory.toLowerCase() ||
          text(c.slug) === initialCategory.toLowerCase(),
      )?.id,
    ),
  )
  const [brandId, setBrandId] = useState(
    text(
      backend.brands.find(
        (b) =>
          text(b.name).toLowerCase() === params.get("brand")?.toLowerCase(),
      )?.id,
    ),
  )
  const [type, setType] = useState(
    ({
      Rackets: "RACKET",
      Shoes: "SHOES",
      Apparel: "APPAREL",
      Accessories: "ACCESSORY",
    } as Record<string, string>)[initialCategory] || "",
  )
  const [minPrice, setMinPrice] = useState("")
  const [maxPrice, setMaxPrice] = useState("")
  const [onSale, setOnSale] = useState(params.has("sale"))
  const [attrs, setAttrs] = useState("")
  const [sort, setSort] = useState("id:DESC")
  const [page, setPage] = useState(1)
  useEffect(() => {
    if (!initialCategory) return
    setCategoryId(
      text(
        backend.categories.find(
          (c) =>
            text(c.name).toLowerCase() === initialCategory.toLowerCase() ||
            text(c.slug) === initialCategory.toLowerCase(),
        )?.id,
      ),
    )
  }, [initialCategory, backend.categories])
  const initialBrand = params.get("brand") || ""
  useEffect(() => {
    if (!initialBrand) return
    setBrandId(
      text(
        backend.brands.find(
          (b) => text(b.name).toLowerCase() === initialBrand.toLowerCase(),
        )?.id,
      ),
    )
  }, [initialBrand, backend.brands])
  const [sortBy, sortDirection] = sort.split(":")
  const querySignature = JSON.stringify({
    keyword,
    categoryId,
    brandId,
    type,
    minPrice,
    maxPrice,
    onSale: onSale || undefined,
    attr: attrs
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean),
    page: page - 1,
    size: 12,
    sortBy,
    sortDirection,
  })
  const [debouncedQuery, setDebouncedQuery] = useState(querySignature)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(querySignature), 250)
    return () => clearTimeout(timer)
  }, [querySignature])
  const productsQuery = useProducts(JSON.parse(debouncedQuery) as Query)
  const result = productsQuery.data || { products: [], pages: 1, total: 0 }
  const loading =
    productsQuery.isPending ||
    productsQuery.isFetching ||
    querySignature !== debouncedQuery
  const error = productsQuery.error ? errorMessage(productsQuery.error) : ""
  const reset = () => {
    setKeyword("")
    setCategoryId("")
    setBrandId("")
    setType("")
    setMinPrice("")
    setMaxPrice("")
    setOnSale(false)
    setAttrs("")
    setPage(1)
  }
  return (
    <main className="container catalog-page">
      <Breadcrumb items={["Trang chủ", "Cửa hàng"]} />
      <div className="page-intro">
        <span className="eyebrow">DANH MỤC TRỰC TUYẾN · SPRING BOOT</span>
        <Heading level={1}>
          {initialCategory || "Lựa chọn trang bị phù hợp nhất"}
        </Heading>
        <p>
          Tìm kiếm, bộ lọc, sắp xếp và phân trang được gửi trực tiếp tới
          backend.
        </p>
      </div>
      <div className="catalog-layout api-catalog-layout">
        <aside className="api-filter-sidebar">
          <div className="filter-head">
            <strong>Bộ lọc</strong>
            <Button variant="ghost" onClick={reset}>
              Xóa tất cả
            </Button>
          </div>
          <Select
            label="Danh mục"
            value={categoryId}
            onChange={(e) => {
              setCategoryId(e.target.value)
              setPage(1)
            }}
          >
            <option value="">Tất cả danh mục</option>
            {backend.categories.map((c) => (
              <option key={text(c.id)} value={text(c.id)}>
                {text(c.name)}
              </option>
            ))}
          </Select>
          <Select
            label="Thương hiệu"
            value={brandId}
            onChange={(e) => {
              setBrandId(e.target.value)
              setPage(1)
            }}
          >
            <option value="">Tất cả thương hiệu</option>
            {backend.brands.map((b) => (
              <option key={text(b.id)} value={text(b.id)}>
                {text(b.name)}
              </option>
            ))}
          </Select>
          <Select
            label="Loại sản phẩm"
            value={type}
            onChange={(e) => {
              setType(e.target.value)
              setPage(1)
            }}
          >
            <option value="">Tất cả loại</option>
            {["RACKET", "SHOES", "APPAREL", "ACCESSORY"].map((t) => (
              <option key={t}>{t}</option>
            ))}
          </Select>
          <Input
            label="Giá tối thiểu"
            type="number"
            min="0"
            value={minPrice}
            onChange={(e) => {
              setMinPrice(e.target.value)
              setPage(1)
            }}
          />
          <Input
            label="Giá tối đa"
            type="number"
            min="0"
            value={maxPrice}
            onChange={(e) => {
              setMaxPrice(e.target.value)
              setPage(1)
            }}
          />
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={onSale}
              onChange={(e) => {
                setOnSale(e.target.checked)
                setPage(1)
              }}
            />
            Đang giảm giá
          </label>
          <label className="field">
            <span>Thuộc tính (mỗi dòng một attr)</span>
            <textarea
              rows={3}
              value={attrs}
              onChange={(e) => {
                setAttrs(e.target.value)
                setPage(1)
              }}
              placeholder={"gender:Men\nweight:83g"}
            />
          </label>
        </aside>
        <section>
          <div className="catalog-toolbar">
            <span>
              <strong>{result.total}</strong> sản phẩm
            </span>
            <Select
              aria-label="Sort products"
              value={sort}
              onChange={(e) => {
                setSort(e.target.value)
                setPage(1)
              }}
            >
              <option value="id:DESC">Mới nhất</option>
              <option value="price:ASC">Giá tăng dần</option>
              <option value="price:DESC">Giá giảm dần</option>
              <option value="name:ASC">Tên A–Z</option>
            </Select>
          </div>
          <Input
            label="Tìm sản phẩm"
            placeholder="Tên sản phẩm…"
            value={keyword}
            onChange={(e) => {
              setKeyword(e.target.value)
              setPage(1)
            }}
          />
          {loading ? (
            <ApiLoading />
          ) : error ? (
            <ApiFailure
              error={error}
              retry={() => void productsQuery.refetch()}
            />
          ) : result.products.length ? (
            <div className="product-grid catalog-grid api-products">
              {result.products.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          ) : (
            <Empty
              icon="search"
              title="Không có sản phẩm phù hợp"
              text="Backend trả về danh sách rỗng. Thử thay đổi bộ lọc."
            >
              <Button onClick={reset}>Xóa bộ lọc</Button>
            </Empty>
          )}
          <Pagination page={page} total={result.pages} onChange={setPage} />
        </section>
      </div>
    </main>
  )
}
export function ApiProduct() {
  const { route } = useApp()
  const query = useProduct(route)
  if (query.error)
    return (
      <main className="container">
        <ApiFailure
          error={errorMessage(query.error)}
          retry={() => void query.refetch()}
        />
      </main>
    )
  if (!query.data) return <ApiLoading />
  return <ProductDetail key={query.data.id} productOverride={query.data} />
}
