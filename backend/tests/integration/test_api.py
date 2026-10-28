"""
API integration tests: /calculate, transaction lifecycle, guardrails, chat auth.
Uses the Portland default case from the partner Dev Spec.
"""

import pytest
from httpx import ASGITransport, AsyncClient

from main import app, startup


@pytest.fixture(autouse=True, scope="session")
async def init_database():
    await startup()


@pytest.fixture
async def client():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c


PORTLAND = {
    "purchase_price": 600000,
    "first_lien_ltv": 0.8,
    "first_lien_rate": 0.071,
    "tax_rate": 0.01,
    "insurance_annual": 1600,
    "second_lien_rate": 0.08,
    "refi_rate": 0.061,
}
BORROWER = {"income": 150000, "monthly_debts": 400, "credit_score": 740, "employment_type": "W2"}


def initiate_payload(**overrides) -> dict:
    payload = {
        "tenant_id": "demo-cu",
        "borrower_ref": "TEST-001",
        "scenario": dict(PORTLAND),
        "borrower": dict(BORROWER),
    }
    for key, value in overrides.items():
        payload[key] = {**payload[key], **value} if isinstance(value, dict) else value
    return payload


async def test_calculate_portland(client: AsyncClient):
    r = await client.post("/api/v1/calculate", json={"tenant_id": "demo-cu", "scenario": PORTLAND})
    body = r.json()
    assert body["success"] is True
    s = body["data"]["scenario"]
    assert s["calc_version"] == "2.0.0"
    assert s["first_lien_pi"] == "3225.753406"
    assert s["second_lien_balance"] == "49569.725005"
    assert len(s["years"]) == 5
    assert len(s["months"]) == 60
    assert body["meta"]["tenant_id"] == "demo-cu"


async def test_calculate_rejects_low_down_payment(client: AsyncClient):
    r = await client.post("/api/v1/calculate",
                          json={"tenant_id": "demo-cu", "scenario": {**PORTLAND, "first_lien_ltv": 0.9}})
    body = r.json()
    assert body["success"] is False
    codes = {e["code"] for e in body["errors"]}
    assert "DOWN_PAYMENT_TOO_LOW" in codes
    assert "COMMITMENT_CLTV_TOO_HIGH" in codes


async def test_calculate_rejects_tax_above_max(client: AsyncClient):
    r = await client.post("/api/v1/calculate",
                          json={"tenant_id": "demo-cu", "scenario": {**PORTLAND, "tax_rate": 0.02}})
    assert r.json()["errors"][0]["code"] == "TAX_RATE_ABOVE_MAX"


async def test_transaction_lifecycle(client: AsyncClient):
    r = await client.post("/api/v1/transactions/initiate", json=initiate_payload())
    body = r.json()
    assert body["success"] is True, body
    data = body["data"]
    assert data["avg_monthly_relief"] == "678.263748"
    assert data["risk_band"] in ("Low", "Moderate", "Elevated", "High")
    assert data["results_url"].startswith("http://localhost:3000/results/")
    token = data["transaction_token"]

    r = await client.get(f"/api/v1/transactions/{token}")
    txn = r.json()["data"]
    assert txn["result"]["option_b_pmi_required"] is True
    assert txn["scenario_input"]["purchase_price"] == "600000"
    assert [f["name"] for f in txn["risk"]["factors"]][0] == "credit_score"

    r = await client.post(f"/api/v1/transactions/{token}/close")
    assert r.json()["data"]["closed"] is True
    assert (await client.get(f"/api/v1/transactions/{token}")).status_code == 410
    assert (await client.post(f"/api/v1/transactions/{token}/close")).status_code == 409


@pytest.mark.parametrize("borrower, code", [
    ({"credit_score": 560}, "CREDIT_SCORE_TOO_LOW"),
    ({"income": 20000}, "INCOME_TOO_LOW"),
    ({"income": 60000, "monthly_debts": 1500}, "DTI_TOO_HIGH"),
])
async def test_initiate_guardrails(client: AsyncClient, borrower: dict, code: str):
    r = await client.post("/api/v1/transactions/initiate", json=initiate_payload(borrower=borrower))
    body = r.json()
    assert body["success"] is False
    assert code in {e["code"] for e in body["errors"]}


async def test_bad_token_is_401(client: AsyncClient):
    assert (await client.get("/api/v1/transactions/not-a-token")).status_code == 401
    assert (await client.get("/api/v1/chat/not-a-token/messages")).status_code == 401


async def test_chat_dev_mode_reply_and_suggestions(client: AsyncClient):
    token = (await client.post("/api/v1/transactions/initiate", json=initiate_payload())).json()["data"]["transaction_token"]

    r = await client.post(f"/api/v1/chat/{token}/messages", json={"content": "Why is year 1 lower?"})
    assert "Dev mode" in r.json()["data"]["content"]

    history = (await client.get(f"/api/v1/chat/{token}/messages")).json()["data"]["messages"]
    assert [m["role"] for m in history] == ["user", "assistant"]

    suggestions = (await client.get(f"/api/v1/chat/{token}/suggestions")).json()["data"]["suggestions"]
    assert len(suggestions) == 3


async def test_health(client: AsyncClient):
    assert (await client.get("/api/v1/health")).json() == {"status": "ok", "calc_version": "2.0.0"}
