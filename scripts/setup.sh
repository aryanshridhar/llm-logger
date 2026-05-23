#!/usr/bin/env bash
# Local setup: pnpm setup  (or ./scripts/setup.sh)
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

MOCK_ONLY=false
SKIP_DEV=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --mock)
      MOCK_ONLY=true
      shift
      ;;
    --no-dev)
      SKIP_DEV=true
      shift
      ;;
    -h | --help)
      echo "Usage: ./scripts/setup.sh [--mock] [--no-dev]"
      echo "  --mock    Skip API key prompts; use LLM_PROVIDER=mock"
      echo "  --no-dev  Stop after infra + DB (do not run pnpm dev)"
      exit 0
      ;;
    *)
      echo "Unknown option: $1 (try --help)"
      exit 1
      ;;
  esac
done

bold() { printf '\033[1m%s\033[0m\n' "$*"; }
info() { printf '\033[36m→\033[0m %s\n' "$*"; }
warn() { printf '\033[33m!\033[0m %s\n' "$*"; }
err() { printf '\033[31m✗\033[0m %s\n' "$*" >&2; }
ok() { printf '\033[32m✓\033[0m %s\n' "$*"; }

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    err "Missing required command: $1"
    exit 1
  fi
}

bold "LLM Logger — local setup"
echo ""

require_cmd docker
require_cmd pnpm
require_cmd node

if ! docker info >/dev/null 2>&1; then
  err "Docker is not running. Start Docker Desktop and try again."
  exit 1
fi

NODE_MAJOR="$(node -p "process.versions.node.split('.')[0]")"
if [[ "$NODE_MAJOR" -lt 22 ]]; then
  warn "Node 22+ recommended (found $(node -v))"
fi

GEMINI_KEY=""
OPENAI_KEY=""
LLM_PROVIDER="gemini"

if [[ "$MOCK_ONLY" == true ]]; then
  info "Using mock provider (no external API keys)."
  LLM_PROVIDER="mock"
else
  echo ""
  bold "LLM API keys"
  echo "Press Enter to skip a provider. You need at least one key, or choose mock."
  echo "  Gemini: https://aistudio.google.com/apikey"
  echo "  OpenAI: https://platform.openai.com/api-keys"
  echo ""

  read -r -p "Use mock provider only (no API keys)? [y/N] " MOCK_ANSWER
  case "$MOCK_ANSWER" in
    y | Y | yes | Yes | YES)
      MOCK_ONLY=true
      LLM_PROVIDER="mock"
      ;;
    *)
    read -r -p "OpenAI API key (sk-…): " OPENAI_KEY
    read -r -p "Gemini API key: " GEMINI_KEY

    if [[ -z "$OPENAI_KEY" && -z "$GEMINI_KEY" ]]; then
      warn "No keys entered — falling back to mock provider."
      MOCK_ONLY=true
      LLM_PROVIDER="mock"
    elif [[ -n "$OPENAI_KEY" && -z "$GEMINI_KEY" ]]; then
      LLM_PROVIDER="openai"
    elif [[ -z "$OPENAI_KEY" && -n "$GEMINI_KEY" ]]; then
      LLM_PROVIDER="gemini"
    else
      echo ""
      echo "Default provider when the UI does not specify one:"
      echo "  1) gemini  2) openai"
      read -r -p "Choice [1]: " DEFAULT_CHOICE
      case "${DEFAULT_CHOICE:-1}" in
        2) LLM_PROVIDER="openai" ;;
        *) LLM_PROVIDER="gemini" ;;
      esac
    fi
      ;;
  esac
fi

if [[ ! -f .env.example ]]; then
  err ".env.example not found in $ROOT"
  exit 1
fi

cp .env.example .env

