from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
import uuid
import hashlib

from db.database import get_db, KnowledgeDocument, User
from utils.vector_store import add_documents, get_doc_count
from utils.auth import get_current_user

router = APIRouter()


@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Upload a text or PDF document to the knowledge base."""
    if not file.filename.endswith((".txt", ".md", ".pdf")):
        raise HTTPException(status_code=400, detail="Only .txt, .md, .pdf files supported")

    content_bytes = await file.read()

    # Handle PDF extraction
    if file.filename.endswith(".pdf"):
        try:
            import io
            import pypdf
            reader = pypdf.PdfReader(io.BytesIO(content_bytes))
            text = "\n".join(page.extract_text() or "" for page in reader.pages)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"PDF parse error: {e}")
    else:
        text = content_bytes.decode("utf-8", errors="ignore")

    if not text.strip():
        raise HTTPException(status_code=400, detail="Document appears to be empty")

    # Chunk the text
    chunks = _chunk_text(text, chunk_size=500, overlap=50)

    # Store in ChromaDB
    ids = [hashlib.md5(f"{file.filename}:{i}:{c[:50]}".encode()).hexdigest()[:16] for i, c in enumerate(chunks)]
    metadatas = [{"source": file.filename, "type": "uploaded_doc", "chunk": i} for i in range(len(chunks))]
    await add_documents(chunks, metadatas, ids)

    # Store metadata in PostgreSQL
    doc = KnowledgeDocument(
        id=str(uuid.uuid4()),
        title=file.filename,
        content=text[:2000],
        source="upload",
        chunk_count=len(chunks),
    )
    db.add(doc)
    await db.commit()

    return {
        "filename": file.filename,
        "chunks": len(chunks),
        "total_docs_in_kb": get_doc_count(),
    }


@router.get("/")
async def list_documents(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(KnowledgeDocument).order_by(KnowledgeDocument.created_at.desc()))
    docs = result.scalars().all()
    return [
        {"id": d.id, "title": d.title, "chunk_count": d.chunk_count, "source": d.source, "created_at": d.created_at}
        for d in docs
    ]


@router.get("/stats")
async def kb_stats(current_user: User = Depends(get_current_user)):
    return {"total_vectors": get_doc_count()}


def _chunk_text(text: str, chunk_size: int = 500, overlap: int = 50) -> list:
    words = text.split()
    chunks = []
    for i in range(0, len(words), chunk_size - overlap):
        chunk = " ".join(words[i:i + chunk_size])
        if chunk.strip():
            chunks.append(chunk)
    return chunks
