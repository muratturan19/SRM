# Kolektif360 SRM v1.3.0

**S**elin **R**elations **M**anagement — Modern, hafif müşteri ilişkileri yönetim sistemi.

## Özellikler

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
CREATE DATABASE kolektif360_crm;
```

---

### 2. Backend

```powershell
cd E:\Mira\SRM\backend

# Sanal ortam
python -m venv .venv
.venv\Scripts\Activate.ps1

# Bağımlılıklar
pip install -r requirements.txt

# .env dosyasını oluştur
copy data\.env.example data\.env
# data\.env içindeki şifreyi düzenle

# Başlat
python run.py
```

Backend `http://localhost:8010` adresinde çalışır.  
API dokümantasyonu: `http://localhost:8010/docs`

---

### 3. Frontend

```powershell
cd E:\Mira\SRM\frontend

npm install
npm run dev
```

Frontend `http://localhost:5173` adresinde açılır.

---

### 4. Kartvizit Tarama & Sesli Giriş Ayarı

`backend/data/.env` dosyasına API anahtarlarını ekleyin:

```env
ANTHROPIC_API_KEY=sk-ant-...   # Claude Sonnet 4.6 (kartvizit + sesli giriş çıkarımı)
OPENAI_API_KEY=sk-...          # GPT-5.5 yedek + sesli giriş STT (gpt-4o-mini-transcribe)
SCAN_PROVIDER=claude           # Kartvizit: varsayılan claude
VOICE_STT_PROVIDER=openai      # Sesli giriş ses→metin: openai | elevenlabs
# ELEVENLABS_API_KEY=...       # (opsiyonel) en yüksek Türkçe STT doğruluğu için
```

> Sesli giriş için tarayıcının mikrofon iznini vermesi gerekir (ilk kullanımda sorulur).

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
SRM/
├── backend/
│   ├── app/
│   │   ├── api/routes/     # contacts, deals, activities, reminders, scan, voice, dashboard
│   │   ├── core/           # config, database, phone_utils
│   │   ├── models/         # SQLAlchemy modelleri (contact, deal, activity, reminder)
│   │   ├── schemas/        # Pydantic şemaları
│   │   └── services/       # card_scanner, voice_processor, reminder_scheduler
│   ├── data/.env           # Ayarlar (versiyon kontrolüne girmesin!)
│   └── requirements.txt
├── frontend/
│   └── src/
│       ├── pages/          # Dashboard, Contacts, ContactDetail, Pipeline, Customers, Reminders, Settings
│       ├── components/     # Layout, Sidebar, CardScannerModal, VoiceInputModal, ActivityTimeline, ReminderPopup
│       ├── hooks/          # useAudioRecorder (MediaRecorder ses kaydı)
│       ├── services/       # API client
│       └── theme/          # Kolektif360 marka teması
└── CHANGELOG.md
```
