# Self-Administered IAM System

### Live Demo: [https://selfadministered-iam.vercel.app](https://selfadministered-iam.vercel.app)

---

## Screenshots

#### 1. Resource Dashboard
![Resource Dashboard](screenshots/resource_dashboard.png)

#### 2. Create Policy (Statement Builder & Live JSON Preview)
![Create Policy](screenshots/create_policy.png)

#### 3. IAM Policy Simulator
![IAM Policy Simulator](screenshots/policy_simulator.png)

---

## Project Overview
The Self-Administered IAM System is a full-stack web application that mimics AWS-style Identity and Access Management (IAM) evaluation. It allows organizations to manage users, groups, inline policies, and managed policies, while enforcing strict permission boundary checks. Designed with security and scalability in mind, the system implements a secure, custom policy-evaluation algorithm on the backend, features a responsive React dashboard, and uses a distributed Redis rate limiter alongside same-domain cookie proxying to prevent unauthorized access and XSS attacks.

---

## Features
- **AWS-Style IAM Engine:** Evaluates user rights based on direct policies, group memberships, and permission boundaries.
- **Dynamic Policy Builder:** Create and edit policies using a structured visual builder that generates valid JSON statements.
- **Inline & Managed Policies:** Attach reusable managed policies or create target-specific inline policies that are automatically cleaned up.
- **Permissions Boundaries:** Root-only controls to attach boundaries to users, capping their maximum effective permissions.
- **IAM Policy Simulator:** Interactive playground to run a step-by-step trace of how a permission is evaluated (Explicit Deny > Explicit Allow > Implicit Deny > Permissions Boundary).
- **Secure Authentication:** Cookie-based session tracking with `HttpOnly` and `Secure` attributes, protected against XSS by routing requests through a Vercel-to-Render proxy rewrite.
- **Distributed Rate Limiting:** Utilizes `rate-limiter-flexible` and a cloud Redis store to restrict access on authentication endpoints with a local memory fallback.

---

## Architecture
```mermaid
graph TD
    User([User Browser]) -->|HTTPS| Vercel[Vercel Frontend Host]
    Vercel -->|Static Pages & Assets| User
    User -->|/api/* requests| VercelProxy[Vercel Proxy / Rewriter]
    VercelProxy -->|Same-Domain CORS| Render[Render Backend Service]
    Render -->|Queries/Updates| Postgres[(Neon Serverless Postgres)]
    Render -->|Atomic Rate Limit Checks| Redis[(Redis Cloud Database)]
```
The frontend is hosted on **Vercel** and proxies all `/api/*` traffic directly to **Render** where the Express server runs. This makes cross-site requests appear as first-party requests to the browser, enabling secure cross-origin HTTP-Only cookies without browser blocks.

---

## Tech Stack
- **Frontend:** React, Vite, Axios, React Router, TailwindCSS
- **Backend:** Node.js, Express, Prisma ORM
- **Database:** PostgreSQL (Hosted on Neon)
- **Caching & Rate Limiting:** Redis (Hosted on Redis Cloud)
- **Deployment:** Vercel (Frontend), Render (Backend)

---

## Database Schema
The database uses PostgreSQL, managed via Prisma. The schema includes the following models:
- **User:** Stores name, email, credentials, root bypass status, and relationships to groups, boundaries, and direct policies.
- **Group:** Repositories of users with attached policies.
- **Policy:** Contains name, description, type (MANAGED or INLINE), and a JSON column storing the policy statements.
- **UserGroupMembership:** Join table managing User-to-Group relationships.
- **UserPolicyAttachment / GroupPolicyAttachment:** Join tables mapping policies to users and groups.
- **UserBoundary:** Enforces a permission boundary policy on a user.
- **RefreshToken:** Stores rotated session keys to allow stateless login refresh.

---

## IAM Permission Evaluation Algorithm
The system follows a strict execution path based on the **AWS Policy Evaluation Logic (PEA)**:

1. **Root Bypass:** If the user is flagged as `isRoot: true`, all permission checks are bypassed and automatically approved.
2. **Explicit Deny:** The system collects all direct and group-inherited policy statements. If *any* statement has `"Effect": "Deny"` matching the action, the request is immediately denied (Deny wins over Allow).
3. **Explicit Allow:** If there is no explicit deny, the system checks for a matching `"Effect": "Allow"` statement. If none is found, access is denied by default (**Implicit Deny**).
4. **Permissions Boundary Check:** If the user has a boundary policy attached, the action must *also* be explicitly allowed by the boundary. If the boundary does not allow it, access is denied (Boundary caps maximum permissions).

