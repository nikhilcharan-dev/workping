# WorkPing API (Core Backend)

The central Express.js API server for WorkPing. Handles authentication, employee management, attendance, leave, shifts, holidays, subscriptions, and real-time communication.

## Tech Stack

- **Runtime**: Node.js (ES modules)
- **Framework**: Express 5
- **Database**: MongoDB Atlas (Mongoose)
- **Cache**: Redis
- **Auth**: JWT (jsonwebtoken) + refresh token rotation · bcrypt (password hashing) · speakeasy (TOTP 2FA) · Google OAuth2 · Microsoft OAuth2
- **Real-time**: Socket.io + @socket.io/redis-adapter (cluster-safe room broadcasts)
- **Process model**: Node.js `cluster` (one worker per CPU core) · PM2 in production
- **Task scheduling**: node-cron (subscription renewals, shift reminders)
- **File uploads**: Multer (profile images, bulk employee Excel import via XLSX)
- **Security**: helmet · express-rate-limit (200 req/15 min global, 10 req/15 min auth/OTP)
- **Observability**: prom-client (Prometheus metrics) · Winston (structured logging)
- **Testing**: Jest · Supertest · `@testcontainers/mongodb` (containerised MongoDB replica set for DB integration tests)

## Getting Started

```bash
cd server
cp .env.example .env   # fill in all required values
npm install
npm run dev            # nodemon
# or
npm start              # production
```

## Environment Variables

See [`.env.example`](.env.example) for the full reference with descriptions.

Key variables:

| Variable | Description |
|---|---|
| `MONGODB_URI` | MongoDB Atlas connection string |
| `SECRET_KEY` | JWT signing secret |
| `REDIS_HOST/PORT/PASSWORD` | Redis connection |
| `GOOGLE_CLIENT_ID/SECRET` | Google OAuth2 |
| `MS_CLIENT_ID/SECRET` | Microsoft OAuth2 |

## Project Structure

```
server/
├── app/           # Express app setup + Socket.io
├── config/        # Mongoose, Redis config
├── controllers/   # Route handlers (admin, user, auth, otp, 2fa)
├── middleware/    # Auth guards, error handler, multer
├── models/        # Mongoose schemas (Employee, Attendance, Leave, ...)
├── routes/        # Web routes (admin + user) and app/internal routes
├── services/      # Business logic (subscriptions, shift reminders)
├── utils/         # Shared utilities
├── helpers/       # Formatting, date helpers
├── __tests__/
│   ├── setup/
│   │   ├── globalSetup.js    # Start mongo:7 Docker container (replica set)
│   │   ├── globalTeardown.js # Stop container
│   │   └── db.js             # connectTestDB / clearCollections / Redis mock
│   ├── auth.integration.test.js  # Register · login · refresh · logout (real MongoDB)
│   ├── security.test.js          # JWT middleware · blacklistToken / isTokenBlacklisted unit
│   ├── auth.test.js              # Validation-rejection paths (no DB)
│   ├── otp.test.js               # OTP validation paths (no DB)
│   ├── health.test.js            # /health · /metrics smoke tests
│   └── validators.test.js        # 55+ unit tests across all validator functions
├── jest.config.js              # Unit + security tests
├── jest.integration.config.js  # DB integration tests (@testcontainers/mongodb)
└── server.js                   # Entry point (cluster bootstrap)
```

## API Overview

| Prefix | Description |
|---|---|
| `POST /auth/*` | Login, OAuth2 callbacks, token refresh |
| `POST /otp/*` | Email OTP send/verify |
| `POST /2fa/*` | TOTP setup, verify |
| `GET/POST /admin/employees` | Employee CRUD, bulk import |
| `GET/POST /admin/attendance` | Attendance management |
| `GET/POST /admin/leaves` | Leave approvals |
| `GET/POST /admin/holidays` | Holiday calendar |
| `GET/POST /admin/subscriptions` | Plan management |
| `GET/POST /user/attendance` | Employee check-in/out |
| `GET/POST /user/leaves` | Leave requests |
| `GET /user/profile` | Employee profile |

## Testing

### Unit + security tests (no database required)
```bash
npm test
```

Covers: validator functions, auth route rejection paths, OTP validation, health/metrics endpoints, JWT middleware rejection paths, `blacklistToken` / `isTokenBlacklisted` unit tests with mocked Redis.

### DB integration tests (requires Docker)
```bash
npm run test:integration
```

Spins up a `mongo:7` Docker container with a single-node replica set (required for Mongoose transactions used in `register`). Redis is replaced with an in-memory mock. Tests the full auth lifecycle against a real database:

| Test | What is verified |
|---|---|
| `register` → 201 | Admin + Account created atomically in a MongoDB transaction; tokens in response |
| `register` duplicate email → 409 | Unique index on `email` enforced |
| `login` valid credentials → 200 | bcrypt compare + token pair generation |
| `login` wrong password → 401 | Credential rejection |
| `login` unknown email → 401 | Account lookup failure |
| Token → `GET /verify-cookie` → 200 | JWT + DB round-trip; role in response |
| Refresh token rotation | New pair issued; same token rejected on second use |
| Logout → token blacklisted | Subsequent request returns `TOKEN_REVOKED` |

## Scripts

```bash
npm run seed:demo   # seed demo data
npm run seed:live   # seed live/production data
```

## Related Services

- [workping-biometric](../../face-api-microservice) — face recognition engine
- [workping-mailer](../../mailer-microservice) — email OTP delivery
- [workping-payments](../../phonepe-gateway-microservice) — PhonePe UPI gateway
- [workping-chatbot](../../whatsapp-microservice) — WhatsApp chatbot
- [workping-storage](../../oracle-cloud-object-microservice) — file storage
