# WorkPing

A full-stack workforce management platform with face recognition attendance, real-time communication, UPI payment subscriptions, and an AI-powered WhatsApp chatbot.

## Services

| Service | Path | Stack | Port |
|---|---|---|---|
| [Admin Dashboard](admin-ui/) | `admin-ui/` | React 18 + Vite | 5173 |
| [Employee Portal](employees-ui/) | `employees-ui/` | React 18 + Vite | 5174 |
| [Mobile App](mobile-app/) | `mobile-app/` | React Native + Expo | — |
| [Core API](centralized-server/server/) | `centralized-server/server/` | Node.js + Express 5 + MongoDB | 5000 |
| [Biometric Service](face-api-microservice/) | `face-api-microservice/` | Python + FastAPI + InsightFace | 8001 |
| [Mailer Service](mailer-microservice/) | `mailer-microservice/` | Node.js + Express 5 + Redis | 3003 |
| [Storage Service](oracle-cloud-object-microservice/) | `oracle-cloud-object-microservice/` | Node.js + Express 5 + OCI | 8000 |
| [Payments Service](phonepe-gateway-microservice/) | `phonepe-gateway-microservice/` | Node.js + Express 5 + PhonePe | 3001 |
| [Chatbot Service](whatsapp-microservice/) | `whatsapp-microservice/` | Node.js + Express 5 + BullMQ | 3002 |

## Architecture

```
Web/Mobile Client
       │  HTTPS
       ▼
  Nginx  (reverse proxy + SSL termination + static file serving)
       │  HTTP (internal)
       ▼
 Core API (5000)  ──── MongoDB Atlas
       │          ──── Redis
       ├──► Biometric Service (8001)   face enrollment + verification
       ├──► Mailer Service (3003)      email OTP delivery
       ├──► Storage Service (8000)     Oracle Cloud file upload/download
       ├──► Payments Service (3001)    PhonePe UPI initiation + webhook
       └──► Chatbot Service (3002)     WhatsApp intent detection + LLM
```

## Quick Start

Each service has its own `README.md` and `.env.example`. General flow:

```bash
# 1. Copy and fill all environment files
for dir in centralized-server/server admin-ui employees-ui mobile-app \
           face-api-microservice mailer-microservice \
           oracle-cloud-object-microservice phonepe-gateway-microservice \
           whatsapp-microservice; do
  cp $dir/.env.example $dir/.env
done

# 2. Install dependencies per service
cd centralized-server/server && npm install
cd ../../admin-ui && npm install
# ... repeat for each Node.js service

# 3. Python service
cd face-api-microservice && python -m venv venv && pip install -r requirements.txt

# 4. Start with Docker Compose (for microservices)
docker compose up -d   # from face-api or whatsapp directories

# 5. Start the core API
cd centralized-server/server && npm start
```

## Security

- All services authenticate inter-service calls via `Authorization: Bearer <API_KEY>`
- The core API uses JWT + optional Google/Microsoft OAuth2 + TOTP 2FA
- PhonePe webhook signatures are verified with `crypto.timingSafeEqual`
- Never commit `.env` files — use `.env.example` as the template

## License

MIT — Copyright 2026 Team WorkPing
