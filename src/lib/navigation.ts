export function normalizeRoute(path: string) {
  const question = path.indexOf("?")
  const pathname = question < 0 ? path : path.slice(0, question)
  const query = question < 0 ? "" : path.slice(question)
  const aliases: Record<string, string> = {
    "/login": "/auth/login",
    "/register": "/auth/register",
    "/verify-otp": "/auth/verify",
    "/forgot-password": "/auth/forgot",
    "/reset-password": "/auth/reset",
    "/products": "/shop",
  }
  if (aliases[pathname]) return aliases[pathname] + query
  if (pathname.startsWith("/products/"))
    return `/product/slug/${pathname.slice(10)}${query}`
  return path
}
export function currentRoute() {
  return normalizeRoute(
    decodeURI(
      window.location.hash.slice(1) ||
        `${window.location.pathname}${window.location.search}` ||
        "/",
    ),
  )
}
export function safeRedirect(value: string | null, fallback = "/account") {
  if (
    !value ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\") ||
    value.includes("\n") ||
    value.includes("\r")
  )
    return fallback
  const route = normalizeRoute(value)
  return route.startsWith("/auth/") ? fallback : route
}
export function redirectToPayment(paymentUrl: unknown) {
  if (typeof paymentUrl !== "string" || !paymentUrl)
    throw new Error(
      "Backend chưa trả paymentUrl. Đơn đã được tạo; mở chi tiết đơn để thử thanh toán lại.",
    )
  const url = new URL(paymentUrl)
  const host = url.hostname
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    !(
      host === "vnpayment.vn" ||
      host.endsWith(".vnpayment.vn") ||
      host === "vnpay.vn" ||
      host.endsWith(".vnpay.vn")
    )
  )
    throw new Error("paymentUrl không phải địa chỉ HTTPS hợp lệ của VNPAY.")
  window.location.href = url.href
}
export function identityFromAccessToken(token: string, knownEmail = "") {
  try {
    const encoded = token.split(".")[1]
    const base64 = encoded.replace(/-/g, "+").replace(/_/g, "/")
    const claims = JSON.parse(
      new TextDecoder().decode(
        Uint8Array.from(
          atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "=")),
          (character) => character.charCodeAt(0),
        ),
      ),
    )
    if (typeof claims.sub !== "string" || !claims.sub) throw new Error()
    const roles =
      typeof claims.scope === "string"
        ? claims.scope.split(/\s+/).filter(Boolean)
        : Array.isArray(claims.scope)
          ? claims.scope.filter((role: unknown) => typeof role === "string")
          : []
    return {
      subject: claims.sub as string,
      email: typeof claims.email === "string" ? claims.email : knownEmail,
      roles: roles as string[],
    }
  } catch {
    throw new Error("Access token không có cấu trúc JWT / subject hợp lệ.")
  }
}
