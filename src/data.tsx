import { readSettings } from "./api/client"

export type Product = {
  id: number
  name: string
  brand: string
  category: string
  price: number
  oldPrice?: number
  color: string
  badge?: string
  rating: string
  reviews: number
  stock: number
  status: string
  categoryId?: number
  brandId?: number
  slug?: string
  description?: string
  productType?: string
  images?: string[]
  colors?: string[]
  colorOptions?: Array<{
    id: number
    name: string
    hexCode: string
    images: string[]
  }>
  attributes?: {
    name: string
    value: string
  }[]
  variants?: {
    id?: number
    sku: string
    name: string
    price: number
    stock: number
    status: string
    colorId?: number
    colorName?: string
    inventoryStatus?: string
    weightGram?: number
  }[]
}
export const initialProducts: Product[] = [
  {
    id: 1,
    name: "Astrox 100 ZZ",
    brand: "Yonex",
    category: "Rackets",
    price: 215,
    oldPrice: 250,
    color: "#19323e",
    badge: "BEST SELLER",
    rating: "4.9",
    reviews: 128,
    stock: 24,
    status: "ACTIVE",
  },
  {
    id: 2,
    name: "Auraspeed 90K II",
    brand: "Victor",
    category: "Rackets",
    price: 189,
    oldPrice: 220,
    color: "#b18b5d",
    badge: "-14%",
    rating: "4.8",
    reviews: 86,
    stock: 18,
    status: "ACTIVE",
  },
  {
    id: 3,
    name: "Power Cushion 65 Z3",
    brand: "Yonex",
    category: "Shoes",
    price: 145,
    color: "#e6e3dc",
    badge: "NEW",
    rating: "4.9",
    reviews: 94,
    stock: 32,
    status: "ACTIVE",
  },
  {
    id: 4,
    name: "Aerosensa 50",
    brand: "Yonex",
    category: "Shuttlecocks",
    price: 38,
    oldPrice: 45,
    color: "#0b542c",
    rating: "4.8",
    reviews: 217,
    stock: 48,
    status: "ACTIVE",
  },
  {
    id: 5,
    name: "Axforce 90 Dragon",
    brand: "Li-Ning",
    category: "Rackets",
    price: 229,
    color: "#b73c30",
    badge: "NEW",
    rating: "4.9",
    reviews: 64,
    stock: 12,
    status: "ACTIVE",
  },
  {
    id: 6,
    name: "Tournament Crew Tee",
    brand: "Victor",
    category: "Apparel",
    price: 42,
    color: "#eceae1",
    badge: "NEW",
    rating: "4.7",
    reviews: 36,
    stock: 42,
    status: "ACTIVE",
  },
  {
    id: 7,
    name: "Pro Tournament Bag",
    brand: "Yonex",
    category: "Accessories",
    price: 89,
    oldPrice: 110,
    color: "#1d313b",
    rating: "4.8",
    reviews: 53,
    stock: 7,
    status: "ACTIVE",
  },
  {
    id: 8,
    name: "Thruster Ryuga II",
    brand: "Victor",
    category: "Rackets",
    price: 205,
    color: "#6a3b70",
    rating: "4.8",
    reviews: 42,
    stock: 3,
    status: "ACTIVE",
  },
  {
    id: 9,
    name: "Aeronaut 9000C",
    brand: "Li-Ning",
    category: "Rackets",
    price: 199,
    oldPrice: 240,
    color: "#e5e0ca",
    rating: "4.8",
    reviews: 76,
    stock: 0,
    status: "OUT_OF_STOCK",
  },
  {
    id: 10,
    name: "Court Performance Tee",
    brand: "Yonex",
    category: "Apparel",
    price: 39,
    color: "#233d48",
    rating: "4.7",
    reviews: 31,
    stock: 22,
    status: "ACTIVE",
  },
  {
    id: 11,
    name: "A970 NitroLite",
    brand: "Victor",
    category: "Shoes",
    price: 135,
    color: "#e6d746",
    rating: "4.8",
    reviews: 82,
    stock: 16,
    status: "ACTIVE",
  },
  {
    id: 12,
    name: "Super Grap · 3 Pack",
    brand: "Yonex",
    category: "Accessories",
    price: 12,
    color: "#e9dfbf",
    rating: "4.9",
    reviews: 142,
    stock: 63,
    status: "ACTIVE",
  },
]
export const money = (n: number) => {
  const currency = readSettings().currency || "VND"
  const locale = currency === "USD" ? "en-US" : "vi-VN"
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: n % 1 ? 2 : 0,
  }).format(n)
}
export const categories = [
  "Rackets",
  "Shoes",
  "Shuttlecocks",
  "Apparel",
  "Accessories",
]
export const brands = ["Yonex", "Victor", "Li-Ning", "Mizuno", "Babolat"]
export const statuses = [
  "PENDING_PAYMENT",
  "PAID",
  "PROCESSING",
  "SHIPPING",
  "DELIVERED",
  "CANCELLED",
  "EXPIRED",
  "REFUNDED",
]
export const initialOrders = [
  {
    id: "SH-10248",
    customer: "Alex Morgan",
    email: "alex.morgan@email.com",
    date: "Jun 18, 2025",
    total: 360,
    status: "PROCESSING",
    payment: "VNPAY",
    items: 2,
  },
  {
    id: "SH-10247",
    customer: "Linh Nguyen",
    email: "linh.nguyen@email.com",
    date: "Jun 18, 2025",
    total: 229,
    status: "SHIPPING",
    payment: "COD",
    items: 1,
  },
  {
    id: "SH-10246",
    customer: "Daniel Kim",
    email: "daniel.kim@email.com",
    date: "Jun 17, 2025",
    total: 127,
    status: "DELIVERED",
    payment: "VNPAY",
    items: 3,
  },
  {
    id: "SH-10245",
    customer: "Sarah Chen",
    email: "sarah.chen@email.com",
    date: "Jun 17, 2025",
    total: 189,
    status: "PAID",
    payment: "VNPAY",
    items: 1,
  },
  {
    id: "SH-10244",
    customer: "Minh Tran",
    email: "minh.tran@email.com",
    date: "Jun 16, 2025",
    total: 215,
    status: "PENDING_PAYMENT",
    payment: "COD",
    items: 1,
  },
  {
    id: "SH-10243",
    customer: "James Wilson",
    email: "james.w@email.com",
    date: "Jun 16, 2025",
    total: 88,
    status: "CANCELLED",
    payment: "COD",
    items: 2,
  },
]
export type Order = typeof initialOrders[number]
export function ProductArt({
  product,
  className = "",
}: {
  product: Pick<Product, "category" | "color" | "id">
  className?: string
}) {
  const { category, color, id } = product
  const pattern = `strings-${id}-${className.replace(/\W/g, "")}`
  return (
    <svg
      className={`product-art ${className}`}
      viewBox="0 0 320 300"
      role="img"
      aria-label={`${category} product illustration`}
    >
      <defs>
        <pattern
          id={pattern}
          width="8"
          height="8"
          patternUnits="userSpaceOnUse"
        >
          <path d="M8 0H0v8" fill="none" stroke="#919590" strokeWidth=".65" />
        </pattern>
        <linearGradient id={`shine${pattern}`} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#fff" stopOpacity=".3" />
          <stop offset=".5" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity=".15" />
        </linearGradient>
        <filter id={`shadow${pattern}`}>
          <feGaussianBlur stdDeviation="6" />
        </filter>
      </defs>
      <ellipse
        cx="160"
        cy="265"
        rx="73"
        ry="6"
        fill="#b0aba2"
        opacity=".2"
        filter={`url(#shadow${pattern})`}
      />
      {category === "Rackets" ? (
        <g transform="translate(160 147) rotate(30) translate(-160 -147)">
          <path d="M159 123v103" stroke="#1e2527" strokeWidth="4" />
          <path d="M160 137v79" stroke={color} strokeWidth="3" />
          <path
            d="m149 117 11 27 12-27"
            fill="none"
            stroke={color}
            strokeWidth="3"
          />
          <ellipse
            cx="160"
            cy="79"
            rx="43"
            ry="57"
            fill={`url(#${pattern})`}
            stroke="#161d22"
            strokeWidth="6"
          />
          <ellipse
            cx="160"
            cy="79"
            rx="43"
            ry="57"
            fill="none"
            stroke={color}
            strokeWidth="3.8"
          />
          <path
            d="M128 43a43 57 0 0 1 56-8M128 115a43 57 0 0 0 23 19"
            stroke="#d6b87c"
            strokeWidth="3"
            fill="none"
          />
          <rect x="154" y="211" width="12" height="61" rx="3" fill="#25272a" />
          {Array.from({ length: 10 }, (_, i) => (
            <path
              key={i}
              d={`m154 ${215 + i * 5} 12 4`}
              stroke="#55575a"
              strokeWidth="1"
            />
          ))}
          <path d="M154 268h12" stroke={color} strokeWidth="5" />
          <text
            x="157"
            y="192"
            fill="#d9d9d9"
            fontSize="5"
            transform="rotate(-90 157 192)"
          >
            ISOMETRIC
          </text>
        </g>
      ) : category === "Shoes" ? (
        <g transform="translate(1 20) rotate(-12 160 150)">
          <path
            d="M52 163q13-12 22-58l26 12 32 22 55 1 39 15 35 10q20 7 15 29l-13 12H70q-28-2-18-43Z"
            fill={color}
            stroke="#b6b7b1"
            strokeWidth="1.5"
          />
          <path
            d="m52 180 61 8 65-2 62-4 37-1-1 19q-7 15-27 14H72q-28-3-20-34Z"
            fill="#eae9e2"
            stroke="#a6a69e"
          />
          <path d="m57 202 67 4 63-2 83-2" stroke="#d2ae78" strokeWidth="7" />
          <path d="m109 141 35 36 48-35-28 1-23 18-16-20Z" fill="#25343a" />
          <path
            d="m137 140 30 6m-21-14 32 8m-20-14 31 10m-21-15 28 11"
            stroke="#f8f8f1"
            strokeWidth="5"
          />
          <path
            d="m66 137 27 15-9 28-26-4m150-22 6 29m8-25 6 23"
            fill="none"
            stroke="#a9aea5"
            strokeWidth="2"
          />
          <path d="m75 104 7 20 19 3-1-11Z" fill="#232c31" />
        </g>
      ) : category === "Shuttlecocks" ? (
        <g>
          <g transform="rotate(-17 133 160)">
            <rect x="87" y="51" width="64" height="204" rx="13" fill={color} />
            <ellipse cx="119" cy="54" rx="32" ry="9" fill="#ece9df" />
            <path d="M89 101h60v89H89Z" fill="#f3eee0" />
            <path d="m92 104 54 32v42l-54-31Z" fill="#d5b665" />
            <text
              x="119"
              y="127"
              textAnchor="middle"
              fill="#fff"
              fontSize="10"
              fontWeight="bold"
            >
              YONEX
            </text>
            <text
              x="119"
              y="162"
              textAnchor="middle"
              fill="#1f4e36"
              fontSize="8"
              fontWeight="bold"
            >
              AEROSENSA
            </text>
            <text
              x="119"
              y="181"
              textAnchor="middle"
              fill="#1f4e36"
              fontSize="22"
              fontWeight="bold"
            >
              50
            </text>
          </g>
          <g transform="translate(201 185) rotate(25)">
            <path
              d="m-21 0-21-77q42-15 84 0L21 0Z"
              fill="#fff"
              stroke="#d8d6ce"
            />
            <path
              d="m-35-77 18 77m-1-82 10 82M0-82v82m18-82L8 0m27-77L17 0M-29-35h58M-35-54h70"
              stroke="#d3d2ca"
              fill="none"
            />
            <path
              d="M-21 0h42v15q-21 27-42 0Z"
              fill="#e5d5ad"
              stroke="#d3c398"
            />
            <path d="M-21 0h42v5h-42Z" fill="#42794d" />
          </g>
        </g>
      ) : category === "Apparel" ? (
        <g>
          <path
            d="m108 53 31-8q21 20 42 0l31 8 48 46-29 35-25-21 8 139H106l8-139-25 21-29-35 48-46Z"
            fill={color}
            stroke="#cbc9c0"
            strokeWidth="1.5"
          />
          <path
            d="M139 45q21 47 42 0"
            stroke="#323c3e"
            strokeWidth="5"
            fill="none"
          />
          <path d="m108 53 15 58m89-58-15 58" stroke="#b8bcb6" fill="none" />
          <path d="m106 218 108-61v25l-108 61" fill="#b6bdba" opacity=".3" />
          <text
            x="185"
            y="102"
            textAnchor="middle"
            fontSize="8"
            fill="#e85d29"
            fontWeight="bold"
          >
            VICTOR
          </text>
        </g>
      ) : (
        <g>
          <path
            d="M58 134q11-43 41-45h122q30 7 43 42l14 81q-1 21-24 24H72q-28-3-24-26l10-76Z"
            fill={color}
            stroke="#17242c"
            strokeWidth="2"
          />
          <path
            d="M105 102q-2-62 56-64 54-1 56 64"
            stroke="#283b45"
            strokeWidth="9"
            fill="none"
          />
          <path d="M60 140h203M153 141v94" stroke="#879393" strokeWidth="2" />
          <path d="m76 169 39 1v40H70Z" fill="#213b46" />
          <text
            x="198"
            y="194"
            fill="#e9e8e2"
            fontSize="17"
            fontStyle="italic"
            fontWeight="bold"
            textAnchor="middle"
          >
            YONEX
          </text>
          <path d="m174 159 11-9 9 9-10 8Z" fill="#f6f5e9" />
        </g>
      )}
    </svg>
  )
}
