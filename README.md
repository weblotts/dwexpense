# Expense Bucket Tracker

Single-user personal expense tracker. Log daily spending against monthly budget
limits per category ("bucket"). Mobile-first, dark mode, no auth.

**Stack:** Nx monorepo · React 18 + Vite + TypeScript · Express + TypeScript ·
MongoDB (Mongoose) · TanStack Query v5 · Tailwind CSS · Axios.

## Layout

```
apps/
  client/   React + Vite frontend
  server/   Express + TypeScript API
libs/
  types/    Shared TS interfaces (Bucket, Expense, …)
```

## Prerequisites

- Node 18+
- MongoDB running locally (`mongodb://localhost:27017`), or set `MONGO_URI`.

## Run

```bash
npm install
npm run dev          # server (:5050) + client (:4200) together
```

Open http://localhost:4200. Default buckets are seeded automatically on first
start when the DB is empty.

Individual targets:

```bash
npm run dev:server   # nx serve server  (tsx watch, :5000)
npm run dev:client   # nx serve client  (vite, :4200)
npm run seed         # force-reseed the predefined buckets
npm run build        # build client + server
```

## Environment

`apps/server/.env`
```
PORT=5050
MONGO_URI=mongodb://localhost:27017/expense-tracker
```

`apps/client/.env`
```
VITE_API_URL=http://localhost:5050
```

## API (`/api`)

| Method | Route | Notes |
| ------ | ----- | ----- |
| GET | `/buckets` | buckets + current-month `spent`/`remaining` |
| PATCH | `/buckets/:id` | update `name` / `monthlyLimit` / `color` |
| GET | `/expenses?bucketId=&month=YYYY-MM` | filtered, date desc (defaults to current month) |
| POST | `/expenses` | `{ bucketId, amount, note?, date? }` (amount > 0) |
| DELETE | `/expenses/:id` | |

Errors use a consistent shape: `{ error: string, status: number }`.

## Monthly behaviour

Old expenses are never deleted. "Current month" is computed server-side from
year+month boundaries; `spent` on `GET /buckets` sums only the current month.
Past months are viewable on the History page via the month selector.
