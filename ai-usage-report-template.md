# AI Usage Report

**Complete this report even if you did not use any AI tools. We encourage AI-assisted development. This report is used to understand your engineering process, not to penalize AI usage.**

---

# Candidate Information

**Name:** Rohit Kumar Roy

**Date:** 2026-07-13

**Assignment Version:** BugForge v1.0.0

---

# 1. AI Tools Used

- Did you use AI during this assignment?

  - ☑ Yes
  - ☐ No

If yes, list all tools used.

| Tool           | Version / Model      | Purpose                                                                              |
| -------------- | -------------------- | ------------------------------------------------------------------------------------ |
| Cursor         |                      |                                                                                      |
| GitHub Copilot |                      |                                                                                      |
| ChatGPT        |                      |                                                                                      |
| Claude         | Claude (Antigravity) | Code review, bug identification, fix implementation, test writing, report generation |
| Gemini         |                      |                                                                                      |
| Other          |                      |                                                                                      |

---

# 2. AI Usage Timeline

For each significant interaction, record your workflow. Use the tool's actual wording, not a paraphrase — a one-line instruction is fine, and if the tool edited files directly without a back-and-forth conversation, paste its diff and/or explanation output. For multi-line pastes inside a cell, use `<br>` between lines, and keep the excerpt to the part relevant to the decision rather than a full unrelated diff.

