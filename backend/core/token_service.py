"""
Transaction token service.

Issues short-lived signed JWTs that allow borrowers to fetch their
calc result without a full auth session. Tokens carry only the
transaction_id — no PII, no calc data.

Token TTL is configurable via RBRIDGE_JWT_TTL_HOURS (default 72h).
"""

from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt

from core.config import settings


_ALGORITHM = settings.rbridge_jwt_algorithm
_SECRET = settings.rbridge_jwt_secret
_TTL_HOURS = settings.rbridge_jwt_ttl_hours


def issue_transaction_token(transaction_id: str) -> tuple[str, datetime]:
    """
    Create a signed JWT for a transaction.

    Returns (token, expires_at).
    """
    expires_at = datetime.now(timezone.utc) + timedelta(hours=_TTL_HOURS)
    payload = {
        "sub": transaction_id,
        "exp": expires_at,
        "iat": datetime.now(timezone.utc),
        "typ": "txn",
    }
    token = jwt.encode(payload, _SECRET, algorithm=_ALGORITHM)
    return token, expires_at


def verify_transaction_token(token: str) -> str:
    """
    Verify a transaction JWT and return the transaction_id.

    Raises ValueError on invalid or expired tokens.
    """
    try:
        payload = jwt.decode(token, _SECRET, algorithms=[_ALGORITHM])
    except JWTError as exc:
        raise ValueError(f"Invalid or expired token: {exc}") from exc

    if payload.get("typ") != "txn":
        raise ValueError("Token type mismatch — expected 'txn'.")

    transaction_id: str | None = payload.get("sub")
    if not transaction_id:
        raise ValueError("Token missing subject claim.")

    return transaction_id
