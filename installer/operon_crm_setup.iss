; =============================================================================
; Operon_CRM — Inno Setup 6 Installer Script
;
; Beklenen build girdileri:
;   ..\backend\dist\operon_crm_backend\operon_crm_backend.exe
;   ..\backend\dist\operon_crm_backend\_internal\static\index.html  (frontend)
;   ..\tools\nssm.exe
;   postgresql-18.1-2-windows-x64.exe   (installer klasöründe)
;   vc_redist.x64.exe                   (installer klasöründe)
;
; Derleme:
;   ISCC.exe installer\operon_crm_setup.iss /DMyAppVersion=1.0.0
; =============================================================================

#ifndef MyAppVersion
  #define MyAppVersion "1.0.0"
#endif

#define MyAppName        "Operon_CRM"
#define MyAppId          "Operon_CRM-3A1B2C4D-5E6F-7A8B-9C0D-1E2F3A4B5C6D"
#define MyAppPublisher   "Kolektif360"
#define MyAppURL         "https://kolektif360.com"
#define MyAppExeName     "operon_crm_backend.exe"
#define MyServiceName    "Operon_CRM"
#define MyServiceLabel   "Operon_CRM Servisi"
#define MyDistDir        "..\backend\dist\operon_crm_backend"
#define MyToolsDir       "..\tools"
#define MyDataDir        "{commonappdata}\Operon_CRM"
#define MyPort           "8010"

