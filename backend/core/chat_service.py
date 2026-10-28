"""
ChatService — explains one saved result to a loan officer via OpenRouter.

Rules:
- The AI never makes loan decisions or eligibility calls.
- The system prompt holds only this transaction's computed numbers; the AI
  explains them and never produces numbers that feed a calculation.
- Max 500 tokens per response.
- Returns a canned reply when non-essential model calls are disabled.
"""
import logging

from core.config import settings
from core.schemas import RiskAssessment, ScenarioResult

logger = logging.getLogger(__name__)

_OPENROUTER_BASE = "https://openrouter.ai/api/v1"

# openrouter/auto routes each request to the cheapest capable model
CHAT_MODEL = "openrouter/auto"
SUGGESTIONS_MODEL = "openrouter/auto"
CHAT_MAX_TOKENS = 500
SUGGESTIONS_MAX_TOKENS = 150


def _money(v) -> str:
    return f"${v:,.0f}"


def _pct(v) -> str:
    return f"{v * 100:.1f}%"


def _build_system_prompt(borrower_ref: str, r: ScenarioResult, risk: RiskAssessment) -> str:
    year_lines = "\n".join(
        f"- Year {y.year}: without the second {_money(y.payment_without_second)}/mo, "
        f"with it {_money(y.payment_with_second)}/mo, relief {_money(y.relief_monthly)} ({_pct(y.relief_pct)})"
        for y in r.years
    )
    cap_line = (
        f"The cap was reached in month {r.cap_reached_month}; the borrower covers some T&I for "
        f"{r.shortfall_months} month(s)." if r.cap_reached_month else "The cap was not reached."
    )
    be = r.option_b_breakeven_rate
    be_line = (
        f"Break-even refinance rate {_pct(be)} ({_pct(r.option_b_breakeven_rate_drop)} below the current first)."
        if be is not None else "No refinance rate breaks even."
    )
    pmi_line = (
        f"PMI applies, {_money(r.option_b_pmi_monthly)}/mo" if r.option_b_pmi_required else "no PMI"
    )
    return f"""You are an RBridge analyst. This session is for application #{borrower_ref}.

RBridge is a second lien that pays the borrower's property taxes and homeowner insurance during a funding
period, so the borrower pays only first-lien principal and interest. Second-lien interest accrues into its
balance. After funding, Option A keeps the first and amortizes the second; Option B refinances both into
one new first.

Exact numbers for this transaction (do not recompute or invent others):
- First lien {_money(r.first_lien_amount)}, P&I {_money(r.first_lien_pi)}/mo
{year_lines}
- Average relief {_money(r.avg_monthly_relief)}/mo ({_pct(r.avg_relief_pct)})
- Second-lien balance at end of funding {_money(r.second_lien_balance)}, including {_money(r.total_accrued_interest)} accrued interest
- Cap {_money(r.cap_amount)}, room left {_money(r.cap_room)}. {cap_line}
- Option A: second-lien payment {_money(r.option_a_payment)}/mo, total payment {_money(r.option_a_total_payment)}/mo
- Option B: new first {_money(r.option_b_new_loan)} ({_pct(r.option_b_ltv)} of price), payment {_money(r.option_b_payment)}/mo, {pmi_line}
- {be_line}
- DTI during funding {_pct(risk.dti_during_funding)}, after funding {_pct(risk.dti_after_funding)}
- Risk score {risk.score}/100 ({risk.band})

Answer questions about this analysis only. Be direct, use plain English, and show the math when explaining
a number. Never make loan decisions or eligibility recommendations. Keep answers to 2-4 sentences unless
more detail is genuinely needed."""


def _get_client():
    """OpenAI-compatible client pointed at OpenRouter."""
    import openai

    return openai.OpenAI(
        base_url=_OPENROUTER_BASE,
        api_key=settings.openrouter_api_key,
        default_headers={"HTTP-Referer": settings.public_frontend_url, "X-Title": "RBridge"},
    )


def generate_response(
    *,
    borrower_ref: str,
    result: ScenarioResult,
    risk: RiskAssessment,
    history: list[dict],   # [{"role": "user"|"assistant", "content": str}]
    user_message: str,
) -> str:
    """Return the assistant reply. Raises RuntimeError if the API key is missing."""
    if settings.disable_non_essential_model_calls:
        return (
            f"[Dev mode — AI disabled] I would answer: '{user_message}'. "
            f"This scenario lowers the payment by {_money(result.avg_monthly_relief)}/mo on average. "
            f"Set DISABLE_NON_ESSENTIAL_MODEL_CALLS=0 to enable live AI."
        )
    if not settings.openrouter_api_key:
        raise RuntimeError("OPENROUTER_API_KEY not set")

    response = _get_client().chat.completions.create(
        model=CHAT_MODEL,
        max_tokens=CHAT_MAX_TOKENS,
        messages=[
            {"role": "system", "content": _build_system_prompt(borrower_ref, result, risk)},
            *history,
            {"role": "user", "content": user_message},
        ],
    )
    return response.choices[0].message.content


def generate_suggestions(*, borrower_ref: str, result: ScenarioResult, risk: RiskAssessment) -> list[str]:
    """Three suggested questions; falls back to defaults if AI is off or fails."""
    defaults = [
        f"How is the {_money(result.avg_monthly_relief)}/mo average relief calculated?",
        "What happens to the payment when the funding period ends?",
        "How do Option A and Option B compare for this borrower?",
    ]
    if settings.disable_non_essential_model_calls or not settings.openrouter_api_key:
        return defaults

    prompt = f"""Application #{borrower_ref}: average relief {_money(result.avg_monthly_relief)}/mo,
second-lien balance at end {_money(result.second_lien_balance)}, cap {"reached" if result.cap_reached_month else "not reached"},
refinance LTV {_pct(result.option_b_ltv)}, risk {risk.band}.

Generate exactly 3 short questions a loan officer would ask about this analysis.
Return ONLY the 3 questions, one per line, no numbering."""
    try:
        response = _get_client().chat.completions.create(
            model=SUGGESTIONS_MODEL,
            max_tokens=SUGGESTIONS_MAX_TOKENS,
            messages=[{"role": "user", "content": prompt}],
        )
        lines = [ln.strip() for ln in response.choices[0].message.content.strip().splitlines() if ln.strip()]
        if len(lines) >= 3:
            return lines[:3]
    except Exception:
        logger.exception("Failed to generate suggestions via OpenRouter")
    return defaults
