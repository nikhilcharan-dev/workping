# 📧 Mailer Service

## WorkPing – Internal Microservice

A reusable, plug-and-play **mailer & OTP microservice** built for **WorkPing** and other internal products.  
Handles OTP generation, delivery, verification, and expiry using **Redis** as the source of truth.

Designed to be **stateless at the API layer**, horizontally scalable, and easy to integrate.

---

## 🚀 Features

- 📩 Send OTP via Email
- 🔢 Secure OTP generation
- 🧠 Redis-based OTP storage
- ⏳ Automatic OTP expiry (TTL)
- ✅ OTP verification & invalidation
- 🔁 Reusable across multiple products
- 🐳 Fully Dockerized
- 🧩 Docker Compose ready
- 🛡️ API key based internal authorization
- 📜 Request logging via Morgan

---

## 🧠 OTP Architecture (Redis-Based)

OTPs are stored in Redis with a TTL.

### Flow

1. Client requests OTP
2. Server generates OTP
3. OTP stored in Redis with expiry
4. OTP sent via email
5. Client submits OTP for verification
6. OTP is validated and deleted

✔️ One-time OTP  
✔️ Strong replay protection  
✔️ Simple and reliable  

---

## 🧪 API Endpoints

### Send Email OTP
```http
POST /api/v1/send-email-otp
```

**Headers**
```http
Authorization: <INTERNAL_SECRET>
```

**Body**
```json
{
  "email": "user@example.com"
}
```

**Response**
```json
{
  "status": "success"
}
```

---

### Verify Email OTP
```http
POST /api/v1/verify-email-otp
```

**Headers**
```http
Authorization: <INTERNAL_SECRET>
```

**Body**
```json
{
  "email": "user@example.com",
  "otp": "123456"
}
```

**Response**
```json
{
  "status": "success"
}
```

---

## 🔐 Environment Variables

Create a `.env` file:

```env
PORT=3000
SECRET=internal_service_secret

REDIS_HOST=redis
REDIS_PORT=6379

MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=example@gmail.com
MAIL_PASS=app_password
```

---

## 🐳 Docker

### Build Image
```bash
docker build -t workping-mailer .
```

### Run Container
```bash
docker run -d \
  -p 3000:3000 \
  --env-file .env \
  workping-mailer
```

---

## 🔌 Plug-and-Play Usage

Any internal service can consume this API by:
- Adding the `Authorization` header
- Sending an email payload

No product-specific coupling.  
OTP logic stays centralized.

---

## 🛡️ Security Notes

- OTPs are stored with TTL (default: 30 mins)
- OTP deleted immediately after successful verification
- API protected via shared secret
- Redis acts as the single source of truth

---

## 🧱 Tech Stack

- Node.js (ESM)
- Express.js
- Redis
- Nodemailer
- Docker & Docker Compose

---

## 🗺️ Roadmap

- 📱 Phone OTP support
- 🔄 Stateless JWT OTP (optional mode)
- ⏱️ Rate limiting
- 📊 Metrics & health checks
- 🔐 mTLS / service-to-service auth

---

## ✨ Maintained by

**WorkPing Devs**
