# WorkPing — Documentation Index

This folder contains the long-form documentation for WorkPing. The top-level [README.md](../README.md) covers setup and a feature overview; the files here go deeper into architecture, operations, security, and roadmap.

## Contents

| File | What's inside |
|---|---|
| [INFRASTRUCTURE.md](INFRASTRUCTURE.md) | Deployment topology — VMs, Docker Compose, Redis/MongoDB layout, and the OCI resources backing the live environment. |
| [SECURITY.md](SECURITY.md) | Security model — auth (JWT + 2FA + OAuth), token revocation, Phase 1 liveness detection, rate limiting, secret handling, and the threat model the implementation defends against. |
| [FUTURE_SCOPE.md](FUTURE_SCOPE.md) | Phase 2 roadmap — work that is intentionally *not* in the current build (centralised logging, distributed tracing, Secrets Manager, PKCE for mobile OAuth, Phase 2 ML anti-spoofing, etc.) with rationale for each deferral. |
| [openapi.yaml](openapi.yaml) | OpenAPI 3.x specification for the core API. Import into Swagger UI / Postman / Insomnia to explore endpoints. |


## How the project is scoped

WorkPing is delivered as a working MERN monolith with five purpose-built microservices (biometric, mailer, payments, chatbot, storage). The "in-scope" surface covers everything documented in [ARCHITECTURE.md](../ARCHITECTURE.md) and exposed via [openapi.yaml](openapi.yaml).

Items deferred to a later phase live in [FUTURE_SCOPE.md](FUTURE_SCOPE.md) with the reason for each deferral. Notable examples of work that is **out of scope for this build** (and why):

- **Centralised log aggregation / distributed tracing** — services log locally via Winston/Pino; ELK/Loki and OpenTelemetry are Phase 2.
- **Cloud-managed secrets** — `.env` files on each VM; AWS Secrets Manager / Vault is Phase 2.
- **PKCE for mobile OAuth** — current mobile flow uses the standard authorization-code grant; PKCE migration is Phase 2.
- **ML-based anti-spoofing (Phase 2 model)** — Phase 1 optical-flow liveness detection is implemented and active; a deep-learning anti-spoof model is Phase 2.
- **Multi-cloud / provider migration** — single-cloud (OCI) by design for this build.

Items that **are** implemented and sometimes mistaken for Phase 2 work:

- **JWT access-token revocation** via a Redis denylist (see `centralized-server/server/middleware/auth.js`).
- **Phase 1 liveness detection** (optical-flow + blink heuristic) in `face-api-microservice`.
- **Rate limiting** (`express-rate-limit`: 200 req / 15 min global, 10 req / 15 min on auth & OTP endpoints).
- **Cluster-safe real-time** via Socket.io + `@socket.io/redis-adapter`.

If something looks missing, check [FUTURE_SCOPE.md](FUTURE_SCOPE.md) first — it may be a deliberate deferral with a documented reason.