### PEA Evaluation Flowchart
```mermaid
flowchart TD
    Start([Request: User, Action]) --> IsRoot{Is User Root?}
    IsRoot -->|Yes| AllowRoot[Allow: Root Bypass]
    IsRoot -->|No| CheckDeny{Any Explicit Deny?}
    CheckDeny -->|Yes| DenyExplicit[Deny: Explicit Deny wins]
    CheckDeny -->|No| CheckAllow{Any Explicit Allow?}
    CheckAllow -->|No| DenyImplicit[Deny: Implicit Deny]
    CheckAllow -->|Yes| HasBoundary{Has Permissions Boundary?}
    HasBoundary -->|No| AllowExplicit[Allow: Explicit Allow]
    HasBoundary -->|Yes| CheckBoundary{Boundary allows action?}
    CheckBoundary -->|Yes| AllowWithinBoundary[Allow: Allowed within Boundary]
    CheckBoundary -->|No| DenyBoundary[Deny: Permissions Boundary Caps Access]
```

---

## Project Structure
```text
Self-Administered-IAM-System/
├── backend/
│   ├── prisma/
│   │   ├── migrations/
│   │   └── schema.prisma
│   ├── src/
│   │   ├── config/
│   │   │   ├── prisma.js
│   │   │   └── redis.js
│   │   ├── controllers/
│   │   ├── middleware/
│   │   │   ├── auth.middleware.js
│   │   │   └── rateLimiter.js
│   │   ├── routes/
│   │   ├── services/
│   │   │   └── iamService.js
│   │   ├── app.js
│   │   └── server.js
│   ├── .env
│   └── package.json
└── frontend/
    ├── src/
    │   ├── api/
    │   ├── components/
    │   ├── context/
    │   ├── pages/
    │   ├── App.jsx
    │   └── main.jsx
    ├── vercel.json
    └── package.json
```

---

## Getting Started

> [!WARNING]  
> **⏱️ Critical Notice:**  
> I have pre-configured a **publicly available Cloud Redis instance** in the environment template. You do not need to install or run Redis locally!  
> 
> Simply follow this **2-minute step-by-step setup** to get the application fully running.

### Prerequisites
- **Node.js:** v18.0.0 or higher
- **PostgreSQL Database:** A running local instance or a cloud database (e.g., Neon).
- **Redis Database:** A Cloud Redis instance is **already pre-configured** in our `.env.example` for instant setup.

---

### Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create your environment variables file:
   * **On Windows (PowerShell):** `Copy-Item .env.example .env`
   * **On Mac/Linux:** `cp .env.example .env`
   * *(Open the `.env` file and verify or update your `DATABASE_URL` to match your local PostgreSQL database).*
3. Install dependencies:
   ```bash
   npm install
   ```
4. Push the database schema and seed the initial credentials:
   ```bash
   npx prisma db push
   npm run seed
   ```
5. Start the backend server:
   ```bash
   npm run dev
   ```

---

### Frontend Setup
1. Open a **new terminal window** and navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the React/Vite development server:
   ```bash
   npm run dev
   ```
