# IntegriSense AI — Architecture

## Problem

Enterprise integration landscapes are complex, fragile, and opaque. When a Salesforce → CRM sync degrades or a SAP → Data Platform pipeline fails, the impact ripples across the business — lost orders, stale data, broken workflows, and frustrated end users.

Traditional monitoring answers one question: *"Is it broken?"*

It cannot tell you:
- **When** it will break before it does
- **Why** it broke (root cause, not symptoms)
- **What** else will be affected
- **How** to fix it safely

---

## Solution

IntegriSense AI is an **agentic observability platform** that transforms integration operations from reactive firefighting to proactive, AI-assisted management.

The core loop:

```
DETECT → PREDICT → INVESTIGATE → EXPLAIN → SIMULATE → RECOMMEND → HUMAN APPROVAL → RECOVER → LEARN
```

---

## Architecture

### High-Level Diagram

```
┌─────────────────────────────────────────────────────┐
│                  React Dashboard                    │
│         (Firebase Hosting · TypeScript · Vite)      │
└───────────────────────┬─────────────────────────────┘
                        │ HTTPS
┌───────────────────────▼─────────────────────────────┐
│               Fastify API (Node.js)                 │
│                  Cloud Run · Port 8080              │
└───────────────────────┬─────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────┐
│             ADK Orchestrator Agent                  │
│                                                     │
│  ┌───────────┐ ┌──────────┐ ┌──────────┐ ┌───────┐ │
│  │  Monitor  │ │   RCA    │ │Prediction│ │Recov- │ │
│  │  Agent   │ │  Agent   │ │  Agent   │ │ery    │ │
│  └─────┬─────┘ └────┬─────┘ └─────┬────┘ └───┬───┘ │
│        └────────────┴─────────────┴───────────┘     │
│                      │ Gemini 2.5 Pro / Flash        │
└──────────────────────┼──────────────────────────────┘
                       │
        ┌──────────────┴─────────────────┐
        │                                │
┌───────▼───────┐              ┌─────────▼────────┐
│   BigQuery    │              │    Firestore      │
│ integrisense  │              │  incidents        │
│   _ds         │              │  approvals        │
│               │              │  agent_activity   │
│ integration   │              └──────────────────-┘
│ _events       │
│ failure_prob  │
└───────▲───────┘
        │ Native BQ Subscription
┌───────┴───────┐
│    Pub/Sub    │
│  integration  │
│  -events      │
└───────▲───────┘
        │
┌───────┴───────┐
│ Data Generator│
│ (Synthetic    │
│  Telemetry)   │
└───────────────┘
```

---

## Data Architecture

### BigQuery Dataset: `integrisense_ds`

#### Table: `integration_events`
Partitioned by `timestamp`, clustered by `integration_id`, `status`.

| Column | Type | Description |
|--------|------|-------------|
| event_id | STRING | Unique event identifier |
| integration_id | STRING | Integration pipeline identifier |
| integration_name | STRING | Human-readable name |
| source_system | STRING | Source system (e.g., Salesforce) |
| target_system | STRING | Target system (e.g., Dynamics CRM) |
| event_type | STRING | Event classification |
| status | STRING | success / failure / timeout / retry |
| http_status_code | INTEGER | HTTP response code |
| latency_ms | INTEGER | End-to-end latency in milliseconds |
| retry_count | INTEGER | Number of retries attempted |
| payload_size_kb | FLOAT | Payload size in kilobytes |
| error_code | STRING | Error code if applicable |
| error_message | STRING | Error description |
| queue_depth | INTEGER | Current queue depth |
| dlq_count | INTEGER | Dead letter queue count |
| region | STRING | GCP region |
| environment | STRING | dev / staging / prod |
| scenario | STRING | Scenario tag for demo |
| timestamp | TIMESTAMP | Event timestamp (partition key) |
| ingestion_time | TIMESTAMP | BigQuery ingestion time |

#### Table: `failure_probability`

