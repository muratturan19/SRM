param(
    [string]$DataDir       = "C:\ProgramData\KolektifSRM",
    [string]$DbPass        = "Mm3471891298",
    [string]$DbName        = "kolektif360_crm",
    [string]$AnthropicKey  = "",
    [string]$OpenAIKey     = "",
    [string]$ScanProvider  = "claude",
    [string]$VoiceStt      = "openai"
)

# .env dosyasını oluştur — zaten varsa üzerine yazma (upgrade koruma)
$EnvFile = Join-Path $DataDir "data\.env"
if (Test-Path $EnvFile) {
    Write-Host ".env zaten var, atlanıyor." -ForegroundColor Cyan
    exit 0
}

New-Item -ItemType Directory -Path (Join-Path $DataDir "data") -Force | Out-Null

$content = @"
DATABASE_URL=postgresql+asyncpg://postgres:$DbPass@localhost:5432/$DbName
DATABASE_URL_SYNC=postgresql+psycopg2://postgres:$DbPass@localhost:5432/$DbName
SCAN_PROVIDER=$ScanProvider
VOICE_STT_PROVIDER=$VoiceStt
ANTHROPIC_API_KEY=$AnthropicKey
OPENAI_API_KEY=$OpenAIKey
"@

$enc = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($EnvFile, $content, $enc)
Write-Host ".env olusturuldu: $EnvFile" -ForegroundColor Green
