# Custom LLM Integration Guide

This bot supports connecting to any self-hosted or third-party LLM via the **Custom** provider. This document describes the expected API contract your LLM server must implement.

---

## Quick Setup

1. Go to the Dashboard → **Settings** → **Custom** tab
2. Fill in:
   - **Base URL**: Your model server's address (e.g. `http://localhost:8000`)
   - **Chat Endpoint**: Path for chat completions (default: `/v1/chat`)
   - **Generate Endpoint**: Path for single-prompt generation (default: `/v1/generate`)
   - **API Key**: Bearer token (optional, leave blank if none)
   - **Model Name**: Sent in the request body as `model` field
   - **Request Format**: `openai`, `ollama`, or `raw`
3. Click **Save** → **Set Active** → **Test Connection**

---

## Request Formats

### `openai` (default, recommended)

Your server receives requests in OpenAI-compatible format:

```
POST /v1/chat
Content-Type: application/json
Authorization: Bearer <api_key>

{
  "model": "my-model",
  "messages": [
    { "role": "system", "content": "You are a helpful assistant." },
    { "role": "user", "content": "Hello" }
  ],
  "max_tokens": 512,
  "temperature": 0.4
}
```

**Expected response:**

```json
{
  "choices": [
    {
      "message": {
        "role": "assistant",
        "content": "Hi! How can I help you?"
      }
    }
  ]
}
```

### `ollama`

Compatible with Ollama's native API:

```
POST /v1/chat
{
  "model": "my-model",
  "messages": [...],
  "stream": false,
  "options": {
    "temperature": 0.4,
    "num_predict": 512
  }
}
```

**Expected response:**

```json
{
  "message": {
    "role": "assistant",
    "content": "Hi! How can I help you?"
  }
}
```

### `raw`

Messages and options are sent as-is. Use this if your API has a unique format:

```
POST /v1/chat
{
  "model": "my-model",
  "messages": [...],
  "maxTokens": 512,
  "temperature": 0.4
}
```

**Expected response** — the client checks these fields in order:

| Priority | Field | Example |
|----------|-------|---------|
| 1 | `choices[0].message.content` | OpenAI format |
| 2 | `message.content` | Ollama format |
| 3 | `response` | Ollama generate format |
| 4 | `text` | Plain text field |
| 5 | `output` | Generic output field |

---

## Endpoints Your Server Must Implement

### `POST /v1/chat` (required)

Chat completion with message history. This is the primary endpoint used for both intent detection and response generation.

### `POST /v1/generate` (optional)

Single-prompt text generation. If not provided, set the generate endpoint to the same path as chat — the client will wrap the prompt in a user message automatically.

### `GET /health` or `GET /` (optional)

Health check endpoint. The dashboard uses this to verify your server is reachable. Return any `2xx` status code.

---

## Environment Variables

You can also configure the custom provider via `.env` instead of the dashboard:

```env
LLM_PROVIDER=custom
CUSTOM_MODEL_BASE_URL=http://localhost:8000
CUSTOM_MODEL_CHAT_ENDPOINT=/v1/chat
CUSTOM_MODEL_GENERATE_ENDPOINT=/v1/generate
CUSTOM_MODEL_API_KEY=sk-your-key
CUSTOM_MODEL_NAME=my-model
CUSTOM_MODEL_REQUEST_FORMAT=openai
CUSTOM_MODEL_TIMEOUT=60000
```

---

## Example: Minimal Python Server

A minimal Flask server that implements the OpenAI-compatible format:

```python
from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route("/v1/chat", methods=["POST"])
def chat():
    data = request.json
    messages = data.get("messages", [])
    user_msg = messages[-1]["content"] if messages else ""

    # Replace with your actual model inference
    reply = f"Echo: {user_msg}"

    return jsonify({
        "choices": [{
            "message": {
                "role": "assistant",
                "content": reply
            }
        }]
    })

@app.route("/health")
def health():
    return jsonify({"status": "ok"})

if __name__ == "__main__":
    app.run(port=8000)
```

---

## Tips

- **Timeout**: Default is 60 seconds. Increase via dashboard or `CUSTOM_MODEL_TIMEOUT` for slow models.
- **Streaming**: Not supported. Your endpoint must return the full response in one shot.
- **Message roles**: The bot sends `system`, `user`, and `assistant` roles. Make sure your model handles all three.
- **Response length**: The bot requests short responses (`maxTokens: 256`) for WhatsApp. Adjust in your model if needed.
