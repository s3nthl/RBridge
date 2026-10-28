"""
POST /api/v1/calculate — stateless scenario run for the live calculator.

No borrower data, nothing persisted except the audit row.
"""

import json

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from api.v1.routes.common import audit, meta, new_request_id
from core.calc_engine import run_scenario
from core.schemas import ApiResponse, CalculateRequest, CalculateResponse
from core.validation import validate_scenario
from db.database import get_db

router = APIRouter()


@router.post("/calculate", response_model=ApiResponse)
async def calculate(req: CalculateRequest, db: AsyncSession = Depends(get_db)) -> ApiResponse:
    request_id = new_request_id()
    response_meta = meta(request_id, req.tenant_id)

    errors = validate_scenario(req.scenario)
    if errors:
        audit(db, tenant_id=req.tenant_id, event="calculate_rejected", request_id=request_id,
              details=json.dumps([e.model_dump() for e in errors]))
        await db.commit()
        return ApiResponse(success=False, meta=response_meta, errors=errors)

    result = run_scenario(req.scenario)
    audit(db, tenant_id=req.tenant_id, event="calculate", request_id=request_id,
          details=req.scenario.model_dump_json())
    await db.commit()
    return ApiResponse(success=True, data=CalculateResponse(scenario=result), meta=response_meta)
