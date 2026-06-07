from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional, List
import uuid
from datetime import datetime

from db.database import get_db, Conversation, Message, User
from agents.orchestrator import run_agent_graph
from agents.summary_agent import summary_agent
from utils.auth import get_current_user

router = APIRouter()


class ChatRequest(BaseModel):
    message: str
    conversation_id: Optional[str] = None
    create_ticket: bool = False


class ChatResponse(BaseModel):
    conversation_id: str
    message_id: str
    response: str
    agent_used: str
    confidence: float
    sources: list
    ticket: Optional[dict] = None
    needs_escalation: bool = False


@router.post("/message", response_model=ChatResponse)
async def send_message(
    req: ChatRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Get or create conversation
    conversation_id = req.conversation_id
    if conversation_id:
        result = await db.execute(select(Conversation).where(Conversation.id == conversation_id))
        conversation = result.scalar_one_or_none()
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")
    else:
        conversation = Conversation(
            id=str(uuid.uuid4()),
            user_id=current_user.id,
            title=req.message[:60],
        )
        db.add(conversation)
        await db.flush()
        conversation_id = conversation.id

    # Save user message
    user_msg = Message(
        id=str(uuid.uuid4()),
        conversation_id=conversation_id,
        role="user",
        content=req.message,
    )
    db.add(user_msg)
    await db.flush()

    # Get chat history
    history_result = await db.execute(
        select(Message)
        .where(Message.conversation_id == conversation_id)
        .order_by(Message.created_at)
    )
    all_messages = history_result.scalars().all()
    chat_history = [{"role": m.role, "content": m.content} for m in all_messages[:-1]]

    # Run agent graph
    result = await run_agent_graph(
        query=req.message,
        conversation_id=conversation_id,
        user_id=current_user.id,
        chat_history=chat_history,
        db=db,
        create_ticket=req.create_ticket,
    )

    # Save assistant message
    assistant_msg = Message(
        id=str(uuid.uuid4()),
        conversation_id=conversation_id,
        role="assistant",
        content=result["final_response"],
        agent_used=result["agent_used"],
        confidence=result["confidence"],
        sources=result["sources"],
    )
    db.add(assistant_msg)

    # Update conversation title and timestamp
    conversation.updated_at = datetime.utcnow()
    if len(all_messages) == 1:
        conversation.title = req.message[:60]

    await db.commit()

    return ChatResponse(
        conversation_id=conversation_id,
        message_id=assistant_msg.id,
        response=result["final_response"],
        agent_used=result["agent_used"],
        confidence=result["confidence"],
        sources=result["sources"],
        ticket=result.get("ticket_info"),
        needs_escalation=result.get("needs_escalation", False),
    )


@router.get("/conversations")
async def list_conversations(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Conversation)
        .where(Conversation.user_id == current_user.id)
        .order_by(Conversation.updated_at.desc())
    )
    conversations = result.scalars().all()
    return [
        {"id": c.id, "title": c.title, "created_at": c.created_at, "updated_at": c.updated_at}
        for c in conversations
    ]


@router.get("/conversations/{conversation_id}/messages")
async def get_messages(
    conversation_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Message)
        .where(Message.conversation_id == conversation_id)
        .order_by(Message.created_at)
    )
    messages = result.scalars().all()
    return [
        {
            "id": m.id,
            "role": m.role,
            "content": m.content,
            "agent_used": m.agent_used,
            "confidence": m.confidence,
            "sources": m.sources,
            "created_at": m.created_at,
        }
        for m in messages
    ]


@router.post("/conversations/{conversation_id}/summarize")
async def summarize_conversation(
    conversation_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Message)
        .where(Message.conversation_id == conversation_id)
        .order_by(Message.created_at)
    )
    messages = result.scalars().all()
    if not messages:
        raise HTTPException(status_code=404, detail="No messages found")

    msg_list = [{"role": m.role, "content": m.content} for m in messages]
    summary = await summary_agent(msg_list)
    return summary


@router.delete("/conversations/{conversation_id}")
async def delete_conversation(
    conversation_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Conversation)
        .where(Conversation.id == conversation_id, Conversation.user_id == current_user.id)
    )
    conversation = result.scalar_one_or_none()
    if not conversation:
        raise HTTPException(status_code=404, detail="Not found")
    await db.delete(conversation)
    await db.commit()
    return {"deleted": True}
