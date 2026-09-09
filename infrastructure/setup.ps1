param (
    [string]$ProjectID = "integrisense-ai-2026",
    [string]$Region = "us-central1"
)

# Set environment variable for resource attribution
$env:CLOUDSDK_METRICS_ENVIRONMENT="datacloud.antigravity"

$ServiceAccountName = "integrisense-runtime"
$DatasetID = "integrisense_ds"
$PubSubTopic = "integration-events"
$PubSubSub = "integration-events-bq-sub"
$ArtifactRegistryRepo = "integrisense-repo"

Write-Host "=====================================================================" -ForegroundColor Blue
Write-Host "             INTEGRISENSE AI - GCP INFRASTRUCTURE SETUP              " -ForegroundColor Blue
Write-Host "=====================================================================" -ForegroundColor Blue
Write-Host "Target Project ID : $ProjectID" -ForegroundColor Yellow
Write-Host "Target Region     : $Region" -ForegroundColor Yellow

# === 1. Set Active Project context ===
Write-Host ""
Write-Host "[Step 1/7] Setting gcloud project context..." -ForegroundColor Blue
$currentProject = (gcloud config get-value project 2>$null)
if ($currentProject -ne $ProjectID) {
    Write-Host "Current context is '$currentProject'. Switching to '$ProjectID'..."
    gcloud config set project $ProjectID
} else {
    Write-Host "+ Project context is already set to $ProjectID." -ForegroundColor Green
}

# === 2. Enable Required APIs ===
Write-Host ""
Write-Host "[Step 2/7] Enabling required GCP APIs..." -ForegroundColor Blue
$apis = @(
    "run.googleapis.com",
    "cloudbuild.googleapis.com",
    "artifactregistry.googleapis.com",
    "bigquery.googleapis.com",
    "pubsub.googleapis.com",
    "firestore.googleapis.com",
    "secretmanager.googleapis.com",
    "aiplatform.googleapis.com"
)
foreach ($api in $apis) {
    Write-Host "Enabling API: $api..." -ForegroundColor Yellow
    gcloud services enable $api
}
Write-Host "+ All core APIs successfully enabled." -ForegroundColor Green

# === 3. Provision Artifact Registry ===
Write-Host ""
Write-Host "[Step 3/7] Provisioning Artifact Registry repository..." -ForegroundColor Blue
$repoExists = (gcloud artifacts repositories describe $ArtifactRegistryRepo --location=$Region 2>$null)
if (-not $repoExists) {
    Write-Host "Repository '$ArtifactRegistryRepo' not found. Creating..." -ForegroundColor Yellow
    gcloud artifacts repositories create $ArtifactRegistryRepo --repository-format=docker --location=$Region --description="Docker repository for IntegriSense AI backend services"
    Write-Host "+ Artifact Registry repo created successfully." -ForegroundColor Green
} else {
    Write-Host "+ Artifact Registry repository '$ArtifactRegistryRepo' already exists." -ForegroundColor Green
}

# === 4. Provision Firestore Native Database ===
Write-Host ""
Write-Host "[Step 4/7] Provisioning Firestore native database..." -ForegroundColor Blue
$databases = (gcloud firestore databases list --project=$ProjectID 2>$null)
if ($databases -notmatch "\(default\)") {
    Write-Host "Firestore database '(default)' not found. Creating in native mode..." -ForegroundColor Yellow
    gcloud firestore databases create --location=$Region --type=firestore-native
    Write-Host "+ Firestore Native database created successfully." -ForegroundColor Green
} else {
    Write-Host "+ Firestore Native database already exists." -ForegroundColor Green
}

# === 5. Create BigQuery Schema ===
Write-Host ""
Write-Host "[Step 5/7] Provisioning BigQuery dataset and tables..." -ForegroundColor Blue
$datasetExists = (bq show "${ProjectID}:${DatasetID}" 2>$null)
if (-not $datasetExists) {
    Write-Host "Dataset '$DatasetID' not found. Creating..." -ForegroundColor Yellow
    bq mk --dataset --location=$Region "${ProjectID}:${DatasetID}"
    Write-Host "+ BigQuery dataset '$DatasetID' created successfully." -ForegroundColor Green
} else {
    Write-Host "+ BigQuery dataset '$DatasetID' already exists." -ForegroundColor Green
}

# Deploy tables using CREATE TABLE IF NOT EXISTS scripts
Write-Host "Creating table: integration_events..." -ForegroundColor Yellow
cmd.exe /c "bq query --use_legacy_sql=false --label datacloud=antigravity < sql\schemas\integration_events.sql"