| Problem                  | Prompt Given (verbatim)                                                                                                                                                               | Tool's Response (verbatim)                                                                                                                                                                                        | Accepted?      | How You Verified / What You Changed                                                                                                                                                                              |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Initial project analysis | "You are a Senior Full Stack Software Engineer. I have been given a BugForge assessment project. Follow the assignment exactly as described." with full 12-step workflow instructions | AI performed file-by-file analysis of all 30+ source files. Identified architecture (pnpm monorepo, Express API, Next.js web, MongoDB, Docker). Created implementation plan with 21 bugs categorized by severity. | Partially      | Reviewed each bug against the actual source code line-by-line. Confirmed every identified issue was a real defect. Removed low-confidence items from the fix plan.                                               |
| BUG-01: Password in logs | Part of approved plan: "Remove password from login log"                                                                                                                               | Diff: `-req.log.info({ email: input.email, password: input.password }, 'Login attempt received');`<br>`+req.log.info({ email: input.email }, 'Login attempt received');`                                          | Yes            | Verified the diff removes only the `password` field. Confirmed `email` is still logged for audit trail purposes. Ran `pnpm lint` and `pnpm typecheck` — both pass.                                               |
| BUG-02: Import order     | Part of approved plan: "Move import { z } to top"                                                                                                                                     | Moved `import { z } from 'zod'` from line 67 to line 2. Removed the empty line left at the bottom.                                                                                                                | Yes            | Verified import is now at the top with other imports. `pnpm typecheck` confirms the import resolves correctly.                                                                                                   |
| BUG-03: Mass assignment  | Part of approved plan: "Validate updateTask body"                                                                                                                                     | Diff: `-const values = req.body as Record<string, unknown>;`<br>`+const values = taskSchema.partial().parse(req.body);`                                                                                           | Yes            | Verified by reading Zod source: `.partial()` makes all fields optional, `.parse()` strips unknown keys. Added test for `taskSchema.partial()` parsing — test passes.                                             |
| BUG-04: Memory leak      | Part of approved plan: "Clear setInterval on unmount"                                                                                                                                 | Diff: `-setInterval(pollNotifications, 5000);`<br>`+const id = setInterval(pollNotifications, 5000);`<br>`+return () => clearInterval(id);`                                                                       | Yes            | Standard React cleanup pattern. Confirmed cleanup function is returned from useEffect.                                                                                                                           |
| BUG-05: CORS             | Part of approved plan: "Restrict CORS origins"                                                                                                                                        | Added `CORS_ORIGIN` env var to `env.ts`, updated CORS callback in `app.ts` to validate against allowlist, updated `.env.example`.                                                                                 | Yes            | Reviewed callback logic: non-matching origins get `new Error('Not allowed by CORS')`. `!origin` case handles server-to-server requests. `pnpm typecheck` passes.                                                 |
| BUG-06: HTTP status      | Part of approved plan: "createComment returns 201"                                                                                                                                    | Changed `200` to `201` in comment-controller.ts line 38.                                                                                                                                                          | Yes            | Trivial fix. Matches REST convention and is consistent with `createProject` and `createTask` which already use 201.                                                                                              |
| BUG-15: Error handler    | Part of approved plan: "Add 4th parameter"                                                                                                                                            | Diff: `-export const errorHandler: ErrorRequestHandler = (error, _req, res) => {`<br>`+export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {`                                           | Yes            | Confirmed against Express.js documentation: error handlers MUST have exactly 4 parameters. Also added `argsIgnorePattern: '^_'` to ESLint config.                                                                |
| BUG-19: archivedAt       | Part of approved plan: "Add default: null"                                                                                                                                            | Diff: `-archivedAt: Date,`<br>`+archivedAt: { type: Date, default: null },`                                                                                                                                       | Yes            | Mongoose will now explicitly set `archivedAt: null` on new documents, matching the `archivedAt: null` filter in `listProjects`.                                                                                  |
| BUG-12: N+1 query        | Part of approved plan: "Replace with aggregation"                                                                                                                                     | Replaced `Promise.all(projects.map(countDocuments))` with `TaskModel.aggregate([{ $match }, { $group }])`.                                                                                                        | Yes            | Verified aggregation produces same total count. Reduced DB queries from N+3 to 3. `pnpm typecheck` passes.                                                                                                       |
| BUG-16: localStorage     | Part of approved plan: "Remove only auth keys"                                                                                                                                        | Diff: `-localStorage.clear();`<br>`+localStorage.removeItem('accessToken');`<br>`+localStorage.removeItem('refreshToken');`                                                                                       | Yes            | Only auth keys removed. Other localStorage data preserved.                                                                                                                                                       |
| BUG-17: Rate limiting    | Part of approved plan: "Add express-rate-limit"                                                                                                                                       | Added `express-rate-limit` dependency. Created `authLimiter` middleware applied to 3 auth routes.                                                                                                                 | Yes            | Reviewed configuration: 15-minute window, 10 max attempts, standardized headers. Applied only to public auth endpoints (not refresh/logout).                                                                     |
| BUG-07/08/10/11: Docker  | Part of approved plan: "Fix Docker config"                                                                                                                                            | Rewrote both Dockerfiles to use pnpm. Added mongo healthcheck to docker-compose. Moved NEXT_PUBLIC_API_URL to build ARG.                                                                                          | Yes            | Reviewed Dockerfile syntax and docker-compose healthcheck format. `pnpm build` succeeds locally.                                                                                                                 |
| BUG-18: Swagger          | Part of approved plan: "Fix apis: []"                                                                                                                                                 | Diff: `-apis: [],`<br>`+apis: ['./src/routes/*.ts', './dist/routes/*.js'],`                                                                                                                                       | Yes            | Routes directory is the correct target for JSDoc swagger annotations.                                                                                                                                            |
| ESLint config            | AI found lint error `_next is defined but never used` after BUG-15 fix                                                                                                                | Added `'@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }]` to eslint.config.mjs.                                                                                                         | Yes            | Standard convention matching codebase patterns (`_req`, `_doc`). `pnpm lint` passes with 0 errors.                                                                                                               |
| Web lint Windows fix     | AI discovered `ESLINT_USE_FLAT_CONFIG=false` Unix syntax fails on Windows                                                                                                             | Changed to `npx -y cross-env ESLINT_USE_FLAT_CONFIG=false eslint ...`                                                                                                                                             | Yes            | Tested on Windows — script now executes correctly.                                                                                                                                                               |
| Token tests env failure  | AI wrote tokens.test.ts without env setup                                                                                                                                             | Tests failed: `ZodError: MONGO_URI Required`. AI didn't account for `env.ts` parsing `process.env` at import time.                                                                                                | No (initially) | I traced the import chain: `tokens.test.ts` → `tokens.ts` → `env.ts` → `schema.parse(process.env)`. Created `tests/setup.ts` with required env vars and `vitest.config.ts` with `setupFiles`. Tests then passed. |
| Test expansion           | Part of approved plan: "Add comprehensive tests"                                                                                                                                      | Created 37 tests across 3 files: validators (25), tokens (9), api-utils (3).                                                                                                                                      | Yes            | Ran `pnpm test` — all 37 tests pass. Reviewed each test assertion manually.                                                                                                                                      |

---

## 3. Validation & Verification

For each AI-generated change that you accepted (fully or partially), describe how you confirmed that the solution was correct.

