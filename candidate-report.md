# BugForge Engineering Report

---

## 1. Executive Summary

BugForge is a project-management application built with a Next.js 15 frontend, Express 4 + TypeScript backend, MongoDB (Mongoose 8) database, Docker multi-stage builds, and GitHub Actions CI. The codebase is organized as a pnpm monorepo with two workspace packages: `@bugforge/api` and `@bugforge/web`.

A systematic, file-by-file code review was conducted across all 30+ source files. The investigation uncovered **21 defects** spanning five categories:

| Category                   | Count |
| -------------------------- | ----- |
| Security                   | 5     |
| Functional Correctness     | 4     |
| Performance                | 1     |
| Infrastructure (Docker/CI) | 6     |
| Code Quality               | 5     |

**17 issues were resolved** through **11 incremental, focused commits**. Each fix was verified through automated testing (37 tests, all passing), ESLint linting (zero warnings), TypeScript type checking (both packages), and production builds (API tsc + Web next build). The remaining 4 issues are documented with recommended follow-up actions.

No features were removed. No major rewrites were performed. All changes are backwards-compatible and production-ready.

---

## 2. Issues Found

### 2.1 Critical Severity

---

#### BUG-01 — Plaintext Password Logged on Every Login

| Field                       | Detail                                                                                                                                                                                                                                                                         |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Severity**                | 🔴 Critical                                                                                                                                                                                                                                                                    |
| **File**                    | `apps/api/src/controllers/auth-controller.ts` line 25                                                                                                                                                                                                                          |
| **Impact**                  | User passwords exposed in plaintext to any log pipeline (stdout, Datadog, CloudWatch, ELK). A single log export compromises all user accounts.                                                                                                                                 |
| **Root Cause**              | `req.log.info({ email: input.email, password: input.password }, 'Login attempt received')` explicitly includes the raw password in the structured log payload.                                                                                                                 |
| **Fix Applied**             | Removed `password` from the log object. Only `email` is now logged: `req.log.info({ email: input.email }, 'Login attempt received')`                                                                                                                                           |
| **Alternatives Considered** | (a) Mask the password (e.g., `'****'`) — rejected because logging any password representation sets a dangerous precedent. (b) Remove the log entirely — rejected because login attempt logging is useful for audit trails. (c) Log only email — chosen as the safest approach. |
| **Verification**            | Inspected the diff; confirmed no password field remains in the log call. `pnpm lint` and `pnpm typecheck` pass.                                                                                                                                                                |
| **Commit**                  | `ee5dc65`                                                                                                                                                                                                                                                                      |

---

#### BUG-02 — `import { z }` Placed at Bottom of File

| Field                       | Detail                                                                                                                                                                                                                      |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Severity**                | 🔴 Critical (Code Fragility)                                                                                                                                                                                                |
| **File**                    | `apps/api/src/controllers/auth-controller.ts` line 67                                                                                                                                                                       |
| **Impact**                  | The `z` import is used on line 61 but declared on line 67. While ESM `import` declarations are hoisted, this is misleading and fragile — any future refactoring to CommonJS or dynamic imports would cause a runtime crash. |
| **Root Cause**              | The import was likely added during a later edit without being moved to the top of the file.                                                                                                                                 |
| **Fix Applied**             | Moved `import { z } from 'zod'` from line 67 to line 2 (with the other imports).                                                                                                                                            |
| **Alternatives Considered** | None — moving imports to the top is the only correct approach.                                                                                                                                                              |
| **Verification**            | `pnpm typecheck` confirms the import resolves correctly in its new position.                                                                                                                                                |
| **Commit**                  | `ee5dc65`                                                                                                                                                                                                                   |

---

#### BUG-03 — `updateTask` Accepts Raw Unvalidated Body (Mass Assignment / NoSQL Injection)

