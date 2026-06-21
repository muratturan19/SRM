# ============================================================
# KolektifSRM — PostgreSQL Yapılandırıcı
# ============================================================
# Görev:
#   1. PostgreSQL kurulu değilse installer'dan sessiz kur
#   2. Servis çalışmıyorsa başlat
#   3. kolektif360_crm veritabanını oluştur
# ============================================================

param(
    [string]$PgPass  = "Mm3471891298",
    [string]$DbName  = "kolektif360_crm"
)

$ErrorActionPreference = "Stop"

$SupportedVersions = @("18", "17", "16", "15")
$PgVersion   = $null
$PgBinDir    = $null
$ServiceName = $null

function Write-Log([string]$Msg, [string]$Color = "White") {
    Write-Host "[$([datetime]::Now.ToString('HH:mm:ss'))] $Msg" -ForegroundColor $Color
}

# ── 1. Kurulu PostgreSQL sürümünü bul ────────────────────────────────────────
foreach ($ver in $SupportedVersions) {
    $bin = "C:\Program Files\PostgreSQL\$ver\bin"
    $svc = "postgresql-x64-$ver"
    if ((Test-Path "$bin\psql.exe") -and (Get-Service $svc -ErrorAction SilentlyContinue)) {
        $PgVersion   = $ver
        $PgBinDir    = $bin
        $ServiceName = $svc
        Write-Log "PostgreSQL $ver bulundu." "Cyan"
        break
    }
}

if (-not $PgVersion) {
    Write-Log "PostgreSQL kurulu degil — installer baslatiliyor..." "Yellow"
    $installer = Join-Path $PSScriptRoot "postgresql-18.1-2-windows-x64.exe"
    if (-not (Test-Path $installer)) {
        Write-Error "PostgreSQL installer bulunamadi: $installer"
        exit 1
    }
    # Sessiz kurulum
    $args = "--mode unattended --superpassword `"$PgPass`" " +
            "--servicename postgresql-x64-18 " +
            "--servicepassword `"$PgPass`" " +
            "--install_runtimes 0 " +
            "--datadir `"C:\ProgramData\PostgreSQL\18\data`""
    Start-Process -FilePath $installer -ArgumentList $args -Wait -NoNewWindow
    $PgVersion   = "18"
    $PgBinDir    = "C:\Program Files\PostgreSQL\18\bin"
    $ServiceName = "postgresql-x64-18"
    Write-Log "PostgreSQL 18 kuruldu." "Green"
}

$PsqlExe = Join-Path $PgBinDir "psql.exe"

# ── 2. Servisi başlat ────────────────────────────────────────────────────────
$svc = Get-Service $ServiceName -ErrorAction SilentlyContinue
if ($svc -and $svc.Status -ne "Running") {
    Write-Log "Servis baslatiliyor: $ServiceName" "Yellow"
    Start-Service $ServiceName
    Start-Sleep -Seconds 4
}

# ── 3. Veritabanını oluştur ──────────────────────────────────────────────────
$env:PGPASSWORD = $PgPass

# Yeni kurulumda PG servisi bağlantı kabul etmeye geç hazır olabilir — bekle
$ready = $false
for ($i = 0; $i -lt 30; $i++) {
    & $PsqlExe -h localhost -U postgres -tAc "SELECT 1" 2>$null | Out-Null
    if ($LASTEXITCODE -eq 0) { $ready = $true; break }
    Start-Sleep -Seconds 2
}
if (-not $ready) {
    Write-Log "PostgreSQL 60sn icinde hazir olmadi — DB olusturma backend tarafindan denenecek." "Yellow"
}

$exists = & $PsqlExe -h localhost -U postgres -tAc `
    "SELECT 1 FROM pg_database WHERE datname='$DbName'" 2>$null

if ($exists -eq "1") {
    Write-Log "Veritabani '$DbName' zaten mevcut." "Cyan"
} else {
    Write-Log "Veritabani olusturuluyor: $DbName" "Yellow"
    & $PsqlExe -h localhost -U postgres -c "CREATE DATABASE `"$DbName`" ENCODING 'UTF8';"
    if ($LASTEXITCODE -ne 0) { Write-Error "Veritabani olusturulamadi!"; exit 1 }
    Write-Log "Veritabani olusturuldu: $DbName" "Green"
}

Write-Log "=== PostgreSQL yapılandırma tamamlandı ===" "Green"
