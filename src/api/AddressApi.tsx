import { useRef, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { api, ApiError } from "./client"
import { rows, text, addressFromApi } from "./adapters"
import { ApiFailure, ApiLoading, errorMessage, useBackend } from "./Backend"
import {
  Badge,
  Button,
  Empty,
  Heading,
  Icon,
  Input,
  Modal,
  Select,
} from "../ui"
import { useApp } from "../context"
import type { Address } from "../types/api"

const schema = z.object({
  recipientName: z.string().trim().min(2, "Nhập tên người nhận."),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9 ()-]{8,20}$/, "Số điện thoại không hợp lệ."),
  provinceId: z.number().int().positive("Chọn tỉnh / thành phố."),
  districtId: z.number().int().positive("Chọn quận / huyện."),
  wardCode: z.string().min(1, "Chọn phường / xã."),
  line1: z.string().trim().min(5, "Nhập số nhà và tên đường."),
  isDefault: z.boolean(),
})
type AddressFormValues = z.infer<typeof schema>
function locationRows(value: unknown, type: "Province" | "District" | "Ward") {
  return rows(value)
    .map((row) => ({
      id: text(
        row[type === "Ward" ? "WardCode" : `${type}ID`] ??
          row[type === "Ward" ? "wardCode" : `${type.toLowerCase()}Id`] ??
          (type === "Ward" ? row.code : row.id),
      ),
      name: text(
        row[`${type}Name`] ?? row[`${type.toLowerCase()}Name`] ?? row.name,
      ),
    }))
    .filter((row) => row.id && row.name)
}
export function useAddresses() {
  const backend = useBackend()
  return useQuery({
    queryKey: ["addresses", backend.baseUrl, backend.identity?.email],
    queryFn: async ({ signal }) =>
      rows(await api.addresses.list(signal)).map(addressFromApi),
    enabled: backend.mode === "api" && Boolean(backend.identity),
  })
}
export function NewAddressModal({
  onClose,
  onCreated,
  address,
}: {
  onClose: () => void
  onCreated?: (address: Address) => void
  address?: Address
}) {
  const backend = useBackend()
  const client = useQueryClient()
  const { toast } = useApp()
  const [error, setError] = useState("")
  const submitLock = useRef(false)
  const form = useForm<AddressFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      recipientName: address?.recipientName || "",
      phone: address?.phone || "",
      provinceId: address?.provinceId || 0,
      districtId: address?.districtId || 0,
      wardCode: address?.wardCode || "",
      line1: address?.line1 || "",
      isDefault: address?.isDefault || false,
    },
  })
  const provinceId = form.watch("provinceId")
  const districtId = form.watch("districtId")
  const provinces = useQuery({
    queryKey: ["provinces", backend.baseUrl],
    queryFn: async ({ signal }) =>
      locationRows(await api.locations.provinces(signal), "Province"),
    staleTime: 3600000,
  })
  const districts = useQuery({
    queryKey: ["districts", backend.baseUrl, provinceId],
    queryFn: async ({ signal }) =>
      locationRows(
        await api.locations.districts(provinceId, signal),
        "District",
      ),
    enabled: provinceId > 0,
    staleTime: 3600000,
  })
  const wards = useQuery({
    queryKey: ["wards", backend.baseUrl, districtId],
    queryFn: async ({ signal }) =>
      locationRows(await api.locations.wards(districtId, signal), "Ward"),
    enabled: districtId > 0,
    staleTime: 3600000,
  })
  const fieldError = (key: keyof AddressFormValues) =>
    form.formState.errors[key]?.message
  const submit = form.handleSubmit(async (values) => {
    if (submitLock.current) return
    submitLock.current = true
    setError("")
    try {
      const { isDefault, ...fields } = values
      const body = { ...fields, primary: isDefault }
      const savedAddress = addressFromApi(
        await (address
          ? api.addresses.update(address.id, body)
          : api.addresses.create(body)),
      )
      await client.invalidateQueries({
        queryKey: ["addresses", backend.baseUrl],
      })
      await client.invalidateQueries({
        queryKey: ["shippingFee", backend.baseUrl],
      })
      toast("Đã lưu địa chỉ nhận hàng.")
      onCreated?.(savedAddress)
      onClose()
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      submitLock.current = false
    }
  })
  return (
    <Modal
      title={address ? "Sửa địa chỉ nhận hàng" : "Thêm địa chỉ nhận hàng"}
      onClose={onClose}
    >
      <form className="dialog-form" onSubmit={submit} noValidate>
        <div className="form-grid">
          <div>
            <Input
              label="Tên người nhận"
              {...form.register("recipientName")}
              autoComplete="name"
              aria-invalid={!!fieldError("recipientName")}
            />
            {fieldError("recipientName") && (
              <p className="error-text">{fieldError("recipientName")}</p>
            )}
          </div>
          <div>
            <Input
              label="Số điện thoại"
              type="tel"
              {...form.register("phone")}
              autoComplete="tel"
              aria-invalid={!!fieldError("phone")}
            />
            {fieldError("phone") && (
              <p className="error-text">{fieldError("phone")}</p>
            )}
          </div>
        </div>
        <Select
          label="Tỉnh / Thành phố"
          value={provinceId}
          disabled={provinces.isPending}
          onChange={(e) => {
            form.setValue("provinceId", Number(e.target.value), {
              shouldValidate: true,
            })
            form.setValue("districtId", 0)
            form.setValue("wardCode", "")
          }}
        >
          <option value={0}>
            {provinces.isPending
              ? "Đang tải tỉnh / thành phố…"
              : "Chọn tỉnh / thành phố"}
          </option>
          {provinces.data?.map((row) => (
            <option key={row.id} value={row.id}>
              {row.name}
            </option>
          ))}
        </Select>
        {provinces.isSuccess && !provinces.data.length && (
          <div className="inline-note" role="alert">
            Backend chưa có dữ liệu tỉnh / thành phố. Quản trị viên cần đồng bộ
            địa giới GHN qua POST /locations/sync trước khi thêm địa chỉ.
          </div>
        )}
        {fieldError("provinceId") && (
          <p className="error-text">{fieldError("provinceId")}</p>
        )}
        <div className="form-grid">
          <div>
            <Select
              label="Quận / Huyện"
              value={districtId}
              disabled={!provinceId || districts.isFetching}
              onChange={(e) => {
                form.setValue("districtId", Number(e.target.value), {
                  shouldValidate: true,
                })
                form.setValue("wardCode", "")
              }}
            >
              <option value={0}>
                {districts.isFetching ? "Đang tải…" : "Chọn quận / huyện"}
              </option>
              {districts.data?.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.name}
                </option>
              ))}
            </Select>
            {fieldError("districtId") && (
              <p className="error-text">{fieldError("districtId")}</p>
            )}
          </div>
          <div>
            <Select
              label="Phường / Xã"
              value={form.watch("wardCode")}
              disabled={!districtId || wards.isFetching}
              onChange={(e) =>
                form.setValue("wardCode", e.target.value, {
                  shouldValidate: true,
                })
              }
            >
              <option value="">
                {wards.isFetching ? "Đang tải…" : "Chọn phường / xã"}
              </option>
              {wards.data?.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.name}
                </option>
              ))}
            </Select>
            {fieldError("wardCode") && (
              <p className="error-text">{fieldError("wardCode")}</p>
            )}
          </div>
        </div>
        {[provinces.error, districts.error, wards.error]
          .filter(Boolean)
          .map((failure, index) => (
            <div key={index} className="inline-note" role="alert">
              {errorMessage(failure)}
              <Button
                variant="ghost"
                onClick={() => {
                  if (provinces.isError) void provinces.refetch()
                  if (districts.isError) void districts.refetch()
                  if (wards.isError) void wards.refetch()
                }}
              >
                Thử lại
              </Button>
            </div>
          ))}
        <Input
          label="Số nhà, tên đường"
          {...form.register("line1")}
          autoComplete="street-address"
        />
        {fieldError("line1") && (
          <p className="error-text">{fieldError("line1")}</p>
        )}
        <label className="checkbox-row">
          <input type="checkbox" {...form.register("isDefault")} />
          Đặt làm địa chỉ mặc định
        </label>
        {error && (
          <p className="error-text" role="alert">
            {error}
          </p>
        )}
        <div className="modal-actions">
          <Button variant="secondary" onClick={onClose}>
            Hủy
          </Button>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Đang lưu…" : "Lưu địa chỉ"}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
