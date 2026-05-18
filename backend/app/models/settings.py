import json
from sqlalchemy import Text, Boolean, Integer
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

    @property
    def reminder_rules(self) -> list:
        return json.loads(self.reminder_rules_json or "[]")

    @reminder_rules.setter
    def reminder_rules(self, rules: list) -> None:
        self.reminder_rules_json = json.dumps(rules)
