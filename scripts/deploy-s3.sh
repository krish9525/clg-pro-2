#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIST="$ROOT/frontend/dist"

if [[ -z "${S3_BUCKET:-}" ]]; then
  echo "Error: Set your bucket name first."
  echo "  export S3_BUCKET=your-bucket-name"
  echo "  npm run deploy:s3"
  exit 1
fi

if [[ ! -d "$DIST" ]]; then
  echo "Error: $DIST not found. Run: npm run build:s3"
  exit 1
fi

if ! command -v aws &>/dev/null; then
  echo "Error: AWS CLI not installed. Install: https://aws.amazon.com/cli/"
  exit 1
fi

AWS_REGION="${AWS_REGION:-ap-south-1}"
S3_URI="s3://${S3_BUCKET}/"

echo "Uploading $DIST → $S3_URI (region: $AWS_REGION)"

# Long cache for hashed assets
aws s3 sync "$DIST/" "$S3_URI" --delete --region "$AWS_REGION" \
  --cache-control "public, max-age=31536000, immutable" \
  --exclude "index.html"

# No cache for HTML (SPA entry)
aws s3 cp "$DIST/index.html" "${S3_URI}index.html" --region "$AWS_REGION" \
  --cache-control "public, max-age=0, must-revalidate" \
  --content-type "text/html"

# Remaining files (e.g. favicon, assets without hash in name)
aws s3 sync "$DIST/" "$S3_URI" --region "$AWS_REGION" \
  --exclude "*" \
  --include "*.html" \
  --exclude "index.html" \
  --cache-control "public, max-age=3600" 2>/dev/null || true

echo ""
echo "Upload done."
echo "S3 static website: set Index document = index.html, Error document = index.html (for React routes)."
echo "CloudFront: custom error 403/404 → /index.html with 200 response."
