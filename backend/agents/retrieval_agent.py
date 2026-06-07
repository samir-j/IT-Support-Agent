"""
Agent 1: Retrieval Agent
Searches the ChromaDB knowledge base for relevant documents.
"""
import logging
from typing import TypedDict, List, Dict, Any

from utils.vector_store import similarity_search

logger = logging.getLogger(__name__)


class RetrievalResult(TypedDict):
    query: str
    documents: List[Dict[str, Any]]
    top_content: str
    confidence: float


async def retrieval_agent(query: str, n_results: int = 5) -> RetrievalResult:
    """
    Searches the knowledge base for relevant context.
    Returns top documents and a confidence score based on distance.
    """
    logger.info(f"🔍 Retrieval Agent searching for: {query[:80]}...")

    docs = await similarity_search(query, n_results=n_results)

    if not docs:
        return {
            "query": query,
            "documents": [],
            "top_content": "",
            "confidence": 0.0,
        }

    # Cosine distance: 0 = identical, 2 = opposite. Score = 1 - distance/2
    avg_distance = sum(d["distance"] for d in docs) / len(docs)
    confidence = max(0.0, min(1.0, 1.0 - avg_distance / 2))

    # Build context string from top documents
    context_parts = []
    for i, doc in enumerate(docs[:3]):
        context_parts.append(f"[Source {i+1}]: {doc['content']}")
    top_content = "\n\n".join(context_parts)

    logger.info(f" Retrieval Agent found {len(docs)} docs. Confidence: {confidence:.2f}")
    return {
        "query": query,
        "documents": docs,
        "top_content": top_content,
        "confidence": confidence,
    }
