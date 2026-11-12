import {
  Search,
  UserRound,
  Heart,
  ShoppingBag,
  ArrowRight,
  ChevronRight,
  ChevronDown,
  Truck,
  ShieldCheck,
  RotateCcw,
  Headset,
  Star,
  X,
  Menu,
  Plus,
  Minus,
  Check,
  LayoutGrid,
  Package,
  ChartNoAxesCombined,
  Users,
  Settings,
  Bell,
  Pencil,
  Trash2,
  Tag,
  LogOut,
  Upload,
  MapPin,
  Mail,
  SlidersHorizontal,
  Zap,
  Globe,
  Copy,
  type LucideIcon,
} from "lucide-react"
import { useEffect, useId, useRef } from "react"
import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
} from "react"

export function Button({
  children,
  variant = "primary",
  type = "button",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "dark"
}) {
  return (
    <button
      type={type}
      className={`btn btn-${variant} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
export function Input({
  label,
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label?: string }) {
  return (
    <label className={`field ${className}`}>
      {label && <span>{label}</span>}
      <input {...props} />
    </label>
  )
}
export function Select({
  label,
  children,
  id,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { label?: string }) {
  const generatedId = useId()
  const selectId = id || generatedId
  return (
    <div className="field">
      {label && (
        <label className="field-label" htmlFor={selectId}>
          {label}
        </label>
      )}
      <select id={selectId} {...props}>
        {children}
      </select>
    </div>
  )
}
export function Heading({
  children,
  level = 2,
  className = "",
}: {
  children: ReactNode
  level?: 1 | 2 | 3 | 4
  className?: string
}) {
  const Tag = `h${level}` as "h1" | "h2" | "h3" | "h4"
  return <Tag className={className}>{children}</Tag>
}
export function Badge({
  children,
  tone = "",
}: {
  children: ReactNode
  tone?: string
}) {
  return <span className={`badge ${tone}`}>{children}</span>
}
const iconMap: Record<string, LucideIcon> = {
  search: Search,
  user: UserRound,
  heart: Heart,
  bag: ShoppingBag,
  arrow: ArrowRight,
  chevron: ChevronRight,
  down: ChevronDown,
  truck: Truck,
  shield: ShieldCheck,
  return: RotateCcw,
  headset: Headset,
  star: Star,
  close: X,
  menu: Menu,
  plus: Plus,
  minus: Minus,
  check: Check,
  grid: LayoutGrid,
  box: Package,
  chart: ChartNoAxesCombined,
  users: Users,
  settings: Settings,
  bell: Bell,
  edit: Pencil,
  trash: Trash2,
  tag: Tag,
  logout: LogOut,
  upload: Upload,
  location: MapPin,
  mail: Mail,
  filter: SlidersHorizontal,
  bolt: Zap,
  globe: Globe,
  copy: Copy,
}
export function Icon({
  name,
  size = 20,
  ...props
}: {
  name: string
  size?: number
  className?: string
}) {
  const Component = iconMap[name] || Package
  return (
    <Component size={size} strokeWidth={1.65} aria-hidden="true" {...props} />
  )
}
export function IconButton({
  name,
  label,
  children,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  name: string
  label: string
}) {
  return (
    <button
      type="button"
      className={`icon-btn ${className}`}
      aria-label={label}
      title={label}
      {...props}
    >
      <Icon name={name} />
      {children}
    </button>
  )
}
export function Logo({
  light = false,
  onClick,
}: {
  light?: boolean
  onClick?: () => void
}) {
  return (
    <Button
      variant="ghost"
      className={`logo ${light ? "logo-light" : ""}`}
      onClick={onClick}
    >
      <svg width="34" height="35" viewBox="0 0 34 35" fill="none">
        <path d="m19 2-8 13h10L9 33l4-13H3L19 2Z" fill="currentColor" />
        <path d="m29 2-8 13h10L19 33l4-13H13L29 2Z" fill="currentColor" />
      </svg>
      <span>
        smash<span className="logo-hub">hub</span>
        <span className="logo-dot">.</span>
      </span>
    </Button>
  )
}
export function Modal({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string
  children: ReactNode
  onClose: () => void
  wide?: boolean
}) {
  const dialogRef = useRef<HTMLElement>(null)
  const closeRef = useRef(onClose)
  closeRef.current = onClose
  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    const dialog = dialogRef.current
    const getFocusable = () =>
      Array.from(
        dialog?.querySelectorAll<HTMLElement>(
          'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]',
        ) || [],
      )
    getFocusable()[0]?.focus()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeRef.current()
      if (event.key === "Tab") {
        const focusable = getFocusable()
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault()
          last?.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first?.focus()
        }
      }
    }
    document.addEventListener("keydown", onKeyDown)
    return () => {
      document.removeEventListener("keydown", onKeyDown)
      document.body.style.overflow = previousOverflow
      previousFocus?.focus()
    }
  }, [])
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section
        ref={dialogRef}
        className={`modal ${wide ? "modal-wide" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <Heading level={3}>{title}</Heading>
          <IconButton name="close" label="Close dialog" onClick={onClose} />
        </div>
        {children}
      </section>
    </div>
  )
}
export function Empty({
  title,
  text,
  children,
  icon = "bag",
}: {
  title: string
  text: string
  children?: ReactNode
  icon?: string
}) {
  return (
    <div className="empty">
      <span className="empty-icon">
        <Icon name={icon} size={32} />
      </span>
      <Heading level={3}>{title}</Heading>
      <p>{text}</p>
      {children}
    </div>
  )
}
