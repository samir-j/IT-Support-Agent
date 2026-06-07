import chromadb
from chromadb.config import Settings as ChromaSettings
import logging
from typing import List, Dict, Any
import hashlib

logger = logging.getLogger(__name__)

# Global ChromaDB client
_client = None
_collection = None


async def init_vector_store():
    global _client, _collection
    try:
        # Use persistent local ChromaDB (no server needed for dev)
        _client = chromadb.PersistentClient(
            path="./chroma_data",
            settings=ChromaSettings(anonymized_telemetry=False),
        )
        _collection = _client.get_or_create_collection(
            name="helpdesk_kb",
            metadata={"hnsw:space": "cosine"},
        )
        logger.info(f"ChromaDB ready. Documents in collection: {_collection.count()}")
    except Exception as e:
        logger.error(f"ChromaDB init failed: {e}")
        raise


def get_collection():
    return _collection


async def add_documents(texts: List[str], metadatas: List[Dict], ids: List[str] = None):
    """Add documents to ChromaDB using built-in embedding."""
    collection = get_collection()
    if not ids:
        ids = [hashlib.md5(t.encode()).hexdigest()[:16] for t in texts]

    # ChromaDB handles embedding via default embedding function
    collection.upsert(documents=texts, metadatas=metadatas, ids=ids)
    logger.info(f"Added {len(texts)} documents to vector store")


async def similarity_search(query: str, n_results: int = 5, where: Dict = None) -> List[Dict[str, Any]]:
    """Search for similar documents."""
    collection = get_collection()
    kwargs = {"query_texts": [query], "n_results": min(n_results, max(1, collection.count()))}
    if where:
        kwargs["where"] = where

    results = collection.query(**kwargs)

    docs = []
    if results["documents"] and results["documents"][0]:
        for i, doc in enumerate(results["documents"][0]):
            docs.append(
                {
                    "content": doc,
                    "metadata": results["metadatas"][0][i] if results["metadatas"] else {},
                    "distance": results["distances"][0][i] if results["distances"] else 1.0,
                    "id": results["ids"][0][i] if results["ids"] else "",
                }
            )
    return docs


def get_doc_count() -> int:
    collection = get_collection()
    return collection.count() if collection else 0
