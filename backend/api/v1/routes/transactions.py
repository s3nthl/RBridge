"""
Transaction routes.

POST /api/v1/transactions/initiate      → validate, run scenario + risk, persist, return token
GET  /api/v1/transactions/{token}       → verify token, return full result
POST /api/v1/transactions/{token}/close → close the transaction (link stops working)
"""

import json
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from api.v1.routes.common import audit, get_active_transaction, meta, new_request_id
from core.calc_engine import run_scenario
from core.config import settings
from core.constants import CALC_ENGINE_VERSION, MAX_ECONOMIC_DTI
from core.email_service import send_lo_notification
from core.risk import assess
from core.schemas import (
    ApiResponse,
    ErrorDetail,
    InitiateRequest,
    InitiateResponse,
    RiskAssessment,
    ScenarioInput,
    ScenarioResult,
    TransactionResponse,
)
from core.token_service import issue_transaction_token, verify_transaction_token
from core.validation import validate_borrower, validate_scenario
from db.database import get_db
from db.models import Transaction

router = APIRouter()


@router.post("/transactions/initiate", response_model=ApiResponse)
async def initiate(req: InitiateRequest, db: AsyncSession = Depends(get_db)) -> ApiResponse:
    request_id = new_request_id()
    response_meta = meta(request_id, req.tenant_id)

    async def reject(errors: list[ErrorDetail]) -> ApiResponse:
        audit(db, tenant_id=req.tenant_id, event="initiate_rejected", request_id=request_id,
              details=json.dumps([e.model_dump() for e in errors]))
        await db.commit()
        return ApiResponse(success=False, meta=response_meta, errors=errors)

    errors = validate_scenario(req.scenario) + validate_borrower(req.borrower)
    if errors:
        return await reject(errors)

    result = run_scenario(req.scenario)
    risk = assess(result, req.borrower)

    # Underwriting rule: test DTI on the payment after funding, not only during it.
    if risk.dti_after_funding > MAX_ECONOMIC_DTI:
        return await reject([ErrorDetail(
            code="DTI_TOO_HIGH",
            field="income",
            message=(f"Debt-to-income after the funding period ({risk.dti_after_funding:.2%}) "
                     f"exceeds the maximum {MAX_ECONOMIC_DTI:.0%}."),
        )])

    token, expires_at = issue_transaction_token(request_id)  # request_id doubles as txn id
    db.add(Transaction(
        id=request_id,
        tenant_id=req.tenant_id,
        borrower_ref=req.borrower_ref,
        status="active",
        calc_version=CALC_ENGINE_VERSION,
        inputs_snapshot={
            "scenario": json.loads(req.scenario.model_dump_json()),
            "borrower": json.loads(req.borrower.model_dump_json()),
        },
        calc_result={
            "result": json.loads(result.model_dump_json()),
            "risk": json.loads(risk.model_dump_json()),
        },
        expires_at=expires_at,
    ))
    audit(db, tenant_id=req.tenant_id, event="initiate", request_id=request_id, transaction_id=request_id)
    await db.commit()

    base_url = settings.public_frontend_url
    if req.lo_email:
        # Never raises; email failure must not block the result.
        send_lo_notification(
            lo_email=req.lo_email,
            borrower_ref=req.borrower_ref,
            avg_monthly_relief=result.avg_monthly_relief,
            chat_url=f"{base_url}/chat/{token}",
        )

    year1 = result.years[0]
    return ApiResponse(
        success=True,
        data=InitiateResponse(
            transaction_id=request_id,
            transaction_token=token,
            results_url=f"{base_url}/results/{token}",
            avg_monthly_relief=result.avg_monthly_relief,
            payment_with_second_year1=year1.payment_with_second,
            payment_without_second_year1=year1.payment_without_second,
            risk_band=risk.band,
        ),
        meta=response_meta,
    )


@router.get("/transactions/{token}", response_model=ApiResponse)
async def get_transaction(token: str, db: AsyncSession = Depends(get_db)) -> ApiResponse:
    request_id = new_request_id()
    txn = await get_active_transaction(token, db)

    audit(db, tenant_id=txn.tenant_id, event="fetch", request_id=request_id, transaction_id=txn.id)
    await db.commit()

    return ApiResponse(
        success=True,
        data=TransactionResponse(
            transaction_id=txn.id,
            tenant_id=txn.tenant_id,
            borrower_ref=txn.borrower_ref,
            status=txn.status,
            expires_at=txn.expires_at,
            scenario_input=ScenarioInput.model_validate(txn.inputs_snapshot["scenario"]),
            result=ScenarioResult.model_validate(txn.calc_result["result"]),
            risk=RiskAssessment.model_validate(txn.calc_result["risk"]),
        ),
        meta=meta(request_id, txn.tenant_id),
    )


@router.post("/transactions/{token}/close", response_model=ApiResponse)
async def close_transaction(token: str, db: AsyncSession = Depends(get_db)) -> ApiResponse:
    request_id = new_request_id()

    try:
        transaction_id = verify_transaction_token(token)
    except ValueError as exc:
        raise HTTPException(status_code=401, detail=str(exc))

    result = await db.execute(select(Transaction).where(Transaction.id == transaction_id))
    txn = result.scalar_one_or_none()
    if txn is None:
        raise HTTPException(status_code=404, detail="Transaction not found.")
    if txn.status == "closed":
        raise HTTPException(status_code=409, detail="Transaction already closed.")

    txn.status = "closed"
    txn.closed_at = datetime.now(timezone.utc)

    audit(db, tenant_id=txn.tenant_id, event="close", request_id=request_id, transaction_id=transaction_id)
    await db.commit()

    return ApiResponse(success=True, data={"closed": True}, meta=meta(request_id, txn.tenant_id))
