# WorkPing — Phase 2 / Future Scope

This document captures planned improvements for the next development cycle. Items are grouped by theme and ordered roughly by priority. None of these are implemented yet — they are design decisions deferred to Phase 2.

---

## 1. Observability & Logging

### Structured Logging (Winston / Pino)
**Current state:** `console.log` / `console.error` across all services.  
**Problem:** No log levels, no structured JSON output, no centralised log aggregation.

**Planned:**
- Replace `console.*` calls with a shared `logger.js` using **Pino** (fastest JSON logger for Node.js).
- Log levels: `trace`, `debug`, `info`, `warn`, `error`, `fatal`.
- Each log line includes: `timestamp`, `level`, `service`, `requestId`, `userId`, `message`.
- Production transport: ship logs to **Elasticsearch** (via Logstash or Fluent Bit) or **Grafana Loki**.

```js
// Planned logger shape
import pino from "pino";
export const logger = pino({
    level: process.env.LOG_LEVEL || "info",
    base: { service: "workping-api" },
    redact: ["req.headers.authorization", "body.password"]
});
```

### Distributed Tracing
- Add **OpenTelemetry** trace context propagation across services.
- Trace a single attendance check-in across Core API → Biometric → MongoDB → Redis.
- Export to **Jaeger** or **Tempo**.

### Metrics & Alerting
- Expose `/metrics` endpoint (Prometheus format) on all services.
- Dashboards in **Grafana**:  request rate, error rate, P99 latency per service.
- Alert on: error rate > 5%, Redis latency > 10ms, inference latency > 500ms.

---

## 2. Secrets Management

### AWS Secrets Manager / HashiCorp Vault
**Current state:** All secrets in `.env` files on each VM.  
**Problem:** Manual rotation, no audit trail, secrets duplicated across services.

**Planned:**
- Migrate all credentials to **AWS Secrets Manager** (or Vault if multi-cloud).
- Each service fetches its secret bundle at startup via `@aws-sdk/client-secrets-manager`.
- Enable **automatic rotation** for:
  - MongoDB Atlas credentials (60-day rotation)
  - Redis password
  - JWT signing key (with a grace window for in-flight tokens)
  - PhonePe / OCI API keys

```js
// Planned startup pattern
import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";
const client = new SecretsManagerClient({ region: "ap-south-1" });
const { SecretString } = await client.send(new GetSecretValueCommand({ SecretId: "workping/prod/api" }));
const secrets = JSON.parse(SecretString);
```

### Pre-commit Hook
- `husky` + `detect-secrets` / `gitleaks` to block accidental `.env` commits at the git hook level.
- CI step to scan all commits for leaked secrets.

---

## 3. API Gateway (Enhancement)

**Current state:** Nginx serves as reverse proxy + API gateway — SSL termination, path/subdomain routing, WebSocket upgrade, and static file serving are all handled at the Nginx layer.

**Enhancement opportunity:**
- Upgrade to **Kong** (built on Nginx) or add **Nginx Plus** plugins.
- Centralise JWT validation at the gateway level so microservices don't each need auth middleware.
- Add gateway-level rate limiting, request logging, and CORS — removing the boilerplate from each service.
- This is a **low-priority enhancement**, not a missing feature.

---

## 4. Service Discovery & Configuration

**Current state:** Microservice URLs are hardcoded in `.env` on the core API.  
**Problem:** Changing a service port requires redeploying the core API.

**Planned:**
- Register services in **Consul** or use **Docker DNS** (service names as hostnames).
- Core API resolves `workping-mailer:3003` instead of a hardcoded IP.
- Health-check registration: Consul deregisters unhealthy services automatically.

---

## 5. TypeScript Migration (Frontend)

**Current state:** `admin-ui` and `employees-ui` are plain JavaScript.  
**Decision:** The team prefers JS for iteration speed.

**If migrated:**
- Incremental: start with shared API service layer (`src/services/*.ts`).
- Use `checkJs: true` with JSDoc types as a halfway step.
- Keep component files as `.jsx` until stable.

---

## 6. OpenAPI / Swagger Documentation

**Current state:** No machine-readable API spec.

**Planned:**
- Add `swagger-jsdoc` + `swagger-ui-express` to the core API.
- Auto-generate spec from JSDoc annotations on route handlers.
- Expose at `/api/docs` (protected by admin auth in production).

---

## 7. CSRF Protection

**Current state:** `SameSite=Strict` cookies provide implicit CSRF protection for modern browsers.  
**Gap:** Older browsers and non-standard clients are not protected.

**Planned:**
- Add `csrf-csrf` (double-submit cookie pattern) for state-mutating routes.
- Frontend reads the CSRF token from a cookie and sends it in the `X-CSRF-Token` header.

---

## 8. Kubernetes / Container Orchestration

**Current state:** Docker Compose for individual services; PM2 for Node.js processes.  
**Problem:** Manual scaling, no rolling deployments, no automatic pod replacement.

**Planned:**
- Migrate to **Kubernetes** (OKE — Oracle Kubernetes Engine, consistent with OCI storage).
- `Deployment` + `HorizontalPodAutoscaler` for the core API and biometric service.
- `CronJob` for subscription renewal (replacing `node-cron` in a persistent process).
- **Redis Sentinel** or **Redis Cluster** for HA.

---

## 9. Subscription & Billing Improvements

- Prorated upgrades/downgrades between plans mid-cycle.
- Invoice PDF generation and email delivery.
- Failed payment retry logic with exponential backoff.
- Add Razorpay as a secondary payment provider (avoid single-provider dependency).

---

## 10. Biometric Accuracy Improvements

- Allow multiple enrolled embeddings per employee (different lighting, angles).
- Anti-spoofing liveness detection (detect printed photos / screen replay).
- Periodic re-enrollment prompt after 6 months (embeddings drift with ageing/appearance changes).

---

## Summary Table

| Feature | Priority | Effort | Phase |
|---|---|---|---|
| Structured logging (Pino) | HIGH | Low | 2.1 |
| AWS Secrets Manager | HIGH | Medium | 2.1 |
| Pre-commit secret scanning | HIGH | Low | 2.1 |
| OpenAPI / Swagger | MEDIUM | Medium | 2.2 |
| CSRF protection | MEDIUM | Low | 2.2 |
| API gateway enhancement (Kong/Nginx Plus) | LOW | High | 3.0 |
| Prometheus + Grafana | MEDIUM | Medium | 2.3 |
| Distributed tracing (OTel) | LOW | High | 2.4 |
| Kubernetes migration | LOW | Very High | 3.0 |
| TypeScript (frontend) | LOW | Very High | 3.0 |
