param(
    [string]$DbPass = "Mm3471891298",
    [string]$DbName = "kolektif360_crm"
)

$SupportedVersions = @("18", "17", "16", "15")
foreach ($ver in $SupportedVersions) {
    $psql = "C:\Program Files\PostgreSQL\$ver\bin\psql.exe"
    if (Test-Path $psql) {
        $env:PGPASSWORD = $DbPass
        & $psql -h localhost -U postgres -c "DROP DATABASE IF EXISTS `"$DbName`";" 2>$null
        Write-Host "Veritabani silindi: $DbName (PostgreSQL $ver)" -ForegroundColor Yellow
        break
    }
}
