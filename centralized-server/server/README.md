# WorkPing API (Core Backend)

The central Express.js API server for WorkPing. Handles authentication, employee management, attendance, leave, shifts, holidays, subscriptions, and real-time communication.

## Tech Stack

- **Runtime**: Node.js (ES modules)
- **Framework**: Express 5
- **Database**: MongoDB Atlas (Mongoose)
- **Cache**: Redis
- **Auth**: JWT + Google OAuth2 + Microsoft OAuth2 + TOTP 2FA
- **Real-time**: Socket.io (with Redis adapter for cluster mode)
- **Process model**: Node.js `cluster` (one worker per CPU core)
- **Task scheduling**: node-cron (subscription renewals, shift reminders)
- **File uploads**: Multer (profile images, bulk employee Excel)

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
├── scripts/       # Seed scripts
└── server.js      # Entry point (cluster bootstrap)
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
