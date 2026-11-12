import { useEffect, useState } from "react"
import { useBackend } from "./Backend"
import { isRecord } from "./client"
import { text, type Row } from "./adapters"
import { Input, Select } from "../ui"

const fields: Record<string, string[]> = {
  product: [
    "name",
    "slug",
    "description",
    "type",
    "categoryId",
    "brandId",
    "productStatus",
    "price",
    "salePrice",
  ],
  colors: ["colorName", "hexCode", "displayOrder"],
  attributes: ["attrName", "attrValue"],
  images: [
    "colorId",
    "url",
    "providerPublicId",
    "title",
    "altText",
    "isMain",
    "orderIndex",
  ],
}
const labels: Record<string, string> = {
  name: "Tên sản phẩm",
  slug: "Slug",
  description: "Mô tả",
  type: "Product type",
  categoryId: "Danh mục",
  brandId: "Thương hiệu",
  productStatus: "Product status",
  price: "Giá gốc",
  salePrice: "Giá khuyến mãi (trống = null)",
  colorName: "Tên màu",
  hexCode: "Mã HEX",
  displayOrder: "Thứ tự hiển thị",
  attrName: "Tên thuộc tính",
  attrValue: "Giá trị thuộc tính",
  colorId: "Color ID",
  url: "URL ảnh",
  providerPublicId: "Cloudinary public ID",
  title: "Tiêu đề",
  altText: "Alt text",
  isMain: "Image priority",
  orderIndex: "Thứ tự ảnh",
}
const numeric = new Set([
  "categoryId",
  "brandId",
  "price",
  "salePrice",
  "displayOrder",
  "colorId",
  "orderIndex",
])
export function CatalogPayload({
  resource,
  detail,
  childId,
  operation,
  onChange,
}: {
  resource: string
  detail: unknown
  childId: string
  operation: string
  onChange: (payload: string) => void
}) {
  const backend = useBackend()
  const keys = fields[resource] || []
  const [values, setValues] = useState<Record<string, string>>({})
  useEffect(() => {
    const product = isRecord(detail) ? detail : {}
    const colors = Array.isArray(product.colors)
      ? product.colors.filter(isRecord)
      : []
    let source: Row = {}
    if (resource === "product") source = product
    else if (operation === "PUT") {
      const candidates =
        resource === "images"
          ? colors.flatMap((color) =>
              Array.isArray(color.images)
                ? color.images
                    .filter(isRecord)
                    .map((image) => ({ ...image, colorId: color.id }))
                : [],
            )
          : Array.isArray(product[resource])
            ? (product[resource] as unknown[]).filter(isRecord)
            : []
      source = candidates.find((row) => String(row.id) === childId) || {}
    }
    const defaults: Record<string, string> = {
      type: "RACKET",
      productStatus: "DRAFT",
      isMain: "SECONDARY",
      displayOrder: "0",
      orderIndex: "0",
    }
    setValues(
      Object.fromEntries(
        keys.map((key) => [
          key,
          key === "categoryId" && isRecord(source.category)
            ? text(source.category.id)
            : key === "brandId" && isRecord(source.brand)
              ? text(source.brand.id)
              : text(source[key], defaults[key] || ""),
        ]),
      ),
    )
  }, [resource, detail, childId, operation])
  useEffect(() => {
    const body = Object.fromEntries(
      keys.map((key) => [
        key,
        key === "salePrice" && !values[key]
          ? null
          : numeric.has(key)
            ? Number(values[key] || 0)
            : values[key] || "",
      ]),
    )
    onChange(JSON.stringify(body, null, 2))
  }, [values, resource, onChange])
  return (
    <div className="form-grid">
      {keys.map((key) => {
        const value = values[key] || ""
        const update = (value: string) =>
          setValues((state) => ({ ...state, [key]: value }))
        const options =
          key === "type"
            ? ["RACKET", "SHOES", "APPAREL", "ACCESSORY"]
            : key === "productStatus"
              ? ["DRAFT", "ACTIVE", "OUT_OF_STOCK", "DISCONTINUED"]
              : key === "isMain"
                ? ["MAIN", "SECONDARY"]
                : []
        if (key === "categoryId" || key === "brandId")
          return (
            <Select
              key={key}
              label={labels[key]}
              value={value}
              onChange={(e) => update(e.target.value)}
            >
              <option value="">Chọn {labels[key].toLowerCase()}</option>
              {(key === "categoryId" ? backend.categories : backend.brands).map(
                (row) => (
                  <option key={text(row.id)} value={text(row.id)}>
                    {text(row.name)}
                  </option>
                ),
              )}
            </Select>
          )
        if (options.length)
          return (
            <Select
              key={key}
              label={labels[key]}
              value={value}
              onChange={(e) => update(e.target.value)}
            >
              {options.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </Select>
          )
        if (key === "description")
          return (
            <label className="field" key={key}>
              <span>{labels[key]}</span>
              <textarea
                rows={4}
                value={value}
                onChange={(e) => update(e.target.value)}
              />
            </label>
          )
        return (
          <Input
            key={key}
            label={labels[key]}
            type={numeric.has(key) ? "number" : key === "url" ? "url" : "text"}
            min={numeric.has(key) ? 0 : undefined}
            step={key === "price" || key === "salePrice" ? ".01" : undefined}
            value={value}
            onChange={(e) => update(e.target.value)}
          />
        )
      })}
    </div>
  )
}
