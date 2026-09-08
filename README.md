# Organisation P&L

Local full-stack app for organisation, branch, and project profit & loss. All data lives in a SQLite file. There is no cloud database and no currency conversion in V1.

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
| `npm run db:seed` | Load ABC Technologies sample data (skipped if already present) |
| `npm run db:reset` | Delete the local SQLite files |

The database file is gitignored. Do not commit `*.db`.

## Seed scenario (September 2026)

- Organisation: **ABC Technologies**, currency **INR**
- Branches: Hyderabad, Bangalore
- Projects: Alpha (billable), Beta (billable), Internal Operations (non-billable)
- Employees: Ravi (50% Alpha / 30% Beta), Priya (60% Alpha / 20% Internal), John (70% Beta)
- Expenses include organisation insurance, branch rent, a 50/30/20 AWS split, and project-specific costs
- Invoices include paid, issued, and cancelled documents so you can confirm cancelled revenue is excluded

Use the dashboard period preset **Current month** while the system date is in September 2026, or pick a custom range of `2026-09-01` to `2026-09-30`.

## V1 behaviour

- One reporting currency per organisation. No FX or multi-currency transactions.
- Employees have no hire/leave dates; CTC is applied for the whole reporting period.
- Unallocated employee cost (CTC not assigned to projects) is an organisation cost.
- Organisation-wide expenses are **not** auto-allocated to branches or projects.
- Invoice status is user-managed. Revenue uses invoice date. `CANCELLED` invoices are excluded.
- Employee allocation changes insert a new history row; they do not overwrite old dates.

## Money

Amounts are stored as integer minor units (paise/cents). Calculations use `decimal.js` and round half-up per line so organisation employee cost always equals allocated + unallocated.
