import { useState } from "react"
import { useApp } from "./context"
import { money, ProductArt, brands } from "./data"
import {
  Badge,
  Button,
  Empty,
  Heading,
  Icon,
  IconButton,
  Input,
  Modal,
  Select,
} from "./ui"
import { Breadcrumb, ProductCard, Quantity, SectionTitle } from "./Store"
import { useBackend } from "./api/Backend"
import { ApiAccount, ApiAuth, ApiCart } from "./api/CommerceApi"
import { ApiCheckout } from "./api/CheckoutApi"
import { OrderSuccess } from "./api/OrdersApi"
import { PaymentReturn } from "./api/PaymentApi"

export default function CommercePages() {
  const { route, navigate } = useApp()
  const backend = useBackend()
  if (backend.mode === "api") {
    if (route === "/403")
      return (
        <main className="container standard-page">
          <Empty
            icon="shield"
            title="403 — Không có quyền truy cập"
            text="Backend đã từ chối quyền cho chức năng này."
          >
            <Button onClick={() => navigate("/")}>Về cửa hàng</Button>
          </Empty>
        </main>
      )
    if (route.startsWith("/payment/vnpay/return")) return <PaymentReturn />
    if (route === "/checkout") return <ApiCheckout key={backend.baseUrl} />
    if (route.startsWith("/success"))
      return <OrderSuccess id={Number(route.split("/")[2])} />
    if (route === "/cart") return <ApiCart />
    if (route.startsWith("/auth")) return <ApiAuth key={route} />
    if (route.startsWith("/account")) return <ApiAccount />
  }
  if (
    route === "/cart" ||
    route === "/checkout" ||
    route.startsWith("/success")
  )
    return <CartCheckout />
  if (route.startsWith("/auth")) return <Auth key={route} />
  if (route.startsWith("/account")) return <Account />
  return <InfoPage />
}

