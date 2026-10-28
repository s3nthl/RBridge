"""
EmailService — sends LO notification email via Resend.

Falls back to console logging when:
  - RESEND_API_KEY is not set
  - RESEND_LOG=true in settings

Never logs lo_email or token in plaintext.
"""
import logging
from decimal import Decimal

import resend

from core.config import settings

logger = logging.getLogger(__name__)


def send_lo_notification(
    *,
    lo_email: str,
    borrower_ref: str,
    avg_monthly_relief: Decimal,
    chat_url: str,
) -> None:
    """
    Fire transactional email to loan officer.
    Swallows exceptions — email failure must never block the calc flow.
    """
    subject = f"RBridge analysis ready — App #{borrower_ref}"
    relief_fmt = f"${avg_monthly_relief:,.0f}"

    html_body = f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:system-ui,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#111;border:1px solid #222;border-radius:12px;overflow:hidden;">
    <div style="padding:32px;border-bottom:1px solid #222;">
      <p style="margin:0;color:#0f766e;font-size:12px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;">RBridge</p>
      <h1 style="margin:12px 0 0;color:#fff;font-size:24px;font-weight:700;">Analysis ready</h1>
    </div>
    <div style="padding:32px;">
      <p style="color:#9ca3af;font-size:14px;margin:0 0 8px;">App #{borrower_ref}</p>
      <p style="color:#fff;font-size:36px;font-weight:700;margin:0 0 4px;">{relief_fmt}/mo lower</p>
      <p style="color:#6b7280;font-size:14px;margin:0 0 32px;">average payment relief during funding</p>
      <a href="{chat_url}"
         style="display:inline-block;padding:14px 28px;background:#0f766e;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px;">
        View analysis &amp; chat →
      </a>
      <p style="color:#4b5563;font-size:12px;margin:32px 0 0;">
        This link expires when the loan decision is made.
      </p>
    </div>
  </div>
</body>
</html>"""

    # Dev mode: log instead of send
    if not settings.resend_api_key or settings.resend_log:
        logger.info(
            "EMAIL_DEV_LOG | to=[redacted] | subject=%s | chat_url=%s",
            subject,
            chat_url,
        )
        return

    try:
        resend.api_key = settings.resend_api_key
        resend.Emails.send({
            "from": settings.resend_from,
            "to": [lo_email],
            "subject": subject,
            "html": html_body,
        })
    except Exception:
        # Email failure must never block the calc response
        logger.exception("Failed to send LO notification email")
