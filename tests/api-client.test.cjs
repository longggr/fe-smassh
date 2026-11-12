const { test, beforeEach } = require("node:test")
const assert = require("node:assert/strict")
const fs = require("node:fs")
const ts = require("typescript")

require.extensions[".ts"] = (module, filename) => {
  const output = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  })
  module._compile(output.outputText, filename)
}
class MemoryStorage {
  values = new Map()
  getItem(key) { return this.values.get(key) ?? null }
  setItem(key, value) { this.values.set(key, String(value)) }
  removeItem(key) { this.values.delete(key) }
  clear() { this.values.clear() }
}
global.localStorage = new MemoryStorage()
global.sessionStorage = new MemoryStorage()
global.window = new EventTarget()
window.location = { hash: "#/checkout", pathname: "/", href: "http://localhost:3000/" }
let calls = []
let handler
const ok = (result, headers = {}) => new Response(JSON.stringify({ code: 1000, result }), { status: 200, headers: { "Content-Type": "application/json", ...headers } })
const failure = (code, status = 400, message = "Fixture error") => new Response(JSON.stringify({ code, message }), { status, headers: { "Content-Type": "application/json" } })
// Keep this fetch function stable: Axios's fetch adapter caches its environment.
global.fetch = async (input, init) => {
  const req = input instanceof Request ? input : new Request(input, init)
  const raw = await req.clone().text()
  let body
  if (raw && req.headers.get("Content-Type")?.includes("application/json")) body = JSON.parse(raw)
  const call = { url: new URL(req.url), method: req.method, headers: req.headers, body, req }
  calls.push(call)
  return handler(call)
}
const { api, request, session, saveSettings, readSettings, ApiError } = require("../src/api/client.ts")
const { productFromApi, pageData, cartFromApi, addressFromApi, orderFromApi, paymentFromApi } = require("../src/api/adapters.ts")
const { redirectToPayment, safeRedirect, normalizeRoute } = require("../src/lib/navigation.ts")
const { authStore } = require("../src/stores/auth.ts")
beforeEach(() => {
  localStorage.clear(); sessionStorage.clear()
  saveSettings("api", "http://localhost:8080/cms")
  session.clear()
  calls = []
  handler = () => ok({})
  window.location.hash = "#/checkout"
})

