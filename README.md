# WorkPing

> **Multi-tenant workforce management platform** — biometric attendance, real-time communication, subscription billing, and an AI-powered WhatsApp assistant, deployed across Oracle Cloud Infrastructure.

---

## Table of Contents

- [Overview](#overview)
- [Live Deployment](#live-deployment)
- [Infrastructure](#infrastructure)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Service Directory](#service-directory)
- [Technology Decisions](#technology-decisions)
- [Security Model](#security-model)
- [Data Flows](#data-flows)
- [Caching Architecture](#caching-architecture)
- [API Reference Overview](#api-reference-overview)
- [Local Development](#local-development)
- [Production Deployment](#production-deployment)
- [Future Scope](#future-scope)
- [License](#license)

---

## Overview

WorkPing is a full-stack B2B SaaS platform that gives organizations a complete operations hub:

| Capability | How it works |
|---|---|
| **Biometric attendance** | Face recognition check-in/check-out via mobile camera or browser webcam |
| **Employee management** | CRUD, role-based teams, shift scheduling, bulk Excel import |
| **Leave & holiday management** | Multi-level approval workflows, balance tracking |
| **Subscription billing** | Tiered plans paid via UPI through PhonePe; auto-renewal cron |
| **AI chatbot** | WhatsApp-based assistant (intent + LLM hybrid) for employees to query attendance, apply leave, check salary |
| **File storage** | Profile images, Excel payroll, and documents stored in OCI Object Storage |
| **Real-time updates** | Socket.io with Redis adapter for live attendance board and payment status push |
| **Two-factor auth** | TOTP (authenticator app), Google/Microsoft OAuth2 SSO |

---

## Live Deployment

| Service | Public URL | Notes |
|---|---|---|
| Admin Dashboard | `https://admin.workping.live` | React SPA served via Nginx |
| Employee Portal | `https://employee.workping.live` | React SPA served via Nginx |
| Core API | `https://api.workping.live` | Node.js cluster behind Nginx |
| Biometric Service | `https://face.workping.live` | Python FastAPI + InsightFace |
| Payment Gateway | `https://phonepe.workping.live` | PhonePe webhook receiver |
| WhatsApp Chatbot | `https://whatsapp.workping.live` | Meta webhook + LLM engine |
| Object Storage Proxy | `https://s3.workping.live` | OCI Object Storage API |

All subdomains share the apex domain `workping.live` with TLS managed by Nginx + Certbot (Let's Encrypt).

---

## Infrastructure

Every workload runs on **Oracle Cloud Infrastructure (OCI)** across dedicated Ubuntu 22.04 LTS virtual machines:

```
┌─────────────────────────────────────────────────────────────┐
│  Oracle Cloud Infrastructure — ap-mumbai-1 / us-ashburn-1  │
│                                                             │
│  VM-1  api.workping.live                                    │
│        4 vCPU · 24 GB RAM · Ubuntu 22.04                   │
│        Core API (Node cluster + PM2) + Redis + Nginx        │
│                                                             │
│  VM-2  face.workping.live                                   │
│        4 vCPU · 24 GB RAM · Ubuntu 22.04                   │
│        Biometric Service (FastAPI + InsightFace, CPU ONNX)  │
│                                                             │
│  VM-3  *.workping.live (microservices)                      │
│        4 vCPU · 24 GB RAM · Ubuntu 22.04                   │
│        Mailer · PhonePe · WhatsApp · Storage services       │
│        (Docker Compose, PM2-supervised)                     │
│                                                             │
│  OCI Object Storage — managed bucket (no VM needed)        │
│  MongoDB Atlas — managed cluster (no VM needed)            │
└─────────────────────────────────────────────────────────────┘
```

**Why OCI?** Oracle Cloud's Always Free tier provides up to 4 vCPU and 24 GB RAM on Ampere (ARM) Flex instances at no cost, with zero egress fees. AWS/GCP/Azure charge for egress and offer far less on free tiers. At this stage of the product, OCI eliminates infrastructure cost while retaining production-grade hardware.

**Why dedicated VMs over a single monolith VM?** Fault isolation — a model-loading crash in the biometric service does not take down the core API. Independent scaling — the face service is CPU/GPU-bound; other services are I/O-bound.

---

## Architecture

```
┌────────────────────── CLIENTS ─────────────────────────────────────┐
│  Admin Dashboard         Employee Portal         Mobile App         │
│  admin.workping.live     employee.workping.live   iOS / Android      │
│  React 18 + Vite         React 18 + Vite          React Native + Expo│
└──────────────────────────────┬─────────────────────────────────────┘
                               │  HTTPS / WSS
                               ▼
┌────────────────── NGINX (Reverse Proxy + Gateway) ─────────────────┐
│  • TLS/SSL termination (Let's Encrypt)                              │
│  • Subdomain routing per service                                    │
│  • WebSocket upgrade pass-through (Socket.io)                       │
│  • Static file serving for compiled dist/ builds                    │
│  • Gzip compression + security headers                              │
└──────────────────────────────┬─────────────────────────────────────┘
                               │  HTTP (internal, JWT / Bearer token)
                               ▼
┌────────────────────── CORE API ────────────────────────────────────┐
│  api.workping.live   Node.js cluster · Express 5 · PM2             │
│                                                                     │
│  Auth          Employees    Attendance    Subscriptions/Billing     │
│  JWT + 2FA     CRUD         Face + GPS    Plans · PhonePe · Cron   │
│  OAuth SSO     Shifts       Leave Mgmt    Order tracking            │
│                                                                     │
│  Real-time:  Socket.io + @socket.io/redis-adapter (cluster-safe)   │
└──────┬──────────┬──────────┬──────────┬──────────┬────────────────┘
       │          │          │          │          │   API-key auth
       ▼          ▼          ▼          ▼          ▼
  BIOMETRIC   MAILER    PAYMENTS   CHATBOT    STORAGE
  :8001       :3003      :3001      :3002      :8000
  FastAPI     Express    Express    Express    Express
  InsightFace Nodemailer PhonePe    BullMQ     OCI SDK
  FAISS       Handlebars UPI        Bedrock    Pre-signed URLs

                ▼ shared state
         ┌─────────────┐       ┌──────────────────┐
         │   Redis 7   │       │  MongoDB Atlas   │
         │  (per-VM)   │       │  (managed)       │
         │  OTP store  │       │  All app data    │
         │  Task queue │       │  Face embeddings │
         │  Pub/Sub    │       │  Orders · Shifts │
         └─────────────┘       └──────────────────┘
```

---

## Project Structure

```
workping/
├── centralized-server/
│   └── server/
│       ├── app/
│       │   ├── app.js                  # Express initialisation & global middleware
│       │   ├── middleware.js           # Rate-limiting, helmet, body-parser
│       │   ├── 2fa.js                  # TOTP setup (speakeasy)
│       │   └── socket.io.js            # Socket.io + Redis adapter bootstrap
│       ├── config/
│       │   ├── mongoose.js             # MongoDB Atlas connection
│       │   ├── redis.js                # Redis client (OTP, pub/sub, rate-limit)
│       │   ├── cors.js                 # CORS allowlist
│       │   └── multer/                 # File-upload middleware config
│       ├── models/                     # Mongoose schemas
│       │   ├── User.js
│       │   ├── Organization.js
│       │   ├── Attendance.js
│       │   ├── Leave.js
│       │   ├── Salary.js
│       │   ├── Payment.js / Order.js
│       │   ├── Project.js
│       │   ├── Team.js / TeamMembership.js
│       │   ├── Shift.js / Holiday.js
│       │   ├── Subscription.js / Plan.js
│       │   ├── FrsTicket.js            # Face-recognition async ticket
│       │   └── Complaint.js
│       ├── routes/
│       │   ├── web/
│       │   │   ├── admin/              # /api/admin/* — org, employee, attendance, billing
│       │   │   ├── user/               # /api/user/* — profile, leave, salary, check-in
│       │   │   └── public/             # /api/public/* — stats, plans
│       │   └── internal/               # /internal/* — microservice-only routes
│       ├── controllers/
│       │   ├── web/
│       │   │   ├── admin/              # Admin business logic
│       │   │   ├── user/               # Employee business logic
│       │   │   ├── attendance/         # Check-in / check-out handling
│       │   │   └── public/
│       │   └── internal/               # Internal controller (chatbot, payment callbacks)
│       ├── services/
│       │   ├── face_recognition/       # HTTP client → face-api-microservice
│       │   ├── mailer/                 # HTTP client → mailer-microservice
│       │   ├── phonepe/                # HTTP client → phonepe-gateway-microservice
│       │   ├── whatsapp/               # HTTP client → whatsapp-microservice
│       │   ├── storage/                # HTTP client → oracle-cloud-object-microservice
│       │   ├── 2fa/                    # TOTP verify helpers
│       │   ├── google/                 # Google OAuth2 integration
│       │   ├── microsoft/              # Microsoft OAuth2 integration
│       │   ├── subscription/           # Plan upgrade / renewal logic
│       │   └── shiftReminder/          # node-cron shift notification job
│       ├── middleware/
│       │   ├── jwtBearer.js            # JWT verify + attach req.user
│       │   ├── requireRole.js          # RBAC — admin / manager / teamlead / employee
│       │   ├── authorizeManager.js     # Cross-team access guard
│       │   ├── errorHandler.js         # Global error → JSON response
│       │   ├── uploadExcel.js          # Multer preset for bulk imports
│       │   └── validateFrames.js       # Face-frame sanity checks
│       ├── utils/
│       │   ├── logger.js               # Winston structured logger
│       │   ├── token.helper.js         # JWT sign / refresh rotation
│       │   ├── response.helper.js      # Uniform API response shape
│       │   ├── app.error.js            # Custom AppError class
│       │   ├── async.handler.js        # try/catch wrapper for controllers
│       │   ├── validators.js           # Input validation schemas
│       │   ├── plan.limits.js          # Per-plan feature gate checks
│       │   ├── metrics.js              # Prometheus counters / histograms
│       │   └── location.js             # Geofence distance helpers
│       ├── helpers/
│       │   ├── admin/                  # Admin-specific utilities
│       │   ├── data.reducer.js         # Attendance aggregation helpers
│       │   └── pagination.js           # Cursor-based pagination
│       ├── scripts/
│       │   ├── seedAdminUser.js        # Seed initial super-admin
│       │   └── seedData.js             # Demo data for development
│       ├── __tests__/
│       │   └── health.test.js          # Jest + Supertest smoke tests
│       ├── globals.js                  # Shared constants (plan limits, roles)
│       ├── jest.config.js
│       └── server.js                   # node:cluster entry point (PM2 target)
│
├── admin-ui/                           # React 18 + Vite 5 — Admin Dashboard
│   └── src/
│       ├── app/                        # Axios instance, global config
│       ├── components/                 # Shared UI components
│       ├── pages/                      # Feature pages (employees, attendance, shifts, billing…)
│       ├── routes/                     # React Router v6 tree
│       ├── context/                    # AuthContext, ToastContext
│       ├── hooks/                      # useSocket, useGeofence, useFaceEnroll
│       ├── layouts/                    # DashboardLayout, AuthLayout
│       ├── helpers/                    # Date formatters, Excel export
│       └── utils/                      # API helpers, validators
│
├── employees-ui/                       # React 18 + Vite 5 — Employee Portal
│   └── src/
│       ├── components/                 # Shared UI (attendance heatmap, webcam check-in)
│       ├── pages/                      # Attendance, leave, salary, profile, dashboard
│       ├── routes/
│       ├── context/                    # AuthContext, UserContext
│       ├── hooks/
│       ├── layouts/
│       ├── services/                   # Typed API call wrappers
│       └── utils/
│
├── mobile-app/                         # React Native 0.83 + Expo 55
│   ├── src/
│   │   ├── screens/                    # Check-in, leave, salary, dashboard screens
│   │   ├── navigation/                 # React Navigation stack + tab config
│   │   ├── components/                 # Camera overlay, face-box, loaders
│   │   ├── context/                    # AuthContext
│   │   ├── hooks/                      # useLocation, useGeofence, usePushNotifications
│   │   ├── services/                   # Face detection, API calls
│   │   ├── theme/                      # Colours, typography, spacing
│   │   └── utils/                      # Date helpers, validators
│   ├── android/                        # Android native module (Gradle)
│   └── assets/                         # Icons, splash, sounds
│
├── face-api-microservice/              # Python · FastAPI · InsightFace · FAISS
│   ├── app.py                          # FastAPI entry point (port 8001)
│   ├── embedding.py                    # SCRFD detection + ArcFace R100 embedding
│   ├── db.py                           # Motor (async MongoDB) client
│   ├── cache.py                        # Redis embedding & ticket cache
│   ├── models/
│   │   └── antelopev2/                 # Pre-trained ONNX model weights
│   ├── scripts/
│   │   └── seed_bulk.py                # Bulk face enrollment helper
│   └── requirements.txt
│
├── mailer-microservice/                # Node.js · Express · Nodemailer · Redis
│   ├── server.js                       # Entry point (port 3003)
│   ├── config/
│   │   ├── mailTransporter.js          # Nodemailer SMTP transport
│   │   └── redisConfig.js              # Redis OTP store
│   ├── mail/
│   │   ├── mailer.js                   # Core send logic
│   │   └── templates.js                # Handlebars email templates
│   ├── routes/
│   │   ├── router.mail.js              # /send-* endpoints
│   │   └── router.otp.js               # /send-email-otp · /verify-email-otp
│   └── utils/
│       ├── services.mail.js            # High-level mail orchestration
│       └── analytics.js                # Per-template send metrics
│
├── whatsapp-microservice/              # Node.js · Express · BullMQ · Redis
│   ├── server.js                       # Entry point (port 3002)
│   ├── webhook/
│   │   ├── whatsapp.webhook.js         # Meta webhook receiver & verification
│   │   └── whatsapp.normalizer.js      # Normalise incoming message shape
│   ├── pipeline/
│   │   └── message.pipeline.js         # Orchestrate intent → response → send
│   ├── intent/
│   │   ├── rule.engine.js              # Fast keyword/pattern intent match
│   │   └── intent.llm.js              # LLM fallback intent classifier
│   ├── response/
│   │   ├── strategy.resolver.js        # Pick rule vs. LLM response strategy
│   │   ├── llm.generator.js            # Generate free-text LLM reply
│   │   └── templates.js                # Structured reply templates
│   ├── context/
│   │   └── context.builder.js          # Assemble employee context for LLM prompt
│   ├── scheduler/
│   │   └── shift.reminder.js           # node-cron shift reminder push
│   ├── utils/
│   │   ├── llm.provider.js             # Provider-agnostic LLM abstraction
│   │   ├── ollama.client.js            # Ollama (local) adapter
│   │   ├── bedrock.client.js           # AWS Bedrock adapter
│   │   ├── custom.client.js            # OpenAI-compatible custom endpoint
│   │   ├── conversation.state.js       # Per-user in-flight state (Redis)
│   │   ├── rate.limiter.js             # Per-user message rate cap
│   │   └── intent.prompts.js           # LLM prompt templates
│   └── routes/
│       └── dashboard.api.js            # Chatbot analytics & config endpoints
│
├── phonepe-gateway-microservice/       # Node.js · Express · PhonePe UPI
│   ├── service.js                      # Entry point (port 3001)
│   ├── config/
│   │   ├── phonepe.auth.js             # HMAC auth header builder
│   │   └── phonepe.env.js              # Sandbox / prod URL switching
│   ├── routes/
│   │   ├── router.payment.js           # /initiate-payment
│   │   ├── router.refund.js            # /refund
│   │   └── callback.js                 # Redirect callback handler
│   └── webhook/
│       └── phonepe.webhook.js          # SHA-256 HMAC webhook verifier → core API
│
├── oracle-cloud-object-microservice/   # Node.js · Express · OCI SDK
│   ├── app.js                          # Entry point (port 8000)
│   ├── oci.client.js                   # OCI ObjectStorageClient init
│   ├── oci.namespace.js                # Namespace/bucket config
│   ├── middleware/
│   │   ├── auth.js                     # API-key verification
│   │   ├── validate.js                 # MIME type + size allowlist
│   │   ├── metrics.js                  # Prometheus upload/download counters
│   │   └── error-handler.js
│   ├── routes/
│   │   ├── bucket.routes.js            # Upload · download · list · delete
│   │   └── presigned.routes.js         # Pre-signed URL generation (15-min TTL)
│   └── public/
│       └── dashboard.html              # Internal storage metrics UI
│
└── docs/
    ├── nginx/                          # Nginx site configs (one per subdomain)
    ├── INFRASTRUCTURE.md               # VM provisioning & deployment run-book
    ├── SECURITY.md                     # Security controls & audit notes
    └── FUTURE_SCOPE.md                 # Roadmap detail
```

---

## Service Directory

### Core API — `centralized-server/server`

| Attribute | Detail |
|---|---|
| Stack | Node.js + Express 5 + Mongoose 8 + Redis 5 |
| Process model | `node:cluster` — one worker per CPU, exponential-backoff restart |
| Auth | JWT (15 min access + refresh rotation) · Google/Microsoft OAuth2 · TOTP 2FA (speakeasy) |
| Real-time | Socket.io 4 + `@socket.io/redis-adapter` (cluster-safe broadcast rooms) |
| Scheduled jobs | `node-cron` — subscription auto-renewal, shift reminders |
| File uploads | Multer — profile images, bulk employee Excel (`xlsx`) |
| Security | `helmet` · `express-rate-limit` (200 req/15 min global; 10 req/15 min for auth/OTP) |
| Public port | `5000` → exposed as `api.workping.live` via Nginx |

**Route namespaces:**

| Namespace | Audience | Sample endpoints |
|---|---|---|
| `/api/admin/*` | Admin role | org setup, employee CRUD, leave decisions, shift scheduling, subscriptions |
| `/api/user/*` | All employees | profile, attendance, leave application, salary slip, dashboard |
| `/internal/*` | Microservices only | employee lookup by phone, attendance today/week, leave balance, salary |

---

### Biometric Service — `face-api-microservice`

| Attribute | Detail |
|---|---|
| Stack | Python 3.10+ · FastAPI · Uvicorn |
| Detection model | InsightFace AntelopeV2 — SCRFD (detection) + ArcFace R100 (512-dim embedding) |
| Similarity | Cosine distance of L2-normalised vectors; match threshold = 0.6 |
| Bulk search | FAISS `IndexFlatIP` — org-level multi-user fast scan |
| Async pipeline | Redis `BLPOP` queue + `ThreadPoolExecutor` (keeps asyncio event loop free during inference) |
| Caching | Redis: embedding cache (configurable TTL) · result ticket cache (TTL 300 s) |
| Database | MongoDB via Motor (async driver) — enrolled embeddings |
| Compute | CUDA auto-detected; falls back to ONNX Runtime CPU |
| Public port | `8001` → exposed as `face.workping.live` |

---

### Mailer Service — `mailer-microservice`

| Attribute | Detail |
|---|---|
| Stack | Node.js · Express 5 · Nodemailer · Handlebars · Redis |
| OTP storage | Redis key with configurable TTL (email: 30 min · reset: 10 min) — deleted on successful verify |
| Template types | Welcome · password reset · OTP · alert (info / warning / danger / success) · notification |
| Scalability | Stateless; any instance can verify any OTP because Redis is the shared source of truth |
| Public port | `3003` → internal only (not public-facing) |

---

### Payment Service — `phonepe-gateway-microservice`

| Attribute | Detail |
|---|---|
| Stack | Node.js · Express 5 · Axios |
| Provider | PhonePe UPI (`pg-sandbox` for dev · `pg` for prod) |
| Payment modes | UPI collect · UPI intent · UPI QR · Card · Net Banking |
| Webhook auth | SHA-256 `HMAC(username:password)` verified with `crypto.timingSafeEqual` (timing-attack safe) |
| Expiry | 10 minutes per initiated payment |
| Core callback | Verified by `x-webhook-secret` header with `crypto.timingSafeEqual` |
| Public port | `3001` → exposed as `phonepe.workping.live` (webhook receiver) |

---

### WhatsApp Chatbot — `whatsapp-microservice`

| Attribute | Detail |
|---|---|
| Stack | Node.js · Express 5 · BullMQ · Redis |
| Channel | Meta WhatsApp Cloud API |
| Message queue | BullMQ (Redis-backed) — decouples webhook receipt from LLM processing |
| Intent strategy | Rule engine first (fast keyword/pattern match) → LLM fallback (flexible NLP) |
| LLM providers | Ollama (local) · AWS Bedrock · OpenAI · Groq · Together AI · OpenRouter · Mistral · any OpenAI-compatible |
| Chatbot features | Attendance queries · leave application & status · shift schedule · salary slip |
| Internal routes | `POST /api/secure/whatsapp/send` · `POST /api/secure/whatsapp/start-flow` · `POST /api/secure/whatsapp/schedule-reminder` |
| Public port | `3002` → exposed as `whatsapp.workping.live` |

**LLM provider switching:** The `custom` provider uses the OpenAI Chat Completions wire format, making it drop-in compatible with every provider above. Switch at runtime via the dashboard API — no restart required.

---

### Storage Service — `oracle-cloud-object-microservice`

| Attribute | Detail |
|---|---|
| Stack | Node.js · Express 5 · OCI SDK (`oci-sdk@2.125.2`) · Multer |
| Provider | Oracle Cloud Infrastructure Object Storage |
| Features | Upload · download · list · delete · pre-signed URLs (15-min expiry) |
| Max file size | 50 MB (configurable) |
| Security | API key auth · `helmet` · rate limiting (100 req/15 min) · filename sanitisation · MIME type allowlist |
| Logging | Structured Pino logging · 30-day metrics export (JSON & CSV) |
| Public port | `8000` → exposed as `s3.workping.live` |

---

### Frontend — Admin Dashboard (`admin-ui`)

React 18 + Vite 5 SPA. Key libraries:

| Library | Purpose |
|---|---|
| `react-hook-form` + `yup` | Form validation |
| `apexcharts` | Analytics dashboards |
| `@fullcalendar/react` | Shift and holiday calendars |
| `@tensorflow/tfjs` + `@mediapipe/face_detection` | In-browser face enrollment (camera → embedding sent to API) |
| `socket.io-client` | Live attendance board |
| `react-leaflet` | Geofence zone map |
| `xlsx` | Excel export for attendance/payroll reports |

---

### Frontend — Employee Portal (`employees-ui`)

React 18 + Vite 5 SPA. Key additions over admin:

| Library | Purpose |
|---|---|
| `@nivo/calendar` | Monthly attendance heatmap |
| `react-webcam` | Webcam-based face check-in |

---

### Mobile App (`mobile-app`)

React Native 0.83 + Expo 55. Target: iOS and Android (`com.workping.mobile`).

| Module | Purpose |
|---|---|
| `react-native-vision-camera` + `react-native-vision-camera-face-detector` | Real-time on-device face detection for check-in |
| `expo-location` | GPS coordinates for geofence verification |
| `expo-notifications` | Push notifications for shift reminders and approvals |
| `expo-camera` · `expo-image-picker` | Photo capture for enrollment |
| `react-hook-form` + `yup` | Form handling and validation |

---

## Technology Decisions

Every significant technology choice is documented here alongside the alternatives considered and the tradeoffs made.

### Database — MongoDB Atlas (vs. PostgreSQL / MySQL)

**Chosen:** MongoDB Atlas (managed)

**Why:** Employee records, attendance logs, and shift schedules are document-shaped with nested arrays and varying sub-schemas (different shift types, custom leave policies per org). MongoDB's document model removes the need for complex multi-table joins for these reads. Atlas removes all operational overhead (backups, failover, scaling) for a team focused on product velocity.

**Alternatives considered:**

| Alternative | Why not chosen |
|---|---|
| PostgreSQL | Excellent ACID and relational integrity, but JSONB for dynamic employee attributes adds schema complexity. Better fit once we have a stable, well-normalized schema. |
| MySQL | Similar story to Postgres; slightly less ergonomic for the document-heavy access patterns we have. |
| PlanetScale (MySQL-compatible) | No MongoDB ODM ecosystem benefits; branching feature unneeded at this stage. |

**Where MongoDB is lacking (→ Future scope):** Payroll calculation requires multi-document ACID transactions (deductions, taxes, components). MongoDB supports multi-document transactions since 4.0, but the ergonomics and tooling for financial ledger-style data are materially better in PostgreSQL. The future payroll module should evaluate migrating that domain to a relational store.

---

### Face Recognition — InsightFace / ArcFace (vs. cloud Vision APIs)

**Chosen:** InsightFace AntelopeV2 (SCRFD + ArcFace R100) — fully self-hosted on VM

**Why:** Biometric data (face embeddings) is the most sensitive personal data in the platform. Processing it on-premises means it never leaves our infrastructure. InsightFace ranks at the top of the MFR (Masked Face Recognition) and IJB-C benchmarks; ArcFace R100 achieves 99.8% on LFW. Running ONNX on CPU on our 4 vCPU + 24 GB OCI VMs is sufficient for SMB-scale workloads (~hundreds of enrollments per org).

**Alternatives considered:**

| Alternative | Why not chosen |
|---|---|
| AWS Rekognition | Per-call pricing ($0.001/image), biometric data sent to AWS, GDPR/DPDP compliance concern |
| Azure Face API | Same privacy concern; Microsoft deprecated Face API identify endpoint for new customers |
| Google Cloud Vision | No face matching (only detection); would still need a custom embedding step |
| DeepFace (wrapper) | Not ONNX-exportable by default; adds indirection over using InsightFace directly |
| OpenCV Haar Cascade | Dramatically lower accuracy; unsuitable for production attendance |

**Where InsightFace is lacking (→ Future scope):**

1. **No liveness / anti-spoofing (PAD).** A photo held to the camera can currently pass. We must add a Presentation Attack Detection model (e.g., MiniVision PAD or Silent Face Anti-Spoofing) before this is enterprise-hardened.
2. **No GPU in current VMs.** Throughput is CPU-bound (ONNX). For >10 concurrent check-ins, GPU inference (nvidia-container-toolkit) should be enabled. The docker-compose GPU block is already written — it is commented out pending GPU VM provisioning.
3. **Cosine threshold is a global constant.** A per-org configurable threshold would handle orgs with more diverse lighting conditions.

---

### Message Queue — BullMQ + Redis BLPOP (vs. RabbitMQ / Kafka)

**Chosen:** BullMQ (WhatsApp chatbot) and Redis `BLPOP` (biometric inference queue)

**Why:** Redis is already a required dependency (OTP store, Socket.io adapter, rate limiting). Adding BullMQ gives a full-featured job queue — retries, backoff, priorities, delayed jobs, job events — with zero additional infrastructure. BLPOP is used in the biometric service for the same reason: the Python worker is already connected to Redis.

**Alternatives considered:**

| Alternative | Why not chosen |
|---|---|
| RabbitMQ | Excellent queue semantics, but a new daemon to operate, configure, and monitor. No benefit over BullMQ when Redis is already present. |
| Apache Kafka | Correct answer at 10k+ messages/sec and for event-sourcing. Massive operational overhead for current SMB workload scale. |
| AWS SQS | Adds vendor dependency; latency for webhook processing is slightly higher than in-process Redis. |

**Where BullMQ is lacking (→ Future scope):** If the WhatsApp chatbot grows to serve hundreds of thousands of messages per day, BullMQ's single-Redis-leader model becomes a bottleneck. Kafka with consumer groups is the correct migration path at that scale.

---

### Payment Gateway — PhonePe (vs. Razorpay / Stripe / Cashfree)

**Chosen:** PhonePe UPI

**Why:** WorkPing's primary market is India, where UPI accounts for >85% of digital payments. PhonePe has the largest UPI market share (~50%), strongest brand recognition, and supports all payment modes (UPI collect, UPI intent, UPI QR, card, net banking) through a single integration.

**Alternatives considered:**

| Alternative | Why not chosen |
|---|---|
| Razorpay | Also India-first, similar capability. PhonePe was chosen for market share alignment. Razorpay would be a valid drop-in replacement. |
| Stripe | No native UPI support. Excellent for international (USD/EUR) cards. |
| Cashfree | Strong API, slightly lower pricing, but less brand recognition. |
| PayU | Older API design; less developer-friendly. |

**Where PhonePe is lacking (→ Future scope):** No international payment support. As WorkPing expands beyond India, Stripe should be added for card payments in USD/EUR. The payment service is isolated enough that a second provider can be added without touching the core API.

---

### LLM — Provider-Agnostic (vs. fixed integration)

**Chosen:** OpenAI-compatible wire format with Ollama / Bedrock / OpenAI / Groq / OpenRouter / Mistral support

**Why:** LLM pricing and quality changes rapidly. Locking into one provider would require code changes to switch. The OpenAI Chat Completions format has become the de-facto standard; all major providers support it. This lets us run Ollama locally for development (zero cost), Groq in production for speed (~300 tok/s), and Bedrock for compliance-sensitive orgs.

**Where LLM integration is lacking (→ Future scope):**

1. **No conversation memory.** Each WhatsApp message is processed statelessly. A vector database (pgvector on PostgreSQL, or Pinecone/Weaviate) storing per-user conversation embeddings would allow contextual follow-up questions ("what about last month?" after asking for attendance).
2. **No function calling / tool use.** Currently, intent routing is a hand-written rule engine. Structured LLM tool-use (e.g., Claude's tool-use or OpenAI function calling) would replace the rule engine with a more reliable, extensible approach.

---

### Email — Self-hosted Nodemailer SMTP (vs. SendGrid / SES)

**Chosen:** Nodemailer with SMTP relay (own server)

**Why:** Complete control, zero per-email cost, no vendor lock-in. For internal transactional emails (OTPs, attendance reports, payroll notifications) to a known employee base, raw SMTP is sufficient.

**Where SMTP is lacking (→ Future scope):** Deliverability to external addresses (customer-facing emails) can be affected by IP reputation of OCI VMs. Amazon SES ($0.10/1000 emails) or SendGrid would provide better deliverability guarantees, open/click tracking, and bounce management. Migrating is trivial since Nodemailer supports SES and SMTP transports identically.

---

### Object Storage — OCI Object Storage (vs. AWS S3 / MinIO)

**Chosen:** Oracle Cloud Infrastructure Object Storage

**Why:** The entire infrastructure runs on OCI. OCI Object Storage has **no egress fees** (AWS S3 charges $0.09/GB egress), a generous free tier, S3-compatible API, and pre-signed URLs work identically to AWS. Since we are already an OCI tenant, there is no additional account or billing relationship.

**Alternatives considered:**

| Alternative | Why not chosen |
|---|---|
| AWS S3 | Industry standard, better ecosystem tooling, but egress fees add up; additional vendor relationship needed. |
| MinIO (self-hosted) | Excellent S3-compatible self-host option, but requires a dedicated VM and ops overhead. OCI's managed storage costs nothing additional. |
| Google Cloud Storage | No OCI account/credits synergy; similar egress pricing to AWS. |
| Backblaze B2 | Cheapest egress, but less enterprise support and SDK maturity. |

**Where OCI Object Storage is lacking (→ Future scope):** No built-in CDN. Serving profile images and documents through the storage proxy adds latency. OCI CDN (or Cloudflare in front of the pre-signed URL domain) should be added to cache frequently accessed assets at edge.

---

### Auth — Self-hosted JWT + bcrypt + TOTP (vs. Auth0 / Clerk / Firebase)

**Chosen:** Custom JWT implementation with bcrypt, speakeasy TOTP, and passport-style OAuth2

**Why:** Full ownership of user data. Auth0 and Clerk are priced per Monthly Active User (MAU) — at SMB scale (100–500 employees per org, multiple orgs), the cost grows linearly. More importantly, authentication for an HR platform must not depend on a third-party availability SLA.

**Where the auth implementation is lacking (→ Future scope):**

1. **No JWT revocation / token blacklist.** If a JWT access token is stolen, it remains valid until its 15-min expiry. A Redis-backed token blacklist (checked on every request) or opaque session tokens would close this gap.
2. **No PKCE for mobile OAuth flows.** The mobile app currently uses a basic OAuth flow. PKCE (Proof Key for Code Exchange) should be added before production mobile release to prevent authorization code interception.

---

### Frontend Framework — React + Vite (vs. Next.js / SvelteKit)

**Chosen:** React 18 + Vite 5 SPA

**Why:** Admin and employee portals are internal tools — SSR and SEO are irrelevant. Vite provides sub-second HMR, faster than webpack-based setups. The team's React knowledge transfers directly. SPA fits behind Nginx static serving perfectly.

**Alternatives considered:**

| Alternative | Why not chosen |
|---|---|
| Next.js | SSR and RSC add complexity with no benefit for authenticated internal tools. |
| SvelteKit | Smaller bundle, faster runtime, but smaller ecosystem and team familiarity. |
| Angular | More opinionated, heavier, not warranted for internal dashboards. |

---

### Reverse Proxy — Nginx (vs. Caddy / Traefik)

**Chosen:** Nginx

**Why:** Battle-tested, best-in-class static file serving, sub-millisecond reverse proxy overhead, excellent WebSocket support, and the most documented TLS/Certbot integration. Every Ubuntu server engineer knows Nginx.

**Alternatives considered:**

| Alternative | Why not chosen |
|---|---|
| Caddy | Automatic HTTPS is excellent, but less granular config and smaller ops community for troubleshooting. |
| Traefik | Excellent for Docker/K8s service discovery, but over-engineered for our current fixed-service topology. |
| HAProxy | L4/L7 performance champion but no built-in TLS or static serving. |

---

### Process Management — PM2 + Node.js Cluster (vs. Kubernetes)

**Chosen:** PM2 in cluster mode on bare VMs

**Why:** PM2 wraps Node's built-in cluster module, provides zero-downtime reloads, log management, and restart-on-crash — all without the operational complexity of a container orchestrator. For 3 VMs with a small set of known services, K8s would be a net negative in ops time.

**Where PM2 is lacking (→ Future scope):** No horizontal auto-scaling, no self-healing across VMs (only within a single VM). As load grows, Kubernetes (OCI OKE — managed K8s) provides auto-scaling, rolling deployments, and cross-VM health management. The Docker Compose files already exist, making migration to K8s manifests straightforward.

---

## Security Model

```
Layer 1 — Network
  HTTPS enforced (Nginx, Let's Encrypt)
  CORS allowlist — no wildcard in production

Layer 2 — Transport
  helmet on every service (HSTS · X-Frame-Options · X-Content-Type-Options · CSP)
  10 KB request body limit (payload inflation prevention)

Layer 3 — Rate Limiting
  Global:   200 req / 15 min per IP  (express-rate-limit)
  Auth/OTP: 10  req / 15 min per IP

Layer 4 — Authentication
  Web:    JWT access token (15 min) + refresh token rotation
  Mobile: Bearer token in Authorization header
  SSO:    Google OAuth2 · Microsoft OAuth2
  2FA:    TOTP via speakeasy — QR enrollment, per-request code verify

Layer 5 — Authorisation
  requireRole middleware — admin | manager | teamlead | employee
  authorizeManager — cross-team access control

Layer 6 — Inter-Service
  All microservice calls: Authorization: Bearer <INTERNAL_API_KEY>
  Webhook callbacks: crypto.timingSafeEqual (timing-attack safe)
  PhonePe webhook: SHA-256 HMAC signature verification

Layer 7 — Data
  Passwords:    bcrypt (cost factor 10)
  JWT signing:  HS256 SECRET_KEY (min 256-bit)
  OTPs:         6-digit numeric · single-use · TTL-expired in Redis
  Embeddings:   stored as numeric vectors only (no raw images stored server-side)
```

---

## Data Flows

### Face Check-In (Mobile → Core API)

```
Mobile App
  1. Capture frame with react-native-vision-camera
  2. POST /api/v1/detect  { image_base64, user_id, org_id }
           │
           ▼
  Biometric Service (face.workping.live)
  3. Push job to Redis face_tasks_queue
  4. Return { ticket_id }
           │
  Inference worker (ThreadPoolExecutor)
  5. Fetch stored embedding from MongoDB
  6. Run SCRFD + ArcFace on input frame
  7. cosine_similarity(query_emb, stored_emb)
  8. Write result to Redis ticket:<id>  TTL=300 s
           │
  Mobile App polls GET /result/<ticket_id>
           │
           ▼
  Core API (api.workping.live)
  9.  POST /api/user/attendance/check-in  { match_score, location }
  10. Write AttendanceRecord to MongoDB
  11. Publish event to Redis → Socket.io adapter
  12. Emit to admin dashboard room (live board update)
```

### Subscription Payment (Admin → PhonePe → Core API)

```
Admin Dashboard
  1. Select plan → POST /api/admin/phonepe/initiate  { planId, amount }
           │
           ▼
  PhonePe Service (phonepe.workping.live)
  2. POST https://api.phonepe.com/pg/v1/pay
  3. Return { checkoutUrl }  (10-min expiry)
           │
  Admin redirected to PhonePe checkout
  4. User completes UPI payment
           │
  PhonePe webhook → phonepe.workping.live/api/phonepe/webhook
  5. Verify SHA-256 HMAC signature
  6. POST to core API /internal/payments/webhook
           │
  Core API
  7. Verify x-webhook-secret header
  8. Update subscription status in MongoDB
  9. Publish payment event to Redis
  10. Socket.io push → admin browser (real-time confirmation)
```

### WhatsApp Chatbot Message Flow

```
Employee sends WhatsApp message
  1. Meta webhook → whatsapp.workping.live/webhook
  2. BullMQ enqueues job (decouples receipt from processing)
           │
  BullMQ worker
  3. Rule engine: match keywords → attendance / leave / salary / shift
  4. If no match → LLM fallback (AWS Bedrock / OpenAI / Groq)
  5. Matched intent → call Core API internal routes
     - GET /internal/attendance/today/:userId
     - GET /internal/leave/balance/:userId
     - GET /internal/salary/:userId
     - POST /internal/leave/apply
  6. Format response → POST WhatsApp Cloud API /messages
```

---

## Caching Architecture

Redis serves four distinct roles simultaneously:

```
┌──────────────────────────────────────────────────────────────────┐
│                          Redis 7                                 │
│                                                                  │
│  Key pattern                 TTL       Service                   │
│  ─────────────────────────────────────────────────────────────   │
│  otp:<email>                 30 min    Mailer — OTP store        │
│  otp:reset:<email>           10 min    Mailer — password reset   │
│  payment:<userId>            session   Core API — payment state  │
│  face_tasks_queue            stream    Biometric — BLPOP queue   │
│  ticket:<uuid>               5 min     Biometric — result cache  │
│  embedding:<org>:<emp>       config    Biometric — embed cache   │
│  sub:renewal:<adminId>       cron      Core API — subs scheduler │
│  socket.io#<room>            rooms     Socket.io — Redis adapter │
└──────────────────────────────────────────────────────────────────┘
```

| Role | Details |
|---|---|
| **OTP store** | Source of truth for all email verification codes; deleted on successful verify to prevent reuse |
| **Payment state** | Temporary key bridges PhonePe webhook → Socket.io real-time push to the admin browser |
| **Task queue** | Redis `BLPOP` decouples HTTP response from GPU/CPU inference in the biometric service |
| **Pub/Sub bus** | `@socket.io/redis-adapter` fans out Socket.io events across Node.js cluster workers |

---

## API Reference Overview

Full OpenAPI specs live in `docs/`. High-level namespaces:

| Namespace | Auth | Description |
|---|---|---|
| `POST /api/admin/auth/login` | Public | Admin login (returns JWT + 2FA challenge) |
| `POST /api/admin/auth/verify-2fa` | 2FA token | Complete TOTP verification |
| `GET /api/admin/employee` | Admin JWT | List all employees |
| `POST /api/admin/employee` | Admin JWT | Create employee |
| `POST /api/admin/add-employees` | Admin JWT | Bulk Excel import |
| `GET /api/admin/attendance` | Admin JWT | Attendance report (date range filter) |
| `POST /api/admin/phonepe/initiate` | Admin JWT | Start subscription payment |
| `GET /api/user/attendance` | Employee JWT | Personal attendance history |
| `POST /api/user/leaves` | Employee JWT | Apply for leave |
| `GET /api/user/payroll` | Employee JWT | Salary slips |
| `POST /api/user/face/detect` | Employee JWT | Face check-in (returns ticket_id) |
| `GET /internal/attendance/today/:userId` | API Key | Today's record (for chatbot) |
| `POST /internal/leave/apply` | API Key | Leave via chatbot |
| `POST /enroll` | API Key | Enroll face embedding |
| `GET /result/:ticket_id` | API Key | Poll biometric result |
| `POST /send-email-otp` | API Key | Send OTP |
| `POST /verify-email-otp` | API Key | Verify OTP |
| `POST /api/payments/initiate-payment` | API Key | Start PhonePe payment |
| `POST /api/secure/whatsapp/send` | Bearer token | Send WhatsApp message |
| `POST /api/upload/:bucketName` | API Key | Upload to OCI storage |
| `POST /api/presigned/upload/:bucketName` | API Key | Get pre-signed upload URL |

---

## Local Development

### Prerequisites

- Node.js 20 LTS
- Python 3.10+
- Docker Desktop
- MongoDB Atlas account (or local MongoDB 7+)
- Redis 7 (included in docker-compose)

### Setup

```bash
# 1. Clone and enter
git clone <repo-url>
cd workping

# 2. Copy environment files — then fill in each one
for dir in centralized-server/server admin-ui employees-ui \
           face-api-microservice mailer-microservice \
           oracle-cloud-object-microservice phonepe-gateway-microservice \
           whatsapp-microservice; do
  cp $dir/.env.example $dir/.env
done

# 3. Start infrastructure (Redis)
docker compose up -d redis

# 4. Core API
cd centralized-server/server && npm install && npm run dev

# 5. Admin UI (new terminal)
cd admin-ui && npm install && npm run dev          # http://localhost:5173

# 6. Employee UI (new terminal)
cd employees-ui && npm install && npm run dev       # http://localhost:5174

# 7. Biometric service (new terminal)
cd face-api-microservice
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn app:app --reload --port 8001

# 8. Remaining microservices (docker-compose for convenience)
docker compose up -d workping-mailer workping-payments \
                     workping-chatbot workping-storage
```

### Mobile App

```bash
cd mobile-app
npm install
npx expo start          # scan QR with Expo Go, or press 'a' for Android emulator
```

---

## Production Deployment

### Server Setup (each VM)

```bash
# Ubuntu 22.04 — run as root or sudo
apt update && apt install -y nginx certbot python3-certbot-nginx docker.io docker-compose-plugin nodejs npm git

# Install PM2
npm install -g pm2

# Clone repo
git clone <repo-url> /opt/workping
```

### Nginx + TLS

```bash
# Obtain certificates
certbot --nginx -d api.workping.live
certbot --nginx -d admin.workping.live
certbot --nginx -d employee.workping.live
certbot --nginx -d face.workping.live
certbot --nginx -d phonepe.workping.live
certbot --nginx -d whatsapp.workping.live
certbot --nginx -d s3.workping.live

# Auto-renewal (certbot installs a systemd timer by default)
systemctl status certbot.timer
```

Nginx site configs live in `docs/nginx/`. Each service gets a `server` block with:
- `proxy_pass` to the internal port
- `proxy_http_version 1.1` + `Upgrade`/`Connection` headers for WebSocket
- `proxy_read_timeout 120s` for long-polling endpoints

### Starting Services

```bash
# Core API (cluster mode — PM2 uses all CPUs)
cd /opt/workping/centralized-server/server
pm2 start ecosystem.config.js
pm2 save && pm2 startup

# Biometric service via Docker Compose
cd /opt/workping/face-api-microservice
docker compose up -d

# Other microservices via Docker Compose (on microservices VM)
cd /opt/workping
docker compose up -d workping-mailer workping-payments \
                     workping-chatbot workping-storage

# Build and serve React apps
cd /opt/workping/admin-ui && npm ci && npm run build
# Nginx serves admin-ui/dist/ as static files for admin.workping.live

cd /opt/workping/employees-ui && npm ci && npm run build
# Nginx serves employees-ui/dist/ as static files for employee.workping.live
```

### Environment Variables Reference

| Variable | Service | Description |
|---|---|---|
| `MONGODB_URI` | Core API | MongoDB Atlas connection string |
| `JWT_SECRET` | Core API | HS256 signing key (min 256-bit) |
| `INTERNAL_SECRET` | Core API | Secret for `/internal/*` routes |
| `REDIS_URL` | All | `redis://:<password>@<host>:6379` |
| `GOOGLE_CLIENT_ID/SECRET` | Core API | OAuth2 credentials |
| `MICROSOFT_CLIENT_ID/SECRET` | Core API | OAuth2 credentials |
| `PHONEPE_MERCHANT_ID` | Payments | PhonePe merchant account ID |
| `PHONEPE_API_KEY` | Payments | PhonePe API key |
| `PHONEPE_WEBHOOK_SECRET` | Payments | Shared secret for webhook auth |
| `META_ACCESS_TOKEN` | WhatsApp | WhatsApp Cloud API bearer token |
| `META_PHONE_NUMBER_ID` | WhatsApp | Sending phone number ID |
| `WHATSAPP_VERIFY_TOKEN` | WhatsApp | Meta webhook challenge token |
| `OCI_NAMESPACE` | Storage | OCI Object Storage namespace |
| `OCI_COMPARTMENT_ID` | Storage | OCI compartment OCID |
| `SMTP_HOST/PORT/USER/PASS` | Mailer | SMTP relay credentials |
| `MAILER_API_KEY` | Mailer | API key for inter-service calls |
| `FACE_API_KEY` | Biometric | API key for inter-service calls |

---

## Future Scope

The following capabilities are planned as the platform scales:

### Payroll Module
Full automated payroll processing — CTC breakdown, tax computation (TDS/PF/ESI), payslip generation, and direct bank transfer integration. MongoDB multi-document transactions support the required atomicity, but a relational data model (PostgreSQL or MySQL) will be evaluated for the financial ledger sub-domain to leverage mature accounting tooling and strict ACID compliance. Integration with the existing salary slip endpoints is already stubbed.

### Advanced AI Analytics & Insights
- **Attendance pattern anomaly detection** — ML model flagging unusual patterns (chronic late arrivals, suspicious bulk check-ins)
- **Workforce productivity insights** — trend dashboards correlating attendance, project completion, and leave utilization
- **Predictive leave forecasting** — alert managers when a team is projected to be understaffed in a future date window
- **NLP-powered HR reports** — natural language query interface over attendance and project data

### Liveness Detection (Anti-Spoofing)
Add a Presentation Attack Detection (PAD) model to the biometric pipeline to reject photo/video attacks. Candidates: MiniVision Silent Face Anti-Spoofing (ONNX-compatible, runs on CPU). This is a critical security gap for enterprise deployments.

### JWT Revocation / Session Management
Implement a Redis-backed token blacklist to support immediate session invalidation on logout or account suspension, closing the gap inherent in stateless JWT.

### International Payments
Add Stripe for USD/EUR subscriptions to support expansion beyond India. The payment service is provider-agnostic in design; a second provider can be added without touching the core API.

### Email Deliverability (Amazon SES / SendGrid)
Migrate the mailer service to Amazon SES or SendGrid for production-grade deliverability, bounce management, and open/click tracking. The Nodemailer transport swap is a single configuration line.

### CDN for Object Storage
Add OCI CDN or Cloudflare in front of `s3.workping.live` to cache profile images and documents at edge, reducing latency for globally distributed teams.

### Long-Term Chatbot Memory
Integrate a vector database (pgvector on PostgreSQL, or Pinecone) to store per-user conversation embeddings, enabling contextual follow-up questions across sessions.

### LLM Tool Use / Function Calling
Replace the hand-written rule engine in the WhatsApp chatbot with structured LLM function calling (Claude tool use or OpenAI function calling), making intent routing more robust and extending new capabilities without code changes.

### Kubernetes Migration (OCI OKE)
As traffic grows beyond single-VM capacity, migrate the Docker Compose topology to OCI Kubernetes Engine (OKE) for horizontal pod auto-scaling, rolling deployments, and cross-VM self-healing. The Docker images are already built; only K8s manifests need to be authored.

### PKCE for Mobile OAuth
Implement Proof Key for Code Exchange (RFC 7636) in the mobile OAuth flows to prevent authorization code interception attacks before production launch.

### WhatsApp Template Library
Pre-approve a rich set of WhatsApp message templates with Meta to support structured notifications (salary slip shared, leave approved, shift starting) that do not require an open conversation window.

### Geofence Enforcement
Currently GPS coordinates are captured but geofence validation is UI-side. Move the geofence perimeter check server-side with configurable radius per organization to prevent spoofing.

---

## License

MIT — Copyright 2026 Nikhil Charan

---

⚠️ **Scope Guard** – Before reviewing this repository, **read the file `SCOPE_GUARD.md`** located at the repository root. The guard defines in-scope criteria and lists out-of-scope items that must be ignored by any reviewer. An optional configuration file `.reviewer.json` can also be added to declare the guard path.
