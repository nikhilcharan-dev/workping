# WorkPing — System Architecture

## Overview

WorkPing is a **multi-tenant employee management platform** with biometric attendance, subscription billing, AI-powered communication, and cloud storage. It is built as a MERN-stack monolith for the core API with purpose-built microservices for each external integration.

---

## High-Level Service Map

```
┌─────────────────── CLIENTS ────────────────────────────────────────────────┐
│  Admin Dashboard       Employee Portal         Mobile App                  │
│  (React + Vite)        (React + Vite)          (React Native + Expo)       │
│  admin-ui/:5173        employees-ui/:5174       iOS / Android               │
└──────────────────────────┬─────────────────────────────────────────────────┘
                           │  HTTPS
                           ▼
┌─────────────────── NGINX (Reverse Proxy / API Gateway) ────────────────────┐
│  • SSL/TLS termination                                                      │
│  • Path-based routing  (/api/* → :5000,  /biometric/* → :8001, ...)        │
│  • Subdomain routing   (workping.live, phonepe.workping.live, ...)          │
│  • Static file serving for compiled React dist/ builds                     │
│  • WebSocket upgrade pass-through (Socket.io)                              │
└──────────────────────────┬─────────────────────────────────────────────────┘
                           │  HTTP (internal, JWT cookie / Bearer token)
                           ▼
┌─────────────────── CORE API ───────────────────────────────────────────────┐
│  workping-api   (Node.js cluster · Express 5 · port 5000)                  │
│  ┌───────────┐  ┌──────────┐  ┌────────────┐  ┌──────────────────────┐   │
│  │ Auth      │  │ Employees│  │ Attendance │  │ Subscriptions/Orders │   │
│  │ JWT+2FA   │  │ CRUD     │  │ Face+GPS   │  │ Plans/Payments       │   │
│  │ OAuth SSO │  │ Shifts   │  │ Leave Mgmt │  │ Renewal cron job     │   │
│  └───────────┘  └──────────┘  └────────────┘  └──────────────────────┘   │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  Real-time layer: Socket.io  +  @socket.io/redis-adapter             │  │
│  │  (payment status push, live attendance board — cluster-safe via Redis)│  │
│  └──────────────────────────────────────────────────────────────────────┘  │
└────┬──────────┬──────────┬──────────┬──────────┬──────────────────────────┘
     │          │          │          │          │   internal HTTP (API key auth)
     ▼          ▼          ▼          ▼          ▼
  BIOMETRIC  MAILER    PAYMENTS   CHATBOT    STORAGE
  :8001      :3003      :3001      :3002      :8000
```

---

## Service Details

### 1. Core API — `centralized-server/server`
| Attribute | Value |
|---|---|
| Stack | Node.js + Express 5 + Mongoose + Redis |
| Process model | `cluster` — one worker per CPU, exponential-backoff restart |
| Auth | JWT (access + refresh tokens) + Google/Microsoft OAuth2 + TOTP 2FA |
| Real-time | Socket.io + `@socket.io/redis-adapter` (cluster-safe rooms) |
| Jobs | `node-cron` — subscription auto-renewal, shift reminders |
| Validation | Custom `validators.js` (email regex, phone format, password strength) |
| File uploads | Multer — profile images + bulk employee Excel |
| Security | `helmet`, `express-rate-limit` (200 req/15 min global; 10 req/15 min for auth/OTP) |

### 2. Biometric Service — `face-api-microservice`
| Attribute | Value |
|---|---|
| Stack | Python 3.10+ + FastAPI + Uvicorn |
| Face detection | InsightFace AntelopeV2 — SCRFD (detection) + ArcFace R100 (embedding) |
| Embedding | 512-dimensional L2-normalised vector |
| Similarity | Cosine (numpy dot product of unit vectors); threshold = 0.6 |
| Bulk search | FAISS `IndexFlatIP` for org-level multi-user search |
| Inference model | Async queue via Redis `BLPOP` + `ThreadPoolExecutor` (keeps event loop free) |
| Cache | Redis: embedding cache (TTL configurable) + inference ticket cache (TTL 300s) |
| DB | MongoDB (Motor async driver) — stores enrolled embeddings |
| GPU | CUDA auto-detection; falls back to CPU ONNX Runtime |
| GPU throughput | ~6.4 req/s (~384/min, ~23k/hr, ~550k/day) — measured at c=10,20,50 on DGX B200 |

