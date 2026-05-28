# Product_Ecom Project Report

Generated from the local repository at `c:\Dev\admin12121\@26\Product_Ecom` on 2026-05-20.

## Executive Summary

This is a decoupled e-commerce and tailoring/booking platform for Alphasuits. The repository has two main applications:

- `client`: a Next.js App Router frontend for storefront, customer account flows, checkout, admin dashboard, product management, order management, booking/measurement management, newsletter, settings, and documentation/manual pages.
- `server`: a Django + Django REST Framework API for users/authentication, products, variants, cart, reviews, sales/orders, discount codes, layout configuration, bookings/measurements, analytics, email workflows, media uploads, and security monitoring.

The project is feature-rich and already has many production-facing flows. The main issues are not lack of features; they are environment/config drift, auth route protection gaps, stale or mismatched documentation, dependency drift, weak DX automation, and a few risky security/payment/data-model decisions.

## Tech Stack

### Frontend

| Area | Current Stack | What It Manages |
| --- | --- | --- |
| Framework | `next` `^16.1.1` | App Router pages, layouts, API routes, SSR/server components, frontend routing. |
| Runtime/package manager | Bun is intended; local Bun version found: `1.3.8` | Dependency install and scripts. `bun.lock` is tracked. |
| React | `react` / `react-dom` `^19.0.0` | UI component rendering. |
| Language | TypeScript `^5`, `strict: true`, `allowJs: true` | Static typing for app code, though many local `any` usages are allowed by ESLint config. |
| State/data fetching | Redux Toolkit `^2.3.0`, RTK Query, React Redux `^9.1.2` | Central API client in `client/src/lib/store/Service/api.tsx`, caching, invalidation tags, generated hooks. |
| Auth/session | `next-auth` `^5.0.0-beta.25`, credentials provider, Google provider, `jose` | Next-side sessions, JWT decoding, route guard in `client/src/proxy.ts`, credentials forwarded to Django. |
| Forms/validation | `react-hook-form`, `@hookform/resolvers`, `zod` | Client forms for auth, product, checkout, booking, settings. |
| UI system | Tailwind CSS `^3.4.1`, shadcn-style components, Radix primitives, lucide icons | Reusable UI primitives in `client/src/components/ui`, app-specific components in `components/global`, `components/admin`, `components/auth`. |
| Charts/admin visuals | `recharts`, `framer-motion`, `embla-carousel-react`, `swiper`, `nextjs-toploader`, `sonner` | Dashboard charts, interactions, carousel/slider UI, loading and toast states. |
| Images/assets | Next Image custom loader, local assets under `public`, remote media hosts | Product/media display, brand assets, docs screenshots. |

Important frontend mismatch: `eslint-config-next` is pinned to `15.1.0` while the app declares Next `^16.1.1`. That should be aligned.

### Backend

| Area | Current Stack | What It Manages |
| --- | --- | --- |
| Framework | Django `5.1.4` | Project shell, ORM, models, admin registration, settings, email templates. |
| API | Django REST Framework `3.15.2` | ViewSets, serializers, permissions, pagination, API routing. |
| Auth | `djangorestframework-simplejwt` `5.3.1` | JWT access/refresh tokens consumed by NextAuth and RTK Query. |
| Python/runtime | Python `>=3.12`; local `.python-version` is `3.12`; local venv Python is `3.12.12` | Backend runtime. |
| Dependency manager | `uv` via `pyproject.toml` and `uv.lock`; `requirements.txt` also exists | Backend dependency management, currently duplicated and drifting. |
| Database | MySQL via `PyMySQL` | Active `settings.py` uses `django.db.backends.mysql`, not PostgreSQL. |
| Media processing | Pillow `11.1.0` | Product/review/profile image compression. |
| Config | `python-decouple` | Reads secrets and deployment settings from environment/.env. |
| Payments | Cash on Delivery in active checkout flow; `stripe==11.4.1` is in `pyproject.toml` only | Stripe dependency exists but active Stripe payment component is empty. README mentions Esewa, but code does not show an Esewa implementation. |
| Security middleware | Custom `TamperDetectionMiddleware` plus Django security headers | Blocks suspicious headers/payloads/probing paths and emits security responses. |

Important backend mismatch: `requirements.txt` and `pyproject.toml` do not match. `stripe==11.4.1` exists in `pyproject.toml`/`uv.lock`, but not in `requirements.txt`.

## Project Structure

