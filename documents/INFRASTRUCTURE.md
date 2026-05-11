# WorkPing — Infrastructure & Services Inventory

## Deployment Topology

```
Internet
   │  HTTPS :443
   ▼
┌──────────────────────────────────────────────────────────────────────────┐
│  Nginx  (Reverse Proxy + API Gateway)                                    │
│                                                                          │
│  Routing rules:                                                          │
│   api.workping.live        → :5000  (Core API)                          │
│   admin.workping.live      → dist/  (Admin UI static build)             │
│   employee.workping.live   → dist/  (Employee UI static build)          │
│   phonepe.workping.live    → :3001  (Payments microservice)             │
│   whatsapp.workping.live   → :3002  (Chatbot microservice)              │
│   s3.workping.live         → :8000  (Storage microservice)              │
│   face.workping.live       → :8001  (Biometric microservice)            │
│                                                                          │
│  Also handles: SSL termination · WebSocket upgrade (Socket.io) ·        │
│                Gzip compression · Static file cache headers             │
└──────────────────┬───────────────────────────────────────────────────────┘
                   │  HTTP (internal, all traffic stays on VM loopback)
                   ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         WorkPing VM(s)                                  │
│                                                                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐ │
│  │Core API  │  │Biometric │  │Mailer    │  │Payments  │  │Chatbot  │ │
│  │PM2       │  │Docker    │  │PM2       │  │PM2       │  │Docker   │ │
│  │:5000     │  │:8001     │  │:3003     │  │:3001     │  │:3002    │ │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  └─────────┘ │
│                                                                         │
│  ┌──────────┐  ┌──────────────────────────────────────────────────┐   │
│  │Storage   │  │  Redis  (shared, all services)  :6379            │   │
│  │PM2 :8000 │  └──────────────────────────────────────────────────┘   │
│  └──────────┘                                                          │
└────────────────────────────┬────────────────────────────────────────────┘
                             │ TCP (MongoDB Atlas, OCI Object Storage)
              ┌──────────────┴──────────────┐
              ▼                             ▼
     MongoDB Atlas                  Oracle Cloud
     (managed cloud DB)           Object Storage
```

---

## Service Inventory

### Self-Hosted on VM

| Service | Process Manager | Port | Notes |
|---|---|---|---|
| **Nginx** | systemd | 80 / 443 | Reverse proxy, SSL termination, static file serving, WebSocket upgrade |
| Redis | systemd | 6379 | Shared by all backend services |
| Core API | PM2 cluster mode | 5000 | All workers share the Redis pub/sub bus |
| Biometric | Docker | 8001 | GPU passthrough if NVIDIA drivers available |
| Mailer | PM2 | 3003 | SMTP credentials in .env |
| Payments | PM2 | 3001 | PhonePe credentials in .env |
| Chatbot | Docker / PM2 | 3002 | LLM provider configurable via dashboard |
| Storage | PM2 | 8000 | OCI SDK config in .env |

### Third-Party Cloud Services

| Service | Provider | Used For | Auth Method |
|---|---|---|---|
| MongoDB Atlas | MongoDB Inc. | Primary database for all entities | Connection string in .env |
| Oracle Cloud Object Storage | Oracle | Profile images, Excel bulk uploads | OCI SDK config + .pem key |
| PhonePe UPI Gateway | PhonePe / Walmart | Subscription payments | Client ID + Secret in .env |
| WhatsApp Cloud API | Meta (Facebook) | Employee chatbot channel | Permanent access token |
| Google OAuth2 | Google | Admin/employee SSO login | Client ID + Secret in .env |
| Microsoft OAuth2 | Microsoft | Admin/employee SSO login (Azure AD) | Client ID + Secret in .env |
| AWS Bedrock (optional) | Amazon Web Services | LLM inference for chatbot | AWS credentials in .env |

### LLM Provider (Chatbot — flexible)

The chatbot supports runtime provider switching. Currently used providers:

| Provider | Hosting | Cost model |
|---|---|---|
| Ollama | Self-hosted on VM | Free — local inference |
| AWS Bedrock | AWS cloud | Pay-per-token |
| OpenAI / Groq / Together (via custom provider) | Third-party cloud | Pay-per-token |

---

## Redis Usage by Service

Redis is the **single shared in-memory store** across the entire platform.

| Key namespace | TTL | Owner | Purpose |
|---|---|---|---|
| `otp:<email>` | 30 min | Mailer | OTP verification codes |
| `payment:<userId>` | Session | Core API | Payment-pending state for Socket.io |
| `face_tasks_queue` | Stream | Biometric | Inference task queue (BLPOP) |
| `ticket:<uuid>` | 5 min | Biometric | Async inference result polling |
| `embedding:<org>:<emp>` | Configurable | Biometric | Face embedding cache |
| `socket.io#*` | Room | Core API | Socket.io Redis adapter pub/sub |
| BullMQ queues | Job TTL | Chatbot | WhatsApp message processing queue |

**Important:** All services share the same Redis instance. Key namespaces are prefixed to avoid collisions. A production deployment should consider a dedicated Redis instance per service or using Redis ACLs per service.

---

## CI/CD Pipeline

```
Developer push → GitHub (main branch)
    │
    ▼
GitHub Actions workflow
    ├── Lint / build check
    └── SSH to production VM
          ├── git pull origin main
          ├── npm install --production
          └── pm2 reload <service-name>
```

Dockerised services (biometric, chatbot) are rebuilt with:
```bash
docker compose down && docker compose up -d --build
```

---

## Port Reference

| Port | Service | Protocol |
|---|---|---|
| 80/443 | Nginx reverse proxy | HTTP/HTTPS |
| 5000 | Core API (workping-api) | HTTP |
| 5173 | Admin UI (dev only) | HTTP |
| 5174 | Employee UI (dev only) | HTTP |
| 6379 | Redis | TCP |
| 8000 | Storage Service (workping-storage) | HTTP |
| 8001 | Biometric Service (workping-biometric) | HTTP |
| 3001 | Payments Service (workping-payments) | HTTP |
| 3002 | Chatbot Service (workping-chatbot) | HTTP |
| 3003 | Mailer Service (workping-mailer) | HTTP |