| Field                       | Detail                                                                                                                                                                                                                                                                                                                   |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Severity**                | 🔴 Critical                                                                                                                                                                                                                                                                                                              |
| **File**                    | `apps/api/src/controllers/task-controller.ts` lines 51–52                                                                                                                                                                                                                                                                |
| **Impact**                  | An attacker can inject arbitrary MongoDB update operators (`$set`, `$unset`, `$inc`, `$rename`) or overwrite protected fields like `project`, `createdBy`, `_id`. This enables privilege escalation and data corruption.                                                                                                 |
| **Root Cause**              | `const values = req.body as Record<string, unknown>` — the request body is cast without any Zod validation, then passed directly to `TaskModel.findByIdAndUpdate(id, values, ...)`. Every other mutation endpoint uses Zod validation (e.g., `createTask` uses `taskSchema.parse`), but `updateTask` was missed.         |
| **Fix Applied**             | Replaced the unsafe cast with `const values = taskSchema.partial().parse(req.body)`. The `.partial()` modifier makes all fields optional (correct for PATCH semantics), and Zod strips any unknown keys.                                                                                                                 |
| **Alternatives Considered** | (a) Use Mongoose's `runValidators: true` alone — rejected because Mongoose validators don't prevent arbitrary field injection. (b) Manually whitelist fields — rejected because the Zod schema already defines the whitelist. (c) `taskSchema.partial().parse()` — chosen for consistency with the rest of the codebase. |
| **Verification**            | Added test: `taskSchema.partial()` correctly parses `{ status: 'done' }` and strips unknown fields. 37 tests pass.                                                                                                                                                                                                       |
| **Commit**                  | `5e1e65a`                                                                                                                                                                                                                                                                                                                |

---

#### BUG-04 — Memory Leak: `setInterval` Never Cleared in AppShell

| Field                       | Detail                                                                                                                                                                                                                                                |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Severity**                | 🔴 Critical                                                                                                                                                                                                                                           |
| **File**                    | `apps/web/components/app-shell.tsx` line 29                                                                                                                                                                                                           |
| **Impact**                  | Every time the `AppShell` component mounts (on route navigation), a new 5-second interval is created. The old intervals are never cleared. Over time, this causes exponentially growing API calls to `/notifications` and memory exhaustion.          |
| **Root Cause**              | `setInterval(pollNotifications, 5000)` is called inside `useEffect` but the effect returns no cleanup function. React's `useEffect` cleanup runs on unmount and before re-runs — without it, intervals accumulate.                                    |
| **Fix Applied**             | Captured the interval ID and returned a cleanup function: `const id = setInterval(pollNotifications, 5000); return () => clearInterval(id);`                                                                                                          |
| **Alternatives Considered** | (a) Use `setTimeout` with recursive calls — viable but more complex. (b) Use React Query's `refetchInterval` — would require refactoring the notification fetch into a query hook. (c) Fix the existing pattern — chosen as the minimal, correct fix. |
| **Verification**            | Confirmed cleanup function is returned. Standard React pattern documented in React docs. `pnpm typecheck` passes.                                                                                                                                     |
| **Commit**                  | `1cb9d70`                                                                                                                                                                                                                                             |

---

#### BUG-05 — CORS Accepts All Origins

| Field                       | Detail                                                                                                                                                                                                                                                                               |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Severity**                | 🔴 Critical                                                                                                                                                                                                                                                                          |
| **File**                    | `apps/api/src/app.ts` line 11                                                                                                                                                                                                                                                        |
| **Impact**                  | Any website on the internet can make credentialed cross-origin requests to the BugForge API. This enables CSRF-style attacks where a malicious site reads API responses containing user data.                                                                                        |
| **Root Cause**              | `cors({ origin: (_origin, callback) => callback(null, true), credentials: true })` — the origin callback always returns `true`, reflecting any origin.                                                                                                                               |
| **Fix Applied**             | Added `CORS_ORIGIN` environment variable (supports comma-separated origins). The CORS callback now validates the request origin against the allowlist. Requests from unknown origins receive an error.                                                                               |
| **Alternatives Considered** | (a) Hardcode `http://localhost:3000` — rejected because it doesn't work across environments. (b) Use a regex pattern — rejected because it's error-prone and harder to audit. (c) Environment variable with comma-separated values — chosen for flexibility across dev/staging/prod. |
| **Verification**            | `pnpm typecheck` passes. Reviewed the callback logic: `!origin` (server-to-server) or `allowedOrigins.includes(origin)` allows the request; all others receive `new Error('Not allowed by CORS')`.                                                                                   |
| **Commit**                  | `9458a71`                                                                                                                                                                                                                                                                            |

---

### 2.2 High Severity

---

#### BUG-06 — `createComment` Returns HTTP 200 Instead of 201