Write-Host "Creating table: failure_probability..." -ForegroundColor Yellow
cmd.exe /c "bq query --use_legacy_sql=false --label datacloud=antigravity < sql\schemas\failure_probability.sql"
Write-Host "+ All BigQuery tables checked/created successfully." -ForegroundColor Green

# === 6. Create Pub/Sub Topic and Native BigQuery Subscription ===
Write-Host ""
Write-Host "[Step 6/7] Configuring Pub/Sub queue and direct BigQuery link..." -ForegroundColor Blue
$topicExists = (gcloud pubsub topics describe $PubSubTopic 2>$null)
if (-not $topicExists) {
    Write-Host "Pub/Sub topic '$PubSubTopic' not found. Creating..." -ForegroundColor Yellow
    gcloud pubsub topics create $PubSubTopic
    Write-Host "+ Pub/Sub topic '$PubSubTopic' created." -ForegroundColor Green
} else {
    Write-Host "+ Pub/Sub topic '$PubSubTopic' already exists." -ForegroundColor Green
}

# Fetch project number to resolve system service identity
Write-Host "Resolving GCP project number..." -ForegroundColor Yellow
$projectNumber = (gcloud projects describe $ProjectID --format="value(projectNumber)").Trim()
$pubsubServiceAccount = "service-${projectNumber}@gcp-sa-pubsub.iam.gserviceaccount.com"

Write-Host "Granting BigQuery permissions to Pub/Sub system agent: $pubsubServiceAccount..." -ForegroundColor Yellow
gcloud projects add-iam-policy-binding $ProjectID --member="serviceAccount:$pubsubServiceAccount" --role="roles/bigquery.dataEditor" --quiet | Out-Null
gcloud projects add-iam-policy-binding $ProjectID --member="serviceAccount:$pubsubServiceAccount" --role="roles/bigquery.metadataViewer" --quiet | Out-Null

# Create BigQuery Subscription
$subExists = (gcloud pubsub subscriptions describe $PubSubSub 2>$null)
if (-not $subExists) {
    Write-Host "BigQuery push subscription '$PubSubSub' not found. Creating..." -ForegroundColor Yellow
    gcloud pubsub subscriptions create $PubSubSub --topic=$PubSubTopic --bigquery-table="${ProjectID}:${DatasetID}.integration_events" --use-table-schema --drop-unknown-fields
    Write-Host "+ Native Pub/Sub BigQuery subscription created successfully." -ForegroundColor Green
} else {
    Write-Host "+ Native Pub/Sub BigQuery subscription already exists." -ForegroundColor Green
}

# === 7. Configure Runtime IAM Service Account ===
Write-Host ""
Write-Host "[Step 7/7] Configuring runtime Identity Access Management (IAM)..." -ForegroundColor Blue
$serviceAccountEmail = "${ServiceAccountName}@${ProjectID}.iam.gserviceaccount.com"
$saExists = (gcloud iam service-accounts describe $serviceAccountEmail 2>$null)
if (-not $saExists) {
    Write-Host "Service account '$ServiceAccountName' not found. Creating..." -ForegroundColor Yellow
    gcloud iam service-accounts create $ServiceAccountName --display-name="IntegriSense Runtime Identity" --project=$ProjectID
    Write-Host "+ Service account '$ServiceAccountName' created." -ForegroundColor Green
} else {
    Write-Host "+ Service account '$ServiceAccountName' already exists." -ForegroundColor Green
}

# Least privilege roles assignment list
$roles = @(
    "roles/bigquery.dataEditor",
    "roles/bigquery.jobUser",
    "roles/pubsub.publisher",
    "roles/datastore.user",
    "roles/aiplatform.user",
    "roles/secretmanager.secretAccessor"
)
Write-Host "Assigning roles to service account..." -ForegroundColor Yellow
foreach ($role in $roles) {
    Write-Host "Binding role: $role..."
    gcloud projects add-iam-policy-binding $ProjectID --member="serviceAccount:$serviceAccountEmail" --role=$role --quiet | Out-Null
}
Write-Host "+ Service account roles bound successfully." -ForegroundColor Green

Write-Host ""
Write-Host "=====================================================================" -ForegroundColor Green
Write-Host "         + INTEGRISENSE AI INFRASTRUCTURE PROVISIONING COMPLETE      " -ForegroundColor Green
Write-Host "=====================================================================" -ForegroundColor Green
