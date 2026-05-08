# WorkPing - WhatsApp Microservice

A WhatsApp Cloud API microservice with LLM-powered intent detection and response generation. Receives messages via Meta webhook, classifies intent (rule engine + LLM fallback), and replies automatically. Also exposes an API for sending messages from external services.

## Features

- **WhatsApp Cloud API** integration via Meta Graph API v22.0
- **Intent Detection** - Rule engine (fast) with LLM fallback for unknown intents
- **Multi-provider LLM** - Switch between Ollama (local), AWS Bedrock (cloud), or a custom self-hosted model at runtime
- **Template + LLM Responses** - Known intents get instant template replies; unknown intents get LLM-generated responses
- **Send API** - Authenticated endpoint for external services to send WhatsApp messages
- **Dashboard** - Real-time analytics UI with provider management
- **First-time User Detection** - Welcome messages for new users
- **Analytics** - In-memory tracking of messages, intents, response times, and errors

## Architecture

```
Inbound Message (Meta Webhook)
    |
    v
Webhook Handler --> Normalizer --> Message Pipeline
                                       |
                              +--------+--------+
                              |                 |
                         Rule Engine       LLM Intent
                         (keyword)        (few-shot)
                              |                 |
                              +--------+--------+
                                       |
                                       v
                              Strategy Resolver
                              /               \
                        TEMPLATE              LLM
                        (instant)          (generated)
                              \               /
                               v             v
                              Send via Meta API
```

## Project Structure

```
server.js                      # Express entry point
config/
  whatsappConfig.js            # Meta webhook verification
webhook/
  whatsapp.webhook.js          # Inbound message handler
  whatsapp.normalizer.js       # Normalize Meta payload
pipeline/
  message.pipeline.js          # Core processing pipeline
intent/
  rule.engine.js               # Keyword-based intent matching
  intent.llm.js                # LLM-based intent detection
context/
  context.builder.js           # Build context for responses
response/
  strategy.resolver.js         # Route to TEMPLATE or LLM
  templates.js                 # Template responses (11 intents)
  llm.generator.js             # LLM response generation
whatsapp/
  sender.js                    # Meta API message sender
routes/
  origin.router.js             # Send API (authenticated)
  dashboard.api.js             # Dashboard REST API
utils/
  llm.provider.js              # Unified LLM provider abstraction
  ollama.client.js             # Ollama HTTP client
  bedrock.client.js            # AWS Bedrock client (SigV4)
  custom.client.js             # Custom self-hosted model client
  intent.prompts.js            # Few-shot prompts for intent classification
  analytics.js                 # In-memory analytics tracker
  user.tracker.js              # First-time user detection
  env.sync.js                  # .env file read/write utility
public/
  dashboard.html               # Analytics dashboard UI
scripts/
  setup-ollama.sh              # Pull model into Ollama container
```

## Quick Start

```bash
# Install dependencies
npm install

# Copy and configure environment
cp .env.example .env
# Edit .env with your WhatsApp credentials

# Start the server
npm start
```

The server starts on `http://localhost:3000`.

- Dashboard: `http://localhost:3000/dashboard`
- Health check: `http://localhost:3000/health`

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `PORT` | No | Server port (default: 3000) |
| `ORIGIN` | Yes | Allowed CORS origin |
| `WHATSAPP_VERIFY_TOKEN` | Yes | Meta webhook verification token (also used as API auth secret) |
| `WHATSAPP_PHONE_NUMBER_ID` | Yes | Meta phone number ID |
| `WHATSAPP_META_BASE_URI` | Yes | Meta Graph API base URL |
| `WHATSAPP_API_KEY` | Yes | Meta API access token |
| `LLM_PROVIDER` | No | `ollama`, `bedrock`, or `custom` (default: ollama) |

See [DEPLOYMENT.md](DEPLOYMENT.md) for provider-specific variables.

## LLM Providers

| Provider | Use Case | Requirements |
|---|---|---|
| **Ollama** | Local/self-hosted, no API costs | Ollama server + model pulled |
| **Bedrock** | AWS cloud, managed scaling | AWS credentials + model access |
| **Custom** | Any remote model server | HTTP endpoint with chat API |

Providers can be switched at runtime via the dashboard or API without restart.

## Supported Intents

| Intent | Detection | Response |
|---|---|---|
| GREETING | Rule + LLM | Template |
| FRS_ISSUE | Rule + LLM | Template |
| ATTENDANCE_STATUS | Rule + LLM | Template |
| LEAVE_REQUEST | Rule + LLM | Template |
| SALARY_QUERY | Rule + LLM | Template |
| SHIFT_INFO | Rule + LLM | Template |
| HOLIDAY_INFO | Rule + LLM | Template |
| POLICY_INFO | Rule + LLM | Template |
| COMPLAINT | Rule + LLM | Template |
| HELP | Rule + LLM | Template |
| GOODBYE | Rule + LLM | Template |
| UNKNOWN | LLM only | LLM generated |

## Documentation

- [ENDPOINTS.md](ENDPOINTS.md) - Complete API reference
- [DEPLOYMENT.md](DEPLOYMENT.md) - Docker, VM, and provider setup guides