export function CartCheckout() {
  const {
    route,
    products,
    cart,
    setCart,
    navigate,
    toast,
    orders,
    setOrders,
    user,
  } = useApp()
  const [code, setCode] = useState("")
  const [discount, setDiscount] = useState(false)
  const [codeError, setCodeError] = useState("")
  const [shipping, setShipping] = useState("STANDARD")
  const [payment, setPayment] = useState("COD")
  const [province, setProvince] = useState("")
  const [district, setDistrict] = useState("")
  const [busy, setBusy] = useState(false)
  const checkout = route === "/checkout"
  const subtotal = cart.reduce(
    (n, c) =>
      n + (products.find((p) => p.id === c.productId)?.price || 0) * c.quantity,
    0,
  )
  const shippingFee = shipping === "EXPRESS" ? 15 : subtotal >= 100 ? 0 : 6
  const total = subtotal + shippingFee - (discount ? subtotal * 0.1 : 0)
  if (route.startsWith("/success"))
    return (
      <main className="container success-page">
        <span className="success-icon">
          <Icon name="check" size={38} />
        </span>
        <span className="eyebrow">ĐƠN HÀNG ĐÃ ĐƯỢC XÁC NHẬN</span>
        <Heading level={1}>Đặt hàng thành công!</Heading>
        <p>Cảm ơn bạn đã mua sắm tại SmashHub. Chúng tôi đang chuẩn bị đơn hàng cho bạn.</p>
        <div className="success-order">
          <span>MÃ ĐƠN HÀNG</span>
          <strong>#{orders[0].id}</strong>
          <p>
            Thông tin xác nhận và mã vận đơn sẽ được gửi đến email của bạn.
            <br />
            Thời gian giao hàng dự kiến: 3–5 ngày làm việc.
          </p>
          <div className="mini-timeline">
            <span className="done">
              <Icon name="check" size={16} />
              Đã xác nhận
            </span>
            <span>
              <Icon name="box" size={16} />
              Đang chuẩn bị
            </span>
            <span>
              <Icon name="truck" size={16} />
              Đang giao hàng
            </span>
          </div>
        </div>
        <div className="button-row">
          <Button onClick={() => navigate("/account/orders")}>
            Xem đơn hàng của bạn
            <Icon name="arrow" size={16} />
          </Button>
          <Button variant="secondary" onClick={() => navigate("/shop")}>
            Tiếp tục mua sắm
          </Button>
        </div>
        <small className="mock-note">
          Đơn hàng thử nghiệm — Chưa trừ tiền thật.
        </small>
      </main>
    )
  if (!cart.length)
    return (
      <main className="container standard-page">
        <Breadcrumb items={["Trang chủ", "Giỏ hàng"]} />
        <div className="page-intro">
          <span className="eyebrow">LỰA CHỌN THÔNG MINH. LỐI CHƠI BẢN LĨNH.</span>
          <Heading level={1}>Giỏ hàng của bạn.</Heading>
        </div>
        <Empty
          title="Giỏ hàng hiện đang trống."
          text="Chưa có sản phẩm nào trong giỏ. Hãy chọn ngay trang bị ưng ý nhé!"
        >
          <Button onClick={() => navigate("/shop")}>
            Khám phá sản phẩm ngay
            <Icon name="arrow" size={16} />
          </Button>
        </Empty>
        <section className="section">
          <SectionTitle title="Sản phẩm được yêu thích" />
          <div className="product-grid">
            {products.slice(0, 4).map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      </main>
    )
  return (
    <main className="container standard-page">
      <Breadcrumb
        items={["Trang chủ", "Giỏ hàng", ...(checkout ? ["Thanh toán"] : [])]}
      />
      <div className="page-intro">
        <span className="eyebrow">
          {checkout
            ? "TIẾN GẦN HƠN TỚI TRẬN ĐẤU"
            : "LỰA CHỌN THÔNG MINH. LỐI CHƠI BẢN LĨNH."}
        </span>
        <Heading level={1}>
          {checkout ? "Xác nhận đặt hàng." : "Giỏ hàng của bạn."}
        </Heading>
        <p>
          {checkout
            ? "Điền thông tin nhận hàng để hoàn tất đơn hàng."
            : `${cart.reduce((n, c) => n + c.quantity, 0)} sản phẩm sẵn sàng cùng bạn ra sân.`}
        </p>
      </div>
      <div className="checkout-steps">
        <span className={!checkout ? "active" : "complete"}>
          01 <span>Giỏ hàng</span>
        </span>
        <i />
        <span className={checkout ? "active" : ""}>
          02 <span>Thanh toán</span>
        </span>
        <i />
        <span>
          03 <span>Hoàn tất</span>
        </span>
      </div>
      <div className="commerce-layout">
        <div>
          {checkout ? (
            <form
              id="checkout-form"
              className="checkout-form"
              onSubmit={(e) => {
                e.preventDefault()
                setBusy(true)
                setTimeout(() => {
                  const form = new FormData(e.target as HTMLFormElement)
                  setOrders([
                    {
                      id: `SH-${10249 + orders.length}`,
                      customer: `${form.get("firstName")} ${form.get("lastName")}`,
                      email: String(form.get("email")),
                      date: new Date().toLocaleDateString("vi-VN", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      }),
                      total,
                      status:
                        payment === "VNPAY" ? "PENDING_PAYMENT" : "PROCESSING",
                      payment,
                      items: cart.reduce((n, c) => n + c.quantity, 0),
                    },
                    ...orders,
                  ])
                  setCart([])
                  setBusy(false)
                  navigate("/success")
                }, 850)
              }}
            >
              <section className="form-section">
                <div className="flex-between">
                  <Heading level={3}>01. Thông tin liên hệ</Heading>
                  {!user && (
                    <Button
                      variant="ghost"
                      onClick={() => navigate("/auth/login")}
                    >
                      Đã có tài khoản? Đăng nhập
                    </Button>
                  )}
                </div>
                <Input
                  name="email"
                  type="email"
                  label="Địa chỉ email"
                  placeholder="you@example.com"
                  required
                />
                <div className="form-grid">
                  <Input
                    name="firstName"
                    label="Tên"
                    required
                    placeholder="Văn"
                  />
                  <Input
                    name="lastName"
                    label="Họ đệm"
                    required
                    placeholder="Nguyễn"
                  />
                </div>
                <Input
                  name="phone"
                  type="tel"
                  label="Số điện thoại"
                  required
                  pattern="[+0-9 ()-]{8,20}"
                  placeholder="+84 912 345 678"
                />
              </section>
              <section className="form-section">
                <Heading level={3}>02. Địa chỉ giao hàng</Heading>
                <Input
                  name="street"
                  label="Địa chỉ cụ thể"
                  required
                  placeholder="Số nhà, tên đường, khu dân cư"
                />
                <Input label="Tòa nhà, số phòng (tùy chọn)" />
                <div className="form-grid">
                  <Select
                    required
                    label="Tỉnh / Thành phố"
                    value={province}
                    onChange={(e) => {
                      setProvince(e.target.value)
                      setDistrict("")
                    }}
                  >
                    <option value="">Chọn tỉnh / thành phố</option>
                    {["TP. Hồ Chí Minh", "Hà Nội", "Đà Nẵng"].map((p) => (
                      <option key={p}>{p}</option>
                    ))}
                  </Select>
                  <Select
                    required
                    label="Quận / Huyện"
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    disabled={!province}
                  >
                    <option value="">Chọn quận / huyện</option>
                    {(province === "TP. Hồ Chí Minh"
                      ? ["Quận 1", "Quận 3", "Bình Thạnh"]
                      : province === "Hà Nội"
                        ? ["Ba Đình", "Hoàn Kiếm", "Cầu Giấy"]
                        : ["Hải Châu", "Sơn Trà", "Thanh Khê"]
                    ).map((d) => (
                      <option key={d}>{d}</option>
                    ))}
                  </Select>
                  <Select required label="Phường / Xã" disabled={!district}>
                    <option value="">Chọn phường / xã</option>
                    {(district === "Quận 1"
                      ? ["Phường Bến Nghé", "Phường Bến Thành", "Phường Đa Kao"]
                      : ["Phường 1", "Phường 2", "Phường 3"]
                    ).map((w) => (
                      <option key={w}>{w}</option>
                    ))}
                  </Select>
                  <Input label="Mã bưu chính (tùy chọn)" />
                </div>
              </section>
              <section className="form-section">
                <Heading level={3}>03. Phương thức vận chuyển</Heading>
                {[
                  [
                    "STANDARD",
                    "Giao hàng tiêu chuẩn",
                    "3–5 ngày làm việc",
                    subtotal >= 100 ? "MIỄN PHÍ" : money(6),
                  ],
                  ["EXPRESS", "Giao hàng hỏa tốc", "1–2 ngày làm việc", money(15)],
                ].map(([v, t, d, p]) => (
                  <label
                    className={`choice-card ${
                      shipping === v ? "selected" : ""
                    }`}
                    key={v}
                  >
                    <input
                      type="radio"
                      name="shipping"
                      value={v}
                      checked={shipping === v}
                      onChange={() => setShipping(v)}
                    />
                    <Icon name="truck" />
                    <span>
                      <strong>{t}</strong>
                      <small>{d}</small>
                    </span>
                    <b>{p}</b>
                  </label>
                ))}
              </section>
              <section className="form-section">
                <Heading level={3}>04. Phương thức thanh toán</Heading>
                {[
                  ["COD", "Thanh toán khi nhận hàng (COD)", "Thanh toán tiền mặt khi giao hàng tận nơi."],
                  ["VNPAY", "VNPAY", "Thanh toán trực tuyến bảo mật qua cổng VNPAY."],
                ].map(([v, t, d]) => (
                  <label
                    className={`choice-card ${payment === v ? "selected" : ""}`}
                    key={v}
                  >
                    <input
                      type="radio"
                      name="payment"
                      value={v}
                      checked={payment === v}
                      onChange={() => setPayment(v)}
                    />
                    <span>
                      <strong>{t}</strong>
                      <small>{d}</small>
                    </span>
                    <Badge>{v}</Badge>
                  </label>
                ))}
                <div className="inline-note">
                  <Icon name="shield" size={16} />
                  Thanh toán thử nghiệm demo. Không trừ tiền thật.
                </div>
              </section>
              <label className="checkbox-row">
                <input type="checkbox" required />Tôi đồng ý với Điều khoản dịch vụ và Chính sách bảo mật của SmashHub.
              </label>
            </form>
          ) : (
            <>
              <div className="cart-table-head">
                <span>SẢN PHẨM</span>
                <span>SỐ LƯỢNG</span>
                <span>THÀNH TIỀN</span>
              </div>
              {cart.map((item, i) => {
                const p = products.find((p) => p.id === item.productId)
                if (!p) return null
                return (
                  <div className="cart-item" key={i}>
                    <Button
                      variant="ghost"
                      className="cart-art"
                      onClick={() => navigate(`/product/${p.id}`)}
                    >
                      <ProductArt product={p} />
                    </Button>
                    <div className="cart-item-info">
                      <span className="eyebrow">{p.brand}</span>
                      <Button
                        variant="ghost"
                        onClick={() => navigate(`/product/${p.id}`)}
                      >
                        {p.name}
                      </Button>
                      <small>
                        {item.color} / {item.variant}
                      </small>
                      <span>{money(p.price)}</span>
                      <Button
                        className="remove-item"
                        variant="ghost"
                        onClick={() => {
                          setCart(cart.filter((_, j) => i !== j))
                          toast("Đã xóa sản phẩm khỏi giỏ hàng.")
                        }}
                      >
                        Xóa
                      </Button>
                    </div>
                    <Quantity
                      value={item.quantity}
                      max={p.stock}
                      onChange={(q) =>
                        setCart(
                          cart.map((c, j) =>
                            i === j ? { ...c, quantity: q } : c,
                          ),
                        )
                      }
                    />
                    <strong>{money(p.price * item.quantity)}</strong>
                  </div>
                )
              })}
              <Button
                variant="ghost"
                className="continue-shopping"
                onClick={() => navigate("/shop")}
              >
                <Icon name="arrow" size={16} />
                Tiếp tục mua hàng
              </Button>
              <div className="cart-assurance">
                <Icon name="shield" size={24} />
                <div>
                  <strong>Trang bị chuẩn. An tâm tuyệt đối.</strong>
                  <p>
                    100% hàng chính hãng. Đổi trả 30 ngày dễ dàng. Đội ngũ am hiểu cầu lông tận tâm hỗ trợ.
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
        <aside className="order-summary">
          <Heading level={3}>Tóm tắt đơn hàng</Heading>
          {checkout && (
            <div className="summary-products">
              {cart.map((c, i) => {
                const p = products.find((p) => p.id === c.productId)!
                return (
                  <div key={i}>
                    <div className="summary-art">
                      <ProductArt product={{ ...p, id: p.id + 800 }} />
                      <Badge>{c.quantity}</Badge>
                    </div>
                    <span>
                      <strong>{p.name}</strong>
                      <small>
                        {c.variant} · {c.color}
                      </small>
                    </span>
                    <b>{money(p.price * c.quantity)}</b>
                  </div>
                )
              })}
            </div>
          )}
          <div className="summary-row">
            <span>Tạm tính</span>
            <strong>{money(subtotal)}</strong>
          </div>
          <div className="summary-row">
            <span>Phí vận chuyển{!checkout && " (ước tính)"}</span>
            <strong className={shippingFee === 0 ? "green-text" : ""}>
              {shippingFee === 0 ? "Miễn phí" : money(shippingFee)}
            </strong>
          </div>
          {discount && (
            <div className="summary-row green-text">
              <span>SMASH10 · Giảm 10%</span>
              <strong>−{money(subtotal * 0.1)}</strong>
            </div>
          )}
          <div className="discount-form">
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Mã giảm giá"
              aria-label="Mã giảm giá"
            />
            <Button
              variant="secondary"
              onClick={() => {
                if (code.toUpperCase() === "SMASH10") {
                  setDiscount(true)
                  setCodeError("")
                  toast("Đã áp dụng giảm 10% cho đơn hàng!")
                } else setCodeError("Mã giảm giá không hợp lệ. Hãy thử SMASH10.")
              }}
            >
              Áp dụng
            </Button>
          </div>
          {codeError && (
            <p className="error-text" role="alert">
              {codeError}
            </p>
          )}
          <small className="discount-hint">
            Mã ưu đãi cho bạn mới: thử <strong>SMASH10</strong>
          </small>
          <div className="summary-total">
            <span>
              Tổng thanh toán
            </span>
            <strong>{money(total)}</strong>
          </div>
          <p className="tax-note">Đã bao gồm thuế GTGT. Không phụ phí ẩn.</p>
          {checkout ? (
            <Button
              className="full-width"
              type="submit"
              form="checkout-form"
              disabled={busy}
            >
              {busy ? "Đang xử lý đặt hàng..." : "Đặt hàng ngay"}
              <Icon name="arrow" size={17} />
            </Button>
          ) : (
            <Button
              className="full-width"
              onClick={() => navigate("/checkout")}
            >
              Tiến hành thanh toán
              <Icon name="arrow" size={17} />
            </Button>
          )}
          <span className="secure-checkout">
            <Icon name="shield" size={15} />
            Thanh toán an toàn & bảo mật 100%
          </span>
          {subtotal < 100 && (
            <div className="free-shipping-progress">
              <span>
                You’re {money(100 - subtotal)} away from free shipping!
              </span>
              <progress value={subtotal} max={100} />
            </div>
          )}
        </aside>
      </div>
    </main>
  )
}

export function Auth() {
  const { route, navigate, setUser, toast } = useApp()
  const mode = route.split("/")[2] || "login"
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  const [resend, setResend] = useState(false)
  const titles: Record<string, [string, string]> = {
    login: ["Welcome back, player.", "Your next great game starts here."],
    register: [
      "Join the SmashHub team.",
      "Good gear. Great games. Your community.",
    ],
    verify: [
      "Check your inbox.",
      "Enter the 6-digit demo code 123456 to verify your email.",
    ],
    forgot: [
      "Let’s get you back in.",
      "Enter your email and we’ll help you reset your password.",
    ],
    reset: ["A fresh start.", "Choose a strong password for your account."],
  }
  const [title, subtitle] = titles[mode] || titles.login
  return (
    <main className="auth-page">
      <div className="auth-story">
        <span className="eyebrow">EVERY GREAT GAME STARTS SOMEWHERE.</span>
        <Heading>
          YOUR COURT.
          <br />
          YOUR COMMUNITY.
        </Heading>
        <p>Gear up with players who love the game as much as you do.</p>
        <ProductArt
          product={{ id: 1001, category: "Rackets", color: "#e75e2e" }}
        />
        <div className="auth-story-footer">
          <Icon name="shield" />
          Trusted gear. Real players. One shared passion.
        </div>
      </div>
      <div className="auth-panel">
        <Button
          variant="ghost"
          className="text-link"
          onClick={() => navigate("/")}
        >
          <Icon name="arrow" size={15} />
          Back to the game
        </Button>
        <span className="eyebrow">SMASHHUB ACCOUNT</span>
        <Heading level={1}>{title}</Heading>
        <p>{subtitle}</p>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            setError("")
            if (
              (mode === "register" || mode === "reset") &&
              password !== confirm
            ) {
              setError("Passwords don’t match. Please try again.")
              return
            }
            const f = new FormData(e.currentTarget)
            if (mode === "verify" && f.get("otp") !== "123456") {
              setError("Incorrect code. Use 123456 for this demo.")
              return
            }
            setBusy(true)
            setTimeout(() => {
              setBusy(false)
              if (mode === "register") navigate("/auth/verify")
              else if (mode === "forgot") {
                navigate("/auth/reset")
                toast("Demo reset link opened. No email was sent.")
              } else if (mode === "reset") {
                navigate("/auth/login")
                toast("Demo password reset complete.")
              } else {
                setUser(
                  mode === "verify"
                    ? "New player"
                    : String(f.get("email")).split("@")[0],
                )
                navigate("/account")
                toast("Welcome to your demo account.")
              }
            }, 600)
          }}
        >
          {mode === "register" && (
            <Input
              name="name"
              label="Full name"
              placeholder="Your full name"
              required
            />
          )}
          {!["verify", "reset"].includes(mode) && (
            <Input
              name="email"
              type="email"
              label="Email address"
              placeholder="you@example.com"
              required
            />
          )}
          {["login", "register", "reset"].includes(mode) && (
            <Input
              label="Password"
              type="password"
              placeholder="At least 8 characters"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          )}
          {["register", "reset"].includes(mode) && (
            <Input
              label="Confirm password"
              type="password"
              required
              minLength={8}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Enter your password again"
            />
          )}
          {mode === "verify" && (
            <Input
              name="otp"
              label="Verification code"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              placeholder="123456"
              required
              className="otp-input"
            />
          )}
          {mode === "login" && (
            <div className="flex-between">
              <label className="checkbox-row">
                <input type="checkbox" />
                Remember me
              </label>
              <Button variant="ghost" onClick={() => navigate("/auth/forgot")}>
                Forgot password?
              </Button>
            </div>
          )}
          {mode === "register" && (
            <label className="checkbox-row">
              <input type="checkbox" required />I agree to the Terms of service
              and Privacy policy.
            </label>
          )}
          {error && (
            <p className="error-text" role="alert">
              {error}
            </p>
          )}
          <Button type="submit" className="full-width" disabled={busy}>
            {busy
              ? "Just a moment..."
              : {
                  login: "Sign in",
                  register: "Create account",
                  verify: "Verify email",
                  forgot: "Send reset link",
                  reset: "Reset password",
                }[mode]}
            <Icon name="arrow" size={16} />
          </Button>
        </form>
        {mode === "verify" ? (
          <Button
            variant="ghost"
            disabled={resend}
            onClick={() => {
              setResend(true)
              toast("Demo code: 123456. No email sent.")
              setTimeout(() => setResend(false), 10000)
            }}
          >
            {resend
              ? "Code requested. Try again shortly."
              : "Didn’t get the code? Resend OTP"}
          </Button>
        ) : (
          <div className="auth-switch">
            {mode === "login" ? "New to the team?" : "Already have an account?"}
            <Button
              variant="ghost"
              onClick={() =>
                navigate(mode === "login" ? "/auth/register" : "/auth/login")
              }
            >
              {mode === "login" ? "Create an account" : "Sign in"}
              <Icon name="arrow" size={14} />
            </Button>
          </div>
        )}
        <div className="inline-note">
          <Icon name="shield" size={15} />
          Frontend demo. Authentication is not connected.
        </div>
      </div>
    </main>
  )
}

