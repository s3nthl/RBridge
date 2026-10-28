"""
Chat routes — explains a saved result to the loan officer. Never in the calc path.

POST /api/v1/chat/{token}/messages    → send a message, get AI response
GET  /api/v1/chat/{token}/messages    → load conversation history
GET  /api/v1/chat/{token}/suggestions → 3 suggested questions
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from api.v1.routes.common import audit, get_active_transaction, meta, new_request_id
from core.chat_service import generate_response, generate_suggestions
from core.schemas import (
    ApiResponse,
    ChatHistoryResponse,
    ChatMessageRequest,
    ChatMessageResponse,
    RiskAssessment,
    ScenarioResult,
    SuggestionsResponse,
)
from db.database import get_db
from db.models import ChatMessage, Transaction

router = APIRouter()


def _stored(txn: Transaction) -> tuple[ScenarioResult, RiskAssessment]:
    return (
        ScenarioResult.model_validate(txn.calc_result["result"]),
        RiskAssessment.model_validate(txn.calc_result["risk"]),
    )


@router.post("/chat/{token}/messages", response_model=ApiResponse)
async def post_message(
    token: str,
    body: ChatMessageRequest,
    db: AsyncSession = Depends(get_db),
) -> ApiResponse:
    request_id = new_request_id()
    txn = await get_active_transaction(token, db)
    result, risk = _stored(txn)

    hist = await db.execute(
        select(ChatMessage).where(ChatMessage.transaction_id == txn.id).order_by(ChatMessage.created_at)
    )
    history = [{"role": r.role, "content": r.content} for r in hist.scalars().all()]

    db.add(ChatMessage(transaction_id=txn.id, tenant_id=txn.tenant_id, role="user", content=body.content))
    await db.flush()

    try:
        ai_text = generate_response(
            borrower_ref=txn.borrower_ref, result=result, risk=risk,
            history=history, user_message=body.content,
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc))

    ai_msg = ChatMessage(transaction_id=txn.id, tenant_id=txn.tenant_id, role="assistant", content=ai_text)
    db.add(ai_msg)
    # Audit the event only, never message content.
    audit(db, tenant_id=txn.tenant_id, event="chat_message", request_id=request_id, transaction_id=txn.id)
    await db.commit()

    return ApiResponse(
        success=True,
        data=ChatMessageResponse(id=ai_msg.id, role="assistant", content=ai_text, created_at=ai_msg.created_at),
        meta=meta(request_id, txn.tenant_id),
    )


@router.get("/chat/{token}/messages", response_model=ApiResponse)
async def get_messages(token: str, db: AsyncSession = Depends(get_db)) -> ApiResponse:
    request_id = new_request_id()
    txn = await get_active_transaction(token, db)

    rows = await db.execute(
        select(ChatMessage).where(ChatMessage.transaction_id == txn.id).order_by(ChatMessage.created_at)
    )
    return ApiResponse(
        success=True,
        data=ChatHistoryResponse(
            transaction_id=txn.id,
            messages=[
                ChatMessageResponse(id=r.id, role=r.role, content=r.content, created_at=r.created_at)
                for r in rows.scalars().all()
            ],
        ),
        meta=meta(request_id, txn.tenant_id),
    )


@router.get("/chat/{token}/suggestions", response_model=ApiResponse)
async def get_suggestions(token: str, db: AsyncSession = Depends(get_db)) -> ApiResponse:
    request_id = new_request_id()
    txn = await get_active_transaction(token, db)
    result, risk = _stored(txn)

    return ApiResponse(
        success=True,
        data=SuggestionsResponse(
            transaction_id=txn.id,
            suggestions=generate_suggestions(borrower_ref=txn.borrower_ref, result=result, risk=risk),
        ),
        meta=meta(request_id, txn.tenant_id),
    )
