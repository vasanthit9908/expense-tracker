# Organisation P&L

Full-stack app for organisation, branch, and project profit & loss. Data is stored in **MySQL** (connection from `DATABASE_URL` in `.env`). Each organisation has one reporting currency; expenses and invoices may use another currency and are booked into the base currency using a user-supplied exchange rate.

## Stack

- Next.js App Router + TypeScript
- MySQL via Drizzle ORM and `mysql2`
- shadcn/ui, Tailwind CSS, Recharts
- Vitest for the calculation engine (hierarchy tests need MySQL)

## Prerequisites

- Node.js 20 or later
- A MySQL 8+ server and an empty database (e.g. `company_expenditure`)

## Setup

1. Create a MySQL database.
2. Copy `.env.example` to `.env` and set `DATABASE_URL`:

```bash
DATABASE_URL=mysql://USER:PASSWORD@HOST:3306/company_expenditure
```

3. Install and initialise:

```bash
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Start the Next.js dev server |
| `npm run build` / `npm start` | Production build and server |
| `npm test` | Run tests (`DATABASE_URL` required for hierarchy tests) |
| `npm run db:migrate` | Create tables and indexes on MySQL |
| `npm run db:migrate -- --recreate` | Drop all tables and recreate schema (destructive) |
| `npm run db:seed` | Load ABC Technologies sample data (skipped if already present) |
| `npm run db:reset` | Drop and recreate empty schema |

Do not commit `.env`.

## Seed scenario (September 2026)

- Organisation: **ABC Technologies**, base currency **USD**
- Branches: Hyderabad, Bangalore
- Projects: Alpha (billable), Beta (billable), Internal Operations (non-billable)
- Employees: Ravi (50% Alpha / 30% Beta), Priya (60% Alpha / 20% Internal), John (70% Beta)
- Expenses mix USD costs (insurance, AWS, Cursor Pro) with **INR** branch bills booked via an exchange rate (e.g. electricity ₹83,000 @ 0.012 → $996)
- Invoices include USD project billing plus an **INR** branch invoice booked to USD; cancelled documents are excluded from revenue

Use the dashboard period preset **Current month** while the system date is in September 2026, or pick a custom range of `2026-09-01` to `2026-09-30`.

## V1 behaviour

- One **reporting/base currency** per organisation. P&L is always in that currency.
- Expenses and invoices may use another currency: store paid/billed currency + original amount + exchange rate; book `amount` into the org currency for P&L.
- Exchange rate meaning: **base-currency units per 1 unit of paid currency** (e.g. INR→USD rate `0.012`).
- Employees have no hire/leave dates; CTC is applied for the whole reporting period (in the org currency).
- Unallocated employee cost (CTC not assigned to projects) is an organisation cost.
- Organisation-wide expenses are **not** auto-allocated to branches or projects.
- Invoice status is user-managed. Revenue uses invoice date. `CANCELLED` invoices are excluded.
- Employee allocation changes insert a new history row; they do not overwrite old dates.

## Money

Amounts are stored as integer minor units (cents/paise). Calculations use `decimal.js` and round half-up per line so organisation employee cost always equals allocated + unallocated.

## Schema diagram (DBML)

The ER diagram source lives at [`src/db/schema.dbml`](src/db/schema.dbml). Paste it into [dbdiagram.io](https://dbdiagram.io) to view relationships.

When you change the database schema, update **all** of these together:

1. [`src/db/schema.ts`](src/db/schema.ts) — Drizzle ORM
2. [`src/db/sql.ts`](src/db/sql.ts) — MySQL DDL / init
3. [`src/db/schema.dbml`](src/db/schema.dbml) — dbdiagram.io diagram
