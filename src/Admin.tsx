import { useState } from "react"
import { useApp } from "./context"
import {
  brands,
  categories,
  money,
  ProductArt,
  statuses,
  type Product,
} from "./data"
import {
  Badge,
  Button,
  Empty,
  Heading,
  Icon,
  IconButton,
  Input,
  Logo,
  Modal,
  Select,
} from "./ui"
import { Pagination } from "./Store"
import { OrderTimeline, Status } from "./Commerce"
import { errorMessage, useBackend } from "./api/Backend"
import { ApiAdminSection } from "./api/AdminApi"

const navItems = [
  ["", "grid", "Tổng quan"],
  ["products", "box", "Sản phẩm"],
  ["categories", "grid", "Danh mục"],
  ["brands", "tag", "Thương hiệu"],
  ["inventory", "chart", "Kho hàng"],
  ["orders", "bag", "Đơn hàng"],
  ["customers", "users", "Khách hàng"],
]
export function Admin() {
  const { route, navigate, toast } = useApp()
  const backend = useBackend()
  const section = route.split("/")[2] || ""
  const [menu, setMenu] = useState(false)
  const [notifications, setNotifications] = useState(false)
  const [profile, setProfile] = useState(false)
  const [logout, setLogout] = useState(false)
  const titles: Record<string, string> = {
    "": "Tổng quan",
    products: "Sản phẩm",
    categories: "Danh mục",
    brands: "Thương hiệu",
    inventory: "Kho hàng",
    orders: "Đơn hàng",
    customers: "Khách hàng",
    settings: "Cài đặt",
    profile: "Hồ sơ của tôi",
  }
  return (
    <div className="admin-shell">
      <aside className={`admin-sidebar ${menu ? "open" : ""}`}>
        <Logo onClick={() => navigate("/admin")} />
        <span className="admin-workspace">
          KHÔNG GIAN LÀM VIỆC <Badge>ADMIN</Badge>
        </span>
        <span className="sidebar-label">QUẢN LÝ CỬA HÀNG</span>
        <nav>
          {navItems.map(([s, i, t]) => (
            <Button
              variant="ghost"
              key={s}
              className={section === s ? "active" : ""}
              onClick={() => {
                navigate("/admin" + (s ? "/" + s : ""))
                setMenu(false)
              }}
            >
              <Icon name={i} size={19} />
              {t}
              {s === "orders" && backend.mode === "demo" && (
                <span className="nav-count">6</span>
              )}
            </Button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="store-status">
            <span />
            <div>
              <strong>
                {backend.mode === "api"
                  ? "Spring Boot API"
                  : "Cửa hàng đang hoạt động tốt"}
              </strong>
              <small>
                {backend.mode === "api"
                  ? backend.error
                    ? "Kiểm tra kết nối backend"
                    : "Không dùng số liệu giả"
                  : "Tất cả hệ thống bình thường"}
              </small>
            </div>
          </div>
          <Button
            variant="ghost"
            onClick={() => navigate("/admin/settings")}
            className={section === "settings" ? "active" : ""}
          >
            <Icon name="settings" size={19} />
            Cài đặt
          </Button>
          <Button variant="ghost" onClick={() => navigate("/")}>
            <Icon name="globe" size={19} />
            Xem cửa hàng
            <Icon name="arrow" size={15} />
          </Button>
          <div
            className="admin-profile"
            onClick={() => navigate("/admin/profile")}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && navigate("/admin/profile")}
          >
            <span className="admin-avatar">AM</span>
            <span>
              <strong>
                {backend.mode === "api"
                  ? backend.identity?.email || "Chưa đăng nhập"
                  : "Alex Morgan"}
              </strong>
              <small>
                {backend.mode === "api"
                  ? backend.identity?.roles.join(", ") || "Cần JWT"
                  : "Store administrator"}
              </small>
            </span>
            <Icon name="down" size={14} />
          </div>
        </div>
      </aside>
      <div className="admin-main">
        <header className="admin-header">
          <IconButton
            name="menu"
            label="Toggle sidebar"
            className="mobile-menu"
            onClick={() => setMenu(!menu)}
          />
          <div className="admin-breadcrumb">
            Workspace <Icon name="chevron" size={12} />
            <strong>{titles[section] || "Overview"}</strong>
          </div>
          <div className="admin-header-right">
            <span className="demo-pill">
              <span />
              {backend.mode === "api" ? "API workspace" : "Demo workspace"}
            </span>
            <div className="popover-anchor">
              <IconButton
                name="bell"
                label="Notifications"
                disabled={backend.mode === "api"}
                onClick={() => {
                  setNotifications(!notifications)
                  setProfile(false)
                }}
              />
              {backend.mode === "demo" && <span className="notification-dot" />}
              {notifications && (
                <div className="dropdown-panel notifications">
                  <strong>You’re all caught up on the game.</strong>
                  <p>
                    <Icon name="bag" /> New order #SH-10248 received.
                  </p>
                  <p>
                    <Icon name="box" /> Thruster Ryuga II is running low.
                  </p>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      navigate("/admin/inventory")
                      setNotifications(false)
                    }}
                  >
                    View inventory
                    <Icon name="arrow" size={14} />
                  </Button>
                </div>
              )}
            </div>
            <span className="header-separator" />
            <div className="popover-anchor">
              <Button
                variant="ghost"
                onClick={() => {
                  setProfile(!profile)
                  setNotifications(false)
                }}
              >
                <span className="admin-avatar small">AM</span>
                <Icon name="down" size={13} />
              </Button>
              {profile && (
                <div className="dropdown-panel">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      navigate("/admin/profile")
                      setProfile(false)
                    }}
                  >
                    My profile
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      navigate("/admin/settings")
                      setProfile(false)
                    }}
                  >
                    Settings
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setLogout(true)
                      setProfile(false)
                    }}
                  >
                    Sign out
                  </Button>
                </div>
              )}
            </div>
          </div>
        </header>
        <main className="admin-content">
          {backend.mode === "api" ? (
            <ApiAdminSection key={section} section={section} />
          ) : section === "" ? (
            <Dashboard />
          ) : section === "products" ? (
            <AdminProducts />
          ) : section === "categories" || section === "brands" ? (
            <Taxonomy key={section} kind={section} />
          ) : section === "inventory" ? (
            <Inventory />
          ) : section === "orders" ? (
            <AdminOrders />
          ) : section === "customers" ? (
            <Customers />
          ) : (
            <AdminSettings key={section} profile={section === "profile"} />
          )}
        </main>
        <footer className="admin-footer">
          <span>© 2025 SmashHub. Built for the game.</span>
          <span>
            {backend.mode === "api"
              ? "Live API · JWT permissions · Chỉ dùng endpoint đã cung cấp"
              : "Mock data · Session-only changes · Spring Boot integration ready"}
          </span>
        </footer>
      </div>
      {logout && (
        <Modal
          title="Sign out of the workspace?"
          onClose={() => setLogout(false)}
        >
          <p>
            {backend.mode === "api"
              ? "Phiên JWT sẽ được thu hồi bằng Auth Logout API."
              : "Your demo changes will remain available during this session."}
          </p>
          <div className="modal-actions">
            <Button variant="secondary" onClick={() => setLogout(false)}>
              Stay here
            </Button>
            <Button
              onClick={async () => {
                try {
                  if (backend.mode === "api") await backend.logout()
                  navigate("/")
                  toast(
                    backend.mode === "api"
                      ? "Đăng xuất thành công."
                      : "Signed out of the demo workspace.",
                  )
                } catch (e) {
                  toast(errorMessage(e))
                }
              }}
            >
              Sign out
            </Button>
          </div>
        </Modal>
      )}
    </div>
  )
}
function AdminPageTitle({
  title,
  description,
  children,
  eyebrow,
}: {
  title: string
  description: string
  children?: React.ReactNode
  eyebrow?: string
}) {
  return (
    <div className="admin-page-title">
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <Heading level={1}>{title}</Heading>
        <p>{description}</p>
      </div>
      <div className="button-row">{children}</div>
    </div>
  )
}
function Dashboard() {
  const { navigate, orders, products } = useApp()
  const [period, setPeriod] = useState("Last 30 days")
  const [metric, setMetric] = useState("Revenue")
  const revenue = orders.reduce(
    (n, o) => (o.status !== "CANCELLED" ? n + o.total : n),
    0,
  )
  const month = period === "Last 7 days"
  return (
    <>
      <AdminPageTitle
        eyebrow="LET’S MAKE IT A GREAT DAY"
        title="Your store, at a glance."
        description="Welcome back, Alex. Here’s what’s happening at SmashHub."
      >
        <Select
          aria-label="Reporting period"
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
        >
          <option>Last 30 days</option>
          <option>Last 7 days</option>
          <option>This year</option>
        </Select>
        <Button variant="dark" onClick={() => navigate("/admin/products/new")}>
          <Icon name="plus" size={16} />
          Add product
        </Button>
      </AdminPageTitle>
      <div className="metric-grid">
        {[
          [
            "Total revenue",
            money((month ? 6420 : 24850) + revenue),
            "+18.6%",
            "chart",
          ],
          [
            "Total orders",
            String((month ? 42 : 180) + orders.length),
            "+12.4%",
            "bag",
          ],
          ["Total products", String(products.length), "+4 this month", "box"],
          ["Total customers", month ? "68" : "1,284", "+8.2%", "users"],
        ].map(([t, n, d, i]) => (
          <div className="metric-card" key={t}>
            <div>
              <span>{t}</span>
              <span className="metric-icon">
                <Icon name={i} size={19} />
              </span>
            </div>
            <strong>{n}</strong>
            <div>
              <span className="metric-trend">↗ {d}</span>
              <small>vs. previous period</small>
            </div>
            <svg className="sparkline" viewBox="0 0 120 35">
              <path
                d="m0 29 10-5 10 3 10-13 10 6 10-9 10 5 10-10 10 2 10-5 10 4 10-10"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              />
            </svg>
          </div>
        ))}
      </div>
      <div className="dashboard-chart-grid">
        <section className="admin-panel revenue-panel">
          <div className="panel-head">
            <div>
              <Heading level={3}>Sales performance</Heading>
              <p>A little progress. Every single day.</p>
            </div>
            <div className="segmented">
              {["Revenue", "Orders"].map((t) => (
                <Button
                  variant="ghost"
                  key={t}
                  className={metric === t ? "active" : ""}
                  onClick={() => setMetric(t)}
                >
                  {t}
                </Button>
              ))}
            </div>
          </div>
          <div className="chart-key">
            <strong>
              {metric === "Revenue"
                ? money(month ? 6420 : 24850)
                : month
                  ? "48"
                  : "186"}
            </strong>
            <span>
              <i />
              This period
            </span>
            <span>
              <i />
              Previous period
            </span>
          </div>
          <div className="revenue-chart">
            <div className="chart-labels">
              {(metric === "Revenue"
                ? ["$10k", "$7.5k", "$5k", "$2.5k", "$0"]
                : ["100", "75", "50", "25", "0"]
              ).map((l) => (
                <span key={l}>{l}</span>
              ))}
            </div>
            <svg
              viewBox="0 0 680 205"
              preserveAspectRatio="none"
              aria-label={`${metric} chart for ${period}`}
            >
              <defs>
                <linearGradient id="chart-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop stopColor="#ed6535" stopOpacity=".2" />
                  <stop offset="1" stopColor="#ed6535" stopOpacity="0" />
                </linearGradient>
              </defs>
              {[5, 52, 100, 147, 195].map((y) => (
                <path
                  key={y}
                  d={`M0 ${y}H680`}
                  stroke="#ededeb"
                  strokeDasharray="4 4"
                />
              ))}
              <path
                d="M0 168 23 157 45 170 68 145 90 152 113 136 135 148 158 119 180 127 203 105 225 122 248 112 270 92 293 104 315 90 338 99 360 72 383 80 405 61 428 76 450 55 473 68 495 50 518 64 540 39 563 49 585 31 608 44 630 20 653 35 680 22V205H0Z"
                fill="url(#chart-fill)"
              />
              <path
                d="M0 180 30 171 60 177 90 158 120 169 150 148 180 156 210 141 240 151 270 133 300 145 330 126 360 137 390 116 420 129 450 107 480 119 510 96 540 108 570 89 600 101 640 79 680 87"
                fill="none"
                stroke="#b9bfba"
                strokeWidth="2"
                strokeDasharray="5 5"
              />
              <path
                d={
                  month
                    ? "M0 175 55 146 110 158 165 123 220 137 275 98 330 111 385 75 440 92 495 61 550 72 605 37 680 43"
                    : "M0 168 23 157 45 170 68 145 90 152 113 136 135 148 158 119 180 127 203 105 225 122 248 112 270 92 293 104 315 90 338 99 360 72 383 80 405 61 428 76 450 55 473 68 495 50 518 64 540 39 563 49 585 31 608 44 630 20 653 35 680 22"
                }
                fill="none"
                stroke="#e96938"
                strokeWidth="3"
              />
            </svg>
          </div>
          <div className="chart-dates">
            {(month
              ? ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
              : [
                  "Jun 01",
                  "Jun 05",
                  "Jun 10",
                  "Jun 15",
                  "Jun 20",
                  "Jun 25",
                  "Jun 30",
                ]
            ).map((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>
        </section>
        <section className="admin-panel order-distribution">
          <div className="panel-head">
            <Heading level={3}>Order breakdown</Heading>
            <Icon name="bag" size={19} />
          </div>
          <div className="donut">
            <div>
              <strong>{180 + orders.length}</strong>
              <span>Total orders</span>
            </div>
          </div>
          <div className="donut-legend">
            {[
              ["Delivered", "68%", "green"],
              ["Processing", "18%", "orange"],
              ["Shipping", "10%", "blue"],
              ["Other", "4%", "gray"],
            ].map(([t, n, c]) => (
              <div key={t}>
                <span>
                  <i className={c} />
                  {t}
                </span>
                <strong>{n}</strong>
              </div>
            ))}
          </div>
        </section>
      </div>
      <section className="admin-panel">
        <div className="panel-head">
          <div>
            <Heading level={3}>Recent orders</Heading>
            <p>The latest moves in your store.</p>
          </div>
          <Button
            variant="ghost"
            className="text-link"
            onClick={() => navigate("/admin/orders")}
          >
            All orders
            <Icon name="arrow" size={16} />
          </Button>
        </div>
        <OrderTable
          orders={orders.slice(0, 5)}
          onView={(id) => navigate("/admin/orders/" + id)}
        />
      </section>
      <div className="dashboard-bottom-grid">
        <section className="admin-panel">
          <div className="panel-head">
            <Heading level={3}>Top of the game</Heading>
            <Badge>Best sellers</Badge>
          </div>
          {products.slice(0, 4).map((p, i) => (
            <div className="bestseller-row" key={p.id}>
              <span className="row-rank">0{i + 1}</span>
              <div className="table-product-art">
                <ProductArt product={p} />
              </div>
              <span>
                <strong>{p.name}</strong>
                <small>{p.brand}</small>
              </span>
              <div>
                <strong>{42 - i * 9} sold</strong>
                <small>{money(p.price * (42 - i * 9))}</small>
              </div>
            </div>
          ))}
        </section>
        <section className="admin-panel">
          <div className="panel-head">
            <Heading level={3}>Keep an eye on stock</Heading>
            <Badge tone="amber">Action needed</Badge>
          </div>
          {products
            .filter((p) => p.stock < 20)
            .slice(0, 4)
            .map((p) => (
              <div className="bestseller-row" key={p.id}>
                <div className="table-product-art">
                  <ProductArt product={p} />
                </div>
                <span>
                  <strong>{p.name}</strong>
                  <small>SKU: SH-{p.id}0-G5</small>
                </span>
                <Badge tone={p.stock < 5 ? "red" : "amber"}>
                  {p.stock} left
                </Badge>
                <IconButton
                  name="plus"
                  label="Adjust stock"
                  onClick={() => navigate("/admin/inventory")}
                />
              </div>
            ))}
          <Button
            variant="ghost"
            className="panel-bottom-link"
            onClick={() => navigate("/admin/inventory")}
          >
            Manage inventory
            <Icon name="arrow" size={15} />
          </Button>
        </section>
      </div>
    </>
  )
}
function OrderTable({
  orders,
  onView,
}: {
  orders: ReturnType<typeof useApp>["orders"]
  onView: (id: string) => void
}) {
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>Order</th>
            <th>Customer</th>
            <th>Date</th>
            <th>Payment</th>
            <th>Status</th>
            <th className="align-right">Total</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o.id}>
              <td>
                <Button
                  variant="ghost"
                  className="table-link"
                  onClick={() => onView(o.id)}
                >
                  #{o.id}
                </Button>
              </td>
              <td>
                <div className="table-person">
                  <span className="person-avatar">
                    {o.customer
                      .split(" ")
                      .map((s) => s[0])
                      .join("")}
                  </span>
                  <span>
                    <strong>{o.customer}</strong>
                    <small>{o.email}</small>
                  </span>
                </div>
              </td>
              <td>{o.date}</td>
              <td>
                <Badge>{o.payment}</Badge>
              </td>
              <td>
                <Status value={o.status} />
              </td>
              <td className="align-right">
                <strong>{money(o.total)}</strong>
              </td>
              <td>
                <IconButton
                  name="chevron"
                  label="View order"
                  onClick={() => onView(o.id)}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!orders.length && (
        <Empty
          icon="search"
          title="No matching orders"
          text="Try a different search or status."
        />
      )}
    </div>
  )
}
function SearchBox({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (value: string) => void
  placeholder: string
}) {
  return (
    <div className="table-search">
      <Icon name="search" size={17} />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
      />
    </div>
  )
}

