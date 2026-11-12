import { useEffect, useState } from "react"
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
import { brands, categories, money, ProductArt, type Product } from "./data"
import { useApp } from "./context"
import { errorMessage, useBackend } from "./api/Backend"

export const categoryNamesVi: Record<string, string> = {
  Rackets: "Vợt cầu lông",
  Shoes: "Giày cầu lông",
  Shuttlecocks: "Quả cầu lông",
  Apparel: "Trang phục",
  Accessories: "Phụ kiện",
  "All products": "Tất cả sản phẩm",
  Brands: "Thương hiệu",
}

export function StoreHeader() {
  const { navigate, cart, wishlist, user } = useApp()
  const [query, setQuery] = useState("")
  const [mobile, setMobile] = useState(false)
  useEffect(() => {
    const focusSearch = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        document
          .querySelector<HTMLInputElement>(".header-search input")
          ?.focus()
      }
    }
    document.addEventListener("keydown", focusSearch)
    return () => document.removeEventListener("keydown", focusSearch)
  }, [])
  return (
    <>
      <div className="announcement">
        <span>TRANG BỊ ĐỈNH CAO. BỨT PHÁ PHONG ĐỘ.</span>
        <span>
          Miễn phí giao hàng toàn quốc{" "}
          <span className="announcement-divider">|</span>{" "}
          <strong>Cam kết 100% chính hãng.</strong>{" "}
          <Icon name="arrow" size={13} />
        </span>
        <Button variant="ghost" onClick={() => navigate("/admin")}>
          Quản trị Admin <Icon name="arrow" size={12} />
        </Button>
      </div>
      <header className="store-header">
        <div className="container header-inner">
          <IconButton
            name="menu"
            label="Mở menu"
            className="mobile-menu"
            onClick={() => setMobile(!mobile)}
          />
          <Logo onClick={() => navigate("/")} />
          <form
            className="header-search"
            onSubmit={(e) => {
              e.preventDefault()
              navigate(`/shop?search=${encodeURIComponent(query)}`)
            }}
          >
            <Icon name="search" size={19} />
            <Input
              aria-label="Tìm kiếm sản phẩm"
              placeholder="Tìm kiếm vợt, giày, phụ kiện cầu lông..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <kbd>⌘ K</kbd>
          </form>
          <div className="header-actions">
            <Button
              variant="ghost"
              className="account-link"
              onClick={() => navigate(user ? "/account" : "/auth/login")}
            >
              <Icon name="user" />
              <span>
                <small>{user ? "Xin chào," : "Chào bạn,"}</small>
                {user || "Đăng nhập / Đăng ký"}
              </span>
            </Button>
            <span className="header-separator" />
            <IconButton
              name="heart"
              label="Yêu thích"
              onClick={() => navigate("/account/wishlist")}
            >
              {wishlist.length > 0 && (
                <i className="count">{wishlist.length}</i>
              )}
            </IconButton>
            <IconButton
              name="bag"
              label="Giỏ hàng"
              onClick={() => navigate("/cart")}
            >
              <i className="count">
                {cart.reduce((n, c) => n + c.quantity, 0)}
              </i>
            </IconButton>
          </div>
        </div>
      </header>
      <nav className={`store-nav ${mobile ? "mobile-open" : ""}`}>
        <div className="container nav-inner">
          <div className="nav-links">
            {["All products", ...categories, "Brands"].map((c) => (
              <Button
                key={c}
                variant="ghost"
                onClick={() => {
                  navigate(
                    c === "Brands"
                      ? "/brands"
                      : `/shop${c === "All products" ? "" : "/" + c}`,
                  )
                  setMobile(false)
                }}
              >
                {categoryNamesVi[c] || c}
                {c === "All products" && <Icon name="down" size={13} />}
              </Button>
            ))}
            <Button
              variant="ghost"
              className="sale-link"
              onClick={() => navigate("/shop?sale=1")}
            >
              Khuyến mãi <span className="sale-dot" />
            </Button>
          </div>
          <div className="nav-right">
            <Icon name="shield" size={15} /> 100% chính hãng. Bảo hành uy tín.
          </div>
        </div>
      </nav>
    </>
  )
}

export function ProductCard({ product }: { product: Product }) {
  const { navigate, wishlist, toggleWishlist, addToCart } = useApp()
  const backend = useBackend()
  return (
    <article className="product-card">
      <div className="product-image">
        <Button
          variant="ghost"
          className="product-image-link"
          onClick={() => navigate(`/product/${product.id}`)}
          aria-label={`View ${product.name}`}
        >
          {product.images?.[0] ? (
            <img
              className="uploaded-product-image"
              src={product.images[0]}
              alt={product.name}
            />
          ) : (
            <ProductArt product={product} />
          )}
        </Button>
        {product.badge && (
          <Badge
            tone={
              product.badge === "NEW"
                ? "orange"
                : product.badge.includes("%")
                  ? "sale"
                  : "ink"
            }
          >
            {product.badge}
          </Badge>
        )}
        <IconButton
          name="heart"
          label={
            wishlist.includes(product.id)
              ? "Xóa khỏi danh sách yêu thích"
              : "Thêm vào danh sách yêu thích"
          }
          onClick={() => toggleWishlist(product.id)}
          aria-pressed={wishlist.includes(product.id)}
        />
        <Button
          className="quick-add"
          variant="dark"
          disabled={
            backend.cartBusy ||
            (backend.mode === "api"
              ? Boolean(product.variants?.length) && !product.stock
              : !product.stock)
          }
          onClick={() =>
            backend.mode === "api" && product.variants?.length !== 1
              ? navigate(`/product/${product.id}`)
              : addToCart(
                  product,
                  1,
                  product.variants?.[0]?.name,
                  product.variants?.[0]?.colorName,
                )
          }
        >
          <Icon name="plus" size={15} />
          {backend.mode === "api" && !product.variants?.length
            ? "Chọn biến thể"
            : product.stock
              ? "Thêm nhanh"
              : "Hết hàng"}
        </Button>
      </div>
      <div className="product-meta">
        <span>{product.brand.toUpperCase()}</span>
        <span className="rating">
          <Icon name="star" size={11} />
          {product.rating} <small>({product.reviews})</small>
        </span>
      </div>
      <Button
        variant="ghost"
        className="product-name"
        onClick={() => navigate(`/product/${product.id}`)}
      >
        {product.name}
      </Button>
      <div className="product-bottom">
        <span>
          <strong>{money(product.price)}</strong>
          {product.oldPrice && <del>{money(product.oldPrice)}</del>}
        </span>
        <div className="color-dots">
          <i style={{ background: product.color }} />
          <i />
          <i />
        </div>
      </div>
    </article>
  )
}

