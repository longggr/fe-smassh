export interface ApiResponse<T> {
  code: number
  message?: string
  result: T
}
// Actual Java AuthResponse: one JWT, renewed via { token: currentJwt }.
export interface AuthResponse {
  token: string
  authenticated: boolean
}
export interface PageResponse<T> {
  content: T[]
  pageNo: number
  pageSize: number
  totalElements: number
  totalPages: number
  last: boolean
}
export interface Variant {
  id: number
  sku: string
  size: string
  stock: number
  active: string | boolean
  price?: number
  weightGram?: number
}
export interface ProductColor {
  id: number
  colorName: string
  hexCode?: string
  images: Array<string | {
    url?: string
    imageUrl?: string
    secureUrl?: string
  }>
  variants: Variant[]
}
export interface ProductSummary {
  id: number
  name: string
  slug: string
  price: number
  salePrice?: number | null
  effectivePrice?: number
  thumbnailUrl?: string
  brandName: string
  categoryName: string
  productStatus?: string
}
export interface Product extends ProductSummary {
  description?: string
  type?: "RACKET" | "SHOES" | "APPAREL" | "ACCESSORY"
  colors: ProductColor[]
  attributes?: Array<{
    id?: number
    attrName: string
    attrValue: string
  }>
}
export interface CartItem {
  variantId: number
  quantity: number
  productName?: string
  sku?: string
  unitPrice?: number
  price?: number
  totalPrice?: number
  effectivePrice?: number
  lineTotal?: number
  availableStock?: number
  stockInsufficient?: boolean
  unavailable?: boolean
}
export interface Cart {
  items: CartItem[]
  subtotal: number
  totalItems: number
  totalQuantity: number
  issueCount: number
}
export interface CartMutationResponse {
  cart: Cart
  cartToken: string | null
}
export interface AddressInput {
  recipientName: string
  phone: string
  provinceId: number
  districtId: number
  wardCode: string
  line1: string
  primary: boolean
}
export interface Address extends Omit<AddressInput, "primary"> {
  id: number
  provinceName: string
  districtName: string
  wardName: string
  primaryAddress: "PRIMARY" | "SECONDARY"
  isDefault: boolean
}
export interface Province {
  ProvinceID: number
  ProvinceName: string
}
export interface District {
  DistrictID: number
  DistrictName: string
}
export interface Ward {
  WardCode: string
  WardName: string
}
export type ShippingMethod = "STANDARD" | "EXPRESS"
export type PaymentMethod = "COD" | "VNPAY"
export interface ShippingFeeInput {
  shippingMethod: ShippingMethod
  addressId?: number
  toDistrictId?: number
  toWardCode?: string
}
export interface ShippingQuote {
  shippingMethod: ShippingMethod
  serviceId: number
  serviceName: string
  shippingFee: number
  expectedDeliveryDate?: string
}
export interface CheckoutInput {
  addressId: number
  shippingMethod: ShippingMethod
  paymentMethod: PaymentMethod
  note: string
}
export type OrderStatus = "PENDING_PAYMENT" | "PAID" | "PROCESSING" | "SHIPPING" | "DELIVERED" | "CANCELLED" | "EXPIRED" | "REFUNDED"
export interface OrderItem {
  variantId?: number
  productName?: string
  sku?: string
  size?: string
  colorName?: string
  quantity: number
  price?: number
  unitPrice?: number
  totalPrice?: number
}
export interface Order {
  id: number
  orderCode?: string
  orderStatus: OrderStatus
  paymentMethod: PaymentMethod
  subtotal: number
  shippingCost: number
  discount?: number
  total: number
  paymentUrl?: string
  items: OrderItem[]
  createdAt?: string
  createDate?: string
  note?: string
  address?: Pick<Address, "recipientName" | "phone" | "line1" | "provinceName" | "districtName" | "wardName">
  shippingRecipientName?: string
  shippingPhone?: string
  shippingLine1?: string
  shippingProvinceId?: number
  shippingProvinceName?: string
  shippingDistrictId?: number
  shippingDistrictName?: string
  shippingWardCode?: string
  shippingWardName?: string
  stockRestored?: boolean
}
export interface VnpayReturnResponse {
  orderId?: number
  txnRef?: string
  amount?: number
  status: "SUCCESS" | "FAILED"
  responseCode?: string
  transactionNo?: string
  message?: string
}
export interface PaymentResult {
  isSuccess: boolean
  orderId?: number
  message?: string
  paymentUrl?: string
  status?: "SUCCESS" | "FAILED"
}
