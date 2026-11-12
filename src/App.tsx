import { lazy, Suspense, useEffect, useRef, useState } from "react"
import { AppContext, type Address, type CartItem } from "./context"
import { initialOrders, initialProducts, type Product } from "./data"
import { Catalog, Home, ProductDetail, StoreFooter, StoreHeader } from "./Store"
import { Badge, Button, Empty, Heading, Icon, Input, Modal, Select } from "./ui"
import {
  BackendProvider,
  useBackend,
  errorMessage,
  cartVariantId,
} from "./api/Backend"
import { number, text } from "./api/adapters"
import { currentRoute, normalizeRoute } from "./lib/navigation"

const CommercePages = lazy(() => import("./Commerce"))
const ApiCatalog = lazy(() =>
  import("./api/StoreApi").then((module) => ({ default: module.ApiCatalog })),
)
const ApiProduct = lazy(() =>
  import("./api/StoreApi").then((module) => ({ default: module.ApiProduct })),
)

const Admin = lazy(() =>
  import("./Admin").then((module) => ({ default: module.Admin })),
)

export default function App() {
  return (
    <BackendProvider>
      <AppContent />
    </BackendProvider>
  )
}
function AppContent() {
  const backend = useBackend()
  const [route, setRoute] = useState(currentRoute())
  const [demoProducts, setDemoProducts] = useState(initialProducts)
  const products = backend.mode === "api" ? backend.products : demoProducts
  const setProducts =
    backend.mode === "api" ? backend.setProducts : setDemoProducts
  const [orders, setOrders] = useState(initialOrders)
  const [demoCart, setCart] = useState<CartItem[]>([])
  const cart =
    backend.mode === "api"
      ? backend.cart.map((item) => ({
          productId: number(item.productId),
          quantity: number(item.quantity),
          variant: String(cartVariantId(item)),
          color: "",
        }))
      : demoCart
  const [wishlist, setWishlist] = useState<number[]>([])
  const [demoUser, setUser] = useState("")
  const user =
    backend.mode === "api"
      ? text(backend.profile?.username, backend.identity?.email || "")
      : demoUser
  const [addresses, setAddresses] = useState<Address[]>([
    {
      name: "Alex Morgan",
      street: "72 Nguyen Hue",
      city: "Ho Chi Minh City",
      district: "District 1",
      ward: "Ben Nghe",
      phone: "+84 912 345 678",
    },
  ])
  const [message, setMessage] = useState("")
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const toast = (text: string) => {
    clearTimeout(timer.current)
    setMessage(text)
    timer.current = setTimeout(() => setMessage(""), 4200)
  }
  const navigate = (path: string) => {
    window.location.hash = normalizeRoute(path)
  }
  useEffect(() => {
    const onHash = () => {
      setRoute(currentRoute())
      window.scrollTo({ top: 0, behavior: "instant" })
    }
    window.addEventListener("hashchange", onHash)
    window.addEventListener("popstate", onHash)
    return () => {
      window.removeEventListener("hashchange", onHash)
      window.removeEventListener("popstate", onHash)
    }
  }, [])
  useEffect(() => {
    document.title = `${
      route.startsWith("/admin")
        ? "Workspace"
        : route.startsWith("/shop")
          ? "Shop"
          : route.startsWith("/cart")
            ? "Your bag"
            : "Your game. Your edge."
    } — SmashHub`
  }, [route])
  const addToCart = (
    product: Product,
    quantity = 1,
    variant = product.category === "Rackets"
      ? "4U / G5"
      : product.category === "Shoes"
        ? "US 9"
        : product.category === "Apparel"
          ? "M"
          : "Standard",
    color = "Original",
  ) => {
    if (backend.mode === "api") {
      void backend
        .add(product, quantity, variant, color)
        .then(() => toast(`${product.name} added to your bag.`))
        .catch((error) => toast(errorMessage(error)))
      return
    }
    if (!product.stock) {
      toast("This product is currently out of stock.")
      return
    }
    const index = cart.findIndex(
      (c) =>
        c.productId === product.id &&
        c.variant === variant &&
        c.color === color,
    )
    if (index >= 0)
      setCart(
        cart.map((c, i) =>
          i === index
            ? { ...c, quantity: Math.min(c.quantity + quantity, product.stock) }
            : c,
        ),
      )
    else
      setCart([
        ...cart,
        {
          productId: product.id,
          quantity: Math.min(quantity, product.stock),
          variant,
          color,
        },
      ])
    toast(`${product.name} added to your bag.`)
  }
  const toggleWishlist = (id: number) => {
    setWishlist(
      wishlist.includes(id)
        ? wishlist.filter((i) => i !== id)
        : [...wishlist, id],
    )
    toast(
      wishlist.includes(id)
        ? "Removed from your favorites."
        : "Saved to your favorites.",
    )
  }
  return (
    <AppContext.Provider
      value={{
        route,
        navigate,
        products,
        setProducts,
        orders,
        setOrders,
        cart,
        setCart,
        wishlist,
        toggleWishlist,
        addToCart,
        toast,
        user,
        setUser,
        addresses,
        setAddresses,
      }}
    >
      {route.startsWith("/admin") ? (
        <Suspense
          fallback={
            <div className="workspace-loading" role="status">
              <Icon name="bolt" size={32} />
              Preparing your workspace…
            </div>
          }
        >
          <Admin />
        </Suspense>
      ) : (
        <>
          <StoreHeader />
          <Suspense
            fallback={
              <div className="workspace-loading" role="status">
                Getting your gear ready…
              </div>
            }
          >
            {route === "/" ? (
              <Home />
            ) : route.startsWith("/shop") ? (
              backend.mode === "api" ? (
                <ApiCatalog key={route} />
              ) : (
                <Catalog key={route} />
              )
            ) : route.startsWith("/product/") ? (
              backend.mode === "api" ? (
                <ApiProduct key={route} />
              ) : (
                <ProductDetail key={route} />
              )
            ) : route === "/design-system" ? (
              <DesignSystem />
            ) : (
              <CommercePages />
            )}
          </Suspense>
          <StoreFooter />
        </>
      )}
      {message && (
        <div className="toast" role="status">
          <span>
            <Icon name="check" size={17} />
          </span>
          {message}
          <Button
            variant="ghost"
            aria-label="Dismiss notification"
            onClick={() => setMessage("")}
          >
            <Icon name="close" size={15} />
          </Button>
        </div>
      )}
    </AppContext.Provider>
  )
}