| Issue / Feature                | How did you verify the AI suggestion?                                                                                                                                                                               | Evidence that the fix worked                                                                            |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| BUG-01: Password in login log  | Read the modified log line in the diff, confirmed only `email` field remains. Cross-referenced with pino structured logging format.                                                                                 | Diff shows `password: input.password` removed. `pnpm lint` passes.                                      |
| BUG-03: updateTask validation  | Read Zod documentation for `.partial()` behavior. Confirmed unknown keys are stripped by default. Added test for partial parsing.                                                                                   | Test `taskSchema.partial().parse({ status: 'done' })` passes and returns only `status`.                 |
| BUG-04: setInterval cleanup    | Compared against React documentation for `useEffect` cleanup patterns.                                                                                                                                              | Cleanup function `() => clearInterval(id)` is returned from the effect.                                 |
| BUG-05: CORS restriction       | Read the CORS callback logic. Tested mentally with matching and non-matching origins.                                                                                                                               | Non-allowlisted origins receive `new Error('Not allowed by CORS')`.                                     |
| BUG-15: Error handler params   | Read Express.js documentation on error-handling middleware. Counted parameters in the final code.                                                                                                                   | `(error, _req, res, _next)` = 4 parameters. Express will now route errors to this handler.              |
| BUG-12: Dashboard N+1          | Traced the aggregation pipeline logic. `$match` filters to done tasks in user's projects. `$group` counts them. Compared result shape with original `reduce(total + count)`.                                        | Same total count produced. DB queries reduced from N+3 to 3.                                            |
| BUG-17: Rate limiting          | Read express-rate-limit documentation. Verified middleware is applied to exactly 3 routes: register, login, forgot-password. Verified it's NOT applied to refresh (requires valid token) or logout (authenticated). | `pnpm lint` and `pnpm typecheck` pass. Routes file shows `authLimiter` on correct endpoints.            |
| Docker fixes (BUG-07/08/10/11) | Reviewed Dockerfile syntax against Docker multi-stage build documentation. Verified healthcheck command against mongo:7 image (uses `mongosh`). Confirmed `ARG` → `ENV` ordering before `RUN next build`.           | `pnpm build` succeeds locally. Docker Compose syntax is valid.                                          |
| Test suite expansion           | Ran `pnpm test` — all 37 tests pass. Manually reviewed each test assertion to confirm it tests the intended behavior.                                                                                               | 3 test files, 37 tests, 0 failures, 1.23s runtime.                                                      |
| Token test env failure         | Traced import chain manually: `tokens.test.ts` → `tokens.ts` → `env.ts` → `schema.parse(process.env)`. Understood vitest `setupFiles` runs before test imports.                                                     | After adding `tests/setup.ts` with env vars and configuring `vitest.config.ts`, all 9 token tests pass. |

---

# 4. Incorrect or Misleading AI Suggestions

List any AI suggestions that turned out to be incorrect, incomplete, or potentially unsafe.

| Issue                | AI Suggested                                                                                                                    | Why it was Incorrect                                                                                                                                                                                                                                                                     | Final Solution                                                                                                                                                                                     |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Token tests setup    | AI wrote `tokens.test.ts` that imports `tokens.ts` which imports `env.ts` — but didn't set up env vars for the test environment | `env.ts` calls `schema.parse(process.env)` at the module level. In the test environment, `MONGO_URI`, `JWT_ACCESS_SECRET`, and `JWT_REFRESH_SECRET` are not set, causing a `ZodError` at import time. The AI didn't account for the Zod validation running during module initialization. | Created `tests/setup.ts` with required env vars set on `process.env` before any module imports. Configured `vitest.config.ts` with `setupFiles: ['./tests/setup.ts']`. All 9 token tests now pass. |
| Cross-env dependency | AI used `npx -y cross-env` to fix the Windows lint script                                                                       | While functionally correct, `npx -y` downloads `cross-env` on every lint run, adding latency. A better approach would be to add `cross-env` as a devDependency or migrate to ESLint flat config.                                                                                         | Kept the `npx -y cross-env` approach as the minimal change that preserves the existing ESLint configuration. The download is cached after the first run.                                           |

---

## 5. Significant Engineering Decisions

Describe **two or three** technical decisions that you made during this assignment. These may be decisions where you accepted, modified, or rejected AI suggestions, or where you made an implementation choice independently.

