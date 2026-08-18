import uuid
import enum
from datetime import datetime
from sqlalchemy import String, Boolean, DateTime, Text, Integer, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base


class OutreachChannel(str, enum.Enum):
    WHATSAPP = "whatsapp"
    EMAIL = "email"
    LINKEDIN_NOTE = "linkedin_note"
    LINKEDIN_DM = "linkedin_dm"
    PHONE = "phone"
    EMAIL_SUMMARY = "email_summary"


class OutreachTemplate(Base):
    """Varsayilan temas sürecindeki şablonlar (T1-T8) — arayüzden tamamen düzenlenebilir."""

    __tablename__ = "outreach_templates"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code: Mapped[str] = mapped_column(String(10), unique=True, nullable=False)  # "T1".."T8"
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    channel: Mapped[OutreachChannel | None] = mapped_column(
        SAEnum(OutreachChannel, name="outreachchannel"), nullable=True
    )  # null = "önceki temasla aynı kanal" (T7 gibi genel takip şablonları için)

    # Virgülle ayrılmış OutreachTier listesi (örn "ring2_referral,ring3_cold"); boş = her halkaya uygun
    applicable_tiers: Mapped[str] = mapped_column(String(100), default="")
    is_first_touch: Mapped[bool] = mapped_column(Boolean, default=True)  # ilk temas şablonu mu

    subject: Mapped[str | None] = mapped_column(String(300))  # sadece e-posta kanalları
    body: Mapped[str] = mapped_column(Text, nullable=False)

    follow_up_days: Mapped[int | None] = mapped_column(Integer)  # gönderildikten kaç gün sonra takip önerilsin
    follow_up_template_code: Mapped[str | None] = mapped_column(String(10))  # sonraki önerilecek şablon kodu
    # Cevapsız kalırsa 7 gün sonra genel T7 takibini tetikler mi (T3 LinkedIn daveti hariç — doküman kuralı)
    triggers_generic_followup: Mapped[bool] = mapped_column(Boolean, default=True)

    active: Mapped[bool] = mapped_column(Boolean, default=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


DEFAULT_TEMPLATES = [
    dict(
        code="T1", title="Kişisel Ağ (WhatsApp/Telefon)", channel=OutreachChannel.WHATSAPP,
        applicable_tiers="ring1_personal", is_first_touch=True,
        subject=None,
        body=(
            "{{isim}} merhaba, {{ortak_baglam}} üzerinden epey zaman geçti. "
            "{{firma}} tarafında faydalı olabileceğini düşündüğüm bir yaklaşım için kısa bir görüşme "
            "önermek istedim. Uygunsa önümüzdeki hafta 20-30 dakikalık bir zaman ayırabilir miyiz?"
        ),
        follow_up_days=7, follow_up_template_code="T7", triggers_generic_followup=True, sort_order=1,
    ),
    dict(
        code="T2", title="Referanslı Tanışma (E-posta)", channel=OutreachChannel.EMAIL,
        applicable_tiers="ring2_referral", is_first_touch=True,
        subject="{{referans}} yönlendirmesiyle — {{firma}} için kısa bir tanışma talebi",
        body=(
            "{{isim}} {{unvan}} merhaba, {{referans}} sizinle tanışmamızı önerdi. "
            "{{gonderen_unvani}} rolünde çalışıyorum; {{firma}} için mevcut kayıtlar ve süreç verileri "
            "üzerinden tekrar eden sorunları ve iyileştirme alanlarını görünür kılmaya yardımcı olabilecek "
            "bir yaklaşım paylaşmak isterim. Uygunsa {{tarih_1}} veya {{tarih_2}} için kısa bir tanışma "
            "görüşmesi planlayabilir miyiz?"
        ),
        follow_up_days=7, follow_up_template_code="T7", triggers_generic_followup=True, sort_order=2,
    ),
    dict(
        code="T3", title="LinkedIn Bağlantı İsteği Notu", channel=OutreachChannel.LINKEDIN_NOTE,
        applicable_tiers="ring2_referral,ring3_cold", is_first_touch=True,
        subject=None,
        body=(
            "Merhaba {{isim}} {{unvan}}. Süreç verileri, operasyonel görünürlük ve iyileştirme konularında "
            "çalışan profesyonellerle bağlantıda kalmayı önemsiyorum. Uygunsa bağlantı kurmak isterim."
        ),
        # Cevapsızlıkta otomatik T7 tetiklenmez — LinkedIn daveti kabul edilirse ertesi gün T4 önerilir.
        follow_up_days=1, follow_up_template_code="T4", triggers_generic_followup=False, sort_order=3,
    ),
    dict(
        code="T4", title="LinkedIn Bağlantı Sonrası Mesaj", channel=OutreachChannel.LINKEDIN_DM,
        applicable_tiers="ring2_referral,ring3_cold", is_first_touch=False,
        subject=None,
        body=(
            "Bağlantı için teşekkürler {{isim}} {{unvan}}. Kısaca paylaşayım: mevcut kayıtlar üzerinden "
            "tekrar eden sorunları, aksiyonların etkisini ve olası iyileştirme alanlarını görünür kılmaya "
            "yardımcı olan bir yaklaşım üzerinde çalışıyoruz. Uygunsa {{firma}} için bunu {{tarih_1}} veya "
            "{{tarih_2}} tarihinde 30 dakikalık kısa bir görüşmede konuşabiliriz."
        ),
        follow_up_days=7, follow_up_template_code="T7", triggers_generic_followup=True, sort_order=4,
    ),
    dict(
        code="T5", title="Soğuk E-posta", channel=OutreachChannel.EMAIL,
        applicable_tiers="ring3_cold", is_first_touch=True,
        subject="{{firma}} — kayıtlarınızdaki görünmeyen tekrar eden kayıp",
        body=(
            "{{isim}} {{unvan}} merhaba. Pek çok ekipte benzer bir tablo görüyoruz: aynı kök nedene bağlı "
            "problemler farklı kayıtlarla tekrar ediyor, alınan aksiyonların etkisi net izlenemiyor ve kayıp "
            "zamanla görünmez bir maliyete dönüşüyor. Bu tür tekrar eden alanları mevcut kayıtlar üzerinden "
            "görünür kılmaya yardımcı olan bir yaklaşımı {{firma}} için paylaşmak isterim. Uygunsa {{tarih_1}} "
            "veya {{tarih_2}} tarihinde kısa bir görüşme planlayabilir miyiz?\n\n"
            "İyi çalışmalar dilerim."
        ),
        follow_up_days=7, follow_up_template_code="T7", triggers_generic_followup=True, sort_order=5,
    ),
    dict(
        code="T6", title="Telefon Açılışı (30 saniye)", channel=OutreachChannel.PHONE,
        applicable_tiers="ring2_referral,ring3_cold", is_first_touch=True,
        subject=None,
        body=(
            "\"{{isim}} {{unvan}} merhaba, [referans varsa: {{referans}} yönlendirmesiyle] arıyorum. "
            "Kısa tutacağım: {{firma}} tarafında mevcut kayıtlar üzerinden tekrar eden sorunları ve "
            "iyileştirme alanlarını görünür kılabilecek bir yaklaşımı paylaşmak isterim. Telefonda detaya "
            "girmeyeyim; 20-30 dakikalık kısa bir görüşme için {{tarih_1}} mi {{tarih_2}} mi size daha "
            "uygun?\"\n\n"
            "(İki tarih önermek — \"salı mı perşembe mi\" — açık uçlu \"müsait misiniz\"den her zaman daha "
            "iyi sonuç verir.)"
        ),
        follow_up_days=7, follow_up_template_code="T7", triggers_generic_followup=True, sort_order=6,
    ),
    dict(
        code="T7", title="Takip Mesajı (7 gün cevapsızlık sonrası)", channel=None,
        applicable_tiers="", is_first_touch=False,
        subject=None,
        body=(
            "{{isim}} {{unvan}} merhaba, geçen haftaki mesajım yoğunlukta kaybolmuş olabilir diye kısaca "
            "hatırlatmak istedim. Önerimiz net: bir aylık kayıtlarınızı gizlilik taahhüdüyle paylaşırsanız, "
            "ilk görüşmeye {{firma}}'nın kendi verisinden çıkmış 2-3 somut bulguyla geliriz. Beğenmezseniz "
            "30 dakikanızı almış oluruz, o kadar. Uygun bir zaman ayarlayabilir miyiz?"
        ),
        follow_up_days=None, follow_up_template_code=None, triggers_generic_followup=False, sort_order=7,
    ),
    dict(
        code="T8", title="Görüşme Sonrası Özet", channel=OutreachChannel.EMAIL_SUMMARY,
        applicable_tiers="", is_first_touch=False,
        subject="{{firma}} — görüşme özeti",
        body=(
            "{{isim}} {{unvan}} merhaba, bugünkü görüşme için teşekkür ederiz. Konuştuklarımızı üç "
            "başlıkta özetliyorum: [görüşmede geçen acı-1], [acı-2], [acı-3]. Bunlar için önerdiğimiz pilot "
            "çalışmanın tek sayfalık teklifini ekte bulabilirsiniz; kapsam ve süre görüşmede konuştuğumuz "
            "gibidir. [Karar tarihi] itibarıyla dönüş yapabilirseniz planlamayı ona göre yaparız. "
            "Sorularınız için her zaman ulaşabilirsiniz."
        ),
        follow_up_days=None, follow_up_template_code=None, triggers_generic_followup=False, sort_order=8,
    ),
]


LEGACY_TEMPLATE_SIGNATURES = {
    "T1": [
        ("{{ortak_baglam}} üzerinden epey zaman geçti", "kayıp avlayan", "30 dakika konuşmak isterim"),
    ],
    "T2": [
        ("{{referans}}, sizinle tanışmamızı önerdi", "Murat'ın da katılacağı", "Yeni sistem kurulumu gerektirmiyor"),
    ],
    "T3": [
        ("Bölge sanayicileriyle bağlantıda olmak isterim", "kayıtlarından kayıp ve risk çıkaran"),
    ],
    "T4": [
        ("hangi problem tekrar ediyor", "kaybın TL karşılığı ne", "{{tarih_1}} veya {{tarih_2}} uygun mudur"),
    ],
    "T5": [
        ("aynı kök nedene bağlı problemler", "kayıp kimsenin toplamadığı bir maliyet", "somut örnekle gösterebiliriz"),
    ],
    "T6": [
        ("Telefonda anlatmaya kalkmayacağım", "30 dakika gösterebilsek", "{{tarih_1}} mi {{tarih_2}} mi size daha uygun"),
    ],
}