test("Axios unwraps the success envelope; repeated attr and zero-based page are preserved", async () => {
  handler = () => ok({ content: [], totalPages: 1 })
  const result = await api.products.search({ page: 0, size: 12, attr: ["gender:Men", "weight:83g"] })
  assert.deepEqual(result, { content: [], totalPages: 1 })
  assert.equal(calls[0].url.pathname, "/cms/products")
  assert.deepEqual(calls[0].url.searchParams.getAll("attr"), ["gender:Men", "weight:83g"])
})
test("login uses actual AuthResponse.token and does not send an old bearer", async () => {
  session.setToken("old-fixture")
  handler = () => ok({ authenticated: true, token: "new-fixture" })
  const result = await api.auth.login({ email: "test@example.test", password: "fixture-password" })
  assert.equal(result.token, "new-fixture")
  assert.equal(calls[0].headers.has("Authorization"), false)
  assert.deepEqual(calls[0].body, { email: "test@example.test", password: "fixture-password" })
})
test("auth is persisted by Zustand and guest identity uses the mandatory localStorage key", async () => {
  session.setToken("fixture-access")
  const state = JSON.parse(localStorage.getItem("smashhub_auth")).state
  assert.equal(state.accessToken, "fixture-access")
  assert.equal(state.refreshToken, undefined)
  session.clearAuth()
  handler = () => ok({ cartToken: "fixture-guest", items: [] }, { "X-Cart-Token": "fixture-guest" })
  await api.cart.add(12, 1)
  assert.equal(calls[0].headers.has("X-Cart-Token"), false)
  assert.equal(localStorage.getItem("smashhub_cart_token"), "fixture-guest")
  assert.equal(sessionStorage.getItem("smashhub_cart_token"), null)
  await api.cart.update(12, 2)
  assert.equal(calls[1].headers.get("X-Cart-Token"), "fixture-guest")
  assert.deepEqual(calls[1].body, { quantity: 2 })
})
test("authenticated carts omit the guest header except for the bodyless merge endpoint", async () => {
  session.setToken("fixture-access")
  session.setCartToken("fixture-guest")
  await api.cart.get()
  await api.cart.merge()
  assert.equal(calls[0].headers.has("X-Cart-Token"), false)
  assert.equal(calls[1].headers.get("Authorization"), "Bearer fixture-access")
  assert.equal(calls[1].headers.get("X-Cart-Token"), "fixture-guest")
  assert.equal(calls[1].body, undefined)
  assert.equal(calls[1].url.pathname, "/cms/cart/merge")
})
test("an anonymous cart response finishing during login still preserves its token for merge", async () => {
  handler = () => {
    session.setToken("just-logged-in")
    return ok({ cartToken: "late-guest-cart", items: [] })
  }
  await api.cart.add(12, 1)
  assert.equal(session.cartToken(), "late-guest-cart")
})
test("concurrent HTTP 401 and business code 1006 perform exactly one refresh and retry all requests", async () => {
  session.setToken("old-access")
  handler = async call => {
    if (call.url.pathname.endsWith("/auth/refresh-token")) {
      assert.deepEqual(call.body, { token: "old-access" })
      await new Promise(resolve => setTimeout(resolve, 30))
      return ok({ token: "rotated-access", authenticated: true })
    }
    if (call.headers.get("Authorization") === "Bearer old-access") return failure(1006, call.url.pathname.endsWith("/addresses") ? 200 : 401)
    assert.equal(call.headers.get("Authorization"), "Bearer rotated-access")
    return ok({ valid: true })
  }
  const results = await Promise.all([api.users.byId(1), api.orders.byId(2), api.addresses.list()])
  assert.equal(results.length, 3)
  assert.equal(calls.filter(call => call.url.pathname.endsWith("/auth/refresh-token")).length, 1)
  assert.equal(session.token(), "rotated-access")
})
test("refresh failure clears the JWT and login email and preserves a safe login redirect", async () => {
  session.setToken("old-access")
  session.setEmail("fixture@example.test")
  handler = () => failure(1006, 401)
  await assert.rejects(api.users.byId(1), error => error.code === 1006)
  assert.equal(session.token(), "")
  assert.equal(session.email(), "")
  assert.match(window.location.hash, /auth\/login\?redirect=%2Fcheckout/)
})
test("a rejected retried request cannot cause an infinite refresh loop", async () => {
  session.setToken("old-access")
  handler = call => call.url.pathname.endsWith("/auth/refresh-token") ? ok({ token: "new-access", authenticated: true }) : failure(1006, 401)
  await assert.rejects(api.users.byId(1))
  assert.equal(calls.filter(call => call.url.pathname.endsWith("/auth/refresh-token")).length, 1)
  assert.equal(calls.filter(call => call.url.pathname.endsWith("/users/id/1")).length, 2)
  assert.equal(session.token(), "")
})
test("403 and stock errors do not refresh an otherwise valid session", async () => {
  session.setToken("valid-access")
  handler = () => failure(1007, 403)
  await assert.rejects(api.brands.delete(2), error => error.code === 1007 && /403/.test(error.message))
  handler = () => failure(2044, 409)
  await assert.rejects(api.cart.add(12, 100), error => error.code === 2044 && /tồn kho/.test(error.message))
  assert.equal(calls.length, 2)
  assert.equal(session.token(), "valid-access")
})
test("account lock and OTP error codes are actionable", async () => {
  handler = () => failure(1023, 409, "Try again in 15 minutes")
  await assert.rejects(api.auth.login({ email: "test@example.test", password: "fixture" }), /15 minutes/)
  handler = () => failure(1019, 400)
  await assert.rejects(api.auth.verify("test@example.test", "000000"), /OTP/)
})
test("location paths, address create and set-default use the supplied contracts", async () => {
  await api.locations.districts(202)
  await api.locations.wards(1442)
  const body = { recipientName: "Fixture User", phone: "0901234567", provinceId: 202, districtId: 1442, wardCode: "20101", line1: "123 Lê Lợi", primary: true }
  await api.addresses.create(body)
  await api.addresses.setDefault(4)
  assert.equal(calls[0].url.pathname, "/cms/locations/provinces/202/districts")
  assert.equal(calls[1].url.pathname, "/cms/locations/districts/1442/wards")
  assert.deepEqual(calls[2].body, body)
  assert.equal(calls[3].method, "PATCH")
  assert.equal(calls[3].url.pathname, "/cms/addresses/4/primary")
})
test("shipping and checkout keep the exact supplied payload; backend calculates final totals", async () => {
  const fee = { shippingMethod: "STANDARD", addressId: 4 }
  const order = { addressId: 4, shippingMethod: "STANDARD", paymentMethod: "VNPAY", note: "Fixture note" }
  await api.shipping.fee(fee)
  await api.orders.checkout(order)
  assert.deepEqual(calls[0].body, fee)
  assert.equal(calls[0].url.pathname, "/cms/shipping/fee")
  assert.deepEqual(calls[1].body, order)
  assert.equal(calls[1].body.total, undefined)
})
test("orders pagination, cancellation reason, repayment and tracking use only supplied routes", async () => {
  await api.orders.list(0, 10)
  await api.orders.cancel(999, "Khách đổi ý & đặt lại")
  await api.orders.repay(999)
  await api.orders.tracking(999)
  assert.equal(calls[0].url.searchParams.get("page"), "0")
  assert.equal(calls[1].url.searchParams.get("reason"), "Khách đổi ý & đặt lại")
  assert.equal(calls[1].body, undefined)
  assert.equal(calls[2].url.pathname, "/cms/orders/999/repay")
  assert.equal(calls[3].url.pathname, "/cms/orders/999/tracking")
})
test("VNPAY return forwards every parameter including duplicates and never trusts ResponseCode alone", async () => {
  const params = new URLSearchParams("vnp_ResponseCode=00&vnp_SecureHash=fixture-hash&extra=a&extra=b")
  handler = () => ok({ status: "FAILED", orderId: 999 })
  const result = await api.payment.verifyReturn(params)
  assert.equal(result.status, "FAILED")
  assert.deepEqual(calls[0].url.searchParams.getAll("extra"), ["a", "b"])
  assert.equal(calls[0].url.searchParams.get("vnp_SecureHash"), "fixture-hash")
  assert.equal(calls[0].headers.has("Authorization"), false)
})
test("payment redirects are limited to HTTPS VNPAY hosts and login redirects remain local", () => {
  assert.throws(() => redirectToPayment("javascript:alert(1)"))
  assert.throws(() => redirectToPayment("https://sandbox.vnpayment.vn.evil.test/pay"))
  redirectToPayment("https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?fixture=1")
  assert.match(window.location.href, /^https:\/\/sandbox.vnpayment.vn\//)
  assert.equal(safeRedirect("//evil.test"), "/account")
  assert.equal(safeRedirect("/checkout"), "/checkout")
  assert.equal(normalizeRoute("/products/fixture-racket"), "/product/slug/fixture-racket")
})
test("summary thumbnail/effective price and nested color variants retain real IDs and active flags", () => {
  const summary = productFromApi({ id: 7, name: "Fixture racket", slug: "fixture", price: 2000000, salePrice: 1800000, effectivePrice: 1800000, thumbnailUrl: "https://example.test/thumb.jpg" })
  assert.equal(summary.images[0], "https://example.test/thumb.jpg")
  assert.equal(summary.price, 1800000)
  const detail = productFromApi({ id: 7, name: "Fixture racket", price: 2000000, colors: [{ id: 10, colorName: "Black", hexCode: "#111111", images: ["https://example.test/black.jpg"], variants: [{ id: 12, sku: "SKU-12", size: "4U", stock: 20, active: true }, { id: 13, sku: "SKU-13", size: "3U", stock: 0, active: false }] }] })
  assert.equal(detail.variants[0].id, 12)
  assert.equal(detail.variants[0].colorId, 10)
  assert.equal(detail.variants[0].colorName, "Black")
  assert.equal(detail.variants[1].status, "INACTIVE")
  assert.equal(detail.colorOptions[0].images[0], "https://example.test/black.jpg")
  assert.equal(pageData({ content: [{}], totalPages: 3, totalElements: 21 }).pages, 3)
})
test("upload lets the fetch adapter provide the multipart boundary", async () => {
  const file = new File(["fixture"], "test.png", { type: "image/png" })
  await api.files.upload(file, "PRODUCT")
  assert.match(calls[0].headers.get("Content-Type"), /^multipart\/form-data; boundary=/)
  const form = await calls[0].req.clone().formData()
  assert.equal(form.get("folder"), "PRODUCT")
  assert.equal(form.get("file").name, "test.png")
})
test("a server change never forwards the previous server's credentials or retains its cart token", async () => {
  session.setToken("server-one-access")
  session.setCartToken("server-one-cart")
  saveSettings("api", "https://different.example.test/cms")
  await api.cart.get()
  assert.equal(calls[0].headers.has("Authorization"), false)
  assert.equal(calls[0].headers.has("X-Cart-Token"), false)
})
test("an in-flight private response cannot be applied after switching accounts", async () => {
  session.setToken("first-user")
  handler = () => {
    session.setToken("second-user")
    return ok({ username: "first-user-private-profile" })
  }
  await assert.rejects(api.users.byId(1), /phiên cũ/)
  assert.equal(session.token(), "second-user")
})
test("malformed payloads and transport failure are explicit, without mock fallback", async () => {
  handler = () => new Response("<html>Gateway unavailable</html>", { status: 502 })
  await assert.rejects(request("/products"), /envelope/)
  handler = () => { throw new TypeError("Network failure fixture") }
  await assert.rejects(request("/products"), /CORS/)
  assert.equal(readSettings().mode, "api")
})
const javaFixtures = require("./fixtures/java-backend.json")
test("actual Java AuthResponse.token works and the old master-prompt pair does not masquerade as this DTO", async () => {
  handler = () => ok(javaFixtures.auth)
  assert.equal((await api.auth.login({ email: "fixture@example.test", password: "fixture-password" })).token, "fixture-current-jwt")
  handler = () => ok({ authenticated: true, accessToken: "not-the-java-contract", refreshToken: "not-the-java-contract" })
  await assert.rejects(api.auth.login({ email: "fixture@example.test", password: "fixture-password" }), /AuthResponse/)
})
test("CartMutationResponse is unwrapped from result.cart and uses effectivePrice / lineTotal / subtotal", async () => {
  handler = () => ok(javaFixtures.cartMutation)
  const cart = cartFromApi(await api.cart.get())
  assert.equal(cart.totalAmount, 3600000)
  assert.equal(cart.items[0].price, 1800000)
  assert.equal(cart.items[0].totalPrice, 3600000)
  assert.equal(cart.items[0].availableStock, 4)
  assert.equal(session.cartToken(), javaFixtures.cartMutation.cartToken)
})
test("productStatus, colorName and attrName/attrValue are read from the attached Java DTOs", () => {
  const product = productFromApi(javaFixtures.product)
  assert.equal(product.status, "ACTIVE")
  assert.equal(product.colors[0], "Black")
  assert.equal(product.variants[0].colorName, "Black")
  assert.deepEqual(product.attributes, [{ name: "weight", value: "83g" }])
})
test("primaryAddress enum maps to the default-address view without inventing a server isDefault field", () => {
  assert.equal(addressFromApi(javaFixtures.address).isDefault, true)
  assert.equal(addressFromApi({ ...javaFixtures.address, primaryAddress: "SECONDARY" }).isDefault, false)
})
test("flattened OrderResponse shipping snapshot is displayed without assuming an address object", () => {
  const order = orderFromApi(javaFixtures.order)
  assert.equal(order.address.recipientName, "Fixture Player")
  assert.equal(order.address.wardName, "Fixture Ward")
  assert.equal(order.total, 3632000)
})
test("VnpayReturnResponse.status is authoritative; no raw-query or isSuccess assumption", () => {
  assert.equal(paymentFromApi(javaFixtures.paymentSuccess).isSuccess, true)
  assert.equal(paymentFromApi(javaFixtures.paymentFailure).isSuccess, false)
  assert.throws(() => paymentFromApi({ isSuccess: true }), /VnpayReturnResponse/)
})
test("admin order endpoints are the actual controller routes, with correct status body and pageable sort", async () => {
  await api.adminOrders.list({ status: "PROCESSING", page: 0, size: 15, sort: "createDate,DESC" })
  await api.adminOrders.byId(999)
  await api.adminOrders.status(999, "SHIPPING", "Fixture audit")
  await api.adminOrders.retryShipment(999)
  assert.equal(calls[0].url.pathname, "/cms/admin/orders")
  assert.equal(calls[0].url.searchParams.get("sort"), "createDate,DESC")
  assert.deepEqual(calls[2].body, { status: "SHIPPING", note: "Fixture audit" })
  assert.equal(calls[3].url.pathname, "/cms/admin/orders/999/retry-shipment")
})
test("user search can request the first complete page with an explicit blank keyword", async () => {
  await api.users.search({ keyword: "", page: 0, size: 10 })
  assert.equal(calls[0].url.searchParams.has("keyword"), true)
  assert.equal(calls[0].url.searchParams.get("keyword"), "")
})
