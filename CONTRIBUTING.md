# Contributing to WorkPing

Thanks for taking the time to contribute. This document covers branch conventions, PR process, local dev setup, and coding standards.

---

## Table of Contents

- [Local Development Setup](#local-development-setup)
- [Branch Naming](#branch-naming)
- [Commit Messages](#commit-messages)
- [Pull Request Process](#pull-request-process)
- [Coding Conventions](#coding-conventions)
- [Service-Specific Notes](#service-specific-notes)
- [Reporting Bugs & Security Issues](#reporting-bugs--security-issues)

---

## Local Development Setup

### Prerequisites

| Tool | Version | Notes |
|---|---|---|
| Node.js | 20 LTS | Use `.nvmrc` — run `nvm use` |
| Python | 3.10+ | For face-api-microservice |
| Docker Desktop | latest | Runs Redis and optional microservices |
| MongoDB | Atlas account or local 7+ | |

### First-time setup

```bash
# 1. Clone
git clone <repo-url>
cd workping

# 2. Copy env files — fill each one in before running services
for dir in centralized-server/server admin-ui employees-ui \
           face-api-microservice mailer-microservice \
           oracle-cloud-object-microservice phonepe-gateway-microservice \
           whatsapp-microservice; do
  cp $dir/.env.example $dir/.env
done

# 3. Start infrastructure
docker compose up -d redis

# 4. Core API (port 5000)
cd centralized-server/server && npm install && npm run dev

# 5. Admin UI (port 5173) — new terminal
cd admin-ui && npm install && npm run dev

# 6. Employee UI (port 5174) — new terminal
cd employees-ui && npm install && npm run dev

# 7. Biometric service (port 8001) — new terminal
cd face-api-microservice
python -m venv venv && source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app:app --reload --port 8001

# 8. Remaining microservices — via Docker Compose
docker compose up -d workping-mailer workping-payments workping-chatbot workping-storage
```

### Mobile app

```bash
cd mobile-app
npm install
npx expo start    # scan QR with Expo Go, or press 'a' for Android emulator
```

### Linting

```bash
# JavaScript / TypeScript (run from any service directory)
npm run lint

# Python
cd face-api-microservice
ruff check .
black --check .
```

---

## Branch Naming

Use lowercase kebab-case with a type prefix:

| Type | When to use | Example |
|---|---|---|
| `feat/` | New feature | `feat/leave-bulk-export` |
| `fix/` | Bug fix | `fix/otp-expiry-race` |
| `chore/` | Dependency updates, tooling | `chore/dependabot-updates` |
| `refactor/` | Internal restructure, no behavior change | `refactor/auth-middleware` |
| `test/` | Adding or updating tests | `test/payment-webhook` |
| `docs/` | Documentation only | `docs/api-reference` |
| `hotfix/` | Urgent production fix | `hotfix/face-threshold-null` |

Branch off `main` for all changes. No long-lived feature branches — keep PRs small and focused.

---

## Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <short summary>

[optional body — explain WHY, not WHAT]
```

**Types:** `feat`, `fix`, `chore`, `refactor`, `test`, `docs`, `perf`, `ci`

**Scopes:** `auth`, `attendance`, `leave`, `billing`, `chatbot`, `biometric`, `storage`, `mailer`, `admin-ui`, `employees-ui`, `mobile`, `ci`

**Examples:**

```
feat(chatbot): add Groq provider to LLM engine

fix(auth): prevent race condition on parallel OTP verify requests

chore(deps): bump jsonwebtoken from 9.0.0 to 9.0.2

test(billing): add PhonePe webhook signature verification tests
```

Keep the subject line under 72 characters. No period at the end.

---

## Pull Request Process

1. **One concern per PR.** A feature PR should not also refactor unrelated code.
2. **Fill in the PR template** — describe what changed and why, and include a testing checklist.
3. **All CI checks must pass** before requesting review (secret scan, lint, tests).
4. **Self-review first** — read your own diff before assigning reviewers.
5. **Link related issues** with `Closes #<issue>` in the PR body so they auto-close on merge.
6. **Squash merge** is the default strategy on `main` — keep history clean.

### PR description template

```markdown
## What
<!-- One-paragraph description of the change -->

## Why
<!-- Context: what problem does this solve, or what requirement does it address? -->

## Testing
- [ ] Manual smoke test on affected flows
- [ ] Existing tests still pass (`npm test`)
- [ ] New tests added for new logic (if applicable)

## Related
Closes #
```

---

## Coding Conventions

### JavaScript / Node.js

- **ES modules** (`import`/`export`) — no CommonJS `require()` in new code.
- **Async/await** — no raw Promise chains or callbacks.
- **asyncHandler** wrapper on all Express route handlers — never let unhandled rejections reach Express.
- **AppError** for all operational errors — include HTTP status code and a user-safe message.
- **No comments explaining what the code does** — name things clearly instead. A comment is only warranted when the *why* would surprise a reader.
- Use module aliases (`#models/*`, `#services/*`, `#middleware/*`) — no `../../..` relative paths.
- Prettier and ESLint configs are in the repo root — run `npm run lint` before pushing.

### Python (face-api-microservice)

- Format with `black`, lint with `ruff`.
- Type-hint all function signatures.
- No synchronous blocking calls inside async FastAPI route handlers — use `asyncio.to_thread` if needed.
- Environment variables via `os.getenv()` with explicit defaults; never hardcode thresholds or credentials.

### React (admin-ui / employees-ui)

- Functional components and hooks only — no class components.
- `react-hook-form` + `yup` for all forms — no uncontrolled inputs.
- Co-locate component styles; no global CSS side effects.
- Keep components under ~150 lines — extract logic into custom hooks.

### React Native (mobile-app)

- Follow Expo managed workflow constraints — no bare native modules without team discussion.
- Platform-specific code goes in `.ios.js` / `.android.js` files, not `Platform.OS` ternaries inside shared components.

### General

- **No secrets in code.** Every secret goes in `.env` (gitignored). `.env.example` is the source of truth for required variables — update it whenever you add a new variable.
- **Validate at boundaries.** Validate and sanitize all user input at the route level. Trust internal service calls.
- **Database transactions** for any operation that writes to more than one collection.
- **No `console.log` in production code** — use the Winston logger (`logger.info`, `logger.warn`, `logger.error`).

---

## Service-Specific Notes

| Service | Key constraint |
|---|---|
| `centralized-server` | All routes must pass through auth middleware unless explicitly public (`/api/public/*`). Internal routes (`/internal/*`) are IP-restricted. |
| `face-api-microservice` | The SCRFD + ArcFace models are CPU-bound. Do not add synchronous blocking calls to the async FastAPI handlers. |
| `whatsapp-microservice` | All incoming messages are queued via BullMQ before processing. Do not process in the webhook handler directly. |
| `phonepe-gateway-microservice` | Webhook handlers must verify the SHA-256 HMAC signature before touching any state. Never skip this check in tests. |
| `admin-ui` / `employees-ui` | TensorFlow.js runs client-side for face detection preview. Keep bundle size in check — profile with `npm run build -- --analyze`. |

---

## Reporting Bugs & Security Issues

- **Bugs:** Open a GitHub issue with steps to reproduce, expected vs. actual behaviour, and relevant logs.
- **Security vulnerabilities:** Do **not** open a public issue. Follow the responsible disclosure process described in [SECURITY.md](SECURITY.md).