export function Home() {
  const { products: allProducts, navigate, toast } = useApp()
  const products = allProducts.filter((p) => p.status === "ACTIVE")
  const [tab, setTab] = useState("All")
  const backend = useBackend()
  const categoryNames =
    backend.mode === "api"
      ? backend.categories.map((category) => String(category.name || ""))
      : categories
  const brandNames =
    backend.mode === "api"
      ? backend.brands.map((brand) => String(brand.name || ""))
      : brands
  const [slide, setSlide] = useState(0)
  const slides = [
    {
      lines: ["TRẬN ĐẤU CỦA BẠN.", "TRANG BỊ CỦA BẠN.", "BẢN LĨNH CỦA BẠN."],
      image: "/images/court-player.jpg",
      action: "Khám phá ngay",
      route: "/shop",
    },
    {
      lines: ["BỨT PHÁ TỐC ĐỘ.", "LỐI CHƠI THÔNG MINH.", "LÀM CHỦ SÂN ĐẤU."],
      image: "/images/badminton-detail.jpg",
      action: "Tìm cây vợt phù hợp",
      route: "/shop/Rackets",
    },
    {
      lines: ["TRANG BỊ MỚI.", "MỤC TIÊU MỚI.", "SẴN SÀNG TRANH TÀI."],
      image: "/images/court-player.jpg",
      action: "Sản phẩm mới về",
      route: "/shop?new=1",
    },
  ]
  return (
    <>
      <section className="hero">
        <img
          className="hero-photo"
          src={slides[slide].image}
          alt="Badminton player preparing for the next point on an indoor court"
        />
        <div className="hero-overlay" />
        <div className="container hero-content">
          <div className="hero-kicker">
            <span /> DÀNH RIÊNG CHO BỘ MÔN CẦU LÔNG. THIẾT KẾ CHO BẠN.
          </div>
          <Heading level={1}>
            {slides[slide].lines[0]}
            <br />
            {slides[slide].lines[1]}
            <br />
            <span>{slides[slide].lines[2]}</span>
          </Heading>
          <p>
            Từ pha cầu đầu tiên đến điểm số quyết định.
            <br />
            Tìm kiếm trang bị giúp bạn làm chủ mọi trận đấu.
          </p>
          <div className="hero-buttons">
            <Button onClick={() => navigate(slides[slide].route)}>
              {slides[slide].action} <Icon name="arrow" size={18} />
            </Button>
            <Button
              variant="ghost"
              className="hero-secondary"
              onClick={() => navigate("/shop?new=1")}
            >
              Xem hàng mới về <Icon name="arrow" size={17} />
            </Button>
          </div>
          <div className="hero-proof">
            <div className="avatar-stack">
              <img src="/images/player-1.jpg" alt="" />
              <img src="/images/player-2.jpg" alt="" />
              <img src="/images/player-3.jpg" alt="" />
              <span>+2k</span>
            </div>
            <div>
              <div className="proof-stars">★★★★★</div>
              <span>Được tin chọn bởi hơn 2.000+ lông thủ toàn quốc.</span>
            </div>
          </div>
        </div>
        <div className="hero-caption">
          <span className="tiny-rule" /> SÂN ĐẤU LÀ CỦA BẠN.
        </div>
        <div className="hero-pagination">
          {[0, 1, 2].map((i) => (
            <Button
              key={i}
              variant="ghost"
              className={slide === i ? "active" : ""}
              aria-label={`Show promotion ${i + 1}`}
              aria-pressed={slide === i}
              onClick={() => setSlide(i)}
            />
          ))}
          <small>0{slide + 1} / 03</small>
        </div>
        <div className="hero-watermark">SMASHHUB</div>
      </section>
      <section className="benefit-strip">
        <div className="container benefits">
          {[
            ["truck", "Giao hàng nhanh chóng", "Hỗ trợ ship toàn quốc"],
            [
              "shield",
              "100% chính hãng",
              "Cam kết hàng chính hãng có bảo hành",
            ],
            [
              "return",
              "Đổi trả trong 30 ngày",
              "Chưa ưng ý? Đổi trả dễ dàng",
            ],
            [
              "headset",
              "Tư vấn chuyên nghiệp",
              "Hỗ trợ tận tình từ người chơi thực thụ",
            ],
          ].map(([i, t, d]) => (
            <div className="benefit" key={t}>
              <Icon name={i} size={25} />
              <div>
                <strong>{t}</strong>
                <span>{d}</span>
              </div>
            </div>
          ))}
        </div>
      </section>
      <section className="section container category-section">
        <SectionTitle
          eyebrow="DANH MỤC NỔI BẬT"
          title="Trang bị đỉnh cao cho mọi phong cách."
          link="Xem tất cả danh mục"
          onClick={() => navigate("/shop")}
        />
        <div className="category-grid">
          {categoryNames.map((c, i) => (
            <Button
              key={c}
              variant="ghost"
              className={`category-card category-${i}`}
              onClick={() => navigate(`/shop/${c}`)}
            >
              <div className="category-art">
                <ProductArt
                  product={{
                    id: 100 + i,
                    category: c,
                    color: [
                      "#153139",
                      "#eeeae1",
                      "#215239",
                      "#e5e4da",
                      "#1d303a",
                    ][i % 5],
                  }}
                />
              </div>
              <div className="category-card-bottom">
                <span>
                  <strong>{categoryNamesVi[c] || c}</strong>
                  <small>
                    {backend.mode === "api"
                      ? "Khám phá"
                      : `${[48, 32, 24, 56, 64][i]} sản phẩm`}
                  </small>
                </span>
                <span className="round-arrow">
                  <Icon name="arrow" size={16} />
                </span>
              </div>
            </Button>
          ))}
        </div>
      </section>
      <section className="section container best-section">
        <SectionTitle
          eyebrow="SẢN PHẨM BÁN CHẠY"
          title="Được thử nghiệm trên sân. Được người chơi tin chọn."
          link="Xem tất cả sản phẩm"
          onClick={() => navigate("/shop")}
        />
        <div className="product-tabs">
          {[
            ["All", "Tất cả"],
            ["Rackets", "Vợt cầu lông"],
            ["Shoes", "Giày cầu lông"],
            ["Shuttlecocks", "Quả cầu lông"],
            ["Apparel", "Trang phục"],
          ].map(([k, label]) => (
            <Button
              variant={tab === k ? "dark" : "ghost"}
              key={k}
              onClick={() => setTab(k)}
            >
              {label}
            </Button>
          ))}
          <span>Mọi tay vợt xuất sắc đều bắt đầu từ trang bị tốt.</span>
        </div>
        <div className="product-grid">
          {products
            .filter((p) => tab === "All" || p.category === tab)
            .slice(0, 4)
            .map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
        </div>
      </section>
      <section className="container editorial-pair">
        <div className="editorial-card orange-editorial">
          <span className="eyebrow">THẾ HỆ SỨC MẠNH MỚI</span>
          <Heading>
            Cho từng cú
            <br />
            smash uy lực.
          </Heading>
          <p>Những cây vợt được thiết kế để thay đổi hoàn toàn cục diện trận đấu.</p>
          <Button variant="dark" onClick={() => navigate("/shop/Rackets")}>
            Tìm kiếm cây vợt của bạn <Icon name="arrow" size={17} />
          </Button>
          <ProductArt
            product={{ id: 200, category: "Rackets", color: "#253a3c" }}
          />
        </div>
        <div className="editorial-card dark-editorial">
          <span className="eyebrow">BƯỚC CHÂN NHANH NHẸN. TỰ TIN BỨT PHÁ.</span>
          <Heading>
            Làm chủ từng
            <br />
            khoảng sân.
          </Heading>
          <p>Vững chãi. Tốc độ. Không chút thỏa hiệp.</p>
          <Button variant="secondary" onClick={() => navigate("/shop/Shoes")}>
            Xem giày cầu lông <Icon name="arrow" size={17} />
          </Button>
          <ProductArt
            product={{ id: 201, category: "Shoes", color: "#e6e4d9" }}
          />
        </div>
      </section>
      <section className="section container brands-section">
        <div className="eyebrow">NHỮNG THƯƠNG HIỆU HÀNG ĐẦU ĐỒNG HÀNH CÙNG BẠN</div>
        <div className="brand-row">
          {brandNames.map((b, i) => (
            <Button
              variant="ghost"
              key={b}
              className={`brand-word brand-${i}`}
              onClick={() => navigate(`/shop?brand=${b}`)}
            >
              {i === 0 && <span className="yonex-symbol">●●</span>}
              {b.toUpperCase()}
            </Button>
          ))}
        </div>
      </section>
      <section className="section container">
        <SectionTitle
          eyebrow="MỚI VỀ TỪ SÂN ĐẤU"
          title="Trang bị mới. Khởi đầu mới."
          link="Xem hàng mới về"
          onClick={() => navigate("/shop?new=1")}
        />
        <div className="product-grid">
          {(backend.mode === "api"
            ? [...products].sort((a, b) => b.id - a.id).slice(0, 4)
            : products
                .filter((p) => p.badge === "NEW")
                .concat(products[6] ? [products[6]] : [])
          ).map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>
      <section className="community-banner">
        <div className="container community-inner">
          <div>
            <span className="eyebrow">
              KHÔNG CHỈ LÀ THỂ THAO. ĐÓ LÀ NIỀM ĐAM MÊ.
            </span>
            <Heading>
              Vì tình yêu
              <br />
              với trái cầu lông<span>.</span>
            </Heading>
            <p>
              Những buổi sáng sớm. Những set cầu nghẹt thở. Thêm một trận nữa.
              <br />
              Chúng tôi đồng hành trên mọi chặng đường thi đấu của bạn.
            </p>
            <Button variant="dark" onClick={() => navigate("/about")}>
              Tìm hiểu về SmashHub <Icon name="arrow" size={17} />
            </Button>
          </div>
          <div className="community-stats">
            <div>
              <strong>10k+</strong>
              <span>Người chơi tin chọn</span>
            </div>
            <div>
              <strong>
                4.9<span>/5</span>
              </strong>
              <span>Đánh giá tích cực</span>
            </div>
            <div>
              <strong>100%</strong>
              <span>Đam mê trọn vẹn</span>
            </div>
          </div>
        </div>
      </section>
      <section className="newsletter container">
        <div>
          <span className="eyebrow">NHẬN THÔNG TIN ĐỘC QUYỀN</span>
          <Heading>Nâng tầm phong độ. Gửi thẳng vào hòm thư.</Heading>
          <p>
            Sản phẩm mới về, bí quyết từ chuyên gia và ưu đãi đặc quyền.
          </p>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            toast("Chào mừng bạn gia nhập cộng đồng SmashHub!")
            e.currentTarget.reset()
          }}
        >
          <div className="newsletter-input">
            <Input
              type="email"
              placeholder="Địa chỉ email của bạn..."
              aria-label="Email nhận bản tin"
              required
            />
            <Button type="submit">
              Đăng ký ngay <Icon name="arrow" size={16} />
            </Button>
          </div>
          <small>
            Bằng cách đăng ký, bạn đồng ý với Chính sách bảo mật của chúng tôi. Hủy đăng ký bất cứ lúc nào.
          </small>
        </form>
      </section>
    </>
  )
}
export function SectionTitle({
  eyebrow,
  title,
  link,
  onClick,
}: {
  eyebrow?: string
  title: string
  link?: string
  onClick?: () => void
}) {
  return (
    <div className="section-heading">
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <Heading>{title}</Heading>
      </div>
      {link && (
        <Button variant="ghost" className="text-link" onClick={onClick}>
          {link}
          <Icon name="arrow" size={16} />
        </Button>
      )}
    </div>
  )
}
export function Catalog() {
  const { products: allProducts, route, navigate } = useApp()
  const products = allProducts.filter((p) =>
    ["ACTIVE", "OUT_OF_STOCK"].includes(p.status),
  )
  const path = route.split("?")[0]
  const params = new URLSearchParams(route.split("?")[1])
  const initialCat = decodeURIComponent(path.split("/")[2] || "")
  const [cats, setCats] = useState<string[]>(initialCat ? [initialCat] : [])
  const [brand, setBrand] = useState<string[]>(
    params.get("brand") ? [params.get("brand")!] : [],
  )
  const [query, setQuery] = useState(params.get("search") || "")
  const [sort, setSort] = useState("popular")
  const [price, setPrice] = useState(300)
  const [inStock, setInStock] = useState(false)
  const [sale, setSale] = useState(params.has("sale"))
  const [newOnly, setNewOnly] = useState(params.has("new"))
  const [attribute, setAttribute] = useState("All")
  const [page, setPage] = useState(1)
  const [filterOpen, setFilterOpen] = useState(false)
  const toggle = (
    value: string,
    list: string[],
    setter: (v: string[]) => void,
  ) => {
    setter(
      list.includes(value) ? list.filter((c) => c !== value) : [...list, value],
    )
    setPage(1)
  }
  const filtered = products
    .filter(
      (p) =>
        (!cats.length || cats.includes(p.category)) &&
        (!brand.length || brand.includes(p.brand)) &&
        p.price <= price &&
        (!inStock || p.stock > 0) &&
        (!sale || p.oldPrice) &&
        (!newOnly || p.badge === "NEW") &&
        `${p.name} ${p.brand}`.toLowerCase().includes(query.toLowerCase()) &&
        (attribute === "All" ||
          (attribute === "Head heavy"
            ? [1, 5, 8].includes(p.id)
            : attribute === "Even balance"
              ? [2, 9].includes(p.id)
              : p.category === "Rackets")),
    )
    .sort((a, b) =>
      sort === "low"
        ? a.price - b.price
        : sort === "high"
          ? b.price - a.price
          : sort === "new"
            ? b.id - a.id
            : b.reviews - a.reviews,
    )
  const clear = () => {
    setCats([])
    setBrand([])
    setQuery("")
    setPrice(300)
    setInStock(false)
    setSale(false)
    setNewOnly(false)
    setAttribute("All")
    setPage(1)
  }
  return (
    <main className="container catalog-page">
      <Breadcrumb
        items={["Trang chủ", "Cửa hàng", ...(initialCat ? [categoryNamesVi[initialCat] || initialCat] : [])]}
      />
      <div className="page-intro">
        <span className="eyebrow">TRANG BỊ ĐẲNG CẤP. ĐỒNG HÀNH BỀN LÂU.</span>
        <Heading level={1}>
          {newOnly
            ? "Sản phẩm mới nhất."
            : categoryNamesVi[initialCat] || initialCat || "Lựa chọn trang bị phù hợp nhất."}
        </Heading>
        <p>Trang bị chất lượng cao. Hiệu năng vượt trội. Thiết kế cho bạn.</p>
      </div>
      <div className="catalog-layout">
        <aside className={`filter-sidebar ${filterOpen ? "show" : ""}`}>
          <div className="filter-head">
            <strong>Bộ lọc</strong>
            <Button variant="ghost" onClick={clear}>
              Xóa tất cả
            </Button>
          </div>
          <FilterGroup title="Danh mục">
            {categories.map((c) => (
              <label className="checkbox-row" key={c}>
                <input
                  type="checkbox"
                  checked={cats.includes(c)}
                  onChange={() => toggle(c, cats, setCats)}
                />
                {categoryNamesVi[c] || c}
                <small>{products.filter((p) => p.category === c).length}</small>
              </label>
            ))}
          </FilterGroup>
          <FilterGroup title="Thương hiệu">
            {brands.map((b) => (
              <label className="checkbox-row" key={b}>
                <input
                  type="checkbox"
                  checked={brand.includes(b)}
                  onChange={() => toggle(b, brand, setBrand)}
                />
                {b}
              </label>
            ))}
          </FilterGroup>
          <FilterGroup title="Khoảng giá">
            <input
              type="range"
              min="0"
              max="300"
              step="5"
              value={price}
              onChange={(e) => {
                setPrice(+e.target.value)
                setPage(1)
              }}
              aria-label="Giá tối đa"
            />
            <div className="range-values">
              <span>{money(0)}</span>
              <span>{money(price)}</span>
            </div>
          </FilterGroup>
          <FilterGroup title="Điểm cân bằng vợt">
            <Select
              aria-label="Điểm cân bằng vợt"
              value={attribute}
              onChange={(e) => {
                setAttribute(e.target.value)
                setPage(1)
              }}
            >
              {[
                ["All", "Tất cả"],
                ["Head heavy", "Nặng đầu (Tấn công)"],
                ["Even balance", "Cân bằng (Công thủ)"],
                ["Head light", "Nhẹ đầu (Phản tạt/Thủ)"],
              ].map(([val, text]) => (
                <option key={val} value={val}>
                  {text}
                </option>
              ))}
            </Select>
          </FilterGroup>
          <FilterGroup title="Tình trạng hàng">
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={inStock}
                onChange={(e) => setInStock(e.target.checked)}
              />
              Chỉ sản phẩm còn hàng
            </label>
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={sale}
                onChange={(e) => setSale(e.target.checked)}
              />
              Đang giảm giá
            </label>
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={newOnly}
                onChange={(e) => setNewOnly(e.target.checked)}
              />
              Hàng mới về
            </label>
          </FilterGroup>
          <div className="filter-help">
            <Icon name="headset" size={25} />
            <strong>Bạn phân vân chưa biết chọn gì?</strong>
            <p>
              Hãy để chúng tôi tư vấn
              <br />
              cây vợt và trang bị chuẩn nhất.
            </p>
            <Button variant="ghost" onClick={() => navigate("/contact")}>
              Liên hệ tư vấn ngay <Icon name="arrow" size={15} />
            </Button>
          </div>
        </aside>
        <div className="catalog-results">
          <div className="catalog-toolbar">
            <span>
              <strong>{filtered.length}</strong> sản phẩm phù hợp
            </span>
            <Button
              variant="secondary"
              className="filter-toggle"
              onClick={() => setFilterOpen(!filterOpen)}
            >
              <Icon name="filter" size={16} />
              Bộ lọc
            </Button>
            <Select
              aria-label="Sắp xếp sản phẩm"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
            >
              <option value="popular">Phổ biến nhất</option>
              <option value="low">Giá: Thấp đến cao</option>
              <option value="high">Giá: Cao đến thấp</option>
              <option value="new">Mới nhất</option>
            </Select>
          </div>
          <div className="catalog-search">
            <Icon name="search" size={18} />
            <Input
              aria-label="Tìm kiếm sản phẩm"
              value={query}
              placeholder="Tìm sản phẩm..."
              onChange={(e) => {
                setQuery(e.target.value)
                setPage(1)
              }}
            />
          </div>
          {(cats.length > 0 || brand.length > 0 || sale || newOnly) && (
            <div className="filter-chips">
              {[
                ...cats.map((c) => categoryNamesVi[c] || c),
                ...brand,
                ...(sale ? ["Đang giảm giá"] : []),
                ...(newOnly ? ["Hàng mới về"] : []),
              ].map((x) => (
                <Button
                  key={x}
                  variant="secondary"
                  onClick={() => {
                    const originalCat = Object.keys(categoryNamesVi).find(
                      (k) => categoryNamesVi[k] === x,
                    ) || x
                    setCats(cats.filter((c) => c !== originalCat && c !== x))
                    setBrand(brand.filter((b) => b !== x))
                    if (x === "Đang giảm giá" || x === "On sale") setSale(false)
                    if (x === "Hàng mới về" || x === "New arrivals") setNewOnly(false)
                  }}
                >
                  {x}
                  <Icon name="close" size={12} />
                </Button>
              ))}
            </div>
          )}
          {filtered.length ? (
            <div className="product-grid catalog-grid">
              {filtered.slice((page - 1) * 9, page * 9).map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          ) : (
            <Empty
              icon="search"
              title="Không tìm thấy sản phẩm phù hợp."
              text="Hãy thử tìm kiếm với từ khóa khác hoặc xóa bớt bộ lọc."
            >
              <Button onClick={clear}>Xóa tất cả bộ lọc</Button>
            </Empty>
          )}
          <Pagination
            page={page}
            total={Math.max(1, Math.ceil(filtered.length / 9))}
            onChange={setPage}
          />
        </div>
      </div>
    </main>
  )
}
function FilterGroup({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="filter-group">
      <Heading level={4}>
        {title}
        <Icon name="minus" size={14} />
      </Heading>
      {children}
    </section>
  )
}
export function Pagination({
  page,
  total,
  onChange,
}: {
  page: number
  total: number
  onChange: (page: number) => void
}) {
  return (
    <div className="pagination">
      <span>
        Trang {page} / {total}
      </span>
      <Button
        variant="secondary"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
      >
        Trước
      </Button>
      {Array.from({ length: total }, (_, i) => (
        <Button
          key={i}
          variant={page === i + 1 ? "dark" : "ghost"}
          onClick={() => onChange(i + 1)}
        >
          {i + 1}
        </Button>
      ))}
      <Button
        variant="secondary"
        disabled={page >= total}
        onClick={() => onChange(page + 1)}
      >
        Sau
        <Icon name="chevron" size={14} />
      </Button>
    </div>
  )
}
export function Breadcrumb({ items }: { items: string[] }) {
  const { navigate } = useApp()
  return (
    <div className="breadcrumb">
      {items.map((x, i) => (
        <span key={i}>
          <Button variant="ghost" onClick={() => i === 0 && navigate("/")}>
            {x}
          </Button>
          {i < items.length - 1 && <Icon name="chevron" size={11} />}
        </span>
      ))}
    </div>
  )
}
export function ProductDetail({ productOverride }: {
  productOverride?: Product
} = {}) {
  const {
    route,
    products,
    navigate,
    addToCart,
    wishlist,
    toggleWishlist,
    toast,
  } = useApp()
  const product =
    productOverride || products.find((p) => p.id === +route.split("/")[2])
  const backend = useBackend()
  const [variant, setVariant] = useState("")
  const [color, setColor] = useState(product?.colors?.[0] || "Original")
  const [quantity, setQuantity] = useState(1)
  const [tab, setTab] = useState("Description")
  const [image, setImage] = useState(0)
  const [zoom, setZoom] = useState(false)
  if (!product)
    return (
      <Empty
        title="Product not found"
        text="This item may no longer be available."
      >
        <Button onClick={() => navigate("/shop")}>Back to shop</Button>
      </Empty>
    )
  const options =
    backend.mode === "api"
      ? (product.variants || [])
          .filter(
            (v) =>
              v.id &&
              v.status === "ACTIVE" &&
              (!v.colorName || v.colorName === color),
          )
          .map((v) => `#${v.id}`)
      : product.variants?.length
        ? [
            ...new Set(
              product.variants
                .filter(
                  (v) =>
                    v.status === "ACTIVE" &&
                    (!v.colorName || v.colorName === color),
                )
                .map((v) => v.name),
            ),
          ]
        : product.category === "Shoes"
          ? ["US 7", "US 8", "US 9", "US 10", "US 11"]
          : product.category === "Apparel"
            ? ["S", "M", "L", "XL"]
            : product.category === "Rackets"
              ? ["3U / G5", "4U / G5", "4U / G6"]
              : ["Standard"]
  const selectedVariant = product.variants?.find(
    (v) =>
      (v.name === (variant || options[0]) ||
        `#${v.id}` === (variant || options[0])) &&
      (!v.colorName || v.colorName === color),
  )
  const availableStock =
    backend.mode === "api" ? selectedVariant?.stock || 0 : product.stock
  const unitPrice =
    backend.mode === "api"
      ? (selectedVariant?.price ?? product.price)
      : product.price
  const colorGallery = product.colorOptions?.find(
    (option) => option.name === color,
  )
  const galleryImages = colorGallery?.images.length
    ? colorGallery.images
    : product.images || []
  return (
    <main className="container detail-page">
      <Breadcrumb items={["Trang chủ", categoryNamesVi[product.category] || product.category, product.name]} />
      <div className="product-detail-grid">
        <div className="gallery">
          <div className={`gallery-main angle-${image}`}>
            {product.badge && <Badge tone="ink">{product.badge}</Badge>}
            {galleryImages.length ? (
              <img
                className="uploaded-product-image"
                src={galleryImages[image % galleryImages.length]}
                alt={`${product.name} view ${image + 1}`}
              />
            ) : (
              <ProductArt product={{ ...product, id: product.id + 500 }} />
            )}
          </div>
          {galleryImages.length > 0 && (
            <Button
              variant="ghost"
              className="gallery-zoom-link"
              onClick={() => setZoom(true)}
            >
              <Icon name="search" size={15} />
              Phóng to ảnh
            </Button>
          )}
          <div className="gallery-thumbnails">
            {(galleryImages.length
              ? galleryImages.map((_, i) => i)
              : [0, 1, 2]
            ).map((i) => (
              <Button
                key={i}
                variant="ghost"
                className={image === i ? "selected" : ""}
                onClick={() => setImage(i)}
                aria-label={`Ảnh sản phẩm ${i + 1}`}
              >
                {galleryImages[i] ? (
                  <img
                    className="uploaded-product-image"
                    src={galleryImages[i]}
                    alt={`${product.name} thumbnail ${i + 1}`}
                  />
                ) : (
                  <ProductArt
                    product={{ ...product, id: product.id + 600 + i }}
                    className={`angle-${i}`}
                  />
                )}
              </Button>
            ))}
          </div>
        </div>
        <div className="detail-info">
          <span className="eyebrow">
            {product.brand} / {categoryNamesVi[product.category] || product.category}
          </span>
          <Heading level={1}>{product.name}</Heading>
          <div className="detail-reviews">
            <span className="stars">
              {backend.mode === "api" && product.rating === "—"
                ? "Chưa có đánh giá"
                : "★★★★★"}
            </span>
            <strong>{product.rating}</strong>
            <span>
              {product.reviews}{" "}
              {backend.mode === "api" ? "đánh giá" : "đánh giá đã xác thực"}
            </span>
            <span className="sku">
              SKU:{" "}
              {backend.mode === "api"
                ? selectedVariant?.sku || "—"
                : `SH-${product.id}0-G5`}
            </span>
          </div>
          <div className="detail-price">
            <strong>{money(unitPrice)}</strong>
            {product.oldPrice && (
              <>
                <del>{money(product.oldPrice)}</del>
                <Badge tone="orange">
                  Tiết kiệm {money(product.oldPrice - product.price)}
                </Badge>
              </>
            )}
          </div>
          <p className="detail-description">
            {product.description ||
              `Độ chính xác và hiệu năng đỉnh cao. Cây vợt ${product.brand} ${product.name} mang lại sự tự tin để bạn làm chủ từng đường cầu. Thiết kế cao cấp cho tay vợt khao khát chiến thắng.`}
          </p>
          <div className="detail-selection">
            <strong>
              Màu sắc: <span>{color}</span>
            </strong>
            <div className="swatches">
              {(product.colors?.length
                ? product.colors
                : backend.mode === "api"
                  ? ["Original"]
                  : ["Original", "Midnight", "Pearl"]
              ).map((c, i) => (
                <Button
                  key={c}
                  className={color === c ? "selected" : ""}
                  variant="ghost"
                  onClick={() => {
                    setColor(c)
                    setVariant("")
                    setQuantity(1)
                    setImage(0)
                  }}
                  aria-label={c}
                >
                  <span
                    style={{
                      background:
                        product.colorOptions?.find(
                          (option) => option.name === c,
                        )?.hexCode ||
                        [product.color, "#242b30", "#e7e2d6"][i % 3],
                    }}
                  />
                </Button>
              ))}
            </div>
            <div className="flex-between">
              <strong>
                {product.category === "Rackets" ? "Trọng lượng / Chu vi cán" : "Kích thước"}
              </strong>
              <small>Tiêu chuẩn thi đấu</small>
            </div>
            <div className="variant-options">
              {options.map((v) => (
                <Button
                  key={v}
                  variant="secondary"
                  className={(variant || options[0]) === v ? "selected" : ""}
                  onClick={() => setVariant(v)}
                >
                  {backend.mode === "api"
                    ? `${product.variants?.find((item) => `#${item.id}` === v)?.name || ""} · ${v}`
                    : v}
                </Button>
              ))}
            </div>
          </div>
          <div className={`stock-indicator ${availableStock ? "" : "out"}`}>
            <span />
            {availableStock
              ? `Còn hàng — sẵn sàng giao (${availableStock} sản phẩm)`
              : "Tạm thời hết hàng"}
          </div>
          <div className="add-cart-row">
            <Quantity
              value={quantity}
              max={availableStock}
              onChange={setQuantity}
            />
            <Button
              disabled={!availableStock || backend.cartBusy}
              onClick={() =>
                addToCart(product, quantity, variant || options[0], color)
              }
            >
              <Icon name="bag" size={18} />
              Thêm vào giỏ — {money(unitPrice * quantity)}
            </Button>
            <IconButton
              name="heart"
              label="Thêm vào danh sách yêu thích"
              onClick={() => toggleWishlist(product.id)}
              aria-pressed={wishlist.includes(product.id)}
            />
          </div>
          <Button
            variant="dark"
            className="full-width"
            disabled={!availableStock || backend.cartBusy}
            onClick={() => {
              if (backend.mode === "api") {
                void backend
                  .add(product, quantity, variant || options[0], color)
                  .then(() => navigate("/cart"))
                  .catch((e) => toast(errorMessage(e)))
              } else {
                addToCart(product, quantity, variant || options[0], color)
                navigate("/checkout")
              }
            }}
          >
            Mua ngay <Icon name="arrow" size={16} />
          </Button>
          <div className="detail-perks">
            <span>
              <Icon name="truck" size={19} /> Giao hàng toàn quốc
            </span>
            <span>
              <Icon name="shield" size={19} /> Cam kết 100% chính hãng
            </span>
            <span>
              <Icon name="return" size={19} /> Đổi trả trong 30 ngày
            </span>
          </div>
        </div>
      </div>
      <div className="detail-tabs">
        {[
          ["Description", "Mô tả sản phẩm"],
          ["Specifications", "Thông số kỹ thuật"],
          [`Reviews`, `Đánh giá (${product.reviews})`],
          ["Shipping & returns", "Vận chuyển & Đổi trả"],
        ].map(([key, label]) => (
          <Button
            variant="ghost"
            className={tab === key ? "active" : ""}
            key={key}
            onClick={() => setTab(key)}
          >
            {label}
          </Button>
        ))}
      </div>
      <div className="detail-tab-content">
        {tab === "Description" ? (
          <>
            <Heading level={3}>Thiết kế để nâng tầm lối chơi của bạn.</Heading>
            <p>
              Từng chi tiết của {product.name} đều được chế tác tỉ mỉ nhằm giúp
              bạn đạt phong độ cao nhất trên sân đấu. Từ chất lượng vật liệu đến
              cảm giác cầm vợt êm ái, đây là trang bị sinh ra cho những chiến thắng.
            </p>
            <ul>
              <li>Vật liệu và cấu trúc chuẩn thi đấu chuyên nghiệp</li>
              <li>Tối ưu hóa khả năng kiểm soát, cảm giác cầu và độ bền vượt trội</li>
              <li>Được thử nghiệm bởi các tay vợt phong trào và bán chuyên</li>
            </ul>
          </>
        ) : tab === "Specifications" ? (
          <div className="spec-grid">
            {(backend.mode === "api"
              ? [
                  ["Thương hiệu", product.brand],
                  ["Loại sản phẩm", product.productType || "—"],
                  ...(product.attributes || []).map((attribute) => [
                    attribute.name,
                    attribute.value,
                  ]),
                ]
              : [
                  ["Thương hiệu", product.brand],
                  [
                    "Loại sản phẩm",
                    product.category === "Rackets"
                      ? "Vợt cầu lông"
                      : product.category === "Shoes"
                        ? "Giày cầu lông"
                        : product.category === "Apparel"
                          ? "Trang phục"
                          : "Phụ kiện",
                  ],
                  [
                    "Chất liệu",
                    product.category === "Rackets"
                      ? "HM Graphite / Namd"
                      : "Vật liệu tổng hợp cao cấp",
                  ],
                  ["Xuất xứ", "Nhật Bản"],
                  ["Trình độ phù hợp", "Trung bình / Nâng cao"],
                  ["Bảo hành", "6 tháng chính hãng"],
                ]
            ).map(([k, v]) => (
              <div key={k}>
                <span>{k}</span>
                <strong>{v}</strong>
              </div>
            ))}
          </div>
        ) : tab.startsWith("Reviews") && backend.mode === "api" ? (
          <p>
            Chưa có Review API trong tài liệu; không hiển thị đánh giá mẫu ở chế
            độ API.
          </p>
        ) : tab.startsWith("Reviews") ? (
          <>
            <div className="review-summary">
              <strong>{product.rating}</strong>
              <span className="stars">★★★★★</span>
              <span>Dựa trên {product.reviews} lượt mua hàng đã xác thực</span>
            </div>
            {[
              "Chất lượng tuyệt vời, đập cầu rất đầm tay. Rất hài lòng!",
              "Giao hàng nhanh, đóng gói cẩn thận, sản phẩm chuẩn chính hãng.",
            ].map((r, i) => (
              <div className="customer-review" key={r}>
                <strong>{["Minh Tuấn", "Thanh Hà"][i]}</strong>
                <Badge tone="green">Đã mua hàng</Badge>
                <div className="stars">★★★★★</div>
                <p>{r}</p>
              </div>
            ))}
          </>
        ) : (
          <>
            <Heading level={3}>Giao hàng nhanh chóng. An tâm trải nghiệm.</Heading>
            <p>
              Giao tiêu chuẩn: 3–5 ngày làm việc. Giao nhanh: 1–2 ngày làm việc.
              Hỗ trợ đổi trả trong vòng 30 ngày đối với sản phẩm còn nguyên tem mác và hộp.
              Mọi thắc mắc xin liên hệ support@smashhub.com để được giải đáp nhanh nhất.
            </p>
          </>
        )}
      </div>
      <section className="section">
        <SectionTitle eyebrow="TRANG BỊ ĐỒNG BỘ" title="Kết hợp hoàn hảo." />
        <div className="product-grid">
          {products
            .filter((p) => p.id !== product.id)
            .slice(0, 4)
            .map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
        </div>
      </section>
      <section className="section">
        <SectionTitle title="Sản phẩm vừa xem" />
        <div className="recently-viewed">
          <ProductCard product={product} />
        </div>
      </section>
      {zoom && (
        <Modal title={product.name} wide onClose={() => setZoom(false)}>
          <img
            className="product-zoom-image"
            src={galleryImages[image % galleryImages.length]}
            alt={`${product.name} · ${color}`}
          />
        </Modal>
      )}
    </main>
  )
}
export function Quantity({
  value,
  onChange,
  max = 99,
}: {
  value: number
  onChange: (v: number) => void
  max?: number
}) {
  return (
    <div className="quantity">
      <IconButton
        name="minus"
        label="Giảm số lượng"
        disabled={value <= 1}
        onClick={() => onChange(Math.max(1, value - 1))}
      />
      <span>{value}</span>
      <IconButton
        name="plus"
        label="Tăng số lượng"
        disabled={value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
      />
    </div>
  )
}
export function StoreFooter() {
  const { navigate } = useApp()
  const backend = useBackend()
  return (
    <footer className="store-footer">
      <div className="container footer-grid">
        <div className="footer-brand">
          <Logo light onClick={() => navigate("/")} />
          <p>
            Trang bị đỉnh cao. Bứt phá phong độ.
            <br />
            Hành trình đam mê cầu lông bắt đầu tại đây.
          </p>
          <div className="socials">
            <Button
              variant="ghost"
              aria-label="Liên hệ SmashHub"
              onClick={() => navigate("/contact")}
            >
              <Icon name="mail" size={19} />
            </Button>
            <Button
              variant="ghost"
              aria-label="Về cộng đồng chúng tôi"
              onClick={() => navigate("/about")}
            >
              <Icon name="globe" size={19} />
            </Button>
          </div>
        </div>
        {[
          [
            "CỬA HÀNG",
            ...categories.map((c) => categoryNamesVi[c] || c),
            "Khuyến mãi",
          ],
          [
            "VỀ SMASHHUB",
            "Câu chuyện thương hiệu",
            "Liên hệ",
            "Thương hiệu đối tác",
            "Quản trị Admin",
          ],
          [
            "HỖ TRỢ KHÁCH HÀNG",
            "Vận chuyển & Giao hàng",
            "Chính sách đổi trả",
            "Bảng chọn kích thước",
            "Câu hỏi thường gặp",
            "Tra cứu đơn hàng",
          ],
        ].map(([title, ...links]) => (
          <div className="footer-col" key={title}>
            <strong>{title}</strong>
            {links.map((l) => (
              <Button
                variant="ghost"
                key={l}
                onClick={() => {
                  const originalCat = Object.keys(categoryNamesVi).find(
                    (k) => categoryNamesVi[k] === l,
                  )
                  if (originalCat) {
                    navigate(`/shop/${originalCat}`)
                  } else if (l === "Khuyến mãi" || l === "Sale") {
                    navigate("/shop?sale=1")
                  } else if (l === "Quản trị Admin" || l === "Admin dashboard") {
                    navigate("/admin")
                  } else if (l === "Thương hiệu đối tác" || l === "Our brands") {
                    navigate("/brands")
                  } else if (l === "Tra cứu đơn hàng" || l === "Track your order") {
                    navigate("/account/orders")
                  } else if (l === "Câu chuyện thương hiệu" || l === "Our story") {
                    navigate("/about")
                  } else if (l === "Liên hệ" || l === "Contact us") {
                    navigate("/contact")
                  } else {
                    navigate(`/info/${encodeURIComponent(l)}`)
                  }
                }}
              >
                {l}
              </Button>
            ))}
          </div>
        ))}
        <div className="footer-col footer-contact">
          <strong>KẾT NỐI VỚI SMASHHUB</strong>
          <span>support@smashhub.com</span>
          <span>+84 (28) 3822 6688</span>
          <small>Thứ 2 – Thứ 7, 8:30 – 18:00 (GMT+7)</small>
          <div className="payment-logos">
            <span>VISA</span>
            <span>mastercard</span>
            <span>
              VN<span>PAY</span>
            </span>
          </div>
        </div>
      </div>
      <div className="container footer-bottom">
        <span>© 2026 SmashHub. Tất cả các quyền được bảo lưu.</span>
        <div>
          <Button
            variant="ghost"
            onClick={() => navigate("/info/Privacy policy")}
          >
            Chính sách bảo mật
          </Button>
          <Button
            variant="ghost"
            onClick={() => navigate("/info/Terms of service")}
          >
            Điều khoản dịch vụ
          </Button>
          <Button variant="ghost" onClick={() => navigate("/design-system")}>
            Hệ thống thiết kế
          </Button>
          <span>
            {backend.mode === "api" ? backend.currency : "VND ₫"}{" "}
            <Icon name="down" size={11} />
          </span>
        </div>
      </div>
    </footer>
  )
}
