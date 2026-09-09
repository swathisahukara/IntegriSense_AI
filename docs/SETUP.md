# IntegriSense AI — Setup Guide

## Prerequisites

- Node.js 22 LTS (`node --version` → `v22.x.x`)
- npm 10+ (`npm --version`)
- Google Cloud CLI (`gcloud --version`) — required from Phase 1
- Docker Desktop — required for containerised deployment
- Git

---

## Local Development Setup

### 1. Clone the Repository

```bash
git clone <repo-url>
cd integrisense-ai
```

### 2. Configure Environment Variables

```bash
cp .env.example .env
```

Edit `.env` with your values. See `.env.example` for descriptions of each variable.

> ⚠️ **Never commit `.env`** — it is in `.gitignore`.

### 3. Backend Setup

```bash
cd backend
npm install
npm run dev
```

The API will start on `http://localhost:8080`.

### 4. Verify Health

```bash
curl http://localhost:8080/health
```

Expected:
```json
{
  "status": "healthy",
  "service": "integrisense-api",
  "environment": "development"
}
```

---

## Backend Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start with hot-reload (tsx watch) |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm run start` | Start compiled `dist/server.js` |
| `npm run typecheck` | TypeScript type-check without emitting |
| `npm test` | Run Vitest test suite |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with coverage report |
| `npm run lint` | Run ESLint |
| `npm run format` | Run Prettier |

---

## GCP Setup (Phase 1)

> Detailed GCP setup will be documented in Phase 1.
> This section will cover: project creation, enabling APIs, IAM, BigQuery, Pub/Sub, Firestore, Cloud Run, Secret Manager.

---

## Docker

```bash
cd backend
docker build -t integrisense-api .
docker run -p 8080:8080 --env-file .env integrisense-api
```

---

## Environment Variables Reference

See `.env.example` for the full list with descriptions.

Key variables:

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NODE_ENV` | Yes | `development` | Environment |
| `PORT` | No | `8080` | Server port |
| `LOG_LEVEL` | No | `info` | Pino log level |
| `GCP_PROJECT_ID` | Phase 1+ | — | GCP project ID |
| `GEMINI_API_KEY` | Phase 7+ | — | Gemini API key (local dev only) |
| `ENABLE_AGENTS` | No | `false` | Enable ADK agents |
| `ENABLE_BIGQUERY` | No | `false` | Enable BigQuery client |

---

## Troubleshooting

### Port already in use
```bash
# Find what's using port 8080
netstat -ano | findstr :8080   # Windows
lsof -i :8080                 # Mac/Linux

# Change port in .env
PORT=3001
```

### TypeScript errors
```bash
cd backend
npm run typecheck
```

### Test failures
```bash
cd backend
npm test -- --reporter=verbose
```
