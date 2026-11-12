import { ApiError } from "./errors"
import type { AuthResponse } from "../types/api"

export function authResponse(value: unknown): AuthResponse {
  if (
    !value ||
    typeof value !== "object" ||
    !("token" in value) ||
    typeof value.token !== "string" ||
    !value.token ||
    !("authenticated" in value) ||
    value.authenticated !== true
  ) {
    throw new ApiError(
      "AuthResponse thực tế phải có token và authenticated=true; không có bộ accessToken / refreshToken.",
    )
  }
  return { token: value.token, authenticated: true }
}