```text
Product_Ecom/
  README.md
  report.md
  client/
    app.js
    package.json
    bun.lock
    package-lock.json
    next.config.js
    tsconfig.json
    components.json
    src/
      app/
        api/auth/...
        (app)/
          (user)/...
          (admin)/...
          (manual)/...
      components/
        admin/
        auth/
        global/
        navbar/
        provider/
        ui/
      config/
      hooks/
      icons/
      lib/
        store/
      schemas/
      styles/
      types/
    public/
      docs/
      assits/
      brand/product images
  server/
    manage.py
    pyproject.toml
    uv.lock
    requirements.txt
    server/
      settings.py
      urls.py
      views.py
      middleware/security.py
      utils/encryption.py
    account/
    product/
    sales/
    booking/
    layout/
    templates/
    media/
    logs/
```

## Backend Responsibilities

### `server/server`

This is the Django project configuration layer.

- `settings.py`: installed apps, MySQL database, JWT, CORS, email, static/media paths, upload limits, security headers.
- `urls.py`: mounts API namespaces:
  - `/api/accounts/`
  - `/api/sales/`
  - `/api/products/`
  - `/api/layout/`
  - `/api/booking/`
  - `/api/security/monitor/`
  - `/media/...`
- `middleware/security.py`: custom detection for suspicious tools, headers, injection patterns, path traversal, and sensitive path probing.
- `views.py`: custom 404/security monitoring responses.
- `utils/encryption.py`: response wrapping using token-derived XOR/base64 encryption for selected endpoints.

### `account`

Manages user identity and customer account data.

Main models:

- `User`: custom email-login user model with `role`, `state`, profile image, OTP reset fields, admin/superuser flags.
- `Account`: social provider account mapping.
- `DeliveryAddress`: user shipping addresses with default-address validation.
- `SearchHistory`: recent search tracking with max 25 entries per user.
- `UserDevice`: device signature and last-login tracking.
- `SiteViewLog`: visitor analytics data.
- `NewLetter`: newsletter subscription email list.

Main API responsibilities:

- Registration, login, social login, activation.
- Password reset via OTP/token.
- User profile updates and password changes.
- Admin user list/detail/state changes.
- Shipping addresses and default address.
- Site view logs and analytics.
- Search history and popular keywords.
- Newsletter management.

### `product`

Manages catalog, variants, inventory, cart, reviews, notifications, and recommendations.

Main models:

- `Category`: unique category name and generated slug.
- `Product`: product name, description, category, active/deactive flag, slug.
- `ProductColor`: color code/name and optional color image.
- `ProductVariant`: product stock/price/discount by color and/or size.
- `ProductImage`: max 5 images per product, compressed on save.
- `NotifyUser`: back-in-stock or product notification interest.
- `Review` / `ReviewImage`: customer review content and optional images.
- `Cart`: user cart rows with product, variant, and quantity.

Main API responsibilities:

- Product CRUD and filtering.
- Category CRUD.
- Product color and variant management.
- Product image upload/deletion.
- Product recommendations and trending products.
- Product lookup by IDs for checkout.
- Review posting/admin moderation/user review lists.
- Cart add/update/delete/clear.
- Stock management.

### `sales`

Manages orders, coupons/redeem codes, invoices, order status, stock deduction/restoration, and dashboard analytics.

Main models:

- `Redeem_Code`: discount code, type, discount, minimum, usage limit, used count, validity.
- `Sales`: order header with customer, transaction UID, status, totals, shipping, discount, payment data, expected delivery date.
- `Saled_Products`: order line items with product, variant, price, quantity, total.

Main API responsibilities:

- Create orders with duplicate transaction protection.
- Validate shipping address and redeem code.
- Deduct stock during order creation.
- Restore stock when cancelled orders are deleted.
- Send invoice email after order creation.
- Send delay and review-invitation emails on status/date updates.
- Admin-only update/delete for orders.
- Dashboard stats, sales chart, top products, recent orders/bookings, visitor stats, category performance.

### `booking`

Manages tailoring booking and measurement workflows.

Main model:

- `Booking`: customer appointment info, measurement type, status, bill data, coat/pant/shirt measurements, measurement dates, delivery date, admin message.

Main API responsibilities:

- Public/customer booking creation.
- Admin booking list/detail/update/delete.
- Status updates.
- Measurement updates.
- Bill update and bill email.
- Booking stats.
- Customer lookup.
- Bill number generation.

### `layout`

Manages dynamic storefront/admin-editable layout configuration.

Main model:

- `Layout`: `slug` plus JSON `config`.

Main API responsibilities:

- Public layout read.
- Admin-authenticated layout update.

## Frontend Responsibilities

### App Routes

The frontend uses Next App Router route groups:

