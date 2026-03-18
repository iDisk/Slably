# BuildOS

**The Client Experience Platform for Construction**

A SaaS MVP for small/medium construction companies to centralize project management and improve client experience.

## Stack

- **Monorepo**: pnpm workspaces
- **Node.js**: v24
- **Frontend**: React + Vite + Tailwind CSS + shadcn/ui components (artifacts/buildos)
- **Backend**: Express 5 API server (artifacts/api-server)
- **Database**: PostgreSQL + Drizzle ORM
- **Auth**: JWT (bcryptjs + jsonwebtoken)
- **Validation**: Zod (OpenAPI-first with Orval codegen)
- **UI**: Tailwind CSS, lucide-react icons, framer-motion animations, sonner toasts

## Structure

```text
artifacts/
  api-server/         # Express 5 REST API
    src/
      lib/auth.ts     # JWT auth middleware
      lib/activity.ts # Activity log helper
      routes/
        auth.ts       # POST /auth/register, /login, /logout, GET /auth/me
        projects.ts   # CRUD /projects
        contracts.ts  # CRUD /projects/:id/contracts
        change_orders.ts # CRUD + approve/reject
        photos.ts     # CRUD /projects/:id/photos
        activity.ts   # GET /projects/:id/activity
  buildos/            # React SaaS frontend
    src/
      hooks/use-auth.tsx        # JWT auth context
      components/layout/
        BuilderLayout.tsx       # Sidebar nav for builders
        ClientLayout.tsx        # Top nav for clients
      pages/
        auth/Login.tsx          # Login page
        auth/Register.tsx       # Register page
        builder/Dashboard.tsx   # Project grid + stats
        builder/ProjectDetails.tsx # Tabbed project detail
        client/ClientDashboard.tsx # Client portal

lib/
  api-spec/openapi.yaml # OpenAPI 3.1 spec (source of truth)
  api-zod/              # Generated Zod schemas (server-side validation)
  api-client-react/     # Generated React Query hooks (frontend)
  db/src/schema/        # Drizzle ORM table definitions

scripts/src/seed.ts     # Demo data seeder
```

## Database Tables

- `organizations` — id, name, slug(UNIQUE auto-gen), created_at, updated_at
- `users` — id, organization_id(nullable FK→orgs), name, email, password_hash, role `pgEnum(user_role)`, indexes: email, role, organization_id
- `projects` — id, organization_id(NOT NULL FK→orgs), builder_id, client_id, client_name, client_email, name, address, status `pgEnum(project_status)`, start_date `DATE`, notes, progress; indexes: organization_id, builder_id, client_id, status
- `contracts` — id, project_id, title, file_url, version, status `pgEnum(contract_status)`; index: project_id
- `change_orders` — id, project_id, title, description, amount, status `pgEnum(change_order_status)`, created_by, approved_by, approved_at; indexes: project_id, status
- `photos` — id, project_id, file_url, caption, visible_to_client, uploaded_by; index: project_id
- `activity_logs` — id, project_id, type, description, created_by; indexes: project_id, created_at

## PostgreSQL Enums (live in DB)

| Enum name | Values |
|-----------|--------|
| `user_role` | builder, client |
| `project_status` | planning, active, on_hold, completed, cancelled |
| `contract_status` | draft, sent, signed |
| `change_order_status` | draft, pending, approved, rejected |

## Multi-tenant Architecture

- **Tenant = Organization** (`organizations` table, slug is unique)
- `projects.organization_id` — NOT NULL FK. All project queries filter by org.
- `users.organization_id` — nullable FK. Builders must have one (app-enforced). Clients can be null.
- **JWT payload**: `{ id, email, role, organizationId, organizationSlug }`
- **Builder register** → auto-creates org from user name, slug auto-generated (lowercase, hyphenated, unique).
- **Isolation guard**: `checkProjectAccess` in `api-server/src/lib/project-access.ts` — primary check is org match; secondary is role/clientId.
- Builder project list = all projects in their org (not just their own `builder_id`).

## User Roles

**Builder (Admin)**
- Dashboard with all projects, stats
- Create/edit/delete projects
- Upload contracts, mark as signed
- Create/edit change orders, send to client
- Upload photos, toggle client visibility
- View activity log

**Client**
- View their assigned project only
- View contracts (read-only)
- Approve/reject pending change orders
- View photos (only visible_to_client=true)

## Auth

- JWT stored in `localStorage` as `buildos_token`
- All API calls send `Authorization: Bearer <token>`
- `/api/auth/me` checks session on app load
- Roles enforced on both frontend routing and backend middleware

## Demo Credentials

- **Builder**: builder@buildos.demo / demo1234
- **Client**: client@buildos.demo / demo1234
- **Builder 2**: ana@buildos.demo / demo1234
- **Client 2**: maria@buildos.demo / demo1234
- **Client 3**: jorge@buildos.demo / demo1234

## Dev Commands

```bash
# Run codegen after OpenAPI spec changes
pnpm --filter @workspace/api-spec run codegen

# Push database schema
pnpm --filter @workspace/db run push

# Seed demo data
pnpm --filter @workspace/scripts run seed

# Typecheck all
pnpm run typecheck
```

## Security Hardening (Bloque 1 — complete)

- `JWT_SECRET` set as Replit shared env var (no hardcoded fallback)
- `express-rate-limit`: 10 req/15min on `/auth/login` (skip success), 5 req/hr on `/auth/register`; 200 req/15min global baseline
- CORS: Replit dev domains + explicit `ALLOWED_ORIGINS` env var for production
- Global error handler in `app.ts` (stack traces only in development)
- Startup env var validation: exits with error if `JWT_SECRET` or `DATABASE_URL` missing
- Request logging middleware (method + path + status + ms)

## Known Technical Debt

- `lib/api-zod/src/generated/api.ts` is manually edited (codegen would overwrite). Keep timestamps as `zod.coerce.date()` and `startDate` as `zod.string().nullable()`
- Global fetch monkey-patched in `App.tsx` to inject JWT headers
- `checkProjectAccess` helper copy-pasted across routes (contracts, change_orders, photos)

## Project Status (MVP v1)

- [x] Auth (register/login/logout, builder + client roles)
- [x] Builder dashboard (project grid + stats cards)
- [x] Projects CRUD (create, view, edit, delete)
- [x] Contracts module (upload, list, mark as signed)
- [x] Change orders (create, send to client, approve/reject)
- [x] Photos (upload, grid view, visibility toggle)
- [x] Client portal (project overview, contracts, change orders, photos)
- [x] Activity log (auto-recorded events)
- [x] Demo seed data (3 projects, contracts, change orders, photos)
- [x] Security hardening (rate limiting, JWT env var, CORS, error handler)
- [x] Schema hardening (pgEnum x4, 12 DB indexes, start_date as DATE, idempotent seed)
