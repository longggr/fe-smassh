import type { Product } from "../data"
import { ApiError, isRecord } from "./client"
import type { Address, Order, PaymentResult } from "../types/api"
export type Row = Record<string, unknown>
export const text = (value: unknown, fallback = "") =>
  typeof value === "string" || typeof value === "number"
    ? String(value)
    : fallback
export const number = (value: unknown, fallback = 0) =>
  value !== null && value !== "" && Number.isFinite(Number(value))
    ? Number(value)
    : fallback
export function rows(value: unknown): Row[] {
  if (Array.isArray(value)) return value.filter(isRecord)
  if (isRecord(value)) {
    for (const key of ["content", "items", "data", "results"])
      if (Array.isArray(value[key]))
        return (value[key] as unknown[]).filter(isRecord)
  }
  throw new ApiError(
    "Chưa nhận diện được cấu trúc danh sách trong result. Không thay thế bằng dữ liệu demo.",
  )
}
export function pageData(value: unknown) {
  const items = rows(value)
  return {
    items,
    total: isRecord(value)
      ? number(
          value.totalElements ?? value.totalItems ?? value.total,
          items.length,
        )
      : items.length,
    pages: isRecord(value) ? number(value.totalPages, 1) : 1,
  }
}
export function treeRows(value: unknown): Row[] {
  return rows(value).flatMap((row) => [
    row,
    ...(Array.isArray(row.children) ? treeRows(row.children) : []),
  ])
}
const named = (value: unknown) =>
  isRecord(value) ? text(value.name) : text(value)
export function productFromApi(value: unknown): Product {
  if (
    !isRecord(value) ||
    value.id === null ||
    !Number.isFinite(Number(value.id)) ||
    typeof value.name !== "string"
  )
    throw new ApiError(
      "Product result cần có id và name để hiển thị. Vui lòng kiểm tra DTO backend.",
    )
  const colors = Array.isArray(value.colors)
    ? value.colors.filter(isRecord)
    : []
  const parseImages = (images: unknown) =>
    Array.isArray(images)
      ? images
          .map((image) =>
            typeof image === "string"
              ? image
              : isRecord(image)
                ? text(image.secureUrl || image.url || image.imageUrl)
                : "",
          )
          .filter(Boolean)
      : []
  const nestedVariants = colors.flatMap((color) =>
    Array.isArray(color.variants)
      ? color.variants.filter(isRecord).map((variant) => ({
          ...variant,
          colorId: color.id,
          colorName: color.colorName ?? color.name,
        }))
      : [],
  )
  const allVariants: Row[] = [
    ...(Array.isArray(value.variants) ? value.variants.filter(isRecord) : []),
    ...nestedVariants,
  ]
  const variants = [
    ...new Map(
      allVariants.map((variant) => [number(variant.id), variant]),
    ).values(),
  ]
  const images = [
    ...new Set([
      ...parseImages(value.images),
      ...colors.flatMap((color) => parseImages(color.images)),
    ]),
  ]
  if (
    !images.length &&
    typeof value.thumbnailUrl === "string" &&
    value.thumbnailUrl
  )
    images.push(value.thumbnailUrl)
  const price = number(value.price ?? value.regularPrice)
  const sale = number(value.salePrice)
  const type = text(value.type ?? value.productType)
  return {
    id: Number(value.id),
    name: value.name,
    brand: named(value.brand) || text(value.brandName),
    category:
      named(value.category) ||
      text(value.categoryName) ||
      {
        RACKET: "Rackets",
        SHOES: "Shoes",
        APPAREL: "Apparel",
        ACCESSORY: "Accessories",
      }[type] ||
      type,
    categoryId: isRecord(value.category)
      ? number(value.category.id)
      : number(value.categoryId),
    brandId: isRecord(value.brand)
      ? number(value.brand.id)
      : number(value.brandId),
    productType: type,
    status: text(value.productStatus ?? value.status, "ACTIVE"),
    slug: text(value.slug),
    description: text(value.description),
    price:
      value.effectivePrice !== undefined
        ? number(value.effectivePrice)
        : sale > 0 && sale < price
          ? sale
          : price,
    oldPrice: sale > 0 && sale < price ? price : undefined,
    images,
    colors: colors.map((color) => text(color.colorName ?? color.name)),
    colorOptions: colors.map((color) => ({
      id: number(color.id),
      name: text(color.colorName ?? color.name),
      hexCode: text(color.hexCode ?? color.hex, "#293b43"),
      images: parseImages(color.images),
    })),
    color: colors.length ? text(colors[0].hexCode, "#293b43") : "#293b43",
    rating: text(value.rating, "—"),
    reviews: number(value.reviewCount),
    stock: variants.length
      ? variants.reduce((sum, variant) => sum + number(variant.stock), 0)
      : number(value.stock ?? value.stockQuantity),
    attributes: Array.isArray(value.attributes)
      ? value.attributes.filter(isRecord).map((attribute) => ({
          name: text(attribute.attrName ?? attribute.name ?? attribute.key),
          value: text(attribute.attrValue ?? attribute.value),
        }))
      : [],
    variants: variants.map((variant) => ({
      id: number(variant.id),
      sku: text(variant.sku),
      name: text(variant.size ?? variant.name, "Standard"),
      price: number(variant.price, sale || price),
      stock: number(variant.stock),
      status:
        variant.active === true
          ? "ACTIVE"
          : variant.active === false
            ? "INACTIVE"
            : text(variant.active ?? variant.status, "ACTIVE"),
      colorId: number(
        variant.colorId ??
          (isRecord(variant.color) ? variant.color.id : undefined),
      ),
      colorName:
        text(variant.colorName) ||
        named(variant.color) ||
        text(
          colors.find((color) => color.id === variant.colorId)?.colorName ??
            colors.find((color) => color.id === variant.colorId)?.name,
        ),
      inventoryStatus: text(variant.inventoryStatus),
      weightGram:
        variant.weightGram === undefined
          ? undefined
          : number(variant.weightGram),
    })),
  }
}

