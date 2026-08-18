# CLAUDE.md — Operon_CRM Repo/Deploy Notes

Bu dosya her repo açılışında okunmalı. Amaç: droplet/deploy detaylarını her
seferinde yeniden keşfetmemek. Buradaki bilgiler doğrulanmış gerçek durumu
yansıtır; ekstra araştırma yapmadan doğrudan kullanılabilir.

## Kimlik / Marka

- Uygulama adı: **Operon_CRM** (eski adı SRM/Selin CRM idi, tamamen değiştirildi).
- GitHub repo: `https://github.com/muratturan19/SRM` (repo adı hâlâ `SRM`,
  içerik Operon_CRM). Push için collaborator erişimi var; `git push origin main`
  ile doğrudan çalışıyor.
- SaaS/multi-tenant mimari: JWT `tenant_slug` alanına göre backend
  `tenant_<slug>_operon_crm` DB'sine bağlanır (yeni tenant'lar için).
  Kod ayrıca eski `tenant_<slug>_srm` adını da fallback olarak destekler
  (bkz. `backend/app/core/database.py` — `_legacy_db_name`).

## Production Droplet

- SSH: `ssh murat@68.183.216.105`
- Uygulama dizini: `/home/murat/apps/SRM` (klasör adı hâlâ SRM, içindeki
  compose artık Operon_CRM servislerini tanımlıyor).
- **CI/CD yok.** Deploy tamamen elle yapılır (git archive → scp → docker build → up -d).
- Reverse proxy: Traefik, `web` external network üzerinden.
- Canlı domain: `https://srm.kolektif360.com` (eski isim, DNS/portal tarafında
  henüz `operon-crm.kolektif360.com`'a geçilmedi — o domain şu an DNS'te yok/
  health vermiyor). Yani **gerçek canlı erişim URL'i hâlâ srm.kolektif360.com**.

### Container / servis adları (docker-compose.yml)

- App servisi: `operon_crm` (image: `srm-operon_crm`)
- DB servisi: `operon_crm_postgres`
- Bunlar eski `srm` / `srm-postgres` container'larının yerini aldı (o container'lar
  deploy sırasında `docker rm -f` ile kaldırıldı).

### ⚠️ Volume adları — KAFA KARIŞTIRICI, DİKKAT

Sunucuda birden fazla nesil volume var. Doğru olanlar şunlar:

- `srm_srm_pgdata` → **gerçek/eski production PostgreSQL verisi** (tüm tenant DB'ler burada)
- `srm_srm_uploads` → gerçek/eski production upload dosyaları
- `srm_pgdata`, `srm_uploads` → **yeni/boş** volume'lar (ilk Operon_CRM deploy'unda
  yanlışlıkla oluşturuldu, kullanılmamalı)

`docker-compose.yml` içinde volume mapping şöyle olmalı (bu hâlde kalsın):

```yaml
volumes:
  operon_crm_uploads:
    name: srm_srm_uploads
  operon_crm_pgdata:
    name: srm_srm_pgdata
```

Bunu asla `srm_pgdata` / `srm_uploads` (tek `srm_` prefixli) olarak değiştirme —
o volume'lar boştur, bağlarsan tüm tenant verisi "kaybolmuş" gibi görünür
(aslında kaybolmaz, yanlış volume'a bakıyor olursun).

### Bilinen tenant DB'ler (bu droplette, bu SRM/Operon_CRM instance'ında)

- `tenant_platform_admin_srm`
- `tenant_smartguide_srm`

İkisi de dolu (6 tablo, public schema). Yeni tenant onboard olursa DB adı
`tenant_<slug>_operon_crm` formatında oluşur (legacy suffix değil).

## Deploy prosedürü (bu ortamda gerçekten çalışan adımlar)

Windows makinede `rsync` yok, `rg` yok. Yöntem: `git archive` + `scp` + `docker compose build/up`.

```powershell
# 1) Temiz release arşivi (sadece commit edilmiş dosyalar)
Set-Location 'c:\AIprogramlari\OperonCRM'
$archive = Join-Path $env:TEMP 'operon_crm_deploy.tar.gz'
git archive --format=tar.gz --output=$archive HEAD

# 2) Deploy öncesi ZORUNLU yedek (atlama)
ssh murat@68.183.216.105 'docker tag srm-operon_crm srm-operon_crm:backup-$(date +%Y%m%d-%H%M) && docker exec operon_crm_postgres pg_dumpall -U postgres | gzip > /home/murat/srm-db-$(date +%Y%m%d-%H%M).sql.gz'

# 3) Gönder + aç + build + başlat
scp $archive murat@68.183.216.105:/home/murat/apps/SRM/operon_crm_deploy.tar.gz
ssh murat@68.183.216.105 "cd /home/murat/apps/SRM && tar -xzf operon_crm_deploy.tar.gz && rm operon_crm_deploy.tar.gz && docker compose build operon_crm && docker compose up -d operon_crm_postgres operon_crm && docker compose ps"

# 4) Doğrulama
curl.exe -s -o NUL -w "%{http_code}" https://srm.kolektif360.com/api/health   # 200 beklenir
ssh murat@68.183.216.105 "cd /home/murat/apps/SRM && docker compose logs --tail=60 operon_crm"
```

**Kritik kurallar:**
- `docker compose up -d --build` KULLANMA — bazen "No services to build" deyip
  eski image'ı başlatıyor. Her zaman `build` ve `up -d` ayrı komut.
- `restart` kod değişikliğini almaz — image yeniden build edilmeden `restart`
  eski kodu çalıştırmaya devam eder.
- Volume adlarını asla varsayılan (adsız) bırakma — yukarıdaki `name:` override'ı
  olmadan compose yeni/boş volume oluşturur ve production verisi "kaybolmuş" görünür.
- `docker compose down -v` ASLA çalıştırma (volume siler).

## Bilinen geçmiş hata (tekrar yaşanmasın diye not)

- İlk Operon_CRM deploy'unda `docker-compose.yml`'deki volume bloğu isim
  override'ı olmadan bırakılmıştı → yeni boş `srm_pgdata`/`srm_uploads`
  volume'ları oluştu, tenant veritabanları "kayboldu" gibi göründü. Çözüm:
  volume `name:` alanlarını gerçek eski volume adlarına (`srm_srm_pgdata`,
  `srm_srm_uploads`) sabitlemek. Bu artık `docker-compose.yml`'de düzeltilmiş
  durumda — bozma.
- `frontend/index.html` içindeki `<script type="module" src="/src/main.tsx">`
  satırı bir noktada silinmiş, canlıda boş `<div id="root"></div>` render
  oluyordu (JS hiç yüklenmiyordu). Bu satır geri eklendi, dosyadan silme.

## Yerel geliştirme notları

- Backend: `http://localhost:8010`, frontend dev: `http://localhost:5173`.
- Frontend build için yerel `node_modules` kurulu olmalı (`npm install`),
  yoksa `tsc` bulunamaz hatası alınır.
- `rg` (ripgrep) bu ortamda terminalden çalışmıyor — workspace `grep_search`
  aracını kullan, terminalde `rg` çağırma.
- `docker` CLI bu Windows makinede kurulu değil — build/compose doğrulaması
  yerelde yapılamaz, sadece syntax/derleme kontrolü (`py_compile`, `npm run build`)
  yapılabilir. Gerçek compose/deploy doğrulaması droplet üzerinden SSH ile yapılır.
