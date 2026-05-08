# 🏗️ Architecture – Mailer Microservice

> A stateless, plug-and-play email & OTP microservice built for **WorkPing** and adaptable to any internal product.

---

## 📐 High-Level Overview

```
┌──────────────────────────────────────────────────────────────┐
│                        Client / Service                       │
│              (Any internal microservice or frontend)          │
└──────────────────────┬───────────────────────────────────────┘
                       │  HTTP POST (JSON)
                       │  Authorization: <SECRET>
                       ▼
┌──────────────────────────────────────────────────────────────┐
│                     Express.js Server                         │
│                                                              │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────────┐ │
│  │  Auth Guard  │→ │  Route Layer  │→ │   Mailer Service    │ │
│  │ (Middleware) │  │  (Routers)    │  │  (mail/mailer.js)   │ │
│  └─────────────┘  └──────────────┘  └────────┬────────────┘ │
│                                               │              │
│                   ┌───────────────────────────┤              │
│                   │                           │              │
│                   ▼                           ▼              │
│  ┌────────────────────────┐  ┌──────────────────────────┐   │
│  │   Template Engine       │  │    Nodemailer Transport   │   │
│  │  (Handlebars + Design   │  │   (Gmail SMTP / Custom)   │   │
│  │   System)               │  │                           │   │
│  └────────────────────────┘  └──────────────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                Redis (OTP Store)                      │   │
│  │   Key: otp:email:<addr>  │  Key: otp:reset:<addr>    │   │
│  │   TTL: 30 min            │  TTL: 10 min              │   │
│  └──────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
```

---

## 📁 Project Structure

```
mailer-microservice/
├── server.js                  # Entry point – Express app, middleware, routes
├── package.json               # Dependencies & scripts
├── architecture.md            # This file
├── README.md                  # Usage documentation
│
├── config/
│   ├── mailTransporter.js     # Nodemailer SMTP transport configuration
│   └── redisConfig.js         # Redis client setup & connection
│
├── mail/
│   ├── mailer.js              # Send functions (one per template type)
│   └── templates.js           # Handlebars-compiled HTML email templates
│
├── routes/
│   ├── router.mail.js         # Mail endpoints (alerts, greeting, forgot-password, etc.)
│   └── router.otp.js          # OTP endpoints (send, verify for email & reset)
│
├── utils/
│   └── services.mail.js       # SMTP service presets (Gmail, Outlook)
│
└── public/
    └── templates.html         # Visual template gallery (browser preview)
```

---

## 🔑 Core Components

### 1. Express Server (`server.js`)

| Concern | Detail |
|---------|--------|
| **Port** | `process.env.PORT` (default `3000`) |
| **Middleware** | JSON body parser, URL-encoded parser |
| **Auth** | Header-based: `Authorization: <SECRET>` — applied to all `/api/*` routes |
| **Public routes** | `GET /` (health), `GET /templates` (template gallery) |
| **Protected routes** | `POST /api/v1/mail/*`, `POST /api/v1/otp/*` |

### 2. Mail Transport (`config/mailTransporter.js`)

- Uses **Nodemailer** with Gmail SMTP (Google App Passwords)
- Auto-verifies connection on startup
- Easily swappable to any SMTP provider

### 3. Redis Store (`config/redisConfig.js`)

- **Purpose**: OTP storage with automatic TTL expiry
- **Keys**:
  - `otp:email:<email>` → Email verification OTP (TTL: 30 min)
  - `otp:reset:<email>` → Password reset OTP (TTL: 10 min)
- **Guarantees**: One-time use, deleted on verification

### 4. Template Engine (`mail/templates.js`)

- **Design System**: Centralized brand constants (colors, fonts, radius)
- **Base Layout**: Shared HTML shell with header bar, logo, footer
- **Templates** (10 total):
  1. **OTP Verification** – email verification code
  2. **Reset Password OTP** – password reset code (warning accent)
  3. **Verify Password** – confirmation after password verified (success accent)
  4. **Forgot Password** – link-based password reset with CTA button
  5. **Welcome / Greeting** – onboarding email with org & role
  6. **Alert: Info** – informational notice
  7. **Alert: Warning** – warning with optional action link
  8. **Alert: Danger** – critical alert with optional action link
  9. **Alert: Success** – positive confirmation
  10. **Notification** – generic notification

### 5. Mailer Service (`mail/mailer.js`)

One exported `async` function per template type:

| Function | Parameters |
|----------|-----------|
| `sendEMail` | `email, subject, content` |
| `sendEmailOTP` | `email, otp` |
| `sendResetPasswordOTP` | `email, otp` |
| `sendVerifyPassword` | `email` |
| `sendForgotPassword` | `email, resetLink` |
| `sendGreeting` | `email, name, org, role` |
| `sendAlertInfo` | `email, title, message` |
| `sendAlertWarning` | `email, title, message, actionLink` |
| `sendAlertDanger` | `email, title, message, actionLink` |
| `sendAlertSuccess` | `email, title, message` |
| `sendNotification` | `email, title, message` |
| `sendRawHTML` | `email, subject, html` |

---

## 🌐 API Routes

### OTP Routes (`/api/v1/otp`)

| Method | Endpoint | Description | Body |
|--------|----------|-------------|------|
| `POST` | `/send-email-otp` | Send email verification OTP | `{ email }` |
| `POST` | `/send-reset-password-otp` | Send password reset OTP | `{ email }` |
| `POST` | `/verify-email-otp` | Verify email OTP | `{ email, otp }` |
| `POST` | `/verify-reset-password-otp` | Verify reset password OTP | `{ email, otp }` |
| `POST` | `/send-phone-otp` | _(placeholder)_ | `{ phone }` |
| `POST` | `/verify-phone-otp` | _(placeholder)_ | `{ phone, otp }` |