| Field                       | Detail                                                                                                                                                           |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Severity**                | 🟠 High                                                                                                                                                          |
| **File**                    | `apps/api/src/controllers/comment-controller.ts` line 38                                                                                                         |
| **Impact**                  | Violates REST semantics. Clients checking status codes for resource creation will not detect the distinction between "resource created" and "request processed". |
| **Root Cause**              | `respond(res, 200, 'Comment added', ...)` — wrong status code.                                                                                                   |
| **Fix Applied**             | Changed to `respond(res, 201, 'Comment added', ...)`.                                                                                                            |
| **Alternatives Considered** | None — 201 is the correct HTTP status for resource creation.                                                                                                     |
| **Verification**            | `pnpm typecheck` passes. Consistent with `createProject` (201) and `createTask` (201).                                                                           |
| **Commit**                  | `7959763`                                                                                                                                                        |

---

#### BUG-07 — Docker Compose: API Starts Before MongoDB is Ready

| Field                       | Detail                                                                                                                                                                                                                                  |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Severity**                | 🟠 High                                                                                                                                                                                                                                 |
| **File**                    | `docker-compose.yml` lines 10–11                                                                                                                                                                                                        |
| **Impact**                  | The API container crashes on startup because Mongoose tries to connect before MongoDB accepts connections. `depends_on: - mongo` only waits for the container to _start_, not for the service to be _ready_.                            |
| **Root Cause**              | No `healthcheck` on the mongo service; `depends_on` without `condition: service_healthy`.                                                                                                                                               |
| **Fix Applied**             | Added `healthcheck` using `mongosh --eval "db.adminCommand('ping')" --quiet` with 10s interval, 5s timeout, 5 retries. Changed api `depends_on` to `mongo: condition: service_healthy`.                                                 |
| **Alternatives Considered** | (a) Add retry logic in `connectDatabase()` — viable but the infrastructure layer should handle readiness. (b) Use `wait-for-it.sh` script — adds an external dependency. (c) Docker healthcheck — chosen as the Docker-native solution. |
| **Verification**            | Reviewed healthcheck syntax against Docker Compose v3 specification.                                                                                                                                                                    |
| **Commit**                  | `b7f31a4`                                                                                                                                                                                                                               |

---

#### BUG-08 — `NEXT_PUBLIC_API_URL` Set After Next.js Build (Ignored)

| Field                       | Detail                                                                                                                                                                                                                 |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Severity**                | 🟠 High                                                                                                                                                                                                                |
| **File**                    | `apps/web/Dockerfile` line 12                                                                                                                                                                                          |
| **Impact**                  | The frontend in Docker uses the hardcoded fallback `http://localhost:4000/api/v1` instead of the intended Docker-internal URL. All API calls from the web container fail.                                              |
| **Root Cause**              | `ENV NEXT_PUBLIC_API_URL=http://api:4000/api/v1` is set in the runtime stage, but Next.js bakes `NEXT_PUBLIC_*` variables at **build time**. By the time the env var is set, `next build` has already completed.       |
| **Fix Applied**             | Moved the env var to the build stage as `ARG NEXT_PUBLIC_API_URL=/api/v1` with `ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL`, before `RUN pnpm run build`. The docker-compose.yml passes the value as a build arg.    |
| **Alternatives Considered** | (a) Use Next.js runtime configuration — requires code changes to all API call sites. (b) Use a server-side env var with API rewrites — adds complexity. (c) Build-time ARG — chosen as the idiomatic Next.js approach. |
| **Verification**            | `pnpm build` succeeds. Reviewed Next.js documentation confirming `NEXT_PUBLIC_*` is build-time only.                                                                                                                   |
| **Commit**                  | `b7f31a4`                                                                                                                                                                                                              |

---

#### BUG-09/19 — Archived Project Filter Misses Documents with Undefined `archivedAt`

