# SmashHub — frontend product

SmashHub is a responsive React storefront and a separate, desktop-first admin workspace. It now has **separate Spring Boot API and demo modes**. The API client uses only the routes supplied by the user, with the supplied HTTPS Ngrok URL as its default base URL.

## Spring Boot integration — current contract

Use **Cấu hình kết nối** in the connection bar to select API or the original demo and to change the base URL. The supplied HTTPS Ngrok URL is the new default; `http://localhost:8080/cms` remains configurable. API failures never silently become mock products, identities, carts, orders or payment success.

### Runtime and libraries

The host-managed project is still **React 19 + Vite 8 + Tailwind v4**, not Next.js 15. No Next.js App Router/SSR migration or replacement Payload backend has been performed. Existing local UI primitives/styles are retained, with Lucide icons; this is not a wholesale shadcn/ui conversion. The added architecture uses Axios, persisted Zustand auth state, TanStack React Query v5, and React Hook Form + Zod for address/checkout validation. The framework portion of the master prompt remains a separate migration, not an implicit claim about the running app.

- `src/lib/axios.ts`: Axios interceptors unwrap `{ code, message, result }`, handle HTTP and business errors, bind requests to their backend/session, and coordinate one refresh request for concurrent HTTP 401 / code 1006 responses. Each protected request retries at most once; refresh failure clears credentials and preserves a safe login redirect. Non-auth mutation/network failures are not automatically retried.
- `src/stores/auth.ts`: persisted access/refresh token pair, backend binding and session generation. The anonymous cart uses the required localStorage key **`smashhub_cart_token`** plus backend metadata, not tab-scoped storage.
- `src/types/api.ts`: token, page, product summary/detail, nested color/variant, cart, address, GHN fee, checkout, order and verified payment-result interfaces.
- `src/api/client.ts`: only the user-supplied endpoint services, including addresses, locations, shipping, checkout, order cancel/repay/tracking, and VNPAY return verification.
- `src/api/adapters.ts`: supports documented `effectivePrice`, `thumbnailUrl`, `PageResponse.content` and variants/gallery images within each color, while retaining legacy top-level variant responses.
- `src/hooks/useAuth.ts`, `useCart.ts`, `useProducts.ts`, `useCheckout.ts`: application hooks; React Query caches product pages, addresses, locations, fee previews, orders, tracking and payment verification. Login/logout/source changes clear private cache state.
- `src/api/AddressApi.tsx`: address list/create/default and cascading province → district → ward selections using GHN location endpoints. Parent changes clear child selections; stale requests are cancelled by query keys/signals.
- `src/api/CheckoutApi.tsx`: saved/new address selection, STANDARD/EXPRESS live fee preview, COD/VNPAY, note, validation, immediate in-flight locking, no blind retry on uncertain submission, and server-authoritative order totals.
- `src/api/OrdersApi.tsx`: paginated customer orders, current-page status tabs, details/items, cancellation with reason and server eligibility handling, repayment and GHN tracking. An expired order or error 2308 exposes repayment. Error 2301 hides cancellation and refreshes the order.
- `src/api/PaymentApi.tsx`: native `/payment/vnpay/return?...` and hash-route callback handling. Every callback query parameter, including duplicates, is forwarded to the backend. Only **`result.isSuccess === true`** produces verified payment success.

### Critical protocol behavior

