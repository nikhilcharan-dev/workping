#!/bin/bash
# Setup script for Ollama on the VM
# Run this after docker-compose up

echo "Waiting for Ollama to be ready..."
until curl -sf http://localhost:11434/api/tags > /dev/null 2>&1; do
    sleep 2
    echo "  Ollama not ready yet..."
done

echo "Pulling Qwen2.5:3b model (~2GB download)..."
docker exec ollama ollama pull qwen2.5:3b

echo "Verifying model..."
docker exec ollama ollama list

echo "Testing model..."
curl -s http://localhost:11434/api/generate -d '{"model":"qwen2.5:3b","prompt":"Say hello in one word","stream":false}' | head -c 200

echo ""
echo "Setup complete! Model is ready."
