# API Endpoints Reference

Base URL: `https://your-host`

---

## Public Endpoints

### `GET /health`

Health check with LLM provider status.

**Response (200):**
```json
{
  "status": "OK",
  "llm": {
    "ok": true,
    "model": "qwen2.5:3b",
    "loaded": true,
    "provider": "ollama"
  }
}
```

**Response (503) - LLM down:**
```json
{
  "status": "DEGRADED",
  "llm": { "ok": false, "error": "connect ECONNREFUSED", "provider": "ollama" }
}
```

### `GET /keepmealive`

Simple uptime check.

**Response (200):**
```json
{ "status": "OK" }
```

### `GET /dashboard`

Serves the analytics dashboard UI (HTML page).

---

## WhatsApp Endpoints

Base path: `/api/secure/whatsapp`

### `GET /api/secure/whatsapp/webhook`

Meta webhook verification. Called once by Meta to verify the webhook URL.

**Query Parameters:**
| Param | Description |
|---|---|
| `hub.mode` | Must be `subscribe` |
| `hub.verify_token` | Must match `WHATSAPP_VERIFY_TOKEN` env var |
| `hub.challenge` | Challenge string returned on success |

**Response (200):** Returns the challenge string.
**Response (400):** Verification failed.

### `POST /api/secure/whatsapp/webhook`

Receives inbound WhatsApp messages from Meta. This is called automatically by Meta when a user sends a message.

**Request body:** Meta webhook payload (handled internally).
**Response:** `200` always (Meta requires immediate 200).

### `POST /api/secure/whatsapp/send`

Send a WhatsApp message to a user. Designed for external services (e.g. your main backend).

**Authentication required.** Pass the secret in the `Authorization` header.

**Headers:**
```
Content-Type: application/json
Authorization: <WHATSAPP_VERIFY_TOKEN value>
```

**Request body:**
```json
{
  "to": "919876543210",
  "text": "Your leave has been approved."
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `to` | string | Yes | Recipient phone number with country code, no `+` prefix |
| `text` | string | Yes | Message body. Supports WhatsApp formatting: `*bold*`, `_italic_` |

**Response (200):**
```json
{ "sent": true, "to": "919876543210" }
```

**Response (401):**
```json
{ "error": "Unauthorized" }
```

**Response (400):**
```json
{ "error": "Both 'to' and 'text' are required" }
```

**Response (500):**
```json
{ "error": "WhatsApp API error message" }
```

**Example (curl):**
```bash
curl -X POST https://your-host/api/secure/whatsapp/send \
  -H "Content-Type: application/json" \
  -H "Authorization: earthisflat" \
  -d '{"to": "919876543210", "text": "Your leave has been approved."}'
```

**Example (Node.js / axios):**
```js
await axios.post('https://your-host/api/secure/whatsapp/send', {
  to: '919876543210',
  text: 'Attendance marked successfully.'
}, {
  headers: { Authorization: 'earthisflat' }
});
```

---

## Dashboard API

Base path: `/api/dashboard`

These endpoints are used by the dashboard UI and can also be called programmatically.

### `GET /api/dashboard/stats`

Get real-time analytics.

**Response (200):**
```json
{
  "totalMessages": 142,
  "totalErrors": 3,
  "uniqueUsers": 28,
  "avgResponseTime": 1250,
  "intentCounts": {
    "GREETING": 45,
    "ATTENDANCE_STATUS": 30,
    "UNKNOWN": 12
  },
  "modeCounts": {
    "TEMPLATE": 120,
    "LLM": 22
  },
  "hourlyMessages": [0, 0, 0, 0, 0, 0, 2, 8, 15, 22, ...],
  "recentMessages": [
    {
      "from": "919876543210",
      "username": "John",
      "text": "check my attendance",
      "intent": "ATTENDANCE_STATUS",
      "confidence": 0.9,
      "mode": "TEMPLATE",
      "responseTimeMs": 450,
      "timestamp": 1709654400000
    }
  ],
  "uptime": 3600
}
```

### `GET /api/dashboard/health`

LLM provider health check.

**Response (200):**
```json
{
  "ok": true,
  "model": "qwen2.5:3b",
  "loaded": true,
  "provider": "ollama"
}
```

### `GET /api/dashboard/provider`

Get the active LLM provider.

**Response (200):**
```json
{ "provider": "ollama" }
```

### `POST /api/dashboard/provider`

Switch the active LLM provider at runtime.

**Request body:**
```json
{ "provider": "bedrock" }
```

| Field | Type | Values |
|---|---|---|
| `provider` | string | `ollama`, `bedrock`, `custom` |

**Response (200):**
```json
{ "provider": "bedrock" }
```

**Response (400):**
```json
{ "error": "Unknown provider: xyz. Use \"ollama\", \"bedrock\", or \"custom\"." }
```

### `GET /api/dashboard/config/:provider`

Get configuration for a provider. Secrets are masked.

**URL params:** `provider` = `ollama` | `bedrock` | `custom`

**Response (200) - Ollama:**
```json
{
  "provider": "ollama",
  "baseUrl": "http://localhost:11434",
  "model": "qwen2.5:3b"
}
```

**Response (200) - Bedrock:**
```json
{
  "provider": "bedrock",
  "region": "us-east-1",
  "accessKeyId": "AKIAXY****",
  "secretAccessKey": "****",
  "modelId": "amazon.nova-micro-v1:0"
}
```

**Response (200) - Custom:**
```json
{
  "provider": "custom",
  "baseUrl": "http://my-server:8000",
  "chatEndpoint": "/v1/chat",
  "generateEndpoint": "/v1/generate",
  "apiKey": "sk-abc1****",
  "modelName": "my-model",
  "requestFormat": "openai",
  "timeout": 60000
}
```

### `PUT /api/dashboard/config/:provider`

Update configuration for a provider at runtime. Only include fields you want to change.

**URL params:** `provider` = `ollama` | `bedrock` | `custom`

**Request body (Ollama):**
```json
{
  "baseUrl": "http://192.168.1.100:11434",
  "model": "llama3:8b"
}
```

**Request body (Bedrock):**
```json
{
  "region": "us-west-2",
  "accessKeyId": "AKIA...",
  "secretAccessKey": "secret",
  "modelId": "anthropic.claude-3-haiku-20240307-v1:0"
}
```

**Request body (Custom):**
```json
{
  "baseUrl": "http://my-server:8000",
  "chatEndpoint": "/v1/chat/completions",
  "apiKey": "sk-...",
  "modelName": "my-model",
  "requestFormat": "openai",
  "timeout": 30000
}
```

**Response (200):** Returns the updated config (secrets masked).

### `POST /api/dashboard/sync`

Persist current runtime config to the `.env` file on disk. Without this, runtime changes are lost on restart.

**Request body (optional):**
```json
{ "provider": "ollama" }
```

If `provider` is omitted, syncs the currently active provider.

**Response (200):**
```json
{
  "synced": true,
  "provider": "ollama",
  "keys": ["LLM_PROVIDER", "OLLAMA_BASE_URL", "OLLAMA_MODEL"]
}
```

**Response (500):**
```json
{ "error": "error message" }
```