1. A first anonymous add is POST `/cart/items` **without** a preliminary guest-cart GET or guest header. The response header `X-Cart-Token` or body `result.cartToken` is persisted. Subsequent anonymous cart calls include it.
2. Authenticated cart calls send the access JWT, not the guest header. After successful login, an existing guest token triggers **bodyless POST `/cart/merge` with both headers**. Only a successful merge removes the guest token. A failed merge keeps it and exposes a retry action. Registration returns no tokens and requires OTP activation, so merge waits for the subsequent authenticated login rather than inventing an authenticated registration state.
3. Login/refresh use **`accessToken` and `refreshToken`**, not the obsolete `result.token`. Refresh rotates both values. JWT `scope` supplies UI role hints; Spring Boot authorization is always authoritative, and no browser-side signature verification is claimed.
4. Protected responses from an old account/server cannot overwrite a new session. Token refresh retains the same session generation; login/logout changes it. Product/brand/category delete controls remain ADMIN-only.
5. Checkout sends only `{ addressId, shippingMethod, paymentMethod, note }`; the backend computes prices and final totals. Client locking and disabled controls prevent duplicate in-flight submissions; they do not replace server-side transaction/idempotency enforcement. Ambiguous transport/server failures block blind resubmission and direct the customer to their orders.
6. Shipping fee preview sends server variant IDs, quantities and `weightGram`. If cart metadata omits weight, the UI explicitly requests a gram estimate instead of silently inventing package weights. Address/method/item changes invalidate the quote, and submission waits for a fresh quote.
7. A VNPAY checkout/repay response immediately navigates to the returned HTTPS VNPAY URL. Invalid/untrusted redirect hosts are rejected without creating another order. The frontend must be configured as the return URL on the backend; no browser query flag is treated as proof of payment.
8. Error mapping covers 1006, 1007 (403), 1009/1023 (locked), 1019 (OTP), 2044 (stock), 2201 (empty cart), 2301 and 2308. The backend message is retained for additional context where appropriate.

### Deliberately unsupported operations

No admin-wide order-list/status-transition/retry-GHN endpoints, address PUT/DELETE endpoints, reporting, standalone inventory movements, settings persistence or wishlist-persistence APIs were supplied. The admin orders view clearly labels GET `/orders` as the current account's orders and does not pretend it manages every customer's orders. Address book supports only the supplied list/add/default operations.

Product create/update and attributes/colors/images paths are known but their **write DTOs** are still unspecified. Existing dialogs therefore send explicitly entered JSON unchanged rather than guessing payloads from read DTOs. Structured variants use the previously supplied write fields. File uploads call the real file endpoint but are not automatically attached using an invented image DTO.

### Connectivity / deployment

Browser calls go directly to Spring Boot. Ngrok requests include `ngrok-skip-browser-warning`; backend CORS must allow Authorization, Content-Type, X-Cart-Token and that Ngrok header, and should expose X-Cart-Token (body token capture is also supported). A read-only probe of the supplied public catalog returned **HTTP 502** during implementation, so real backend/database/payment execution has not been verified. Protocol and UI tests use intercepted fixture responses, never real paid orders.

The Make development server remains supervised; no additional dev server was started. Real payment return URLs must target the deployed frontend origin, not an inaccessible developer-local origin. Price display is configurable (VND/USD) without currency conversion.

## Screen organization

Hash navigation connects these product areas. Native aliases `/login`, `/register`, `/verify-otp`, `/forgot-password`, `/products` and `/products/{slug}` are also recognized. This remains SPA routing, not Next.js server routing:

| Design area | Routes |
| --- | --- |
| 01 Design System | `#/design-system` |
| 02 Customer — Home & Discovery | `#/`, `#/brands`, `#/about` |
| 03 Customer — Product Catalog | `#/shop`, `#/shop/Rackets`, category routes; search, brand, sale and new-arrival query parameters |
| 04 Customer — Product Details | `#/product/1` and catalog product IDs |
| 05 Customer — Cart & Checkout | `#/cart`, `#/checkout`, `#/success/{id}`, `/payment/vnpay/return?...` |
| 06 Customer — Authentication | `#/auth/login`, `register`, `verify`, `forgot`, `reset` |
| 07 Customer — Account & Orders | `#/account/overview`, `profile`, `orders`, `orders/{id}`, `addresses`, `wishlist`, `security`, `settings` |
| 08 Admin — Dashboard | `#/admin` |
| 09 Admin — Products | `#/admin/products`, `#/admin/products/new`, `#/admin/products/1` |
| 10 Admin — Categories & Brands | `#/admin/categories`, `#/admin/brands` |
| 11 Admin — Inventory | `#/admin/inventory` |
| 12 Admin — Orders | `#/admin/orders`, `#/admin/orders/SH-10248` |
| 13 Admin — Customers | `#/admin/customers` |
| 14 Admin — Settings | `#/admin/settings`, `#/admin/profile` |