function AdminProducts() {
  const { products, setProducts, navigate, route, toast } = useApp()
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState("All")
  const [category, setCategory] = useState("All categories")
  const [page, setPage] = useState(1)
  const [deleting, setDeleting] = useState<Product | null>(null)
  const [selected, setSelected] = useState<number[]>([])
  const sub = route.split("/")[3]
  if (sub) return <ProductEditor key={sub} id={sub} />
  const filtered = products.filter(
    (p) =>
      `${p.name} ${p.brand} SH-${p.id}0-G5`
        .toLowerCase()
        .includes(search.toLowerCase()) &&
      (status === "All" || status === p.status) &&
      (category === "All categories" || p.category === category),
  )
  return (
    <>
      <AdminPageTitle
        title="Products"
        description="Your collection. Ready for the next rally."
      >
        <Button
          variant="secondary"
          onClick={() =>
            downloadCSV(
              "smashhub-products.csv",
              [
                "Name,Brand,Category,Price,Stock,Status",
                ...filtered.map(
                  (p) =>
                    `${p.name},${p.brand},${p.category},${p.price},${p.stock},${p.status}`,
                ),
              ].join("\n"),
            )
          }
        >
          <Icon name="upload" size={15} />
          Export
        </Button>
        <Button variant="dark" onClick={() => navigate("/admin/products/new")}>
          <Icon name="plus" size={16} />
          Add product
        </Button>
      </AdminPageTitle>
      <div className="admin-tabs">
        {["All", "ACTIVE", "DRAFT", "OUT_OF_STOCK", "DISCONTINUED"].map((s) => (
          <Button
            key={s}
            variant="ghost"
            className={s === status ? "active" : ""}
            onClick={() => {
              setStatus(s)
              setPage(1)
            }}
          >
            {s === "All" ? "All products" : s.replace(/_/g, " ").toLowerCase()}
            <Badge>
              {s === "All"
                ? products.length
                : products.filter((p) => p.status === s).length}
            </Badge>
          </Button>
        ))}
      </div>
      <section className="admin-panel">
        <div className="table-toolbar">
          <SearchBox
            placeholder="Search products, brands, or SKU..."
            value={search}
            onChange={(v) => {
              setSearch(v)
              setPage(1)
            }}
          />
          <Select
            aria-label="Filter category"
            value={category}
            onChange={(e) => {
              setCategory(e.target.value)
              setPage(1)
            }}
          >
            <option>All categories</option>
            {categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </Select>
          {selected.length > 0 && (
            <Button
              variant="secondary"
              onClick={() => {
                setProducts(
                  products.map((p) =>
                    selected.includes(p.id) ? { ...p, status: "DRAFT" } : p,
                  ),
                )
                setSelected([])
                toast("Selected products moved to draft.")
              }}
            >
              Set {selected.length} to draft
            </Button>
          )}
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    aria-label="Select all products"
                    checked={
                      filtered.length > 0 && selected.length === filtered.length
                    }
                    onChange={(e) =>
                      setSelected(
                        e.target.checked ? filtered.map((p) => p.id) : [],
                      )
                    }
                  />
                </th>
                <th>Product</th>
                <th>Category</th>
                <th>Price</th>
                <th>Inventory</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filtered.slice((page - 1) * 8, page * 8).map((p) => (
                <tr key={p.id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selected.includes(p.id)}
                      onChange={(e) =>
                        setSelected(
                          e.target.checked
                            ? [...selected, p.id]
                            : selected.filter((id) => id !== p.id),
                        )
                      }
                      aria-label={`Select ${p.name}`}
                    />
                  </td>
                  <td>
                    <div className="table-product">
                      <div className="table-product-art">
                        <ProductArt product={p} />
                      </div>
                      <Button
                        variant="ghost"
                        className="table-product-name"
                        onClick={() => navigate(`/admin/products/${p.id}`)}
                      >
                        <strong>{p.name}</strong>
                        <small>
                          {p.brand} · SH-{p.id}0-G5
                        </small>
                      </Button>
                    </div>
                  </td>
                  <td>{p.category}</td>
                  <td>
                    <strong>{money(p.price)}</strong>
                    {p.oldPrice && (
                      <small className="table-old-price">
                        {money(p.oldPrice)}
                      </small>
                    )}
                  </td>
                  <td>
                    <span className={p.stock < 10 ? "orange-text" : ""}>
                      {p.stock} in stock
                    </span>
                    <small className="table-sub">
                      {p.category === "Rackets" ? "3 variants" : "1 variant"}
                    </small>
                  </td>
                  <td>
                    <Status value={p.status} />
                  </td>
                  <td>
                    <div className="table-actions">
                      <IconButton
                        name="edit"
                        label="Edit product"
                        onClick={() => navigate(`/admin/products/${p.id}`)}
                      />
                      <IconButton
                        name="trash"
                        label="Delete product"
                        onClick={() => setDeleting(p)}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!filtered.length && (
            <Empty
              icon="search"
              title="No products match"
              text="Try another search or change the filters."
            >
              <Button
                variant="secondary"
                onClick={() => {
                  setSearch("")
                  setStatus("All")
                  setCategory("All categories")
                }}
              >
                Clear filters
              </Button>
            </Empty>
          )}
        </div>
        <Pagination
          page={page}
          total={Math.max(1, Math.ceil(filtered.length / 8))}
          onChange={setPage}
        />
      </section>
      {deleting && (
        <Modal title="Delete this product?" onClose={() => setDeleting(null)}>
          <p>
            <strong>{deleting.name}</strong> will be removed from this demo
            catalog. This action can’t be undone.
          </p>
          <div className="modal-actions">
            <Button variant="secondary" onClick={() => setDeleting(null)}>
              Keep product
            </Button>
            <Button
              onClick={() => {
                setProducts(products.filter((p) => p.id !== deleting.id))
                toast("Product deleted.")
                setDeleting(null)
              }}
            >
              Delete product
            </Button>
          </div>
        </Modal>
      )}
    </>
  )
}
function ProductEditor({ id }: { id: string }) {
  const { products, setProducts, navigate, toast } = useApp()
  const existing = products.find((p) => p.id === +id)
  const [tab, setTab] = useState("General")
  const [name, setName] = useState(existing?.name || "")
  const [slug, setSlug] = useState(
    existing?.slug || existing?.name.toLowerCase().replace(/ /g, "-") || "",
  )
  const [description, setDescription] = useState(
    existing?.description ||
      (existing
        ? `Experience unmatched performance with the ${existing.name}. Precision-engineered for competitive players.`
        : ""),
  )
  const [productType, setProductType] = useState(
    existing?.productType ||
      (existing?.category === "Shoes"
        ? "SHOES"
        : existing?.category === "Apparel"
          ? "APPAREL"
          : existing?.category === "Accessories" ||
              existing?.category === "Shuttlecocks"
            ? "ACCESSORY"
            : "RACKET"),
  )
  const [brand, setBrand] = useState(existing?.brand || "Yonex")
  const [category, setCategory] = useState(existing?.category || "Rackets")
  const [price, setPrice] = useState(
    String(existing?.oldPrice || existing?.price || ""),
  )
  const [salePrice, setSalePrice] = useState(
    String(existing?.oldPrice ? existing.price : ""),
  )
  const [stock, setStock] = useState(existing?.stock || 0)
  const [status, setStatus] = useState(existing?.status || "DRAFT")
  const [images, setImages] = useState<string[]>(existing?.images || [])
  const [colors, setColors] = useState(
    existing?.colors || ["Original", "Midnight"],
  )
  const [color, setColor] = useState("")
  const [variants, setVariants] = useState(
    existing?.variants || [
      {
        sku: `SH-${existing?.id || "NEW"}0-G5`,
        name: "4U / G5",
        price: existing?.price || 0,
        stock: existing?.stock || 0,
        status: "ACTIVE",
      },
    ],
  )
  const [attributes, setAttributes] = useState(
    existing?.attributes || [
      { name: "Material", value: "HM Graphite" },
      { name: "Balance", value: "Head heavy" },
    ],
  )
  const [error, setError] = useState("")
  const save = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !price || +price <= 0) {
      setTab("General")
      setError(
        "Please add a product name and a regular price greater than zero.",
      )
      return
    }
    if (salePrice && (+salePrice >= +price || +salePrice < 0)) {
      setTab("General")
      setError(
        "Sale price must be lower than the regular price and cannot be negative.",
      )
      return
    }
    const p: Product = {
      id: existing?.id || Math.max(...products.map((p) => p.id), 0) + 1,
      name,
      brand,
      category,
      price: +salePrice || +price,
      oldPrice: salePrice ? +price : undefined,
      color: existing?.color || "#294653",
      rating: existing?.rating || "0.0",
      reviews: existing?.reviews || 0,
      stock,
      status,
      slug,
      description,
      productType,
      images,
      colors,
      attributes,
      variants,
    }
    setProducts(
      existing
        ? products.map((v) => (v.id === existing.id ? p : v))
        : [...products, p],
    )
    toast(`${name} ${existing ? "updated" : "created"} in the demo catalog.`)
    navigate("/admin/products")
  }
  return (
    <>
      <AdminPageTitle
        title={existing ? `Edit ${existing.name}` : "Add a new product"}
        description="Give your next bestseller a great start."
      >
        <Button variant="secondary" onClick={() => navigate("/admin/products")}>
          Cancel
        </Button>
        <Button variant="dark" type="submit" form="product-editor">
          <Icon name="check" size={16} />
          Save product
        </Button>
      </AdminPageTitle>
      <form id="product-editor" onSubmit={save}>
        <div className="editor-layout">
          <section className="admin-panel">
            <div className="admin-tabs editor-tabs">
              {["General", "Images", "Colors & attributes", "Variants"].map(
                (t) => (
                  <Button
                    variant="ghost"
                    key={t}
                    className={t === tab ? "active" : ""}
                    onClick={() => setTab(t)}
                  >
                    {t}
                  </Button>
                ),
              )}
            </div>
            <div className="editor-content">
              {error && (
                <p className="error-banner" role="alert">
                  {error}
                </p>
              )}
              <div hidden={tab !== "General"}>
                <Heading level={3}>Product information</Heading>
                <Input
                  label="Product name *"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value)
                    setSlug(
                      e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
                    )
                  }}
                  placeholder="e.g. Astrox 100 ZZ"
                />
                <Input
                  label="URL slug"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                />
                <label className="field">
                  <span>Description</span>
                  <textarea
                    rows={6}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Tell players what makes this product special..."
                  />
                </label>
                <div className="form-grid">
                  <Select
                    label="Category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    {categories.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </Select>
                  <Select
                    label="Brand"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                  >
                    {brands.map((b) => (
                      <option key={b}>{b}</option>
                    ))}
                  </Select>
                  <Select
                    label="Product type"
                    value={productType}
                    onChange={(e) => setProductType(e.target.value)}
                  >
                    {["RACKET", "SHOES", "APPAREL", "ACCESSORY"].map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </Select>
                </div>
                <Heading level={3}>Pricing</Heading>
                <div className="form-grid">
                  <Input
                    label="Regular price ($) *"
                    type="number"
                    step=".01"
                    min=".01"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                  />
                  <Input
                    label="Sale price ($)"
                    type="number"
                    step=".01"
                    min="0"
                    value={salePrice}
                    onChange={(e) => setSalePrice(e.target.value)}
                  />
                </div>
              </div>
              {tab === "Images" && (
                <>
                  <Heading level={3}>Product images</Heading>
                  <p className="muted">
                    Add multiple images. The first image is your featured
                    product image.
                  </p>
                  <label className="upload-zone">
                    <Icon name="upload" size={30} />
                    <strong>Click to upload product images</strong>
                    <span>PNG, JPG or WebP · Up to 5 MB each</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      multiple
                      onChange={(e) => {
                        const files = Array.from(e.target.files || [])
                        if (files.some((f) => f.size > 5 * 1024 * 1024)) {
                          toast("Please use images smaller than 5 MB.")
                          return
                        }
                        setImages([
                          ...images,
                          ...files.map((f) => URL.createObjectURL(f)),
                        ])
                      }}
                    />
                  </label>
                  <div className="upload-previews">
                    {images.map((src, i) => (
                      <div key={src}>
                        <img src={src} alt={`Product upload ${i + 1}`} />
                        <IconButton
                          name="close"
                          label="Remove image"
                          onClick={() => {
                            URL.revokeObjectURL(src)
                            setImages(images.filter((_, j) => j !== i))
                          }}
                        />
                      </div>
                    ))}
                  </div>
                  {!images.length && (
                    <div className="editor-art">
                      <ProductArt
                        product={{
                          id: 9100,
                          category,
                          color: existing?.color || "#213e49",
                        }}
                      />
                      <small>Current catalog illustration</small>
                    </div>
                  )}
                  <div className="inline-note">
                    <Icon name="upload" size={16} />
                    Local preview only. Cloudinary upload is not connected.
                  </div>
                </>
              )}
              {tab === "Colors & attributes" && (
                <>
                  <Heading level={3}>Available colors</Heading>
                  <div className="filter-chips">
                    {colors.map((c) => (
                      <Button
                        variant="secondary"
                        key={c}
                        onClick={() => setColors(colors.filter((x) => x !== c))}
                      >
                        {c}
                        <Icon name="close" size={12} />
                      </Button>
                    ))}
                  </div>
                  <div className="button-row">
                    <Input
                      placeholder="Color name"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      aria-label="Color name"
                    />
                    <Button
                      variant="secondary"
                      onClick={() => {
                        if (color.trim()) {
                          setColors([...colors, color.trim()])
                          setColor("")
                        }
                      }}
                    >
                      <Icon name="plus" size={15} />
                      Add color
                    </Button>
                  </div>
                  <Heading level={3}>Product attributes</Heading>
                  {attributes.map((a, i) => (
                    <div className="attribute-row" key={i}>
                      <Input
                        label="Attribute"
                        value={a.name}
                        onChange={(e) =>
                          setAttributes(
                            attributes.map((v, j) =>
                              i === j ? { ...v, name: e.target.value } : v,
                            ),
                          )
                        }
                      />
                      <Input
                        label="Value"
                        value={a.value}
                        onChange={(e) =>
                          setAttributes(
                            attributes.map((v, j) =>
                              i === j ? { ...v, value: e.target.value } : v,
                            ),
                          )
                        }
                      />
                      <IconButton
                        name="trash"
                        label="Remove attribute"
                        onClick={() =>
                          setAttributes(attributes.filter((_, j) => i !== j))
                        }
                      />
                    </div>
                  ))}
                  <Button
                    variant="secondary"
                    onClick={() =>
                      setAttributes([...attributes, { name: "", value: "" }])
                    }
                  >
                    <Icon name="plus" size={15} />
                    Add attribute
                  </Button>
                </>
              )}
              {tab === "Variants" && (
                <>
                  <Heading level={3}>Product variants</Heading>
                  <p className="muted">
                    Manage SKU, price, and availability for every option.
                  </p>
                  {variants.map((v, i) => (
                    <div className="variant-editor" key={i}>
                      <div className="flex-between">
                        <strong>Variant {i + 1}</strong>
                        {variants.length > 1 && (
                          <IconButton
                            name="trash"
                            label="Remove variant"
                            onClick={() =>
                              setVariants(variants.filter((_, j) => i !== j))
                            }
                          />
                        )}
                      </div>
                      <div className="form-grid">
                        <Input
                          label="Variant name"
                          value={v.name}
                          onChange={(e) =>
                            setVariants(
                              variants.map((x, j) =>
                                i === j ? { ...x, name: e.target.value } : x,
                              ),
                            )
                          }
                        />
                        <Input
                          label="SKU"
                          value={v.sku}
                          onChange={(e) =>
                            setVariants(
                              variants.map((x, j) =>
                                i === j ? { ...x, sku: e.target.value } : x,
                              ),
                            )
                          }
                        />
                        <Input
                          label="Variant price ($)"
                          type="number"
                          min="0"
                          value={v.price}
                          onChange={(e) =>
                            setVariants(
                              variants.map((x, j) =>
                                i === j ? { ...x, price: +e.target.value } : x,
                              ),
                            )
                          }
                        />
                        <Input
                          label="Stock quantity"
                          type="number"
                          min="0"
                          value={v.stock}
                          onChange={(e) => {
                            const updated = variants.map((x, j) =>
                              i === j ? { ...x, stock: +e.target.value } : x,
                            )
                            setVariants(updated)
                            setStock(updated.reduce((n, x) => n + x.stock, 0))
                          }}
                        />
                        <Select
                          label="Status"
                          value={v.status}
                          onChange={(e) =>
                            setVariants(
                              variants.map((x, j) =>
                                i === j ? { ...x, status: e.target.value } : x,
                              ),
                            )
                          }
                        >
                          <option>ACTIVE</option>
                          <option>OUT_OF_STOCK</option>
                          <option>DISCONTINUED</option>
                        </Select>
                      </div>
                    </div>
                  ))}
                  <Button
                    variant="secondary"
                    onClick={() =>
                      setVariants([
                        ...variants,
                        {
                          sku: "",
                          name: "",
                          price: +price || 0,
                          stock: 0,
                          status: "ACTIVE",
                        },
                      ])
                    }
                  >
                    <Icon name="plus" size={15} />
                    Add variant
                  </Button>
                </>
              )}
            </div>
          </section>
          <aside>
            <section className="admin-panel editor-side">
              <Heading level={3}>Publishing</Heading>
              <Select
                label="Product status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                {["DRAFT", "ACTIVE", "OUT_OF_STOCK", "DISCONTINUED"].map(
                  (s) => (
                    <option key={s}>{s}</option>
                  ),
                )}
              </Select>
              <p>
                Active products are visible in the storefront. Drafts stay
                private.
              </p>
              <Input
                label="Total inventory"
                type="number"
                min="0"
                value={stock}
                onChange={(e) => setStock(Math.max(0, +e.target.value))}
              />
            </section>
            <section className="admin-panel editor-side">
              <Heading level={3}>Product preview</Heading>
              <ProductArt
                product={{
                  id: 9200,
                  category,
                  color: existing?.color || "#213e49",
                }}
              />
              <strong>{name || "Your product name"}</strong>
              <span>
                {brand} · {category}
              </span>
              <strong>{price ? money(+salePrice || +price) : "$0"}</strong>
            </section>
            <p className="mock-note">
              Product data and local image previews are saved in memory for this
              session. No server uploads are performed.
            </p>
          </aside>
        </div>
      </form>
    </>
  )
}

