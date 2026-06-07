from openai import AsyncOpenAI
from config import settings
import logging

logger = logging.getLogger(__name__)

_client = None


def get_llm_client() -> AsyncOpenAI:
    global _client
    if not _client:
        _client = AsyncOpenAI(
            api_key=settings.GROQ_API_KEY,
            base_url="https://api.groq.com/openai/v1",
        )
    return _client


async def chat_completion(
    messages: list,
    model: str = None,
    temperature: float = 0.3,
    max_tokens: int = 1000,
) -> str:
    """Call Groq LLM via OpenAI-compatible API."""
    client = get_llm_client()
    model = model or settings.GROQ_MODEL
    try:
        response = await client.chat.completions.create(
            model=model,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
        )
        return response.choices[0].message.content
    except Exception as e:
        logger.error(f"LLM call failed: {e}")
        raise
