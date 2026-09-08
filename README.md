# Organisation P&L

Local full-stack app for organisation, branch, and project profit & loss. All data lives in a SQLite file. Each organisation has one reporting currency; expenses may be paid in another currency and are booked into the base currency using a user-supplied exchange rate.

## Stack

- Next.js App Router + TypeScript
- SQLite via Drizzle ORM and `@libsql/client` (`data/app.db`)
- shadcn/ui, Tailwind CSS, Recharts
- Vitest for the calculation engine

## Prerequisites

- Node.js 20 or later (Node 24 is fine)

## Setup

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
| `npm test` | Run financial calculation and validation tests |
| `npm run db:migrate` | Create `data/app.db`, tables, indexes, and enable foreign keys |
| `npm run db:migrate -- --recreate` | Drop all tables and recreate schema (destructive) |
| `npm run db:seed` | Load ABC Technologies sample data (skipped if already present) |
| `npm run db:reset` | Delete DB files, recreate empty schema |

The database file is gitignored. Do not commit `*.db`.

## Seed scenario (September 2026)

- Organisation: **ABC Technologies**, base currency **USD**
- Branches: Hyderabad, Bangalore
- Projects: Alpha (billable), Beta (billable), Internal Operations (non-billable)
- Employees: Ravi (50% Alpha / 30% Beta), Priya (60% Alpha / 20% Internal), John (70% Beta)
- Expenses mix USD costs (insurance, AWS, Cursor Pro) with **INR** branch bills booked via an exchange rate (e.g. electricity ₹83,000 @ 0.012 → $996)
- Invoices include paid, issued, and cancelled documents so you can confirm cancelled revenue is excluded

Use the dashboard period preset **Current month** while the system date is in September 2026, or pick a custom range of `2026-09-01` to `2026-09-30`.

## V1 behaviour

- One **reporting/base currency** per organisation. P&L is always in that currency.
- Expenses may be paid in another currency: store paid currency + original amount + exchange rate; book `amount` into the org currency for P&L.
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
2. [`src/db/sql.ts`](src/db/sql.ts) — SQLite DDL / init
3. [`src/db/schema.dbml`](src/db/schema.dbml) — dbdiagram.io diagram
