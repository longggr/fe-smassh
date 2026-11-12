import { useEffect, useState } from "react"
import { useApp } from "../context"
import { Button, Empty, Heading, Icon, Input, Modal } from "../ui"
import { Breadcrumb, ProductCard } from "../Store"
import { money } from "../data"
import { api, ApiError, isRecord, session } from "./client"
import { number, text } from "./adapters"
import { useAuth } from "../hooks/useAuth"
import { useCart } from "../hooks/useCart"
import { safeRedirect } from "../lib/navigation"
import { AddressBook } from "./AddressApi"
import { CustomerOrders, OrderDetail } from "./OrdersApi"
import {
  ApiFailure,
  ApiLoading,
  cartVariantId,
  errorMessage,
  useBackend,
} from "./Backend"

export function ApiAuth() {
  const { route, navigate, toast } = useApp()
  const backend = useBackend()
  const mode = route.split("?")[0].split("/")[2] || "login"
  const auth = useAuth()
  const [email, setEmail] = useState(
    sessionStorage.getItem("smashhub-pending-email") || "",
  )
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [errorCode, setErrorCode] = useState<number | undefined>()
  const [cooldown, setCooldown] = useState(0)
  useEffect(() => {
    if (!cooldown) return
    const timer = setTimeout(() => setCooldown((n) => n - 1), 1000)
    return () => clearTimeout(timer)
  }, [cooldown])
  const title: Record<string, string> = {
    login: "Welcome back, player.",
    register: "Join the SmashHub team.",
    verify: "Xác thực tài khoản.",
    forgot: "Quên mật khẩu?",
    reset: "Đặt lại mật khẩu.",
  }
  return (
    <main className="api-auth-page">
      <span className="eyebrow">SMASHHUB · TÀI KHOẢN THẬT</span>
      <Heading level={1}>{title[mode]}</Heading>
      <p className="mock-note">
        Yêu cầu được gửi trực tiếp tới Spring Boot. Không sử dụng OTP hoặc tài
        khoản giả.
      </p>
      <form
        className="dialog-form"
        onSubmit={async (e) => {
          e.preventDefault()
          if (busy) return
          const data = new FormData(e.currentTarget)
          setError("")
          setErrorCode(undefined)
          setBusy(true)
          try {
            const password = String(data.get("password") || "")
            const confirm = String(data.get("confirm") || "")
            if (["register", "reset"].includes(mode) && password !== confirm)
              throw new ApiError("Mật khẩu xác nhận không khớp.")
            sessionStorage.setItem("smashhub-pending-email", email)
            if (mode === "login") {
              await auth.login(email, password)
              navigate(
                safeRedirect(
                  new URLSearchParams(route.split("?")[1]).get("redirect"),
                ),
              )
              toast("Đăng nhập thành công.")
            } else if (mode === "register") {
              await api.users.register({
                username: String(data.get("username")),
                email,
                password,
                confirmPassword: confirm,
                phone: String(data.get("phone")),
              })
              navigate("/auth/verify")
              toast("Đăng ký thành công. Vui lòng kiểm tra OTP trong email.")
            } else if (mode === "verify") {
              await api.auth.verify(email, String(data.get("otp")))
              navigate("/auth/login")
              toast("Xác thực thành công. Bạn có thể đăng nhập.")
            } else if (mode === "forgot") {
              await api.auth.forgot(email)
              navigate("/auth/reset")
              toast("Yêu cầu đặt lại mật khẩu đã được gửi.")
            } else if (mode === "reset") {
              await api.auth.reset({
                email,
                otp: String(data.get("otp")),
                newPassword: password,
                confirmNewPassword: confirm,
              })
              navigate("/auth/login")
              toast("Đặt lại mật khẩu thành công.")
            }
          } catch (e) {
            setError(errorMessage(e))
            setErrorCode(e instanceof ApiError ? e.code : undefined)
            if (e instanceof ApiError && [1009, 1023].includes(e.code || 0))
              toast(e.message)
          } finally {
            setBusy(false)
          }
        }}
      >
        {mode === "register" && (
          <Input
            name="username"
            label="Username"
            required
            autoComplete="username"
          />
        )}
        <Input
          type="email"
          label="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
        />
        {mode === "register" && (
          <Input
            name="phone"
            label="Số điện thoại"
            type="tel"
            autoComplete="tel"
            required
          />
        )}
        {["verify", "reset"].includes(mode) && (
          <Input
            name="otp"
            label="OTP nhận qua email"
            inputMode="numeric"
            pattern="[0-9]{6}"
            minLength={6}
            maxLength={6}
            required
            autoComplete="one-time-code"
          />
        )}
        {errorCode === 1019 && (
          <p className="error-text" role="alert">
            {error}
          </p>
        )}
        {["login", "register", "reset"].includes(mode) && (
          <Input
            name="password"
            label={mode === "reset" ? "Mật khẩu mới" : "Mật khẩu"}
            type="password"
            minLength={8}
            required
            autoComplete={
              mode === "login" ? "current-password" : "new-password"
            }
          />
        )}
        {["register", "reset"].includes(mode) && (
          <Input
            name="confirm"
            label="Xác nhận mật khẩu"
            type="password"
            minLength={8}
            autoComplete="new-password"
            required
          />
        )}
        {error && errorCode !== 1019 && (
          <p className="error-text" role="alert">
            {error}
          </p>
        )}
        <Button type="submit" disabled={busy}>
          {busy
            ? "Đang xử lý…"
            : {
                login: "Đăng nhập",
                register: "Tạo tài khoản",
                verify: "Xác thực OTP",
                forgot: "Gửi yêu cầu",
                reset: "Đặt lại mật khẩu",
              }[mode]}
          <Icon name="arrow" size={16} />
        </Button>
        {mode === "login" && (
          <div className="flex-between">
            <Button variant="ghost" onClick={() => navigate("/auth/register")}>
              Đăng ký
            </Button>
            <Button variant="ghost" onClick={() => navigate("/auth/forgot")}>
              Quên mật khẩu?
            </Button>
          </div>
        )}
        {mode === "verify" && (
          <Button
            variant="secondary"
            disabled={busy || cooldown > 0 || !email}
            onClick={async () => {
              setBusy(true)
              setError("")
              try {
                await api.auth.resend(email)
                setCooldown(60)
                toast("Đã gửi lại OTP.")
              } catch (e) {
                setError(errorMessage(e))
              } finally {
                setBusy(false)
              }
            }}
          >
            {cooldown ? `Gửi lại sau ${cooldown}s` : "Gửi lại OTP"}
          </Button>
        )}
        {mode !== "login" && (
          <Button variant="ghost" onClick={() => navigate("/auth/login")}>
            Quay lại đăng nhập
          </Button>
        )}
      </form>
    </main>
  )
}

