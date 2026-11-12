import { useQuery } from "@tanstack/react-query"
import { api, type Query } from "../api/client"
import { pageData, productFromApi } from "../api/adapters"
import { useBackend } from "../api/Backend"

export function useProducts(query: Query) {
  const backend = useBackend()
  return useQuery({
    queryKey: ["products", backend.baseUrl, query],
    queryFn: async ({ signal }) => {
      const data = pageData(await api.products.search(query, signal))
      return {
        products: data.items.map(productFromApi),
        pages: Math.max(1, data.pages),
        total: data.total,
      }
    },
    enabled: backend.mode === "api",
  })
}
export function useProduct(route: string) {
  const backend = useBackend()
  const parts = route.split("?")[0].split("/")
  return useQuery({
    queryKey: ["product", backend.baseUrl, parts.slice(2).join("/")],
    queryFn: async ({ signal }) =>
      productFromApi(
        parts[2] === "slug"
          ? await api.products.bySlug(decodeURIComponent(parts[3]), signal)
          : await api.products.byId(parts[2], signal),
      ),
    enabled: backend.mode === "api",
    staleTime: 15000,
    refetchOnWindowFocus: true,
  })
}
