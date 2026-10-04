# Fernleaf Kitchen Operations Admin Panel

## 1. Overview

**Fernleaf Kitchen Operations Admin Panel** is an internal operations and administrative management application built for high-volume B2B meal delivery operations.

In corporate food-service operations, meal delivery is not a generic consumer shopping cart. It requires a synchronized operational pipeline across companies, corporate employees, multiple culinary stations, delivery routing, fleet drivers, and contract billing.

The application solves the end-to-end operational coordination problem through a strict, sequential workflow:

```
Employee / Staff Order Creation
  → Cutoff Execution / Operational Confirmation
    → Kitchen Station Production (Prep Units)
      → Dispatch Consolidation (Drop Grouping & Driver Assignment)
        → Driver Mobile Manifest & Delivery Completion
          → Corporate Invoicing & Billing
```

This internal administration portal provides tailored interfaces and strict server-side access controls for the four primary operational personas: **Administrators**, **Kitchen Staff**, **Dispatch Officers**, and **Fleet Drivers**.

---

## 2. Tech Stack

The system is implemented as a TypeScript monorepo using npm workspaces (`apps/web` and `apps/api`), avoiding unnecessary microservice overhead:

| Layer / Technology | Role in System |
|-------------------|----------------|
| **Next.js 16.3 (React 19)** | Responsive frontend client with React Server Components, App Router, and role-tailored operational views. |
| **Tailwind CSS v4** | Clean, dark/light neutral styling optimized for high-density tabular and card data displays. |
| **NestJS 10.4** | Authoritative backend application server managing domain modules, DTO validation pipes, and RBAC guards. |
| **Prisma ORM 5.22** | Type-safe database queries, schema migrations, snapshot persistence, and relation mapping. |
| **PostgreSQL on Neon** | Serverless cloud relational database hosting transactional data with foreign-key constraints and indexes. |
| **JWT (`@nestjs/jwt`)** | Stateless cryptographic tokens conveying authenticated identity, role, and permission claims. |
| **bcryptjs** | Salted cryptographic password hashing for operational staff credentials. |
| **TypeScript 5.6** | End-to-end static type safety shared across domain models, API payloads, and frontend state. |

---

## 3. Architecture

The system utilizes a **Modular Monolith** architecture communicating over clean HTTP/JSON boundaries:

```
┌────────────────────────────────────────────────────────┐
│            Browser Client (Next.js 16 App Router)      │
│     Admin Portal | Kitchen KDS | Dispatch | Driver     │
└───────────────────────────┬────────────────────────────┘
                            │ HTTP / JSON REST APIs
                            ▼
┌────────────────────────────────────────────────────────┐
│                 NestJS Modular Monolith                │
│ ┌───────────────┬───────────────────┬────────────────┐ │
│ │  Auth / RBAC  │ Company / Emp     │ Catalogue      │ │
│ ├───────────────┼───────────────────┼────────────────┤ │
│ │  Menu/Pricing │ Orders & Snapshots│ Cutoff Engine  │ │
│ ├───────────────┼───────────────────┼────────────────┤ │
│ │  Kitchen KDS  │ Dispatch / Drops  │ Driver Portal  │ │
│ ├───────────────┴───────────────────┴────────────────┤ │
│ │  Billing & Invoicing                               │ │
│ └─────────────────────────┬──────────────────────────┘ │
└───────────────────────────┼────────────────────────────┘
                            │ Prisma ORM Client
                            ▼
┌────────────────────────────────────────────────────────┐
│            PostgreSQL (Neon Cloud Database)            │
└────────────────────────────────────────────────────────┘
```