export function ApiCart() {
  const { route, navigate, toast } = useApp()
  const backend = useBackend()
  useCart()
  const [remove, setRemove] = useState<number | "all" | null>(null)
  const [localError, setLocalError] = useState("")

  const mutate = async (action: () => Promise<unknown>) => {
    setLocalError("")
    try {
      await backend.mutateCart(action)
      toast("Giỏ hàng đã cập nhật từ backend.")
      setRemove(null)
    } catch (e) {
      setLocalError(errorMessage(e))
    }
  }
  return (
    <main className="container standard-page">
      <Breadcrumb items={["Home", "Shopping bag"]} />
      <div className="page-intro">
        <span className="eyebrow">YOUR NEXT GAME · LIVE CART</span>
        <Heading level={1}>Your shopping bag.</Heading>
        <p>
          Giỏ hàng được đồng bộ theo JWT hoặc X-Cart-Token. Giá trị phản hồi của
          backend là nguồn chính xác.
        </p>
      </div>
      {backend.cartError || localError ? (
        <>
          <ApiFailure
            error={localError || backend.cartError}
            retry={() => void backend.reloadCart().catch(() => {})}
          />
          {backend.identity && session.cartToken() && (
            <Button
              variant="secondary"
              disabled={backend.cartBusy}
              onClick={() =>
                void backend
                  .mergeGuest()
                  .catch((error) => setLocalError(errorMessage(error)))
              }
            >
              Thử hợp nhất giỏ khách
            </Button>
          )}
        </>
      ) : null}
      {backend.cartBusy && !backend.cartRaw ? (
        <ApiLoading />
      ) : !backend.cartRaw ? null : !backend.cart.length ? (
        <Empty
          title="Giỏ hàng đang trống"
          text="Chọn biến thể sản phẩm để bắt đầu."
        >
          <Button onClick={() => navigate("/shop")}>Khám phá sản phẩm</Button>
        </Empty>
      ) : (
        <>
          <div className="api-cart-table">
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Sản phẩm / biến thể</th>
                    <th>Đơn giá</th>
                    <th>Số lượng</th>
                    <th>Thành tiền</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {backend.cart.map((item, index) => {
                    const variant = isRecord(item.variant) ? item.variant : {}
                    const product = isRecord(item.product)
                      ? item.product
                      : isRecord(variant.product)
                        ? variant.product
                        : {}
                    const variantId = cartVariantId(item)
                    const quantity = number(item.quantity)
                    const price = item.price ?? item.unitPrice ?? variant.price
                    const total = item.totalPrice ?? item.subtotal ?? item.total
                    return (
                      <tr key={variantId || index}>
                        <td>
                          <strong>
                            {text(
                              item.productName ?? product.name,
                              `Variant #${variantId || "?"}`,
                            )}
                          </strong>
                          <small className="table-sub">
                            {text(item.sku ?? variant.sku)} ·{" "}
                            {text(item.size ?? variant.size)} ·{" "}
                            {text(item.colorName)} · ID {variantId || "chưa có"}
                          </small>
                          {Boolean(
                            item.unavailable || item.stockInsufficient,
                          ) && (
                            <p className="error-text">
                              {item.unavailable
                                ? "Sản phẩm không khả dụng"
                                : `Chỉ còn ${number(item.availableStock)} sản phẩm`}
                            </p>
                          )}
                        </td>
                        <td>
                          {price !== undefined
                            ? money(number(price))
                            : "Backend chưa trả giá"}
                        </td>
                        <td>
                          <div className="quantity">
                            <Button
                              variant="ghost"
                              disabled={
                                backend.cartBusy || quantity <= 1 || !variantId
                              }
                              onClick={() =>
                                void mutate(() =>
                                  api.cart.update(variantId, quantity - 1),
                                )
                              }
                            >
                              −
                            </Button>
                            <span>{quantity}</span>
                            <Button
                              variant="ghost"
                              disabled={
                                backend.cartBusy ||
                                !variantId ||
                                Boolean(item.unavailable) ||
                                (item.availableStock !== undefined &&
                                  quantity >= number(item.availableStock))
                              }
                              onClick={() =>
                                void mutate(() =>
                                  api.cart.update(variantId, quantity + 1),
                                )
                              }
                            >
                              +
                            </Button>
                          </div>
                        </td>
                        <td>
                          {total !== undefined ? money(number(total)) : "—"}
                        </td>
                        <td>
                          <Button
                            variant="ghost"
                            disabled={backend.cartBusy || !variantId}
                            onClick={() => setRemove(variantId)}
                          >
                            Xóa
                          </Button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div className="api-cart-bottom">
              <Button
                variant="secondary"
                disabled={backend.cartBusy}
                onClick={() => setRemove("all")}
              >
                Xóa toàn bộ giỏ
              </Button>
              <span>
                Tổng tiền từ backend:{" "}
                <strong>
                  {backend.cartRaw?.totalPrice !== undefined ||
                  backend.cartRaw?.totalAmount !== undefined ||
                  backend.cartRaw?.total !== undefined
                    ? money(
                        number(
                          backend.cartRaw.totalPrice ??
                            backend.cartRaw.totalAmount ??
                            backend.cartRaw.total,
                        ),
                      )
                    : "Chưa có trong response"}
                </strong>
              </span>
              <Button
                disabled={
                  backend.cartBusy ||
                  !backend.cart.length ||
                  number(backend.cartRaw?.issueCount) > 0 ||
                  backend.cart.some(
                    (item) => item.unavailable || item.stockInsufficient,
                  )
                }
                onClick={() => navigate("/checkout")}
              >
                Checkout
                <Icon name="arrow" size={16} />
              </Button>
            </div>
          </div>
          {!backend.identity && !session.cartToken() && (
            <p className="error-text">
              Chưa nhận cart token từ backend. Không thể cập nhật giỏ khách an
              toàn.
            </p>
          )}
        </>
      )}
      {remove !== null && (
        <Modal
          title={
            remove === "all"
              ? "Xóa toàn bộ giỏ hàng?"
              : "Xóa sản phẩm khỏi giỏ?"
          }
          onClose={() => setRemove(null)}
        >
          <p>Thao tác sẽ cập nhật giỏ thật trên backend.</p>
          <div className="modal-actions">
            <Button variant="secondary" onClick={() => setRemove(null)}>
              Hủy
            </Button>
            <Button
              disabled={backend.cartBusy}
              onClick={() =>
                void mutate(() =>
                  remove === "all" ? api.cart.clear() : api.cart.remove(remove),
                )
              }
            >
              Xác nhận xóa
            </Button>
          </div>
        </Modal>
      )}
    </main>
  )
}

export function ApiAccount() {
  const { route, navigate, toast, products, wishlist } = useApp()
  const backend = useBackend()
  const section = route.split("/")[2] || "profile"
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  const [logoutDialog, setLogoutDialog] = useState(false)
  useEffect(() => {
    if (backend.identity)
      void backend.refreshProfile().catch((e) => setError(errorMessage(e)))
  }, [backend.identity, backend.refreshProfile])
  if (!backend.identity)
    return (
      <main className="container standard-page">
        <Empty
          icon="user"
          title="Đăng nhập để xem tài khoản"
          text="Chế độ API không sử dụng tài khoản mẫu."
        >
          <Button onClick={() => navigate("/auth/login")}>Đăng nhập</Button>
        </Empty>
      </main>
    )
  const profile = backend.profile
  return (
    <main className="container account-page">
      <Breadcrumb items={["Home", "My account"]} />
      <div className="page-intro">
        <span className="eyebrow">TÀI KHOẢN · SPRING BOOT</span>
        <Heading level={1}>
          Hey, {text(profile?.username, backend.identity.email)}.
        </Heading>
        <p>{backend.identity.email}</p>
      </div>
      <div className="account-layout">
        <aside className="account-sidebar">
          {[
            ["profile", "Thông tin cá nhân"],
            ["security", "Đổi mật khẩu"],
            ["wishlist", "Wishlist"],
            ["orders", "Đơn hàng"],
            ["addresses", "Địa chỉ"],
          ].map(([s, title]) => (
            <Button
              variant="ghost"
              key={s}
              className={s === section ? "active" : ""}
              onClick={() => {
                setError("")
                navigate(`/account/${s}`)
              }}
            >
              {title}
            </Button>
          ))}
          <Button variant="ghost" onClick={() => setLogoutDialog(true)}>
            <Icon name="logout" size={16} />
            Đăng xuất
          </Button>
        </aside>
        <section className="account-content">
          {backend.cartError && session.cartToken() && (
            <div className="inline-note" role="alert">
              {backend.cartError}
              <Button
                variant="secondary"
                disabled={backend.cartBusy}
                onClick={() =>
                  void backend
                    .mergeGuest()
                    .catch((error) => toast(errorMessage(error)))
                }
              >
                Thử hợp nhất giỏ khách
              </Button>
            </div>
          )}
          {error && (
            <p className="error-text" role="alert">
              {error}
            </p>
          )}
          {section === "security" ? (
            <>
              <Heading level={2}>Đổi mật khẩu</Heading>
              <form
                className="profile-form api-form"
                onSubmit={async (e) => {
                  e.preventDefault()
                  const form = e.currentTarget
                  const data = new FormData(form)
                  setError("")
                  setBusy(true)
                  try {
                    if (data.get("new") !== data.get("confirm"))
                      throw new ApiError("Mật khẩu xác nhận không khớp.")
                    await api.users.password({
                      currentPassword: String(data.get("current")),
                      newPassword: String(data.get("new")),
                      confirmNewPassword: String(data.get("confirm")),
                    })
                    form.reset()
                    toast("Đổi mật khẩu thành công.")
                  } catch (e) {
                    setError(errorMessage(e))
                  } finally {
                    setBusy(false)
                  }
                }}
              >
                <Input
                  name="current"
                  label="Mật khẩu hiện tại"
                  type="password"
                  required
                  autoComplete="current-password"
                />
                <Input
                  name="new"
                  label="Mật khẩu mới"
                  type="password"
                  minLength={8}
                  required
                  autoComplete="new-password"
                />
                <Input
                  name="confirm"
                  label="Xác nhận mật khẩu mới"
                  type="password"
                  minLength={8}
                  required
                  autoComplete="new-password"
                />
                <Button type="submit" disabled={busy}>
                  Đổi mật khẩu
                </Button>
              </form>
              <div className="inline-note api-token-tools">
                <Icon name="shield" size={16} />
                Backend hiện dùng một JWT; việc gia hạn gửi JWT hiện tại tới
                /auth/refresh-token. Không cần nhập token thủ công.
              </div>
            </>
          ) : section === "wishlist" ? (
            <>
              <Heading>Wishlist</Heading>
              <p className="mock-note">
                Chỉ lưu tạm trong giao diện; chưa có Wishlist API.
              </p>
              <div className="product-grid account-product-grid api-products">
                {products
                  .filter((p) => wishlist.includes(p.id))
                  .map((p) => (
                    <ProductCard key={p.id} product={p} />
                  ))}
              </div>
            </>
          ) : section === "orders" ? (
            route.split("/")[3] ? (
              <OrderDetail
                key={route.split("/")[3]}
                id={Number(route.split("/")[3])}
              />
            ) : (
              <CustomerOrders />
            )
          ) : section === "addresses" ? (
            <AddressBook />
          ) : section === "settings" ? (
            <Empty
              icon="box"
              title="Chưa có API cho chức năng này"
              text="Giữ màn hình demo riêng; không hiển thị đơn hàng hoặc địa chỉ mẫu như dữ liệu của tài khoản thật."
            >
              <Button variant="secondary" onClick={backend.showSettings}>
                Xem ở chế độ demo
              </Button>
            </Empty>
          ) : !profile ? (
            <ApiFailure
              error={error || "Chưa lấy được hồ sơ người dùng theo email."}
              retry={() =>
                void backend
                  .refreshProfile()
                  .catch((e) => setError(errorMessage(e)))
              }
            />
          ) : (
            <>
              <Heading>Thông tin cá nhân</Heading>
              <form
                key={text(profile.id)}
                className="profile-form api-form"
                onSubmit={async (e) => {
                  e.preventDefault()
                  const data = new FormData(e.currentTarget)
                  setBusy(true)
                  setError("")
                  try {
                    if (profile.id === undefined)
                      throw new ApiError("User response thiếu id để cập nhật.")
                    const username = String(data.get("username")).trim()
                    const phone = String(data.get("phone")).trim()
                    const changes: {
                      username?: string
                      phone?: string
                    } = {}
                    if (username !== text(profile.username))
                      changes.username = username
                    if (phone !== text(profile.phone)) changes.phone = phone
                    if (!Object.keys(changes).length) {
                      toast("Không có thay đổi để lưu.")
                      return
                    }
                    const updated = await api.users.update(
                      text(profile.id),
                      changes,
                    )
                    if (changes.username) {
                      await backend.logout()
                      navigate("/auth/login")
                      toast(
                        changes.phone &&
                          (!isRecord(updated) ||
                            updated.phone !== changes.phone)
                          ? "Đã đổi username; backend chưa lưu phone. Hãy đăng nhập lại."
                          : "Đã đổi username. Đăng nhập lại vì JWT chứa username cũ.",
                      )
                    } else {
                      await backend.refreshProfile()
                      if (
                        changes.phone &&
                        (!isRecord(updated) || updated.phone !== changes.phone)
                      )
                        throw new ApiError(
                          "Backend hiện chưa áp dụng thay đổi số điện thoại. Không thể báo lưu thành công.",
                        )
                      toast("Đã cập nhật thông tin từ backend.")
                    }
                  } catch (e) {
                    setError(errorMessage(e))
                  } finally {
                    setBusy(false)
                  }
                }}
              >
                <Input
                  name="username"
                  label="Username"
                  defaultValue={text(profile.username)}
                  required
                />
                <Input label="Email" value={backend.identity.email} disabled />
                <Input
                  name="phone"
                  label="Số điện thoại"
                  defaultValue={text(profile.phone)}
                  type="tel"
                />
                <Button type="submit" disabled={busy}>
                  Lưu thay đổi
                </Button>
              </form>
            </>
          )}
        </section>
      </div>
      {logoutDialog && (
        <Modal
          title="Đăng xuất tài khoản?"
          onClose={() => setLogoutDialog(false)}
        >
          <p>Token sẽ được gửi tới /auth/logout để thu hồi phiên.</p>
          {error && (
            <p className="error-text" role="alert">
              {error}
            </p>
          )}
          <div className="modal-actions">
            <Button variant="secondary" onClick={() => setLogoutDialog(false)}>
              Hủy
            </Button>
            <Button
              disabled={busy}
              onClick={async () => {
                setBusy(true)
                setError("")
                try {
                  await backend.logout()
                  navigate("/auth/login")
                  toast("Đăng xuất thành công.")
                } catch (e) {
                  setError(errorMessage(e))
                } finally {
                  setBusy(false)
                }
              }}
            >
              Đăng xuất
            </Button>
          </div>
        </Modal>
      )}
    </main>
  )
}
