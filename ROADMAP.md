# ROADMAP

Bu dosya Operon_CRM için değerlendirilen ama henüz karara bağlanmamış fikirleri ve
sıradaki öncelikleri kaybetmemek için tutulur.

Durum etiketleri:
- DONE: Tamamlandı ve deploy edildi
- NEXT: Sıradaki öncelik
- FIKIR: Değerlendiriliyor, karar bekliyor

## DONE

- Temas (Outreach) Otomasyonu v1.4.0 — Selin'in ilk temas/takip şablonları (T1-T8),
  otomatik takip hatırlatıcısı, otomatik pasife alma, anlaşma "Kayıp" sebebi.

## FIKIR — Karar Bekleyen

### MEDDICC Fırsat Değerlendirmesi
Kaynak: `MEDDICC_Firsat_Degerlendirme_Sablonu.docx` (18 Temmuz 2026).

Öneri: Her **Anlaşma (Deal)** kaydına 7 bileşenli (Metrics, Economic Buyer,
Decision Criteria, Decision Process, Identify Pain, Champion, Competition)
yapılandırılmış bir değerlendirme eklenir — her bileşen için Bulgular/Kanıt/Durum
(Net/Belirsiz/Eksik). Anlaşma kartında "5/7 Net" gibi bir sağlık göstergesi
gösterilebilir (Champion boşsa uyarı gibi).

**Neden Deal'e bağlı, kişi/firma kartına değil:** Şablonun kendisi "her fırsat
için ayrı kopya" kuralını koyuyor — aynı firmayla zamanla birden çok fırsat
olabilir, MEDDICC her fırsat için ayrı değerlendirilir.

**Beklenen risk:** Doldurulmazsa (görüşme sonrası güncellenmezse) ölü ağırlık
olur — CRM'lerde en sık terk edilen özellik türü. Değer, Selin'in bunu gerçekten
her görüşme sonrası güncelleyip güncellemeyeceğine bağlı.

**Durum:** Selin'e sorulmadan uygulamaya konmayacak. Onayı gelirse build maliyeti
düşük (mevcut `SystemSettings.reminder_rules_json` deseniyle aynı yaklaşım —
Deal'e bir JSON kolon + kart üzerinde durum göstergesi).