; API anahtarları derleme anında ortam değişkenlerinden gömülür (git'e girmez).
; build.ps1 bunları backend\data\.env'den okuyup set eder.
#define OperonCrmAnthropicKey GetEnv('OPERON_CRM_ANTHROPIC_KEY')
#define OperonCrmOpenAIKey    GetEnv('OPERON_CRM_OPENAI_KEY')

; Build artefaktları doğrulama
#ifnexist "..\backend\dist\operon_crm_backend\operon_crm_backend.exe"
  #error "operon_crm_backend.exe bulunamadi. Once build.ps1 calistirin."
#endif
#ifnexist "..\backend\dist\operon_crm_backend\_internal\static\index.html"
  #error "Frontend static bulunamadi. build.ps1 frontend build yapiyor mu?"
#endif
#ifnexist "..\tools\nssm.exe"
  #error "tools\nssm.exe bulunamadi."
#endif
#ifnexist "postgresql-18.1-2-windows-x64.exe"
  #error "postgresql-18.1-2-windows-x64.exe installer klasorunde olmali."
#endif
#ifnexist "vc_redist.x64.exe"
  #error "vc_redist.x64.exe installer klasorunde olmali."
#endif

[Setup]
AppId={#MyAppId}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppVerName={#MyAppName} {#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}
DefaultDirName={autopf64}\{#MyAppName}
DefaultGroupName={#MyAppName}
DisableProgramGroupPage=yes
AllowNoIcons=yes
OutputDir=Output
OutputBaseFilename=Setup_{#MyAppName}_v{#MyAppVersion}
Compression=lzma2/max
SolidCompression=yes
LZMAUseSeparateProcess=yes
WizardStyle=modern
PrivilegesRequired=admin
PrivilegesRequiredOverridesAllowed=dialog
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
MinVersion=10.0.17763
CloseApplications=yes
CloseApplicationsFilter={#MyAppExeName}
RestartApplications=no
UsePreviousAppDir=yes
UninstallDisplayIcon={app}\operon_crm.ico
SetupIconFile=operon_crm.ico
SetupLogging=yes
ChangesEnvironment=no
DisableReadyMemo=no
DisableWelcomePage=no

[Languages]
Name: "turkish"; MessagesFile: "compiler:Languages\Turkish.isl"


; ── Dizinler ──────────────────────────────────────────────────────────────────
; {app}         = Program Files\Operon_CRM  → sadece binary (salt okunur)
; {commonappdata}\Operon_CRM               → veri, .env, yedekler, loglar
[Dirs]
Name: "{#MyDataDir}"
Name: "{#MyDataDir}\data"
Name: "{#MyDataDir}\uploads"
Name: "{#MyDataDir}\logs"
Name: "{#MyDataDir}\backups"

; ── Dosyalar ──────────────────────────────────────────────────────────────────
[Files]
; Backend binary (PyInstaller onedir paketi)
Source: "{#MyDistDir}\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs
; NSSM servis yöneticisi
Source: "{#MyToolsDir}\nssm.exe"; DestDir: "{app}"; Flags: ignoreversion
Source: "{#MyToolsDir}\nssm.exe"; DestDir: "{tmp}"; Flags: ignoreversion deleteafterinstall
; PostgreSQL offline installer — kurulum sonrası silinir
Source: "postgresql-18.1-2-windows-x64.exe"; DestDir: "{tmp}"; Flags: deleteafterinstall
; Visual C++ Redistributable
Source: "vc_redist.x64.exe"; DestDir: "{tmp}"; Flags: deleteafterinstall
; PostgreSQL yapılandırma ve .env oluşturma scriptleri
Source: "configure-postgres.ps1"; DestDir: "{tmp}"; Flags: deleteafterinstall
Source: "configure-postgres.ps1"; DestDir: "{app}"; Flags: ignoreversion
Source: "create-operon-crm-env.ps1"; DestDir: "{tmp}"; Flags: deleteafterinstall
; Kaldırma sırasında DB drop için {app}'te kalır
Source: "drop-operon-crm-db.ps1"; DestDir: "{app}"; Flags: ignoreversion
; Kurulum sonrası otomatik test scripti
Source: "operon_crm_selftest.ps1"; DestDir: "{app}"; Flags: ignoreversion
; Markalı uygulama ikonu (kısayollar için)
Source: "operon_crm.ico"; DestDir: "{app}"; Flags: ignoreversion

; ── Kısayollar ────────────────────────────────────────────────────────────────
[Icons]
Name: "{autoprograms}\{#MyAppName}\Operon_CRM"; Filename: "{sys}\rundll32.exe"; \
  Parameters: "url.dll,FileProtocolHandler http://127.0.0.1:{#MyPort}"; \
  IconFilename: "{app}\operon_crm.ico"
Name: "{autoprograms}\{#MyAppName}\Operon_CRM Kurulum Klasoru"; Filename: "{app}"
Name: "{autoprograms}\{#MyAppName}\Kaldir"; Filename: "{uninstallexe}"
; Masaüstü kısayolu — her zaman oluşturulur
Name: "{autodesktop}\Operon_CRM"; \
  Filename: "{sys}\rundll32.exe"; \
  Parameters: "url.dll,FileProtocolHandler http://127.0.0.1:{#MyPort}"; \
  IconFilename: "{app}\operon_crm.ico"

; ── Kurulum adımları ──────────────────────────────────────────────────────────
[Run]
; 1. Visual C++ Redistributable
Filename: "{tmp}\vc_redist.x64.exe"; \
  Parameters: "/install /quiet /norestart"; \
  Check: not IsVCRedistInstalled; \
  StatusMsg: "Microsoft Visual C++ Redistributable yukleniyor..."; \
  Flags: waituntilterminated

; 2. PostgreSQL kur + DB oluştur (idempotent — eksikse kurar, varsa atlar; HER ZAMAN çalışır)
Filename: "{sys}\WindowsPowerShell\v1.0\powershell.exe"; \
  Parameters: "-ExecutionPolicy Bypass -NonInteractive -File ""{tmp}\configure-postgres.ps1"" -PgPass ""Mm3471891298"" -DbName ""operon_crm"""; \
  StatusMsg: "PostgreSQL hazırlanıyor (gerekirse kuruluyor)..."; \
  Flags: runhidden waituntilterminated

; 3. .env dosyasını oluştur (zaten varsa script atlar; HER ZAMAN çalışır)
Filename: "{sys}\WindowsPowerShell\v1.0\powershell.exe"; \
  Parameters: "-ExecutionPolicy Bypass -NonInteractive -File ""{tmp}\create-operon-crm-env.ps1"" -DataDir ""{commonappdata}\Operon_CRM"" -AnthropicKey ""{#OperonCrmAnthropicKey}"" -OpenAIKey ""{#OperonCrmOpenAIKey}"""; \
  StatusMsg: "Uygulama yapılandırması oluşturuluyor..."; \
  Flags: runhidden waituntilterminated

; 4. ProgramData klasörüne yazma izni ver
Filename: "icacls.exe"; \
  Parameters: """{#MyDataDir}"" /grant ""Users:(OI)(CI)M"" /T /C"; \
  StatusMsg: "Yazma izinleri ayarlanıyor..."; \
  Flags: runhidden waituntilterminated

; 5. Windows servisi kaydet (yalnızca servis yoksa — kendi kendini onarır)
Filename: "{app}\nssm.exe"; \
  Parameters: "install {#MyServiceName} ""{app}\{#MyAppExeName}"""; \
  StatusMsg: "Windows servisi kaydediliyor..."; \
  Check: not IsServiceInstalled; \
  Flags: runhidden waituntilterminated

; Servis ayarları (idempotent — her zaman uygulanır)
Filename: "{app}\nssm.exe"; \
  Parameters: "set {#MyServiceName} AppDirectory ""{app}"""; \
  Flags: runhidden waituntilterminated

Filename: "{app}\nssm.exe"; \
  Parameters: "set {#MyServiceName} DisplayName ""{#MyServiceLabel}"""; \
  Flags: runhidden waituntilterminated

Filename: "{app}\nssm.exe"; \
  Parameters: "set {#MyServiceName} Start SERVICE_AUTO_START"; \
  Flags: runhidden waituntilterminated

Filename: "{app}\nssm.exe"; \
  Parameters: "set {#MyServiceName} AppStdout ""{#MyDataDir}\logs\service_stdout.log"""; \
  Flags: runhidden waituntilterminated

Filename: "{app}\nssm.exe"; \
  Parameters: "set {#MyServiceName} AppStderr ""{#MyDataDir}\logs\service_stderr.log"""; \
  Flags: runhidden waituntilterminated

Filename: "{app}\nssm.exe"; \
  Parameters: "set {#MyServiceName} AppRotateFiles 1"; \
  Flags: runhidden waituntilterminated

; OPERON_CRM_DATA_DIR env → backend bu env var'dan veri dizinini bulur
Filename: "{app}\nssm.exe"; \
  Parameters: "set {#MyServiceName} AppEnvironmentExtra OPERON_CRM_DATA_DIR={#MyDataDir}"; \
  Flags: runhidden waituntilterminated

; 6. Servisi (yeniden) başlat — taze veya güncelleme farketmez (ssInstall'da durdurulmuştu)
Filename: "{app}\nssm.exe"; \
  Parameters: "restart {#MyServiceName}"; \
  StatusMsg: "Operon_CRM servisi başlatılıyor..."; \
  Flags: runhidden waituntilterminated

; 7. Kurulum sonrası otomatik self-test — servis ayağa kalkana kadar bekler, log oluşturur
Filename: "{sys}\WindowsPowerShell\v1.0\powershell.exe"; \
  Parameters: "-ExecutionPolicy Bypass -NonInteractive -File ""{app}\operon_crm_selftest.ps1"" -DataDir ""{commonappdata}\Operon_CRM"""; \
  StatusMsg: "Kurulum test ediliyor (servis ayağa kalkıyor, lütfen bekleyin)..."; \
  Flags: runhidden waituntilterminated

; 7b. Test sonucu logunu kullanıcıya göster
Filename: "notepad.exe"; \
  Parameters: """{commonappdata}\Operon_CRM\logs\selftest.log"""; \
  Description: "Kurulum test sonucunu göster"; \
  Flags: nowait postinstall skipifsilent

; 8. Kurulum tamamlandı — tarayıcıyı aç
Filename: "{sys}\rundll32.exe"; \
  Parameters: "url.dll,FileProtocolHandler http://127.0.0.1:{#MyPort}"; \
  Description: "Operon_CRM'i tarayıcıda aç"; \
  Flags: nowait postinstall skipifsilent

; ── Kaldırma ──────────────────────────────────────────────────────────────────
[UninstallRun]
Filename: "{app}\nssm.exe"; Parameters: "stop {#MyServiceName}"; \
  Flags: runhidden skipifdoesntexist; RunOnceId: "StopService"
Filename: "{app}\nssm.exe"; Parameters: "remove {#MyServiceName} confirm"; \
  Flags: runhidden skipifdoesntexist; RunOnceId: "RemoveService"
Filename: "{sys}\taskkill.exe"; Parameters: "/F /IM {#MyAppExeName}"; \
  Flags: runhidden; RunOnceId: "KillProcess"
; Veritabanını sil
Filename: "{sys}\WindowsPowerShell\v1.0\powershell.exe"; \
  Parameters: "-ExecutionPolicy Bypass -NonInteractive -File ""{app}\drop-operon-crm-db.ps1"""; \
  Flags: runhidden; RunOnceId: "DropDatabase"
; ProgramData'yı temizle (veri + yedekler dahil)
Filename: "{sys}\WindowsPowerShell\v1.0\powershell.exe"; \
  Parameters: "-Command ""Remove-Item '{#MyDataDir}' -Recurse -Force -ErrorAction SilentlyContinue"""; \
  Flags: runhidden; RunOnceId: "RemoveData"

; ── Inno Setup kod bölümü ─────────────────────────────────────────────────────
[Code]

var
  IsUpgradeInstall: Boolean;

function IsUpgrade(): Boolean;
begin
  Result := IsUpgradeInstall;
end;

function IsServiceInstalled(): Boolean;
begin
  Result := RegKeyExists(HKLM,
    'SYSTEM\CurrentControlSet\Services\{#MyServiceName}');
end;

function IsVCRedistInstalled(): Boolean;
var
  MajorVersion: Cardinal;
begin
  Result :=
    RegQueryDWordValue(HKLM64,
      'SOFTWARE\Microsoft\VisualStudio\14.0\VC\Runtimes\x64', 'Major', MajorVersion)
      and (MajorVersion >= 14);
  if not Result then
    Result :=
      RegQueryDWordValue(HKLM64,
        'SOFTWARE\WOW6432Node\Microsoft\VisualStudio\14.0\VC\Runtimes\x64', 'Major', MajorVersion)
        and (MajorVersion >= 14);
end;

procedure FullCleanup();
var
  ResultCode: Integer;
  NssmApp, EnvFile: String;
begin
  NssmApp := ExpandConstant('{app}\nssm.exe');
  // 1) Servisi durdur
  Exec(ExpandConstant('{sys}\sc.exe'), 'stop {#MyServiceName}', '',
       SW_HIDE, ewWaitUntilTerminated, ResultCode);
  if FileExists(NssmApp) then
    Exec(NssmApp, 'stop {#MyServiceName}', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
  Sleep(2000);
  // 2) Kalan process'i zorla kapat
  Exec(ExpandConstant('{sys}\taskkill.exe'), '/F /IM {#MyAppExeName}', '',
       SW_HIDE, ewWaitUntilTerminated, ResultCode);
  // 3) Servisi tamamen kaldir (temiz yeniden kurulum icin)
  if FileExists(NssmApp) then
    Exec(NssmApp, 'remove {#MyServiceName} confirm', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
  Exec(ExpandConstant('{sys}\sc.exe'), 'delete {#MyServiceName}', '',
       SW_HIDE, ewWaitUntilTerminated, ResultCode);
  Sleep(1500);
  // 4) Eski .env'i sil — yeni anahtar/ayarlarla taze olussun (DB ve veriler KORUNUR)
  EnvFile := ExpandConstant('{commonappdata}\Operon_CRM\data\.env');
  if FileExists(EnvFile) then
    DeleteFile(EnvFile);
  // 5) Eski kisayollari temizle (onceki kurulumlardan kalan farkli isimliler orphan kalmasin)
  DelTree(ExpandConstant('{autoprograms}\{#MyAppName}'), True, True, True);
  DeleteFile(ExpandConstant('{autodesktop}\Operon_CRM.lnk'));
end;

function InitializeSetup(): Boolean;
var
  PrevVersion: String;
begin
  IsUpgradeInstall := RegQueryStringValue(HKLM,
    'SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\{#MyAppId}_is1',
    'DisplayVersion', PrevVersion);
  Result := True;
end;

procedure CurStepChanged(CurStep: TSetupStep);
begin
  if CurStep = ssInstall then
    FullCleanup();
end;
