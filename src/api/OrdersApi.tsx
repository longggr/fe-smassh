import { useRef, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useApp } from "../context"
import { Badge, Button, Empty, Heading, Icon, Input, Modal } from "../ui"
import { Breadcrumb, Pagination } from "../Store"
import { money, statuses } from "../data"
import { OrderTimeline, Status } from "../Commerce"
import { api, ApiError, isRecord } from "./client"
import { number, pageData, rows, text, orderFromApi } from "./adapters"
import { ApiFailure, ApiLoading, errorMessage, useBackend } from "./Backend"
import { redirectToPayment } from "../lib/navigation"
import type { Order } from "../types/api"

function useOrder(id: number) {
  const backend = useBackend()
  return useQuery({
    queryKey: ["order", backend.baseUrl, id],
    queryFn: async ({ signal }) =>
      orderFromApi(await api.orders.byId(id, signal)),
    enabled: !!backend.identity && Number.isInteger(id) && id > 0,
  })
}
export function CustomerOrders() {
  const backend = useBackend()
  const { navigate } = useApp()
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState("")
  const query = useQuery({
    queryKey: ["orders", backend.baseUrl, backend.identity?.email, page],
    queryFn: ({ signal }) => api.orders.list(page - 1, 10, signal),
    enabled: !!backend.identity,
  })
  const data = query.data
    ? pageData(query.data)
    : { items: [], pages: 1, total: 0 }
  const orders = data.items.map(orderFromApi)
  const visible = orders.filter(
    (order) => !status || order.orderStatus === status,
  )
  return (
    <>
      <div className="section-heading">
        <Heading>Đơn hàng của tôi</Heading>
        <span className="muted">{data.total} đơn hàng</span>
      </div>
      <div className="admin-tabs order-status-tabs">
        <Button
          variant="ghost"
          className={!status ? "active" : ""}
          onClick={() => setStatus("")}
        >
          Tất cả
        </Button>
        {statuses.map((value) => (
          <Button
            variant="ghost"
            key={value}
            className={status === value ? "active" : ""}
            onClick={() => setStatus(value)}
          >
            {value.replace(/_/g, " ")}
          </Button>
        ))}
      </div>
      {status && (
        <p className="mock-note">
          Lọc trạng thái trong trang hiện tại; API danh sách hiện chỉ quy định
          page và size.
        </p>
      )}
      {query.isPending ? (
        <ApiLoading />
      ) : query.error ? (
        <ApiFailure
          error={errorMessage(query.error)}
          retry={() => void query.refetch()}
        />
      ) : !visible.length ? (
        <Empty
          icon="box"
          title="Chưa có đơn hàng phù hợp"
          text={
            status
              ? "Thử bỏ bộ lọc hoặc xem trang khác."
              : "Đơn hàng mới sẽ xuất hiện tại đây sau khi checkout."
          }
        >
          <Button onClick={() => navigate("/shop")}>Khám phá sản phẩm</Button>
        </Empty>
      ) : (
        <div className="live-order-cards">
          {visible.map((order) => (
            <article className="account-order" key={order.id}>
              <div className="flex-between">
                <strong>#{order.orderCode || order.id}</strong>
                <Status value={order.orderStatus} />
              </div>
              <p>
                {order.createDate || order.createdAt
                  ? new Date(
                      order.createDate || order.createdAt!,
                    ).toLocaleString("vi-VN")
                  : "Backend chưa cung cấp ngày tạo"}{" "}
                · {order.paymentMethod}
              </p>
              <div className="flex-between">
                <strong>{money(order.total)}</strong>
                <Button
                  variant="secondary"
                  onClick={() => navigate(`/account/orders/${order.id}`)}
                >
                  Xem chi tiết <Icon name="arrow" size={14} />
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}
      <Pagination
        page={page}
        total={Math.max(1, data.pages)}
        onChange={setPage}
      />
    </>
  )
}
export function OrderDetail({ id }: { id: number }) {
  const backend = useBackend()
  const { navigate, toast } = useApp()
  const client = useQueryClient()
  const orderQuery = useOrder(id)
  const [cancel, setCancel] = useState(false)
  const [reason, setReason] = useState("")
  const [cannotCancel, setCannotCancel] = useState(false)
  const [showTracking, setShowTracking] = useState(false)
  const [error, setError] = useState("")
  const actionLock = useRef(false)
  const order = orderQuery.data
  const tracking = useQuery({
    queryKey: ["tracking", backend.baseUrl, id],
    queryFn: ({ signal }) => api.orders.tracking(id, signal),
    enabled: !!order && showTracking,
  })
  const cancellation = useMutation({
    mutationFn: async () => {
      if (actionLock.current) throw new ApiError("Đơn hàng đang được xử lý.")
      actionLock.current = true
      try {
        return await api.orders.cancel(id, reason.trim())
      } finally {
        actionLock.current = false
      }
    },
    onSuccess: async () => {
      setCancel(false)
      toast("Đơn hàng đã được hủy.")
      await Promise.all([
        client.invalidateQueries({ queryKey: ["order", backend.baseUrl, id] }),
        client.invalidateQueries({ queryKey: ["orders", backend.baseUrl] }),
      ])
    },
    onError: (error) => {
      setError(errorMessage(error))
      if (error instanceof ApiError && error.code === 2301) {
        setCannotCancel(true)
        setCancel(false)
        void orderQuery.refetch()
      }
    },
  })
  const repayment = useMutation({
    mutationFn: async () => {
      if (actionLock.current) throw new ApiError("Đơn hàng đang được xử lý.")
      actionLock.current = true
      try {
        return await api.orders.repay(id)
      } finally {
        actionLock.current = false
      }
    },
    onSuccess: (value) => {
      try {
        redirectToPayment(value.paymentUrl)
      } catch (e) {
        setError(errorMessage(e))
      }
    },
    onError: (error) => setError(errorMessage(error)),
  })
  if (!Number.isInteger(id) || id <= 0)
    return <ApiFailure error="Mã đơn hàng không hợp lệ." />
  if (orderQuery.isPending) return <ApiLoading />
  if (orderQuery.error instanceof ApiError && orderQuery.error.code === 2308)
    return (
      <>
        <ApiFailure error={orderQuery.error.message} />
        <Button onClick={() => navigate("/shop")}>Đặt đơn mới</Button>
        {error && <p className="error-text">{error}</p>}
      </>
    )
  if (orderQuery.error)
    return (
      <ApiFailure
        error={errorMessage(orderQuery.error)}
        retry={() => void orderQuery.refetch()}
      />
    )
  if (!order) return <ApiFailure error="Backend chưa trả chi tiết đơn hàng." />
  const eligibleCancel =
    ["PENDING_PAYMENT", "PROCESSING"].includes(order.orderStatus) &&
    !cannotCancel
  const eligibleRepay =
    order.paymentMethod === "VNPAY" && order.orderStatus === "PENDING_PAYMENT"
  const busy = cancellation.isPending || repayment.isPending
  return (
    <>
      <div className="section-heading">
        <div>
          <Button
            variant="ghost"
            className="back-order-link"
            onClick={() => navigate("/account/orders")}
          >
            ← Tất cả đơn hàng
          </Button>
          <Heading>Đơn #{order.orderCode || order.id}</Heading>
        </div>
        <Status value={order.orderStatus} />
      </div>
      {error && (
        <p className="error-text" role="alert">
          {error}
        </p>
      )}
      <OrderTimeline status={order.orderStatus} />
      <div className="order-info-cards">
        <div>
          <Heading level={4}>Thông tin thanh toán</Heading>
          <p>
            {order.paymentMethod}
            <br />
            Tạm tính: {money(order.subtotal)}
            <br />
            Phí vận chuyển: {money(order.shippingCost)}
            <br />
            <strong>Tổng: {money(order.total)}</strong>
          </p>
        </div>
        <div>
          <Heading level={4}>Địa chỉ nhận hàng</Heading>
          {order.address ? (
            <p>
              {order.address.recipientName} · {order.address.phone}
              <br />
              {order.address.line1}
              <br />
              {order.address.wardName}, {order.address.districtName},{" "}
              {order.address.provinceName}
            </p>
          ) : (
            <p>Response đơn hàng chưa cung cấp địa chỉ chi tiết.</p>
          )}
        </div>
      </div>
      <section className="live-order-items">
        <Heading level={3}>Sản phẩm trong đơn</Heading>
        {Array.isArray(order.items) && order.items.length ? (
          order.items.map((item, index) => (
            <div className="order-line" key={`${item.variantId}-${index}`}>
              <span>
                <strong>
                  {item.productName ||
                    item.sku ||
                    `Variant #${item.variantId || "—"}`}
                </strong>
                <small>
                  {item.colorName} {item.size} · SKU {item.sku || "—"}
                </small>
                <small>Số lượng: {item.quantity}</small>
              </span>
              <strong>
                {item.totalPrice !== undefined
                  ? money(item.totalPrice)
                  : item.price !== undefined || item.unitPrice !== undefined
                    ? money(
                        Number(item.price ?? item.unitPrice) * item.quantity,
                      )
                    : "Backend chưa trả giá dòng"}
              </strong>
            </div>
          ))
        ) : (
          <p className="mock-note">Backend chưa trả danh sách sản phẩm.</p>
        )}
      </section>
      {order.note && <p className="inline-note">Ghi chú: {order.note}</p>}
      <div className="button-row live-order-actions">
        {eligibleCancel && (
          <Button
            variant="secondary"
            disabled={busy}
            onClick={() => {
              setError("")
              setCancel(true)
            }}
          >
            Hủy đơn hàng
          </Button>
        )}
        {eligibleRepay && (
          <Button
            disabled={busy}
            onClick={() => {
              setError("")
              repayment.mutate()
            }}
          >
            {repayment.isPending
              ? "Đang tạo liên kết…"
              : order.orderStatus === "EXPIRED"
                ? "Thanh toán lại"
                : "Tiếp tục thanh toán"}
            <Icon name="arrow" size={16} />
          </Button>
        )}
        <Button
          variant="secondary"
          onClick={() => setShowTracking(!showTracking)}
        >
          <Icon name="truck" size={16} />
          {showTracking ? "Ẩn hành trình GHN" : "Theo dõi GHN"}
        </Button>
      </div>
      {order.orderStatus === "EXPIRED" && (
        <div className="inline-note">
          Đơn đã EXPIRED. Backend hiện chỉ cho thanh toán lại đơn
          PENDING_PAYMENT; hãy đặt đơn mới hoặc liên hệ hỗ trợ.
        </div>
      )}
      {showTracking && (
        <section className="ghn-tracking">
          <Heading level={3}>Hành trình vận chuyển</Heading>
          {tracking.isPending ? (
            <ApiLoading />
          ) : tracking.error ? (
            <ApiFailure
              error={errorMessage(tracking.error)}
              retry={() => void tracking.refetch()}
            />
          ) : (
            <TrackingEvents value={tracking.data} />
          )}
        </section>
      )}
      {cancel && (
        <Modal title="Hủy đơn hàng?" onClose={() => setCancel(false)}>
          <form
            className="dialog-form"
            onSubmit={(event) => {
              event.preventDefault()
              if (!busy) cancellation.mutate()
            }}
          >
            <p>
              Backend sẽ kiểm tra trạng thái giao hàng trước khi hủy đơn #
              {order.id}.
            </p>
            <Input
              label="Lý do hủy"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              minLength={3}
              maxLength={500}
              required
            />
            {error && (
              <p className="error-text" role="alert">
                {error}
              </p>
            )}
            <div className="modal-actions">
              <Button variant="secondary" onClick={() => setCancel(false)}>
                Giữ đơn
              </Button>
              <Button type="submit" disabled={busy || reason.trim().length < 3}>
                {busy ? "Đang hủy…" : "Xác nhận hủy"}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </>
  )
}
export function TrackingEvents({ value }: { value: unknown }) {
  if (
    isRecord(value) &&
    (typeof value.statusName === "string" ||
      typeof value.orderCode === "string")
  )
    return (
      <div className="spec-grid">
        {[
          ["Mã vận đơn GHN", value.orderCode],
          ["Trạng thái", value.statusName || value.status],
          ["Mã tham chiếu", value.clientOrderCode],
          ["Phí", value.fee !== undefined ? money(number(value.fee)) : "—"],
          [
            "COD",
            value.codAmount !== undefined
              ? money(number(value.codAmount))
              : "—",
          ],
          ["Dự kiến giao", value.expectedDeliveryDate],
        ].map(([label, data]) => (
          <div key={text(label)}>
            <span>{text(label)}</span>
            <strong>{text(data, "—")}</strong>
          </div>
        ))}
      </div>
    )
  let events: Record<string, unknown>[] = []
  if (Array.isArray(value)) events = rows(value)
  else if (isRecord(value)) {
    const container = value.events ?? value.logs ?? value.log
    if (Array.isArray(container)) events = rows(container)
  }
  if (!events.length)
    return (
      <>
        <p className="mock-note">
          Chưa có mốc hành trình chuẩn hóa từ GHN. Dữ liệu backend trả về:
        </p>
        <pre className="api-json">{JSON.stringify(value ?? null, null, 2)}</pre>
      </>
    )
  return (
    <ol className="tracking-events">
      {events.map((event, index) => (
        <li key={index}>
          <span className="tracking-dot" />
          <div>
            <strong>
              {text(
                event.status ?? event.statusName ?? event.description,
                "Cập nhật GHN",
              )}
            </strong>
            <p>{text(event.note ?? event.description)}</p>
            <small>
              {text(
                event.updated_date ?? event.updatedAt ?? event.time,
                "Backend chưa cung cấp thời gian",
              )}
            </small>
          </div>
        </li>
      ))}
    </ol>
  )
}
export function OrderSuccess({ id }: { id: number }) {
  const backend = useBackend()
  const { navigate } = useApp()
  const order = useOrder(id)
  if (!backend.identity)
    return (
      <main className="container standard-page">
        <Empty
          title="Đăng nhập để xem đơn hàng"
          text="Không hiển thị đơn mẫu ở chế độ API."
        >
          <Button
            onClick={() =>
              navigate(
                `/auth/login?redirect=${encodeURIComponent(`/success/${id}`)}`,
              )
            }
          >
            Đăng nhập
          </Button>
        </Empty>
      </main>
    )
  if (!Number.isInteger(id) || id <= 0)
    return (
      <main className="container">
        <ApiFailure error="Thiếu mã đơn hàng hợp lệ để xác nhận." />
        <Button variant="secondary" onClick={() => navigate("/account/orders")}>
          Xem đơn hàng
        </Button>
      </main>
    )
  if (order.isPending) return <ApiLoading />
  if (order.error)
    return (
      <main className="container">
        <ApiFailure
          error={errorMessage(order.error)}
          retry={() => void order.refetch()}
        />
      </main>
    )
  if (!order.data)
    return <ApiFailure error="Không tìm thấy thông tin đơn hàng." />
  return (
    <main className="container success-page">
      <span className="success-icon">
        <Icon name="check" size={38} />
      </span>
      <span className="eyebrow">YOUR NEXT GAME IS ON ITS WAY</span>
      <Heading level={1}>Đã nhận đơn hàng của bạn.</Heading>
      <p>Đơn #{order.data.orderCode || order.data.id} được backend xác nhận.</p>
      <div className="success-order">
        <Status value={order.data.orderStatus} />
        <Heading level={3}>{money(order.data.total)}</Heading>
        <p>
          Phương thức: {order.data.paymentMethod}
          {order.data.paymentMethod === "COD"
            ? " · Thanh toán khi nhận hàng"
            : ""}
        </p>
      </div>
      <div className="button-row">
        <Button onClick={() => navigate(`/account/orders/${id}`)}>
          Theo dõi đơn hàng
          <Icon name="arrow" size={16} />
        </Button>
        <Button variant="secondary" onClick={() => navigate("/shop")}>
          Tiếp tục mua sắm
        </Button>
      </div>
    </main>
  )
}