This is a runnable Figma Make application, not a generated native Figma Design document.

## Original demo implementation boundaries

- `src/ui.tsx`: local design-system primitives, icons, modal focus management, fields, buttons, badges and empty states.
- `src/index.css`: shared tokens, locally hosted fonts, component styling and responsive layouts.
- `src/data.tsx`: sample catalog, enums, sample orders and original equipment illustrations.
- `src/context.tsx`: typed application state boundary for future service integration.
- `src/Store.tsx`: discovery, search/filter/sort, catalog, product galleries and product selections.
- `src/Commerce.tsx`: demo cart/checkout, authentication, account, policies and support screens.
- `src/Admin.tsx`: separately loaded administration workspace, reports, editors and management workflows.

In **demo mode**, product editing, cart, wishlist, addresses, and order status changes are held in React state and reset on reload. Category/brand records, customer management, stock movement history and settings are local demo screens; these reset when their screen is remounted.

In **demo mode only**, authentication is a UI demonstration: use any valid email and an 8-character password. OTP demonstration code: `123456`. No email is sent and demo admin routes are not protected. API mode never accepts that hardcoded OTP or a fabricated identity.

In **demo mode only**, checkout performs no real charge, VNPAY redirect, reservation, or server-side order creation. `COD` and `VNPAY` are preserved as domain values. Shipping choices are `STANDARD` and `EXPRESS`. Sample province/district/ward choices are for UI demonstration and must be replaced by the backend's authoritative address dataset.

In **demo mode**, image upload is browser-local preview only; no Cloudinary upload is attempted. In API mode, the dedicated upload panel calls the supplied file API.

Dashboard metrics and charts are sample analytics; not computed financial reports. Sample order detail line items and addresses are illustrative. CSV export downloads the currently filtered mock rows.

## Remaining production integration

Validate the conservative adapters against actual response DTOs, then replace explicit product JSON payload entry with structured mappings once their request DTOs are provided. Validate transactional checkout, payment callbacks and the order lifecycle against the running Spring Boot service. Add admin order transitions, reporting, address editing/deletion and inventory movement integration only when those contracts are supplied. Actual Spring Boot availability and CORS must be verified in the deployment environment.

The current enum vocabulary includes:

- Product types: `RACKET`, `SHOES`, `APPAREL`, `ACCESSORY`
- Product status: `DRAFT`, `ACTIVE`, `OUT_OF_STOCK`, `DISCONTINUED`
- Order status: `PENDING_PAYMENT`, `PAID`, `PROCESSING`, `SHIPPING`, `DELIVERED`, `CANCELLED`, `EXPIRED`, `REFUNDED`
- Account status: `ACTIVE`, `INACTIVE`, `LOCKED`
- Roles: `ADMIN`, `STAFF`, `CUSTOMER`

## Assets and verification

- On-court photography: Irish83 / Unsplash, photo `1718452739586-5b467f1f109b`.
- Detail photography: Saif71.com / Unsplash, photo `1613918431703-aa50889e3be9`.
- Avatar portraits: Pravatar sample portraits.
- Manrope and Barlow Condensed: Google Fonts, locally hosted for reliable preview rendering.
- Product artwork: original SVG illustrations for this frontend; not manufacturer product photographs.

Commands: `pnpm format src`, `pnpm exec tsc --noEmit`, `pnpm build`.
Protocol/adapter tests: `node --test tests/api-client.test.cjs`. These use mocked fetch responses, not a live Spring Boot database.
The development server is host-managed; do not start another server.
