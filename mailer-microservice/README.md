# Mailer Microservice

Internal email and OTP microservice for WorkPing. Handles OTP generation, delivery, verification, and expiry using Redis as the source of truth.

The API layer is stateless — any running instance can verify any OTP because Redis is the shared store.

---

## Features

- Send OTP via email
- Secure 6-digit OTP generation
- Redis-based OTP storage with configurable TTL
- Automatic OTP expiry and single-use invalidation on verify
- Multiple HTML email templates (welcome, alerts, notifications)
- API key authorization on all protected routes
- Docker and Docker Compose ready

---

## OTP Flow (Redis-Based)

1. Client calls `POST /api/v1/otp/send-email-otp`
2. Server generates a 6-digit OTP, stores it in Redis with TTL
3. OTP is sent to the recipient via SMTP
4. Client calls `POST /api/v1/otp/verify-email-otp` with the code
5. Server validates and deletes the key from Redis on match

One-time use — replay attacks are not possible once the key is deleted.

---

## API Endpoints

### OTP

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/v1/otp/send-email-otp` | Send email verification OTP |
| `POST` | `/api/v1/otp/send-reset-password-otp` | Send password reset OTP |
| `POST` | `/api/v1/otp/verify-email-otp` | Verify email OTP |
| `POST` | `/api/v1/otp/verify-reset-password-otp` | Verify password reset OTP |

All routes require `Authorization: <INTERNAL_SECRET>` header.

### Mail

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/v1/mail/send-mail` | Send templated email |
| `POST` | `/api/v1/mail/send-html` | Send raw HTML email |
| `POST` | `/api/v1/mail/forgot-password` | Forgot password email with reset link |
| `POST` | `/api/v1/mail/greeting` | Welcome / onboarding email |
| `POST` | `/api/v1/mail/alert/info` | Info alert email |
| `POST` | `/api/v1/mail/alert/warning` | Warning alert email |
| `POST` | `/api/v1/mail/alert/danger` | Danger/critical alert email |
| `POST` | `/api/v1/mail/alert/success` | Success confirmation email |
| `POST` | `/api/v1/mail/notification` | Generic notification email |

---

## Environment Variables

```env
PORT=3000
SECRET=internal_service_secret

REDIS_HOST=redis
REDIS_PORT=6379

MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=example@gmail.com
MAIL_PASS=app_password
```

---

## Docker

```bash
# Build
docker build -t workping-mailer .

# Run
docker run -d -p 3000:3000 --env-file .env workping-mailer
```

---

## Security Notes

- OTPs are stored with TTL (email: 30 min, password reset: 10 min)
- OTP deleted immediately after successful verification
- All `/api/*` routes protected via shared secret header

---

## Tech Stack

- **Runtime**: Node.js (ESM)
- **Framework**: Express 5
- **Email**: Nodemailer (SMTP) + Handlebars (HTML templates)
- **Cache / OTP store**: Redis (TTL keys, single-use invalidation)
- **Security**: helmet · express-rate-limit
- **Scheduling**: node-cron
- **Deployment**: Docker · Docker Compose