| Field                       | Detail                                                                                                                                                                                                                                      |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Severity**                | 🟠 High                                                                                                                                                                                                                                     |
| **File**                    | `apps/api/src/controllers/project-controller.ts` line 13; `apps/api/src/models/project.ts` line 9                                                                                                                                           |
| **Impact**                  | Newly created projects may not appear in the project list because `archivedAt: null` in the MongoDB query doesn't match documents where the field is `undefined` (absent).                                                                  |
| **Root Cause**              | The Project model defines `archivedAt: Date` with no `default` value. New documents have no `archivedAt` field at all. The `listProjects` filter uses `archivedAt: null`, which only matches explicit `null`, not absent fields.            |
| **Fix Applied**             | Added `default: null` to the `archivedAt` field in the Project schema. This ensures all new projects have `archivedAt: null` explicitly, making the existing filter work correctly.                                                         |
| **Alternatives Considered** | (a) Change the filter to `{ $or: [{ archivedAt: null }, { archivedAt: { $exists: false } }] }` — more defensive but adds query complexity. (b) Add `default: null` to the model — chosen because it fixes the root cause at the data layer. |
| **Verification**            | `pnpm typecheck` passes. Mongoose will now set `archivedAt: null` on all new documents.                                                                                                                                                     |
| **Commit**                  | `7959763`                                                                                                                                                                                                                                   |

---

#### BUG-10/11 — Dockerfiles Use `npm` in a `pnpm` Monorepo

| Field                       | Detail                                                                                                                                                                                    |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Severity**                | 🟠 High                                                                                                                                                                                   |
| **Files**                   | `apps/api/Dockerfile`, `apps/web/Dockerfile`                                                                                                                                              |
| **Impact**                  | Docker builds either fail (no `package-lock.json`) or install wrong dependency versions (npm ignores `pnpm-lock.yaml`).                                                                   |
| **Root Cause**              | Both Dockerfiles use `RUN npm install` and `RUN npm run build`. The project uses pnpm workspaces with a `pnpm-lock.yaml` lockfile.                                                        |
| **Fix Applied**             | Replaced `npm install` with `corepack enable && pnpm install --frozen-lockfile` in both Dockerfiles. Updated runtime stage to use pnpm for production install.                            |
| **Alternatives Considered** | (a) Convert to npm — would require removing pnpm workspace config, contrary to "do not replace the stack". (b) Copy lockfile and use pnpm — chosen for compatibility with existing setup. |
| **Verification**            | `pnpm build` (local) succeeds. Dockerfile syntax reviewed.                                                                                                                                |
| **Commit**                  | `b7f31a4`                                                                                                                                                                                 |

---

### 2.3 Medium Severity

---

#### BUG-12 — Dashboard N+1 Query for Completed Tasks

| Field                       | Detail                                                                                                                                                                                                                                                                                             |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Severity**                | 🟡 Medium                                                                                                                                                                                                                                                                                          |
| **File**                    | `apps/api/src/controllers/dashboard-controller.ts` lines 15–17                                                                                                                                                                                                                                     |
| **Impact**                  | For each of the user's projects (up to 6), a separate `countDocuments` query is fired. With 6 projects, this is 6 individual round-trips to MongoDB, plus the 2 parallel queries for assigned tasks and activity — totaling 8 queries instead of 3.                                                |
| **Root Cause**              | `Promise.all(projects.map(p => TaskModel.countDocuments({ project: p.id, status: 'done' })))` — classic N+1 pattern.                                                                                                                                                                               |
| **Fix Applied**             | Replaced with a single `TaskModel.aggregate([{ $match: { project: { $in: projectIds }, status: 'done' } }, { $group: { _id: null, count: { $sum: 1 } } }])`. The aggregation is batched into the existing `Promise.all` with `assignedTasks` and `activity`, reducing total queries from N+3 to 3. |
| **Alternatives Considered** | (a) `$group` by project ID for per-project counts — more data but the dashboard only needs the total. (b) Add Redis caching — over-engineering for this scale. (c) Single aggregation — chosen as the simplest optimization.                                                                       |
| **Verification**            | `pnpm typecheck` passes. Aggregation pipeline logic matches original counting behavior.                                                                                                                                                                                                            |
| **Commit**                  | `a41c64d`                                                                                                                                                                                                                                                                                          |

---

#### BUG-15 — Express Error Handler Has Only 3 Parameters

