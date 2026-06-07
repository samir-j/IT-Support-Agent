"""
LangGraph Orchestrator
Coordinates all agents in a graph-based workflow:
User Query -> Retrieval -> Troubleshooting -> [Ticket?] -> Response
"""
import logging
from typing import TypedDict, List, Dict, Any, Optional
from langgraph.graph import StateGraph, END

from agents.retrieval_agent import retrieval_agent
from agents.troubleshooting_agent import troubleshooting_agent
from agents.ticket_agent import ticket_agent
from agents.summary_agent import summary_agent
from config import settings

logger = logging.getLogger(__name__)


class AgentState(TypedDict):
    # Input
    query: str
    conversation_id: str
    user_id: str
    chat_history: List[Dict[str, str]]
    db: Any

    # Retrieval
    retrieved_docs: List[Dict]
    retrieval_context: str
    retrieval_confidence: float

    # Troubleshooting
    answer: str
    steps: List[str]
    category: str
    needs_escalation: bool

    # Ticket
    ticket_info: Optional[Dict]
    create_ticket: bool

    # Final
    final_response: str
    agent_used: str
    confidence: float
    sources: List[Dict]


# ──────────────────────────────────────────────
# Node functions
# ──────────────────────────────────────────────

async def retrieval_node(state: AgentState) -> AgentState:
    result = await retrieval_agent(state["query"])
    return {
        **state,
        "retrieved_docs": result["documents"],
        "retrieval_context": result["top_content"],
        "retrieval_confidence": result["confidence"],
        "sources": [
            {"content": d["content"][:200], "category": d["metadata"].get("category", ""), "source": d["metadata"].get("source", "")}
            for d in result["documents"][:3]
        ],
    }


async def troubleshooting_node(state: AgentState) -> AgentState:
    result = await troubleshooting_agent(
        query=state["query"],
        context=state["retrieval_context"],
        chat_history=state["chat_history"],
        retrieval_confidence=state["retrieval_confidence"],
    )
    return {
        **state,
        "answer": result["answer"],
        "steps": result["steps"],
        "category": result["category"],
        "needs_escalation": result["needs_escalation"],
        "confidence": result["confidence"],
        "agent_used": "troubleshooting",
    }


async def ticket_node(state: AgentState) -> AgentState:
    if not state.get("create_ticket") and not state.get("needs_escalation"):
        return state

    result = await ticket_agent(
        query=state["query"],
        conversation_id=state["conversation_id"],
        user_id=state["user_id"],
        category=state["category"],
        confidence=state["confidence"],
        db=state["db"],
    )

    ticket_msg = ""
    if result["created"]:
        ticket_msg = (
            f"\n\n---\n🎫 **Support ticket created**: `{result['ticket_number']}`\n"
            f"**Priority**: {result['priority']} | **Status**: {result['status']}\n"
            f"An IT agent will follow up shortly."
        )

    return {
        **state,
        "ticket_info": result,
        "final_response": state.get("answer", "") + ticket_msg,
        "agent_used": "ticket",
    }


async def response_node(state: AgentState) -> AgentState:
    if not state.get("final_response"):
        return {**state, "final_response": state.get("answer", "I was unable to process your request.")}
    return state


# ──────────────────────────────────────────────
# Routing logic
# ──────────────────────────────────────────────

def should_create_ticket(state: AgentState) -> str:
    if state.get("create_ticket") or state.get("needs_escalation"):
        return "ticket"
    return "response"


# ──────────────────────────────────────────────
# Build graph
# ──────────────────────────────────────────────

def build_graph():
    graph = StateGraph(AgentState)

    graph.add_node("retrieval", retrieval_node)
    graph.add_node("troubleshooting", troubleshooting_node)
    graph.add_node("ticket", ticket_node)
    graph.add_node("response", response_node)

    graph.set_entry_point("retrieval")
    graph.add_edge("retrieval", "troubleshooting")
    graph.add_conditional_edges(
        "troubleshooting",
        should_create_ticket,
        {"ticket": "ticket", "response": "response"},
    )
    graph.add_edge("ticket", "response")
    graph.add_edge("response", END)

    return graph.compile()


# Singleton compiled graph
_graph = None


def get_graph():
    global _graph
    if _graph is None:
        _graph = build_graph()
    return _graph


async def run_agent_graph(
    query: str,
    conversation_id: str,
    user_id: str,
    chat_history: List[Dict[str, str]],
    db: Any,
    create_ticket: bool = False,
) -> Dict[str, Any]:
    """Run the full agent graph and return the result."""
    graph = get_graph()

    initial_state: AgentState = {
        "query": query,
        "conversation_id": conversation_id,
        "user_id": user_id,
        "chat_history": chat_history,
        "db": db,
        "retrieved_docs": [],
        "retrieval_context": "",
        "retrieval_confidence": 0.0,
        "answer": "",
        "steps": [],
        "category": "General",
        "needs_escalation": False,
        "ticket_info": None,
        "create_ticket": create_ticket,
        "final_response": "",
        "agent_used": "retrieval",
        "confidence": 0.0,
        "sources": [],
    }

    result = await graph.ainvoke(initial_state)
    return result
