# Cadence — Run your business in rhythm.

A scheduling and operations management platform built for appointment-based businesses — including wellness clinics, salons, fitness studios, consulting practices, training centers, and service professionals.

Cadence combines client self-scheduling, operational calendar management, customer history tracking, invoice generation, simulated payment collection, and business analytics into a unified local-first web application.

---

## ⚡ Quick Start

Cadence runs entirely in the browser using a high-reliability, schema-versioned `localStorage` database. **No backend servers, no cloud databases, and no API keys or configuration files are required.**

```bash
# 1. Install dependencies
npm install

# 2. Start the local development server
npm run dev
```

Open the printed local URL (typically `http://localhost:5173`) in your browser to start exploring immediately.

### Key Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Starts Vite local development server with HMR |
| `npm run build` | Builds optimized production bundle to `dist/` |
| `npm run preview` | Previews the production build locally |
| `npm test` | Runs all Vitest test suites (23/23 passing) |
| `npm run lint` | Runs `oxlint` static code analysis |

---

## 🔑 Demo Accounts & One-Click Login

Cadence comes pre-seeded with **Nova Wellness Studio** (`/b/nova-wellness-studio`), a multi-staff acupuncture, massage, and wellness clinic with existing services, staff schedules, appointments, invoices, and customers.

On the `/login` screen, click any of the **Quick Demo Login** buttons to authenticate instantly:

| Role | Email | Password | Access & Permissions |
|---|---|---|---|
| **Business Owner** | `owner@novawellness.demo` | `demo1234` | Full access to operations, finances, settings, reports, staff management, and data backup |
| **Workspace Admin** | `admin@novawellness.demo` | `demo1234` | Calendar, appointments, customers, services, invoices, and reports |
| **Staff Member 1** | `staff1@novawellness.demo` | `demo1234` | Personal calendar, assigned appointments, customer notes, notifications |
| **Staff Member 2** | `staff2@novawellness.demo` | `demo1234` | Personal calendar, assigned appointments, customer notes, notifications |
| **Customer** | `customer@novawellness.demo` | `demo1234` | Self-service customer portal (`/portal`): view bookings, cancel within policy window, view invoice history |

*(Any password can also be entered manually as `demo1234`).*

---

## 🎨 Design System: Editorial Command Center

Cadence is built on the **Editorial Command Center** design direction, balancing high operational clarity with a tactile, premium editorial atmosphere:

- **Primary Dark (`#171B24`) & Secondary Ink (`#242A36`)**: Deep ink navigation bar and structured sidebar hierarchies.
- **Main Background (`#F4F5F1`)**: Warm neutral canvas that minimizes screen fatigue during daily operational use.
- **Electric Lime (`#C7F36B`)**: High-contrast active accent for key state indicators, selected navigation items, and callouts.
- **Soft Violet (`#7775E8`)**: Secondary accent for links, monetary metrics, and analytical curves.
- **Tabular Numerals**: Financial figures, timestamps, and metric counters use monospace or `font-variant-numeric: tabular-nums` to ensure exact column alignment.
- **Responsive Layout**: Adapts seamlessly from desktop command center to mobile bottom navigation.

---

## 🛠 Features & Capabilities

### 1. Public Booking Experience
- **Public Business Portal** (`/b/:slug`): Filterable service directory with duration, price, category badges, business contact details, and location.
- **Multi-Step Booking Wizard** (`/b/:slug/book`):
  1. Service selection
  2. Staff member selection (or "Any available specialist")
  3. Interactive calendar date picker
  4. Real-time time-slot calculation with live availability
  5. Customer details & special requests
  6. Review & instant confirmation
- **Booking Confirmation & Lookup** (`/b/:slug/book/confirmation/:code` & `/b/:slug/lookup`):
  - Branded confirmation cards with copyable `CAD-XXXXXX` booking references
  - Print receipt action (`window.print()`)
  - Public booking status lookup by reference code