export function OrderTimeline({ status }: { status: string }) {
  const steps = ["PAID", "PROCESSING", "SHIPPING", "DELIVERED"]
  const current = steps.indexOf(status)
  if (["CANCELLED", "EXPIRED", "REFUNDED"].includes(status))
    return (
      <div className="inline-note">
        <Icon name="return" />
        This order is {status.toLowerCase()}.
      </div>
    )
  return (
    <div className="order-timeline">
      {steps.map((s, i) => (
        <div className={i <= current ? "done" : ""} key={s}>
          <span>{i <= current ? <Icon name="check" size={15} /> : i + 1}</span>
          <strong>{s.replace("_", " ")}</strong>
          <small>{i <= current ? "Completed" : "Upcoming"}</small>
        </div>
      ))}
    </div>
  )
}
export function Status({ value }: { value: string }) {
  return (
    <Badge
      tone={
        ["ACTIVE", "DELIVERED", "PAID"].includes(value)
          ? "green"
          : ["CANCELLED", "OUT_OF_STOCK", "LOCKED", "DISCONTINUED"].includes(
                value,
              )
            ? "red"
            : ["PROCESSING", "SHIPPING"].includes(value)
              ? "blue"
              : "amber"
      }
    >
      {value.replace(/_/g, " ").toLowerCase()}
    </Badge>
  )
}

