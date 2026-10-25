param([switch]$WriteProbe)
$ErrorActionPreference = 'Stop'
$project = 'sicmh-441423'
$base = 'https://medit-be-staging-403161153944.us-central1.run.app'
$password = & gcloud secrets versions access 1 --secret=medit-staging-qa-password --project=$project
if ($LASTEXITCODE -ne 0) { throw 'Cannot read the staging QA secret.' }
try {
    $ping = Invoke-RestMethod "$base/public/ping"
    if (!$ping.ok) { throw 'Backend ping failed.' }
    $body = @{ email='qa.admin@example.com'; password=$password; codigoEmpresa='MEDITQA' } | ConvertTo-Json
    $login = Invoke-RestMethod "$base/auth/login" -Method Post -ContentType 'application/json' -Body $body
    if (!$login.token) { throw 'Login did not return a token.' }
    $headers = @{ Authorization="Bearer $($login.token)" }
    $check = Invoke-RestMethod "$base/auth/check-token" -Headers $headers
    if (!$check.user) { throw 'Token validation failed.' }
    foreach ($path in @('/app/', '/app/patients/?term=', '/app/inventory/?subinvId=main')) {
        $result = Invoke-RestMethod "$base$path" -Headers $headers
        if ($null -eq $result.data) { throw "Protected endpoint failed: $path" }
        Write-Host "PASS: $path"
    }
    if ($WriteProbe) {
        $existing = Invoke-RestMethod "$base/app/patients/?term=QASTAGING001" -Headers $headers
        $patient = @($existing.data.patients | Where-Object { $_.idNumber -eq 'QASTAGING001' }) | Select-Object -First 1
        if (!$patient) {
            $patientBody = @{
                firstName='Paciente'; lastName='Prueba QA'; birthdate='1990-01-01';
                gender='Male'; identificationType='pasaporte'; id='QASTAGING001';
                notes='DATOS FICTICIOS - verificacion del ambiente staging'
            } | ConvertTo-Json
            $created = Invoke-RestMethod "$base/app/patients/new-patient" -Headers $headers -Method Post -ContentType 'application/json' -Body $patientBody
            $patient = $created.data.patient
        }
        if (!$patient.id) { throw 'Synthetic patient creation failed.' }
        $readback = Invoke-RestMethod "$base/app/patients/$($patient.id)" -Headers $headers
        if ($readback.data.patient.idNumber -ne 'QASTAGING001') { throw 'Synthetic patient readback failed.' }
        Write-Host 'PASS: synthetic QA patient write and readback.'
    }
    $frontend = Invoke-WebRequest 'https://sicmh-441423.web.app/auth/login' -UseBasicParsing
    if ($frontend.StatusCode -ne 200 -or $frontend.Content -notmatch 'MedIT QA') { throw 'Staging Hosting failed.' }
    Write-Host 'PASS: backend ping, QA login, token validation and frontend SPA route.'
} finally {
    $password = $null
    $body = $null
    $login = $null
    $headers = $null
}