### Why a Modular Monolith?
- **Shared Data & Transactions:** Orders, kitchen preparation units, dispatch drops, and invoices are tightly coupled lifecycle states of the same operational pipeline. Transactions span domain boundaries (e.g., confirming an order creates prep units; marking a drop delivered updates orders).
- **Simplicity & Velocity:** Avoids network hops, distributed transaction coordination (Sagas/2PC), and service-mesh overhead.
- **Clear Domain Boundaries:** NestJS enforces separation of concerns through explicit modules (`AuthModule`, `CompanyModule`, `CatalogueModule`, `PricingModule`, `MenuModule`, `OrdersModule`, `CutoffModule`, `KitchenModule`, `DispatchModule`, `BillingModule`), keeping business rules isolated and maintainable.

---

## 4. Why Business Logic Lives in the Backend

The frontend client is treated as an untrusted presentation layer. All authoritative operations and business calculations are executed exclusively within NestJS services:

1. **Client Agnostic:** The same business rules and validations apply identically whether called by the Next.js web application, a driver mobile portal, or future automated integrations.
2. **Authoritative Pricing & Totals:** Dish unit prices, option group surcharges, line totals, and order totals are calculated exclusively on the server using active price tier snapshots. Client-submitted prices are never accepted.
3. **State Machine Integrity:** Transitions between order states (`DRAFT` → `PLACED` → `CONFIRMED` → `DELIVERED`), kitchen units (`PENDING` → `STARTED` → `DONE`), and dispatch drops (`KITCHEN_READY` → `DISPATCH_READY` → `OUT_FOR_DELIVERY` → `DELIVERED`) are enforced by backend state validation.
4. **Data Isolation:** Fleet drivers can only retrieve drops assigned to their authenticated user ID, and cannot view other drivers' routes or corporate billing information.

---

## 5. Authentication & RBAC

The backend utilizes JWT-based authentication combined with granular, permission-based Role-Based Access Control (RBAC):

- **Password Security:** Credentials are salted and hashed using `bcryptjs` with a work factor of 10. Passwords are never returned in responses.
- **Stateless Tokens:** Signed JWT tokens contain user ID (`sub`), email, assigned role, and an array of granular operational permissions (e.g., `order.create`, `kitchen.update`, `dispatch.read`, `delivery.update`, `billing.read`).
- **Guard Architecture:** Every protected route is guarded by `JwtAuthGuard` and `PermissionsGuard` using the `@RequirePermissions(...)` decorator.

### Roles & Access Boundaries

| Role | Access Boundary & Responsibilities |
|------|-----------------------------------|
| **ADMIN** | Full platform access. Manages companies, employees, catalogue dishes, price tiers, menus, cutoff triggers, drops, driver assignment, and billing invoices. |
| **KITCHEN** | Kitchen production screen. Filters prep queue by culinary station (Grill & Tandoor, Cold & Salad, Hot Kitchen, etc.), starts cooking (`STARTED`), and completes dishes (`DONE`). |
| **DISPATCH** | Dispatch dashboard. Automatically groups confirmed orders into drops by delivery location/time, assigns active fleet drivers, and transitions drops to `DISPATCH_READY` and `OUT_FOR_DELIVERY`. |
| **DRIVER** | Mobile driver interface. View assigned delivery drops for the day, review company drop notes, and mark orders `DELIVERED` with proof of delivery notes. |

### Operational Test Accounts

The database includes the four required accounts with pre-configured permissions:

| Role | Email | Password |
|------|-------|----------|
| **Admin** | `admin@test.com` | `Test@1234` |
| **Kitchen** | `kitchen@test.com` | `Test@1234` |
| **Dispatch** | `dispatch@test.com` | `Test@1234` |
| **Driver** | `driver@test.com` | `Test@1234` |

---

## 6. Implemented Features

### Company & Employee Management
- Multi-company directory with billing contacts, default packaging rules, driver delivery notes, and configurable dispatch prep buffer minutes (`minutesBeforeDelivery`).
- Multiple delivery addresses per company (e.g., HQ Tower, Innovation Campus), with designated default addresses.
- Corporate operating schedule: working days per week (Mon–Fri active) and company-specific holiday calendars.
- Employee profiles linked to companies with granular permissions (`canChooseAddress`, `canChangeDeliveryTime`, `canChangePackaging`) and recorded dietary preferences/allergens.

