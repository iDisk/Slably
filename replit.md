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

- `users` — id, name, email, password_hash, role (builder|client)
- `projects` — id, builder_id, client_id, client_name, client_email, name, address, status, start_date, notes, progress
- `contracts` — id, project_id, title, file_url, version, status (draft|sent|signed)
- `change_orders` — id, project_id, title, description, amount, status (draft|pending|approved|rejected), created_by, approved_by, approved_at
- `photos` — id, project_id, file_url, caption, visible_to_client, uploaded_by
- `activity_logs` — id, project_id, type, description, created_by

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