export function AddressBook() {
  const backend = useBackend()
  const client = useQueryClient()
  const { toast } = useApp()
  const addresses = useAddresses()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Address | null>(null)
  const [deleting, setDeleting] = useState<Address | null>(null)
  const deletion = useMutation({
    mutationFn: (id: number) => api.addresses.delete(id),
    onSuccess: async () => {
      await client.invalidateQueries({
        queryKey: ["addresses", backend.baseUrl],
      })
      await client.invalidateQueries({
        queryKey: ["shippingFee", backend.baseUrl],
      })
      setDeleting(null)
      toast("Đã xóa địa chỉ.")
    },
  })
  const setDefault = useMutation({
    mutationFn: (id: number) => api.addresses.setDefault(id),
    onSuccess: async () => {
      await client.invalidateQueries({
        queryKey: ["addresses", backend.baseUrl],
      })
      toast("Đã đổi địa chỉ mặc định.")
    },
  })
  return (
    <>
      <div className="section-heading">
        <Heading>Sổ địa chỉ</Heading>
        <Button onClick={() => setOpen(true)}>
          <Icon name="plus" size={16} />
          Thêm địa chỉ
        </Button>
      </div>
      {addresses.isPending ? (
        <ApiLoading />
      ) : addresses.error ? (
        <ApiFailure
          error={errorMessage(addresses.error)}
          retry={() => void addresses.refetch()}
        />
      ) : !addresses.data?.length ? (
        <Empty
          icon="location"
          title="Chưa có địa chỉ nhận hàng"
          text="Thêm địa chỉ để tính phí GHN và đặt hàng."
        >
          <Button onClick={() => setOpen(true)}>Thêm địa chỉ đầu tiên</Button>
        </Empty>
      ) : (
        <div className="address-grid">
          {addresses.data.map((address) => (
            <article className="address-card" key={address.id}>
              {address.isDefault && <Badge tone="green">Mặc định</Badge>}
              <Heading level={3}>{address.recipientName}</Heading>
              <p>
                {address.phone}
                <br />
                {address.line1}
                <br />
                {address.wardName}, {address.districtName}
                <br />
                {address.provinceName}
              </p>
              {!address.isDefault && (
                <Button
                  variant="secondary"
                  disabled={setDefault.isPending}
                  onClick={() => setDefault.mutate(address.id)}
                >
                  Đặt làm mặc định
                </Button>
              )}
              <div className="button-row">
                <Button variant="ghost" onClick={() => setEditing(address)}>
                  <Icon name="edit" size={15} />
                  Sửa
                </Button>
                <Button variant="ghost" onClick={() => setDeleting(address)}>
                  <Icon name="trash" size={15} />
                  Xóa
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}
      {setDefault.error && (
        <p className="error-text" role="alert">
          {errorMessage(setDefault.error)}
        </p>
      )}
      {open && <NewAddressModal onClose={() => setOpen(false)} />}
      {editing && (
        <NewAddressModal address={editing} onClose={() => setEditing(null)} />
      )}
      {deleting && (
        <Modal title="Xóa địa chỉ nhận hàng?" onClose={() => setDeleting(null)}>
          <p>
            {deleting.recipientName} · {deleting.line1}
          </p>
          {deletion.error && (
            <p className="error-text" role="alert">
              {errorMessage(deletion.error)}
            </p>
          )}
          <div className="modal-actions">
            <Button variant="secondary" onClick={() => setDeleting(null)}>
              Giữ địa chỉ
            </Button>
            <Button
              disabled={deletion.isPending}
              onClick={() => deletion.mutate(deleting.id)}
            >
              Xác nhận xóa
            </Button>
          </div>
        </Modal>
      )}
    </>
  )
}
export function LocationSyncAction() {
  const backend = useBackend()
  const client = useQueryClient()
  const { toast } = useApp()
  const [open, setOpen] = useState(false)
  const sync = useMutation({
    mutationFn: () => api.locations.sync(),
    onSuccess: async () => {
      await Promise.all(
        ["provinces", "districts", "wards"].map((name) =>
          client.invalidateQueries({ queryKey: [name, backend.baseUrl] }),
        ),
      )
      toast("Backend đã đồng bộ dữ liệu địa giới GHN.")
      setOpen(false)
    },
  })
  if (!backend.isAdmin) return null
  return (
    <>
      <Button
        variant="secondary"
        onClick={() => {
          sync.reset()
          setOpen(true)
        }}
      >
        Đồng bộ địa giới GHN
      </Button>
      {open && (
        <Modal title="Đồng bộ địa giới từ GHN?" onClose={() => setOpen(false)}>
          <p>
            Gọi POST /locations/sync thật trên backend. Chỉ quản trị viên ADMIN
            được phép thực hiện.
          </p>
          {sync.error && (
            <p className="error-text" role="alert">
              {errorMessage(sync.error)}
            </p>
          )}
          <div className="modal-actions">
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Hủy
            </Button>
            <Button disabled={sync.isPending} onClick={() => sync.mutate()}>
              {sync.isPending ? "Đang đồng bộ…" : "Xác nhận đồng bộ"}
            </Button>
          </div>
        </Modal>
      )}
    </>
  )
}