| Column | Type | Description |
|--------|------|-------------|
| integration_id | STRING | Integration identifier |
| integration_name | STRING | Human-readable name |
| risk_score | FLOAT | 0.0–1.0 risk score |
| risk_level | STRING | LOW / MEDIUM / HIGH / CRITICAL |
| predicted_failure_window_hours | INTEGER | Hours until predicted failure |
| confidence | FLOAT | 0.0–1.0 confidence in prediction |
| contributing_factors | JSON | Factors driving the risk score |
| last_updated | TIMESTAMP | When this record was last updated |

---

## Agentic Architecture

### Agent Responsibilities

```
MONITOR AGENT
└── Detects: anomalies, latency spikes, error rate increases,
            retry storms, queue growth, DLQ accumulation

PREDICTION AGENT
└── Estimates: failure probability, failure window,
              affected systems, blast radius

RCA AGENT
└── Investigates: telemetry history, error patterns,
                 dependencies, contributing factors
└── Produces: root cause, evidence, confidence score

RECOVERY AGENT
└── Recommends: recovery playbook, expected impact,
               risk assessment, rollback considerations
└── REQUIRES: human approval before execution

ORCHESTRATOR
└── Coordinates: Monitor → Prediction → RCA → Recovery → Approval
```

### Anomaly Detection (Deterministic)

Numerical risk scores are **never** produced by Gemini. The calculation pipeline is deterministic:

```
Telemetry data
    ↓
calculateRollingMean()
calculateStandardDeviation()
calculateZScore()
detectAnomaly()
calculateRiskScore()
    ↓
Risk Score = 0.87 (example)
    ↓
Gemini explains:
"Latency has increased by 340% above the 24h rolling baseline.
 Retry volume has increased 8x. Queue depth has exceeded the
 historical 99th percentile threshold."
```

Gemini **never invents** numbers. It **only interprets** numbers produced by deterministic code.

---

## Human-in-the-Loop Design

```
Recovery Recommendation
        ↓
Risk Evaluation
        ↓
Human Approval Request (Firestore: approvals collection)
       ↙        ↘
  Approve       Reject
     ↓             ↓
  Proceed        Stop
  (simulated     (incident
   in MVP)        logged)
```

No autonomous destructive actions are ever taken.

---

## GCP Services

| Service | Purpose | Azure Equivalent |
|---------|---------|-----------------|
| BigQuery | Integration telemetry warehouse | Azure Synapse Analytics |
| Pub/Sub | Real-time event streaming | Azure Service Bus / Event Hub |
| Cloud Run | Serverless API hosting | Azure Container Apps |
| Firestore | Operational data (incidents, approvals) | Azure Cosmos DB |
| Firebase Hosting | Frontend static hosting | Azure Static Web Apps |
| Firebase Auth | User authentication | Azure AD B2C |
| Secret Manager | Credentials management | Azure Key Vault |
| Artifact Registry | Container image registry | Azure Container Registry |
| Cloud Build | CI/CD pipeline | Azure DevOps Pipelines |

---

## Security

- Service account keys are **never** committed or deployed as files
- Cloud Run uses **Workload Identity** / attached service accounts
- All secrets in **Secret Manager** for deployed environments
- `.env` only for local development (gitignored)
- Least-privilege IAM roles
- CORS restricted to known origins in production

---

## Cost Strategy

- Cloud Run: `minInstances=0` (scales to zero when idle)
- BigQuery: partitioned + clustered tables to minimize scan costs
- Pub/Sub: native BigQuery subscription (no Dataflow overhead)
- Gemini: Flash for frequent/lightweight calls, Pro for RCA/reasoning
- Budget alert: $50 (50% and 90% threshold notifications)

---

## Future Roadmap

- Real monitoring connectors (Azure Integration Services, MuleSoft, etc.)
- Real autonomous recovery with graduated trust levels
- Confidence calibration and model evaluation
- Multi-tenancy
- Learning from recovery outcomes (feedback loop to agents)
- Blast radius visualization
- Predictive failure timeline
