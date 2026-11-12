import { useRef, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useApp } from "../context"
import { api, isRecord } from "./client"
import { orderFromApi, pageData, text } from "./adapters"
import { ApiFailure, ApiLoading, errorMessage, useBackend } from "./Backend"
import { Button, Empty, Heading, Input, Modal, Select } from "../ui"
import { Pagination } from "../Store"
import { Status, OrderTimeline } from "../Commerce"
import { money, statuses } from "../data"

const transitions: Record<string, string[]> = {
  PENDING_PAYMENT: ["PAID", "CANCELLED", "EXPIRED"],
  PAID: ["PROCESSING", "CANCELLED", "REFUNDED"],
  PROCESSING: ["SHIPPING", "CANCELLED"],
  SHIPPING: ["DELIVERED", "CANCELLED"],
  DELIVERED: ["REFUNDED"],
  CANCELLED: [],
  EXPIRED: [],
  REFUNDED: [],
}
export function AdminOrdersApi() {
  const backend = useBackend()
  const { route, navigate, toast } = useApp()
  const client = useQueryClient()
  const id = Number(route.split("/")[3])
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState("")
  const [target, setTarget] = useState("")
  const [note, setNote] = useState("")
  const [confirm, setConfirm] = useState<"status" | "shipment" | "">("")
  const lock = useRef(false)
  const list = useQuery({
    queryKey: ["adminOrders", backend.baseUrl, page, status],
    queryFn: async ({ signal }) =>
      pageData(
        await api.adminOrders.list(
          { page: page - 1, size: 15, status, sort: "createDate,DESC" },
          signal,
        ),
      ),
    enabled: !id,
  })
  const detail = useQuery({
    queryKey: ["adminOrder", backend.baseUrl, id],
    queryFn: async ({ signal }) =>
      orderFromApi(await api.adminOrders.byId(id, signal)),
    enabled: Number.isInteger(id) && id > 0,
  })
  const mutation = useMutation({
    mutationFn: async () => {
      if (lock.current) throw new Error("Yêu cầu đang được xử lý.")
      lock.current = true
      try {
        return confirm === "shipment"
          ? await api.adminOrders.retryShipment(id)
          : await api.adminOrders.status(id, target, note)
      } finally {
        lock.current = false
      }
    },
    onSuccess: async (result) => {
      if (confirm === "shipment" && isRecord(result) && !result.orderCode) {
        throw new Error(
          `Backend chưa tạo được vận đơn GHN: ${text(result.errorMessage ?? result.statusName, "kiểm tra trạng thái shipment trước khi thử lại")}`,
        )
      }
      setConfirm("")
      setTarget("")
      setNote("")
      await Promise.all([
        client.invalidateQueries({
          queryKey: ["adminOrders", backend.baseUrl],
        }),
        client.invalidateQueries({
          queryKey: ["adminOrder", backend.baseUrl, id],
        }),
        client.invalidateQueries({ queryKey: ["orders", backend.baseUrl] }),
        client.invalidateQueries({ queryKey: ["order", backend.baseUrl, id] }),
      ])
      toast("Backend đã xác nhận thao tác quản trị đơn hàng.")
    },
  })
  if (!id)
    return (
      <>
        <div className="admin-page-title">
          <div>
            <Heading level={1}>Orders</Heading>
            <p>Danh sách toàn bộ đơn hàng theo AdminOrderController.</p>
          </div>
          <Select
            label="Trạng thái đơn"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value)
              setPage(1)
            }}
          >
            <option value="">Tất cả</option>
            {statuses.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </Select>
        </div>
        <section className="admin-panel">
          {list.isPending ? (
            <ApiLoading />
          ) : list.error ? (
            <ApiFailure
              error={errorMessage(list.error)}
              retry={() => void list.refetch()}
            />
          ) : (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Đơn hàng</th>
                    <th>Người nhận</th>
                    <th>Thanh toán</th>
                    <th>Trạng thái</th>
                    <th>Tổng</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {list.data?.items.map((value) => {
                    const order = orderFromApi(value)
                    return (
                      <tr key={order.id}>
                        <td>#{order.id}</td>
                        <td>{order.address?.recipientName || "—"}</td>
                        <td>{order.paymentMethod}</td>
                        <td>
                          <Status value={order.orderStatus} />
                        </td>
                        <td>{money(order.total)}</td>
                        <td>
                          <Button
                            variant="ghost"
                            onClick={() =>
                              navigate(`/admin/orders/${order.id}`)
                            }
                          >
                            Xem chi tiết
                          </Button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              {!list.data?.items.length && (
                <Empty
                  title="Chưa có đơn hàng"
                  text="Backend trả danh sách rỗng."
                />
              )}
            </div>
          )}
          <Pagination
            page={page}
            total={Math.max(1, list.data?.pages || 1)}
            onChange={setPage}
          />
        </section>
      </>
    )
  if (detail.isPending) return <ApiLoading />
  if (detail.error)
    return (
      <ApiFailure
        error={errorMessage(detail.error)}
        retry={() => void detail.refetch()}
      />
    )
  const order = detail.data
  if (!order) return <ApiFailure error="Chưa nhận chi tiết đơn hàng." />
  const allowed = transitions[order.orderStatus] || []
  return (
    <>
      <div className="admin-page-title">
        <div>
          <Heading level={1}>Order #{order.id}</Heading>
          <p>Thông tin từ /admin/orders/{order.id}</p>
        </div>
        <Button variant="secondary" onClick={() => navigate("/admin/orders")}>
          Danh sách đơn
        </Button>
      </div>
      <section className="admin-panel api-panel-pad">
        <div className="flex-between">
          <Heading level={3}>Trạng thái hiện tại</Heading>
          <Status value={order.orderStatus} />
        </div>
        <OrderTimeline status={order.orderStatus} />
        <div className="order-info-cards">
          <div>
            <Heading level={4}>Người nhận</Heading>
            <p>
              {order.address?.recipientName} · {order.address?.phone}
              <br />
              {order.address?.line1}
              <br />
              {order.address?.wardName}, {order.address?.districtName},{" "}
              {order.address?.provinceName}
            </p>
          </div>
          <div>
            <Heading level={4}>Thanh toán</Heading>
            <p>
              {order.paymentMethod}
              <br />
              Tạm tính {money(order.subtotal)}
              <br />
              Vận chuyển {money(order.shippingCost)}
              <br />
              <strong>Tổng {money(order.total)}</strong>
            </p>
          </div>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Sản phẩm</th>
                <th>SKU</th>
                <th>SL</th>
                <th>Thành tiền</th>
              </tr>
            </thead>
            <tbody>
              {order.items?.map((item, index) => (
                <tr key={index}>
                  <td>{item.productName}</td>
                  <td>{item.sku}</td>
                  <td>{item.quantity}</td>
                  <td>
                    {item.totalPrice !== undefined
                      ? money(item.totalPrice)
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="admin-panel api-panel-pad">
        <Heading level={3}>Thao tác quản trị</Heading>
        {allowed.length > 0 ? (
          <form
            className="dialog-form api-form"
            onSubmit={(e) => {
              e.preventDefault()
              mutation.reset()
              setConfirm("status")
            }}
          >
            <Select
              label="Chuyển sang trạng thái"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              required
            >
              <option value="">Chọn trạng thái hợp lệ</option>
              {allowed.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </Select>
            <Input
              label="Ghi chú chuyển trạng thái"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <Button type="submit" disabled={!target || mutation.isPending}>
              Cập nhật trạng thái
            </Button>
          </form>
        ) : (
          <p className="mock-note">
            Đơn ở trạng thái kết thúc; không có chuyển tiếp trong
            OrderStateMachine.
          </p>
        )}
        <Button
          variant="secondary"
          disabled={
            mutation.isPending ||
            !["PAID", "PROCESSING", "SHIPPING"].includes(
              order.orderStatus,
            )
          }
          onClick={() => {
            mutation.reset()
            setConfirm("shipment")
          }}
        >
          Thử lại tạo vận đơn GHN
        </Button>
        <p className="mock-note">
          Thao tác trạng thái không tự hoàn tiền qua VNPAY. Backend kiểm tra
          quyền và trạng thái cuối cùng.
        </p>
      </section>
      {confirm && (
        <Modal
          title={
            confirm === "shipment"
              ? "Thử lại tạo shipment?"
              : `Chuyển ${order.orderStatus} → ${target}?`
          }
          onClose={() => setConfirm("")}
        >
          <p>
            {confirm === "shipment"
              ? "Gọi endpoint retry-shipment thật của AdminOrderController."
              : "Backend sẽ ghi lịch sử và xử lý tồn kho theo OrderStateMachine."}
          </p>
          {mutation.error && (
            <p className="error-text" role="alert">
              {errorMessage(mutation.error)}
            </p>
          )}
          <div className="modal-actions">
            <Button variant="secondary" onClick={() => setConfirm("")}>
              Hủy
            </Button>
            <Button
              disabled={mutation.isPending}
              onClick={() => mutation.mutate()}
            >
              {mutation.isPending ? "Đang xử lý…" : "Xác nhận"}
            </Button>
          </div>
        </Modal>
      )}
    </>
  )
}
