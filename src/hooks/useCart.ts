import { useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { api } from "../api/client"
import { useBackend } from "../api/Backend"

export function useCart() {
  const backend = useBackend()
  const query = useQuery({
    queryKey: ["cart", backend.baseUrl],
    queryFn: () => api.cart.get(),
    enabled: false,
  })
  useEffect(() => {
    if (backend.mode === "api") void backend.reloadCart().catch(() => {})
  }, [backend.mode, backend.reloadCart])
  return {
    ...query,
    data: backend.cartRaw,
    items: backend.cart,
    isLoading: backend.cartBusy && !backend.cartRaw,
    errorMessage: backend.cartError,
    refetch: backend.reloadCart,
    mutate: backend.mutateCart,
  }
}