function DesignSystem() {
  const [modal, setModal] = useState(false)
  const [state, setState] = useState("Default")
  return (
    <main className="container design-system-page">
      <span className="eyebrow">01 / THE FOUNDATION</span>
      <Heading level={1}>The SmashHub playbook.</Heading>
      <p>A considered system. A consistent experience. Built for the game.</p>
      <section className="ds-section">
        <Heading>Color, with purpose.</Heading>
        <div className="token-swatches">
          {[
            ["brand", "Energetic orange"],
            ["ink", "Smash black"],
            ["paper", "Court white"],
            ["surface", "Warm neutral"],
            ["success", "Success green"],
          ].map(([c, t]) => (
            <div key={c}>
              <div className={`token-${c}`} />
              <strong>{t}</strong>
              <small>--color-{c}</small>
            </div>
          ))}
        </div>
      </section>
      <section className="ds-section">
        <Heading>Type that makes a statement.</Heading>
        <div className="type-specimen">
          <span>DISPLAY / MANROPE 800</span>
          <Heading level={1}>YOUR GAME. YOUR EDGE.</Heading>
        </div>
        <div className="type-specimen">
          <span>HEADING / MANROPE 700</span>
          <Heading>Great gear. Every discipline.</Heading>
        </div>
        <div className="type-specimen">
          <span>BODY / MANROPE 400</span>
          <p>
            From your first rally to match point. Find the gear that takes you
            further.
          </p>
        </div>
      </section>
      <section className="ds-section">
        <Heading>Clear actions. Confident players.</Heading>
        <div className="button-row">
          <Button onClick={() => setModal(true)}>
            Primary action
            <Icon name="arrow" size={16} />
          </Button>
          <Button variant="dark" onClick={() => setModal(true)}>
            Dark action
          </Button>
          <Button variant="secondary" onClick={() => setModal(true)}>
            Secondary action
          </Button>
          <Button variant="ghost" onClick={() => setModal(true)}>
            Text action
            <Icon name="arrow" size={16} />
          </Button>
          <Button disabled>Disabled</Button>
        </div>
      </section>
      <section className="ds-section">
        <Heading>Fields & feedback.</Heading>
        <div className="form-grid">
          <Input
            label="Email address"
            placeholder="you@example.com"
            type="email"
          />
          <Select label="Product status">
            <option>ACTIVE</option>
            <option>DRAFT</option>
          </Select>
          <Input
            label="Error state"
            className="field-error"
            defaultValue="Not a valid email"
          />
          <Input label="Disabled state" placeholder="Not available" disabled />
        </div>
        <div className="button-row">
          {["green", "orange", "blue", "amber", "red", "ink"].map((t, i) => (
            <Badge tone={t} key={t}>
              {
                [
                  "Active",
                  "New arrival",
                  "Shipping",
                  "Pending payment",
                  "Out of stock",
                  "Best seller",
                ][i]
              }
            </Badge>
          ))}
        </div>
      </section>
      <section className="ds-section">
        <Heading>Thoughtful in every state.</Heading>
        <div className="button-row">
          {["Default", "Loading", "Empty", "Error"].map((s) => (
            <Button
              variant={state === s ? "dark" : "secondary"}
              key={s}
              onClick={() => setState(s)}
            >
              {s}
            </Button>
          ))}
        </div>
        <div className="state-demo">
          {state === "Loading" ? (
            <div className="skeleton-card">
              <div />
              <span />
              <span />
            </div>
          ) : state === "Empty" ? (
            <Empty
              icon="heart"
              title="A place for your favorites."
              text="Save the gear you love and find it here."
            />
          ) : state === "Error" ? (
            <div className="error-banner" role="alert">
              We couldn’t load your gear. Check your connection and try again.
              <Button variant="secondary" onClick={() => setState("Default")}>
                Try again
              </Button>
            </div>
          ) : (
            <div className="inline-note">
              <Icon name="check" />
              You’re ready for the next rally. Everything is looking good.
            </div>
          )}
        </div>
      </section>
      {modal && (
        <Modal
          title="A little clarity goes a long way."
          onClose={() => setModal(false)}
        >
          <p>
            Consistent dialogs make important decisions clear, with one primary
            action and an easy way back.
          </p>
          <div className="modal-actions">
            <Button variant="secondary" onClick={() => setModal(false)}>
              Go back
            </Button>
            <Button onClick={() => setModal(false)}>
              Got it
              <Icon name="check" size={16} />
            </Button>
          </div>
        </Modal>
      )}
    </main>
  )
}
