from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import uuid

from db.database import get_db, Ticket, TicketMessage, User
from utils.auth import get_current_user, get_current_admin

router = APIRouter()


class UpdateTicketRequest(BaseModel):
    status: Optional[str] = None
    assigned_to: Optional[str] = None
    resolution: Optional[str] = None
    priority: Optional[str] = None


class SendMessageRequest(BaseModel):
    content: str


@router.get("/")
async def list_tickets(
    status: Optional[str] = None,
    priority: Optional[str] = None,
    category: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = select(Ticket)
    if current_user.role == "user":
        query = query.where(Ticket.requester_id == current_user.id)
    if status:
        query = query.where(Ticket.status == status)
    if priority:
        query = query.where(Ticket.priority == priority)
    if category:
        query = query.where(Ticket.category == category)

    query = query.order_by(Ticket.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    tickets = result.scalars().all()

    return [
        {
            "id": t.id,
            "ticket_number": t.ticket_number,
            "subject": t.subject,
            "description": t.description,
            "priority": t.priority,
            "category": t.category,
            "status": t.status,
            "escalated": t.escalated,
            "assigned_to": t.assigned_to,
            "created_at": t.created_at,
            "updated_at": t.updated_at,
            "resolved_at": t.resolved_at,
            "confidence_score": t.confidence_score,
        }
        for t in tickets
    ]


@router.get("/stats/summary")
async def ticket_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    total = await db.execute(select(func.count(Ticket.id)))
    open_count = await db.execute(select(func.count(Ticket.id)).where(Ticket.status == "Open"))
    escalated = await db.execute(select(func.count(Ticket.id)).where(Ticket.escalated == True))
    resolved = await db.execute(select(func.count(Ticket.id)).where(Ticket.status == "Resolved"))

    return {
        "total": total.scalar(),
        "open": open_count.scalar(),
        "escalated": escalated.scalar(),
        "resolved": resolved.scalar(),
    }


@router.get("/{ticket_id}")
async def get_ticket(
    ticket_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Ticket)
        .options(selectinload(Ticket.ticket_messages))
        .where(Ticket.id == ticket_id)
    )
    ticket = result.scalar_one_or_none()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    if current_user.role == "user" and ticket.requester_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    return {
        "id": ticket.id,
        "ticket_number": ticket.ticket_number,
        "subject": ticket.subject,
        "description": ticket.description,
        "priority": ticket.priority,
        "category": ticket.category,
        "status": ticket.status,
        "escalated": ticket.escalated,
        "assigned_to": ticket.assigned_to,
        "created_at": ticket.created_at,
        "updated_at": ticket.updated_at,
        "resolved_at": ticket.resolved_at,
        "confidence_score": ticket.confidence_score,
        "messages": [
            {
                "id": m.id,
                "sender_id": m.sender_id,
                "sender_role": m.sender_role,
                "sender_name": m.sender_name,
                "content": m.content,
                "created_at": m.created_at,
            }
            for m in ticket.ticket_messages
        ],
    }


@router.patch("/{ticket_id}")
async def update_ticket(
    ticket_id: str,
    req: UpdateTicketRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Ticket).where(Ticket.id == ticket_id))
    ticket = result.scalar_one_or_none()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    if req.status:
        ticket.status = req.status
        if req.status == "Resolved":
            ticket.resolved_at = datetime.utcnow()
    if req.assigned_to:
        ticket.assigned_to = req.assigned_to
    if req.resolution:
        ticket.resolution = req.resolution
    if req.priority:
        ticket.priority = req.priority

    ticket.updated_at = datetime.utcnow()
    await db.commit()
    return {"updated": True, "ticket_number": ticket.ticket_number}


# ── Ticket Messaging ─────────────────────────────────────


@router.get("/{ticket_id}/messages")
async def get_ticket_messages(
    ticket_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Verify ticket exists and user has access
    result = await db.execute(select(Ticket).where(Ticket.id == ticket_id))
    ticket = result.scalar_one_or_none()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    if current_user.role == "user" and ticket.requester_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    msgs = await db.execute(
        select(TicketMessage)
        .where(TicketMessage.ticket_id == ticket_id)
        .order_by(TicketMessage.created_at)
    )
    messages = msgs.scalars().all()

    return [
        {
            "id": m.id,
            "sender_id": m.sender_id,
            "sender_role": m.sender_role,
            "sender_name": m.sender_name,
            "content": m.content,
            "created_at": m.created_at,
        }
        for m in messages
    ]


@router.post("/{ticket_id}/messages")
async def send_ticket_message(
    ticket_id: str,
    req: SendMessageRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Verify ticket exists and user has access
    result = await db.execute(select(Ticket).where(Ticket.id == ticket_id))
    ticket = result.scalar_one_or_none()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    if current_user.role == "user" and ticket.requester_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    msg = TicketMessage(
        id=str(uuid.uuid4()),
        ticket_id=ticket_id,
        sender_id=current_user.id,
        sender_role=current_user.role,
        sender_name=current_user.name,
        content=req.content,
    )
    db.add(msg)

    # Update ticket timestamp
    ticket.updated_at = datetime.utcnow()

    # If an agent/admin sends a message on an Open ticket, auto-set to In Progress
    if current_user.role in ("agent", "admin") and ticket.status == "Open":
        ticket.status = "In Progress"

    await db.commit()
    await db.refresh(msg)

    return {
        "id": msg.id,
        "sender_id": msg.sender_id,
        "sender_role": msg.sender_role,
        "sender_name": msg.sender_name,
        "content": msg.content,
        "created_at": msg.created_at,
    }
