Param(
    [string]$ProjectId = "pigmint-finance",
    [string]$Region    = "us-central1"
)

# ==========================================================
# SAME NAMES AS IN pigmint-up.ps1
# ==========================================================
$ApiGatewayService     = "pigmint-api-gateway"
$EventProcessorService = "pigmint-event-processor"
$AnalyticsService      = "pigmint-analytics-service"

$TransactionsTopic = "transactions.raw"
$TransactionsSub   = "transactions.raw-sub"

# Existing instances (only touched if you flip the flags below)
$SqlInstanceName    = "pigmint-db"       # e.g. "pigmint-db"
$RedisInstanceName  = "pigmint-redis-cache"     # e.g. "pigmint-redis"

# BE CAREFUL WITH THESE:
$PauseCloudSql      = $true    # activation-policy=NEVER
$DeleteRedis        = $false   # set to $true ONLY if you're ok deleting the instance

# ==========================================================
Write-Host ">>> Setting gcloud project..." -ForegroundColor Cyan
gcloud config set project $ProjectId | Out-Null

# ==========================================================
# 1. Delete Cloud Run services
# ==========================================================
Write-Host ">>> Deleting Cloud Run services (if they exist)..." -ForegroundColor Cyan

function Delete-RunServiceIfExists($serviceName) {
    $exists = gcloud run services describe $serviceName `
      --region=$Region `
      --platform=managed `
      --format="value(metadata.name)" `
      --project=$ProjectId `
      2>$null
    if ($LASTEXITCODE -eq 0 -and $exists) {
        Write-Host "    Deleting Cloud Run service: $serviceName"
        gcloud run services delete $serviceName `
          --region=$Region `
          --platform=managed `
          --project=$ProjectId `
          --quiet
    } else {
        Write-Host "    Cloud Run service '$serviceName' not found, skipping."
    }
}

Delete-RunServiceIfExists $ApiGatewayService
Delete-RunServiceIfExists $EventProcessorService
Delete-RunServiceIfExists $AnalyticsService

# ==========================================================
# 2. Delete Pub/Sub subscription + topic
# ==========================================================
Write-Host ">>> Deleting Pub/Sub subscription '$TransactionsSub' (if exists)..." -ForegroundColor Cyan

gcloud pubsub subscriptions describe $TransactionsSub `
  --project=$ProjectId `
  1>$null 2>$null

if ($LASTEXITCODE -eq 0) {
    gcloud pubsub subscriptions delete $TransactionsSub `
      --project=$ProjectId `
      --quiet
} else {
    Write-Host "    Subscription '$TransactionsSub' not found, skipping."
}

Write-Host ">>> Deleting Pub/Sub topic '$TransactionsTopic' (if exists)..." -ForegroundColor Cyan

gcloud pubsub topics describe $TransactionsTopic `
  --project=$ProjectId `
  1>$null 2>$null

if ($LASTEXITCODE -eq 0) {
    gcloud pubsub topics delete $TransactionsTopic `
      --project=$ProjectId `
      --quiet
} else {
    Write-Host "    Topic '$TransactionsTopic' not found, skipping."
}

# ==========================================================
# 3. (Optional) Pause Cloud SQL instance (activation-policy=NEVER)
# ==========================================================
if ($PauseCloudSql -and $SqlInstanceName -ne "YOUR_SQL_INSTANCE_NAME") {
    Write-Host ">>> Setting Cloud SQL instance '$SqlInstanceName' activation-policy=NEVER..." -ForegroundColor Cyan
    gcloud sql instances patch $SqlInstanceName `
      --activation-policy=NEVER `
      --project=$ProjectId `
      --quiet
} else {
    Write-Host ">>> Skipping Cloud SQL changes (configure SqlInstanceName + PauseCloudSql to use)." -ForegroundColor DarkYellow
}

# ==========================================================
# 4. (Optional) Delete Redis Memorystore instance
# ==========================================================
if ($DeleteRedis -and $RedisInstanceName -ne "YOUR_REDIS_INSTANCE_NAME") {
    Write-Host ">>> Deleting Redis instance '$RedisInstanceName'..." -ForegroundColor Red
    gcloud redis instances delete $RedisInstanceName `
      --region=$Region `
      --project=$ProjectId `
      --quiet
} else {
    Write-Host ">>> Skipping Redis deletion (configure RedisInstanceName + DeleteRedis to use)." -ForegroundColor DarkYellow
}

Write-Host ""
Write-Host "===========================================" -ForegroundColor Green
Write-Host "PigMint DOWN COMPLETE" -ForegroundColor Green
Write-Host "  Project:   $ProjectId"
Write-Host "  Region:    $Region"
Write-Host "===========================================" -ForegroundColor Green
