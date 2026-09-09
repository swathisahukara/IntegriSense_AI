# IntegriSense AI — IAM Roles and Permissions

This document tracks the IAM (Identity and Access Management) configuration for the IntegriSense AI platform. 
We strictly adhere to the principle of least privilege, ensuring that every service identity is granted only the permissions necessary to perform its function.

---

## Service Account: `integrisense-runtime`

*   **Email:** `integrisense-runtime@integrisense-ai-2026.iam.gserviceaccount.com`
*   **Purpose:** The runtime identity for the Cloud Run backend application. It authorizes requests made by our Node.js client libraries to operational and analytical databases, queues, and Vertex AI.

### Assigned Roles Matrix

| Role Title | GCP Role ID | Scope | Purpose | Risk Profile |
|:---|:---|:---|:---|:---|
| **BigQuery Data Editor** | `roles/bigquery.dataEditor` | Project | Allows backend to read and write telemetry data inside BigQuery tables. | 🟡 **Medium**: Can write/modify telemetry data. Cannot delete BigQuery datasets. |
| **BigQuery Job User** | `roles/bigquery.jobUser` | Project | Allows the backend to run query jobs to analyze data trends. | 🟢 **Low**: Standard query execution permissions. |
| **Pub/Sub Publisher** | `roles/pubsub.publisher` | Project | Allows the synthetic data generator or backend to publish events to Pub/Sub queues. | 🟢 **Low**: Write-only queue access. |
| **Cloud Datastore User** | `roles/datastore.user` | Project | Grants full read/write access to Firestore to manage incidents and approvals. | 🟡 **Medium**: Manages operational state and incident lifecycles. |
| **Vertex AI User** | `roles/aiplatform.user` | Project | Allows backend to call Gemini models (Pro/Flash) for predictions and RCA. | 🟢 **Low**: Permission to execute model inferences. |
| **Secret Manager Secret Accessor** | `roles/secretmanager.secretAccessor` | Project | Allows backend to retrieve credentials (like Gemini API keys) during startup. | 🔴 **High**: Grants access to plaintext secret values. Must be monitored. |

---

## Local Development Authentication (Application Default Credentials)

For local development, client libraries run using your user credential context verified via:
```bash
gcloud auth application-default login
```
This writes a local credentials file to `%APPDATA%/gcloud/application_default_credentials.json` which inherits the developer's user permissions. 

For the Node.js application to run locally:
*   Your user account (`saiswathisahukara@gmail.com`) automatically has sufficient permissions (usually Owner or Editor) to bypass strict service account boundaries locally.
*   The quota project must be set to charge billing against the project:
    ```bash
    gcloud auth application-default set-quota-project integrisense-ai-2026
    ```
