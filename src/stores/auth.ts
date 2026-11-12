import { createStore } from "zustand/vanilla"
import { createJSONStorage, persist } from "zustand/middleware"

interface AuthState {
  accessToken: string
  email: string
  baseUrl: string
  revision: number
  epoch: number
  setToken: (token: string, baseUrl: string, preserveSession?: boolean) => void
  setEmail: (email: string) => void
  clear: () => void
}
export const authStore = createStore<AuthState>()(
  persist(
    (set) => ({
      accessToken: "",
      email: "",
      baseUrl: "",
      revision: 0,
      epoch: 0,
      setToken: (token, baseUrl, preserveSession = false) =>
        set((state) => ({
          accessToken: token,
          baseUrl,
          revision: state.revision + 1,
          epoch: preserveSession ? state.epoch : state.epoch + 1,
        })),
      setEmail: (email) => set({ email }),
      clear: () =>
        set((state) => ({
          accessToken: "",
          email: "",
          baseUrl: "",
          revision: state.revision + 1,
          epoch: state.epoch + 1,
        })),
    }),
    {
      name: "smashhub_auth",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      migrate: () => ({ accessToken: "", baseUrl: "", email: "" }),
      partialize: (state) => ({
        accessToken: state.accessToken,
        baseUrl: state.baseUrl,
        email: state.email,
      }),
    },
  ),
)

// The backend requires this exact persistent key for anonymous cart identity.
export const guestCartStore = {
  get: (baseUrl: string) =>
    localStorage.getItem("smashhub_cart_base") === baseUrl
      ? localStorage.getItem("smashhub_cart_token") || ""
      : "",
  set: (token: string, baseUrl: string) => {
    localStorage.setItem("smashhub_cart_token", token)
    localStorage.setItem("smashhub_cart_base", baseUrl)
  },
  clear: () => {
    localStorage.removeItem("smashhub_cart_token")
    localStorage.removeItem("smashhub_cart_base")
  },
}