export function Account() {
  const {
    route,
    navigate,
    user,
    setUser,
    toast,
    orders,
    setOrders,
    products,
    wishlist,
    addresses,
    setAddresses,
  } = useApp()
  const section = route.split("/")[2] || "overview"
  const [modal, setModal] = useState("")
  const [editAddress, setEditAddress] = useState(-1)
  const [selectedOrder, setSelectedOrder] = useState("")
  const [error, setError] = useState("")
  const tabs = [
    ["overview", "grid", "Tổng quan"],
    ["profile", "user", "Thông tin cá nhân"],
    ["orders", "box", "Đơn hàng của tôi"],
    ["addresses", "location", "Sổ địa chỉ"],
    ["wishlist", "heart", "Yêu thích"],
    ["security", "shield", "Mật khẩu & Bảo mật"],
    ["settings", "settings", "Cài đặt tài khoản"],
  ]
  const order = orders.find((o) => o.id === selectedOrder)
  return (
    <main className="container account-page">
      <Breadcrumb items={["Trang chủ", "Tài khoản của tôi"]} />
      <div className="page-intro">
        <span className="eyebrow">KHÔNG GIAN DÀNH CHO BẠN</span>
        <Heading level={1}>Xin chào, {user || "Văn Nguyễn"}.</Heading>
        <p>Quản lý đơn hàng, địa chỉ và trang bị yêu thích của bạn.</p>
      </div>
      <div className="account-layout">
        <aside className="account-sidebar">
          <div className="account-avatar">
            {(user || "VN").slice(0, 2).toUpperCase()}
          </div>
          <strong>{user || "Văn Nguyễn"}</strong>
          <small>
            {user ? `${user}@example.com` : "van.nguyen@email.com"}
          </small>
          {tabs.map(([s, i, t]) => (
            <Button
              key={s}
              variant="ghost"
              className={section === s ? "active" : ""}
              onClick={() => navigate(`/account/${s}`)}
            >
              <Icon name={i} size={18} />
              {t}
              {s === "wishlist" && <Badge>{wishlist.length}</Badge>}
            </Button>
          ))}
          <Button variant="ghost" onClick={() => setModal("logout")}>
            <Icon name="logout" size={18} />
            Đăng xuất
          </Button>
        </aside>
        <section className="account-content">
          {section === "overview" ? (
            <>
              <SectionTitle title="Tổng quan tài khoản" />
              <div className="account-stats">
                {[
                  ["box", "Đơn hàng", orders.length, "orders"],
                  ["heart", "Yêu thích", wishlist.length, "wishlist"],
                  ["location", "Địa chỉ lưu", addresses.length, "addresses"],
                ].map(([i, t, n, s]) => (
                  <Button
                    variant="ghost"
                    key={t}
                    onClick={() => navigate(`/account/${s}`)}
                  >
                    <Icon name={String(i)} size={23} />
                    <strong>{n}</strong>
                    <span>{t}</span>
                    <Icon name="arrow" size={16} />
                  </Button>
                ))}
              </div>
              <SectionTitle
                title="Đơn hàng gần đây"
                link="Xem tất cả"
                onClick={() => navigate("/account/orders")}
              />
              <div className="order-cards">
                {orders.slice(0, 2).map((o) => (
                  <div className="account-order" key={o.id}>
                    <div className="flex-between">
                      <strong>#{o.id}</strong>
                      <Status value={o.status} />
                    </div>
                    <p>
                      {o.date} · {o.items} sản phẩm · {money(o.total)}
                    </p>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setSelectedOrder(o.id)
                        navigate("/account/orders")
                      }}
                    >
                      Xem đơn hàng
                      <Icon name="arrow" size={14} />
                    </Button>
                  </div>
                ))}
              </div>
            </>
          ) : section === "wishlist" ? (
            <>
              <SectionTitle title="Danh sách yêu thích" />
              {wishlist.length ? (
                <div className="product-grid account-product-grid">
                  {products
                    .filter((p) => wishlist.includes(p.id))
                    .map((p) => (
                      <ProductCard key={p.id} product={p} />
                    ))}
                </div>
              ) : (
                <Empty
                  icon="heart"
                  title="Danh sách yêu thích trống."
                  text="Nhấn vào icon trái tim ở bất kỳ sản phẩm nào để lưu lại tại đây."
                >
                  <Button onClick={() => navigate("/shop")}>
                    Khám phá sản phẩm
                  </Button>
                </Empty>
              )}
            </>
          ) : section === "orders" ? (
            <>
              <SectionTitle
                title={order ? `Đơn hàng #${order.id}` : "Đơn hàng của bạn"}
              />
              {order ? (
                <>
                  <div className="flex-between">
                    <Button
                      variant="ghost"
                      onClick={() => setSelectedOrder("")}
                    >
                      ← Tất cả đơn hàng
                    </Button>
                    <Status value={order.status} />
                  </div>
                  <OrderTimeline status={order.status} />
                  <div className="order-info-cards">
                    <div>
                      <Heading level={4}>Địa chỉ giao hàng</Heading>
                      <p>
                        {order.customer}
                        <br />
                        72 Nguyễn Huệ, Phường Bến Nghé
                        <br />
                        Quận 1, TP. Hồ Chí Minh
                        <br />
                        +84 912 345 678
                      </p>
                    </div>
                    <div>
                      <Heading level={4}>Chi tiết thanh toán</Heading>
                      <p>
                        {order.payment === "COD"
                          ? "Thanh toán khi nhận hàng (COD)"
                          : "Thanh toán trực tuyến VNPAY"}
                        <br />
                        Tổng thanh toán: {money(order.total)}
                        <br />
                        Ngày đặt: {order.date}
                      </p>
                    </div>
                  </div>
                  <div className="order-line">
                    <ProductArt product={products[0]} />
                    <span>
                      <strong>{products[0].name}</strong>
                      <small>4U / G5 · Original · SL: {order.items}</small>
                    </span>
                    <strong>{money(order.total)}</strong>
                  </div>
                  {["PENDING_PAYMENT", "PAID", "PROCESSING"].includes(
                    order.status,
                  ) && (
                    <Button
                      variant="secondary"
                      onClick={() => setModal("cancel")}
                    >
                      Hủy đơn hàng
                    </Button>
                  )}
                </>
              ) : (
                <div className="order-cards">
                  {orders.map((o) => (
                    <div className="account-order" key={o.id}>
                      <div className="flex-between">
                        <strong>#{o.id}</strong>
                        <Status value={o.status} />
                      </div>
                      <p>
                        {o.date} · {o.items} sản phẩm · {o.payment}
                      </p>
                      <div className="flex-between">
                        <strong>{money(o.total)}</strong>
                        <Button
                          variant="secondary"
                          onClick={() => setSelectedOrder(o.id)}
                        >
                          Xem chi tiết
                          <Icon name="arrow" size={14} />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : section === "addresses" ? (
            <>
              <SectionTitle
                title="Địa chỉ đã lưu"
                link="Thêm địa chỉ"
                onClick={() => {
                  setEditAddress(-1)
                  setModal("address")
                }}
              />
              <div className="address-grid">
                {addresses.map((a, i) => (
                  <div className="address-card" key={i}>
                    {i === 0 && <Badge tone="green">Mặc định</Badge>}
                    <Heading level={3}>{a.name}</Heading>
                    <p>
                      {a.street}
                      <br />
                      {a.ward}, {a.district}
                      <br />
                      {a.city}
                      <br />
                      {a.phone}
                    </p>
                    <div className="button-row">
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setEditAddress(i)
                          setModal("address")
                        }}
                      >
                        <Icon name="edit" size={15} />
                        Sửa
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setAddresses(addresses.filter((_, j) => i !== j))
                          toast("Đã xóa địa chỉ.")
                        }}
                      >
                        <Icon name="trash" size={15} />
                        Xóa
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              {!addresses.length && (
                <Empty
                  icon="location"
                  title="Bạn muốn nhận hàng ở đâu?"
                  text="Thêm địa chỉ để việc đặt hàng nhanh chóng hơn."
                >
                  <Button onClick={() => setModal("address")}>
                    Thêm địa chỉ mới
                  </Button>
                </Empty>
              )}
            </>
          ) : section === "security" ? (
            <>
              <SectionTitle title="Mật khẩu & Bảo mật" />
              <form
                className="profile-form"
                onSubmit={(e) => {
                  e.preventDefault()
                  const f = new FormData(e.currentTarget)
                  if (f.get("new") !== f.get("confirm")) {
                    setError("Mật khẩu xác nhận không khớp.")
                    return
                  }
                  setError("")
                  e.currentTarget.reset()
                  toast("Đã đổi mật khẩu thành công.")
                }}
              >
                <Input
                  type="password"
                  label="Mật khẩu hiện tại"
                  required
                  minLength={8}
                />
                <Input
                  type="password"
                  name="new"
                  label="Mật khẩu mới"
                  required
                  minLength={8}
                />
                <Input
                  type="password"
                  name="confirm"
                  label="Xác nhận mật khẩu mới"
                  required
                  minLength={8}
                />
                {error && <p className="error-text">{error}</p>}
                <Button type="submit">Cập nhật mật khẩu</Button>
                <small className="mock-note">
                  Chế độ demo: không đổi mật khẩu trên máy chủ thật.
                </small>
              </form>
            </>
          ) : section === "settings" ? (
            <>
              <SectionTitle title="Cài đặt tài khoản" />
              <form
                className="profile-form"
                onSubmit={(e) => {
                  e.preventDefault()
                  toast(
                    "Đã lưu tùy chọn thông báo của bạn.",
                  )
                }}
              >
                {[
                  ["Cập nhật đơn hàng", "Thông báo cho tôi khi đơn hàng có thay đổi trạng thái."],
                  [
                    "Hàng mới về & Ưu đãi",
                    "Nhận thông báo về sản phẩm mới và khuyến mãi đặc quyền.",
                  ],
                  ["Bí quyết từ chuyên gia", "Mẹo và kỹ thuật hữu ích từ các tay vợt chuyên nghiệp."],
                ].map(([t, d], i) => (
                  <label className="preference" key={t}>
                    <span>
                      <strong>{t}</strong>
                      <small>{d}</small>
                    </span>
                    <input type="checkbox" defaultChecked={i < 2} />
                  </label>
                ))}
                <Button type="submit">Lưu cài đặt</Button>
              </form>
            </>
          ) : (
            <>
              <SectionTitle title="Thông tin cá nhân" />
              <form
                className="profile-form"
                onSubmit={(e) => {
                  e.preventDefault()
                  const f = new FormData(e.currentTarget)
                  setUser(String(f.get("name")))
                  toast("Đã lưu thông tin cá nhân.")
                }}
              >
                <Input
                  name="name"
                  label="Họ và tên"
                  defaultValue={user || "Văn Nguyễn"}
                  required
                />
                <Input
                  type="email"
                  label="Địa chỉ email"
                  defaultValue="van.nguyen@email.com"
                  required
                />
                <Input
                  type="tel"
                  label="Số điện thoại"
                  defaultValue="+84 912 345 678"
                />
                <div className="form-grid">
                  <Input type="date" label="Ngày sinh" />
                  <Select label="Giới tính">
                    <option>Không tiết lộ</option>
                    <option>Nam</option>
                    <option>Nữ</option>
                    <option>Khác</option>
                  </Select>
                </div>
                <Button type="submit">
                  Lưu thay đổi
                  <Icon name="check" size={16} />
                </Button>
              </form>
            </>
          )}
        </section>
      </div>
      {modal && (
        <Modal
          title={
            modal === "logout"
              ? "Bạn muốn đăng xuất?"
              : modal === "cancel"
                ? "Hủy đơn hàng này?"
                : editAddress >= 0
                  ? "Sửa địa chỉ"
                  : "Thêm địa chỉ mới"
          }
          onClose={() => setModal("")}
        >
          {modal === "address" ? (
            <form
              className="dialog-form"
              onSubmit={(e) => {
                e.preventDefault()
                const f = new FormData(e.currentTarget)
                const a = {
                  name: String(f.get("name")),
                  street: String(f.get("street")),
                  city: String(f.get("city")),
                  district: String(f.get("district")),
                  ward: String(f.get("ward")),
                  phone: String(f.get("phone")),
                }
                setAddresses(
                  editAddress >= 0
                    ? addresses.map((v, i) => (i === editAddress ? a : v))
                    : [...addresses, a],
                )
                setModal("")
                toast("Đã lưu địa chỉ.")
              }}
            >
              <Input
                name="name"
                label="Họ và tên"
                required
                defaultValue={addresses[editAddress]?.name}
              />
              <Input
                name="phone"
                label="Số điện thoại"
                required
                defaultValue={addresses[editAddress]?.phone}
              />
              <Input
                name="street"
                label="Địa chỉ cụ thể"
                required
                defaultValue={addresses[editAddress]?.street}
              />
              <div className="form-grid">
                {[
                  ["city", "Tỉnh / Thành phố"],
                  ["district", "Quận / Huyện"],
                  ["ward", "Phường / Xã"],
                ].map(([k, label]) => (
                  <Input
                    name={k}
                    key={k}
                    label={label}
                    required
                    defaultValue={addresses[editAddress]?.[(k as "city")]}
                  />
                ))}
              </div>
              <Button type="submit">Lưu địa chỉ</Button>
            </form>
          ) : (
            <>
              <p>
                {modal === "logout"
                  ? "Bạn có thể đăng nhập lại bất cứ lúc nào để tiếp tục mua sắm."
                  : "Thao tác này sẽ hủy đơn hàng của bạn. Bạn luôn có thể đặt lại khi sẵn sàng."}
              </p>
              <div className="modal-actions">
                <Button variant="secondary" onClick={() => setModal("")}>
                  {modal === "logout" ? "Ở lại" : "Giữ đơn hàng"}
                </Button>
                <Button
                  onClick={() => {
                    if (modal === "logout") {
                      setUser("")
                      navigate("/")
                    } else {
                      setOrders(
                        orders.map((o) =>
                          o.id === selectedOrder
                            ? { ...o, status: "CANCELLED" }
                            : o,
                        ),
                      )
                      toast("Order cancelled.")
                    }
                    setModal("")
                  }}
                >
                  {modal === "logout" ? "Sign out" : "Yes, cancel order"}
                </Button>
              </div>
            </>
          )}
        </Modal>
      )}
    </main>
  )
}

export function InfoPage() {
  const { route, navigate, toast } = useApp()
  const backend = useBackend()
  const brandNames =
    backend.mode === "api"
      ? backend.brands.map((brand) => String(brand.name || ""))
      : brands
  const title = decodeURIComponent(
    route.split("/")[2] ||
      (route === "/about"
        ? "For the love of the game."
        : route === "/brands"
          ? "The best in badminton."
          : "Let’s talk badminton."),
  )
  if (route === "/brands")
    return (
      <main className="container standard-page">
        <Breadcrumb items={["Home", "Brands"]} />
        <div className="page-intro">
          <span className="eyebrow">TRUSTED ON EVERY COURT</span>
          <Heading level={1}>{title}</Heading>
          <p>Discover the names behind your next great game.</p>
        </div>
        <div className="brand-cards">
          {brandNames.map((b, i) => (
            <Button
              variant="ghost"
              key={b}
              onClick={() => navigate(`/shop?brand=${b}`)}
            >
              <span className="brand-word">{b.toUpperCase()}</span>
              <p>
                {
                  [
                    "Innovation that defines the game.",
                    "Precision. Performance. Victory.",
                    "Anything is possible.",
                    "Engineered for movement.",
                    "Driven by the love of sport.",
                  ][i]
                }
              </p>
              <span className="text-link">
                Shop {b}
                <Icon name="arrow" size={17} />
              </span>
            </Button>
          ))}
        </div>
      </main>
    )
  return (
    <main className="container info-page">
      <Breadcrumb items={["Home", title]} />
      <div className="page-intro">
        <span className="eyebrow">THE SMASHHUB WAY</span>
        <Heading level={1}>{title}</Heading>
      </div>
      {route === "/contact" ? (
        <div className="contact-layout">
          <div>
            <Heading>Players helping players.</Heading>
            <p>
              Need advice on your next racket? Have a question about an order?
              Our team knows the game and is here to help.
            </p>
            <p>
              <strong>Email</strong>
              <br />
              support@smashhub.com
            </p>
            <p>
              <strong>Phone</strong>
              <br />
              +84 (28) 3822 6688
            </p>
            <p>
              <strong>Hours</strong>
              <br />
              Monday – Saturday, 9am – 6pm (GMT+7)
            </p>
          </div>
          <form
            className="profile-form"
            onSubmit={(e) => {
              e.preventDefault()
              toast(
                "Demo message received. For real support, email support@smashhub.com.",
              )
              e.currentTarget.reset()
            }}
          >
            <Input label="Your name" required />
            <Input label="Email address" type="email" required />
            <Select label="Topic">
              <option>Product advice</option>
              <option>My order</option>
              <option>Returns & exchanges</option>
              <option>Something else</option>
            </Select>
            <label className="field">
              <span>Your message</span>
              <textarea required rows={5} />
            </label>
            <Button type="submit">
              Send message
              <Icon name="arrow" size={17} />
            </Button>
          </form>
        </div>
      ) : route === "/about" ? (
        <div className="prose">
          <Heading>More than a store. A shared obsession.</Heading>
          <p>
            SmashHub was built for the early-morning players, the one-more-game
            crowd, and everyone who knows the feeling of a perfectly timed
            smash.
          </p>
          <p>
            We believe the right gear can change your game. That’s why we bring
            together the best badminton brands, genuine expertise, and a
            community that shares your passion.
          </p>
          <div className="values-grid">
            {[
              [
                "100% authentic",
                "Every product sourced from trusted brand partners.",
              ],
              [
                "Player-first advice",
                "Honest recommendations from people who play.",
              ],
              [
                "Better, together",
                "Supporting your journey from first rally to match point.",
              ],
            ].map(([t, d]) => (
              <div key={t}>
                <Icon name="shield" />
                <Heading level={3}>{t}</Heading>
                <p>{d}</p>
              </div>
            ))}
          </div>
          <Button onClick={() => navigate("/shop")}>
            Find your edge
            <Icon name="arrow" size={17} />
          </Button>
        </div>
      ) : (
        <div className="prose">
          {title.includes("Shipping") ? (
            <>
              <Heading>Less waiting. More playing.</Heading>
              <p>
                Standard delivery takes 3–5 business days and costs $6. Orders
                over $100 ship free. Express delivery takes 1–2 business days
                and costs $15.
              </p>
              <Heading level={3}>Tracking your order</Heading>
              <p>
                Find delivery progress and your order status in My Account → My
                Orders.
              </p>
            </>
          ) : title.includes("Returns") ? (
            <>
              <Heading>Find your perfect fit.</Heading>
              <p>
                Return unused gear in its original packaging within 30 days of
                delivery. Email support@smashhub.com with your order number to
                arrange a return or exchange. Personalized and strung rackets
                may not be eligible.
              </p>
            </>
          ) : title.includes("Size") ? (
            <>
              <Heading>Get your fit right.</Heading>
              <p>
                Measure from heel to longest toe. Choose the larger size if
                you’re between sizes.
              </p>
              <table>
                <thead>
                  <tr>
                    <th>US</th>
                    <th>EU</th>
                    <th>Foot length</th>
                  </tr>
                </thead>
                <tbody>
                  {[7, 8, 9, 10, 11].map((n, i) => (
                    <tr key={n}>
                      <td>{n}</td>
                      <td>{40 + i}</td>
                      <td>{25 + i * 0.5} cm</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          ) : title.includes("FAQs") ? (
            <>
              {[
                [
                  "Is every product authentic?",
                  "Yes. All SmashHub gear is sourced from trusted brand partners.",
                ],
                [
                  "Can I change my order?",
                  "Orders can be cancelled before shipping from your account. For changes, contact our team.",
                ],
                [
                  "Which payment methods are available?",
                  "Cash on delivery (COD) and VNPAY are the target payment options. This frontend runs in demo mode.",
                ],
                [
                  "How do I track my delivery?",
                  "Visit My Account → My Orders and open your order to see its tracking timeline.",
                ],
              ].map(([q, a]) => (
                <details key={q}>
                  <summary>
                    {q}
                    <Icon name="plus" size={15} />
                  </summary>
                  <p>{a}</p>
                </details>
              ))}
            </>
          ) : (
            <>
              <Heading level={3}>{title}</Heading>
              <p>
                SmashHub is committed to transparent, player-first service. We
                respect your privacy, only collect information needed to support
                your shopping experience, and do not sell personal information.
              </p>
              <p>
                This application is a frontend demonstration. Product data and
                checkout are simulated, and no payment or authentication
                services are connected. Final legal policies must be reviewed
                before commercial launch.
              </p>
              <p>Questions? Contact support@smashhub.com.</p>
            </>
          )}
          <Button variant="secondary" onClick={() => navigate("/contact")}>
            Talk to our team
            <Icon name="arrow" size={16} />
          </Button>
        </div>
      )}
    </main>
  )
}
