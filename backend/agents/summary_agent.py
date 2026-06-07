"""
Agent 4: Summary Agent
Generates incident reports and conversation summaries.
"""
import logging
from typing import TypedDict, List, Dict

from utils.llm_client import chat_completion

logger = logging.getLogger(__name__)


class SummaryResult(TypedDict):
    summary: str
    issue: str
    actions_taken: List[str]
    status: str
    recommendation: str


async def summary_agent(
    messages: List[Dict[str, str]],
    ticket_info: Dict = None,
) -> SummaryResult:
    """
    Summarizes the entire conversation into an incident report.
    """
    logger.info("📋 Summary Agent generating incident report...")

    conversation_text = "\n".join(
        [f"{m['role'].upper()}: {m['content']}" for m in messages]
    )

    prompt = f"""Generate a concise IT incident report from this support conversation.

Conversation:
{conversation_text}

{f"Ticket: {ticket_info}" if ticket_info else ""}

Respond with ONLY a JSON object (no markdown):
{{
  "issue": "one sentence describing the core issue",
  "actions_taken": ["action 1", "action 2", "action 3"],
  "status": "Resolved|Escalated|Pending|Unresolved",
  "recommendation": "one sentence next step or recommendation",
  "summary": "2-3 sentence executive summary"
}}"""

    try:
        response = await chat_completion(
            [{"role": "user", "content": prompt}],
            temperature=0.2,
            max_tokens=400,
        )
        import json
        clean = response.strip().replace("```json", "").replace("```", "").strip()
        data = json.loads(clean)
        logger.info(" Summary Agent complete")
        return {
            "summary": data.get("summary", ""),
            "issue": data.get("issue", ""),
            "actions_taken": data.get("actions_taken", []),
            "status": data.get("status", "Pending"),
            "recommendation": data.get("recommendation", ""),
        }
    except Exception as e:
        logger.error(f"Summary generation failed: {e}")
        return {
            "summary": "Unable to generate summary.",
            "issue": "Unknown",
            "actions_taken": [],
            "status": "Unknown",
            "recommendation": "Please review the conversation manually.",
        }