set_env_var() {
  local key="$1"
  local value="$2"
  local file="$3"
  # Escape for sed: \ & | and delimiter /
  local escaped
  escaped="$(printf '%s' "$value" | sed -e 's/[\\&|]/\\&/g')"
  if grep -q "^${key}=" "$file" 2>/dev/null; then
    if [[ "$(uname -s)" == "Darwin" ]]; then
      sed -i '' "s|^${key}=.*|${key}=${escaped}|" "$file"
    else
      sed -i "s|^${key}=.*|${key}=${escaped}|" "$file"
    fi
  else
    printf '%s=%s\n' "$key" "$value" >>"$file"
  fi
}

set_env_var "LLM_PROVIDER" "$LLM_PROVIDER" .env

if [[ "$MOCK_ONLY" == true ]]; then
  set_env_var "GEMINI_API_KEY" "" .env
  set_env_var "OPENAI_API_KEY" "" .env
else
  [[ -n "$GEMINI_KEY" ]] && set_env_var "GEMINI_API_KEY" "$GEMINI_KEY" .env
  [[ -n "$OPENAI_KEY" ]] && set_env_var "OPENAI_API_KEY" "$OPENAI_KEY" .env
  if [[ -z "$GEMINI_KEY" ]]; then
    set_env_var "GEMINI_API_KEY" "" .env
  fi
  if [[ -z "$OPENAI_KEY" ]]; then
    set_env_var "OPENAI_API_KEY" "" .env
  fi
fi

ok "Wrote .env (provider: ${LLM_PROVIDER})"

env_from_dotenv() {
  local key="$1"
  local file="$2"
  grep -m1 "^${key}=" "$file" 2>/dev/null | cut -d= -f2- || true
}

sqs_configured_in_env() {
  local url key secret
  url="$(env_from_dotenv SQS_QUEUE_URL .env)"
  key="$(env_from_dotenv AWS_ACCESS_KEY_ID .env)"
  secret="$(env_from_dotenv AWS_SECRET_ACCESS_KEY .env)"
  [[ "$url" =~ ^https://sqs\.[a-z0-9-]+\.amazonaws\.com/[0-9]{12}/ ]] \
    && [[ "$url" != *YOUR_ACCOUNT_ID* ]] \
    && [[ -n "$key" && "$key" != your-* ]] \
    && [[ -n "$secret" ]]
}

echo ""
bold "AWS SQS"
if sqs_configured_in_env; then
  ok "Using AWS/SQS from .env.example"
else
  warn "AWS/SQS not set in .env.example — edit it before setup (see README). Log pipeline may fail."
fi

# Remove LocalStack endpoint if present from an older .env.example
if grep -q "^SQS_ENDPOINT=" .env 2>/dev/null; then
  if [[ "$(uname -s)" == "Darwin" ]]; then
    sed -i '' '/^SQS_ENDPOINT=/d' .env
  else
    sed -i '/^SQS_ENDPOINT=/d' .env
  fi
fi

echo ""
bold "Starting Docker (Postgres)…"
docker compose up -d

wait_for_postgres() {
  local tries="${1:-30}"
  local i=1
  while [[ $i -le $tries ]]; do
    if docker compose exec -T postgres pg_isready -U postgres -q 2>/dev/null; then
      return 0
    fi
    sleep 2
    i=$((i + 1))
  done
  return 1
}

info "Waiting for Postgres…"
if wait_for_postgres 30; then
  ok "Postgres is up"
else
  warn "Postgres health check timed out — continuing anyway"
fi

echo ""
bold "Installing dependencies…"
pnpm install

bold "Database (Prisma)…"
pnpm db:generate
pnpm db:push

echo ""
ok "Setup complete."
echo ""
echo "  Chat UI:      http://localhost:5173"
echo "  Chat API:     http://localhost:3001"
echo "  Dashboard:    http://localhost:5173/dashboard"
echo "  Health:       http://localhost:3001/health"
echo ""

if [[ "$SKIP_DEV" == true ]]; then
  info "Skipped dev servers (--no-dev). Start with: pnpm dev"
  exit 0
fi

bold "Starting dev servers (Ctrl+C to stop)…"
echo ""
exec pnpm dev