function Taxonomy({ kind }: { kind: "categories" | "brands" }) {
  const { products, toast } = useApp()
  const category = kind === "categories"
  const [records, setRecords] = useState(
    (category ? categories : brands).map((name, i) => ({
      id: i + 1,
      name,
      parent: "",
      description: category
        ? `Performance ${name.toLowerCase()} for every level of player.`
        : `${name} — premium badminton equipment trusted on every court.`,
      logo: "",
    })),
  )
  const [search, setSearch] = useState("")
  const [modal, setModal] = useState("")
  const [edit, setEdit] = useState(0)
  const [preview, setPreview] = useState("")
  const [view, setView] = useState("List")
  const record = records.find((r) => r.id === edit)
  const filtered = records.filter((r) =>
    r.name.toLowerCase().includes(search.toLowerCase()),
  )
  const entity = category ? "category" : "brand"
  return (
    <>
      <AdminPageTitle
        title={category ? "Categories" : "Brands"}
        description={
          category
            ? "A well-organized store is a better shopping experience."
            : "The names that move the game forward."
        }
      >
        <Button
          variant="dark"
          onClick={() => {
            setEdit(0)
            setPreview("")
            setModal("edit")
          }}
        >
          <Icon name="plus" size={16} />
          Add {entity}
        </Button>
      </AdminPageTitle>
      <section className="admin-panel">
        <div className="table-toolbar">
          <SearchBox
            placeholder={`Search ${kind}...`}
            value={search}
            onChange={setSearch}
          />
          {category && (
            <div className="segmented">
              {["List", "Tree"].map((v) => (
                <Button
                  variant="ghost"
                  key={v}
                  className={view === v ? "active" : ""}
                  onClick={() => setView(v)}
                >
                  {v}
                </Button>
              ))}
            </div>
          )}
          <span className="muted">
            {records.length} {kind}
          </span>
        </div>
        {view === "Tree" && category ? (
          <div className="category-tree">
            {filtered
              .filter((r) => !r.parent)
              .map((r) => (
                <div key={r.id}>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setEdit(r.id)
                      setPreview(r.logo)
                      setModal("edit")
                    }}
                  >
                    <Icon name="down" size={15} />
                    <Icon name="box" size={19} />
                    <strong>{r.name}</strong>
                    <Badge>
                      {products.filter((p) => p.category === r.name).length}{" "}
                      products
                    </Badge>
                  </Button>
                  {records
                    .filter((c) => c.parent === r.name)
                    .map((c) => (
                      <Button
                        variant="ghost"
                        key={c.id}
                        className="tree-child"
                        onClick={() => {
                          setEdit(c.id)
                          setModal("edit")
                        }}
                      >
                        └<Icon name="box" size={16} />
                        {c.name}
                      </Button>
                    ))}
                </div>
              ))}
          </div>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>{category ? "Category" : "Brand"}</th>
                  <th>Description</th>
                  {category && <th>Parent category</th>}
                  <th>Products</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <div className="table-product">
                        {r.logo ? (
                          <img
                            className="brand-thumbnail"
                            src={r.logo}
                            alt={r.name}
                          />
                        ) : (
                          <span className="taxonomy-icon">
                            {category ? (
                              <Icon name="box" size={21} />
                            ) : (
                              r.name.slice(0, 2).toUpperCase()
                            )}
                          </span>
                        )}
                        <Button
                          variant="ghost"
                          className="table-link"
                          onClick={() => {
                            setEdit(r.id)
                            setModal("detail")
                          }}
                        >
                          {r.name}
                        </Button>
                      </div>
                    </td>
                    <td className="description-cell">{r.description}</td>
                    {category && <td>{r.parent || "—"}</td>}
                    <td>
                      {
                        products.filter((p) =>
                          category ? p.category === r.name : p.brand === r.name,
                        ).length
                      }
                    </td>
                    <td>
                      <Status value="ACTIVE" />
                    </td>
                    <td>
                      <div className="table-actions">
                        <IconButton
                          name="edit"
                          label={`Edit ${r.name}`}
                          onClick={() => {
                            setEdit(r.id)
                            setPreview(r.logo)
                            setModal("edit")
                          }}
                        />
                        <IconButton
                          name="trash"
                          label={`Delete ${r.name}`}
                          onClick={() => {
                            setEdit(r.id)
                            setModal("delete")
                          }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!filtered.length && (
              <Empty
                title={`No ${kind} found`}
                text="Try a different search or add a new record."
              />
            )}
          </div>
        )}
      </section>
      {modal && (
        <Modal
          title={
            modal === "delete"
              ? `Delete ${entity}?`
              : modal === "detail"
                ? record?.name || ""
                : `${edit ? "Edit" : "Add"} ${entity}`
          }
          onClose={() => setModal("")}
        >
          {modal === "delete" ? (
            <>
              <p>
                Remove <strong>{record?.name}</strong> from this demo workspace?
                Products will not be deleted.
              </p>
              <div className="modal-actions">
                <Button variant="secondary" onClick={() => setModal("")}>
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    setRecords(records.filter((r) => r.id !== edit))
                    setModal("")
                    toast(`${entity} removed.`)
                  }}
                >
                  Delete {entity}
                </Button>
              </div>
            </>
          ) : modal === "detail" ? (
            <>
              <p>{record?.description}</p>
              <div className="summary-row">
                <span>Parent</span>
                <strong>{record?.parent || "Top-level"}</strong>
              </div>
              <div className="summary-row">
                <span>Products</span>
                <strong>
                  {
                    products.filter((p) =>
                      category
                        ? p.category === record?.name
                        : p.brand === record?.name,
                    ).length
                  }
                </strong>
              </div>
              <Button
                onClick={() => {
                  setPreview(record?.logo || "")
                  setModal("edit")
                }}
              >
                Edit {entity}
              </Button>
            </>
          ) : (
            <form
              className="dialog-form"
              onSubmit={(e) => {
                e.preventDefault()
                const f = new FormData(e.currentTarget)
                const data = {
                  id: edit || Date.now(),
                  name: String(f.get("name")),
                  parent: String(f.get("parent") || ""),
                  description: String(f.get("description")),
                  logo: preview,
                }
                setRecords(
                  edit
                    ? records.map((r) => (r.id === edit ? data : r))
                    : [...records, data],
                )
                setModal("")
                toast(`${entity} saved for this session.`)
              }}
            >
              <Input
                name="name"
                label={`${category ? "Category" : "Brand"} name`}
                defaultValue={record?.name}
                required
              />
              {category && (
                <Select
                  label="Parent category"
                  name="parent"
                  defaultValue={record?.parent || ""}
                >
                  <option value="">None (top-level)</option>
                  {records
                    .filter((r) => r.id !== edit && !r.parent)
                    .map((r) => (
                      <option key={r.id}>{r.name}</option>
                    ))}
                </Select>
              )}
              <label className="field">
                <span>Description</span>
                <textarea
                  name="description"
                  rows={4}
                  defaultValue={record?.description}
                />
              </label>
              {!category && (
                <label className="upload-zone compact">
                  {preview ? (
                    <img src={preview} alt="Brand logo preview" />
                  ) : (
                    <>
                      <Icon name="upload" size={23} />
                      <strong>Upload brand logo</strong>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      if (f) setPreview(URL.createObjectURL(f))
                    }}
                  />
                </label>
              )}
              <Button type="submit">Save {entity}</Button>
            </form>
          )}
        </Modal>
      )}
    </>
  )
}
function Inventory() {
  const { products, setProducts, toast } = useApp()
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState("All stock")
  const [selected, setSelected] = useState<Product | null>(null)
  const [amount, setAmount] = useState("1")
  const [operation, setOperation] = useState("Add stock")
  const [history, setHistory] = useState([
    {
      product: "Astrox 100 ZZ",
      action: "Restocked",
      quantity: "+20",
      date: "Jun 18, 2025 · 09:42",
      note: "New supplier shipment",
    },
    {
      product: "Thruster Ryuga II",
      action: "Order fulfilled",
      quantity: "-2",
      date: "Jun 18, 2025 · 08:15",
      note: "Order #SH-10241",
    },
  ])
  const [tab, setTab] = useState("Stock overview")
  const filtered = products.filter(
    (p) =>
      `${p.name} SH-${p.id}0-G5`.toLowerCase().includes(query.toLowerCase()) &&
      (filter === "All stock" ||
        (filter === "In stock" && p.stock > 0) ||
        (filter === "Low stock" && p.stock > 0 && p.stock < 10) ||
        (filter === "Out of stock" && p.stock === 0)),
  )
  return (
    <>
      <AdminPageTitle
        title="Inventory"
        description="Keep your gear ready. Keep your players moving."
      />
      <div className="metric-grid inventory-metrics">
        {[
          [
            "Total stock",
            String(products.reduce((n, p) => n + p.stock, 0)),
            "Across all products",
          ],
          [
            "In-stock products",
            String(products.filter((p) => p.stock > 0).length),
            "Ready to play",
          ],
          [
            "Low-stock alerts",
            String(products.filter((p) => p.stock > 0 && p.stock < 10).length),
            "Time to restock",
          ],
          [
            "Out of stock",
            String(products.filter((p) => !p.stock).length),
            "Needs your attention",
          ],
        ].map(([t, n, d], i) => (
          <div className="metric-card" key={t}>
            <span>{t}</span>
            <strong className={i > 1 ? "orange-text" : ""}>{n}</strong>
            <small>{d}</small>
          </div>
        ))}
      </div>
      <div className="admin-tabs">
        {["Stock overview", "Movement history"].map((t) => (
          <Button
            variant="ghost"
            key={t}
            className={tab === t ? "active" : ""}
            onClick={() => setTab(t)}
          >
            {t}
          </Button>
        ))}
      </div>
      <section className="admin-panel">
        {tab === "Stock overview" ? (
          <>
            <div className="table-toolbar">
              <SearchBox
                placeholder="Search product or SKU..."
                value={query}
                onChange={setQuery}
              />
              <Select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                aria-label="Stock filter"
              >
                {["All stock", "In stock", "Low stock", "Out of stock"].map(
                  (v) => (
                    <option key={v}>{v}</option>
                  ),
                )}
              </Select>
            </div>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Product / Variant</th>
                    <th>SKU</th>
                    <th>Available</th>
                    <th>Stock status</th>
                    <th>Inventory value</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <div className="table-product">
                          <div className="table-product-art">
                            <ProductArt product={p} />
                          </div>
                          <span>
                            <strong>{p.name}</strong>
                            <small className="table-sub">
                              Original ·{" "}
                              {p.category === "Rackets"
                                ? "4U / G5"
                                : "Standard"}
                            </small>
                          </span>
                        </div>
                      </td>
                      <td className="mono">SH-{p.id}0-G5</td>
                      <td>
                        <strong>{p.stock}</strong> units
                      </td>
                      <td>
                        <Badge
                          tone={
                            !p.stock ? "red" : p.stock < 10 ? "amber" : "green"
                          }
                        >
                          {!p.stock
                            ? "Out of stock"
                            : p.stock < 10
                              ? "Low stock"
                              : "In stock"}
                        </Badge>
                      </td>
                      <td>{money(p.stock * p.price)}</td>
                      <td>
                        <Button
                          variant="secondary"
                          onClick={() => {
                            setSelected(p)
                            setAmount("1")
                          }}
                        >
                          Adjust stock
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!filtered.length && (
                <Empty
                  icon="box"
                  title="No matching inventory"
                  text="Try another SKU, product, or stock filter."
                />
              )}
            </div>
          </>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Movement</th>
                  <th>Quantity</th>
                  <th>Note</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h, i) => (
                  <tr key={i}>
                    <td>
                      <strong>{h.product}</strong>
                    </td>
                    <td>{h.action}</td>
                    <td
                      className={
                        h.quantity.startsWith("+")
                          ? "green-text"
                          : "orange-text"
                      }
                    >
                      {h.quantity}
                    </td>
                    <td>{h.note}</td>
                    <td>{h.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      {selected && (
        <Modal title="Adjust stock" onClose={() => setSelected(null)}>
          <div className="stock-adjust-product">
            <ProductArt product={selected} />
            <span>
              <strong>{selected.name}</strong>
              <small>
                SH-{selected.id}0-G5 · Current stock: {selected.stock}
              </small>
            </span>
          </div>
          <form
            className="dialog-form"
            onSubmit={(e) => {
              e.preventDefault()
              const f = new FormData(e.currentTarget)
              const delta =
                operation === "Add stock"
                  ? +amount
                  : operation === "Remove stock"
                    ? -+amount
                    : +amount - selected.stock
              if (selected.stock + delta < 0) {
                toast("You can’t remove more stock than is available.")
                return
              }
              setProducts(
                products.map((p) =>
                  p.id === selected.id
                    ? {
                        ...p,
                        stock: p.stock + delta,
                        status:
                          p.stock + delta === 0 ? "OUT_OF_STOCK" : "ACTIVE",
                      }
                    : p,
                ),
              )
              setHistory([
                {
                  product: selected.name,
                  action: operation,
                  quantity: `${delta >= 0 ? "+" : ""}${delta}`,
                  date: "Just now",
                  note: String(f.get("note")),
                },
                ...history,
              ])
              setSelected(null)
              toast("Stock adjusted. Movement recorded for this session.")
            }}
          >
            <Select
              label="Adjustment type"
              value={operation}
              onChange={(e) => setOperation(e.target.value)}
            >
              <option>Add stock</option>
              <option>Remove stock</option>
              <option>Set stock level</option>
            </Select>
            <Input
              label="Quantity"
              type="number"
              min="0"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <Input
              name="note"
              label="Reason / note"
              placeholder="e.g. New shipment received"
              required
            />
            <Button type="submit">Confirm adjustment</Button>
          </form>
        </Modal>
      )}
    </>
  )
}
function AdminOrders() {
  const { orders, setOrders, route, navigate, products, toast } = useApp()
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState("All statuses")
  const [date, setDate] = useState("All dates")
  const [cancel, setCancel] = useState(false)
  const [page, setPage] = useState(1)
  const id = route.split("/")[3]
  const order = orders.find((o) => o.id === id)
  const filtered = orders.filter(
    (o) =>
      `${o.id} ${o.customer} ${o.email}`
        .toLowerCase()
        .includes(search.toLowerCase()) &&
      (filter === "All statuses" || o.status === filter) &&
      (date === "All dates" ||
        (date === "Jun 18, 2025" && o.date === date) ||
        (date === "Jun 17, 2025" && o.date === date)),
  )
  if (order)
    return (
      <>
        <AdminPageTitle
          title={`Order #${order.id}`}
          description={`Placed ${order.date} · ${order.items} items · ${order.payment}`}
        >
          <Button variant="secondary" onClick={() => navigate("/admin/orders")}>
            All orders
          </Button>
          {!["CANCELLED", "DELIVERED", "REFUNDED"].includes(order.status) && (
            <Button variant="secondary" onClick={() => setCancel(true)}>
              Cancel order
            </Button>
          )}
        </AdminPageTitle>
        <div className="order-detail-layout">
          <div>
            <section className="admin-panel">
              <div className="panel-head">
                <Heading level={3}>Order progress</Heading>
                <Status value={order.status} />
              </div>
              <OrderTimeline status={order.status} />
              <div className="order-status-update">
                <Select
                  label="Update order status"
                  value={order.status}
                  onChange={(e) => {
                    setOrders(
                      orders.map((o) =>
                        o.id === id ? { ...o, status: e.target.value } : o,
                      ),
                    )
                    toast("Order status updated.")
                  }}
                >
                  {statuses.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </Select>
              </div>
            </section>
            <section className="admin-panel">
              <div className="panel-head">
                <Heading level={3}>Order items</Heading>
                <Badge>{order.items} items</Badge>
              </div>
              <div className="order-line">
                <ProductArt product={products[0]} />
                <span>
                  <strong>{products[0].name}</strong>
                  <small>Original · 4U / G5 · SKU SH-10-G5</small>
                  <small>Quantity: {order.items}</small>
                </span>
                <strong>{money(order.total)}</strong>
              </div>
              <div className="order-totals">
                <div className="summary-row">
                  <span>Subtotal</span>
                  <strong>{money(order.total)}</strong>
                </div>
                <div className="summary-row">
                  <span>Standard shipping</span>
                  <strong>Free</strong>
                </div>
                <div className="summary-total">
                  <span>Total paid</span>
                  <strong>{money(order.total)}</strong>
                </div>
              </div>
            </section>
            <section className="admin-panel">
              <div className="panel-head">
                <Heading level={3}>Payment transaction</Heading>
                <Badge>{order.payment}</Badge>
              </div>
              <div className="transaction-grid">
                <span>
                  Transaction reference
                  <strong>
                    {order.payment === "VNPAY"
                      ? `VNP-${order.id}-180625`
                      : "Awaiting collection"}
                  </strong>
                </span>
                <span>
                  Payment status
                  <strong>
                    {order.status === "PENDING_PAYMENT"
                      ? "PENDING"
                      : order.payment === "COD" && order.status !== "DELIVERED"
                        ? "COLLECT ON DELIVERY"
                        : "COMPLETED"}
                  </strong>
                </span>
                <span>
                  Amount<strong>{money(order.total)}</strong>
                </span>
                <span>
                  Provider
                  <strong>
                    {order.payment === "VNPAY"
                      ? "VNPAY payment gateway"
                      : "Cash on delivery"}
                  </strong>
                </span>
              </div>
              <div className="inline-note">
                <Icon name="shield" size={16} />
                Sample transaction data. Payment provider not connected.
              </div>
            </section>
          </div>
          <aside>
            <section className="admin-panel editor-side">
              <Heading level={3}>Customer</Heading>
              <span className="person-avatar large">
                {order.customer
                  .split(" ")
                  .map((s) => s[0])
                  .join("")}
              </span>
              <strong>{order.customer}</strong>
              <span>{order.email}</span>
              <span>+84 912 345 678</span>
              <Button
                variant="ghost"
                className="text-link"
                onClick={() => navigate("/admin/customers")}
              >
                View customer
                <Icon name="arrow" size={15} />
              </Button>
            </section>
            <section className="admin-panel editor-side">
              <Heading level={3}>Shipping information</Heading>
              <Badge tone="blue">STANDARD</Badge>
              <p>
                {order.customer}
                <br />
                72 Nguyen Hue, Ben Nghe
                <br />
                District 1, Ho Chi Minh City
                <br />
                Vietnam
              </p>
              <strong>Tracking code</strong>
              <span>
                {["SHIPPING", "DELIVERED"].includes(order.status)
                  ? `GHN-${order.id}-VN`
                  : "Not yet assigned"}
              </span>
              <small>Delivery estimate: 3–5 business days</small>
            </section>
          </aside>
        </div>
        {cancel && (
          <Modal title="Cancel this order?" onClose={() => setCancel(false)}>
            <p>
              Order #{order.id} will be marked CANCELLED. No real payment will
              be refunded in this demo.
            </p>
            <div className="modal-actions">
              <Button variant="secondary" onClick={() => setCancel(false)}>
                Keep order
              </Button>
              <Button
                onClick={() => {
                  setOrders(
                    orders.map((o) =>
                      o.id === id ? { ...o, status: "CANCELLED" } : o,
                    ),
                  )
                  setCancel(false)
                  toast("Order cancelled.")
                }}
              >
                Confirm cancellation
              </Button>
            </div>
          </Modal>
        )}
      </>
    )
  return (
    <>
      <AdminPageTitle
        title="Orders"
        description="Every order is someone’s next great game."
      >
        <Button
          variant="secondary"
          onClick={() =>
            downloadCSV(
              "smashhub-orders.csv",
              [
                "Order,Customer,Total,Status,Payment",
                ...filtered.map(
                  (o) =>
                    `${o.id},${o.customer},${o.total},${o.status},${o.payment}`,
                ),
              ].join("\n"),
            )
          }
        >
          <Icon name="upload" size={16} />
          Export orders
        </Button>
      </AdminPageTitle>
      <div className="order-summary-chips">
        {[
          ["All orders", orders.length],
          [
            "To process",
            orders.filter((o) => ["PAID", "PROCESSING"].includes(o.status))
              .length,
          ],
          ["In transit", orders.filter((o) => o.status === "SHIPPING").length],
          ["Delivered", orders.filter((o) => o.status === "DELIVERED").length],
        ].map(([t, n]) => (
          <div key={t}>
            <span>{t}</span>
            <strong>{n}</strong>
          </div>
        ))}
      </div>
      <section className="admin-panel">
        <div className="table-toolbar">
          <SearchBox
            placeholder="Search order code or customer..."
            value={search}
            onChange={(v) => {
              setSearch(v)
              setPage(1)
            }}
          />
          <Select
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value)
              setPage(1)
            }}
            aria-label="Order status"
          >
            <option>All statuses</option>
            {statuses.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </Select>
          <Select
            aria-label="Order date"
            value={date}
            onChange={(e) => {
              setDate(e.target.value)
              setPage(1)
            }}
          >
            <option>All dates</option>
            <option>Jun 18, 2025</option>
            <option>Jun 17, 2025</option>
          </Select>
        </div>
        <OrderTable
          orders={filtered.slice((page - 1) * 5, page * 5)}
          onView={(id) => navigate(`/admin/orders/${id}`)}
        />
        <Pagination
          page={page}
          total={Math.max(1, Math.ceil(filtered.length / 5))}
          onChange={setPage}
        />
      </section>
    </>
  )
}
function Customers() {
  const { orders, toast } = useApp()
  const [customers, setCustomers] = useState(
    orders.map((o, i) => ({
      id: i + 1,
      name: o.customer,
      email: o.email,
      status: "ACTIVE",
      role: i === 0 ? "ADMIN" : "CUSTOMER",
      joined: "May 12, 2025",
    })),
  )
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState("All customers")
  const [selected, setSelected] = useState(0)
  const c = customers.find((c) => c.id === selected)
  const filtered = customers.filter(
    (c) =>
      `${c.name} ${c.email}`.toLowerCase().includes(search.toLowerCase()) &&
      (filter === "All customers" || c.status === filter),
  )
  return (
    <>
      <AdminPageTitle
        title="Customers"
        description="The players at the heart of your store."
      />
      <div className="metric-grid customer-metrics">
        {[
          ["Total customers", "1,284"],
          ["Active players", "1,198"],
          ["New this month", "96"],
        ].map(([t, n]) => (
          <div className="metric-card" key={t}>
            <span>{t}</span>
            <strong>{n}</strong>
            <small>Sample store analytics</small>
          </div>
        ))}
      </div>
      <section className="admin-panel">
        <div className="table-toolbar">
          <SearchBox
            placeholder="Search name or email..."
            value={search}
            onChange={setSearch}
          />
          <Select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            aria-label="Customer status"
          >
            <option>All customers</option>
            <option>ACTIVE</option>
            <option>INACTIVE</option>
            <option>LOCKED</option>
          </Select>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Customer</th>
                <th>Role</th>
                <th>Status</th>
                <th>Orders</th>
                <th>Total spent</th>
                <th>Joined</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id}>
                  <td>
                    <div className="table-person">
                      <span className="person-avatar">
                        {c.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </span>
                      <span>
                        <strong>{c.name}</strong>
                        <small>{c.email}</small>
                      </span>
                    </div>
                  </td>
                  <td>
                    <Badge>{c.role}</Badge>
                  </td>
                  <td>
                    <Status value={c.status} />
                  </td>
                  <td>{orders.filter((o) => o.email === c.email).length}</td>
                  <td>
                    <strong>
                      {money(
                        orders
                          .filter((o) => o.email === c.email)
                          .reduce((n, o) => n + o.total, 0),
                      )}
                    </strong>
                  </td>
                  <td>{c.joined}</td>
                  <td>
                    <Button variant="ghost" onClick={() => setSelected(c.id)}>
                      View
                      <Icon name="chevron" size={14} />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!filtered.length && (
            <Empty
              icon="users"
              title="No customers found"
              text="Try another name, email, or account status."
            />
          )}
        </div>
      </section>
      {c && (
        <Modal wide title={c.name} onClose={() => setSelected(0)}>
          <div className="customer-detail">
            <span className="person-avatar large">
              {c.name
                .split(" ")
                .map((n) => n[0])
                .join("")}
            </span>
            <span>
              <strong>{c.name}</strong>
              <small>{c.email}</small>
              <small>Joined {c.joined}</small>
            </span>
            <Status value={c.status} />
          </div>
          <div className="form-grid">
            <Select
              label="Account status"
              value={c.status}
              onChange={(e) => {
                setCustomers(
                  customers.map((v) =>
                    v.id === c.id ? { ...v, status: e.target.value } : v,
                  ),
                )
                toast("Customer status updated.")
              }}
            >
              {["ACTIVE", "INACTIVE", "LOCKED"].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </Select>
            <Select
              label="Customer role"
              value={c.role}
              onChange={(e) => {
                setCustomers(
                  customers.map((v) =>
                    v.id === c.id ? { ...v, role: e.target.value } : v,
                  ),
                )
                toast("Demo customer role updated.")
              }}
            >
              {["ADMIN", "STAFF", "CUSTOMER"].map((r) => (
                <option key={r}>{r}</option>
              ))}
            </Select>
          </div>
          <Heading level={3}>Order history</Heading>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {orders
                  .filter((o) => o.email === c.email)
                  .map((o) => (
                    <tr key={o.id}>
                      <td>#{o.id}</td>
                      <td>{o.date}</td>
                      <td>
                        <Status value={o.status} />
                      </td>
                      <td>{money(o.total)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </Modal>
      )}
    </>
  )
}
function AdminSettings({ profile }: { profile: boolean }) {
  const { toast } = useApp()
  const [tab, setTab] = useState(profile ? "Profile" : "Store details")
  const [error, setError] = useState("")
  return (
    <>
      <AdminPageTitle
        title={profile ? "My profile" : "Settings"}
        description="Make this workspace work for you."
      />
      <div className="admin-tabs">
        {(profile
          ? ["Profile", "Password", "Notifications"]
          : ["Store details", "Notifications", "Account"]
        ).map((t) => (
          <Button
            variant="ghost"
            key={t}
            className={tab === t ? "active" : ""}
            onClick={() => setTab(t)}
          >
            {t}
          </Button>
        ))}
      </div>
      <section className="admin-panel settings-panel">
        <form
          className="profile-form"
          onSubmit={(e) => {
            e.preventDefault()
            const f = new FormData(e.currentTarget)
            if (tab === "Password" && f.get("new") !== f.get("confirm")) {
              setError("Passwords don’t match.")
              return
            }
            setError("")
            toast("Demo settings saved for this session.")
          }}
        >
          <Heading level={3}>{tab}</Heading>
          {tab === "Notifications" ? (
            <>
              {[
                ["New orders", "Get notified when a player places an order."],
                ["Inventory alerts", "Know when products are running low."],
                ["Customer updates", "New registrations and account activity."],
                ["Weekly reports", "Your store performance in one email."],
              ].map(([t, d], i) => (
                <label className="preference" key={t}>
                  <span>
                    <strong>{t}</strong>
                    <small>{d}</small>
                  </span>
                  <input type="checkbox" defaultChecked={i < 3} />
                </label>
              ))}
            </>
          ) : tab === "Password" ? (
            <>
              <Input
                type="password"
                label="Current password"
                minLength={8}
                required
              />
              <Input
                name="new"
                type="password"
                label="New password"
                minLength={8}
                required
              />
              <Input
                name="confirm"
                type="password"
                label="Confirm new password"
                minLength={8}
                required
              />
            </>
          ) : tab === "Store details" ? (
            <>
              <Input label="Store name" defaultValue="SmashHub" required />
              <Input
                label="Support email"
                defaultValue="support@smashhub.com"
                type="email"
                required
              />
              <Input label="Phone number" defaultValue="+84 (28) 3822 6688" />
              <Input
                label="Business address"
                defaultValue="72 Nguyen Hue, District 1, Ho Chi Minh City"
              />
              <div className="form-grid">
                <Select label="Currency">
                  <option>USD — US Dollar</option>
                  <option>VND — Vietnamese Dong</option>
                </Select>
                <Select label="Timezone">
                  <option>Asia/Ho_Chi_Minh (GMT+7)</option>
                  <option>UTC (GMT+0)</option>
                </Select>
              </div>
            </>
          ) : (
            <>
              <div className="customer-detail">
                <span className="admin-avatar large">AM</span>
                <span>
                  <strong>Alex Morgan</strong>
                  <small>Store administrator · ADMIN</small>
                </span>
              </div>
              <Input label="Full name" defaultValue="Alex Morgan" required />
              <Input
                label="Email address"
                type="email"
                defaultValue="alex@smashhub.com"
                required
              />
              <Input label="Phone number" defaultValue="+84 912 345 678" />
            </>
          )}
          {error && <p className="error-text">{error}</p>}
          <Button type="submit">
            Save changes
            <Icon name="check" size={16} />
          </Button>
          <small className="mock-note">
            Preferences are UI demonstrations; server settings are not
            connected.
          </small>
        </form>
      </section>
    </>
  )
}
function downloadCSV(filename: string, csv: string) {
  const url = URL.createObjectURL(
    new Blob([csv], { type: "text/csv;charset=utf-8;" }),
  )
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