4. **Login:** Open `http://localhost:5173` in your browser and log in using the [Seed Credentials](#seed-credentials) (e.g., `root@org.local` / `root1234`).

---

## Environment Variables

### Backend Environment Variables (`backend/.env`)
| Variable | Description | Example Value |
| --- | --- | --- |
| `DATABASE_URL` | Connection URL for your PostgreSQL database. | `postgresql://postgres:password@localhost:5432/iam_system` |
| `PORT` | The port the Express backend server runs on. | `5000` |
| `JWT_SECRET` | Secret key used to encrypt access tokens. | `supersecretkey-change-me-in-production` |
| `JWT_EXPIRES_IN` | Lifespan of the generated access tokens. | `15m` |
| `REDIS_URL` | Connection URI for the Redis caching store. | `redis://localhost:6379` |
| `FRONTEND_URL` | The URL of the frontend (for CORS validation). | `http://localhost:5173` |

### Frontend Environment Variables (Only needed if NOT using Vercel Proxy)
| Variable | Description | Example Value |
| --- | --- | --- |
| `VITE_API_BASE_URL` | The absolute URL of your backend. | `http://localhost:5000` |

---

## Running Prisma Migrations
To push changes from your `schema.prisma` file to the database during local development:
```bash
npx prisma migrate dev --name init
```
To run outstanding migrations on a live production database:
```bash
npx prisma migrate deploy
```

---

## Running Seed
To reset your database and apply the initial IAM assessment mock data:
```bash
npm run seed
```

---

## Seed Credentials

| User | Email | Password | Access level |
| --- | --- | --- | --- |
| **Root** | `root@org.local` | `root1234` | Superuser (Bypasses all checks) |
| **Alice** | `alice@org.local` | `alice1234` | Viewer (ReadOnlyAccess group) |
| **Bob** | `bob@org.local` | `bob1234` | No initial permissions |
| **Charlie**| `charlie@org.local`| `charlie1234`| No initial permissions |

---

## API Overview

### Authentication Routes
- `POST /api/auth/register` - Create a new user profile.
- `POST /api/auth/login` - Authenticate credentials and get cookies.
- `POST /api/auth/logout` - Clear auth cookies and revoke token.
- `GET /api/auth/me` - Fetch credentials of the logged-in session.
- `POST /api/auth/refresh` - Rotate and refresh expired access tokens.

### Protected Resource Routes
*Requires valid authentication and matching IAM actions (e.g. `reports:list`)*
- **Reports:** `GET/POST/PUT/DELETE /api/reports`
- **Alerts:** `GET/POST/PATCH/DELETE /api/alerts`
- **Settings:** `GET/PUT /api/settings`
- **Audit:** `GET /api/audit`

### IAM Administration Routes
*Requires `iam:*` permissions (Root bypasses this automatically)*
- **Policies:** `/api/iam/policies`
- **Groups:** `/api/iam/groups`
- **Users:** `/api/iam/users`

---

## Test Scenarios

### Scenario 1: Root Bypass
1. Log in as `root@org.local`.
2. Try clicking any buttons in the Dashboard (Reports, Alerts, Settings, Audit).
3. **Expected:** All operations succeed with a green success message because Root bypasses checks.

### Scenario 2: Default Group Access (Alice)
1. Log in as `alice@org.local`.
2. Alice is in the **Viewers** group, which has `ReadOnlyAccess` policy.
3. Click "List Reports" or "List Alerts". **Expected:** Success.
4. Click "Delete Report" or "Acknowledge Alert". **Expected:** `Access Denied (403)` error modal.

### Scenario 3: Permissions Boundary Cap
1. Log in as `root@org.local` and go to **Users** -> **Alice**.
2. Set a **Permissions Boundary** on Alice restricting her only to Alerts (`alerts:*`).
3. Log out and log back in as `alice@org.local`.
4. Click "List Reports".
5. **Expected:** `Access Denied` because although her group policy allows reports read, her boundary does not allow it.

### Scenario 4: Redis Rate Limiter
1. Go to the login page.
2. Attempt to log in with an incorrect password 6 times consecutively within a short window.
3. **Expected:** On the 6th attempt, the backend returns a `429 Too Many Requests` error with a custom cooldown period.

---

## Deployment

### Backend (Render)
1. Connect your repository to Render.
2. Set the **Root Directory** to `backend`.
3. Set **Build Command** to `npm install` and **Start Command** to `npm start`.
4. Bind Environment Variables (`DATABASE_URL`, `REDIS_URL`, `FRONTEND_URL`, `JWT_SECRET`).

### Frontend (Vercel)
1. Connect your repository to Vercel.
2. Set the **Root Directory** to `frontend`.
3. Vercel will build it automatically using `vite.config.js` and the `vercel.json` rewrite proxy rules.
4. Ensure no `VITE_API_BASE_URL` is set, allowing requests to flow relatively through the same domain proxy.

---

## Learning Resources & References
The following resources were utilized during the design, research, and development of this IAM architecture:
- **YouTube Guide:** [AWS IAM In-Depth Tutorial](https://youtu.be/_ZCTvmaPgao?si=S7WPpMTSzA_tpFK_)
- **Documentation:** [AWS IAM User Guide Introduction](https://docs.aws.amazon.com/IAM/latest/UserGuide/introduction.html)
- **Documentation:** [AWS IAM Permissions Boundaries](https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies_boundaries.html)
- **Documentation:** [AWS IAM Access Policies](https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies.html)

---

## License
Distributed under the MIT License.
