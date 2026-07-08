# Self-Administered IAM System

A Node.js, Express, PostgreSQL, and Prisma backend that mimics AWS-style IAM evaluation with users, groups, managed/inline policies, permissions boundaries, protected resource routes, and self-administered IAM management routes.

## Prerequisites

- Node.js 18+
- PostgreSQL 14+
- npm

## Backend Setup

```bash
cd backend
npm install
```

Create `backend/.env`:

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/iam_system?schema=public"
PORT=5000
JWT_SECRET="replace-with-a-long-random-secret"
JWT_EXPIRES_IN="1d"
```

Environment variables:

- `DATABASE_URL`: PostgreSQL connection string used by Prisma.
- `PORT`: Express server port. Example: `5000`.
- `JWT_SECRET`: Secret used to sign JWT access tokens.
- `JWT_EXPIRES_IN`: JWT lifetime. Example: `1d`.

Run migrations, generate Prisma Client, and seed the assessment data:

```bash
npx prisma migrate dev
npx prisma generate
npm run seed
```

Start the backend in development mode:

```bash
npm run dev
```

The API runs at `http://localhost:5000` by default.

## Seed Credentials

| User | Email | Password | Notes |
| --- | --- | --- | --- |
| Root | `root@org.local` | `root1234` | Bypasses all IAM checks |
| Alice | `alice@org.local` | `alice1234` | Member of Viewers group |
| Bob | `bob@org.local` | `bob1234` | No initial permissions |
| Charlie | `charlie@org.local` | `charlie1234` | No initial permissions |

Seeded IAM data:

- `ReadOnlyAccess` managed policy allows reports list/read, alerts list/read, and audit list/read.
- `ReportsFullAccess` managed policy allows all report actions.
- `Viewers` group has `ReadOnlyAccess` attached and Alice as a member.

## Auth

Use `Authorization: Bearer <token>` for every protected request.

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`

## Protected Resource Routes

Each route returns `{ "success": true, "message": "OK" }` after passing IAM middleware.

- Reports: `GET /api/reports`, `GET /api/reports/:id`, `POST /api/reports`, `PUT /api/reports/:id`, `DELETE /api/reports/:id`
- Alerts: `GET /api/alerts`, `GET /api/alerts/:id`, `POST /api/alerts`, `PATCH /api/alerts/:id/acknowledge`, `DELETE /api/alerts/:id`
- Settings: `GET /api/settings`, `PUT /api/settings`
- Audit: `GET /api/audit`, `GET /api/audit/:id`

## IAM Routes

All IAM routes require authentication and the matching `iam:*` permission, except root which bypasses IAM checks.

- Policies: `/api/iam/policies`
- Groups: `/api/iam/groups`
- Users: `/api/iam/users`
- Valid action helper for frontend builders: `GET /api/iam/actions`

The backend enforces:

- Explicit deny wins over allow.
- Missing allow is an implicit deny.
- Permissions boundaries cap access and never grant permissions by themselves.
- Delegation bypass prevention on policy create/update and policy attachment.
- Root-only boundary set/remove.
- Non-root users cannot modify the root user's access.
- **Inline Policies**: Attached to exactly one user or group on creation. They are automatically deleted when detached or when their owner is deleted, and do not appear as reusable managed policies in attachment dropdowns.
- **Policy Deletion Modals**: Display attachments for managed policies. Non-root users are blocked from deleting attached managed policies, while root user can force deletion.

## Frontend Setup Guide

Create a Vite React app inside `frontend` when you are ready:

```bash
cd frontend
npm create vite@latest . -- --template react
npm install axios react-router-dom
npm run dev
```

Expected frontend files and responsibilities:

| File | Expected responsibility |
| --- | --- |
| `src/api/client.js` | Axios instance with `baseURL`, bearer token injection, and 401 handling. |
| `src/api/auth.js` | `login`, `register`, `logout`, `me` API helpers. |
| `src/api/resources.js` | One function per dashboard action route. |
| `src/api/iam.js` | Policies, groups, users, boundaries, and action-list API helpers. |
| `src/constants/resourceActions.js` | The 14 non-IAM dashboard actions, grouped by reports/alerts/settings/audit. |
| `src/context/AuthContext.jsx` | Store logged-in user/token, expose login/logout, root indicator. |
| `src/App.jsx` | React Router route tree and protected layout. |
| `src/layout/AppLayout.jsx` | Persistent nav: Dashboard, Policies, Groups, Users, logged-in name, root badge, logout. |
| `src/pages/Login.jsx` | Email/password form, redirect to `/dashboard` on success, show errors. |
| `src/pages/Register.jsx` | Name/email/password form, redirect to `/login` on success. |
| `src/pages/Dashboard.jsx` | Buttons/cards for all 14 resource actions; show green success, red access denied, redirect on 401. |
| `src/pages/iam/Policies.jsx` | Policy table with name, type, statement count, created date, create button. |
| `src/pages/iam/PolicyForm.jsx` | Structured statement builder: Effect toggle, Action multi-select, fixed `Resource: ["*"]`, live JSON preview. |
| `src/pages/iam/PolicyDetail.jsx` | Render full statements and policy user/group attachments. |
| `src/pages/iam/Groups.jsx` | Group table with member count, policy count, create/edit/delete actions. |
| `src/pages/iam/GroupDetail.jsx` | Members table, add/remove user, attached policies table, attach/detach managed policy. |
| `src/pages/iam/Users.jsx` | User table with root flag, group count, direct policy count, boundary yes/no. |
| `src/pages/iam/UserProfile.jsx` | Direct policies, group memberships, effective permissions summary, root-only boundary controls. |
| `src/components/AccessDenied.jsx` | Clear 403 state for IAM console pages. |
| `src/components/StatementBuilder.jsx` | Reusable structured policy statement builder, no raw JSON typing as the input method. |
| `src/components/EffectivePermissions.jsx` | Group every action by namespace and mark Allowed/Denied from backend `effectivePermissions`. |

Frontend behavior rules:

- Never type action strings manually in the policy builder; fetch/use the valid action list.
- Show 403 as Access Denied, not a blank page.
- Redirect 401 responses to `/login`.
- Dashboard should be the main IAM middleware test surface.
- Effective permissions should visibly reflect identity policies, group policies, explicit denies, and boundaries.
