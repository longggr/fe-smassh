import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react"
import {
  api,
  ApiError,
  isRecord,
  readSettings,
  saveSettings,
  session,
  type ApiMode,
} from "./client"
import {
  number,
  pageData,
  productFromApi,
  rows,
  text,
  treeRows,
  cartFromApi,
  type Row,
} from "./adapters"
import type { Product } from "../data"
import { queryClient } from "../lib/query"
import { identityFromAccessToken } from "../lib/navigation"
import { Button, Heading, Icon, Input, Modal, Select } from "../ui"

type BackendState = {
  mode: ApiMode
  baseUrl: string
  currency: string
  products: Product[]
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>
  categories: Row[]
  brands: Row[]
  loading: boolean
  error: string
  reload: () => Promise<void>
  identity: {
    subject: string
    email: string
    roles: string[]
  } | null
  profile: Row | null
  refreshProfile: () => Promise<void>
  login: (email: string, password: string) => Promise<void>
  mergeGuest: () => Promise<void>
  logout: () => Promise<void>
  cart: Row[]
  cartRaw: Row | null
  cartError: string
  cartBusy: boolean
  reloadCart: () => Promise<void>
  mutateCart: (action: () => Promise<unknown>) => Promise<void>
  add: (
    product: Product,
    quantity?: number,
    variant?: string,
    color?: string,
  ) => Promise<void>
  canManage: boolean
  isAdmin: boolean
  showSettings: () => void
}
const BackendContext = createContext<BackendState>(null!)
export const useBackend = () => useContext(BackendContext)
export function BackendProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState(readSettings)
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Row[]>([])
  const [brands, setBrands] = useState<Row[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [identity, setIdentity] = useState<BackendState["identity"]>(null)
  const [profile, setProfile] = useState<Row | null>(null)
  const [cart, setCart] = useState<Row[]>([])
  const [cartRaw, setCartRaw] = useState<Row | null>(null)
  const [cartError, setCartError] = useState("")
  const [cartBusy, setCartBusy] = useState(false)
  const [dialog, setDialog] = useState(false)
  const [settingsError, setSettingsError] = useState("")
  const catalogController = useRef<AbortController | null>(null)
  const cartRequest = useRef<Promise<void> | null>(null)
  const cartGeneration = useRef(0)
  const cartMutationLock = useRef(false)
  const reload = useCallback(async () => {
    if (settings.mode !== "api") return
    catalogController.current?.abort()
    const controller = new AbortController()
    catalogController.current = controller
    setLoading(true)
    setError("")
    try {
      const results = await Promise.allSettled([
        api.products.search({ page: 0, size: 12 }, controller.signal),
        api.categories.tree(controller.signal),
        api.brands.list(controller.signal),
      ])
      if (controller.signal.aborted) return
      const failures: string[] = []
      if (results[0].status === "fulfilled") {
        try {
          setProducts(pageData(results[0].value).items.map(productFromApi))
        } catch (e) {
          failures.push(errorMessage(e))
        }
      } else failures.push(errorMessage(results[0].reason))
      if (results[1].status === "fulfilled") {
        try {
          setCategories(treeRows(results[1].value))
        } catch (e) {
          failures.push(errorMessage(e))
        }
      } else failures.push(errorMessage(results[1].reason))
      if (results[2].status === "fulfilled") {
        try {
          setBrands(rows(results[2].value))
        } catch (e) {
          failures.push(errorMessage(e))
        }
      } else failures.push(errorMessage(results[2].reason))
      setError([...new Set(failures)].join(" "))
    } finally {
      if (!controller.signal.aborted) setLoading(false)
    }
  }, [settings])
  const reloadCart = useCallback((): Promise<void> => {
    if (settings.mode !== "api") return Promise.resolve()
    if (cartRequest.current) return cartRequest.current
    const generation = cartGeneration.current
    const promise = (async () => {
      setCartError("")
      setCartBusy(true)
      try {
        const value = cartFromApi(await api.cart.get())
        if (generation !== cartGeneration.current) return
        if (!isRecord(value) || !Array.isArray(value.items))
          throw new ApiError(
            "Cart result cần có items[]. Không thể hiển thị giỏ hàng từ DTO hiện tại.",
          )
        setCart(value.items.filter(isRecord))
        setCartRaw(value)
        queryClient.setQueryData(["cart", settings.baseUrl], value)
      } catch (e) {
        if (generation === cartGeneration.current) setCartError(errorMessage(e))
        throw e
      } finally {
        if (generation === cartGeneration.current) setCartBusy(false)
      }
    })()
    cartRequest.current = promise
    void promise
      .finally(() => {
        if (cartRequest.current === promise) cartRequest.current = null
      })
      .catch(() => {})
    return promise
  }, [settings])
  const refreshProfile = useCallback(async () => {
    if (!identity) return
    if (!identity.email)
      throw new ApiError(
        "Phiên cũ chưa có email đăng nhập. Vui lòng đăng nhập lại.",
      )
    const result = await api.users.byEmail(identity.email)
    if (!isRecord(result))
      throw new ApiError("User result chưa đúng cấu trúc đối tượng.")
    setProfile(result)
  }, [identity])
  useEffect(() => {
    void reload()
    return () => catalogController.current?.abort()
  }, [reload])
  useEffect(() => {
    let active = true
    if (settings.mode !== "api") return
    const token = session.token()
    if (token) {
      try {
        setIdentity(identityFromAccessToken(token, session.email()))
        void reloadCart().catch(() => {})
      } catch {
        session.clearAuth()
        setIdentity(null)
      }
    } else if (session.cartToken()) void reloadCart().catch(() => {})
    const expired = () => {
      setIdentity(null)
      setProfile(null)
      setCart([])
      setCartRaw(null)
      setCartError("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.")
      queryClient.clear()
    }
    const refreshed = () => {
      try {
        setIdentity(identityFromAccessToken(session.token(), session.email()))
      } catch {
        setIdentity(null)
      }
    }
    const backendError = (event: Event) => {
      const detail = (event as CustomEvent).detail
      if (detail?.code === 2044) {
        void queryClient.invalidateQueries({
          queryKey: ["product", settings.baseUrl],
        })
        void queryClient.invalidateQueries({
          queryKey: ["products", settings.baseUrl],
        })
      }
      if (detail?.code === 1007) window.location.hash = "/403"
      if (detail?.code === 2201) {
        setCart([])
        setCartRaw(null)
        queryClient.invalidateQueries({ queryKey: ["cart"] })
        if (window.location.hash.includes("/checkout"))
          window.location.hash = "/shop"
      }
    }
    window.addEventListener("smashhub-token-refreshed", refreshed)
    window.addEventListener("smashhub-api-error", backendError)
    window.addEventListener("smashhub-session-expired", expired)
    return () => {
      active = false
      window.removeEventListener("smashhub-session-expired", expired)
      window.removeEventListener("smashhub-token-refreshed", refreshed)
      window.removeEventListener("smashhub-api-error", backendError)
    }
  }, [settings, reloadCart])
  useEffect(() => {
    if (identity) void refreshProfile().catch(() => {})
  }, [identity, refreshProfile])
  const mergeGuest = async () => {
    if (!session.cartToken() || !session.token()) return
    try {
      await api.cart.merge()
      session.clearCartToken()
      setCartError("")
      await queryClient.invalidateQueries({
        queryKey: ["cart"],
        refetchType: "none",
      })
      await reloadCart()
    } catch (error) {
      setCartError(
        `Chưa hợp nhất được giỏ khách; token khách vẫn được giữ để thử lại: ${errorMessage(error)}`,
      )
      throw error
    }
  }
  const login = async (email: string, password: string) => {
    const result = await api.auth.login({ email, password })
    if (
      result.authenticated !== true ||
      typeof result.token !== "string" ||
      !result.token
    )
      throw new ApiError(
        "AuthResponse thiếu token hoặc authenticated không hợp lệ.",
      )
    const nextIdentity = identityFromAccessToken(result.token, email)
    queryClient.clear()
    session.setToken(result.token)
    session.setEmail(email)
    setIdentity(nextIdentity)
    if (session.cartToken()) await mergeGuest().catch(() => {})
    else {
      await reloadCart().catch(() => {})
      // A guest cart read/add may have finished while login was in flight.
      if (session.cartToken()) await mergeGuest().catch(() => {})
    }
  }
  const logout = async () => {
    if (session.token()) await api.auth.logout(session.token())
    session.clearAuth()
    queryClient.clear()
    setIdentity(null)
    setProfile(null)
    setCart([])
    setCartRaw(null)
    setCartError("")
  }
  const mutateCart = async (action: () => Promise<unknown>) => {
    if (cartMutationLock.current)
      throw new ApiError("Giỏ hàng đang cập nhật, vui lòng chờ.")
    cartMutationLock.current = true
    setCartBusy(true)
    try {
      await action()
      if (session.token() && session.cartToken()) await mergeGuest()
      if (!session.token() && !session.cartToken())
        throw new ApiError(
          "Backend chưa trả cartToken cho giỏ khách; không tải lại để tránh tạo nhầm giỏ mới.",
        )
      await queryClient.invalidateQueries({
        queryKey: ["cart", settings.baseUrl],
        refetchType: "none",
      })
      await reloadCart()
    } catch (e) {
      setCartError(errorMessage(e))
      throw e
    } finally {
      cartMutationLock.current = false
      setCartBusy(false)
    }
  }
  const add: BackendState["add"] = async (
    product,
    quantity = 1,
    variant,
    color,
  ) => {
    const matches = (product.variants || []).filter(
      (v) =>
        v.id &&
        (!variant || v.name === variant || `#${v.id}` === variant) &&
        (!color || !v.colorName || v.colorName === color) &&
        v.status === "ACTIVE",
    )
    if (matches.length !== 1)
      throw new ApiError(
        "Vui lòng mở chi tiết và chọn chính xác biến thể / màu. Không dùng productId hoặc SKU thay variantId.",
      )
    if (quantity > matches[0].stock || quantity < 1)
      throw new ApiError("Số lượng vượt tồn kho của biến thể.")
    await mutateCart(() => api.cart.add(matches[0].id!, quantity))
  }
  const roles = identity?.roles.map((role) => role.replace(/^ROLE_/, "")) || []
  return (
    <BackendContext.Provider
      value={{
        ...settings,
        products,
        setProducts,
        categories,
        brands,
        loading,
        error,
        reload,
        identity,
        profile,
        refreshProfile,
        login,
        mergeGuest,
        logout,
        cart,
        cartRaw,
        cartError,
        cartBusy,
        reloadCart,
        mutateCart,
        add,
        canManage: roles.includes("ADMIN") || roles.includes("STAFF"),
        isAdmin: roles.includes("ADMIN"),
        showSettings: () => setDialog(true),
      }}
    >
      <div
        className={`api-connection-bar ${
          settings.mode === "api" && error ? "connection-error" : ""
        }`}
      >
        <span>
          <Icon name={settings.mode === "api" ? "globe" : "box"} size={13} />
          <strong>
            {settings.mode === "api" ? "Spring Boot API" : "Demo dữ liệu mẫu"}
          </strong>
          <span>
            {settings.mode === "api"
              ? settings.baseUrl
              : "Không gửi request đến backend"}
          </span>
        </span>
        <Button
          variant="ghost"
          onClick={() => {
            setSettingsError("")
            setDialog(true)
          }}
        >
          Cấu hình kết nối
          <Icon name="settings" size={13} />
        </Button>
      </div>
      {settings.mode === "api" && error && (
        <div className="api-global-error" role="alert">
          <span>{error}</span>
          <Button
            variant="secondary"
            disabled={loading}
            onClick={() => void reload()}
          >
            Thử lại
          </Button>
          <Button variant="ghost" onClick={() => setDialog(true)}>
            Đổi URL / xem demo
          </Button>
        </div>
      )}
      {children}
      {dialog && (
        <Modal title="Kết nối Spring Boot" onClose={() => setDialog(false)}>
          <form
            className="dialog-form"
            onSubmit={(e) => {
              e.preventDefault()
              const form = new FormData(e.currentTarget)
              try {
                const nextMode = form.get("mode") as ApiMode
                const url = String(form.get("url"))
                saveSettings(nextMode, url, String(form.get("currency")))
                cartGeneration.current++
                cartRequest.current = null
                setCartBusy(false)
                session.clear()
                queryClient.clear()
                setIdentity(null)
                setProfile(null)
                setProducts([])
                setBrands([])
                setCategories([])
                setCart([])
                setCartRaw(null)
                setError("")
                setCartError("")
                setSettings(readSettings())
                setDialog(false)
              } catch (e) {
                setSettingsError(errorMessage(e))
              }
            }}
          >
            <Select
              name="mode"
              label="Nguồn dữ liệu"
              defaultValue={settings.mode}
            >
              <option value="api">API thật — không tự thay bằng mock</option>
              <option value="demo">Demo — chỉ dữ liệu mẫu</option>
            </Select>
            <Input
              name="url"
              label="Base URL (bao gồm /cms)"
              type="url"
              defaultValue={settings.baseUrl}
              required
            />
            <Button
              variant="secondary"
              onClick={() => {
                const field =
                  document.querySelector<HTMLInputElement>('input[name="url"]')
                if (field)
                  field.value =
                    "https://shorty-cognition-splatter.ngrok-free.dev/cms"
              }}
            >
              Dùng Ngrok đã cung cấp
            </Button>
            <Select
              name="currency"
              label="Đơn vị hiển thị giá API (không quy đổi)"
              defaultValue={settings.currency}
            >
              <option value="VND">VND — Việt Nam đồng</option>
              <option value="USD">USD — US Dollar</option>
            </Select>
            <p className="mock-note">
              Tài liệu chưa mô tả tiền tệ; chọn đơn vị đúng với giá backend. URL
              mặc định đúng theo tài liệu bạn gửi. Với Preview HTTPS, trình
              duyệt có thể chặn HTTP hoặc không truy cập được localhost. Khi đó
              đổi URL tại đây; không cần sửa code. Chuyển server hoặc nguồn dữ
              liệu sẽ xóa phiên JWT/giỏ khách hiện tại để tránh gửi token sang
              server khác.
            </p>
            {settingsError && (
              <p className="error-text" role="alert">
                {settingsError}
              </p>
            )}
            <Button type="submit">Áp dụng kết nối</Button>
          </form>
        </Modal>
      )}
    </BackendContext.Provider>
  )
}
export const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Yêu cầu thất bại."
export function ApiLoading() {
  return (
    <div className="api-loading" role="status">
      <div className="skeleton-card">
        <div />
        <span />
        <span />
      </div>
      <span>Đang tải dữ liệu từ backend…</span>
    </div>
  )
}
export function ApiFailure({
  error,
  retry,
}: {
  error: string
  retry?: () => void
}) {
  return (
    <div className="api-local-error" role="alert">
      <Icon name="return" size={23} />
      <Heading level={3}>Chưa thể tải dữ liệu</Heading>
      <p>{error}</p>
      {retry && (
        <Button variant="secondary" onClick={retry}>
          Thử lại
        </Button>
      )}
    </div>
  )
}
export const cartVariantId = (item: Row) =>
  number(
    item.variantId ?? (isRecord(item.variant) ? item.variant.id : undefined),
  )