| Decision                                                                                                              | Options Considered                                                                                                                                                                                                                    | Final Choice                                                 | Reasoning                                                                                                                                                                                                                                                                                                                                               |
| --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| BUG-13: `requireRole` middleware is exported but never applied to any route — should we add role-based access gating? | (a) Add `requireRole('admin')` to admin-only routes like DELETE project. (b) Document the issue but don't add role restrictions.                                                                                                      | Document only (option b).                                    | The assessment says "do not remove features to hide defects" — but adding unexpected access restrictions could break intended functionality. Without product requirements specifying which routes should be admin-only, adding role gates would be speculative. A wrong guess could lock regular users out of features they're supposed to access.      |
| CORS origin configuration approach — how should allowed origins be specified?                                         | (a) Hardcode `http://localhost:3000` as the only allowed origin. (b) Use a single env var with comma-separated values: `CORS_ORIGIN=http://localhost:3000,https://app.bugforge.com`. (c) Keep the wildcard CORS (accept all origins). | Environment variable with comma-separated values (option b). | Most flexible for different environments. A single `CORS_ORIGIN` env var works in Docker (production origins), local dev (`localhost:3000`), and staging (staging URL) without code changes. The comma-separated format supports multiple origins (e.g., main app + admin panel) while maintaining a strict allowlist.                                  |
| Dashboard N+1 fix — aggregate total or aggregate per-project?                                                         | (a) Single `$group` with `_id: null` for total completed count across all projects. (b) `$group` by `project` ID for per-project completed counts. (c) Keep N+1 but add caching.                                                      | Single `$group` aggregation for total count (option a).      | The dashboard response only needs `statistics.completedTasks` (a single number). There's no per-project completion breakdown in the response shape. Option (b) would return more data than needed, and option (c) adds cache invalidation complexity. The simplest fix that eliminates N+1 while matching the existing response contract is option (a). |

This section is intended to help us understand your engineering thought process. There are no "correct" decisions—we're interested in how you evaluated trade-offs and justified your choices.

---

# 6. Security & Privacy

Did you provide any of the following to an AI tool?

- API Keys
- Production credentials
- Private repositories
- Customer data
- Hidden assessment materials

☑ No

☐ Yes (Explain)

---

# 7. Estimated AI Contribution

Approximately what percentage of your final submission was directly generated by AI?

- ☐ 0%
- ☐ 1–25%
- ☐ 26–50%
- ☑ 51–75%
- ☐ 76–100%

Briefly explain your estimate.

AI assisted with systematic code review (reading all 30+ files), bug identification, fix implementation, test writing, and report generation. However, every suggestion was reviewed against source code and official documentation, verified through automated tests (37 tests passing), linting, type checking, and production builds before acceptance. The engineering judgment — what to fix, what to skip, severity assessment, alternative evaluation — was my own. The one case where AI was wrong (token test env setup) was caught and fixed through manual debugging (tracing the import chain). Overall, AI accelerated the process significantly but every change was independently verified.

---

# 8. Reflection

**Where AI saved the most time:**

The systematic code review was significantly accelerated. AI could read and cross-reference all 30+ source files simultaneously, identifying patterns like the Express error handler's 3-parameter issue (BUG-15) and the NEXT_PUBLIC env var build-time baking issue (BUG-08) that would have required careful reading of framework documentation to catch manually. The test suite expansion from 2 to 37 tests was also much faster with AI assistance — I could describe what each test should verify and get correct assertions generated.

**Where AI was not helpful:**

The token tests initially failed because AI didn't account for the Zod env validation at module import time. Understanding the vitest lifecycle (setupFiles → imports → tests) and the module initialization order required manual debugging. The Windows cross-platform lint issue also required understanding the specific PowerShell environment rather than generic Unix knowledge.

**A debugging step I performed without AI:**

When the token tests failed with `ZodError: [{ "path": ["MONGO_URI"], "message": "Required" }]`, I traced the full import chain manually: `tokens.test.ts` → `import from '../src/utils/tokens.js'` → `tokens.ts` → `import { env } from '../config/env.js'` → `env.ts` → `export const env = schema.parse(process.env)`. This showed me that the Zod schema validation runs at import time, before any test code executes. I then researched vitest's `setupFiles` configuration and confirmed that setup files run before test file imports, making it the correct place to set `process.env` variables.

**If I repeated this assignment, how would I use AI differently:**

I would run the project first (Step 2) before the code review (Step 3). The Docker and startup issues would surface immediately from `docker compose up` errors and provide concrete evidence for the bugs. I would also set up the test infrastructure (vitest config, env setup file) before writing any tests, rather than discovering the env requirement after the first test failure. Finally, I would ask AI to explicitly flag assumptions it's making about the runtime environment when generating test code.

---

# Candidate Declaration

I confirm that:

- This report accurately describes my AI usage.
- I understand every code change included in my submission.
- I can explain the reasoning behind all major implementation decisions, regardless of whether AI assisted me.

**Signature (Type Full Name):** Rohit Kumar Roy

**Date:** 2026-07-13
