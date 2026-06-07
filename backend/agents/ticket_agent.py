"""
Agent 3: Ticket Creation Agent
Creates structured support tickets in PostgreSQL.
"""
import logging
import uuid
from datetime import datetime
from typing import TypedDict

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from db.database import Ticket, Conversation
from utils.llm_client import chat_completion

logger = logging.getLogger(__name__)


class TicketResult(TypedDict):
    ticket_id: str
    ticket_number: str
    subject: str
    priority: str
    category: str
    status: str
    created: bool


async def ticket_agent(
    query: str,
    conversation_id: str,
    user_id: str,
    category: str,
    confidence: float,
    db: AsyncSession,
) -> TicketResult:
    """
    Creates a support ticket for the issue.
    Uses LLM to generate a clean subject and determine priority.
    """
    logger.info(f" Ticket Agent creating ticket for: {query[:80]}...")

    # Check if ticket already exists for this conversation
    result = await db.execute(
        select(Ticket).where(Ticket.conversation_id == conversation_id)
    )
    existing = result.scalar_one_or_none()
    if existing:
        logger.info(f"Ticket already exists: {existing.ticket_number}")
        return {
            "ticket_id": existing.id,
            "ticket_number": existing.ticket_number,
            "subject": existing.subject,
            "priority": existing.priority,
            "category": existing.category,
            "status": existing.status,
            "created": False,
        }

    # Use LLM to generate ticket metadata
    try:
        meta_prompt = f"""Given this IT support issue, respond with ONLY a JSON object (no markdown, no explanation):
Issue: {query}

JSON format:
{{"subject": "brief 10-word subject", "priority": "Low|Medium|High|Critical"}}

Priority guidelines:
- Critical: System down, security breach, entire team affected
- High: Individual cannot work, data loss risk
- Medium: Workaround available, moderate impact
- Low: Minor inconvenience, cosmetic issue"""

        meta_response = await chat_completion(
            [{"role": "user", "content": meta_prompt}],
            temperature=0.1,
            max_tokens=100,
        )

        import json
        # Clean potential markdown fences
        clean = meta_response.strip().replace("```json", "").replace("```", "").strip()
        meta = json.loads(clean)
        subject = meta.get("subject", query[:100])
        priority = meta.get("priority", _infer_priority(confidence))
    except Exception as e:
        logger.warning(f"LLM metadata generation failed: {e}. Using defaults.")
        subject = query[:100]
        priority = _infer_priority(confidence)

    # Generate unique ticket number
    ticket_number = f"INC{datetime.utcnow().strftime('%Y%m%d')}{str(uuid.uuid4())[:4].upper()}"

    # Determine if should be escalated
    escalated = confidence < 0.35 or priority in ["High", "Critical"]
    status = "Escalated" if escalated else "Open"

    ticket = Ticket(
        id=str(uuid.uuid4()),
        ticket_number=ticket_number,
        conversation_id=conversation_id,
        requester_id=user_id,
        subject=subject,
        description=query,
        priority=priority,
        category=category,
        status=status,
        escalated=escalated,
        confidence_score=confidence,
    )

    db.add(ticket)
    await db.commit()
    await db.refresh(ticket)

    logger.info(f" Ticket created: {ticket_number} [{priority}] [{status}]")
    return {
        "ticket_id": ticket.id,
        "ticket_number": ticket_number,
        "subject": subject,
        "priority": priority,
        "category": category,
        "status": status,
        "created": True,
    }


def _infer_priority(confidence: float) -> str:
    if confidence < 0.2:
        return "High"
    elif confidence < 0.4:
        return "Medium"
    return "Low"