### Catalogue
- Structured hierarchy of dishes with portions (Regular, Large, Mini) and assignment to specialized **Kitchen Stations** (`Hot Kitchen`, `Cold & Salad Station`, `Grill & Tandoor`, `Bakery & Dessert`, `Beverage Bar`).
- Modifiers & options structured into **Option Groups** with configurable rules (optional vs. required option groups).
- Allergen tags (Peanuts, Dairy, Gluten, Shellfish, Soy, Tree Nuts) and dietary tags (Vegetarian, Vegan, Gluten-Free, High-Protein, Keto-Friendly).

### Menu & Pricing
- Menus structured into categories (`Power Protein Bowls & Mains`, `Artisan Salads & Sandwiches`, `Desserts & Cold Drinks`).
- Multi-tier contract pricing system (`Default`, `Corporate`, `Premium`).
- Dynamic company menu resolution: companies resolve dishes and options through their assigned price tier.
- Visibility controls: company-specific hidden categories and hidden dishes (e.g., restricting premium desserts or specific SKUs from corporate contract menus).

### Order Management
- Multi-item shopping cart and order creation supporting multiple dishes per order, portion selections, item customizations, and line-item notes.
- **Combinations Rule:** Each dish quantity can be configured into distinct preparation combinations (customized modifiers), with strict backend validation ensuring combination quantities add up exactly to the total dish quantity.
- Authoritative server-side price calculation: totals are calculated by summing `(dishPrice + sum(optionPrices)) * quantity`.
- Lifecycle progression: `DRAFT` → `PLACED` → `CONFIRMED` → `DELIVERED` (with support for `CANCELLED` and `REJECTED`).
- Audit timeline: Every status change creates an immutable `OrderTimeline` audit record.

### Historical Snapshots
To protect historical accounting, placing an order writes immutable snapshots:
- Dish name and dish unit price at time of order are snapshotted on `Combination`.
- Option names and option prices are snapshotted on `CombinationOption`.
- Company delivery address (label, address lines, city, pincode) is snapshotted directly on `Order`.
- **Reason:** Future catalogue renames, ingredient price hikes, tier renegotiations, or company office moves will never distort past orders or financial invoices.

### Cutoff Execution
- Enforces the operational boundary between customer ordering and kitchen production.
- **Rule:** When cutoff is executed for a target date, all `DRAFT` orders are transitioned to `CANCELLED`, while all submitted `PLACED` orders are transitioned to `CONFIRMED`.
- Idempotent execution: Running cutoff multiple times safely ignores already processed orders.
- Manual trigger: Admin triggerable via dashboard (`POST /cutoff/run`) or automated date evaluation based on kitchen working days.

### Kitchen (Kitchen Display System / KDS)
- Once an order becomes `CONFIRMED`, each distinct dish combination generates a trackable `KitchenUnit`.
- Prep units route to their dish's designated kitchen station (`Grill & Tandoor`, `Cold & Salad`, etc.).
- State progression: `PENDING` → `STARTED` → `DONE`.
- Automatically stamps `kitchenStartedAt` on the order upon first unit start, and stamps `kitchenReadyAt` once all prep units for the order reach `DONE`.
- Station filtering in the UI enables cooks to isolate orders assigned to their physical cooking station.

### Dispatch / Drops
- **Drop Grouping:** Aggregates all confirmed orders sharing the exact same **Company**, **Delivery Address**, and **Delivery Time** into a single consolidated delivery `Drop`.
- Drop status progression: `KITCHEN_READY` → `DISPATCH_READY` → `OUT_FOR_DELIVERY` → `DELIVERED`.
- Dispatch officer assigns active drivers dynamically (`POST /drops/:id/assign-driver`).
- Prevents invalid state jumps (e.g., cannot mark `OUT_FOR_DELIVERY` without an assigned driver, cannot deliver an un-dispatched drop).

