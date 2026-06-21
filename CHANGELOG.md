# Changelog

Tüm önemli değişiklikler bu dosyada belgelenir.
Format: [Keep a Changelog](https://keepachangelog.com/tr/1.0.0/)
Versiyon: [Semantic Versioning](https://semver.org/lang/tr/)

---

## [1.3.0] — 2026-06-19

### Eklendi
- **Sesli Giriş (Voice Input):** Üst bardaki "Sesli Giriş" butonuyla konuşarak kayıt oluşturma. Yapay zeka, ne söylendiğini anlayıp doğru yere yazar; kaydetmeden önce her şey gözden geçirilip düzenlenebilir.
  - **Niyet algılama:** Tek bir konuşmadan üç işlemden biri otomatik seçilir — **yeni kişi**, **mevcut kişiye görüşme notu/aktivite**, veya **hatırlatıcı**. Algılanan işlem gözden geçirme ekranından değiştirilebilir.
  - **Yeni kişi:** Ad, şirket, ünvan, e-posta, telefon vb. alanlar otomatik dolar. Sözle söylenen telefon ("sıfır beş üç iki…") rakama, "at/nokta" e-posta adresine çevrilir; telefon `+90 …` formatına normalize edilir.
  - **Görüşme notu:** Bahsedilen kişi mevcut kayıtlarla eşleştirilir (seçilebilir), görüşme türü (arama/toplantı/e-posta/not/görev) ve özet otomatik belirlenir.
  - **Hatırlatıcı:** Türkçe göreli tarih/saat ("yarın 15:00", "salı günü") otomatik çözülür; tarih-saat seçiciden düzeltilebilir.
  - **Ses → metin (STT):** OpenAI `gpt-4o-mini-transcribe` (Haziran 2026 güncel modeli; `gpt-4o-transcribe` ve `whisper-1` emekliye ayrıldı). ElevenLabs Scribe alternatifi config'den seçilebilir.
  - **Metin → yapılandırılmış veri:** Claude Sonnet 4.6 (birincil) → GPT-5.5 (yedek); kartvizit taramayla aynı dayanıklılık deseni.
  - Tarayıcıda kayıt MediaRecorder API ile yapılır; ham ses backend'e gönderilir.

### Düzeltildi
- **Kişi "Yine de Kaydet" akışı:** Çift kayıt uyarısında "Yine de Kaydet" düğmesi, `force` parametresi eklenerek artık gerçekten kaydediyor (önceden tekrar 409 hatası döngüsüne giriyordu).
- **Paketleme hatası (kurulu .exe açılmıyordu):** `run.py` uvicorn'a `"app.main:app"` metnini veriyordu; PyInstaller metin-import'unu göremediği için `app` paketi pakete dahil edilmiyor, exe açılışta `ModuleNotFoundError` ile çöküyordu. Frozen modda app nesnesi doğrudan import ediliyor + spec'e `collect_submodules("app")` eklendi. (1.0.0'dan beri var olan gizli hata.)
- **Veritabanı yarış durumu (`database does not exist`):** Backend açılışta PostgreSQL hazır olana kadar bekliyor ve hedef veritabanı yoksa kendisi oluşturuyor. Temiz makinede (PG yeni kurulurken) DB'nin oluşmaması ve boot'ta PG'nin geç açılması sorunları kalıcı çözüldü.

### Kurulum (Installer)
- **Sesli giriş anahtarları pakete gömülüyor:** API anahtarları derleme anında `backend/data/.env`'den okunup Setup.exe'ye gömülür (git'e girmez); kurulumda `.env` dolu gelir.
- **Kendi kendini onaran kurulum:** Adımlar artık "güncelleme" sayılınca atlanmıyor; eksik PostgreSQL/servis/.env varsa kurulur. Kurulumdan önce eski servis+`.env` tamamen temizlenir (DB ve veriler korunur).
- **Kurulum sonrası otomatik test + log:** Kurulum biter bitmez self-test çalışır (servis, PG, anahtarlar, sağlık kontrolü) ve sonucu `logs/selftest.log` + Masaüstü'ne yazıp Not Defteri'nde açar.
- Kısayollar ve tarayıcı açma `localhost` yerine `127.0.0.1` kullanır (IPv6 belirsizliğini önler).

---

## [1.2.1] — 2026-05-19

### Eklendi
- **Telefon Numarası Normalizasyonu:** Tüm formatlardaki Türkiye numaraları (`5XXXXXXXXX`, `05XXXXXXXXX`, `+90XXXXXXXXXX`, `0212 XXX XX XX` vb.) standart `+90 XXX XXX XX XX` formatına otomatik dönüştürülür.
  - Kaydet ve güncelle işlemlerinde Pydantic `field_validator` ile anlık normalize edilir.
  - CSV içe aktarmada da normalize uygulanır.
  - Mevcut veritabanı kayıtları backfill scriptiyle normalize edildi.

---

## [1.2.0] — 2026-05-19

### Eklendi
- **Görüşme Notları:** Kişi detay sayfasında aktiviteler kutusunun altında ayrı bir "Görüşme Notları" bölümü. Ekle butonu ile popup'tan not girilir, tarih-saat bilgisiyle listelenir.
- **Dashboard Gelir Tahmini:** Toplam Pipeline değeri, ağırlıklı gelir tahmini (olasılık × tutar), bu ay kapanan anlaşmalar — 4 yeni stat kartı.
- **Dashboard Funnel Grafiği:** Aşamalara göre anlaşma değerini gösteren bar grafik (Recharts).
- **Aktivite Tarih/Saat Seçimi:** Tüm aktivite tiplerinde (sadece görev değil) tarih ve saat seçimi artık mevcut.
- **Gelişmiş Kişi Filtreleri:** Etikete göre filtre ve "Son X günde iletişim kurulmayan kişiler" filtresi (7/14/30/60/90 gün seçeneği).

### Düzeltildi
- SQLAlchemy `SAEnum` + Python 3.11 uyumsuzluğu: `Deal.stage.in_()` büyük harf enum adları (`"NEW"`) gönderiyordu. `cast(Deal.stage, String).in_(["new", ...])` ile çözüldü.
- Dashboard endpoint `500 Internal Server Error` (yukarıdaki enum bug'ı nedeniyle).

---

## [1.1.0] — 2026-05-18

### Eklendi
- **Aktivite Zaman Çizelgesi:** Kişi detay sayfasında arama, toplantı, e-posta, not, görev kaydı. Görev tipi için teslim tarihi ve tamamlandı işareti.
- **CSV İçe/Dışa Aktarma:** Kişiler listesinden toplu CSV export; CSV dosyasından kişi içe aktarma (duplicate tespiti ile).
- **Kanban Pipeline:** Sürükle-bırak ile aşama güncelleme; aşamalar arası geçiş.
- **Çift Kayıt Tespiti:** Yeni kişi eklerken e-posta veya telefon çakışması uyarısı.
- **Görev Yönetimi:** Aktivite tipinde görev ekleme; kişiye bağlı görev takibi.

---

## [1.0.0] — 2026-05-17

### Temel Özellikler
- Kişi yönetimi (CRUD, arama, aşama filtresi)
- Temas aşamaları checkbox takibi (Temas/Görüşme/Tanıtım/Teklif)
- Anlaşma yönetimi (tutar, para birimi, sözleşme PDF yükleme)
- Hatırlatıcı sistemi (Windows toast + tarayıcı bildirimi)
- Dashboard (istatistikler, dönüşüm oranı, son eklenen kişiler)
- Kartvizit tarama (Claude Sonnet 4.6 / GPT-5.5 vision)
- Müşteriler sayfası (sadece müşteri aşamasındaki kişiler)
- PostgreSQL + FastAPI backend, React + MUI v6 frontend
