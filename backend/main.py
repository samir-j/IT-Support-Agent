from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging

from routers import chat, tickets, documents, analytics, auth
from db.database import init_db
from utils.vector_store import init_vector_store
from utils.dataset_loader import load_datasets_on_startup

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(" Starting IT Helpdesk AI System...")
    await init_db()
    await init_vector_store()
    await load_datasets_on_startup()
    logger.info(" System ready!")
    yield
    logger.info("Shutting down...")


app = FastAPI(
    title="IT Helpdesk AI",
    description="Multi-Agent RAG-powered IT Support System",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173", "http://localhost:5433"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(chat.router, prefix="/api/chat", tags=["chat"])
app.include_router(tickets.router, prefix="/api/tickets", tags=["tickets"])
app.include_router(documents.router, prefix="/api/documents", tags=["documents"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["analytics"])


@app.get("/")
async def root():
    return {
        "app": "IT Helpdesk AI",
        "description": "Multi-Agent RAG-powered IT Support System",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health",
        "api": "/api",
    }


@app.get("/health")
async def health_check():
    return {"status": "healthy", "version": "1.0.0"}