### Driver Mobile Portal
- Dedicated driver view (`/driver`) querying only drops assigned to the logged-in driver (`GET /driver/drops/today`).
- Driver reviews delivery address, company security/gate instructions, packaging types, and order contents.
- Drivers can initiate trip progression and submit Proof of Delivery (`POST /driver/drops/:id/delivered`) with recipient notes, automatically completing the drop and updating all included orders to `DELIVERED`.

### Billing & Invoicing
- Billable orders (`CONFIRMED` or `DELIVERED`) are grouped into invoices per company.
- Strict constraint: An order can belong to at most one invoice (`InvoiceOrder` unique relation).
- Authoritative invoice totals in integer paise derived directly from snapshotted order totals.
- Administrative invoice generation (`POST /billing/invoices`) and ledger review.

---

## 7. Data Model

The data model is structured around relational domain boundaries and transactional lifecycles:

```
[User] ──► [Role] ──► [Permission]
   │
   ▼ (driver assignment)
 [Drop] ──► [DropOrder] ──► [Order] ◄── [Employee] ◄── [Company] ──► [CompanyAddress]
   ▲                          │                                └──► [PriceTier]
   │ (grouping)                ├──► [OrderTimeline]
   │                          └──► [Combination] ──► [KitchenUnit]
   │                                     │
   │                                     ├──► [Dish] ──► [KitchenStation]
   │                                     │        └──► [DishPrice]
   │                                     └──► [CombinationOption] ──► [Option]
   │
[Invoice] ──► [InvoiceOrder] ──► [Order]
```

### Key Relationships & Purpose
- **`Company` → `PriceTier` & `CompanyAddress`:** Determines contracted pricing multipliers and physical delivery destinations.
- **`Order` → `Combination` → `KitchenUnit`:** A single customer order may consist of multiple dishes with different modifier combinations. Each distinct combination is an independent culinary prep unit routed to a specific kitchen station.
- **`Drop` → `DropOrder` → `Order`:** Many individual orders belonging to employees at the same company address are consolidated into a single physical dispatch vehicle drop.
- **`Invoice` → `InvoiceOrder` → `Order`:** Invoices aggregate billable orders into consolidated B2B statements without duplicating monetary data.

---

## 8. Data Consistency & Business Rules

### Money as Integer Paise
All monetary values (`totalInPaise`, `unitPriceInPaise`, `costInPaise`, `priceInPaise`) are strictly represented and stored as **integer paise** (₹1.00 = 100 paise).
- **Reason:** Floating-point numbers in JavaScript (`0.1 + 0.2 !== 0.3`) introduce fractional penny drift over large order volumes. Storing exact integers eliminates rounding discrepancies in invoice totals and taxes.

### Server-Enforced State Machines
State changes are strictly validated against allowable transition graphs:
- Orders: `DRAFT` → `PLACED` → `CONFIRMED` → `DELIVERED` (or `CANCELLED`).
- Drops: `KITCHEN_READY` → `DISPATCH_READY` → `OUT_FOR_DELIVERY` → `DELIVERED`.
- Direct manual transitions that violate operational rules (e.g. attempting to dispatch an unassigned drop or deliver an unconfirmed order) return HTTP 400 Bad Request.

### Database Constraints & Indexes
- Foreign key cascading deletes are applied to dependent line items and combinations, while preventing deletion of referenced orders in drops or invoices.
- Composite unique constraints (`@@unique([companyId, categoryId])`, `@@unique([dishId, priceTierId])`, `@@unique([orderId])` on `InvoiceOrder`) enforce data integrity at the database level.
- Multi-column indexes on high-frequency query paths (`status`, `deliveryDate`, `companyId`, `driverId`).

### Transactions for Consistency
Where operations cross multiple entities (e.g., placing an order with combination options and timeline entries, marking a drop delivered and syncing contained orders, or generating an invoice across orders), execution is wrapped in Prisma interactive transactions (`prisma.$transaction(async (tx) => { ... })`).

---

## 9. Demo / Seed Data