### Mail Routes (`/api/v1/mail`)

| Method | Endpoint | Description | Body |
|--------|----------|-------------|------|
| `POST` | `/send-mail` | Send templated email | `{ email, subject, content }` |
| `POST` | `/send-html` | Send raw HTML email | `{ email, subject, html }` |
| `POST` | `/forgot-password` | Forgot password (link) | `{ email, resetLink }` |
| `POST` | `/verify-password` | Password verified confirmation | `{ email }` |
| `POST` | `/greeting` | Welcome / onboarding email | `{ email, name, org, role }` |
| `POST` | `/alert/info` | Info alert | `{ email, title, message }` |
| `POST` | `/alert/warning` | Warning alert | `{ email, title, message, actionLink? }` |
| `POST` | `/alert/danger` | Danger alert | `{ email, title, message, actionLink? }` |
| `POST` | `/alert/success` | Success alert | `{ email, title, message }` |
| `POST` | `/notification` | Generic notification | `{ email, title, message }` |

### Public Routes (No Auth)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/` | Health check / landing page |
| `GET` | `/templates` | Visual template gallery |

---

## 🔒 Security Model

```
Client Request
     │
     ▼
┌─────────────────────────┐
│   Authorization Header   │──── Missing/Invalid ──→ 403 Unauthorized
│   must equal SECRET      │
└──────────┬──────────────┘
           │ Valid
           ▼
┌─────────────────────────┐
│   Body Validation        │──── Missing email ────→ 403 Bad Request
│   { email } required     │
└──────────┬──────────────┘
           │ Valid
           ▼
       Route Handler
```

- **API Key Auth**: Shared secret via `Authorization` header
- **No session state**: Completely stateless API layer
- **OTP Security**: Redis TTL auto-expiry, single-use (deleted after verification)
- **No PII stored**: Only OTP codes in Redis, auto-deleted

---

## 🔄 OTP Flow

### Email Verification

```
Client ──POST /send-email-otp──→ Server
                                   │
                                   ├─ Generate 6-digit OTP
                                   ├─ Store in Redis (TTL: 30m)
                                   ├─ Render OTP template
                                   └─ Send via SMTP ──→ User Inbox

Client ──POST /verify-email-otp──→ Server
                                     │
                                     ├─ Fetch OTP from Redis
                                     ├─ Compare with submitted OTP
                                     ├─ Delete from Redis on match
                                     └─ Return { verified: true }
```

### Password Reset

```
Client ──POST /send-reset-password-otp──→ Server
                                            │
                                            ├─ Generate 6-digit OTP
                                            ├─ Store in Redis (TTL: 10m)
                                            ├─ Render reset password template
                                            └─ Send via SMTP ──→ User Inbox

Client ──POST /verify-reset-password-otp──→ Server
                                              │
                                              ├─ Fetch OTP from Redis
                                              ├─ Validate & delete
                                              └─ Return { verified: true }
```

---

## 🎨 Email Design System

All templates share a unified design language:

| Token | Value | Usage |
|-------|-------|-------|
| `brand` | `#2563eb` | Primary accent, links, buttons |
| `success` | `#16a34a` | Success alerts, verify password |
| `warning` | `#d97706` | Warning alerts, reset password |
| `danger` | `#dc2626` | Critical alerts |
| `bg` | `#f8fafc` | Email background |
| `card` | `#ffffff` | Card background |
| `text` | `#1e293b` | Heading text |
| `muted` | `#64748b` | Body text |
| `border` | `#e2e8f0` | Borders, dividers |
| `radius` | `12px` | Border radius |
| `font` | Segoe UI / Roboto | Font stack |

### Template Anatomy

```
┌─────────────────────────────┐
│ ████████████████████████████ │  ← Accent color bar (4px)
│                             │
│        WorkPing             │  ← Logo text (brand color)
│                             │
│  ┌───────────────────────┐  │
│  │  Title                 │  │  ← h1 heading
│  │  Hi NAME, message...   │  │  ← Personalized body
│  │                        │  │
│  │  ┌──── ── ── ── ──┐   │  │  ← OTP box / CTA button
│  │  │   4 8 2 9 3 7   │   │  │
│  │  └──── ── ── ── ──┘   │  │
│  │                        │  │
│  │  ▌ Info box message    │  │  ← Contextual info box
│  │                        │  │
│  └───────────────────────┘  │
│                             │
│  © 2026 WorkPing            │  ← Footer
│  Auto-generated message     │
└─────────────────────────────┘
```

---

## 🧱 Tech Stack

| Component | Technology |
|-----------|-----------|
| Runtime | Node.js (ESM) |
| Framework | Express.js v5 |
| Email Transport | Nodemailer + Gmail SMTP |
| Template Engine | Handlebars |
| OTP Storage | Redis (with TTL) |
| Containerization | Docker & Docker Compose |

---

## 🛣️ Roadmap

- [ ] 📱 Phone OTP support (SMS provider integration)
- [ ] 🔄 Rate limiting per email/IP
- [ ] 📊 Health check & metrics endpoint
- [ ] 🔐 mTLS / JWT-based service-to-service auth
- [ ] 📎 Attachment support for email routes
- [ ] 🎨 Custom branding per tenant (multi-tenant support)
- [ ] 🧪 Unit & integration tests

