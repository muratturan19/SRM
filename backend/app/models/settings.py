import json
from sqlalchemy import Text, Boolean, Integer, String
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base

DEFAULT_RULES = [
    {"trigger": "is_contacted",    "days": 7, "enabled": True},
    {"trigger": "is_met",          "days": 5, "enabled": False},
    {"trigger": "is_demo_sent",    "days": 5, "enabled": False},
    {"trigger": "is_proposal_sent","days": 3, "enabled": True},
]


class SystemSettings(Base):
    __tablename__ = "system_settings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, default=1)
    reminder_rules_json: Mapped[str] = mapped_column(
        Text, default=json.dumps(DEFAULT_RULES)
    )
    snooze_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    snooze_days: Mapped[int] = mapped_column(Integer, default=2)

    # Temas (outreach) otomasyonu ayarları
    max_followups: Mapped[int] = mapped_column(Integer, default=2)          # ilk mesaj + en fazla kaç takip
    passive_after_days: Mapped[int] = mapped_column(Integer, default=14)    # son temastan sonra pasife alma eşiği
    reactivate_after_days: Mapped[int] = mapped_column(Integer, default=90)  # pasiften yeniden temas hatırlatma eşiği
    selin_title: Mapped[str] = mapped_column(String(200), default="İş Geliştirme Ortağı")

    @property
    def sender_title(self) -> str:
        return self.selin_title

    @sender_title.setter
    def sender_title(self, value: str) -> None:
        self.selin_title = value

    @property
    def reminder_rules(self) -> list:
        return json.loads(self.reminder_rules_json or "[]")

    @reminder_rules.setter
    def reminder_rules(self, rules: list) -> None:
        self.reminder_rules_json = json.dumps(rules)
