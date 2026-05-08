# Oracle Cloud Express — Object Storage API

A **Node.js / Express 5** REST API that acts as a secure gateway to **Oracle Cloud Infrastructure (OCI) Object Storage**. Upload, download, list, and delete objects — or generate pre-signed URLs for direct client-to-OCI transfers. Includes a built-in performance dashboard.

## Quick Start

```bash
git clone https://github.com/nikhilcharan-dev/oracle-cloud-express.git
cd oracle-cloud-express
npm install
cp .env.example .env
```

Set the required values in `.env`:

```env
COMPARTMENT_ID=ocid1.tenancy.oc1..YOUR_TENANCY_OCID
REGION=ap-hyderabad-1
API_KEY=your-secret-key
```

Set up OCI credentials in `.oci/`:

```
.oci/
├── config      # [DEFAULT] profile with user, fingerprint, tenancy, region, key_file
└── key.pem     # RSA private key
```

Start the server:

```bash
npm run dev     # development (auto-reload via nodemon)
npm start       # production
```

Verify:

```bash
curl http://localhost:8000/health
# → {"status":"ok","uptime":1.234}
```

## Features

- **Bucket & Object CRUD** — list buckets, list/upload/download/delete objects
- **Pre-signed URLs** — time-limited upload/download URLs for direct client-to-OCI transfers
- **Performance Dashboard** — real-time metrics at `http://localhost:8000/` with auto-refresh
- **Metrics Export** — download metrics as JSON or CSV
- **Daily History** — 30-day request/error trend tracking
- **Security** — Helmet, CORS, rate limiting, API key auth, input validation, filename sanitization
- **Structured Logging** — Pino (pretty in dev, JSON in prod)
- **Graceful Shutdown** — drains in-flight requests on SIGTERM/SIGINT
- **Persistent Metrics** — metrics survive server restarts via disk persistence

## Project Structure

```
oracle-cloud-express/
├── app.js                     # Entry point — middleware stack, routes, server
├── oci.client.js              # Singleton OCI ObjectStorageClient
├── oci.namespace.js           # Caches OCI namespace (one API call ever)
├── logger.js                  # Pino logger (pretty dev / JSON prod)
│
├── middleware/
│   ├── auth.js                # x-api-key header check
│   ├── validate.js            # Bucket/object name validation
│   ├── error-handler.js       # Centralized error handler
│   └── metrics.js             # Request metrics collector + persistence
│
├── routes/
│   ├── bucket.routes.js       # Bucket/object CRUD endpoints
│   └── presigned.routes.js    # Pre-signed URL generation
│
├── public/
│   └── dashboard.html         # Self-contained performance dashboard
│
├── data/                      # Persisted metrics (git-ignored)
├── uploads/                   # Temp dir for multipart uploads (auto-cleaned)
├── .oci/                      # OCI SDK credentials (git-ignored)
├── .env                       # Runtime config (git-ignored)
├── .env.example               # Documented env var template
├── Architecture.md            # Detailed architecture walkthrough
├── ENDPOINTS.md               # Full API reference
└── DEPLOYMENT.md              # Deployment & production guide
```

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `COMPARTMENT_ID` | **Yes** | — | OCI compartment OCID |
| `REGION` | **Yes** | — | OCI region (e.g. `ap-hyderabad-1`) |
| `PORT` | No | `8000` | HTTP listen port |
| `NODE_ENV` | No | `development` | `production` hides errors, uses JSON logging |
| `API_KEY` | No* | — (auth disabled) | API key for `x-api-key` header |
| `ALLOWED_ORIGINS` | No* | — (CORS blocked) | Comma-separated allowed origins |
| `RATE_LIMIT_MAX` | No | `100` | Max requests per IP per 15-min window |
| `OCI_CONFIG_PATH` | No | `.oci/config` | Path to OCI SDK config |
| `OCI_PROFILE` | No | `DEFAULT` | OCI config profile name |
| `MAX_FILE_SIZE_MB` | No | `50` | Max upload size in MB |
| `ALLOWED_MIME_TYPES` | No | — (all) | Comma-separated MIME whitelist |
| `PRESIGNED_EXPIRY_MINUTES` | No | `15` | Pre-signed URL lifetime |
| `LOG_LEVEL` | No | `info` | `trace`/`debug`/`info`/`warn`/`error`/`fatal` |

> \* Strongly recommended for production.

## Dashboard

Open `http://localhost:8000/` in a browser. You'll be prompted for your API key (same as `API_KEY` in `.env`). The dashboard shows:

- Total requests, avg/p95 response times, error rate
- Status code breakdown (2xx/3xx/4xx/5xx)
- 30-day daily history bar chart
- Per-endpoint breakdown table
- Uptime timeline dots

Export metrics via the **Export JSON** / **Export CSV** buttons, or directly:

```bash
curl -H "x-api-key: YOUR_KEY" http://localhost:8000/api/metrics/export?format=csv -o metrics.csv
```

## Security

| Layer | Protection |
|---|---|
| Helmet | CSP, HSTS, X-Frame-Options, + 8 more headers |
| Rate Limiting | Per-IP throttling (skips dashboard/metrics) |
| CORS | Only configured origins allowed |
| API Key Auth | `x-api-key` header required on all API routes |
| Input Validation | Bucket/object names: `^[a-zA-Z0-9._-]+$`, max 256 chars, no `..` |
| Upload Limits | File size cap + optional MIME whitelist |
| Filename Sanitization | Unsafe chars replaced with `_` |
| Error Hiding | Production hides internal error messages |

## Dependencies

| Package | Purpose |
|---|---|
| `express` ^5.2.1 | Web framework |
| `oci-sdk` ^2.125.2 | Oracle Cloud SDK |
| `helmet` ^8.1.0 | Security headers |
| `express-rate-limit` ^8.2.1 | Rate limiting |
| `cors` ^2.8.6 | CORS |
| `morgan` ^1.10.1 | HTTP logging |
| `multer` ^2.0.2 | File uploads |
| `dotenv` ^17.3.1 | Env vars |
| `pino` ^10.3.1 | Structured logging |
| `pino-pretty` ^13.1.3 | Dev log formatting |
| `content-disposition` ^1.0.1 | Safe download headers |

## License

ISC
