import { useBackend } from "../api/Backend"
import { useStore } from "zustand"
import { authStore } from "../stores/auth"

export function useAuth() {
  const backend = useBackend()
  const accessToken = useStore(authStore, (state) =>
    state.baseUrl === backend.baseUrl ? state.accessToken : "",
  )
  return {
    identity: backend.identity,
    authenticated: Boolean(accessToken && backend.identity),
    login: backend.login,
    logout: backend.logout,
    mergeGuest: backend.mergeGuest,
  }
}
