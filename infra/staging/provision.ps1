$ErrorActionPreference = 'Stop'
$project = 'sicmh-441423'
$region = 'us-central1'
function Invoke-Gcloud {
    & gcloud @args --project=$project --quiet
    if ($LASTEXITCODE -ne 0) { throw "gcloud failed: $($args[0..1] -join ' ')" }
}
Invoke-Gcloud compute networks create medit-staging --subnet-mode=custom
Invoke-Gcloud compute networks subnets create medit-staging --network=medit-staging --region=$region --range=10.24.0.0/24 --enable-private-ip-google-access
Invoke-Gcloud compute firewall-rules create medit-staging-mysql --network=medit-staging --allow=tcp:3306 --source-tags=medit-staging-api --target-tags=medit-staging-db
Invoke-Gcloud compute firewall-rules create medit-staging-iap-ssh --network=medit-staging --allow=tcp:22 --source-ranges=35.235.240.0/20 --target-tags=medit-staging-db
foreach ($name in @('medit-staging-db','medit-staging-api','medit-staging-build')) {
    Invoke-Gcloud iam service-accounts create $name --display-name=$name
}
foreach ($name in @('medit-staging-mysql-root','medit-staging-db-password','medit-staging-jwt','medit-staging-qa-password')) {
    $secretFile = [System.IO.Path]::GetTempFileName()
    try {
        $bytes = New-Object byte[] 32
        $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
        $rng.GetBytes($bytes)
        $rng.Dispose()
        $value = -join ($bytes | ForEach-Object { $_.ToString('x2') })
        [System.IO.File]::WriteAllText($secretFile, $value)
        Invoke-Gcloud secrets create $name --replication-policy=automatic --data-file=$secretFile
    } finally { Remove-Item -LiteralPath $secretFile -Force }
}
foreach ($name in @('medit-staging-mysql-root','medit-staging-db-password')) {
    Invoke-Gcloud secrets add-iam-policy-binding $name --member=serviceAccount:medit-staging-db@$project.iam.gserviceaccount.com --role=roles/secretmanager.secretAccessor
}
foreach ($name in @('medit-staging-db-password','medit-staging-jwt')) {
    Invoke-Gcloud secrets add-iam-policy-binding $name --member=serviceAccount:medit-staging-api@$project.iam.gserviceaccount.com --role=roles/secretmanager.secretAccessor
}
Invoke-Gcloud artifacts repositories create medit-staging --repository-format=docker --location=$region
Invoke-Gcloud artifacts repositories add-iam-policy-binding medit-staging --location=$region --member=serviceAccount:medit-staging-build@$project.iam.gserviceaccount.com --role=roles/artifactregistry.writer
Invoke-Gcloud projects add-iam-policy-binding $project --member=serviceAccount:medit-staging-build@$project.iam.gserviceaccount.com --role=roles/logging.logWriter --condition=None
foreach ($suffix in @('clinical','public','builds')) {
    Invoke-Gcloud storage buckets create gs://$project-medit-$suffix --location=$region --uniform-bucket-level-access
}
foreach ($suffix in @('clinical','public')) {
    Invoke-Gcloud storage buckets add-iam-policy-binding gs://$project-medit-$suffix --member=serviceAccount:medit-staging-api@$project.iam.gserviceaccount.com --role=roles/storage.objectAdmin
}
Invoke-Gcloud storage buckets add-iam-policy-binding gs://$project-medit-builds --member=serviceAccount:medit-staging-build@$project.iam.gserviceaccount.com --role=roles/storage.objectViewer
Invoke-Gcloud storage buckets add-iam-policy-binding gs://$project-medit-public --member=allUsers --role=roles/storage.objectViewer
Invoke-Gcloud iam service-accounts add-iam-policy-binding medit-staging-api@$project.iam.gserviceaccount.com --member=serviceAccount:medit-staging-api@$project.iam.gserviceaccount.com --role=roles/iam.serviceAccountTokenCreator
Invoke-Gcloud compute instances create medit-staging-db --zone=us-central1-c --machine-type=e2-small --subnet=medit-staging --private-network-ip=10.24.0.10 --tags=medit-staging-db --image-family=debian-12 --image-project=debian-cloud --boot-disk-size=20GB --boot-disk-type=pd-balanced --no-boot-disk-auto-delete --service-account=medit-staging-db@$project.iam.gserviceaccount.com --scopes=cloud-platform --metadata-from-file=startup-script=infra/staging/mysql-startup.sh '--labels=app=medit,environment=staging'
