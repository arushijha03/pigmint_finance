Param(
    [string]$ProjectId = "pigmint-finance",
    [string]$Region    = "us-central1"
)

# ==========================================================
# CONFIG VARIABLES – EDIT THESE ONCE
# ==========================================================

# Cloud Run service names
$ApiGatewayService     = "pigmint-api-gateway"
$EventProcessorService = "pigmint-event-processor"
$AnalyticsService      = "pigmint-analytics-service"

# Artifact Registry repo
$RepoName = "pigmint-repo"
$RepoPath = "$Region-docker.pkg.dev/$ProjectId/$RepoName"

# Pub/Sub
$TransactionsTopic = "transactions.raw"
$TransactionsSub   = "transactions.raw-sub"

# Service accounts (short names; full email will be derived)
$ApiGatewaySa = "pigmint-api-gateway-sa"
$EventProcSa  = "pigmint-event-processor-sa"
$AnalyticsSa  = "pigmint-analytics-sa"

# Cloud SQL (existing instance; we only connect to it)
# Fill these with your real values:
$SqlInstanceName = "pigmint-db"     # e.g. "pigmint-db"
$DbHost = "10.102.0.3"   # internal IP from your screenshot
#$DbHost          = "35.192.210.188"
$DbPort          = "5432"
$DbName          = "pigmint_data"
$DbUser          = "postgres"
$DbPassword      = "postgres123"

# Redis / Memorystore
# If you have an existing Redis instance with private IP:
$RedisHost = "10.0.148.19"
$RedisPort = "6379"
$RedisInstanceName = "pigmint-redis-cache"   # optional, used only in down script

# Optional: set to $true if you want the script to set Cloud SQL activation-policy=ALWAYS
$EnsureSqlAlwaysOn = $true

# ==========================================================
Write-Host ">>> Setting gcloud project..." -ForegroundColor Cyan
gcloud config set project $ProjectId | Out-Null

# ==========================================================
# 0. Enable APIs (idempotent)
# ==========================================================
Write-Host ">>> Enabling required APIs..." -ForegroundColor Cyan

$apis = @(
    "run.googleapis.com",
    "pubsub.googleapis.com",
    "artifactregistry.googleapis.com",
    "sqladmin.googleapis.com",
    "redis.googleapis.com",
    "compute.googleapis.com",
    "vpcaccess.googleapis.com",
    "apigateway.googleapis.com"
)

foreach ($api in $apis) {
    gcloud services enable $api --project=$ProjectId 2>$null
}

# ==========================================================
# 1. Ensure Artifact Registry repo exists
# ==========================================================
Write-Host ">>> Ensuring Artifact Registry repo '$RepoName' exists..." -ForegroundColor Cyan

gcloud artifacts repositories describe $RepoName `
  --location=$Region `
  --project=$ProjectId `
  1>$null 2>$null

if ($LASTEXITCODE -ne 0) {
    gcloud artifacts repositories create $RepoName `
      --repository-format=DOCKER `
      --location=$Region `
      --description="PigMint container images" `
      --project=$ProjectId
} else {
    Write-Host "    Repo already exists, skipping create."
}

# ==========================================================
# 2. Create Pub/Sub topic (if missing)
# ==========================================================
Write-Host ">>> Ensuring Pub/Sub topic '$TransactionsTopic' exists..." -ForegroundColor Cyan

gcloud pubsub topics describe $TransactionsTopic `
  --project=$ProjectId `
  1>$null 2>$null

if ($LASTEXITCODE -ne 0) {
    gcloud pubsub topics create $TransactionsTopic `
      --project=$ProjectId
} else {
    Write-Host "    Topic already exists, skipping create."
}

# ==========================================================
# 3. Create service accounts (if missing) + roles
# ==========================================================
Write-Host ">>> Ensuring service accounts exist..." -ForegroundColor Cyan

