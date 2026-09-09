#!/usr/bin/env bash
# =============================================================================
# IntegriSense AI — GCP Infrastructure Setup Script
# =============================================================================
# Idempotent resource provisioning script for Google Cloud Platform.
# Provisions:
#   - Artifact Registry (Docker repo)
#   - Firestore (Native database instance)
#   - BigQuery (Dataset + partitioned/clustered tables)
#   - Pub/Sub (Topic + native BigQuery ingestion subscription)
#   - IAM Service Account & Role Bindings
# =============================================================================

# Exit immediately if a pipeline returns a non-zero status, except in conditionals
set -eo pipefail

# Export environment variable for resource attribution
export CLOUDSDK_METRICS_ENVIRONMENT="datacloud.antigravity"

# ANSI color codes for execution output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configurable variables (defaults aligned with GCP Setup Guide)
PROJECT_ID=${1:-"integrisense-ai-2026"}
REGION=${2:-"us-central1"}
SERVICE_ACCOUNT_NAME="integrisense-runtime"
DATASET_ID="integrisense_ds"
PUB_SUB_TOPIC="integration-events"
PUB_SUB_SUB="integration-events-bq-sub"
ARTIFACT_REGISTRY_REPO="integrisense-repo"

echo -e "${BLUE}=====================================================================${NC}"
echo -e "${BLUE}             INTEGRISENSE AI — GCP INFRASTRUCTURE SETUP              ${NC}"
echo -e "${BLUE}=====================================================================${NC}"
echo -e "Target Project ID : ${YELLOW}${PROJECT_ID}${NC}"
echo -e "Target Region     : ${YELLOW}${REGION}${NC}"

# ── 1. Set Active Project context ─────────────────────────────────────────────
echo -e "\n${BLUE}[Step 1/7] Setting gcloud project context...${NC}"
CURRENT_PROJECT=$(gcloud config get-value project 2>/dev/null || true)
if [ "$CURRENT_PROJECT" != "$PROJECT_ID" ]; then
  echo -e "Current context is '${CURRENT_PROJECT}'. Switching to '${PROJECT_ID}'..."
  gcloud config set project "$PROJECT_ID"
else
  echo -e "${GREEN}✓ Project context is already set to ${PROJECT_ID}.${NC}"
fi

# ── 2. Enable Required APIs ───────────────────────────────────────────────────
echo -e "\n${BLUE}[Step 2/7] Enabling required GCP APIs...${NC}"
APIS=(
  "run.googleapis.com"
  "cloudbuild.googleapis.com"
  "artifactregistry.googleapis.com"
  "bigquery.googleapis.com"
  "pubsub.googleapis.com"
  "firestore.googleapis.com"
  "secretmanager.googleapis.com"
  "aiplatform.googleapis.com"
)
for API in "${APIS[@]}"; do
  echo -e "Enabling API: ${YELLOW}${API}${NC}..."
  gcloud services enable "$API"
done
echo -e "${GREEN}✓ All core APIs successfully enabled.${NC}"

# ── 3. Provision Artifact Registry ────────────────────────────────────────────
echo -e "\n${BLUE}[Step 3/7] Provisioning Artifact Registry repository...${NC}"
if ! gcloud artifacts repositories describe "$ARTIFACT_REGISTRY_REPO" --location="$REGION" &>/dev/null; then
  echo -e "Repository '${ARTIFACT_REGISTRY_REPO}' not found. Creating..."
  gcloud artifacts repositories create "$ARTIFACT_REGISTRY_REPO" \
    --repository-format=docker \
    --location="$REGION" \
    --description="Docker repository for IntegriSense AI backend services"
  echo -e "${GREEN}✓ Artifact Registry repo created successfully.${NC}"
else
  echo -e "${GREEN}✓ Artifact Registry repository '${ARTIFACT_REGISTRY_REPO}' already exists.${NC}"
fi

# ── 4. Provision Firestore Native Database ────────────────────────────────────
echo -e "\n${BLUE}[Step 4/7] Provisioning Firestore native database...${NC}"
# Check if (default) database exists in Firestore list
if ! gcloud firestore databases list --project="$PROJECT_ID" 2>/dev/null | grep -q "\(default\)"; then
  echo -e "Firestore database '(default)' not found. Creating in native mode..."
  # Note: default database ID in firestore must be (default)
  gcloud firestore databases create --location="$REGION" --type=firestore-native
  echo -e "${GREEN}✓ Firestore Native database created successfully.${NC}"
else
  echo -e "${GREEN}✓ Firestore Native database already exists.${NC}"
fi

# ── 5. Create BigQuery Schema ─────────────────────────────────────────────────
echo -e "\n${BLUE}[Step 5/7] Provisioning BigQuery dataset and tables...${NC}"
if ! bq show "${PROJECT_ID}:${DATASET_ID}" &>/dev/null; then
  echo -e "Dataset '${DATASET_ID}' not found. Creating..."
  bq mk --dataset --location="$REGION" "${PROJECT_ID}:${DATASET_ID}"
  echo -e "${GREEN}✓ BigQuery dataset '${DATASET_ID}' created successfully.${NC}"
