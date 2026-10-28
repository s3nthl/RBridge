"""Shared helpers for v1 routes: request ids, response meta, audit log, token lookup."""

import uuid
from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.constants import CALC_ENGINE_VERSION
from core.schemas import ResponseMeta
from core.token_service import verify_transaction_token
from db.models import AuditLog, Transaction


def new_request_id() -> str:
    return str(uuid.uuid4())


def meta(request_id: str, tenant_id: str) -> ResponseMeta:
    return ResponseMeta(
        request_id=request_id,
        calc_version=CALC_ENGINE_VERSION,
        tenant_id=tenant_id,
        timestamp=datetime.now(timezone.utc),
    )


def audit(
    db: AsyncSession,
    *,
    tenant_id: str,
    event: str,
    request_id: str,
    transaction_id: str | None = None,
    details: str | None = None,
) -> None:
    """Stage an audit row. The caller commits the session."""
    db.add(AuditLog(
        tenant_id=tenant_id,
        transaction_id=transaction_id,
        event=event,
        calc_version=CALC_ENGINE_VERSION,
        request_id=request_id,
        details=details,
    ))


async def get_active_transaction(token: str, db: AsyncSession) -> Transaction:
    """Validate a transaction token and return the open, unexpired transaction."""
    try:
        transaction_id = verify_transaction_token(token)
    except ValueError as exc:
        raise HTTPException(status_code=401, detail=str(exc))

    result = await db.execute(select(Transaction).where(Transaction.id == transaction_id))
    txn = result.scalar_one_or_none()
    if txn is None:
        raise HTTPException(status_code=404, detail="Transaction not found.")
    if txn.status == "closed":
        raise HTTPException(status_code=410, detail="Transaction has been closed.")

    # SQLite stores timezone-naive datetimes; normalise before comparing.
    expires_at = txn.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=410, detail="Transaction token has expired.")

    return txn
