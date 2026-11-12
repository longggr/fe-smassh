import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useRef, useState } from "react"
import { api, ApiError } from "../api/client"
import { useBackend } from "../api/Backend"
import { orderFromApi } from "../api/adapters"
import type { CheckoutInput, ShippingFeeInput } from "../types/api"

export function useCheckout(shippingInput: ShippingFeeInput | null) {
  const backend = useBackend()
  const client = useQueryClient()
  const submitLock = useRef(false)
  const createdOrder = useRef<number | null>(null)
  const uncertainLock = useRef(false)
  const [uncertain, setUncertain] = useState(false)
  const shipping = useQuery({
    queryKey: [
      "shippingFee",
      backend.baseUrl,
      shippingInput,
      backend.cart
        .map((item) => `${item.variantId}:${item.quantity}`)
        .join("|"),
    ],
    queryFn: ({ signal }) => api.shipping.fee(shippingInput!, signal),
    enabled: backend.mode === "api" && shippingInput !== null,
    staleTime: 60000,
  })
  const checkout = useMutation({
    mutationFn: async (body: CheckoutInput) => {
      if (
        submitLock.current ||
        createdOrder.current !== null ||
        uncertainLock.current
      )
        throw new ApiError(
          "Đơn hàng đang được xử lý hoặc đã được tạo. Vui lòng không gửi lại.",
        )
      submitLock.current = true
      try {
        const order = orderFromApi(await api.orders.checkout(body))
        if (!order || !Number.isInteger(order.id) || order.id <= 0)
          throw new ApiError(
            "Checkout response thiếu mã đơn hàng hợp lệ. Kiểm tra đơn hàng trước khi gửi lại.",
          )
        createdOrder.current = order.id
        client.setQueryData(["order", backend.baseUrl, order.id], order)
        void client.invalidateQueries({ queryKey: ["orders", backend.baseUrl] })
        void client.invalidateQueries({
          queryKey: ["cart", backend.baseUrl],
          refetchType: "none",
        })
        return order
      } catch (error) {
        if (
          !(error instanceof ApiError) ||
          error.status === 0 ||
          error.status >= 500 ||
          error.code === 2301
        ) {
          uncertainLock.current = true
          setUncertain(true)
        }
        throw error
      } finally {
        submitLock.current = false
      }
    },
    retry: false,
  })
  return { shipping, checkout, createdOrder, submitLock, uncertain }
}
