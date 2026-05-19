; =============================================================================
; KolektifSRM — Inno Setup 6 Installer Script
;
; Beklenen build girdileri:
;   ..\backend\dist\srm_backend\srm_backend.exe
;   ..\backend\dist\srm_backend\_internal\static\index.html  (frontend)
;   ..\tools\nssm.exe
;   postgresql-18.1-2-windows-x64.exe   (installer klasöründe)
;   vc_redist.x64.exe                   (installer klasöründe)
;
; Derleme:
;   ISCC.exe installer\srm_setup.iss /DMyAppVersion=1.0.0
; =============================================================================

#ifndef MyAppVersion
  #define MyAppVersion "1.0.0"
#endif

#define MyAppName        "KolektifSRM"
#define MyAppId          "KolektifSRM-3A1B2C4D-5E6F-7A8B-9C0D-1E2F3A4B5C6D"
#define MyAppPublisher   "Kolektif360"
#define MyAppURL         "https://kolektif360.com"
#define MyAppExeName     "srm_backend.exe"
#define MyServiceName    "KolektifSRM"
#define MyServiceLabel   "Kolektif360 SRM Servisi"
#define MyDistDir        "..\backend\dist\srm_backend"
#define MyToolsDir       "..\tools"
#define MyDataDir        "{commonappdata}\KolektifSRM"
#define MyPort           "8010"

; Build artefaktları doğrulama
#ifnexist "..\backend\dist\srm_backend\srm_backend.exe"
  #error "srm_backend.exe bulunamadi. Once build.ps1 calistirin."