The project includes an operational seed file (`prisma/seed.ts`) that populates realistic data:

- **Operational Staff:** The 4 required live staff accounts (`admin@test.com`, `kitchen@test.com`, `dispatch@test.com`, `driver@test.com`).
- **Companies:** 3 realistic corporate accounts (*Acme Tech Corp*, *TechNova Labs*, *Global Zenith Capital*) with addresses, working schedules, and holiday calendars.
- **Employees:** 9 employee profiles with varying dietary tags, allergens, and address permissions.
- **Catalogue & Stations:** 8 dishes across 5 kitchen stations (*Grill & Tandoor*, *Cold & Salad Station*, *Hot Kitchen*, *Bakery & Dessert*, *Beverage Bar*) and 8 customizable options across 3 option groups.
- **Tiered Pricing:** 3 price tiers (*Default*, *Corporate*, *Premium*) with full pricing matrices.
- **Operational Review Orders:** Relative demo orders generated for the active review date (`todayDate`), tomorrow (`tomorrowDate`), and yesterday (`yesterdayDate`), ensuring that reviewers immediately see live kitchen prep units, dispatch drops, assigned driver routes, and invoices.

---

## 10. What Was Prioritized

Given the broad scope of a 20-hour engineering assignment, implementation strictly prioritized the core operational workflow and all **[Must]** functional requirements:

1. **Authentication & RBAC:** Complete JWT infrastructure, bcrypt password hashing, and role/permission enforcement across all endpoints.
2. **Core Operations Backend:** Complete data models for companies, catalogue, tiered pricing, orders, combinations, and options.
3. **Server-Side Order Validation:** Multi-item cart calculation, combination quantity equality validation, and historical snapshotting.
4. **Cutoff Engine:** Order cutoff workflow transitioning drafts to cancelled and placed orders to confirmed.
5. **Kitchen Production (KDS):** Prep unit generation, culinary station routing, and kitchen timestamp progression.
6. **Dispatch & Drop Grouping:** Automated aggregation by company/address/delivery time and dynamic driver assignment.
7. **Driver Manifest & Delivery:** Driver-isolated delivery portal with Proof of Delivery completion.
8. **Billing & Invoices:** B2B invoice generation ensuring single-invoice order attachment and derived total calculations.
9. **Responsive Operational UI:** Focused dashboards for Admin, Kitchen, Dispatch, and Driver roles.

---

## 11. Skipped / Simplified / Deferred Features

To maintain high code quality and strict business rule correctness within the available timeline, the following features from the extended assignment scope were intentionally deferred or simplified:

### Automated Background Cron Scheduler for Cutoff
**Status:** Simplified  
**Why:** Implementing a distributed queue worker (such as BullMQ or Redis-based cron jobs) adds infrastructure complexity and third-party daemon dependencies not required for evaluating core business logic.  
**Impact:** Cutoff logic is fully implemented on the server and triggerable manually by administrators via the dashboard button or `POST /cutoff/run`, rather than running on a hidden server cron schedule.

### Real-Time WebSocket Push Updates
**Status:** Deferred  
**Why:** WebSockets/Socket.io require complex connection state handling, reconnection fallbacks, and multi-tenant room management.  
**Impact:** Operational screens (Kitchen KDS, Dispatch Board, Driver Portal) use standard REST API requests and manual/action-triggered refresh rather than real-time WebSockets.

### Third-Party Payment Gateway Integration
**Status:** Deferred  
**Why:** Corporate B2B contract catering is billed on net-30/net-60 corporate invoice terms rather than real-time credit card checkout (Stripe/Razorpay).  
**Impact:** The billing module generates authoritative GST-ready invoices, invoice numbers, line item aggregations, and integer-paise totals, but does not process consumer credit card transactions.

### GPS Telematics & Live Map Tracking
**Status:** Simplified  
**Why:** Live mobile geolocation streaming requires native device background GPS services and third-party map APIs (Google Maps / Mapbox).  
**Impact:** Driver delivery tracking uses authenticated delivery manifests and recipient Proof of Delivery notes (`POST /driver/drops/:id/delivered`) rather than live GPS vehicle map markers.

