param([string]$BuildId, [switch]$SkipDatabaseSetup)
$ErrorActionPreference = 'Stop'
$project = 'sicmh-441423'
$region = 'us-central1'
$serviceAccount = "medit-staging-api@$project.iam.gserviceaccount.com"
function Invoke-Gcloud {
    & gcloud @args --project=$project --quiet
    if ($LASTEXITCODE -ne 0) { throw "gcloud failed: $($args[0..1] -join ' ')" }
}
if (!$BuildId) {
    $BuildId = Invoke-Gcloud builds submit . --config=infra/staging/cloudbuild.yaml --service-account=projects/$project/serviceAccounts/medit-staging-build@$project.iam.gserviceaccount.com --gcs-source-staging-dir=gs://$project-medit-builds/source --format='value(id)' --async
}
Write-Host "Build ID: $BuildId"
do {
    $status = Invoke-Gcloud builds describe $BuildId --format='value(status)'
    if ($status -in @('QUEUED','WORKING','PENDING')) { Start-Sleep -Seconds 15 }
} while ($status -in @('QUEUED','WORKING','PENDING'))
if ($status -ne 'SUCCESS') { throw "Build did not succeed: $status" }
$images = "us-central1-docker.pkg.dev/$project/medit-staging"
if (!$SkipDatabaseSetup) {
    Invoke-Gcloud run jobs deploy medit-staging-db-setup --region=$region --image=${images}/database-setup:$BuildId --service-account=$serviceAccount --network=medit-staging --subnet=medit-staging --network-tags=medit-staging-api --vpc-egress=private-ranges-only --env-vars-file=infra/staging/setup-env.yaml '--set-secrets=DB_PASSWORD=medit-staging-db-password:1,QA_ADMIN_PASSWORD=medit-staging-qa-password:1' --command=sh '--args=-c,npm run db:setup && npx ts-node src/scripts/seed-staging-admin.ts' --tasks=1 --max-retries=0 --task-timeout=600s --memory=1Gi --cpu=1
    Invoke-Gcloud run jobs execute medit-staging-db-setup --region=$region --wait
}
Invoke-Gcloud run deploy medit-be-staging --region=$region --image=${images}/backend:$BuildId --service-account=$serviceAccount --network=medit-staging --subnet=medit-staging --network-tags=medit-staging-api --vpc-egress=private-ranges-only --env-vars-file=infra/staging/env.yaml '--set-secrets=DB_PASSWORD=medit-staging-db-password:1,SECRET_JWT_TOKEN=medit-staging-jwt:1' --port=3000 --memory=1Gi --cpu=1 --min-instances=0 --max-instances=1 --concurrency=20 --timeout=120s --allow-unauthenticated
Invoke-Gcloud run services describe medit-be-staging --region=$region --format='value(status.url)'
