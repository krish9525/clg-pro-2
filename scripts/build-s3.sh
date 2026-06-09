 #!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FRONTEND="$ROOT/frontend"
ENV_PROD="$FRONTEND/.env.production"
ENV_EXAMPLE="$FRONTEND/.env.production.example"

if [[ ! -f "$ENV_PROD" && -f "$ENV_EXAMPLE" ]]; then
  cp "$ENV_EXAMPLE" "$ENV_PROD"
  echo "Created frontend/.env.production — set VITE_SERVER_URL to your live API URL."
fi

if [[ -f "$ENV_PROD" ]] && grep -q "your-api-domain.com" "$ENV_PROD" 2>/dev/null; then
  echo "Warning: Update VITE_SERVER_URL in frontend/.env.production before S3 deploy."
fi

cd "$FRONTEND"
npm run build

echo ""
echo "Build ready: frontend/dist/"
echo "Upload: S3_BUCKET=your-bucket-name npm run deploy:s3"
