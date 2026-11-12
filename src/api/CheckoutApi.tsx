import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useApp } from "../context"
import { Badge, Button, Empty, Heading, Icon, Input, Select } from "../ui"
import { Breadcrumb } from "../Store"
import { money } from "../data"
import { ApiError } from "./client"
import { number, text } from "./adapters"
import {
  ApiFailure,
  ApiLoading,
  cartVariantId,
  errorMessage,
  useBackend,
} from "./Backend"
import { useCart } from "../hooks/useCart"
import { useCheckout } from "../hooks/useCheckout"
import { useAddresses, NewAddressModal } from "./AddressApi"
import { redirectToPayment } from "../lib/navigation"
import type { ShippingFeeInput } from "../types/api"

const checkoutSchema = z.object({
  addressId: z.number().int().positive("Chọn địa chỉ giao hàng."),
  shippingMethod: z.enum(["STANDARD", "EXPRESS"]),
  paymentMethod: z.enum(["COD", "VNPAY"]),
  note: z.string().max(1000, "Ghi chú tối đa 1000 ký tự."),
  accepted: z
    .boolean()
    .refine(Boolean, "Bạn cần đồng ý với điều khoản đặt hàng."),
})
type CheckoutValues = z.infer<typeof checkoutSchema>
export function ApiCheckout() {
  const backend = useBackend()
  const { navigate, toast } = useApp()
  const cart = useCart()
  const addresses = useAddresses()
  const [addingAddress, setAddingAddress] = useState(false)
  const [submitError, setSubmitError] = useState("")
  const [submittedId, setSubmittedId] = useState<number | null>(null)
  const form = useForm<CheckoutValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      addressId: 0,
      shippingMethod: "STANDARD",
      paymentMethod: "COD",
      note: "",
      accepted: false,
    },
  })
  const addressId = form.watch("addressId")
  const shippingMethod = form.watch("shippingMethod")
  const paymentMethod = form.watch("paymentMethod")
  useEffect(() => {
    const list = addresses.data
    if (
      list?.length &&
      !list.some((address) => address.id === form.getValues("addressId"))
    )
      form.setValue(
        "addressId",
        (list.find((address) => address.isDefault) || list[0]).id,
      )
  }, [addresses.data, form])
  const address = addresses.data?.find((value) => value.id === addressId)
  const items = backend.cart.map((item) => ({
    variantId: cartVariantId(item),
    quantity: number(item.quantity),
  }))
  const hasIssues =
    number(backend.cartRaw?.issueCount) > 0 ||
    backend.cart.some((item) => item.unavailable || item.stockInsufficient)
  const shippingInput: ShippingFeeInput | null =
    address && items.length && !hasIssues
      ? { shippingMethod, addressId: address.id }
      : null
  const { shipping, checkout, createdOrder, uncertain } =
    useCheckout(shippingInput)
  const quote = shipping.data
  const quoteValid =
    !!quote &&
    Number.isFinite(Number(quote.shippingFee)) &&
    Number(quote.shippingFee) >= 0 &&
    quote.shippingMethod === shippingMethod
  const subtotalValue =
    backend.cartRaw?.totalAmount ??
    backend.cartRaw?.totalPrice ??
    backend.cartRaw?.total
  const subtotal = Number(subtotalValue)
  const hasSubtotal =
    subtotalValue !== undefined && Number.isFinite(subtotal) && subtotal >= 0
  const busy = checkout.isPending || form.formState.isSubmitting
  const submit = form.handleSubmit(async (values) => {
    setSubmitError("")
    if (
      hasIssues ||
      !shippingInput ||
      !quoteValid ||
      shipping.isFetching ||
      !hasSubtotal ||
      submittedId
    ) {
      setSubmitError(
        "Chờ phí GHN hợp lệ và kiểm tra thông tin đơn trước khi gửi.",
      )
      return
    }
    try {
      const order = await checkout.mutateAsync({
        addressId: values.addressId,
        shippingMethod: values.shippingMethod,
        paymentMethod: values.paymentMethod,
        note: values.note,
      })
      setSubmittedId(order.id)
      void backend.reloadCart().catch(() => {})
      if (order.paymentMethod === "VNPAY") redirectToPayment(order.paymentUrl)
      else navigate(`/success/${order.id}`)
    } catch (error) {
      setSubmitError(errorMessage(error))
      if (createdOrder.current) setSubmittedId(createdOrder.current)
      if (error instanceof ApiError && error.code === 2201) {
        toast(error.message)
        navigate("/shop")
      }
      if (error instanceof ApiError && error.code === 2044)
        void backend.reloadCart().catch(() => {})
    }
  })
  if (!backend.identity)
    return (
      <main className="container standard-page">
        <Breadcrumb items={["Home", "Checkout"]} />
        <Empty
          icon="shield"
          title="Đăng nhập để đặt hàng"
          text="Giỏ khách sẽ được hợp nhất sau khi đăng nhập."
        >
          <Button onClick={() => navigate("/auth/login?redirect=%2Fcheckout")}>
            Đăng nhập và tiếp tục
          </Button>
        </Empty>
      </main>
    )
  if (submittedId)
    return (
      <main className="container standard-page">
        <Empty
          icon="box"
          title={`Đơn #${submittedId} đã được tạo`}
          text={
            submitError ||
            "Đang chuyển tới thông tin thanh toán. Không tạo lại đơn hàng."
          }
        >
          <Button onClick={() => navigate(`/account/orders/${submittedId}`)}>
            Xem đơn / thanh toán lại
          </Button>
        </Empty>
      </main>
    )
  if (cart.isLoading) return <ApiLoading />
  if (cart.errorMessage)
    return (
      <main className="container">
        <ApiFailure
          error={cart.errorMessage}
          retry={() => void cart.refetch().catch(() => {})}
        />
      </main>
    )
  if (backend.cartRaw && !items.length)
    return (
      <main className="container standard-page">
        <Empty
          title="Giỏ hàng đang trống"
          text="Thêm sản phẩm trước khi đặt hàng."
        >
          <Button onClick={() => navigate("/shop")}>Khám phá sản phẩm</Button>
        </Empty>
      </main>
    )
  return (
    <main className="container standard-page live-checkout">
      <Breadcrumb items={["Trang chủ", "Giỏ hàng", "Thanh toán"]} />
      <div className="page-intro">
        <span className="eyebrow">THANH TOÁN AN TOÀN · GIAO HÀNG TẬN TAY</span>
        <Heading level={1}>Xác nhận đặt hàng</Heading>
        <p>
          Địa chỉ đã lưu, phí GHN theo thời gian thực và thanh toán an toàn.
        </p>
      </div>
      <div className="checkout-steps">
        <span className="complete">
          01 <span>Giỏ hàng</span>
        </span>
        <i />
        <span className="active">
          02 <span>Thanh toán</span>
        </span>
        <i />
        <span>
          03 <span>Hoàn tất</span>
        </span>
      </div>
      <form id="live-checkout-form" onSubmit={submit} noValidate>
        <div className="commerce-layout">
          <div className="checkout-form">
            <section className="form-section">
              <div className="flex-between">
                <Heading level={3}>01. Địa chỉ nhận hàng</Heading>
                <Button variant="ghost" onClick={() => setAddingAddress(true)}>
                  <Icon name="plus" size={14} />
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
              ) : addresses.data?.length ? (
                <div className="checkout-addresses">
                  {addresses.data.map((value) => (
                    <label
                      key={value.id}
                      className={`choice-card ${
                        addressId === value.id ? "selected" : ""
                      }`}
                    >
                      <input
                        type="radio"
                        name="addressChoice"
                        checked={addressId === value.id}
                        onChange={() =>
                          form.setValue("addressId", value.id, {
                            shouldValidate: true,
                          })
                        }
                      />
                      <span>
                        <strong>
                          {value.recipientName} · {value.phone}
                        </strong>
                        <small>
                          {value.line1}, {value.wardName}, {value.districtName},{" "}
                          {value.provinceName}
                        </small>
                      </span>
                      {value.isDefault && <Badge tone="green">Mặc định</Badge>}
                    </label>
                  ))}
                </div>
              ) : (
                <Empty
                  icon="location"
                  title="Chọn nơi nhận gear mới"
                  text="Thêm địa chỉ để tính phí vận chuyển GHN."
                >
                  <Button onClick={() => setAddingAddress(true)}>
                    Thêm địa chỉ
                  </Button>
                </Empty>
              )}
              {form.formState.errors.addressId && (
                <p className="error-text">
                  {form.formState.errors.addressId.message}
                </p>
              )}
            </section>
            <section className="form-section">
              <Heading level={3}>02. Vận chuyển GHN</Heading>
              {(["STANDARD", "EXPRESS"] as const).map((method) => (
                <label
                  className={`choice-card ${
                    shippingMethod === method ? "selected" : ""
                  }`}
                  key={method}
                >
                  <input
                    type="radio"
                    value={method}
                    {...form.register("shippingMethod")}
                  />
                  <Icon name="truck" />
                  <span>
                    <strong>
                      {method === "STANDARD" ? "Giao tiêu chuẩn" : "Giao nhanh"}
                    </strong>
                    <small>{method}</small>
                  </span>
                </label>
              ))}
              {shipping.isFetching ? (
                <div className="inline-note" role="status">
                  <Icon name="truck" size={17} />
                  Đang lấy phí GHN mới nhất…
                </div>
              ) : shipping.error ? (
                <ApiFailure
                  error={errorMessage(shipping.error)}
                  retry={() => void shipping.refetch()}
                />
              ) : quoteValid ? (
                <div className="shipping-quote">
                  <Icon name="check" size={18} />
                  <span>
                    <strong>
                      {quote.serviceName} · {money(Number(quote.shippingFee))}
                    </strong>
                    <small>
                      {quote.expectedDeliveryDate
                        ? `Dự kiến giao: ${new Date(quote.expectedDeliveryDate).toLocaleString("vi-VN")}`
                        : "Backend chưa cung cấp ngày giao dự kiến."}
                    </small>
                  </span>
                </div>
              ) : (
                <p className="mock-note">
                  Chọn địa chỉ để backend tự tính khối lượng từ giỏ hàng và lấy
                  phí GHN.
                </p>
              )}
            </section>
            <section className="form-section">
              <Heading level={3}>03. Phương thức thanh toán</Heading>
              {(["COD", "VNPAY"] as const).map((method) => (
                <label
                  key={method}
                  className={`choice-card ${
                    paymentMethod === method ? "selected" : ""
                  }`}
                >
                  <input
                    type="radio"
                    value={method}
                    {...form.register("paymentMethod")}
                  />
                  <span>
                    <strong>
                      {method === "COD"
                        ? "Thanh toán khi nhận hàng"
                        : "VNPAY — thanh toán trực tuyến"}
                    </strong>
                    <small>
                      {method === "COD"
                        ? "Trả tiền khi nhận gear."
                        : "Bạn sẽ được chuyển tới cổng VNPAY sau khi tạo đơn."}
                    </small>
                  </span>
                  <Badge>{method}</Badge>
                </label>
              ))}
            </section>
            <section className="form-section">
              <Heading level={3}>04. Ghi chú đơn hàng</Heading>
              <label className="field">
                <span>Ghi chú cho người giao (không bắt buộc)</span>
                <textarea
                  rows={3}
                  placeholder="Ví dụ: giao giờ hành chính"
                  {...form.register("note")}
                />
              </label>
              {form.formState.errors.note && (
                <p className="error-text">
                  {form.formState.errors.note.message}
                </p>
              )}
              <label className="checkbox-row">
                <input type="checkbox" {...form.register("accepted")} />
                Tôi đồng ý với điều khoản đặt hàng và chính sách của SmashHub.
              </label>
              {form.formState.errors.accepted && (
                <p className="error-text">
                  {form.formState.errors.accepted.message}
                </p>
              )}
            </section>
          </div>
          <aside className="order-summary">
            <Heading level={3}>Tóm tắt đơn hàng</Heading>
            <div className="checkout-summary-list">
              {backend.cart.map((item) => (
                <div key={cartVariantId(item)}>
                  <span>
                    <strong>
                      {text(
                        item.productName,
                        `Variant #${cartVariantId(item)}`,
                      )}
                    </strong>
                    <small>Số lượng: {number(item.quantity)}</small>
                  </span>
                  <strong>
                    {item.totalPrice !== undefined
                      ? money(number(item.totalPrice))
                      : "—"}
                  </strong>
                </div>
              ))}
            </div>
            <div className="summary-row">
              <span>Tạm tính</span>
              <strong>
                {hasSubtotal ? money(subtotal) : "Chưa có tổng từ backend"}
              </strong>
            </div>
            <div className="summary-row">
              <span>Phí GHN</span>
              <strong>
                {quoteValid && !shipping.isFetching
                  ? money(Number(quote.shippingFee))
                  : "Đang chờ phí"}
              </strong>
            </div>
            <div className="summary-total">
              <span>Tổng dự kiến</span>
              <strong>
                {hasSubtotal && quoteValid && !shipping.isFetching
                  ? money(subtotal + Number(quote.shippingFee))
                  : "—"}
              </strong>
            </div>
            <p className="tax-note">
              Tổng cuối cùng được backend xác nhận khi đặt hàng.
            </p>
            {hasIssues && (
              <p className="error-text" role="alert">
                Giỏ có sản phẩm không khả dụng hoặc vượt tồn kho. Vui lòng chỉnh
                giỏ hàng trước khi đặt.
              </p>
            )}
            {submitError && (
              <p className="error-text" role="alert">
                {submitError}
              </p>
            )}
            {uncertain && (
              <div className="inline-note" role="alert">
                Kết quả tạo đơn chưa rõ hoặc đơn đang được xử lý. Để tránh tạo
                trùng, không gửi lại checkout; kiểm tra danh sách đơn hàng
                trước.
                <Button
                  variant="ghost"
                  onClick={() => navigate("/account/orders")}
                >
                  Kiểm tra đơn hàng
                </Button>
              </div>
            )}
            <Button
              className="full-width"
              type="submit"
              disabled={
                hasIssues ||
                busy ||
                uncertain ||
                !items.length ||
                !address ||
                !quoteValid ||
                shipping.isFetching ||
                !hasSubtotal
              }
            >
              {busy ? (
                <>
                  <span className="spinner" />
                  Đang đặt hàng…
                </>
              ) : (
                <>
                  Đặt hàng <Icon name="arrow" size={16} />
                </>
              )}
            </Button>
            <span className="secure-checkout">
              <Icon name="shield" size={15} />
              {paymentMethod === "VNPAY"
                ? "Chuyển hướng tới VNPAY sau khi tạo đơn"
                : "Thanh toán khi nhận hàng"}
            </span>
          </aside>
        </div>
      </form>
      {addingAddress && (
        <NewAddressModal
          onClose={() => setAddingAddress(false)}
          onCreated={(value) => form.setValue("addressId", value.id)}
        />
      )}
    </main>
  )
}
