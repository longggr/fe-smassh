import { apiRequest } from "../lib/axios"
import { ApiError } from "../lib/errors"
import { authStore, guestCartStore } from "../stores/auth"
import { authResponse } from "../lib/contracts"
import type {
  AuthResponse,
  Address,
  AddressInput,
  ShippingFeeInput,
  ShippingQuote,
  CheckoutInput,
  Order,
  PageResponse,
  PaymentResult,
  VnpayReturnResponse,
} from "../types/api"
export { ApiError } from "../lib/errors"

export type ApiMode = "api" | "demo"
export type Query = Record<string, string | number | boolean | undefined | null | string[]>
type LoginBody = {
  email: string
  password: string
}
type AuthResult = AuthResponse
type IntrospectionResult = {
  valid: boolean
}
type BrandBody = {
  name: string
  slug: string
}
type CategoryBody = {
  name: string
  slug: string
  parentId: number | null
  displayOrder: number
}
type UserUpdate = {
  username?: string
  phone?: string
}
type CartLine = {
  variantId: number
  quantity: number
}
type UploadResult = {
  url?: string
  secureUrl?: string
  publicId: string
}
const settingsKey = "smashhub-api-settings"
export function readSettings(): {
  mode: ApiMode
  baseUrl: string
  currency: string
} {
  try {
    const value = JSON.parse(localStorage.getItem(settingsKey) || "{}")
    return {
      mode: value.mode === "demo" ? "demo" : "api",
      baseUrl:
        value.baseUrl || "https://shorty-cognition-splatter.ngrok-free.dev/cms",
      currency: value.currency === "USD" ? "USD" : "VND",
    }
  } catch {
    return {
      mode: "api",
      baseUrl: "https://shorty-cognition-splatter.ngrok-free.dev/cms",
      currency: "VND",
    }
  }
}
export function saveSettings(mode: ApiMode, baseUrl: string, currency = "VND") {
  const url = new URL(baseUrl)
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  )
    throw new ApiError(
      "Base URL phải là địa chỉ HTTP(S), không chứa tài khoản, query hoặc hash.",
    )
  localStorage.setItem(
    settingsKey,
    JSON.stringify({
      mode,
      baseUrl: url.href.replace(/\/+$/, ""),
      currency: currency === "USD" ? "USD" : "VND",
    }),
  )
}
export const session = {
  token: () =>
    authStore.getState().baseUrl === readSettings().baseUrl
      ? authStore.getState().accessToken
      : "",
  revision: () => authStore.getState().revision,
  epoch: () => authStore.getState().epoch,
  email: () => authStore.getState().email,
  setEmail: (email: string) => authStore.getState().setEmail(email),
  setToken: (token: string, preserveSession = false) =>
    authStore
      .getState()
      .setToken(token, readSettings().baseUrl, preserveSession),
  cartToken: () => guestCartStore.get(readSettings().baseUrl),
  setCartToken: (token: string) =>
    guestCartStore.set(token, readSettings().baseUrl),
  clearCartToken: () => guestCartStore.clear(),
  clearAuth: () => authStore.getState().clear(),
  clear: () => {
    authStore.getState().clear()
    guestCartStore.clear()
  },
}
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}
export function queryString(query: Query = {}) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue
    for (const part of Array.isArray(value) ? value : [value])
      params.append(key, String(part))
  }
  return params.size ? `?${params}` : ""
}
export const request = apiRequest
const id = (value: string | number) => encodeURIComponent(value)
export const api = {
  auth: {
    login: (body: LoginBody) =>
      request<unknown>("/auth/login", {
        method: "POST",
        body,
        auth: false,
      }).then(authResponse),
    introspect: (token: string) =>
      request<IntrospectionResult>("/auth/introspect", {
        method: "POST",
        body: { token },
        auth: false,
      }),
    logout: (token: string) =>
      request("/auth/logout", { method: "POST", body: { token }, auth: false }),
    refresh: (token: string) =>
      request<unknown>("/auth/refresh-token", {
        method: "POST",
        body: { token },
        auth: false,
      }).then(authResponse),
    verify: (email: string, otp: string) =>
      request("/auth/verify-account", {
        method: "POST",
        body: { email, otp },
        auth: false,
      }),
    resend: (email: string) =>
      request("/auth/resend-otp", {
        method: "POST",
        body: { email },
        auth: false,
      }),
    forgot: (email: string) =>
      request("/auth/forgot-password", {
        method: "POST",
        body: { email },
        auth: false,
      }),
    reset: (body: {
      email: string
      otp: string
      newPassword: string
      confirmNewPassword: string
    }) =>
      request("/auth/reset-password", { method: "POST", body, auth: false }),
  },
  users: {
    register: (body: {
      username: string
      email: string
      password: string
      confirmPassword: string
      phone: string
    }) => request("/users", { method: "POST", body, auth: false }),
    list: (pageNo = 1, pageSize = 10, signal?: AbortSignal) =>
      request("/users", { query: { pageNo, pageSize }, signal }),
    search: (query: Query, signal?: AbortSignal) => {
      const params = new URLSearchParams({
        keyword: String(query.keyword ?? ""),
      })
      for (const key of ["page", "size", "sortBy", "sortDirection"])
        if (query[key] !== undefined) params.set(key, String(query[key]))
      return request(`/users/search?${params}`, { signal })
    },
    byId: (userId: string | number) => request(`/users/id/${id(userId)}`),
    byEmail: (email: string) => request(`/users/email/${id(email)}`),
    update: (userId: string | number, body: UserUpdate) =>
      request(`/users/${id(userId)}`, { method: "PUT", body }),
    password: (body: {
      currentPassword: string
      newPassword: string
      confirmNewPassword: string
    }) => request("/users/change-password", { method: "POST", body }),
  },
  products: {
    search: (query: Query = {}, signal?: AbortSignal) =>
      request("/products", { query, signal }),
    byId: (productId: string | number, signal?: AbortSignal) =>
      request(`/products/${id(productId)}`, { signal }),
    bySlug: (slug: string, signal?: AbortSignal) =>
      request(`/products/slug/${id(slug)}`, { signal }),
    create: (body: unknown) => request("/products", { method: "POST", body }),
    update: (productId: string | number, body: unknown) =>
      request(`/products/${id(productId)}`, { method: "PUT", body }),
    delete: (productId: string | number) =>
      request(`/products/${id(productId)}`, { method: "DELETE" }),
    child: (
      productId: string | number,
      kind: "attributes" | "colors" | "images" | "variants",
      method: "POST" | "PUT" | "DELETE",
      body?: unknown,
      childId?: string | number,
    ) =>
      request(
        `/products/${id(productId)}/${kind}${
          childId !== undefined ? `/${id(childId)}` : ""
        }`,
        { method, body },
      ),
  },
  brands: {
    list: (signal?: AbortSignal) => request("/brands", { signal }),
    search: (query: Query, signal?: AbortSignal) =>
      request("/brands/search", { query, signal }),
    byId: (brandId: string | number) => request(`/brands/${id(brandId)}`),
    bySlug: (slug: string) => request(`/brands/slug/${id(slug)}`),
    byCategory: (categoryId: string | number) =>
      request(`/brands/by-category/${id(categoryId)}`),
    byType: (type: string) => request(`/brands/by-type/${id(type)}`),
    create: (body: FormData | BrandBody) =>
      request("/brands", { method: "POST", body }),
    update: (brandId: string | number, body: FormData | BrandBody) =>
      request(`/brands/${id(brandId)}`, { method: "PUT", body }),
    logo: (brandId: string | number, logoUrl: string) =>
      request(`/brands/${id(brandId)}/logo`, {
        method: "PATCH",
        query: { logoUrl },
      }),
    delete: (brandId: string | number) =>
      request(`/brands/${id(brandId)}`, { method: "DELETE" }),
  },
  categories: {
    tree: (signal?: AbortSignal) => request("/categories", { signal }),
    byId: (categoryId: string | number) =>
      request(`/categories/${id(categoryId)}`),
    bySlug: (slug: string) => request(`/categories/slug/${id(slug)}`),
    children: (categoryId: string | number) =>
      request(`/categories/${id(categoryId)}/children`),
    save: (body: CategoryBody, categoryId?: string | number) =>
      request(
        `/categories${categoryId !== undefined ? `/${id(categoryId)}` : ""}`,
        { method: categoryId !== undefined ? "PUT" : "POST", body },
      ),
    delete: (categoryId: string | number) =>
      request(`/categories/${id(categoryId)}`, { method: "DELETE" }),
  },
  cart: {
    get: () => request("/cart", { cart: true }),
    add: (variantId: number, quantity: number) =>
      request("/cart/items", {
        method: "POST",
        cart: true,
        body: { variantId, quantity },
      }),
    update: (variantId: number, quantity: number) =>
      request(`/cart/items/${id(variantId)}`, {
        method: "PUT",
        cart: true,
        body: { quantity },
      }),
    remove: (variantId: number) =>
      request(`/cart/items/${id(variantId)}`, { method: "DELETE", cart: true }),
    clear: () => request("/cart", { method: "DELETE", cart: true }),
    merge: () =>
      request("/cart/merge", { method: "POST", cart: true, mergeGuest: true }),
  },
  addresses: {
    list: (signal?: AbortSignal) => request<unknown>("/addresses", { signal }),
    create: (body: AddressInput) =>
      request<unknown>("/addresses", { method: "POST", body }),
    update: (addressId: number, body: AddressInput) =>
      request<unknown>(`/addresses/${id(addressId)}`, { method: "PUT", body }),
    delete: (addressId: number) =>
      request(`/addresses/${id(addressId)}`, { method: "DELETE" }),
    setDefault: (addressId: number) =>
      request<unknown>(`/addresses/${id(addressId)}/primary`, {
        method: "PATCH",
      }),
  },
  locations: {
    sync: () => request("/locations/sync", { method: "POST" }),
    provinces: (signal?: AbortSignal) =>
      request("/locations/provinces", { signal, auth: false }),
    districts: (provinceId: number, signal?: AbortSignal) =>
      request(`/locations/provinces/${id(provinceId)}/districts`, {
        signal,
        auth: false,
      }),
    wards: (districtId: number, signal?: AbortSignal) =>
      request(`/locations/districts/${id(districtId)}/wards`, {
        signal,
        auth: false,
      }),
  },
  shipping: {
    fee: (body: ShippingFeeInput, signal?: AbortSignal) =>
      request<ShippingQuote>("/shipping/fee", { method: "POST", body, signal }),
  },
  orders: {
    checkout: (body: CheckoutInput) =>
      request<Order>("/orders/checkout", { method: "POST", body }),
    list: (page = 0, size = 10, signal?: AbortSignal) =>
      request<PageResponse<Order>>("/orders", {
        query: { page, size },
        signal,
      }),
    byId: (orderId: number, signal?: AbortSignal) =>
      request<Order>(`/orders/${id(orderId)}`, { signal }),
    cancel: (orderId: number, reason: string) =>
      request<Order>(`/orders/${id(orderId)}/cancel`, {
        method: "POST",
        query: { reason },
      }),
    repay: (orderId: number) =>
      request<Order>(`/orders/${id(orderId)}/repay`, { method: "POST" }),
    tracking: (orderId: number, signal?: AbortSignal) =>
      request(`/orders/${id(orderId)}/tracking`, { signal }),
  },
  adminOrders: {
    list: (query: Query, signal?: AbortSignal) =>
      request("/admin/orders", { query, signal }),
    byId: (orderId: number, signal?: AbortSignal) =>
      request(`/admin/orders/${id(orderId)}`, { signal }),
    status: (orderId: number, status: string, note: string) =>
      request(`/admin/orders/${id(orderId)}/status`, {
        method: "PUT",
        body: { status, note },
      }),
    retryShipment: (orderId: number) =>
      request(`/admin/orders/${id(orderId)}/retry-shipment`, {
        method: "POST",
      }),
  },
  payment: {
    verifyReturn: (params: URLSearchParams, signal?: AbortSignal) =>
      request<VnpayReturnResponse>(`/payment/vnpay/return?${params.toString()}`, {
        signal,
        auth: false,
      }),
  },
  files: {
    upload: (file: File, folder: string) => {
      const body = new FormData()
      body.append("file", file)
      body.append("folder", folder)
      return request<UploadResult>("/files/upload", { method: "POST", body })
    },
    delete: (publicId: string) =>
      request("/files", { method: "DELETE", query: { publicId } }),
  },
}
