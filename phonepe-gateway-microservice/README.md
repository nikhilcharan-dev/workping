# WorkPing Payments (PhonePe Gateway)

Microservice wrapper around the PhonePe UPI payment API. Handles payment initiation, status tracking, refunds, and webhook verification for WorkPing subscription billing.

## Tech Stack

- **Runtime**: Node.js (ES modules)
- **Framework**: Express 5
- **Payment Provider**: PhonePe (UPI)
- **Scheduling**: node-cron (retry failed payments)

## Getting Started

```bash
cp .env.example .env   # fill in PhonePe credentials
npm install
npm run dev            # npx nodemon
# or
npm start
```

## Environment Variables

See [`.env.example`](.env.example) for the full reference.

| Variable | Description |
|---|---|
| `PHONEPE_CLIENT_ID` | PhonePe merchant client ID |
| `PHONEPE_CLIENT_SECRET` | PhonePe client secret |
| `PHONEPE_BASE_URL` | API base — production or sandbox |
| `PHONEPE_AUTH_BASE_URL` | Auth base — production or sandbox |
| `WEBHOOK_USERNAME` | Basic auth username for webhook endpoint |
| `WEBHOOK_PASSWORD` | Basic auth password for webhook endpoint |
| `ORIGIN_WEBHOOK_SECRET` | HMAC secret for verifying inbound webhooks |

## Endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/payments/initiate` | Initiate a UPI payment |
| `GET` | `/api/payments/status/:txnId` | Poll payment status |
| `POST` | `/api/refund/initiate` | Initiate a refund |
| `GET` | `/api/refund/status/:refundId` | Poll refund status |
| `POST` | `/api/phonepe/webhook` | PhonePe server-to-server webhook |
| `GET` | `/api/payments/phonepe/callback` | Browser redirect after payment |

## Environments

PhonePe provides separate sandbox and production endpoints. Set `PHONEPE_BASE_URL` accordingly:

| Env | Base URL |
|---|---|
| Sandbox | `https://api-preprod.phonepe.com/apis/pg-sandbox` |
| Production | `https://api.phonepe.com/apis/pg` |

## Security

- Webhook endpoint verifies PhonePe's HMAC-SHA256 signature before processing any payment event.
- All routes behind API key authentication (`Authorization: Bearer <key>`).

## Related Services

- [workping-api](../centralized-server/server) — calls this service to create subscription orders