### 2. Operational Command Center (`/app`)
- **Dashboard**:
  - Live greeting, date context, and business switcher
  - 4 Key KPI cards (Today's Bookings, Total Appointments, Revenue Collected, Outstanding Invoices)
  - Interactive Recharts 14-day revenue velocity area chart derived from real local records
  - Today's appointment schedule breakdown
  - Appointment status distribution chart
  - Recent transaction ledger & quick navigation actions
- **Calendar** (`/app/calendar`):
  - Day and week agenda views
  - Staff filtering and date navigation (Previous, Today, Next)
  - Color-coded appointment blocks
  - Direct modal booking from calendar
- **Appointments** (`/app/appointments`):
  - Search by client name, email, or booking reference
  - Status filters (Confirmed, In Progress, Completed, Cancelled, No-Show)
  - Detailed view (`/app/appointments/:id`): status progression following finite-state machine rules, internal notes, staff reassignment with conflict checks, invoice creation, and full activity timeline.
- **Customer Directory** (`/app/customers`):
  - Searchable client directory with total visit counters, lifetime spend, and outstanding balances
  - Customer Profile (`/app/customers/:id`): appointment history, billing & invoice records, contact details, and internal client notes.
- **Service Catalog** (`/app/services`):
  - Duration, pricing, buffer times (before/after), category groupings, and color coding
  - Safe deactivation/archiving preserving historical appointment integrity.
- **Staff Management** (`/app/staff`):
  - Team member roles (Owner, Admin, Staff)
  - Availability scheduler by weekday (`/app/staff/:id`)
  - Blocked time / leave manager withholding specific hours from client booking.
- **Invoices & Billing** (`/app/invoices`):
  - Draft, Issued, Paid, Partially Paid, Overdue, and Void states
  - Line-item editor with real-time tax calculation
  - Printable invoice layout (`/app/invoices/:id`) optimized for paper and PDF export.
- **Simulated Payment Gateway** (`/app/payments`):
  - Partial and full payment simulation
  - Test scenario selector (Success vs. Declined/Failed) to verify application resilience under payment failure conditions
  - Complete payment transaction ledger.
- **Business Reports** (`/app/reports`):
  - 30-day analytics powered by Recharts (Revenue curves, Booking volumes, Status distribution, Service popularity, Staff workload, Payment method breakdown, Client acquisition).
- **Settings & Data Management** (`/app/settings`):
  - Business information, timezone, currency, and brand color
  - Booking lead times, cancellation policy windows, and approval requirements
  - **Local Database Management**:
    - **Reset Demo Data**: Restores database to fresh, deterministic state with relative dates
    - **Export Database (JSON)**: Backs up entire database to a downloadable JSON file
    - **Import Database (JSON)**: Restores a previously exported JSON backup with schema validation.

### 3. Customer Self-Service Portal (`/portal`)
- **My Bookings**: View upcoming and past appointments, view specialist assignments, cancel bookings within business policy windows.
- **My Invoices**: Review issued invoices, paid amounts, and outstanding balances.
- **Profile**: Update customer name and contact phone number.

---

## 🏛 Local-First Architecture

Cadence has **zero remote backend dependencies**. All data is managed locally through an enterprise-grade client-side storage architecture located in `src/services/local/`:

```
src/services/
├── index.js             # Unified service exports (localProvider & localStore)
└── local/
    ├── localStore.js    # Schema-versioned (v1) storage engine, corruption recovery, backup/restore
    ├── localProvider.js # Business logic API contract, double-booking prevention, status state machine
    └── localStore.test.js # Storage reliability test suites
```

### Architectural Highlights

1. **Storage Isolation**:
   - `cadence:database:v1` — Core multi-table relational database (businesses, services, staff, appointments, customers, invoices, invoice_items, payments, notifications, activity logs).
   - `cadence:session:v1` — Authenticated demo session.
   - `cadence:preferences:v1` — User preferences (e.g., active business workspace).
   - Resetting demo data selectively purges only Cadence namespaces, leaving any unrelated domain keys untouched.
2. **Deterministic Relative Dates**:
   - Seed data uses relative time anchors (`now`, `+1 day`, `+2 days`, `-1 day`, `-3 days`) so that whenever the application is opened, the dashboard displays active appointments for *today*, *yesterday*, and the *upcoming week*.
3. **Double-Booking & Conflict Guarantees**:
   - Availability is calculated via `slotEngine.js` honoring staff working hours, buffer times, existing bookings, and blocked leave.
   - Double-booking is authoritatively rejected at submission inside `createBookingInternal`, ensuring no race conditions can create overlapping sessions.
4. **Finite State Machine for Appointments**:
   - Strict status transitions: `pending` → `confirmed` → `checked_in` → `in_progress` → `completed`.
   - Idempotent updates prevent invalid transitions while permitting redundant status updates.
5. **Corruption Recovery**:
   - If corrupted or invalid JSON is detected in `localStorage`, the engine automatically repairs the store, reloads clean seed records, logs a warning notice, and prevents white-screen crashes.

---

## 🧪 Testing & Verification

The application is thoroughly verified across unit tests, static linting, and production builds:

```bash
# Run Vitest test suites
npm test

# Expected Output:
# ✓ src/utils/slotEngine.test.js (7 tests)
# ✓ src/services/local/localStore.test.js (5 tests)
# ✓ src/services/demo/demoProvider.test.js (11 tests)
# Test Files  3 passed (3)
# Tests       23 passed (23)

# Run oxlint
npm run lint

# Expected Output:
# Found 4 warnings (Fast Refresh conventions) and 0 errors.

# Run production build
npm run build

# Expected Output:
# ✓ built in ~2.2s (0 errors)
```

---

## 📄 License

MIT. Built with craft for appointment-driven businesses. Run your business in rhythm.