else
  echo -e "${GREEN}✓ BigQuery dataset '${DATASET_ID}' already exists.${NC}"
fi

# Deploy tables using CREATE TABLE IF NOT EXISTS scripts
echo -e "Creating table: ${YELLOW}integration_events${NC}..."
bq query --use_legacy_sql=false --label datacloud=antigravity < sql/schemas/integration_events.sql

echo -e "Creating table: ${YELLOW}failure_probability${NC}..."
bq query --use_legacy_sql=false --label datacloud=antigravity < sql/schemas/failure_probability.sql
echo -e "${GREEN}✓ All BigQuery tables checked/created successfully.${NC}"

# ── 6. Create Pub/Sub Topic and Native BigQuery Subscription ──────────────────
echo -e "\n${BLUE}[Step 6/7] Configuring Pub/Sub queue & direct BigQuery link...${NC}"
if ! gcloud pubsub topics describe "$PUB_SUB_TOPIC" &>/dev/null; then
  echo -e "Pub/Sub topic '${PUB_SUB_TOPIC}' not found. Creating..."
  gcloud pubsub topics create "$PUB_SUB_TOPIC"
  echo -e "${GREEN}✓ Pub/Sub topic '${PUB_SUB_TOPIC}' created.${NC}"
else
  echo -e "${GREEN}✓ Pub/Sub topic '${PUB_SUB_TOPIC}' already exists.${NC}"
fi

# Fetch project number to resolve system service identity
echo -e "Resolving GCP project number..."
PROJECT_NUMBER=$(gcloud projects describe "$PROJECT_ID" --format="value(projectNumber)")
PUBSUB_SERVICE_ACCOUNT="service-${PROJECT_NUMBER}@gcp-sa-pubsub.iam.gserviceaccount.com"

echo -e "Granting BigQuery permissions to Pub/Sub system agent: ${YELLOW}${PUBSUB_SERVICE_ACCOUNT}${NC}"
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:$PUBSUB_SERVICE_ACCOUNT" \
  --role="roles/bigquery.dataEditor" --quiet &>/dev/null

gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:$PUBSUB_SERVICE_ACCOUNT" \
  --role="roles/bigquery.metadataViewer" --quiet &>/dev/null

# Create BigQuery Subscription
if ! gcloud pubsub subscriptions describe "$PUB_SUB_SUB" &>/dev/null; then
  echo -e "BigQuery push subscription '${PUB_SUB_SUB}' not found. Creating..."
  # Map payload properties directly to BigQuery table columns using --use-table-schema
  gcloud pubsub subscriptions create "$PUB_SUB_SUB" \
    --topic="$PUB_SUB_TOPIC" \
    --bigquery-table="${PROJECT_ID}:${DATASET_ID}.integration_events" \
    --use-table-schema \
    --drop-unknown-fields
  echo -e "${GREEN}✓ Native Pub/Sub BigQuery subscription created successfully.${NC}"
else
  echo -e "${GREEN}✓ Native Pub/Sub BigQuery subscription already exists.${NC}"
fi

# ── 7. Configure Runtime IAM Service Account ──────────────────────────────────
echo -e "\n${BLUE}[Step 7/7] Configuring runtime Identity Access Management (IAM)...${NC}"
SERVICE_ACCOUNT_EMAIL="${SERVICE_ACCOUNT_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
if ! gcloud iam service-accounts describe "$SERVICE_ACCOUNT_EMAIL" &>/dev/null; then
  echo -e "Service account '${SERVICE_ACCOUNT_NAME}' not found. Creating..."
  gcloud iam service-accounts create "$SERVICE_ACCOUNT_NAME" \
    --display-name="IntegriSense Runtime Identity" \
    --project="$PROJECT_ID"
  echo -e "${GREEN}✓ Service account '${SERVICE_ACCOUNT_NAME}' created.${NC}"
else
  echo -e "${GREEN}✓ Service account '${SERVICE_ACCOUNT_NAME}' already exists.${NC}"
fi

# Least privilege roles assignment list
ROLES=(
  "roles/bigquery.dataEditor"
  "roles/bigquery.jobUser"
  "roles/pubsub.publisher"
  "roles/datastore.user"
  "roles/aiplatform.user"
  "roles/secretmanager.secretAccessor"
)
echo -e "Assigning roles to service account..."
for ROLE in "${ROLES[@]}"; do
  echo -e "Binding role: ${YELLOW}${ROLE}${NC}..."
  gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" \
    --role="$ROLE" --quiet &>/dev/null
done
echo -e "${GREEN}✓ Service account roles bound successfully.${NC}"

echo -e "\n${GREEN}=====================================================================${NC}"
echo -e "${GREEN}         ✓ INTEGRISENSE AI INFRASTRUCTURE PROVISIONING COMPLETE      ${NC}"
echo -e "${GREEN}=====================================================================${NC}"