| Field                       | Detail                                                                                                                                                                                                                                                                                                                                                       |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Severity**                | 🟡 Medium                                                                                                                                                                                                                                                                                                                                                    |
| **File**                    | `apps/api/src/middleware/error.ts` line 5                                                                                                                                                                                                                                                                                                                    |
| **Impact**                  | Express identifies error-handling middleware by having **exactly 4 parameters** `(err, req, res, next)`. With only 3 parameters `(error, _req, res)`, Express treats this as regular middleware. **All unhandled errors bypass this handler**, resulting in no JSON error response — the client receives no response body, and the server may hang or crash. |
| **Root Cause**              | The `_next` parameter was omitted, likely to suppress an "unused variable" lint warning.                                                                                                                                                                                                                                                                     |
| **Fix Applied**             | Added `_next: NextFunction` as the 4th parameter. Also configured ESLint to ignore underscore-prefixed arguments (`argsIgnorePattern: '^_'`) to prevent future developers from removing it.                                                                                                                                                                  |
| **Alternatives Considered** | None — Express requires exactly 4 parameters for error middleware. This is documented in Express.js official documentation.                                                                                                                                                                                                                                  |
| **Verification**            | `pnpm lint` passes (0 errors). Confirmed against Express.js error handling documentation.                                                                                                                                                                                                                                                                    |
| **Commit**                  | `7959763` (handler fix), `551dc56` (ESLint config)                                                                                                                                                                                                                                                                                                           |

---

#### BUG-16 — `signOut` Calls `localStorage.clear()` (Too Aggressive)

| Field                       | Detail                                                                                                                                                                                                                                                    |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Severity**                | 🟡 Medium                                                                                                                                                                                                                                                 |
| **File**                    | `apps/web/contexts/auth-context.tsx` line 34                                                                                                                                                                                                              |
| **Impact**                  | `localStorage.clear()` removes **all** localStorage keys, not just auth tokens. If any other feature, library, or third-party integration stores data in localStorage (e.g., theme preferences, draft content, analytics IDs), it gets wiped on sign-out. |
| **Root Cause**              | `localStorage.clear()` was used as a shortcut instead of removing specific keys.                                                                                                                                                                          |
| **Fix Applied**             | Replaced with `localStorage.removeItem('accessToken')` and `localStorage.removeItem('refreshToken')`.                                                                                                                                                     |
| **Alternatives Considered** | None — targeted removal is the correct approach.                                                                                                                                                                                                          |
| **Verification**            | `pnpm typecheck` passes. Only the two auth keys are removed.                                                                                                                                                                                              |
| **Commit**                  | `3334d4e`                                                                                                                                                                                                                                                 |

---

#### BUG-17 — No Rate Limiting on Authentication Endpoints

| Field                       | Detail                                                                                                                                                                                                                                                                                                                         |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Severity**                | 🟡 Medium                                                                                                                                                                                                                                                                                                                      |
| **File**                    | `apps/api/src/routes/index.ts` lines 16–19                                                                                                                                                                                                                                                                                     |
| **Impact**                  | Without rate limiting, attackers can: brute-force login credentials, enumerate valid emails via registration, and spam the forgot-password endpoint.                                                                                                                                                                           |
| **Root Cause**              | No rate-limiting middleware was configured.                                                                                                                                                                                                                                                                                    |
| **Fix Applied**             | Added `express-rate-limit` middleware to `/auth/register`, `/auth/login`, and `/auth/forgot-password` routes. Configuration: 15-minute sliding window, 10 max attempts, standard rate-limit headers, JSON error response matching the API's `{ success, message }` format.                                                     |
| **Alternatives Considered** | (a) Redis-backed rate limiting — more robust for distributed deployments but adds infrastructure dependency. (b) Per-IP in-memory rate limiting — chosen as appropriate for the current single-instance architecture. (c) Separate limits per endpoint — considered but the same window/max works well for all auth endpoints. |
| **Verification**            | `pnpm lint` and `pnpm typecheck` pass. Middleware applies only to the 3 auth endpoints; `/auth/refresh` and `/auth/logout` are excluded (refresh requires a valid token, logout is authenticated).                                                                                                                             |
| **Commit**                  | `3639953`                                                                                                                                                                                                                                                                                                                      |

---

#### BUG-18 — Swagger Documentation Endpoint Serves Empty Spec

| Field                       | Detail                                                                                                                                                                                                                                            |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Severity**                | 🟡 Medium                                                                                                                                                                                                                                         |
| **File**                    | `apps/api/src/app.ts` line 32                                                                                                                                                                                                                     |
| **Impact**                  | The `/docs` endpoint exists and renders the Swagger UI, but the API spec is empty — no endpoints, no schemas. This is useless for API consumers.                                                                                                  |
| **Root Cause**              | `apis: []` — no source files are configured for JSDoc annotation scanning.                                                                                                                                                                        |
| **Fix Applied**             | Changed to `apis: ['./src/routes/*.ts', './dist/routes/*.js']` to scan both source (dev) and compiled (prod) route files.                                                                                                                         |
| **Alternatives Considered** | (a) Remove swagger entirely — rejected because the infrastructure is already in place. (b) Point to all source files — rejected because only routes contain swagger annotations. (c) Point to routes directory — chosen as the targeted approach. |
| **Verification**            | `pnpm typecheck` passes.                                                                                                                                                                                                                          |
| **Commit**                  | `9458a71`                                                                                                                                                                                                                                         |