- `src/app/(app)/(user)`: storefront and customer flows.
  - Home, about, contacts, FAQ, policy pages.
  - Collections and product detail pages.
  - Wishlist.
  - Auth pages.
  - Book-now page.
  - Checkout flow.
  - Account profile, shipping, orders, reviews.
- `src/app/(app)/(admin)`: admin dashboard.
  - Dashboard analytics.
  - Users.
  - Products, add product, category, stock, discounts.
  - Sales/order management.
  - Bookings.
  - Reviews.
  - Newsletter.
  - Settings.
- `src/app/(app)/(manual)`: internal/manual documentation pages.
- `src/app/api/auth`: Next API wrappers for login, registration, reset password, and NextAuth route handling.

### State and API Data Layer

The central API integration is `client/src/lib/store/Service/api.tsx`.

It defines one RTK Query API slice named `userAuthapi` with these tag families:

- Auth/users: `LoggedUser`, `Users`, `Shipping`, `Newsletter`
- Catalog: `Products`, `ProductDetail`, `ProductImages`, `ProductVariants`, `Categories`, `Stocks`, `TrendingProducts`, `Notifications`
- Cart/search: `Cart`, `PopularKeywords`
- Orders/sales: `Orders`, `OrderDetail`, `RedeemCodes`
- Layout/settings: `Layout`
- Reviews: `Reviews`, `UserReviews`
- Dashboard: `DashboardStats`, `SalesChart`, `TopProducts`, `RecentOrders`, `RecentBookings`, `VisitorStats`, `CategoryPerformance`
- Booking: `Bookings`, `BookingDetail`, `BookingStats`

The Redux store only mounts RTK Query, so this is primarily server-state management. Local UI state is handled inside components/hooks, while cart/wishlist also use localStorage helpers.

### Auth Flow

- NextAuth credentials provider calls Django `/api/accounts/users/login/`.
- Google provider calls Django `/api/accounts/users/social_login/`.
- Django returns access/refresh tokens.
- NextAuth stores access/refresh token values in the JWT/session.
- RTK Query requests pass `Authorization: Bearer <token>`.
- `client/src/proxy.ts` guards route access and decodes token role for admin-only routes.

Risk: `proxy.ts` route lists do not currently include all admin routes that exist in the app. Admin links include `/bookings`, `/newsletter`, and `/manual`, but those are not listed in `protectedRoutes` or `adminRoutes`. That means the Next route guard may not protect those pages at the frontend boundary.

## API Surface Summary

### Backend API Namespaces

| Namespace | Purpose |
| --- | --- |
| `/api/accounts/` | users, admin-users, search, shipping, site-view-logs, newsletter, reset password, activation, token refresh |
| `/api/products/` | categories, colors, products, variants, images, reviews, recommendations, trending, cart, stock |
| `/api/sales/` | sales/orders, redeem codes, dashboard analytics |
| `/api/booking/` | bookings, customer lookup, bill number generation |
| `/api/layout/` | dynamic layout config |
| `/api/security/monitor/` | client-side/security beacon |

### Next API Routes

| Route Area | Purpose |
| --- | --- |
| `api/auth/[...nextauth]` | NextAuth handler |
| `api/auth/login` | Login wrapper using NextAuth `signIn` |
| `api/auth/registration` | Registration wrapper that forwards to Django |
| `api/auth/reset-password` | Reset password wrapper |
| `api/auth/reset-password/[uid]` | OTP/token reset continuation |

## Data Model Summary

The domain model is centered around:

- User identity: `User`, `Account`, `UserDevice`, `DeliveryAddress`
- Catalog: `Category`, `Product`, `ProductColor`, `ProductVariant`, `ProductImage`
- Customer behavior: `SearchHistory`, `Cart`, `Review`, `ReviewImage`, `NotifyUser`, `SiteViewLog`, `NewLetter`
- Commerce: `Redeem_Code`, `Sales`, `Saled_Products`
- Tailoring workflow: `Booking`
- Dynamic page settings: `Layout`

Strong parts:

- Product variants enforce color/size uniqueness and stock validation.
- Cart validates positive quantity, selected variant, and stock availability.
- Order creation is wrapped in a database transaction.
- Duplicate `transactionuid` orders are rejected.
- Admin-only permissions exist for important backend write operations.
- Dashboard analytics are isolated in `sales/dashboard_views.py`.

Weak parts:

