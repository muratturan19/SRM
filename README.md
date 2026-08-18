# Operon_CRM v1.5.0

Operon_CRM — Modern, hafif müşteri ilişkileri yönetim sistemi.

## Özellikler

- 📨 **Temas (Outreach) Otomasyonu** — Kişinin halkasına (kişisel ağ/referans/soğuk temas) göre doğru şablonu CRM verisiyle doldurup sunar; "Gönderildi" işaretlendiğinde bir sonraki takip otomatik zamanlanır, cevapsız kalan kişiler otomatik pasife alınır. Şablonlar ve süreler (takip/pasife alma/yeniden temas eşikleri) Ayarlar'dan düzenlenir, koda gömülü değildir.
- 🎤 **Sesli Giriş** — Konuşarak yeni kişi, görüşme notu veya hatırlatıcı oluşturma; yapay zeka niyeti anlayıp doğru yere yazar, kaydetmeden önce gözden geçirilir
- 📇 **Kartvizit Tarama** — Claude Sonnet 4.6 veya GPT-5.5 vision ile otomatik veri doldurma
- 🗂️ **Pipeline Kanban** — Sürükle-bırak ile lead'den müşteriye geçiş
- ✅ **Temas Aşamaları** — Temas/Görüşme/Tanıtım/Teklif checkbox takibi
- 🤝 **Müşteri Yönetimi** — Anlaşma, tutar, sözleşme PDF
- 🔔 **Hatırlatıcılar** — Windows toast + tarayıcı bildirimi
- 📊 **Dashboard** — Pipeline değeri, ağırlıklı tahmin, gelir özeti, funnel grafiği
- 📋 **Aktivite Zaman Çizelgesi** — Arama/toplantı/e-posta/not/görev kaydı; tarih-saat seçimi
- 📝 **Görüşme Notları** — Kişi bazlı tarihli not geçmişi
- 📤 **CSV İçe/Dışa Aktarma** — Toplu kişi yükleme ve dışa aktarma
- 🔍 **Gelişmiş Filtreler** — Etiket filtresi, son iletişim tarihine göre filtreleme
- 🔁 **Çift Kayıt Tespiti** — Yeni kişi eklerken e-posta/telefon çakışma uyarısı

---

## Kurulum

### Gereksinimler
- Python 3.11+
- Node.js 20+
- PostgreSQL 15+

---

### 1. PostgreSQL Veritabanı

```sql
CREATE DATABASE operon_crm;
```

---

### 2. Backend

```powershell
cd E:\Mira\Operon_CRM\backend

# Sanal ortam
python -m venv .venv
.venv\Scripts\Activate.ps1

# Bağımlılıklar
pip install -r requirements.txt

# .env dosyasını oluştur
copy data\.env.example .env
# .env içindeki PostgreSQL ve portal ayarlarını düzenle

# Başlat
python run.py
```

Backend `http://localhost:8010` adresinde çalışır.  
API dokümantasyonu: `http://localhost:8010/docs`

Not: Bu sürüm SaaS/multi-tenant çalışır. Backend, portal tarafından verilen `access_token` cookie'sini doğrular ve tenant veritabanını `tenant_<slug>_operon_crm` formatında seçer.

---

### 3. Frontend

```powershell
cd E:\Mira\Operon_CRM\frontend

npm install
npm run dev
```

Frontend `http://localhost:5173` adresinde açılır.

---

### 4. Portal SSO ve Relay

Bu sürümde kartvizit tarama ve sesli giriş çağrıları doğrudan yerel API key ile değil, portal SaaS relay üzerinden yapılır. Bu yüzden backend için ek LLM API key tanımlamak gerekmez.

Yerelde uygulamayı kullanabilmek için portalın ürettiği JWT token'ın backend'e `/api/sso/login` endpoint'i üzerinden post edilmesi ve `access_token` cookie'sinin set edilmesi gerekir.

> Sesli giriş için tarayıcının mikrofon iznini vermesi gerekir.

---

### 5. Windows Bildirimleri

Backend çalışırken hatırlatıcı zamanı geldiğinde:
- **Windows toast** (Action Center) — `plyer` kütüphanesi ile
- **Tarayıcı bildirimi** — Frontend ilk açılışta izin ister

---

## LLM Modelleri (Haziran 2026)

| Model | Kullanım | Fiyat |
|-------|----------|-------|
| `claude-sonnet-4-6` | Kartvizit tarama + sesli giriş çıkarımı (birincil) | $3/M input |
| `gpt-5.5` (Responses API) | Kartvizit tarama + sesli giriş çıkarımı (yedek) | $5/M input |
| `gpt-4o-mini-transcribe` | Sesli giriş ses→metin (STT) | ~$0.003/dk |
| `scribe_v1` (ElevenLabs, ops.) | Sesli giriş STT alternatifi (en iyi Türkçe) | ~$0.0067/dk |

---

## Proje Yapısı

```
Operon_CRM/
├── backend/
│   ├── app/
│   │   ├── api/routes/     # contacts, deals, activities, reminders, outreach, scan, voice, dashboard
│   │   ├── core/           # config, database, phone_utils
│   │   ├── models/         # SQLAlchemy modelleri (contact, deal, activity, reminder, outreach_template)
│   │   ├── schemas/        # Pydantic şemaları
│   │   └── services/       # card_scanner, voice_processor, reminder_scheduler, outreach_service
│   ├── data/.env           # Ayarlar (versiyon kontrolüne girmesin!)
│   └── requirements.txt
├── frontend/
│   └── src/
│       ├── pages/          # Dashboard, Contacts, ContactDetail, Pipeline, Customers, Reminders, Settings
│       ├── components/     # Layout, Sidebar, CardScannerModal, VoiceInputModal, ActivityTimeline, ReminderPopup
│       ├── hooks/          # useAudioRecorder (MediaRecorder ses kaydı)
│       ├── services/       # API client
│       └── theme/          # Operon_CRM marka teması
└── CHANGELOG.md
```
