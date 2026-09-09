# IntegriSense AI — Project Handover & Context Restore Sheet

This document serves as a complete history, status sheet, and implementation roadmap for the **IntegriSense AI** platform. It contains all the necessary design guidelines, system context, and technical instructions to allow another session or developer to resume work seamlessly.

---

## 1. Project Metadata & Environment Context

*   **GCP Project ID:** `integrisense-ai-2026`
*   **GCP Project Number:** `973128660063`
*   **Default Region:** `us-central1`
*   **Runtime Service Account:** `integrisense-runtime@integrisense-ai-2026.iam.gserviceaccount.com`
*   **Local Developer OS:** Windows (running native PowerShell)
*   **Network Constraint:** Behind an SSL-decrypting corporate proxy.

### 1.1 SSL/TLS Proxy Bypass Configuration
*   **Standard HTTPS (BigQuery/PubSub REST):** Handled locally by automatically setting `process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0'` in local `development` or `test` modes in [`backend/src/server.ts`](file:///c:/Users/SwathiSahukara/OneDrive%20-%20Allucent/Desktop/integrisense-ai/backend/src/server.ts).
*   **gRPC (Firestore/PubSub gRPC):** gRPC ignores the TLS reject unauthorized flag. We bypass this locally by:
    1.  Running [`infrastructure/export-certs.ps1`](file:///c:/Users/SwathiSahukara/OneDrive%20-%20Allucent/Desktop/integrisense-ai/infrastructure/export-certs.ps1) to extract all Windows system root/intermediate CAs (including corporate CAs) into `backend/ca.pem`.
    2.  Setting `GRPC_DEFAULT_SSL_ROOTS_FILE_PATH` in `backend/.env` to point to `ca.pem`.
    3.  Setting `ENABLE_FIRESTORE=false` locally in `backend/.env` to activate the local in-memory fallback stub. This prevents the corporate firewall from blocking raw gRPC connections on port 443 during local development.

---

## 2. History of Work Accomplished

### Phase 0: Project Initialization (Completed)
*   Initialized backend Node.js 22 project, configured Fastify 5, TypeScript 5, Pino 9, Zod 3, and Vitest 3.
*   Established standard ESLint 9 and Prettier formatting rules.
*   Implemented Fastify server bootstrap and GET `/health` route.
*   Configured multi-stage Docker build pipeline in [`backend/Dockerfile`](file:///c:/Users/SwathiSahukara/OneDrive%20-%20Allucent/Desktop/integrisense-ai/backend/Dockerfile).

### Phases 1-4: GCP Foundation & Core Services (Completed)
*   Provisioned **BigQuery** dataset `integrisense_ds` and DDL schemas for partition-by-day and cluster-by-id telemetry tables.
*   Created **Pub/Sub** topic `integration-events` and native **BigQuery Subscription** `integration-events-bq-sub` to stream telemetry events directly into analytics storage.
*   Provisioned **Firestore** native database in `us-central1`.
*   Created the **Artifact Registry** repository `integrisense-repo`.
*   Mapped **IAM bindings** mapping the 6 required database and access roles to the `integrisense-runtime` service account.

### Phase 5: Container Packaging & GCP Cloud Run Deployment (Completed)
*   Developed a native .NET root certificate exporter script to compile corporate decrypting proxy certs into `ca.pem`.
*   Resolved `.dockerignore` context exclusions to allow multi-stage TypeScript compilation inside the container.
*   Built and deployed container to **GCP Cloud Run** using Google Cloud Build (bypassing local Docker Desktop dependencies).
*   Verified cloud endpoints (/health and /simulate) successfully.

---

## 3. Current State of the Codebase

### 3.1 Active Local Configuration (`backend/.env`)
```env
NODE_ENV=development
PORT=8080
LOG_LEVEL=debug
GCP_PROJECT_ID=integrisense-ai-2026
GCP_REGION=us-central1
BIGQUERY_DATASET=integrisense_ds
PUBSUB_TOPIC_INTEGRATION_EVENTS=integration-events
FIRESTORE_DATABASE=(default)

# Local Development Services Mode
ENABLE_BIGQUERY=true
ENABLE_PUBSUB=true
ENABLE_FIRESTORE=false  # Bypasses local corporate gRPC blocking via in-memory stub
ENABLE_AGENTS=false

# SSL/TLS Roots path for local gRPC/Node clients
GRPC_DEFAULT_SSL_ROOTS_FILE_PATH=C:\Users\SwathiSahukara\OneDrive - Allucent\Desktop\integrisense-ai\backend\ca.pem
NODE_EXTRA_CA_CERTS=C:\Users\SwathiSahukara\OneDrive - Allucent\Desktop\integrisense-ai\backend\ca.pem
```

### 3.2 Code Verification Status
*   **Typecheck:** Compiles successfully without errors (`npm run typecheck` exits 0).
*   **Tests:** **73/73 tests passing cleanly** (`npm test` exits 0).
*   **Deployed URL:** Deployed Serverless Fastify API is active at:
    `https://integrisense-api-973128660063.us-central1.run.app`

---

## 4. Roadmap & Future Specifications

### Phase 6: React Frontend Dashboard Setup & Development (Next Milestone)
*   **Goal:** Build a premium React + TypeScript client dashboard using Vite and vanilla CSS.
*   **Key Directories to Create:**
    *   `frontend/` (Root of React app)
*   **Features to Implement:**
    *   **Live Integration Cards:** Displays status (healthy/degraded/failed) of the four core integrations:
        *   `sap-to-data-platform`
        *   `salesforce-to-crm`
        *   `shopify-to-erp`
        *   `workday-to-ad`
    *   **Telemetry Metrics Charts:** Visualizes latency baselines, standard deviations, and error rates using queries against backend endpoints `/integrations/:id/health` and `/risk`.
    *   **Incident Feed:** Real-time feed of active integration incidents fetched from `/incidents`.
    *   **AI Recommendation & Approval Dialog:** Interactive cards listing recommended recovery actions (e.g. restart endpoint, roll back version) fetched from `/recovery`. Provides **Approve** (POST `/recovery/:id/approve`) and **Reject** (POST `/recovery/:id/reject`) actions.
    *   **Simulation Control Center:** Allows operators to trigger scenario simulations (normal, degradation, incident) on the API by sending POST requests to `/simulate`.
*   **Tech Stack:**
    *   Initialize using: `npx -y create-vite@latest frontend --template react-ts`
    *   Styling: Vanilla CSS tailored for readability and high-fidelity enterprise branding.

### Phase 7: Agentic AI Orchestrator & Gemini Multi-Agent System
*   **Goal:** Configure Google's **Application Development Kit (ADK)** and the **Gemini 2.5** models in the backend to enable automated observability.
*   **Agents to Define:**
    1.  **Monitor Agent:** Regularly reads telemetry statistics from BigQuery and evaluates performance metrics against baseline parameters.
    2.  **RCA (Root Cause Analysis) Agent:** Triggered by anomalies. Scans BigQuery records and logs to extract specific failures (e.g., specific HTTP error codes, timeout distributions) and generates a natural-language diagnosis.
    3.  **Prediction Agent:** Forecasts potential failure windows based on degradation velocity.
    4.  **Recovery Agent:** Drafts actionable remediation recommendations, creating a `RecoveryAction` document in Firestore with state `pending_approval`.
*   **Integration Flow:**
    *   When an anomaly is detected, the Orchestrator initiates the multi-agent chain.
    *   Output gets compiled into a single detailed `Incident` document inside Firestore.

### Phase 8: Deploy Frontend to Firebase Hosting
*   Install Firebase CLI tools (`npm install -g firebase-tools`).
*   Initialize Firebase Hosting in the `frontend` folder: `firebase init hosting`.
*   Deploy the production-build assets to make the dashboard publicly accessible.

---

## 5. Quick Command Reference for Resuming Work

### Start local backend development:
```powershell
cd backend
npm run dev
```

### Run entire Vitest test suite:
```powershell
cd backend
npm test
```

### Re-build Docker container in the cloud:
```powershell
gcloud builds submit --tag us-central1-docker.pkg.dev/integrisense-ai-2026/integrisense-repo/integrisense-api:latest backend/
```

### Re-deploy Fastify container to Cloud Run:
```powershell
gcloud run deploy integrisense-api `
  --image=us-central1-docker.pkg.dev/integrisense-ai-2026/integrisense-repo/integrisense-api:latest `
  --region=us-central1 `
  --service-account=integrisense-runtime@integrisense-ai-2026.iam.gserviceaccount.com `
  --set-env-vars="NODE_ENV=production,LOG_LEVEL=info,GCP_PROJECT_ID=integrisense-ai-2026,GCP_REGION=us-central1,BIGQUERY_DATASET=integrisense_ds,PUBSUB_TOPIC_INTEGRATION_EVENTS=integration-events,FIRESTORE_DATABASE=(default),ENABLE_BIGQUERY=true,ENABLE_PUBSUB=true,ENABLE_FIRESTORE=true" `
  --allow-unauthenticated `
  --quiet
```
