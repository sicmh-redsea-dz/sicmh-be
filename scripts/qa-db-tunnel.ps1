$ErrorActionPreference = 'Stop'
Write-Host 'Forwarding localhost:13306 to the MedIT QA database. Keep this process running while using QA locally.'
& gcloud compute ssh medit-staging-db --zone=us-central1-c --project=sicmh-441423 --tunnel-through-iap --ssh-flag=-L --ssh-flag=127.0.0.1:13306:10.24.0.10:3306 --command='sleep infinity'
if ($LASTEXITCODE -ne 0) { throw "QA database tunnel exited with code $LASTEXITCODE" }
