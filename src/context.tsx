import { createContext, useContext } from "react"
import type { Product, Order } from "./data"
export type CartItem = {
  productId: number
  quantity: number
  variant: string
  color: string
}
export type Address = {
  name: string
  street: string
  city: string
  district: string
  ward: string
  phone: string
}
export type AppContextType = {
  route: string
  navigate: (route: string) => void
  products: Product[]
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>
  orders: Order[]
  setOrders: React.Dispatch<React.SetStateAction<Order[]>>
  cart: CartItem[]
  setCart: React.Dispatch<React.SetStateAction<CartItem[]>>
  wishlist: number[]
  toggleWishlist: (id: number) => void
  addToCart: (
    product: Product,
    quantity?: number,
    variant?: string,
    color?: string,
  ) => void
  toast: (message: string) => void
  user: string
  setUser: (name: string) => void
  addresses: Address[]
  setAddresses: React.Dispatch<React.SetStateAction<Address[]>>
}
export const AppContext = createContext<AppContextType>(null!)
export const useApp = () => useContext(AppContext)