### Advanced Multi-Ingredient Inventory Stock Depletion
**Status:** Deferred  
**Why:** Raw inventory tracking across individual ingredients (e.g. grams of flour, milliliters of oil) is a separate ERP domain beyond the operational order-to-delivery pipeline.  
**Impact:** Dishes have cost records (`costInPaise`) and kitchen prep units, but raw ingredient depletion is not tracked.

---

## 12. Testing & Validation

The codebase was validated using automated TypeScript test scripts and manual end-to-end operational testing:

### Automated Test Suites
- **Full End-to-End Workflow (`test_full_workflow.ts`):** Validates the entire pipeline: staff login → menu resolution → multi-dish order creation → order placement → cutoff execution → order confirmation → kitchen prep unit routing → kitchen completion timestamps → drop grouping → driver assignment → driver delivery completion → billing invoice generation (100% PASS).
- **Stabilization Test Suite (`test_stabilization.ts`):** 57 automated assertions covering authentication, RBAC permission rejection, multi-item orders, kitchen station filtering, unassigned drop filtering, driver isolation, and invoice generation.
- **Driver Assignment & Dynamic Listing (`test_driver_assignment.ts`):** Tests driver discovery (`GET /drops/drivers`) and drop assignment.
- **Kitchen Station Routing (`test_kitchen_station.ts`):** Tests prep unit station filtering and `PENDING` → `DONE` direct completion timestamp population.
- **Driver Delivery Action (`test_driver_delivery_action.ts`):** Tests authenticated driver delivery completion and order status synchronization.

### Build Verification
- Backend build: `npm run build:api` compiles cleanly (`nest build`) with 0 errors.
- Frontend build: `npm run build:web` compiles cleanly (`next build`) with 0 errors across all routes.

---

## 13. Running the Project

### Prerequisites
- Node.js (v18.x or v20.x recommended)
- npm (v9.x or v10.x)
- Neon PostgreSQL database instance (or standard PostgreSQL)

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Create a `.env` file in the project root:
```ini
# Neon PostgreSQL Connection URLs
DATABASE_URL="postgresql://user:password@ep-xyz-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require"
DIRECT_URL="postgresql://user:password@ep-xyz.us-east-2.aws.neon.tech/neondb?sslmode=require"

# JWT Authentication Secret
JWT_SECRET="fernleaf-super-secure-production-jwt-secret-key-2026"

# Frontend API URL
NEXT_PUBLIC_API_URL="http://localhost:3001"
```

### 3. Database Migration & Seed
```bash
# Push schema to database
npm run prisma:push

# Seed roles, operational accounts, catalogue, companies, and review orders
npm run prisma:seed
```

### 4. Start Development Servers
Run the NestJS API and Next.js frontend in separate terminal windows:

```bash
# Terminal 1: Backend API (runs on http://localhost:3001)
npm run dev:api

# Terminal 2: Frontend Web App (runs on http://localhost:3000)
npm run dev:web
```

---

## 14. Demo Credentials

All test accounts use the standard password specified in the assignment:

| Role | Email | Password |
|------|-------|----------|
| **Admin** | `admin@test.com` | `Test@1234` |
| **Kitchen** | `kitchen@test.com` | `Test@1234` |
| **Dispatch** | `dispatch@test.com` | `Test@1234` |
| **Driver** | `driver@test.com` | `Test@1234` |

---

## 15. Reviewer Walkthrough

To review the complete operational workflow from end to end:

1. **Login as Admin:**
   - Navigate to `http://localhost:3000/login` and log in with `admin@test.com` / `Test@1234`.
   - Review the **Dashboard** metrics (Total Orders, Active Kitchen Units, Pending Drops, Revenue).
