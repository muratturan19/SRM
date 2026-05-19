# build.ps1 — KolektifSRM tam build scripti
#
# Kullanım:
#   .\build.ps1                        # Versiyon otomatik (1.0.0)
#   .\build.ps1 -Version "1.2.0"
#   .\build.ps1 -SkipFrontend          # Frontend build'i atla (zaten build edilmişse)
#   .\build.ps1 -SkipPyInstaller       # Sadece .iss derle
#
# Çıktı: installer\Output\Setup_KolektifSRM_v{Version}.exe
#
# Önkoşullar:
#   - Node.js + npm
#   - Python 3.11+ (.venv içinde pyinstaller kurulu)
#   - Inno Setup 6 (ISCC.exe PATH'te veya varsayılan konum)
#   - installer\postgresql-18.1-2-windows-x64.exe
#   - installer\vc_redist.x64.exe
#   - tools\nssm.exe

param(
    [string]$Version       = "1.0.0",
    [switch]$SkipFrontend  = $false,
    [switch]$SkipPyInstaller = $false
)

$ErrorActionPreference = "Stop"
$Root      = $PSScriptRoot
$Frontend  = Join-Path $Root "frontend"
$Backend   = Join-Path $Root "backend"
$Installer = Join-Path $Root "installer"

function Write-Step([string]$Msg) {
    Write-Host "`n=== $Msg ===" -ForegroundColor Cyan
}

function Assert-Exists([string]$Path, [string]$Label) {
    if (-not (Test-Path $Path)) {
        Write-Error "$Label bulunamadi: $Path"
        exit 1
    }
}

# ── Önkoşul kontrolü ─────────────────────────────────────────────────────────
Write-Step "Onkosul kontrolu"
Assert-Exists "$Installer\postgresql-18.1-2-windows-x64.exe" "PostgreSQL installer"
Assert-Exists "$Installer\vc_redist.x64.exe" "VC++ Redistributable"
Assert-Exists "$Root\tools\nssm.exe" "NSSM"
Assert-Exists "$Backend\.venv\Scripts\python.exe" "Python venv"

$iscc = Get-Command "ISCC.exe" -ErrorAction SilentlyContinue
if (-not $iscc) {
    $isccPaths = @(
        "D:\Program Files\Inno Setup 6\ISCC.exe",
        "C:\Program Files (x86)\Inno Setup 6\ISCC.exe",
        "C:\Program Files\Inno Setup 6\ISCC.exe"
    )
    $iscc = $isccPaths | Where-Object { Test-Path $_ } | Select-Object -First 1
    if (-not $iscc) { Write-Error "ISCC.exe bulunamadi. Inno Setup 6 kurulu mu?"; exit 1 }
} else {
    $iscc = $iscc.Source
}

# ── 1. Frontend build ─────────────────────────────────────────────────────────
if (-not $SkipFrontend) {
    Write-Step "Frontend build (npm run build)"
    Push-Location $Frontend
    try {
        npm install --prefer-offline 2>&1 | Out-Null
        npm run build
        if ($LASTEXITCODE -ne 0) { Write-Error "Frontend build basarisiz!"; exit 1 }
    } finally {
        Pop-Location
    }
    Assert-Exists "$Frontend\dist\index.html" "Frontend dist"
    Write-Host "Frontend build tamamlandi." -ForegroundColor Green
}

# ── 2. PyInstaller — backend exe ─────────────────────────────────────────────
if (-not $SkipPyInstaller) {
    Write-Step "PyInstaller — srm_backend.exe olusturuluyor"
    Push-Location $Backend
    try {
        # pyinstaller kurulu mu?
        $pi = ".venv\Scripts\pyinstaller.exe"
        if (-not (Test-Path $pi)) {
            Write-Host "PyInstaller kuruluyor..." -ForegroundColor Yellow
            & .venv\Scripts\pip.exe install pyinstaller --quiet
        }
        # Temiz build
        if (Test-Path "dist\srm_backend") { Remove-Item "dist\srm_backend" -Recurse -Force }
        & $pi srm_backend.spec --clean --noconfirm
        if ($LASTEXITCODE -ne 0) { Write-Error "PyInstaller basarisiz!"; exit 1 }
    } finally {
        Pop-Location
    }
    Assert-Exists "$Backend\dist\srm_backend\srm_backend.exe" "srm_backend.exe"
    Assert-Exists "$Backend\dist\srm_backend\_internal\static\index.html" "Bundled frontend"
    Write-Host "PyInstaller tamamlandi." -ForegroundColor Green
}

# ── 3. Inno Setup — Setup_KolektifSRM_v{Version}.exe ─────────────────────────
Write-Step "Inno Setup — kurulum paketi olusturuluyor (v$Version)"
$issFile = Join-Path $Installer "srm_setup.iss"
& $iscc $issFile "/DMyAppVersion=$Version"
if ($LASTEXITCODE -ne 0) { Write-Error "Inno Setup derleme basarisiz!"; exit 1 }

$output = Join-Path $Installer "Output\Setup_KolektifSRM_v$Version.exe"
Assert-Exists $output "Kurulum paketi"

Write-Step "BUILD TAMAMLANDI"
Write-Host "Paket: $output" -ForegroundColor Green
Write-Host "Boyut: $([math]::Round((Get-Item $output).Length / 1MB, 1)) MB" -ForegroundColor Green