$ApiGatewaySaEmail = "$ApiGatewaySa@$ProjectId.iam.gserviceaccount.com"
$EventProcSaEmail  = "$EventProcSa@$ProjectId.iam.gserviceaccount.com"
$AnalyticsSaEmail  = "$AnalyticsSa@$ProjectId.iam.gserviceaccount.com"

function Ensure-ServiceAccount($saName, $displayName) {
    $email = "$saName@$ProjectId.iam.gserviceaccount.com"
    gcloud iam service-accounts describe $email `
      --project=$ProjectId 1>$null 2>$null
    if ($LASTEXITCODE -ne 0) {
        gcloud iam service-accounts create $saName `
          --display-name=$displayName `
          --project=$ProjectId
    } else {
        Write-Host "    Service account $email already exists."
    }
}

Ensure-ServiceAccount $ApiGatewaySa "PigMint API Gateway SA"
Ensure-ServiceAccount $EventProcSa  "PigMint Event Processor SA"
Ensure-ServiceAccount $AnalyticsSa  "PigMint Analytics Service SA"

Write-Host ">>> Granting IAM roles (idempotent)..." -ForegroundColor Cyan

# Helper to add role safely
function Ensure-ProjectRole($member, $role) {
    gcloud projects add-iam-policy-binding $ProjectId `
      --member=$member `
      --role=$role `
      --quiet `
      1>$null 2>$null
}

# api-gateway roles
Ensure-ProjectRole "serviceAccount:$ApiGatewaySaEmail" "roles/pubsub.publisher"
Ensure-ProjectRole "serviceAccount:$ApiGatewaySaEmail" "roles/cloudsql.client"
Ensure-ProjectRole "serviceAccount:$ApiGatewaySaEmail" "roles/logging.logWriter"

# event-processor roles
Ensure-ProjectRole "serviceAccount:$EventProcSaEmail" "roles/cloudsql.client"
Ensure-ProjectRole "serviceAccount:$EventProcSaEmail" "roles/logging.logWriter"

# analytics-service roles
Ensure-ProjectRole "serviceAccount:$AnalyticsSaEmail" "roles/cloudsql.client"
Ensure-ProjectRole "serviceAccount:$AnalyticsSaEmail" "roles/logging.logWriter"

# ==========================================================
# 4. (Optional) Ensure Cloud SQL instance is "on"
# ==========================================================
if ($EnsureSqlAlwaysOn -and $SqlInstanceName -ne "YOUR_SQL_INSTANCE_NAME") {
    Write-Host ">>> Setting Cloud SQL instance '$SqlInstanceName' activation-policy=ALWAYS..." -ForegroundColor Cyan
    gcloud sql instances patch $SqlInstanceName `
      --activation-policy=ALWAYS `
      --project=$ProjectId `
      --quiet
} else {
    Write-Host ">>> Skipping Cloud SQL activation-policy change (configure SqlInstanceName + EnsureSqlAlwaysOn to use)." -ForegroundColor DarkYellow
}

# ==========================================================
# 5. Build & push container images
# ==========================================================
Write-Host ">>> Building and pushing API Gateway image..." -ForegroundColor Cyan
gcloud builds submit `
  --tag "$RepoPath/api-gateway:latest" `
  ./api-gateway

Write-Host ">>> Building and pushing Event Processor image..." -ForegroundColor Cyan
gcloud builds submit `
  --tag "$RepoPath/event-processor:latest" `
  ./event-processor

Write-Host ">>> Building and pushing Analytics Service image..." -ForegroundColor Cyan
gcloud builds submit `
  --tag "$RepoPath/analytics-service:latest" `
  ./analytics-service

# ==========================================================
# 6. Deploy Cloud Run services
# ==========================================================
Write-Host ">>> Deploying analytics-service..." -ForegroundColor Cyan

