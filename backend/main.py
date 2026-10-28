from contextlib import asynccontextmanager

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from core.config import settings
from core.constants import CALC_ENGINE_VERSION
from db.database import init_db
from api.v1.routes import calculate, chat, health, transactions


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(
    title="RBridge API",
    version=CALC_ENGINE_VERSION,
    description="RBridge taxes & insurance second-lien engine",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, prefix="/api/v1", tags=["health"])
app.include_router(calculate.router, prefix="/api/v1", tags=["calculate"])
app.include_router(transactions.router, prefix="/api/v1", tags=["transactions"])
app.include_router(chat.router, prefix="/api/v1", tags=["chat"])


# Keep a standalone startup() for test fixtures that call it directly
async def startup():
    await init_db()


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=settings.api_port, reload=True)
