# Deployment Guide

## Prerequisites

- Node.js 20+
- A Meta (Facebook) Developer account with WhatsApp Business API access
- A server/VM with at least 4 CPUs and 24GB RAM (if using Ollama locally)

## 1. Local Development

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Fill in your WhatsApp credentials in .env

# Start Ollama (if using local LLM)
ollama serve
ollama pull qwen2.5:3b

# Start the service
npm start
```

## 2. Docker Deployment

### Using Docker Compose (Ollama + Service)

```bash
# Build and start both containers
docker-compose up -d

# Pull the model into the Ollama container (first time only)
bash scripts/setup-ollama.sh

# Check logs
docker logs whatsapp-service -f
```

This starts two containers:
- **ollama** - LLM server (3 CPUs, 20GB RAM, port 11434)
- **whatsapp-service** - The microservice (1 CPU, 2GB RAM, port 3000)

### Standalone Docker (Bedrock/Custom provider, no Ollama needed)

```bash
docker build -t whatsapp-service .
docker run -d \
  --name whatsapp-service \
  -p 3000:3000 \
  --env-file .env \
  -e LLM_PROVIDER=bedrock \
  whatsapp-service
```

## 3. VM Deployment

```bash
# Clone the repo
git clone https://github.com/nikhilcharan-dev/whatsapp-microservice.git
cd whatsapp-microservice

# Install Node.js 20 (Ubuntu/Debian)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install dependencies
npm ci --only=production

# Configure environment
cp .env.example .env
nano .env

# Start with a process manager
npm install -g pm2
pm2 start server.js --name whatsapp-service
pm2 save
pm2 startup
```

## 4. Meta WhatsApp Setup

1. Go to [Meta for Developers](https://developers.facebook.com)
2. Create an app with WhatsApp product
3. Get your Phone Number ID, API Key, and set a Verify Token
4. Configure the webhook URL: `https://your-host/api/secure/whatsapp/webhook`
5. Subscribe to `messages` field

## Environment Variables

### Core (Required)

```env
PORT=3000
ORIGIN=https://your-domain.com
WHATSAPP_VERIFY_TOKEN=your-secret-token
WHATSAPP_PHONE_NUMBER_ID=your-phone-number-id
WHATSAPP_META_BASE_URI=https://graph.facebook.com/v22.0
WHATSAPP_API_KEY=your-meta-api-token
```

### LLM Provider

```env
# Choose one: "ollama", "bedrock", or "custom"
LLM_PROVIDER=ollama
```

### Ollama Configuration

```env
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5:3b
```

Recommended model for 4 CPU / 24GB RAM: `qwen2.5:3b` (~2.5GB, 5-8 tok/s).

### AWS Bedrock Configuration

```env
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=your-secret-key
BEDROCK_MODEL_ID=amazon.nova-micro-v1:0
```

No AWS SDK required. Uses manual Signature V4 signing with only axios + crypto.

Supported models (ensure access is enabled in your AWS Bedrock console):
- `amazon.nova-micro-v1:0` (cheapest, fastest)
- `amazon.nova-lite-v1:0`
- `amazon.nova-pro-v1:0`
- `anthropic.claude-3-haiku-20240307-v1:0`
- `anthropic.claude-3-5-sonnet-20241022-v2:0`
- `meta.llama3-8b-instruct-v1:0`
- `mistral.mistral-7b-instruct-v0:2`

### Custom Self-Hosted Model

```env
CUSTOM_MODEL_BASE_URL=http://your-server:8000
CUSTOM_MODEL_CHAT_ENDPOINT=/v1/chat
CUSTOM_MODEL_GENERATE_ENDPOINT=/v1/generate
CUSTOM_MODEL_API_KEY=optional-bearer-token
CUSTOM_MODEL_NAME=my-model
CUSTOM_MODEL_REQUEST_FORMAT=openai
CUSTOM_MODEL_TIMEOUT=60000
```

Request format options:
- `openai` - OpenAI-compatible (vLLM, LiteLLM, TGI, etc.)
- `ollama` - Ollama-compatible remote server
- `raw` - Pass messages + options as-is to your server

## 5. Reverse Proxy (Nginx)

```nginx
server {
    listen 443 ssl;
    server_name your-domain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## 6. Health Monitoring

```bash
# Basic health check
curl https://your-host/health

# Keep-alive endpoint (for uptime monitors)
curl https://your-host/keepmealive

# Dashboard (browser)
https://your-host/dashboard
```

## 7. Runtime Configuration

LLM providers can be switched at runtime without restarting the service:

- **Dashboard UI** - Visit `/dashboard`, click the gear icon, configure and switch providers
- **API** - Use the dashboard API endpoints (see [ENDPOINTS.md](ENDPOINTS.md))
- **Sync to Disk** - Changes can be persisted to `.env` via the dashboard or `POST /api/dashboard/sync`