#endif
#ifnexist "..\backend\dist\srm_backend\_internal\static\index.html"
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
UninstallDisplayIcon={app}\{#MyAppExeName}
SetupLogging=yes
ChangesEnvironment=no
DisableReadyMemo=no
DisableWelcomePage=no

[Languages]
Name: "turkish"; MessagesFile: "compiler:Languages\Turkish.isl"

[Tasks]
Name: "desktopicon"; Description: "Masaustu kisayolu olustur"; GroupDescription: "Kisayollar:"; Flags: unchecked

; ── Dizinler ──────────────────────────────────────────────────────────────────
; {app}         = Program Files\KolektifSRM  → sadece binary (salt okunur)
; {commonappdata}\KolektifSRM               → veri, .env, yedekler, loglar
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
Source: "create-srm-env.ps1"; DestDir: "{tmp}"; Flags: deleteafterinstall
; Kaldırma sırasında DB drop için {app}'te kalır
Source: "drop-srm-db.ps1"; DestDir: "{app}"; Flags: ignoreversion

; ── Kısayollar ────────────────────────────────────────────────────────────────
[Icons]
Name: "{autoprograms}\{#MyAppName}\SRM Arayuzu"; Filename: "{sys}\rundll32.exe"; \
  Parameters: "url.dll,FileProtocolHandler http://localhost:{#MyPort}"; \
  IconFilename: "{app}\{#MyAppExeName}"
Name: "{autoprograms}\{#MyAppName}\SRM Kur Klaosoru"; Filename: "{app}"
Name: "{autoprograms}\{#MyAppName}\Kaldir"; Filename: "{uninstallexe}"
Name: "{autodesktop}\{#MyAppName}"; \
  Filename: "{sys}\rundll32.exe"; \
  Parameters: "url.dll,FileProtocolHandler http://localhost:{#MyPort}"; \
  IconFilename: "{app}\{#MyAppExeName}"; \
  Tasks: desktopicon

; ── Kurulum adımları ──────────────────────────────────────────────────────────
[Run]
; 1. Visual C++ Redistributable
Filename: "{tmp}\vc_redist.x64.exe"; \
  Parameters: "/install /quiet /norestart"; \
  Check: not IsVCRedistInstalled; \
  StatusMsg: "Microsoft Visual C++ Redistributable yukleniyor..."; \
  Flags: waituntilterminated

; 2. PostgreSQL kur + DB oluştur (taze kurulum)
Filename: "{sys}\WindowsPowerShell\v1.0\powershell.exe"; \
  Parameters: "-ExecutionPolicy Bypass -NonInteractive -File ""{tmp}\configure-postgres.ps1"" -PgPass ""Mm3471891298"" -DbName ""kolektif360_crm"""; \
  StatusMsg: "PostgreSQL yapılandırılıyor..."; \
  Check: not IsUpgrade; \
  Flags: runhidden waituntilterminated

; 3. .env dosyasını oluştur (taze kurulum)
Filename: "{sys}\WindowsPowerShell\v1.0\powershell.exe"; \
  Parameters: "-ExecutionPolicy Bypass -NonInteractive -File ""{tmp}\create-srm-env.ps1"" -DataDir ""{commonappdata}\KolektifSRM"""; \
  StatusMsg: "Uygulama yapılandırması oluşturuluyor..."; \
  Check: not IsUpgrade; \
  Flags: runhidden waituntilterminated

; 4. ProgramData klasörüne yazma izni ver
Filename: "icacls.exe"; \
  Parameters: """{#MyDataDir}"" /grant ""Users:(OI)(CI)M"" /T /C"; \
  StatusMsg: "Yazma izinleri ayarlanıyor..."; \
  Check: not IsUpgrade; \
  Flags: runhidden waituntilterminated

; 5. Windows servisi kaydet (taze kurulum)
Filename: "{app}\nssm.exe"; \
  Parameters: "install {#MyServiceName} ""{app}\{#MyAppExeName}"""; \
  StatusMsg: "Windows servisi kaydediliyor..."; \
  Check: not IsUpgrade; \
  Flags: runhidden waituntilterminated

Filename: "{app}\nssm.exe"; \
  Parameters: "set {#MyServiceName} AppDirectory ""{app}"""; \
  Check: not IsUpgrade; Flags: runhidden waituntilterminated

Filename: "{app}\nssm.exe"; \
  Parameters: "set {#MyServiceName} DisplayName ""{#MyServiceLabel}"""; \
  Check: not IsUpgrade; Flags: runhidden waituntilterminated

Filename: "{app}\nssm.exe"; \
  Parameters: "set {#MyServiceName} Start SERVICE_AUTO_START"; \
  Check: not IsUpgrade; Flags: runhidden waituntilterminated

Filename: "{app}\nssm.exe"; \
  Parameters: "set {#MyServiceName} AppStdout ""{#MyDataDir}\logs\service_stdout.log"""; \
  Check: not IsUpgrade; Flags: runhidden waituntilterminated

Filename: "{app}\nssm.exe"; \
  Parameters: "set {#MyServiceName} AppStderr ""{#MyDataDir}\logs\service_stderr.log"""; \
  Check: not IsUpgrade; Flags: runhidden waituntilterminated

Filename: "{app}\nssm.exe"; \
  Parameters: "set {#MyServiceName} AppRotateFiles 1"; \
  Check: not IsUpgrade; Flags: runhidden waituntilterminated

; SRM_DATA_DIR env → backend bu env var'dan veri dizinini bulur
Filename: "{app}\nssm.exe"; \
  Parameters: "set {#MyServiceName} AppEnvironmentExtra SRM_DATA_DIR={#MyDataDir}"; \
  Check: not IsUpgrade; Flags: runhidden waituntilterminated

; 6. Servisi başlat
Filename: "{app}\nssm.exe"; \
  Parameters: "start {#MyServiceName}"; \
  StatusMsg: "KolektifSRM servisi başlatılıyor..."; \
  Check: not IsUpgrade; \
  Flags: runhidden waituntilterminated

; 7. Güncelleme: servisi yeniden başlat
Filename: "{app}\nssm.exe"; \
  Parameters: "restart {#MyServiceName}"; \
  StatusMsg: "KolektifSRM servisi yeniden başlatılıyor..."; \
  Check: IsUpgrade and IsServiceInstalled; \
  Flags: runhidden waituntilterminated

; 8. Kurulum tamamlandı — tarayıcıyı aç
Filename: "{sys}\rundll32.exe"; \
  Parameters: "url.dll,FileProtocolHandler http://localhost:{#MyPort}"; \
  Description: "KolektifSRM'yi tarayıcıda aç"; \
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
  Parameters: "-ExecutionPolicy Bypass -NonInteractive -File ""{app}\drop-srm-db.ps1"""; \
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

procedure StopExistingService();
var
  ResultCode: Integer;
begin
  if FileExists(ExpandConstant('{tmp}\nssm.exe')) then
    Exec(ExpandConstant('{tmp}\nssm.exe'), 'stop {#MyServiceName}', '',
         SW_HIDE, ewWaitUntilTerminated, ResultCode);
  if FileExists(ExpandConstant('{app}\nssm.exe')) then
    Exec(ExpandConstant('{app}\nssm.exe'), 'stop {#MyServiceName}', '',
         SW_HIDE, ewWaitUntilTerminated, ResultCode);
  Exec(ExpandConstant('{sys}\sc.exe'), 'stop {#MyServiceName}', '',
       SW_HIDE, ewWaitUntilTerminated, ResultCode);
  Sleep(3000);
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
    StopExistingService();
end;
