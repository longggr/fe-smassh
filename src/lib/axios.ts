import axios, {
  AxiosHeaders,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from "axios"
import { ApiError, backendMessage } from "./errors"
import {
  readSettings,
  session,
  isRecord,
  queryString,
  type Query,
} from "../api/client"

interface RequestConfig extends InternalAxiosRequestConfig {
  authEnabled?: boolean
  cartEnabled?: boolean
  mergeGuest?: boolean
  retryAfterRefresh?: boolean
  sourceBase?: string
  sourceMode?: string
  sentAccessToken?: string
  sessionEpoch?: number
}
export const http = axios.create({ timeout: 15000, adapter: "fetch" })
const refreshHttp = axios.create({ timeout: 15000, adapter: "fetch" })
let refreshing: {
  key: string
  promise: Promise<void>
} | null = null

function expireSession() {
  session.clearAuth()
  window.dispatchEvent(new Event("smashhub-session-expired"))
  const current =
    window.location?.hash?.slice(1) || window.location?.pathname || "/"
  if (!current.startsWith("/auth/") && !current.startsWith("/login")) {
    window.location.hash = `/auth/login?redirect=${encodeURIComponent(current)}`
  }
}
export async function refreshAccessToken(): Promise<void> {
  const source = readSettings()
  // AuthServiceImpl.refreshToken explicitly renews the current JWT, not a separate refresh token.
  const refreshToken = session.token()
  if (!refreshToken) {
    expireSession()
    throw new ApiError(
      "Không còn JWT để làm mới phiên. Vui lòng đăng nhập lại.",
      401,
      1006,
    )
  }
  const key = `${source.baseUrl}:${refreshToken}`
  if (refreshing?.key === key) return refreshing.promise
  const revision = session.revision()
  const promise = (async () => {
    try {
      const response = await refreshHttp.post(
        `${source.baseUrl}/auth/refresh-token`,
        { token: refreshToken },
        {
          headers: {
            "Content-Type": "application/json",
            ...(new URL(source.baseUrl).hostname.endsWith("ngrok-free.dev")
              ? { "ngrok-skip-browser-warning": "true" }
              : {}),
          },
        },
      )
      if (
        readSettings().baseUrl !== source.baseUrl ||
        readSettings().mode !== source.mode ||
        session.revision() !== revision
      )
        throw new ApiError("Phiên đã thay đổi; bỏ qua token cũ.")
      const envelope = response.data
      if (
        !isRecord(envelope) ||
        envelope.code !== 1000 ||
        !isRecord(envelope.result)
      )
        throw new ApiError("Không làm mới được phiên đăng nhập.", 401, 1006)
      const result = envelope.result
      if (
        result.authenticated !== true ||
        typeof result.token !== "string" ||
        !result.token
      )
        throw new ApiError(
          "Refresh response thiếu token hoặc authenticated không hợp lệ.",
          401,
          1006,
        )
      session.setToken(result.token, true)
      window.dispatchEvent(new Event("smashhub-token-refreshed"))
    } catch (error) {
      if (
        session.revision() === revision &&
        readSettings().baseUrl === source.baseUrl
      )
        expireSession()
      if (error instanceof ApiError) throw error
      throw new ApiError(
        "Không làm mới được phiên. Vui lòng đăng nhập lại.",
        401,
        1006,
      )
    }
  })()
  refreshing = { key, promise }
  void promise
    .finally(() => {
      if (refreshing?.promise === promise) refreshing = null
    })
    .catch(() => {})
  return promise
}

http.interceptors.request.use((raw) => {
  const config = raw as RequestConfig
  const source = readSettings()
  if (
    config.sourceBase &&
    (config.sourceBase !== source.baseUrl || config.sourceMode !== source.mode)
  )
    throw new ApiError("Nguồn dữ liệu đã đổi. Yêu cầu cũ đã bị hủy.")
  config.sourceBase = source.baseUrl
  config.sourceMode = source.mode
  if (
    config.sessionEpoch !== undefined &&
    config.sessionEpoch !== session.epoch()
  )
    throw new ApiError(
      "Tài khoản đã thay đổi; không gửi lại yêu cầu của phiên cũ.",
    )
  config.sessionEpoch = session.epoch()
  config.baseURL = source.baseUrl
  config.headers = AxiosHeaders.from(config.headers)
  config.headers.set("Accept", "application/json")
  if (new URL(source.baseUrl).hostname.endsWith("ngrok-free.dev"))
    config.headers.set("ngrok-skip-browser-warning", "true")
  if (config.authEnabled !== false && session.token()) {
    config.headers.set("Authorization", `Bearer ${session.token()}`)
    config.sentAccessToken = session.token()
  } else config.headers.delete("Authorization")
  config.headers.delete("X-Cart-Token")
  if (
    config.cartEnabled &&
    session.cartToken() &&
    (!session.token() || config.mergeGuest)
  )
    config.headers.set("X-Cart-Token", session.cartToken())
  // `false` also prevents Axios's POST default from restoring urlencoded content.
  if (config.data instanceof FormData) config.headers.set("Content-Type", false)
  else if (config.data !== undefined)
    config.headers.set("Content-Type", "application/json")
  return config
})

async function processResponse(
  response: AxiosResponse,
): Promise<AxiosResponse> {
  const config = response.config as RequestConfig
  const source = readSettings()
  if (config.sourceBase !== source.baseUrl || config.sourceMode !== source.mode)
    throw new ApiError(
      "Nguồn dữ liệu đã đổi trong khi chờ phản hồi. Kết quả cũ đã bị bỏ qua.",
    )
  const body = response.data
  if (
    config.authEnabled !== false &&
    config.sentAccessToken &&
    config.sessionEpoch !== session.epoch()
  )
    throw new ApiError(
      "Tài khoản đã thay đổi. Phản hồi của phiên cũ đã bị bỏ qua.",
    )
  const code =
    isRecord(body) && typeof body.code === "number" ? body.code : undefined
  if (response.status === 401 || code === 1006) {
    if (
      config.authEnabled !== false &&
      config.sentAccessToken &&
      !config.retryAfterRefresh
    ) {
      config.retryAfterRefresh = true
      // A parallel request may already have rotated the token while this one was in flight.
      if (!config.sentAccessToken || session.token() === config.sentAccessToken)
        await refreshAccessToken()
      else if (!session.token()) {
        expireSession()
        throw new ApiError("Phiên đăng nhập hết hạn.", 401, 1006)
      }
      return http.request(config)
    }
    if (config.authEnabled !== false && config.sentAccessToken) expireSession()
  }
  if (response.status === 204) {
    response.data = undefined
    return response
  }
  if (!isRecord(body) || code === undefined)
    throw new ApiError(
      "Backend không trả JSON envelope hợp lệ.",
      response.status,
    )
  if (response.status >= 400 || code !== 1000) {
    const error = new ApiError(
      backendMessage(
        code,
        typeof body.message === "string" ? body.message : undefined,
      ),
      response.status,
      code,
    )
    window.dispatchEvent(
      new CustomEvent("smashhub-api-error", {
        detail: { code, message: error.message, status: response.status },
      }),
    )
    throw error
  }
  if (config.cartEnabled && !config.sentAccessToken) {
    const token =
      response.headers["x-cart-token"] ||
      (isRecord(body.result) ? body.result.cartToken : undefined)
    if (typeof token === "string" && token) session.setCartToken(token)
  }
  response.data = body.result
  return response
}
http.interceptors.response.use(processResponse, async (error) => {
  if (axios.isAxiosError(error) && error.response)
    return processResponse(error.response)
  if (error instanceof ApiError) throw error
  if (axios.isCancel(error)) throw error
  throw new ApiError(
    "Không kết nối được backend. Kiểm tra Base URL, CORS, HTTPS hoặc đường hầm Ngrok.",
  )
})

export async function apiRequest<T>(
  path: string,
  options: {
    method?: string
    body?: unknown
    query?: Query
    cart?: boolean
    mergeGuest?: boolean
    auth?: boolean
    signal?: AbortSignal
  } = {},
): Promise<T> {
  const response = await http.request({
    url: `${path}${queryString(options.query)}`,
    method: options.method || "GET",
    data: options.body,
    signal: options.signal,
    authEnabled: options.auth !== false,
    cartEnabled: options.cart,
    mergeGuest: options.mergeGuest,
  } as RequestConfig)
  return response.data as T
}