- Money fields use `FloatField` in sales models. Use `DecimalField` for currency to avoid rounding errors.
- Some names contain typos or legacy wording (`costumer_name`, `Saled_Products`, `Redeem_Code`, `favoutare`, `SaleQuertSetSerializer`). These do not block runtime but reduce maintainability.
- Booking measurements and bill data are JSON blobs. That is flexible, but reporting/searching/validation will stay weaker than typed measurement tables.
- Some serializer/API names expose implementation spelling mistakes, making client contracts harder to reason about.

## Security Review

Positive security controls:

- Django `DEBUG = False`.
- JWT authentication is globally configured for DRF.
- CORS is restricted to `FRONTEND_URL`.
- Secure cookie flags and HTTPS redirect are enabled.
- HSTS, content-type sniffing protection, X-Frame-Options, and referrer policy are set.
- Upload memory limits are set.
- Custom middleware detects suspicious payloads and sensitive-path probing.
- Admin permissions are used for dashboard APIs and many mutating endpoints.

High-priority security issues:

1. Local `.env` files contain real production secrets and credentials.
   - They are not tracked by git based on `git ls-files`, but they exist in the repo directory and include live-looking secrets.
   - Create `.env.example` files without secrets and rotate any credential that has been exposed to tools, screenshots, logs, or shared machines.

2. Backend `.env` and `settings.py` are misaligned.
   - `settings.py` requires `FRONTEND` and `BACKEND`.
   - The current `.env` uses `FRONTEND_URL` and `BACKEND_URL`.
   - Result: `manage.py check` fails until `FRONTEND` and `BACKEND` are manually supplied.

3. Frontend route protection is incomplete.
   - Existing admin pages include `/bookings`, `/newsletter`, and `/manual`.
   - `client/src/routes.ts` does not include those paths in `protectedRoutes`/`adminRoutes`.
   - Backend APIs still enforce permissions, but pages and client code should also be guarded consistently.

4. Client-side encryption uses fallback secrets.
   - `client/src/lib/utils.ts` and `client/src/lib/transition.ts` fall back to `"fallback-secret-key"`.
   - Any security-sensitive workflow must not rely on client-side AES or URL-obfuscated checkout payloads.
   - Treat localStorage and encrypted route data as user-controlled hints only; backend validation must remain authoritative.

5. Custom tamper detection may block legitimate tooling or API clients.
   - The middleware blocks based on headers, user-agent patterns, and generic payload regexes.
   - This can create false positives for real users, monitoring tools, QA tools, and integrations.
   - It should log/score suspicious signals before blocking broad traffic, especially for authenticated users and known API clients.

Other notes:

- `manage.py check --deploy` reports `security.W009`: the configured secret key has Django's insecure/generated pattern. Rotate it for production.
- `server/server/urls.py` always serves `/media/` through Django's static serve view. That is useful locally but not ideal for production.
- Django admin route is commented out. That may be intentional, but if admin operations depend entirely on custom UI, verify emergency/admin recovery workflows.

## Payment and Checkout Review

Active checkout currently appears to be Cash on Delivery:

- Checkout payload sets `payment_method: "Cash On Delivery"`.
- Order creation happens through `POST /api/sales/sales/`.
- Stock is deducted during order creation.
- Invoice email is sent after commit.

Payment drift:

- README says Esewa is implemented.
- `pyproject.toml` includes Stripe.
- `client/src/components/global/payment/stripe/index.tsx` is empty.
- Code search did not show active Esewa integration.

Recommendation: decide the real payment roadmap and update code/docs accordingly:

- If only COD is live, remove claims about Esewa/Stripe until implemented.
- If Stripe or Esewa is planned, add backend payment intent/verification endpoints, webhook/callback verification, idempotency keys, and payment-state transitions before enabling UI buttons.
- Do not trust frontend payment status. Backend should verify gateway callbacks/server-side status.

## DX and Tooling Review

What is good:

- Clear split between `client` and `server`.
- Frontend has TypeScript strict mode enabled.
- Backend has migrations committed per app.
- RTK Query centralizes API calls and cache invalidation.
- Backend uses `uv.lock`, which can give deterministic Python installs.
- UI components are organized into reusable folders.

Current DX problems:

1. No root orchestration.
   - There is no root `package.json`, `Makefile`, Docker Compose, or scripts to run client/server together.
   - Developers must know separate commands and ports.

2. Dependency state is missing for frontend.
   - `client/node_modules` is absent.
   - `bun run lint` fails immediately with `bun: command not found: next`.

3. Frontend lint script may be stale.
   - `package.json` uses `next lint`.
   - This should be reviewed against the installed Next major version and replaced with direct ESLint if needed.

4. Dependency manifests drift.
   - `client` has both `bun.lock` and `package-lock.json` locally.
   - `server` has both `pyproject.toml`/`uv.lock` and `requirements.txt`.
   - Pick one primary dependency workflow per app.

