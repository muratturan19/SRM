# ============================================================
# KolektifSRM - Kurulum Sonrasi Otomatik Test (self-test)
# ============================================================
# Servis ayaga kalkana kadar bekler, saglik kontrolu yapar,
# tum sonucu bir log dosyasina yazar (ProgramData + Masaustu).
# ============================================================
param(
    [string]$DataDir = "C:\ProgramData\KolektifSRM",
    [int]$Port       = 8010
)

$LogDir = Join-Path $DataDir "logs"
New-Item -ItemType Directory -Path $LogDir -Force -ErrorAction SilentlyContinue | Out-Null
$Log = Join-Path $LogDir "selftest.log"

try { $Desktop = [Environment]::GetFolderPath('Desktop') } catch { $Desktop = $null }
$DesktopLog = if ($Desktop) { Join-Path $Desktop "KolektifSRM_kurulum_testi.log" } else { $null }

"" | Set-Content -Path $Log -Encoding UTF8
function W([string]$m) {
    $line = "[{0}] {1}" -f (Get-Date -Format 'HH:mm:ss'), $m
    Add-Content -Path $Log -Value $line -Encoding UTF8
    if ($DesktopLog) { Add-Content -Path $DesktopLog -Value $line -Encoding UTF8 -ErrorAction SilentlyContinue }
    Write-Host $line
}

W "=== KolektifSRM Kurulum Testi ==="
W ("Tarih: " + (Get-Date))
W ("Veri dizini: $DataDir")

# 1) Servis
$svc = Get-Service KolektifSRM -ErrorAction SilentlyContinue
W ("Servis durumu: " + $(if ($svc) { "$($svc.Status)" } else { 'YOK / kayitli degil' }))

# 2) PostgreSQL
$pg = Get-Service postgresql* -ErrorAction SilentlyContinue | Select-Object -First 1
W ("PostgreSQL servisi: " + $(if ($pg) { "$($pg.Name) = $($pg.Status)" } else { 'YOK' }))

# 3) .env anahtar durumu
$envf = Join-Path $DataDir "data\.env"
if (Test-Path $envf) {
    foreach ($l in Get-Content $envf) {
        if ($l -match '^(ANTHROPIC_API_KEY|OPENAI_API_KEY)=(.*)$') {
            $durum = if ($matches[2].Trim()) { 'DOLU' } else { 'BOS' }
            W ("{0} = {1}" -f $matches[1], $durum)
        }
        elseif ($l -match '^(SCAN_PROVIDER|VOICE_STT_PROVIDER)=') { W $l }
    }
} else {
    W ".env DOSYASI YOK"
}

# 4) Saglik kontrolu - servis ayaga kalkana kadar bekle (en fazla ~90sn)
W "Servis yaniti bekleniyor (en fazla 90sn)..."
$ok = $false
for ($i = 0; $i -lt 45; $i++) {
    try {
        $r = Invoke-WebRequest "http://127.0.0.1:$Port/api/health" -UseBasicParsing -TimeoutSec 3
        W ("HEALTH OK (" + $r.StatusCode + "): " + $r.Content)
        $ok = $true
        break
    } catch { Start-Sleep -Seconds 2 }
}

if ($ok) {
    try {
        $c = Invoke-WebRequest "http://127.0.0.1:$Port/api/contacts/" -UseBasicParsing -TimeoutSec 5
        W ("Veritabani API (contacts): " + $c.StatusCode + " - DB calisiyor")
    } catch {
        W ("Veritabani API HATASI: " + $_.Exception.Message)
    }
} else {
    W "HEALTH BASARISIZ - 8010 portu yanit vermedi."
    W "--- backend hata logu (service_stderr.log son 40 satir) ---"
    $stderr = Join-Path $LogDir "service_stderr.log"
    if (Test-Path $stderr) {
        Get-Content $stderr -ErrorAction SilentlyContinue | Select-Object -Last 40 | ForEach-Object { W $_ }
    } else {
        W "(service_stderr.log bulunamadi)"
    }
}

$sonuc = if ($ok) { 'BASARILI - Uygulama calisiyor: http://127.0.0.1:' + $Port } else { 'BASARISIZ - yukaridaki hataya bakin' }
W ("=== SONUC: " + $sonuc + " ===")
if ($DesktopLog) { W ("Bu log ayrica burada: $DesktopLog") }

if ($ok) { exit 0 } else { exit 1 }
