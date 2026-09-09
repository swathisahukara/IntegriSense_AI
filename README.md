<div align="center">

# IntegriSense AI

### Autonomous Integration Observability, Predictive Failure Forecasting & Human-Approved Self-Healing

Enterprise integration pipelines fail silently. IntegriSense AI detects the drift before the outage, explains the root cause in plain engineering language, proposes a remediation playbook, and executes it the moment a human approves.

[![Live Web App](https://img.shields.io/badge/Live_App-integrisense--ai.web.app-3fb950?style=for-the-badge&logo=firebase&logoColor=white)](https://integrisense-ai.web.app)
[![Cloud Run API](https://img.shields.io/badge/API-Cloud_Run-4285f4?style=for-the-badge&logo=googlecloud&logoColor=white)](https://integrisense-ai.web.app)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178c6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-22_LTS-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Gemini](https://img.shields.io/badge/Gemini-2.5_Flash-8e75b2?style=for-the-badge&logo=googlegemini&logoColor=white)](https://deepmind.google/technologies/gemini/)
[![Tests](https://img.shields.io/badge/Vitest-73%2F73_passing-3fb950?style=for-the-badge&logo=vitest&logoColor=white)](#testing)

</div>

---

## Table of Contents

- [The Problem](#the-problem)
- [The Solution](#the-solution)
- [Live Deployment](#live-deployment)
- [Feature Walkthrough](#feature-walkthrough)
- [System Architecture](#system-architecture)
- [How It Actually Works](#how-it-actually-works)
- [Technology Stack](#technology-stack)
- [Repository Structure](#repository-structure)
- [API Reference](#api-reference)
- [Data Model](#data-model)
- [Configuration](#configuration)
- [Local Development](#local-development)
- [Testing](#testing)
- [Deployment](#deployment)
- [Engineering Decisions](#engineering-decisions)
- [Roadmap](#roadmap)
- [Project Milestones](#project-milestones)
- [License](#license)

---

## The Problem

A modern enterprise runs on integrations: SAP into a data lake, Salesforce into a CRM, Shopify into an ERP, Workday into a directory service. When one of these degrades, the business feels it before the engineering team does — stale inventory, unbilled orders, employees locked out on day one.

Conventional APM tooling answers exactly one question: **is it broken right now?**

It cannot answer the four questions that actually shorten an outage:

| Question | Conventional monitoring | IntegriSense AI |
|---|---|---|
| **When** will it break? | Silent until threshold breach | Forecast risk badge with a time-to-failure horizon |
| **Why** did it break? | Raw logs and metrics; engineer correlates manually | Gemini-generated technical root cause with cited metric evidence |
| **What else** is affected? | Not modelled | Blast-radius analysis across dependent connectors |
| **How** do I fix it safely? | Tribal knowledge in a runbook wiki | A risk-rated playbook with explicit steps, executed on approval |

The cost is measured in mean time to resolution. An SRE paged at 2 a.m. spends most of the incident *finding* the cause, not fixing it.

---

## The Solution

IntegriSense AI is an agentic observability platform built around a single closed loop:

```
DETECT → PREDICT → INVESTIGATE → EXPLAIN → RECOMMEND → HUMAN APPROVAL → RECOVER → VERIFY
```

Three principles govern the design:

**1. Statistics compute the numbers. AI explains them.**
Every risk score, z-score, and baseline deviation is calculated in deterministic, unit-tested TypeScript. Gemini is never asked to produce a number. It receives the computed evidence and produces the narrative — root cause, affected component, remediation steps. This keeps the platform auditable and makes the maths reproducible.

**2. Nothing destructive runs without a human.**
Every remediation is surfaced as a playbook with a risk rating and an explicit rollback position. An operator approves or rejects. The system never self-executes an unapproved action against a production pipeline.

**3. The reasoning is visible.**
The multi-agent operations feed streams every agent decision with a timestamp. Engineers do not have to trust a black box — they can read what the system concluded and why, before they approve anything.

---

## Live Deployment

| Component | URL | Platform |
|---|---|---|
| Web dashboard | https://integrisense-ai.web.app | Firebase Hosting |
| Backend API | `/api/*` (proxied via Firebase Hosting rewrite) | Google Cloud Run, `us-central1` |
| Health probe | `https://integrisense-ai.web.app/api/health` | Cloud Run |
| Source | https://github.com/swathisahukara/IntegriSense_AI | GitHub |

The frontend calls the API through a relative `/api` path. Firebase Hosting rewrites `/api/**` directly to the `integrisense-api` Cloud Run service in `us-central1`, so the browser never makes a cross-origin request and no API host is baked into the bundle.

---

## Feature Walkthrough

### Monitored Integration Pipelines

Four enterprise pipelines ship pre-configured, each with realistic latency and error-rate baselines derived from its system class:

| Pipeline | Source | Target | Latency baseline | Error baseline |
|---|---|---|---|---|
| SAP → Data Platform | SAP ERP S/4HANA | BigQuery Data Lake | 420 ms (σ 45) | 1.5 % |
| Salesforce → Dynamics CRM | Salesforce Sales Cloud | Dynamics 365 CRM | 180 ms (σ 20) | 0.8 % |
| Shopify → NetSuite ERP | Shopify Plus Store | NetSuite ERP | 310 ms (σ 35) | 2.2 % |
| Workday → Active Directory | Workday HR Suite | Active Directory (LDAP) | 1450 ms (σ 180) | 0.5 % |

Each card renders live latency with a percentage delta against baseline, current versus baseline error rate, queue depth, dead-letter backlog, a cloud-provider tag, a predictive risk badge, and the timestamp of the last telemetry tick. Metrics turn red the moment they cross their threshold.

### Multi-Cloud Connector Onboarding

The **+ Add Connector** flow registers a new pipeline at runtime — no redeploy, no code change. Choose GCP, AWS, Azure, or a hybrid custom webhook; name the source and target systems; set the latency and error-rate baselines the connector should be measured against.

The API derives a URL-safe integration ID from the name, provisions a dedicated ingestion endpoint (`/api/telemetry/ingest?integrationId=…`), returns it to the UI, and immediately begins generating and evaluating telemetry for it. The new pipeline appears in the grid with its provider tag on the next poll.

### Failure Simulation Engine

Four scenarios can be injected across the whole estate from the control bar. These drive the synthetic telemetry generator, which is how the platform is demonstrated without waiting for a real production outage:

| Scenario | Latency multiplier | Error rate | Queue depth | DLQ | Error code |
|---|---|---|---|---|---|
| ✅ **Normal** | 1.0× | 1 % | 2 | 0 | — |
| ⚠️ **Degrade** | 3.5× | 6 % | 75 | 0 | — |
| 🔴 **Incident** | 8.0× | 42 % | 420 | 14 | `ERR_HTTP_504_GATEWAY_TIMEOUT` |
| 💥 **Cascading** | 18.0× | 96 % | 2800 | 154 | `ERR_DB_DEADLOCK_ACQUISITION` |

### Predictive Risk Badges

Every pipeline card carries a forward-looking risk badge rather than a backward-looking status light:

- 🟢 `Normal Risk (4%)` — stable trend, 240-minute horizon, 98 % model confidence
- ⚠️ `84% Failure Risk in Next 30 Mins` — increasing trend, 95 % confidence
- 🚨 `Critical Outage Active (98% Impact)` — increasing trend, 99 % confidence

### Real-Time Telemetry Charts

Two Recharts line panels — **Latency Trajectory (ms)** and **Error Rate Trajectory (%)** — plot a rolling 20-point window across all pipelines simultaneously, with a dashed reference line marking the baseline. History is accumulated client-side from each poll, so the divergence during an injected failure is visible as it happens rather than after the fact.

### AI Root Cause Analysis

When an anomaly crosses threshold, the incident is enriched by Gemini 2.5 Flash before it is ever written to the incident store. The model receives the full metric context — pipeline identity, route, scenario, current versus baseline latency, instantaneous error rate, queue depth, DLQ backlog — and returns structured JSON containing the root cause, a detailed explanation, the metric evidence supporting it, the specific failing component, a confidence score, a named playbook, a recommendation, ordered remediation steps, and a risk level.

The incident card surfaces this alongside the deterministic evidence: latency, error rate, **z-score**, and **risk score**.

### Recovery Playbooks with Human-in-the-Loop Approval

Each active incident generates a matching recovery action in `pending_approval` state. The operator sees the remediation strategy and a risk chip (`Remediation Risk: Low (Non-destructive)`), then chooses:

- **Reject** → the decision is recorded against the operator ID; the incident stays open; nothing executes.
- **Approve & Remediate** → the recovery action is marked approved, matching incidents are resolved with a timestamp, the scenario is reset to `normal`, a `RecoveryAgent` activity is logged, a Slack confirmation is dispatched, and a fresh telemetry tick is forced so the UI reflects the healed state immediately.

### Multi-Agent Operations Feed

A live, timestamped audit trail of agent reasoning — `MonitorAgent` opening an incident with its root cause, `MonitorAgent` auto-resolving when telemetry returns to baseline, `RecoveryAgent` confirming playbook execution. The panel includes a collapsible **SRE Impact Guide** explaining why transparent multi-agent observability changes incident response.

### Gemini SRE Copilot

A slide-out conversational assistant grounded in the current telemetry state — it is passed the live integration list, active incidents, the active scenario, and the user's local time on every turn, so answers reference actual pipeline names and actual numbers.

Four quick prompts are provided: SAP latency diagnosis, blast radius of active incidents, recovery step explanation, and an all-pipeline health summary. The service attempts `gemini-2.5-flash`, then falls back through `gemini-2.0-flash` and `gemini-1.5-flash`, and finally to a deterministic template engine that still reads from live telemetry — so the Copilot never returns a dead response during a demo.

### Slack Incident Delivery

Configure an Incoming Webhook from the header and IntegriSense pushes rich Block Kit cards to your channel:

- **Incident card** — severity-coloured header, integration name, latency snapshot, error rate, DLQ backlog, detection time, the Gemini root cause diagnosis, and action buttons linking back to the playbook and Copilot.
- **Recovery card** — the implemented recommendation, recovery action ID, risk level, expected impact, and execution status.

### Interface Details

Dark, GitHub-inspired operations console (`#0d1117` / `#161b22`) with a custom SVG infinity-flow brand mark. Interactive header filter pills (`All` / `Healthy` / `Degraded` / `Failed`) with live counts and an empty-state reset. A performance banner surfacing the platform's positioning metrics. An About modal describing core capabilities. A React error boundary that catches render crashes, prints the stack, and offers a console reload rather than showing a blank page.

---

## System Architecture

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                     MULTI-CLOUD INTEGRATION SOURCES                          │
│   SAP S/4HANA · Salesforce · Shopify · Workday · AWS · Azure · Custom        │
└───────────────────────────────┬──────────────────────────────────────────────┘
                                │ telemetry events
                                ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                    REACT 19 + VITE DASHBOARD                                 │
│  TanStack Query · 10s polling · Recharts · SRE Copilot drawer                │
│  Firebase Hosting → https://integrisense-ai.web.app                          │
└───────────────────────────────┬──────────────────────────────────────────────┘
                                │ REST via /api/** rewrite
                                ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                  FASTIFY 5 API — GOOGLE CLOUD RUN                            │
│  Helmet · CORS · Pino structured logs · Zod env validation                   │
│  Routes mounted at both / and /api · graceful SIGTERM shutdown               │
└──┬──────────────┬──────────────┬──────────────┬──────────────┬───────────────┘
   │              │              │              │              │
   ▼              ▼              ▼              ▼              ▼
┌────────┐  ┌───────────┐  ┌──────────┐  ┌──────────┐  ┌─────────────┐
│Generator│  │ Anomaly   │  │  Gemini  │  │Firestore │  │   Slack     │
│Service │  │ Service   │  │ 2.5 Flash│  │ Service  │  │  Service    │
│        │  │           │  │          │  │          │  │             │
│10s tick│  │ z-score   │  │ RCA JSON │  │incidents │  │ Block Kit   │
│synthetic│ │ weighted  │  │ playbook │  │recovery  │  │ incident +  │
│telemetry│ │ risk      │  │ Copilot  │  │activities│  │ recovery    │
└───┬────┘  └─────┬─────┘  └──────────┘  └──────────┘  └─────────────┘
    │             │
    ▼             ▼
┌─────────────────────────┐   ┌──────────────────────────────────────┐
│  Cloud Pub/Sub          │──▶│  BigQuery                            │
│  integration-events     │   │  integration_events (partitioned)    │
│  snake_case mapped      │   │  failure_probability (risk history)  │
└─────────────────────────┘   └──────────────────────────────────────┘
```

### Request path

1. The browser calls `/api/integrations`.
2. Firebase Hosting rewrites the request to the `integrisense-api` Cloud Run service.
3. Fastify resolves active incidents from Firestore, active scenarios, and latency/error baselines from BigQuery, then composes the response with computed status and predictive risk.
4. TanStack Query caches the result, re-polls every 10 s, and appends a point to the client-side telemetry history.

### Telemetry path

1. `GeneratorService` ticks every 10 s across all monitored integrations.
2. For each pipeline it generates an `IntegrationEvent` with scenario-adjusted latency, status, queue depth, and DLQ count.
3. The event is published to Pub/Sub, field-mapped from camelCase to the snake_case BigQuery subscription schema.
4. `AnomalyService` computes the risk score against the BigQuery baseline.
5. If an anomaly is detected and no incident is open, Gemini generates the RCA and playbook; an incident, a recovery action, and an agent activity are written.
6. If telemetry has returned to baseline and an incident is open, it is auto-resolved and logged.
7. The risk forecast is appended to `failure_probability` in BigQuery.

---

## How It Actually Works

### The risk scoring engine

`AnomalyService.analyzeRisk()` is pure, deterministic, and unit-tested. It produces a score from 0.0 to 1.0 from four weighted components:

| Component | Weight | Calculation |
|---|---|---|
| **Latency** | 35 % | Z-score against baseline mean/σ (σ floored at 5 % of mean to avoid division by zero). Risk scales linearly from z = 1.0 to z = 5.0. |
| **Error rate** | 35 % | Deviation above baseline, saturating at +20 pp. Absolute fallback: any error rate above 5 % contributes risk regardless of baseline. |
| **Queue depth** | 15 % | Linear to a 1000-message backlog. |
| **Dead-letter queue** | 15 % | Any DLQ message starts at 0.5 (permanent failure), scaling to 1.0 at 50+ messages. |

The aggregate maps to a risk level — `low` (< 0.15), `medium` (≥ 0.15), `high` (≥ 0.50), `critical` (≥ 0.75) — and to a predicted failure window scaling from 12 hours down to 1 hour as risk approaches 1.0. Every component that contributes more than 0.1 is emitted as a named contributing factor with its weight, which is what makes the incident's trigger reason human-readable.

Supporting primitives, all individually tested: `calculateRollingMean`, `calculateStandardDeviation` (Bessel-corrected), `calculateZScore`, and `detectAnomaly` with a configurable threshold (default z = 3.0).

### The Gemini integration

`GeminiService` uses the official `@google/genai` SDK against `gemini-2.5-flash` with `responseMimeType: 'application/json'` and `temperature: 0.2` — low temperature because root cause analysis should be reproducible, not creative. The prompt supplies the full metric context and specifies the exact JSON contract the model must return.

The service degrades in three stages, so it is never a single point of failure:

1. **Primary** — Gemini 2.5 Flash with the structured JSON contract.
2. **Model fallback** — for the Copilot, cascade through `gemini-2.0-flash` and `gemini-1.5-flash`.
3. **Deterministic fallback** — per-integration hand-authored RCA responses keyed by pipeline ID (SAP RFC connection pool exhaustion, Salesforce OAuth 429 throttling, NetSuite webhook buffer overflow, Active Directory LDAP timeout), each interpolating the real live metric values. The Copilot's fallback is a multi-variation template engine that reads live telemetry and randomises structure so repeated questions do not return identical text.

This is why the dashboard remains fully functional with no API key configured — a deliberate choice for reviewability and offline development.

### Incident lifecycle

```
telemetry tick
      │
      ▼
  risk analysis ──── risk = low AND scenario = normal ────▶ no incident
      │
      │ risk ≥ medium OR scenario ≠ normal
      ▼
 incident already open? ──── yes ────▶ update snapshot only
      │ no
      ▼
 Gemini RCA + playbook generation
      │
      ├──▶ createIncident()          (severity mapped from risk level)
      ├──▶ createRecoveryAction()    (status: pending_approval)
      └──▶ logAgentActivity()        (MonitorAgent, type: analysis)
      │
      ▼
 operator decision ──── reject ────▶ decision recorded, incident stays open
      │ approve
      ▼
 incident resolved · scenario reset to normal · RecoveryAgent activity logged
 · Slack recovery card dispatched · telemetry tick forced
```

Auto-resolution runs in the same loop: if telemetry returns to baseline while an incident is open, `MonitorAgent` closes it and logs the decision without operator involvement, because closing a healed incident is non-destructive.

### Offline-first service design

Every cloud-dependent service ships with an in-memory fallback gated behind a feature flag:

| Service | Flag | Cloud mode | Offline mode |
|---|---|---|---|
| Firestore | `ENABLE_FIRESTORE` | `@google-cloud/firestore` collections | `Map`-backed incident, recovery, and activity stores |
| Pub/Sub | `ENABLE_PUBSUB` | Buffered publish to `integration-events` | In-memory event array with test accessors |
| BigQuery | `ENABLE_BIGQUERY` | Parameterised SQL against `integrisense_ds` | Deterministic baselines from telemetry config |
| Gemini | `GEMINI_API_KEY` | Live model call | Per-pipeline deterministic RCA |

The entire application runs, generates telemetry, opens incidents, and heals them with all four flags off and no GCP credentials — which is what makes the test suite fast and hermetic.

---

## Technology Stack

| Layer | Technology |
|---|---|
| **Language / runtime** | TypeScript 5.7, Node.js 22 LTS, ESM modules |
| **Backend framework** | Fastify 5 with `@fastify/helmet`, `@fastify/cors` |
| **Config validation** | Zod — fail-fast schema validation at startup |
| **Logging** | Pino with `pino-pretty`, per-request UUIDs, scoped child loggers |
| **Frontend** | React 19, Vite 8, TanStack Query 5, Recharts 3 |
| **AI** | Google Gemini 2.5 Flash via `@google/genai` |
| **Streaming** | Google Cloud Pub/Sub |
| **Analytics** | Google Cloud BigQuery (partitioned + clustered) |
| **Operational store** | Google Cloud Firestore |
| **Secrets** | Google Cloud Secret Manager |
| **Notifications** | Slack Incoming Webhooks (Block Kit) |
| **Hosting** | Cloud Run (API), Firebase Hosting (SPA) |
| **Testing** | Vitest 3 with V8 coverage |
| **Tooling** | ESLint 9, Prettier, oxlint, tsx |

---

## Repository Structure

```
integrisense-ai/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── env.ts                  Zod-validated environment schema
│   │   │   └── telemetry.config.ts     Pipeline definitions + failure scenarios
│   │   ├── middleware/auth.ts
│   │   ├── models/
│   │   │   ├── incident.model.ts       Incident, RCA, RecoveryAction, AgentActivity
│   │   │   ├── integration.model.ts    Integration, IntegrationEvent, PredictiveRisk
│   │   │   └── risk.model.ts           FailureProbability
│   │   ├── routes/
│   │   │   ├── health.ts               Liveness probe with JSON schema
│   │   │   ├── integrations.ts         List, register, detail, health
│   │   │   ├── incidents.ts            List with status filter, detail
│   │   │   ├── risk.ts                 Failure probability forecasts
│   │   │   ├── recovery.ts             Approve / reject playbooks
│   │   │   ├── simulation.ts           Scenario injection
│   │   │   ├── copilot.ts              Gemini chat + agent activity stream
│   │   │   └── slack.ts                Webhook config + test dispatch
│   │   ├── services/
│   │   │   ├── anomaly.service.ts      Deterministic statistics and risk scoring
│   │   │   ├── generator.service.ts    10s telemetry loop and incident orchestration
│   │   │   ├── gemini.service.ts       RCA generation + SRE Copilot
│   │   │   ├── firestore.service.ts    Incidents, recovery, activities, scenarios
│   │   │   ├── bigquery.service.ts     Baselines and risk forecast history
│   │   │   ├── pubsub.service.ts       Event publishing with schema mapping
│   │   │   └── slack.service.ts        Block Kit incident and recovery cards
│   │   ├── utils/{errors,logger}.ts
│   │   └── server.ts                   Bootstrap, routes, error handling, shutdown
│   ├── tests/                          73 Vitest specs across routes, services, config
│   ├── Dockerfile
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── api/client.ts               Typed fetch client, base-URL auto-detection
│   │   ├── components/
│   │   │   ├── IntegrationCard.tsx      Pipeline card with metrics + risk badge
│   │   │   ├── TelemetryCharts.tsx      Latency and error-rate trajectories
│   │   │   ├── IncidentCard.tsx         Severity, RCA, metrics snapshot
│   │   │   ├── RecoveryPanel.tsx        Playbooks with approve/reject
│   │   │   ├── SimulationControls.tsx   Scenario injection bar
│   │   │   ├── AgentActivityFeed.tsx    Multi-agent reasoning stream
│   │   │   ├── SreCopilotDrawer.tsx     Gemini chat drawer
│   │   │   ├── AddIntegrationModal.tsx  Multi-cloud connector onboarding
│   │   │   └── SlackConfigModal.tsx     Webhook configuration
│   │   ├── hooks/{useIntegrations,useIncidents}.ts
│   │   ├── types/index.ts              Shared types mirroring backend models
│   │   └── App.tsx                     Dashboard shell, brand SVG, error boundary
│   └── package.json
├── sql/schemas/
│   ├── integration_events.sql          Partitioned + clustered telemetry table
│   └── failure_probability.sql         Risk forecast history table
├── infrastructure/                     GCP provisioning scripts
├── docs/                               Architecture, API, setup, IAM, decisions
├── architecture/                       Diagram sources (.drawio)
├── firebase.json                       Hosting config + /api Cloud Run rewrite
└── README.md
```

---

## API Reference

All routes are mounted twice — at the root and under `/api` — so the same service works behind a Firebase Hosting rewrite and as a direct Cloud Run target.

### Health

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Liveness probe. Returns `{ status, service, environment }`. |

### Integrations

| Method | Path | Description |
|---|---|---|
| `GET` | `/integrations` | All monitored pipelines with live status, metrics, baselines, and predictive risk. |
| `POST` | `/integrations` | Register a custom connector. Returns `201` with the provisioned ingestion endpoint. |
| `GET` | `/integrations/:id` | Detail for one pipeline. `404` if unknown. |
| `GET` | `/integrations/:id/health` | Status, risk score, risk level, last update. |

<details>
<summary><b>POST /integrations — request and response</b></summary>

```jsonc
// Request
{
  "name": "Global E-Commerce Inventory Stream",  // required
  "sourceSystem": "AWS Kinesis Data Firehose",   // required
  "targetSystem": "SAP S/4HANA Database",        // required
  "cloudProvider": "aws",                        // gcp | aws | azure | custom
  "protocol": "Kinesis Data Firehose",
  "latencyBaselineMs": 250,
  "errorRateBaseline": 0.01
}

// Response 201
{
  "message": "Custom connector registered successfully.",
  "integrationId": "global-e-commerce-inventory-stream",
  "endpointUrl": "https://…/api/telemetry/ingest?integrationId=global-e-commerce-inventory-stream",
  "config": { /* full resolved connector configuration */ }
}
```

Missing `name`, `sourceSystem`, or `targetSystem` returns `400`.
</details>

### Incidents

| Method | Path | Description |
|---|---|---|
| `GET` | `/incidents` | All incidents. Optional `?status=active` or `?status=resolved`. |
| `GET` | `/incidents/:id` | Full incident with metrics snapshot and RCA. |

### Risk

| Method | Path | Description |
|---|---|---|
| `GET` | `/risk` | Latest failure probability per integration with contributing factors. |

### Recovery

| Method | Path | Description |
|---|---|---|
| `GET` | `/recovery/:id` | Recovery action detail. |
| `POST` | `/recovery/:id/approve` | Approve and execute. Resolves incidents, resets scenario, logs the RecoveryAgent activity, dispatches Slack. Body: `{ "operatorId": "…" }` (optional). |
| `POST` | `/recovery/:id/reject` | Record rejection. Nothing executes. |

### Simulation

| Method | Path | Description |
|---|---|---|
| `POST` | `/simulate` | Inject a scenario. Body: `{ "scenario": "normal\|degradation\|incident\|cascading", "integrationId": "…" }`. Omit `integrationId` to apply estate-wide. |

### Copilot

| Method | Path | Description |
|---|---|---|
| `GET` | `/copilot/chat` | Informational — confirms the Copilot is online. |
| `POST` | `/copilot/chat` | Ask the SRE Copilot. Body: `{ "question": "…", "userLocalTime": "…" }`. |
| `GET` | `/copilot/activities` | 30 most recent agent activities, newest first. |

### Slack

| Method | Path | Description |
|---|---|---|
| `POST` | `/slack/config` | Set the runtime webhook URL. Body: `{ "webhookUrl": "…" }`. |
| `POST` | `/slack/test` | Dispatch a sample incident diagnostic card. Optional `webhookUrl` override. |

### Error format

Every error returns a consistent envelope, with 5xx logged at `error` and 4xx at `warn`:

```json
{ "statusCode": 404, "error": "NotFoundError", "message": "Integration foo not found" }
```

---

## Data Model

### BigQuery — `integrisense_ds.integration_events`

Partitioned by `DATE(timestamp)` with a 365-day expiry, clustered on `integration_id` and `status`.

`event_id`, `integration_id`, `integration_name`, `source_system`, `target_system`, `event_type`, `status`, `http_status_code`, `latency_ms`, `retry_count`, `payload_size_kb`, `error_code`, `error_message`, `queue_depth`, `dlq_count`, `region`, `environment`, `scenario`, `timestamp`, `ingestion_time`.

### BigQuery — `integrisense_ds.failure_probability`

Append-only risk forecast history: `integration_id`, `integration_name`, `risk_score`, `risk_level`, `predicted_failure_window_hours`, `confidence`, `contributing_factors` (JSON), `last_updated`. The latest row per integration is resolved with a `MAX(last_updated)` self-join.

### Firestore collections

| Collection | Contents |
|---|---|
| `incidents` | Incident documents keyed by ID, including metrics snapshot and Gemini root cause |
| `recovery_actions` | Playbooks with approval status, operator ID, and decision timestamp |
| `agent_activities` | Timestamped agent reasoning trace, queried per incident |
| `scenarios` | Active simulation scenario per integration, so state survives instance restarts |

### Core TypeScript interfaces

Backend models in `backend/src/models/` are mirrored in `frontend/src/types/index.ts`, giving end-to-end type safety across the API boundary: `Integration`, `IntegrationEvent`, `PredictiveRisk`, `Incident`, `MetricsSnapshot`, `RootCauseAnalysis`, `RecoveryAction`, `AgentActivity`, `FailureProbability`, `TelemetryPoint`.

---

## Configuration

Backend environment variables, validated by Zod at startup. The process exits with a clear error if any value is malformed — no silent misconfiguration.

| Variable | Default | Description |
|---|---|---|
| `NODE_ENV` | `development` | `development` \| `staging` \| `production` \| `test` |
| `PORT` | `8080` | Cloud Run injects this |
| `LOG_LEVEL` | `info` | `trace` → `fatal` |
| `GCP_PROJECT_ID` | `integrisense-ai-2026` | Google Cloud project |
| `GCP_REGION` | `us-central1` | Deployment region |
| `BIGQUERY_DATASET` | `integrisense_ds` | Analytics dataset |
| `PUBSUB_TOPIC_INTEGRATION_EVENTS` | `integration-events` | Telemetry topic |
| `PUBSUB_SUBSCRIPTION_BQ` | `integration-events-bq-sub` | BigQuery subscription |
| `FIRESTORE_DATABASE` | `(default)` | Firestore database ID |
| `GEMINI_API_KEY` | — | Optional; deterministic fallback used when absent |
| `CORS_ORIGIN` | `http://localhost:5173` | Allowed origin in production |
| `SLACK_WEBHOOK_URL` | — | Optional default webhook |
| `ENABLE_AGENTS` | `false` | Feature flag |
| `ENABLE_BIGQUERY` | `false` | Cloud BigQuery vs. mock baselines |
| `ENABLE_PUBSUB` | `false` | Cloud Pub/Sub vs. in-memory events |
| `ENABLE_FIRESTORE` | `false` | Cloud Firestore vs. in-memory store |

Frontend: `VITE_API_BASE_URL` — leave unset in production so the client uses the relative `/api` path served by the Firebase Hosting rewrite.

> **Secrets:** `.env`, `*.env`, and `ca.pem` are gitignored. Only `.env.example` files are tracked. Production credentials belong in Google Cloud Secret Manager, not in the repository.

---

## Local Development

**Prerequisites:** Node.js ≥ 22, npm ≥ 10. No GCP account required — the platform runs fully offline.

```bash
# Clone
git clone https://github.com/swathisahukara/IntegriSense_AI.git
cd IntegriSense_AI

# Backend
cd backend
cp .env.example .env          # defaults work as-is; add GEMINI_API_KEY for live RCA
npm install
npm run dev                   # http://localhost:8080

# Frontend (new terminal)
cd ../frontend
cp .env.example .env          # set VITE_API_BASE_URL=http://localhost:8080
npm install
npm run dev                   # http://localhost:5173
```

Verify the API: `curl http://localhost:8080/health` → `{"status":"healthy","service":"integrisense-api","environment":"development"}`

The synthetic telemetry generator starts automatically in any non-production environment and begins ticking every 10 seconds. Inject a scenario from the UI, or directly:

```bash
curl -X POST http://localhost:8080/simulate \
  -H 'Content-Type: application/json' \
  -d '{"scenario":"incident"}'
```

### Available scripts

| Backend | Frontend |
|---|---|
| `npm run dev` — tsx watch mode | `npm run dev` — Vite dev server |
| `npm run build` — tsc compile | `npm run build` — `tsc -b && vite build` |
| `npm start` — run compiled output | `npm run preview` — serve the build |
| `npm test` — Vitest run | `npm run lint` — oxlint |
| `npm run test:coverage` — V8 coverage | |
| `npm run typecheck` — `tsc --noEmit` | |
| `npm run lint` / `npm run format` | |

---

## Testing

```bash
cd backend && npm test
```

**73 / 73 passing.** The suite runs entirely offline against the in-memory service fallbacks, so it is deterministic and requires no cloud credentials.

| Suite | Specs | Coverage |
|---|---|---|
| `config/env.test.ts` | 12 | Zod schema validation, defaults, coercion, invalid-value rejection |
| `services/anomaly.service.test.ts` | 9 | Rolling mean, Bessel-corrected σ, z-score, threshold detection, weighted risk scoring |
| `services/firestore.service.test.ts` | 8 | Incident CRUD, recovery decisions, activity logging, not-found paths |
| `routes/health.test.ts` | 8 | Probe contract and response schema |
| `routes/incidents.test.ts` | 6 | Listing, status filtering, detail retrieval |
| `routes/recovery.test.ts` | 6 | Approve, reject, operator attribution |
| `services/bigquery.service.test.ts` | 5 | Baseline queries, forecast insert and retrieval, mock fallback |
| `services/generator.service.test.ts` | 5 | Tick loop, scenario application, incident creation and resolution |
| `routes/integrations.test.ts` | 5 | Listing, registration validation, detail, health |
| `routes/simulation.test.ts` | 5 | Scenario validation, targeted vs. estate-wide application |
| `services/pubsub.service.test.ts` | 3 | Publish, snake_case schema mapping, mock accessors |
| `routes/risk.test.ts` | 1 | Forecast endpoint contract |

Frontend build verification: `cd frontend && npm run build` compiles with zero TypeScript errors.

---

## Deployment

### Backend → Cloud Run

```bash
cd backend
gcloud run deploy integrisense-api \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars NODE_ENV=production,ENABLE_BIGQUERY=true,ENABLE_PUBSUB=true \
  --set-secrets GEMINI_API_KEY=gemini-api-key:latest
```

The service is Cloud Run-ready by construction: it binds `0.0.0.0` (not localhost), reads the injected `PORT`, and handles `SIGTERM` by stopping the generator loop and closing Fastify gracefully before exit.

### Frontend → Firebase Hosting

```bash
cd frontend && npm run build
cd .. && firebase deploy --only hosting
```

`firebase.json` rewrites `/api/**` to the `integrisense-api` Cloud Run service in `us-central1`, applies immutable one-year caching to hashed JS and CSS assets, sets `X-Content-Type-Options: nosniff` and `X-Frame-Options: DENY`, and falls back to `index.html` for SPA routing.

### Infrastructure provisioning

`infrastructure/setup.sh` and `setup.ps1` provision the Pub/Sub topic and BigQuery subscription, create the dataset, apply both table schemas from `sql/schemas/`, and configure service-account IAM bindings. See `docs/GCP_SETUP.md` and `docs/IAM.md`.

---

## Engineering Decisions

**Fastify over Express.** Native async/await, built-in JSON schema serialisation, first-class TypeScript types, and meaningfully lower overhead per request — which matters on Cloud Run where you pay for CPU time.

**Zod validation at startup, not at first use.** A malformed `PORT` should crash the container immediately with a readable message, not surface as a mysterious bind failure twenty minutes into an incident.

**Statistics in code, narrative in the model.** Asking an LLM to compute a z-score is both slower and less trustworthy than computing it. Gemini receives the numbers as evidence and produces the explanation. This keeps risk scores reproducible and testable, and it is why `anomaly.service.ts` has the densest test coverage in the repository.

**Feature-flagged cloud services with real fallbacks.** Every cloud dependency has a working in-memory implementation behind a flag. This is not a stub — the full incident lifecycle runs offline. The benefit is a hermetic test suite, instant local onboarding, and graceful degradation if a GCP service is unavailable in production.

**Human-in-the-loop by default.** The platform is capable of executing remediation autonomously; it deliberately does not. Auto-resolution is limited to closing incidents whose telemetry has already returned to baseline, because that action cannot cause harm.

**Polling over WebSockets.** Cloud Run scales to zero and does not hold long-lived connections cheaply. A 10-second TanStack Query poll matches the generator tick exactly, costs nothing in connection management, and reconnects transparently. Server-sent events are the natural upgrade if the tick interval ever drops below a second.

**Routes mounted at both `/` and `/api`.** The same container serves correctly whether it is hit directly as a Cloud Run URL or through the Firebase Hosting rewrite, with no environment-specific routing logic.

**Inline styles over a CSS framework.** The dashboard is a single cohesive design system with fewer than a dozen components. Inline styles keep each component's visual contract co-located with its logic and avoid shipping an entire utility framework for a fixed dark palette.

---

## Roadmap

| Area | Next step |
|---|---|
| **Forecasting** | Train a BigQuery ML `ARIMA_PLUS` model on accumulated `integration_events` history to replace heuristic time-to-failure with a fitted forecast and genuine confidence intervals |
| **Agents** | Promote the logical agent roles into orchestrated Google ADK agents with explicit tool calls, so the reasoning trace is generated rather than logged |
| **Ingestion** | Implement the provisioned `/api/telemetry/ingest` endpoint for real OTLP payloads, HMAC-signed webhooks, and bearer-token auth |
| **Slack** | Move from Incoming Webhooks to a Slack app with interactive endpoints, so the self-healing button executes remediation directly from Slack |
| **Auth** | Firebase Authentication with per-operator identity, replacing the default `operator-1` attribution on approvals |
| **Transport** | Server-sent events for sub-second telemetry once the tick interval tightens |
| **Blast radius** | Model explicit pipeline dependency edges to compute true downstream impact rather than inferring it |

---

## Project Milestones

| Milestone | Date | Status |
|---|---|---|
| Build start | Aug 15, 2026 | ✅ Complete |
| Checkpoint 1 | Aug 20, 2026 | ✅ Complete |
| Checkpoint 2 | Sep 3, 2026 | ✅ Complete |
| Final checkpoint (Touchpoint 3) | Sep 9, 2026 | ✅ Complete |
| Submission lock | Sep 11, 2026 | 🔒 Submitted |
| Shortlist announcement | Sep 15, 2026 | ⏳ Pending |
| Grand finale | Sep 24, 2026 | 📅 Upcoming |

**Delivery status:** 73/73 backend tests passing · frontend building with zero TypeScript errors · API live on Cloud Run · dashboard live on Firebase Hosting.

---


Built for **Patchamomma 2026** by [@swathisahukara](https://github.com/swathisahukara).

<div align="center">

**[Live Demo](https://integrisense-ai.web.app)** · **[Source](https://github.com/swathisahukara/IntegriSense_AI)** · **[Architecture](docs/ARCHITECTURE.md)** · **[API Docs](docs/API.md)**

</div>