2. **Create & Place a Multi-Item Order:**
   - Go to **Orders** → **New Order** (`/orders/create`).
   - Select an employee (e.g. *Rohan Sharma* from *Acme Tech Corp*).
   - Add multiple dishes to the cart (e.g., *Mediterranean Grilled Chicken Bowl* with *Extra Grilled Chicken* + *Super Green Avocado Salad*).
   - Submit the order to create a `DRAFT` order.
   - Click **Place Order** to transition it to `PLACED`.
3. **Execute Cutoff:**
   - Click **Run Cutoff** on the Orders page or Dashboard.
   - Observe that the placed order transitions to `CONFIRMED`.
4. **Kitchen Production (KDS):**
   - Log out and log in as `kitchen@test.com` / `Test@1234`.
   - Navigate to `/kitchen`.
   - Filter by kitchen stations (*Grill & Tandoor*, *Cold & Salad Station*).
   - Click **Start Prep** (`STARTED`) and **Mark Done** (`DONE`) on the prep units.
5. **Dispatch Management:**
   - Log out and log in as `dispatch@test.com` / `Test@1234`.
   - Navigate to `/dispatch`.
   - Review the auto-grouped drop for Acme Tech Corp.
   - Click **Assign Driver** and select `Primary Fleet Driver (driver@test.com)`.
   - Click **Mark Dispatch Ready**, then click **Dispatch Drop** to move to `OUT_FOR_DELIVERY`.
6. **Driver Portal:**
   - Log out and log in as `driver@test.com` / `Test@1234`.
   - Navigate to `/driver`.
   - View assigned drops for today, delivery instructions, and company addresses.
   - Click **Mark Delivered**, enter a confirmation note (e.g., "Handed over to front desk"), and confirm delivery.
7. **Billing & Invoices:**
   - Log back in as `admin@test.com` / `Test@1234`.
   - Navigate to `/billing`.
   - Select the delivered order and click **Generate Invoice**.
   - Review the generated invoice with exact total in paise.

---

## 16. Key Design Decisions

- **Modular Monolith over Microservices:** Preserves ACID transactions across order confirmation, prep unit routing, and drop creation without network latency or distributed failure modes.
- **Server Authority for Pricing & States:** Frontend calculations are purely informational; all prices, modifiers, combinations, and state transitions are authoritatively calculated and validated by NestJS services.
- **Integer Paise Representation:** Prevents floating-point precision drift across large B2B invoices and line items.
- **Historical Snapshots on Orders:** Decouples past orders from future catalogue price increases, menu restructurings, or company office moves.
- **Explicit Separation of Prep Units and Drops:** Orders are split into combinations for kitchen preparation, but consolidated by address and delivery time for physical dispatch.
- **Strict Role Boundaries:** Guards and permissions ensure drivers cannot access company invoices, and kitchen staff only interact with food preparation.

---

## 17. Future Improvements

The following architectural enhancements represent natural next steps for a production deployment:
- **Distributed Job Scheduler:** Integrating BullMQ with Redis for background cutoff execution and automated daily report generation.
- **Live Event Bus / WebSockets:** Implementing Socket.io or Server-Sent Events (SSE) for zero-latency kitchen KDS ticket updates.
- **Audit Logging Service:** Dedicated immutable audit trail recording every user action with IP address and user-agent metadata.
- **ERP & Accounting Integration:** Exporting generated invoices into accounting platforms (Tally, QuickBooks, SAP) via standard webhook integrations.
- **Native Mobile Driver App:** Packaging the driver portal as a React Native / Capacitor mobile application with hardware GPS location tracking and barcode camera scanning.

---

## 18. Final Notes

The **Fernleaf Kitchen Operations Admin Panel** has been engineered specifically around the core operational requirements of corporate kitchen logistics.

All core **[Must]** functional requirements—from authentication and tiered pricing to order placement, cutoff execution, kitchen station routing, drop consolidation, driver delivery, and billing—are fully implemented, enforced server-side, and verified through automated end-to-end tests.

The application is pre-seeded and ready for live evaluation using the provided test credentials.