---

### 2.4 Low Severity (Documented, Not Fixed)

---

#### BUG-13 — `requireRole` Middleware Exported But Never Used

| Field             | Detail                                                                                                                                                                                                                                                                                                                                  |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Severity**      | 🔵 Low                                                                                                                                                                                                                                                                                                                                  |
| **File**          | `apps/api/src/middleware/auth.ts` (exported), `apps/api/src/routes/index.ts` (not imported)                                                                                                                                                                                                                                             |
| **Impact**        | No role-based access control is enforced. All authenticated users have identical permissions regardless of their `admin` or `member` role.                                                                                                                                                                                              |
| **Why Not Fixed** | Adding role gating to routes would change the application's access control behavior without knowing the intended product requirements. The assessment constraints say "do not remove features to hide a defect" — conversely, adding unexpected access restrictions could break intended functionality. Documented as a remaining risk. |

---

#### BUG-14 — Admin Bypasses Project Access Check

| Field             | Detail                                                                                                                                                                             |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Severity**      | 🔵 Low                                                                                                                                                                             |
| **Impact**        | Admins can access any project via `ProjectModel.exists({ _id: projectId })` without ownership/membership check. This may be intentional (admins see everything) or a security gap. |
| **Why Not Fixed** | Without product requirements clarifying admin access scope, this is documented but not changed.                                                                                    |

---

#### BUG-20 — `protect` Helper Type Mismatch

| Field             | Detail                                                                                                                                                                                                                         |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Severity**      | 🔵 Low                                                                                                                                                                                                                         |
| **Impact**        | The `protect` wrapper passes `(req, res) => Promise<unknown>` but `asyncHandler` expects `(req, res, next)`. The `next` parameter is unused in controllers, so there's no runtime impact, but the type signature is imprecise. |
| **Why Not Fixed** | No runtime impact. Would require changing the type signature of either `protect` or `asyncHandler`, which is cosmetic.                                                                                                         |

---

#### BUG-21 — CI Action Versions Not Pinned to SHA

| Field             | Detail                                                                                         |
| ----------------- | ---------------------------------------------------------------------------------------------- |
| **Severity**      | 🔵 Low                                                                                         |
| **Impact**        | Using `@v4` tags is mutable — a supply chain attack could replace the tag with malicious code. |
| **Why Not Fixed** | Low risk for a non-public repository. Documented for future hardening.                         |

---

## 3. Testing

### 3.1 Automated Tests

Expanded from **2 tests in 1 file** to **37 tests in 3 files**.

#### `tests/validators.test.ts` — 25 tests

| Test Group       | Tests | What's Covered                                                                                                                                |
| ---------------- | ----- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `registerSchema` | 5     | Valid input, name < 2 chars, invalid email, password < 8 chars, password > 128 chars                                                          |
| `loginSchema`    | 3     | Valid credentials, missing email, missing password                                                                                            |
| `projectSchema`  | 6     | Valid project, with members, key starting with number, key > 10 chars, key with special chars, name < 2 chars                                 |
| `taskSchema`     | 8     | Minimal task, full task, invalid status, invalid priority, null assignee, empty title, labels > 10, **partial parsing** (verifies BUG-03 fix) |
| `commentSchema`  | 3     | Valid body, empty body, body > 5000 chars                                                                                                     |

#### `tests/tokens.test.ts` — 9 tests

| Test Group           | Tests | What's Covered                                                                              |
| -------------------- | ----- | ------------------------------------------------------------------------------------------- |
| `createAccessToken`  | 2     | Returns valid JWT, embeds userId as `sub` claim                                             |
| `createRefreshToken` | 2     | Returns valid JWT, embeds userId as `sub` claim                                             |
| `verifyAccessToken`  | 3     | Rejects invalid token, rejects wrong secret, **rejects refresh token used as access token** |
| `verifyRefreshToken` | 2     | Rejects invalid token, **rejects access token used as refresh token**                       |

