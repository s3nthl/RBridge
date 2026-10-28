from fastapi import APIRouter
from pydantic import BaseModel

from core.constants import CALC_ENGINE_VERSION

router = APIRouter()


class HealthResponse(BaseModel):
    status: str
    calc_version: str


@router.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    return HealthResponse(status="ok", calc_version=CALC_ENGINE_VERSION)
