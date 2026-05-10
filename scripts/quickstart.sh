#!/usr/bin/env bash
# quickstart.sh — bootstrap the full WorkPing stack for local development
set -euo pipefail

SERVICES=(
    "centralized-server/server"
    "mailer-microservice"
    "phonepe-gateway-microservice"
    "whatsapp-microservice"
    "oracle-cloud-object-microservice"
    "face-api-microservice"
)

echo "==> WorkPing Quick-Start"
echo ""

# 1. Copy missing .env files
echo "--> Checking environment files..."
for dir in "${SERVICES[@]}"; do
    env_file="$dir/.env"
    example_file="$dir/.env.example"
    if [ ! -f "$env_file" ] && [ -f "$example_file" ]; then
        cp "$example_file" "$env_file"
        echo "    Copied $example_file → $env_file  (fill in real values before running)"
    fi
done
echo ""

# 2. Build and start the stack
echo "--> Starting Docker Compose stack..."
docker compose up -d --build
echo ""

# 3. Wait for the core API to become healthy
echo "--> Waiting for workping-api to be healthy..."
RETRIES=20
until docker inspect --format='{{.State.Health.Status}}' workping-api 2>/dev/null | grep -q "healthy"; do
    RETRIES=$((RETRIES - 1))
    if [ "$RETRIES" -eq 0 ]; then
        echo "    ERROR: workping-api did not become healthy in time."
        echo "    Check logs with: docker compose logs workping-api"
        exit 1
    fi
    printf "."
    sleep 5
done
echo ""
echo "    workping-api is healthy."
echo ""

# 4. Seed demo data
echo "--> Seeding demo data..."
docker compose exec workping-api node seedAdminUser.js || echo "    (Seed skipped — already seeded or error)"
echo ""

echo "==> Stack is ready!"
echo ""
echo "    Core API:        http://localhost:5000"
echo "    Admin UI:        http://localhost:5173  (run: cd admin-ui && npm run dev)"
echo "    Employee UI:     http://localhost:5174  (run: cd employees-ui && npm run dev)"
echo "    Biometric API:   http://localhost:8001"
echo "    Storage API:     http://localhost:8000"
echo "    Mailer:          http://localhost:3003"
echo "    Payments:        http://localhost:3001"
echo "    Chatbot:         http://localhost:3002"
echo "    Metrics:         http://localhost:5000/metrics"
echo ""
echo "    Logs:            docker compose logs -f"
echo "    Stop:            docker compose down"
