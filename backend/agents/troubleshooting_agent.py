"""
Agent 2: Troubleshooting Agent
Uses retrieved context + LLM to generate step-by-step solutions.
"""
import logging
from typing import TypedDict, List, Dict, Any

from utils.llm_client import chat_completion

logger = logging.getLogger(__name__)


class TroubleshootingResult(TypedDict):
    answer: str
    steps: List[str]
    category: str
    confidence: float
    needs_escalation: bool


SYSTEM_PROMPT = """You are an expert IT Support Specialist at a large company.
Your job is to diagnose and resolve IT issues clearly and efficiently.

Given the user's issue and relevant knowledge base context, provide:
1. A clear explanation of the likely cause
2. Step-by-step resolution instructions (numbered)
3. Preventive tips if relevant

RULES:
- Be concise but thorough
- Use simple, non-technical language when possible
- If you genuinely cannot resolve the issue from the context, say so clearly
- Always end with "If this doesn't resolve your issue, I'll create a support ticket."

Format your response as plain text with numbered steps."""


async def troubleshooting_agent(
    query: str,
    context: str,
    chat_history: List[Dict[str, str]] = None,
    retrieval_confidence: float = 0.5,
) -> TroubleshootingResult:
    """
    Generates a troubleshooting response using the LLM + retrieved context.
    """
    logger.info(f" Troubleshooting Agent processing: {query[:80]}...")

    history_text = ""
    if chat_history:
        history_parts = []
        for msg in chat_history[-6:]:  # Last 3 exchanges
            role = "User" if msg["role"] == "user" else "Assistant"
            history_parts.append(f"{role}: {msg['content'][:200]}")
        history_text = "\n".join(history_parts)

    user_message = f"""Previous conversation:
{history_text if history_text else 'None'}

Current issue: {query}

Relevant knowledge base context:
{context if context else 'No relevant documentation found.'}

Please provide a helpful troubleshooting response."""

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": user_message},
    ]

    try:
        answer = await chat_completion(messages, temperature=0.3, max_tokens=800)
    except Exception as e:
        logger.error(f"LLM call failed: {e}")
        answer = "I'm having trouble connecting to the AI service right now. Please try again or contact IT directly."
        return {
            "answer": answer,
            "steps": [],
            "category": "General",
            "confidence": 0.0,
            "needs_escalation": True,
        }

    # Extract numbered steps from response
    steps = []
    for line in answer.split("\n"):
        line = line.strip()
        if line and line[0].isdigit() and "." in line[:3]:
            steps.append(line)

    # Detect category from query keywords
    category = _detect_category(query)

    # Determine if escalation is needed
    low_confidence_phrases = [
        "cannot resolve", "unable to", "don't have enough", "not sure",
        "contact IT directly", "requires on-site", "hardware replacement",
    ]
    needs_escalation = retrieval_confidence < 0.35 or any(
        phrase in answer.lower() for phrase in low_confidence_phrases
    )

    logger.info(f" Troubleshooting Agent done. Escalation needed: {needs_escalation}")
    return {
        "answer": answer,
        "steps": steps,
        "category": category,
        "confidence": retrieval_confidence,
        "needs_escalation": needs_escalation,
    }


def _detect_category(text: str) -> str:
    text_lower = text.lower()
    categories = {
        "VPN": ["vpn", "virtual private network", "tunnel"],
        "Email": ["email", "outlook", "mail", "smtp", "exchange"],
        "Network": ["network", "wifi", "wi-fi", "internet", "ethernet", "connectivity"],
        "Hardware": ["laptop", "computer", "pc", "screen", "monitor", "keyboard", "mouse", "battery"],
        "Printer": ["print", "printer", "scan", "scanner"],
        "Account": ["password", "login", "account", "locked", "reset", "credentials", "mfa"],
        "Software": ["software", "install", "application", "app", "update", "microsoft", "teams", "zoom"],
        "Security": ["virus", "malware", "phishing", "security", "encryption", "mfa", "authentication"],
    }
    for category, keywords in categories.items():
        if any(kw in text_lower for kw in keywords):
            return category
    return "General"