### 3. Mailer Service — `mailer-microservice`
| Attribute | Value |
|---|---|
| Stack | Node.js + Express 5 + Nodemailer + Redis |
| Function | Email OTP generation, delivery, verification, expiry |
| OTP storage | Redis key with TTL (default 30 min); deleted on successful verify |
| Templates | Handlebars HTML email templates |
| Auth | API key in `Authorization: Bearer` header |
| Scalability | Stateless — any instance can verify any OTP (Redis is shared state) |

### 4. Payments Service — `phonepe-gateway-microservice`
| Attribute | Value |
|---|---|
| Stack | Node.js + Express 5 + Axios |
| Provider | PhonePe UPI (pg-sandbox for dev, pg for prod) |
| Flow | Core API → initiate → PhonePe → webhook → core API |
| Webhook auth | SHA-256 `HMAC(username:password)` compared with `crypto.timingSafeEqual` |
| Callback | Redirect URL polling via PhonePe status API (fallback to direct callback) |
| Core API webhook | Verified by `x-webhook-secret` header with `crypto.timingSafeEqual` |

### 5. Chatbot Service — `whatsapp-microservice`
| Attribute | Value |
|---|---|
| Stack | Node.js + Express 5 + BullMQ + Redis |
| Channel | WhatsApp Cloud API (Meta) |
| Message queue | BullMQ (Redis-backed) — decouples webhook receipt from processing |
| Intent detection | Rule engine (keyword/pattern, fast) → LLM fallback (NLP, flexible) |
| Response strategy | Template (structured data) or LLM-generated (conversational) |
| LLM providers | Ollama (local) / AWS Bedrock / **Any OpenAI-compatible API** (see below) |

### 6. Storage Service — `oracle-cloud-object-microservice`
| Attribute | Value |
|---|---|
| Stack | Node.js + Express 5 + OCI SDK |
| Provider | Oracle Cloud Infrastructure Object Storage |
| Features | Upload, download, list, delete; pre-signed URLs (15-min expiry) |
| Security | `helmet`, rate limiting, API key auth, filename sanitisation |
| Observability | Built-in performance dashboard with 30-day metrics export |

---

## LLM Provider Flexibility (Chatbot)

The chatbot is designed to be **provider-agnostic**. The `custom` provider uses the OpenAI Chat Completions wire format with a Bearer token, making it compatible with any of the following without code changes:

| Provider | Base URL | Format |
|---|---|---|
| Ollama (local) | `http://localhost:11434` | `ollama` |
| AWS Bedrock | AWS SDK | `bedrock` |
| OpenAI | `https://api.openai.com/v1` | `openai` |
| Groq | `https://api.groq.com/openai/v1` | `openai` |
| Together AI | `https://api.together.xyz/v1` | `openai` |
| OpenRouter | `https://openrouter.ai/api/v1` | `openai` |
| Mistral AI | `https://api.mistral.ai/v1` | `openai` |
| Remote Ollama | `http://<host>:11434` | `ollama` |
| Custom/proprietary | Any URL | `raw` |

Provider can be switched at runtime via the dashboard API — no restart required. Config changes can be persisted to `.env` via `POST /api/dashboard/sync`.

---

## Data Flow: Employee Face Check-In

```
Mobile App
  │  POST /api/v1/detect  { image_base64, user_id, org_id }
  ▼
Biometric Service ──► Redis: push to face_tasks_queue
  │  return { ticket_id }
  │
  ├── inference_worker (async loop)
  │     ├── MongoDB: fetch stored embedding for user
  │     ├── InsightFace: extract embedding from frame  [ThreadPoolExecutor]
  │     ├── cosine_similarity(query_emb, stored_emb)
  │     └── Redis: write result to ticket:<id>  TTL=300s
  │
Mobile App polls GET /result/<ticket_id>
  │
  ▼
Core API  POST /api/attendance/check-in  { result, location }
  ├── MongoDB: write AttendanceRecord
  ├── Redis: publish payment/attendance event
  └── Socket.io: emit to admin dashboard room
```

---

## Caching Architecture

