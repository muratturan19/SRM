# Kolektif360 CRM

Modern, AI destekli müşteri ilişkileri yönetim sistemi.

## Özellikler

- 📇 **Kartvizit Tarama** — Claude Sonnet 4.6 veya GPT-5.5 vision ile otomatik veri doldurma
- 🗂️ **Pipeline Kanban** — Sürükle-bırak ile lead'den müşteriye geçiş
- ✅ **Temas Aşamaları** — Temas/Görüşme/Tanıtım/Teklif checkbox takibi
- 🤝 **Müşteri Yönetimi** — Anlaşma, tutar, sözleşme PDF
- 🔔 **Hatırlatıcılar** — Windows toast + tarayıcı bildirimi
- 📊 **Dashboard** — Pipeline dağılımı, dönüşüm oranı, gelir özeti

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

Backend `http://localhost:8000` adresinde çalışır.  
API dokümantasyonu: `http://localhost:8000/docs`

---

### 3. Frontend

```powershell
cd E:\Mira\SRM\frontend

npm install
npm run dev
```

Frontend `http://localhost:5173` adresinde açılır.

---

### 4. Kartvizit Tarama Ayarı

`backend/data/.env` dosyasına API anahtarlarını ekleyin:

```env
ANTHROPIC_API_KEY=sk-ant-...   # Claude Sonnet 4.6
OPENAI_API_KEY=sk-...          # GPT-5.5 (yedek)
SCAN_PROVIDER=claude           # Varsayılan: claude
```

---

### 5. Windows Bildirimleri

Backend çalışırken hatırlatıcı zamanı geldiğinde:
- **Windows toast** (Action Center) — `plyer` kütüphanesi ile
- **Tarayıcı bildirimi** — Frontend ilk açılışta izin ister

---

## LLM Modelleri (Mayıs 2026)

| Model | Kullanım | Fiyat |
|-------|----------|-------|
| `claude-sonnet-4-6` | Kartvizit tarama (birincil) | $3/M input |
| `gpt-5.5` (Responses API) | Kartvizit tarama (yedek) | $5/M input |

---

## Proje Yapısı

```
SRM/
├── backend/
│   ├── app/
│   │   ├── api/routes/     # contacts, deals, reminders, scan, dashboard
│   │   ├── core/           # config, database
│   │   ├── models/         # SQLAlchemy modelleri
│   │   ├── schemas/        # Pydantic şemaları
│   │   └── services/       # card_scanner, reminder_scheduler
│   ├── data/.env           # Ayarlar (versiyon kontrolüne girmesin!)
│   └── requirements.txt
└── frontend/
    └── src/
        ├── pages/          # Dashboard, Contacts, Pipeline, Customers, Reminders
        ├── components/     # Layout, Sidebar, CardScannerModal, ReminderPopup
        ├── services/       # API client
        └── theme/          # Kolektif360 marka teması
```