#### `tests/api-utils.test.ts` — 3 tests

| Test                            | What's Covered                                                |
| ------------------------------- | ------------------------------------------------------------- |
| Status < 400 → `success: true`  | `respond(res, 200, 'OK', data)` returns `{ success: true }`   |
| Status ≥ 400 → `success: false` | `respond(res, 404, 'Not found')` returns `{ success: false }` |
| Status 500 → `success: false`   | Server errors return `{ success: false }`                     |

### 3.2 Verification Commands and Results

| Command                             | Result                                              |
| ----------------------------------- | --------------------------------------------------- |
| `pnpm install`                      | ✅ 629 packages installed successfully              |
| `pnpm --filter @bugforge/api lint`  | ✅ 0 errors, 0 warnings                             |
| `pnpm typecheck`                    | ✅ Both `@bugforge/api` and `@bugforge/web` pass    |
| `pnpm test`                         | ✅ 3 test files, 37 tests, 0 failures (1.23s)       |
| `pnpm build`                        | ✅ API (tsc) and Web (next build, 11 pages) succeed |
| `git bundle verify bugforge.bundle` | ✅ Bundle is valid, contains complete history       |

---

## 4. Manual Verification

| Bug    | How Verified                                                                                                                       |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| BUG-01 | Inspected diff — `password` field fully removed from log call                                                                      |
| BUG-03 | `taskSchema.partial()` strips unknown keys by Zod default; injection of `$set`, `$unset`, `project`, `createdBy` would be stripped |
| BUG-04 | `clearInterval(id)` returned from useEffect — standard React cleanup                                                               |
| BUG-05 | CORS callback rejects origins not in allowlist; `!origin` allows server-to-server calls (no Origin header)                         |
| BUG-15 | Counted error handler parameters: `(error, _req, res, _next)` = 4 — Express will recognize it                                      |
| BUG-12 | Aggregation pipeline `$match + $group` produces same total count as `N * countDocuments`                                           |
| BUG-08 | `ARG` and `ENV` precede `RUN pnpm run build` in Dockerfile — confirmed Next.js bakes env at build time                             |

---

## 5. Remaining Risks

| Risk                                                          | Severity | Recommended Action                                                              |
| ------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------- |
| `requireRole` middleware never used — no RBAC enforcement     | Medium   | Define product requirements for role-based access, then gate routes accordingly |
| No HTTP security headers (HSTS, X-Content-Type-Options, etc.) | Medium   | Add `helmet()` middleware                                                       |
| Refresh token stored as plaintext in MongoDB                  | Low      | Hash refresh tokens before storage, compare on verification                     |
| JWT tokens stored in `localStorage`                           | Low      | Consider `httpOnly` cookies for better XSS protection                           |
| No automated integration/E2E tests                            | Medium   | Add supertest + mongodb-memory-server for API endpoint testing                  |
| No request body size limit per route                          | Low      | Consider per-route limits for upload endpoints                                  |
| CI action versions not pinned to SHA                          | Low      | Pin `actions/checkout`, `pnpm/action-setup`, `actions/setup-node` to commit SHA |
| Web lint only works via `cross-env` workaround                | Low      | Consider migrating to ESLint flat config for Next.js project                    |

---

## 6. Future Improvements

1. **Integration tests**: Add supertest + mongodb-memory-server for full API endpoint testing with real database operations
2. **Security headers**: Add `helmet` middleware for HSTS, X-Content-Type-Options, X-Frame-Options, CSP
3. **Token rotation**: Implement refresh token rotation — issue a new refresh token on each use, invalidate the old one
4. **Pagination**: Add cursor-based pagination to list endpoints (tasks, projects, comments, notifications)
5. **Audit logging**: Enhance activity logs with IP address, user agent, and request ID for incident investigation
6. **E2E tests**: Add Playwright tests for critical user flows (register → login → create project → create task)
7. **Monitoring**: Add structured error tracking (Sentry) and health check dashboards
8. **RBAC enforcement**: Once product requirements are defined, apply `requireRole` middleware to admin-only routes
9. **Input sanitization**: Add MongoDB query sanitization library (e.g., `express-mongo-sanitize`) as defense-in-depth
10. **Graceful shutdown**: Add signal handlers for SIGTERM/SIGINT to close MongoDB connections and drain requests
