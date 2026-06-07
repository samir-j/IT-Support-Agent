from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, case
from datetime import datetime, timedelta

from db.database import get_db, Ticket, Message, Conversation, User
from utils.auth import get_current_user

router = APIRouter()


@router.get("/dashboard")
async def get_dashboard(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Ticket counts by status
    status_counts = await db.execute(
        select(Ticket.status, func.count(Ticket.id)).group_by(Ticket.status)
    )
    by_status = {row[0]: row[1] for row in status_counts}

    # Ticket counts by category
    category_counts = await db.execute(
        select(Ticket.category, func.count(Ticket.id)).group_by(Ticket.category)
    )
    by_category = [{"category": row[0], "count": row[1]} for row in category_counts]

    # Ticket counts by priority
    priority_counts = await db.execute(
        select(Ticket.priority, func.count(Ticket.id)).group_by(Ticket.priority)
    )
    by_priority = {row[0]: row[1] for row in priority_counts}

    # Escalation rate
    total = await db.execute(select(func.count(Ticket.id)))
    total_val = total.scalar() or 1
    escalated = await db.execute(select(func.count(Ticket.id)).where(Ticket.escalated == True))
    escalated_val = escalated.scalar() or 0
    escalation_rate = round((escalated_val / total_val) * 100, 1)

    # Average confidence score
    avg_conf = await db.execute(select(func.avg(Ticket.confidence_score)))
    avg_conf_val = avg_conf.scalar() or 0

    # Tickets last 7 days
    seven_days_ago = datetime.utcnow() - timedelta(days=7)
    daily_counts = await db.execute(
        select(
            func.date(Ticket.created_at).label("date"),
            func.count(Ticket.id).label("count"),
        )
        .where(Ticket.created_at >= seven_days_ago)
        .group_by(func.date(Ticket.created_at))
        .order_by(func.date(Ticket.created_at))
    )
    daily = [{"date": str(row[0]), "count": row[1]} for row in daily_counts]

    # Total conversations
    total_convos = await db.execute(select(func.count(Conversation.id)))
    total_msgs = await db.execute(select(func.count(Message.id)))

    return {
        "tickets": {
            "total": total_val,
            "by_status": by_status,
            "by_category": by_category,
            "by_priority": by_priority,
        },
        "performance": {
            "escalation_rate": escalation_rate,
            "avg_confidence": round(float(avg_conf_val or 0) * 100, 1),
            "total_conversations": total_convos.scalar() or 0,
            "total_messages": total_msgs.scalar() or 0,
        },
        "timeline": daily,
    }
