from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # App
    APP_NAME: str = "IT Helpdesk AI"
    DEBUG: bool = False

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5433/helpdesk"
    DATABASE_URL_SYNC: str = "postgresql://postgres:postgres@localhost:5433/helpdesk"

    # Groq
    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "llama-3.3-70b-versatile"

    # Gemini
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-1.5-flash"

    # ChromaDB
    CHROMA_COLLECTION: str = "helpdesk_kb"

    # Redis
    REDIS_URL: str = "redis://localhost:6379"

    # Kafka
    KAFKA_BOOTSTRAP_SERVERS: str = "localhost:9092"
    KAFKA_ENABLED: bool = False

    # Auth
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24

    # Escalation
    ESCALATION_THRESHOLD: float = 0.70

    # HuggingFace datasets
    BITEXT_DATASET: str = "bitext/Bitext-customer-support-llm-chatbot-training-dataset"
    TICKETS_DATASET: str = "Console-AI/IT-helpdesk-synthetic-tickets"

    class Config:
        env_file = ".env"
        extra = "ignore"       # ← this line is the actual fix


settings = Settings()