5. Missing env examples.
   - README instructs copying `.env.example`, but no `.env.example` files were found.

6. Runtime/generated files are present in the repo tree.
   - `server/logs/django.log` is tracked.
   - At least one media upload file is tracked.
   - `client/tsconfig.tsbuildinfo` exists locally.
   - Add a root `.gitignore` and stop tracking runtime logs/media unless they are intentional fixtures.

7. ESLint config disables important rules.
   - `react-hooks/exhaustive-deps`, unused vars, explicit `any`, and ban-ts-comment are disabled.
   - This lowers friction but hides real bugs in a complex app.

8. `client/app.js` ignores `process.env.PORT` for the actual listener.
   - It logs `process.env.PORT || 3000`, but `.listen(3000)` is hardcoded.

## Verification Results

Commands run:

```powershell
bun --version
node --version
.\.venv\Scripts\python.exe --version
bun run lint
.\.venv\Scripts\python.exe manage.py check
.\.venv\Scripts\python.exe manage.py check --deploy
```

Results:

- Bun: `1.3.8`
- Node: `v24.13.0`
- Python: `3.12.12`
- Frontend lint: failed because `client/node_modules` is not installed, so `next` is unavailable.
- Backend check: failed with current env because `FRONTEND` is missing.
- Backend check with temporary `FRONTEND=localhost` and `BACKEND=localhost`: passed with no issues.
- Backend deploy check with temporary host vars: warned about insecure/generated-style `SECRET_KEY`.

## Documentation Accuracy

The current `README.md` is useful but not fully accurate against code.

Needs correction:

- README says PostgreSQL is production recommended, but active settings use MySQL.
- README says Esewa integration exists, but code search did not show active Esewa implementation.
- README says duplicate `.env.example`, but no `.env.example` files were found.
- README says Shadcn/UI, which matches `components.json`, but the project also uses many Radix packages directly.
- README says strict separation and microservices principles; the repo is better described as a decoupled frontend/backend monorepo, not microservices.

## Prioritized Leftover Work

### P0 - Must Fix Before Reliable Production/Team Work

- Align backend env names:
  - Either change `.env` to include `FRONTEND` and `BACKEND`, or change `settings.py` to use `FRONTEND_URL` and `BACKEND_URL`.
- Create real `client/.env.example` and `server/.env.example` without secrets.
- Rotate production secrets exposed in local `.env` files if there is any chance they were shared or committed elsewhere.
- Add `/bookings`, `/newsletter`, and `/manual` to frontend protected/admin route lists if those pages must be admin-only.
- Decide one frontend package manager workflow and reinstall dependencies.
- Align `next`, `eslint-config-next`, and lint scripts.
- Stop tracking runtime logs/media that are not intentional fixtures.

### P1 - Important Architecture and Correctness Work

- Replace `FloatField` money fields with `DecimalField` and migrate carefully.
- Decide the real payment scope: COD only, Stripe, Esewa, or both. Remove stale claims or implement missing backend verification flows.
- Add backend tests for order creation, duplicate transaction IDs, stock deduction, stock restoration, redeem-code limits, and role permissions.
- Add frontend smoke/type/lint checks after dependency install.
- Move large RTK Query API file into domain slices if it keeps growing.
- Make route protection derive from one source of truth used by sidebar links and proxy guard.
- Review custom security middleware for false positives and observability.

### P2 - Maintainability Improvements

- Clean naming typos in a backward-compatible way where possible.
- Split booking measurement JSON into stricter schemas or typed tables if reporting/search grows.
- Add root scripts for common tasks:
  - install frontend
  - install backend
  - run frontend
  - run backend
  - lint/check/test
- Add CI with at least:
  - frontend typecheck/lint
  - backend `manage.py check`
  - backend tests
- Reduce broad `any` usage in high-risk flows: checkout, orders, products, auth.
- Remove or complete empty/stale modules such as the empty Stripe payment component.

## Overall Assessment

The project has a solid amount of implemented business functionality: storefront, admin, products, variants, stock, checkout, orders, discounts, reviews, bookings, analytics, email, and dynamic layout settings. The strongest architectural choice is the clear Next/Django split with a centralized RTK Query client and DRF backend apps by domain.

The main weakness is operational consistency. The repo currently has enough config drift that a fresh developer cannot reliably run checks without discovering missing env names, missing examples, missing frontend dependencies, package-version mismatch, and docs that describe features not actually wired. Fixing those DX and security gaps should come before adding more business features.
