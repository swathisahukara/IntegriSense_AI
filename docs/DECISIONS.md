# Architecture Decision Records (ADR)

This document records the architectural and design decisions made for the IntegriSense AI platform, including the rationale, alternatives considered, and implications.

---

## ADR 1: Choose Cloud Run instead of Google Kubernetes Engine (GKE)

### Context:
We need a hosting environment to deploy our Fastify Node.js/TypeScript backend API. The API will handle HTTP routing, call Vertex AI models, communicate with Firestore, and query BigQuery. It will initially run on synthetic event streams during the Patchamomma hackathon.

### Decision:
Use **Google Cloud Run** for serverless container hosting instead of Google Kubernetes Engine (GKE).

### Rationale:
1.  **Cost:** GKE has a cluster management fee ($0.10/hour, approx. $73/month) plus the cost of running VM worker nodes 24/7. This would quickly consume our $300 trial credits. Cloud Run is serverless and scales to zero, meaning we pay $0.00 when the app is idle.
2.  **Complexity:** GKE requires managing Kubernetes manifests, ingress controllers, node pools, and complex networking. Cloud Run allows us to deploy a container image in a single command, automatically managing SSL certificates, DNS, load balancing, and scaling.
3.  **Timeline:** We have a tight hackathon schedule. Minimizing infrastructure management overhead lets us focus on the agentic AI logic and synthetic pipelines.

### Implications:
*   We must design the Fastify app to handle graceful shutdowns (SIGTERM) because serverless instances are ephemeral.
*   Cold starts: Scaling to zero means the first request after an idle period may take 1-3 seconds to respond. This is acceptable for our MVP dashboard.

---

## ADR 2: Select `us-central1` (Iowa) as Primary GCP Region

### Context:
GCP is regionalized. We need to choose a region to deploy all core components (BigQuery, Pub/Sub, Cloud Run, Firestore, Vertex AI). The developer is based in India.

### Decision:
Select **`us-central1` (Iowa, USA)** as our primary deployment region.

### Rationale:
1.  **Feature Access:** Vertex AI Gemini 2.5 Pro and Flash model endpoints, along with advanced agents features, are always deployed and updated first in US regions.
2.  **Cost:** Compute and storage are Tier 1 (cheapest) in `us-central1`. India regions (`asia-south1`) are 15-30% more expensive.
3.  **Free Tier:** Standard GCP Free Tier quotas (2 million Cloud Run requests, 1 GB Firestore storage) are strictly limited to US regions.
4.  **Consistency:** Deploying everything in the same region prevents inter-region network egress charges.

### Implications:
*   We will experience ~150-200ms of latency when communicating with our deployed APIs from India. This is completely acceptable for demo purposes.

---

## ADR 3: Store State in Firestore, Telemetry in BigQuery

### Context:
We have two database requirements:
1.  High-volume transactional event logs (telemetry data).
2.  Operational state (incidents tracker, approval workflows, agent audit logs).

### Decision:
*   Use **BigQuery** to warehouse all incoming integration telemetry events.
*   Use **Firestore** to store incident logs, human-in-the-loop approvals, and agent activities.

### Rationale:
*   **BigQuery** is an analytical column-oriented warehouse designed to scan billions of rows for anomalies and aggregated baselines. It is not suitable for transactional locking, quick point-reads, or key-value updates.
*   **Firestore** is a document database that provides low-latency transactional reads/writes and real-time listeners. It is ideal for orchestrating agent activity and human-in-the-loop state changes, but it is not optimized for analytical aggregations.

### Implications:
*   Our backend must implement client connections to both databases.
*   We will stream telemetry directly to BigQuery using Pub/Sub's native subscription, bypassing any backend storage layers.
