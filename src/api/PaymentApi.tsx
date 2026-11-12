import { useMutation, useQuery } from "@tanstack/react-query"
import { useApp } from "../context"
import { Button, Empty, Heading, Icon } from "../ui"
import { api } from "./client"
import { paymentFromApi } from "./adapters"
import { ApiFailure, ApiLoading, errorMessage, useBackend } from "./Backend"
import { redirectToPayment } from "../lib/navigation"

export function PaymentReturn() {
  const { route, navigate } = useApp()
  const backend = useBackend()
  const hashQuery = route.includes("?")
    ? route.slice(route.indexOf("?") + 1)
    : ""
  const params = new URLSearchParams(hashQuery || window.location.search)
  const queryString = params.toString()
  const query = useQuery({
    queryKey: ["vnpayReturn", backend.baseUrl, queryString],
    // Do not cancel the verification request on StrictMode's development remount.
    queryFn: async () =>
      paymentFromApi(
        await api.payment.verifyReturn(new URLSearchParams(queryString)),
      ),
    enabled: !!queryString,
    staleTime: Infinity,
    retry: false,
    refetchOnMount: false,
  })
  const repay = useMutation({
    mutationFn: () => api.orders.repay(query.data!.orderId!),
    onSuccess: (result) => redirectToPayment(result.paymentUrl),
  })
  const order = useQuery({
    queryKey: ["order", backend.baseUrl, query.data?.orderId],
    queryFn: ({ signal }) => api.orders.byId(query.data!.orderId!, signal),
    enabled:
      !!backend.identity &&
      !!query.data?.orderId &&
      query.data.isSuccess !== true,
  })
  if (!queryString)
    return (
      <main className="container standard-page">
        <Empty
          icon="shield"
          title="Thiếu thông tin giao dịch"
          text="Mở trang này từ kết quả điều hướng VNPAY. Không xác nhận thanh toán chỉ dựa vào tham số trình duyệt."
        >
          <Button onClick={() => navigate("/account/orders")}>
            Xem đơn hàng
          </Button>
        </Empty>
      </main>
    )
  if (query.isPending)
    return (
      <main className="container standard-page">
        <ApiLoading />
        <p className="secure-checkout">
          Đang xác minh kết quả VNPAY với backend…
        </p>
      </main>
    )
  if (query.error)
    return (
      <main className="container standard-page">
        <ApiFailure
          error={errorMessage(query.error)}
          retry={() => void query.refetch()}
        />
        <Button variant="secondary" onClick={() => navigate("/account/orders")}>
          Kiểm tra đơn hàng
        </Button>
      </main>
    )
  const success = query.data?.isSuccess === true
  const orderId = query.data?.orderId
  return (
    <main className="container success-page">
      <span className={`success-icon ${success ? "" : "payment-failed"}`}>
        <Icon name={success ? "check" : "close"} size={38} />
      </span>
      <span className="eyebrow">VNPAY · ĐÃ XÁC MINH VỚI BACKEND</span>
      <Heading level={1}>
        {success ? "Thanh toán thành công." : "Giao dịch không thành công."}
      </Heading>
      <p>
        {query.data?.message ||
          (success
            ? "Backend đã xác nhận giao dịch. Cảm ơn bạn đã chọn SmashHub."
            : "Giao dịch chưa được backend xác nhận thành công. Kiểm tra đơn hàng hoặc lấy liên kết thanh toán mới.")}
      </p>
      {success && (
        <p className="mock-note">
          Đây là kết quả Return URL đã được backend kiểm tra chữ ký. Trạng thái
          đơn hàng được cập nhật riêng qua IPN; xem chi tiết đơn để kiểm tra
          trạng thái mới nhất.
        </p>
      )}
      {repay.error && (
        <p className="error-text" role="alert">
          {errorMessage(repay.error)}
        </p>
      )}
      <div className="button-row payment-return-actions">
        {orderId && (
          <Button
            variant="secondary"
            onClick={() => navigate(`/account/orders/${orderId}`)}
          >
            Chi tiết đơn #{orderId}
          </Button>
        )}
        {!success &&
          orderId &&
          (backend.identity &&
          order.data?.orderStatus === "PENDING_PAYMENT" &&
          order.data.paymentMethod === "VNPAY" ? (
            <Button disabled={repay.isPending} onClick={() => repay.mutate()}>
              {repay.isPending ? "Đang tạo liên kết…" : "Thanh toán lại"}
            </Button>
          ) : !backend.identity ? (
            <Button
              onClick={() =>
                navigate(
                  `/auth/login?redirect=${encodeURIComponent(`/account/orders/${orderId}`)}`,
                )
              }
            >
              Đăng nhập để thanh toán lại
            </Button>
          ) : null)}
        <Button
          variant={success ? "primary" : "secondary"}
          onClick={() => navigate(success ? "/shop" : "/account/orders")}
        >
          {success ? "Tiếp tục mua sắm" : "Xem đơn hàng"}
          <Icon name="arrow" size={16} />
        </Button>
      </div>
    </main>
  )
}
