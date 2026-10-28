import uuid
from datetime import datetime, timezone

from sqlalchemy import String, DateTime, Float, Integer, JSON, Text
from sqlalchemy.orm import Mapped, mapped_column

from db.database import Base


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _uuid() -> str:
    return str(uuid.uuid4())


class Transaction(Base):
    __tablename__ = "transactions"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    tenant_id: Mapped[str] = mapped_column(String, nullable=False, index=True)
    borrower_ref: Mapped[str] = mapped_column(String, nullable=False)
    status: Mapped[str] = mapped_column(String, default="active")  # active | closed
    calc_version: Mapped[str] = mapped_column(String, nullable=False)

    # Calc inputs snapshot (no PII — only BorrowerSchema fields)
    inputs_snapshot: Mapped[dict] = mapped_column(JSON, nullable=False)

    # Calc result snapshot
    calc_result: Mapped[dict] = mapped_column(JSON, nullable=False)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    closed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class AuditLog(Base):
    __tablename__ = "audit_log"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    tenant_id: Mapped[str] = mapped_column(String, nullable=False, index=True)
    transaction_id: Mapped[str | None] = mapped_column(String, nullable=True, index=True)
    event: Mapped[str] = mapped_column(String, nullable=False)  # initiate | fetch | close | error
    calc_version: Mapped[str | None] = mapped_column(String, nullable=True)
    request_id: Mapped[str] = mapped_column(String, nullable=False)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    # No PII in details — only derived/operational data
    details: Mapped[str | None] = mapped_column(Text, nullable=True)


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    transaction_id: Mapped[str] = mapped_column(String, nullable=False, index=True)
    tenant_id: Mapped[str] = mapped_column(String, nullable=False, index=True)
    role: Mapped[str] = mapped_column(String, nullable=False)   # "user" | "assistant"
    content: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