```
┌─────────────────────────────────────────────────────┐
│                      Redis                          │
│                                                     │
│  Key pattern              TTL     Used by           │
│  ─────────────────────────────────────────────────  │
│  otp:<email>              30 min  Mailer service    │
│  payment:<userId>         session Core API          │
│  face_tasks_queue         stream  Biometric worker  │
│  ticket:<uuid>            5 min   Biometric results │
│  embedding:<org>:<emp>    config  Biometric cache   │
│  sub:renewal:<adminId>    cron    Subscription svc  │
│  socket.io#*              rooms   Socket.io adapter │
└─────────────────────────────────────────────────────┘
```

Redis serves four distinct roles across the platform:
1. **OTP store** — source of truth for email verification codes (mailer)
2. **Payment state** — temporary payment-pending key for real-time Socket.io push
3. **Task queue** — `BLPOP` queue for biometric inference jobs
4. **Pub/Sub bus** — Socket.io Redis adapter for cross-worker room broadcast

---

## Security Layers

```
Layer 1 — Network
  • CORS allowlist (no wildcard in production)
  • HTTPS enforced by reverse proxy

Layer 2 — Transport
  • helmet (security headers: HSTS, X-Frame-Options, X-Content-Type-Options)
  • 10 KB body size limit (prevents payload inflation attacks)

Layer 3 — Rate Limiting
  • Global:  200 req / 15 min per IP    (express-rate-limit)
  • Auth:    10  req / 15 min per IP    (applied to /auth, /otp, /forgot-password)

Layer 4 — Authentication
  • Web:    JWT access token (15 min) + refresh token rotation
  • Mobile: Bearer token in Authorization header
  • SSO:    Google OAuth2, Microsoft OAuth2
  • 2FA:    TOTP (speakeasy) — QR code setup, per-request code verify

Layer 5 — Authorisation
  • requireRole middleware — "admin" | "manager" | "user"
  • authorizeManager — cross-team access control

Layer 6 — Inter-Service
  • API key in Authorization: Bearer header on all microservice calls
  • Webhook secret compared with crypto.timingSafeEqual (timing-attack safe)

Layer 7 — Data
  • Passwords: bcrypt (cost factor 10)
  • JWT signed with HS256 SECRET_KEY
  • OTPs: 6-digit numeric, TTL-expired, single-use (deleted on verify)
```

---

## Self-Hosted vs Third-Party Services

| Service | Type | Notes |
|---|---|---|
| MongoDB Atlas | **Third-party cloud** | Managed database, WorkPing data |
| Redis | **Self-hosted on VM** | Shared instance used by all services |
| Oracle Cloud Object Storage | **Third-party cloud** | File storage (profile images, Excel uploads) |
| PhonePe | **Third-party payment** | UPI payment gateway |
| WhatsApp Cloud API (Meta) | **Third-party** | Messaging channel only |
| LLM provider | **Flexible** | Ollama self-hosted or cloud API (OpenAI/Groq/Bedrock) |
| Google OAuth2 | **Third-party** | SSO only |
| Microsoft OAuth2 | **Third-party** | SSO only |
| Mailer microservice | **Self-hosted on VM** | Internal SMTP relay wrapper |
| InsightFace models | **Self-hosted on VM** | Runs locally; no external API call for inference |
| FAISS index | **In-process** | In-memory vector search, no external service |

**VM-hosted services** (running in our own infrastructure):
- Redis — shared by all services
- Mailer microservice — wraps SMTP
- Biometric service — InsightFace runs entirely on-premises
- All Node.js microservices — deployed via PM2

---

## Technology Summary

| Layer | Technology |
|---|---|
| Frontend (admin, employee) | React 18, Vite 5, Bootstrap 5, ApexCharts, FullCalendar |
| Mobile | React Native 0.83, Expo 55, react-native-vision-camera |
| Core backend | Node.js, Express 5, Mongoose, Redis, Socket.io |
| Biometric | Python 3.10+, FastAPI, InsightFace, FAISS, NumPy, OpenCV |
| Message queue | BullMQ (Redis-backed) |
| Auth | JWT, bcrypt, speakeasy (TOTP), passport-style OAuth2 |
| Security middleware | helmet, express-rate-limit, CORS |
| Scheduled tasks | node-cron |
| Reverse proxy / gateway | Nginx (SSL termination, path routing, WebSocket upgrade, static serving) |
| Process management | Node.js cluster + PM2 (production) |
| Containerisation | Docker + Docker Compose (biometric, mailer, chatbot) |
| CI/CD | GitHub Actions → SSH → PM2 reload |
