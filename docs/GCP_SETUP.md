# Google Cloud Platform (GCP) Setup Guide

This document tracks the configuration details, credentials, and settings for the IntegriSense AI GCP environment.

---

## 1. Project Information

*   **Project Name:** `IntegriSense AI`
*   **Project ID:** `integrisense-ai-2026`
*   **Default Region:** `us-central1` (Iowa, USA)
*   **Billing Account:** Linked to Free Trial (INR currency, ₹28,694 promotional credits)

---

## 2. Cost Control & Budgets

We have configured a monthly budget to prevent unexpected resource charges.

*   **Budget Name:** `integrisense-budget-alert`
*   **Scope:** Project `integrisense-ai-2026` (All Services)
*   **Amount:** ₹4,200 (approx. $50 USD)
*   **Alert Thresholds:**
    *   **50%** (₹2,100 spend) -> Email alert to billing admins
    *   **90%** (₹3,780 spend) -> Email alert to billing admins
    *   **100%** (₹4,200 spend) -> Email alert to billing admins

---

## 3. Enabled APIs

The following GCP resource APIs have been enabled in the project:

*   `run.googleapis.com` — Cloud Run Admin API (Serverless hosting)
*   `cloudbuild.googleapis.com` — Cloud Build API (CI/CD image compilation)
*   `artifactregistry.googleapis.com` — Artifact Registry API (Docker image registry)
*   `bigquery.googleapis.com` — BigQuery API (Telemetry database)
*   `pubsub.googleapis.com` — Pub/Sub API (Event-driven message broker)
*   `firestore.googleapis.com` — Firestore API (Operational state database)
*   `secretmanager.googleapis.com` — Secret Manager API (Secure credentials vault)
*   `aiplatform.googleapis.com` — Vertex AI API (Gemini generative models)

---

## 4. Service Account Details

We created a dedicated service account to act as the identity for the deployed Cloud Run instances.

*   **Name:** `IntegriSense Runtime`
*   **ID:** `integrisense-runtime`
*   **Email:** `integrisense-runtime@integrisense-ai-2026.iam.gserviceaccount.com`
*   **Permissions:** Restricted via least privilege (defined in `docs/IAM.md`).

---

## 5. Local Developer Authentication (CLI & SDK)

Because our local machine sits behind a corporate SSL-decrypting proxy, we configured custom CLI overrides to prevent connection failures.

### Local Settings:
1.  **SSL Verification Bypass:**
    ```bash
    gcloud config set auth/disable_ssl_validation True
    ```
    *Note: This instructs Python/gcloud CLI to bypass certificate validation during local login/requests.*

2.  **CLI Active Credentials:**
    ```bash
    gcloud auth login
    ```
    *Authenticates developer profile (saiswathisahukara@gmail.com) for CLI tools (`gcloud`, `bq`, `gsutil`).*

3.  **Application Default Credentials (ADC):**
    ```bash
    gcloud auth application-default login
    ```
    *Generates local token JSON file for Node.js client libraries.*

4.  **Local Quota Allocation:**
    ```bash
    gcloud auth application-default set-quota-project integrisense-ai-2026
    ```
    *Binds local SDK API requests directly to our project billing account.*