/** CartController returns CartMutationResponse { cart, cartToken }, not CartResponse directly. */
export function cartFromApi(value: unknown): Row {
  const cart = isRecord(value) && isRecord(value.cart) ? value.cart : value
  if (!isRecord(cart) || !Array.isArray(cart.items))
    throw new ApiError("CartMutationResponse cần có cart.items[].")
  return {
    ...cart,
    totalAmount:
      cart.subtotal ?? cart.totalAmount ?? cart.totalPrice ?? cart.total,
    items: cart.items.filter(isRecord).map((item) => ({
      ...item,
      price: item.effectivePrice ?? item.unitPrice ?? item.price,
      totalPrice: item.lineTotal ?? item.totalPrice,
    })),
  }
}
export function addressFromApi(value: unknown): Address {
  if (!isRecord(value) || !Number.isInteger(value.id) || !value.id)
    throw new ApiError("AddressResponse thiếu id hợp lệ.")
  return {
    id: Number(value.id),
    recipientName: text(value.recipientName),
    phone: text(value.phone),
    line1: text(value.line1),
    provinceId: number(value.provinceId),
    provinceName: text(value.provinceName),
    districtId: number(value.districtId),
    districtName: text(value.districtName),
    wardCode: text(value.wardCode),
    wardName: text(value.wardName),
    primaryAddress:
      value.primaryAddress === "PRIMARY" ? "PRIMARY" : "SECONDARY",
    isDefault: value.primaryAddress === "PRIMARY",
  }
}
export function orderFromApi(value: unknown): Order {
  if (
    !isRecord(value) ||
    !Number.isInteger(value.id) ||
    typeof value.orderStatus !== "string"
  )
    throw new ApiError("OrderResponse thiếu id / orderStatus hợp lệ.")
  const order = { ...value } as unknown as Order
  if (typeof value.shippingRecipientName === "string")
    order.address = {
      recipientName: value.shippingRecipientName,
      phone: text(value.shippingPhone),
      line1: text(value.shippingLine1),
      provinceName: text(value.shippingProvinceName),
      districtName: text(value.shippingDistrictName),
      wardName: text(value.shippingWardName),
    }
  return order
}
export function paymentFromApi(value: unknown): PaymentResult {
  if (!isRecord(value) || !["SUCCESS", "FAILED"].includes(text(value.status)))
    throw new ApiError("VnpayReturnResponse cần có status SUCCESS hoặc FAILED.")
  return {
    status: value.status as "SUCCESS" | "FAILED",
    isSuccess: value.status === "SUCCESS",
    orderId:
      Number.isInteger(value.orderId) && Number(value.orderId) > 0
        ? Number(value.orderId)
        : undefined,
    message: text(value.message),
  }
}
