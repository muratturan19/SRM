# Changelog

Tüm önemli değişiklikler bu dosyada belgelenir.
Format: [Keep a Changelog](https://keepachangelog.com/tr/1.0.0/)
Versiyon: [Semantic Versioning](https://semver.org/lang/tr/)

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