gcloud run deploy $AnalyticsService `
  --project=$ProjectId `
  --region=$Region `
  --image="$RepoPath/analytics-service:latest" `
  --service-account=$AnalyticsSaEmail `
  --platform=managed `
  --allow-unauthenticated `
  --vpc-connector=pigmint-connector `
  --vpc-egress=private-ranges-only `
  --set-env-vars="DB_HOST=$DbHost,DB_PORT=$DbPort,DB_NAME=$DbName,DB_USER=$DbUser,DB_PASSWORD=$DbPassword"

$AnalyticsUrl = gcloud run services describe $AnalyticsService `
  --region=$Region `
  --format="value(status.url)" `
  --project=$ProjectId

Write-Host "    Analytics URL: $AnalyticsUrl" -ForegroundColor Yellow

Write-Host ">>> Deploying event-processor..." -ForegroundColor Cyan

gcloud run deploy $EventProcessorService `
  --project=$ProjectId `
  --region=$Region `
  --image="$RepoPath/event-processor:latest" `
  --service-account=$EventProcSaEmail `
  --platform=managed `
  --allow-unauthenticated `
  --memory=1Gi `
  --concurrency=1 `
  --min-instances=1 `
  --max-instances=5 `
  --vpc-connector=pigmint-connector `
  --vpc-egress=private-ranges-only `
  --set-env-vars="DB_HOST=$DbHost,DB_PORT=$DbPort,DB_NAME=$DbName,DB_USER=$DbUser,DB_PASSWORD=$DbPassword,REDIS_HOST=$RedisHost,REDIS_PORT=$RedisPort"

$EventProcUrl = gcloud run services describe $EventProcessorService `
  --region=$Region `
  --format="value(status.url)" `
  --project=$ProjectId

Write-Host "    Event Processor URL: $EventProcUrl" -ForegroundColor Yellow

Write-Host ">>> Deploying api-gateway..." -ForegroundColor Cyan

gcloud run deploy $ApiGatewayService `
  --project=$ProjectId `
  --region=$Region `
  --image="$RepoPath/api-gateway:latest" `
  --service-account=$ApiGatewaySaEmail `
  --platform=managed `
  --allow-unauthenticated `
  --vpc-connector=pigmint-connector `
  --vpc-egress=private-ranges-only `
  --set-env-vars="PROJECT_ID=$ProjectId,TRANSACTIONS_TOPIC=$TransactionsTopic,DB_HOST=$DbHost,DB_PORT=$DbPort,DB_NAME=$DbName,DB_USER=$DbUser,DB_PASSWORD=$DbPassword,REDIS_HOST=$RedisHost,REDIS_PORT=$RedisPort,ANALYTICS_BASE_URL=$AnalyticsUrl"

$ApiGatewayUrl = gcloud run services describe $ApiGatewayService `
  --region=$Region `
  --format="value(status.url)" `
  --project=$ProjectId

Write-Host "    API Gateway URL: $ApiGatewayUrl" -ForegroundColor Yellow


# ==========================================================
# 7. Create Pub/Sub push subscription
# ==========================================================
Write-Host ">>> Ensuring Pub/Sub push subscription '$TransactionsSub' exists..." -ForegroundColor Cyan

$PushEndpoint = "$EventProcUrl/internal/pubsub/transactions"

gcloud pubsub subscriptions describe $TransactionsSub `
  --project=$ProjectId `
  1>$null 2>$null

if ($LASTEXITCODE -ne 0) {
    gcloud pubsub subscriptions create $TransactionsSub `
      --topic=$TransactionsTopic `
      --push-endpoint=$PushEndpoint `
      --push-auth-service-account=$EventProcSaEmail `
      --project=$ProjectId
} else {
    Write-Host "    Subscription already exists, skipping create."
}

Write-Host ""
Write-Host "===========================================" -ForegroundColor Green
Write-Host "PigMint UP COMPLETE" -ForegroundColor Green
Write-Host "  Project:   $ProjectId"
Write-Host "  Region:    $Region"
Write-Host "  API URL:   $ApiGatewayUrl"
Write-Host "===========================================" -ForegroundColor Green
