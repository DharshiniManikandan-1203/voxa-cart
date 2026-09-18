"""
VoxaFlow AI & Voice Orchestration Service (FastAPI)
Stateful dialogue controller, Hinglish code-switching engine, and LLM tool dispatcher.
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
import time
import re

from app.engine.state_machine import ConversationStateMachine, ConversationState
from app.engine.hinglish_parser import HinglishParser
from app.engine.evaluator import ConversationEvaluator

app = FastAPI(
    title="VoxaFlow AI Orchestration Service",
    description="Stateful Voice AI, Tool Calling Gateway, and Hinglish Commerce Reasoner",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ProcessTurnRequest(BaseModel):
    conversation_id: str
    merchant_id: str
    content: str
    current_state: str = "INIT"
    extracted_slots: Dict[str, Any] = Field(default_factory=dict)
    language_preference: str = "hinglish"
    allowed_tools: List[str] = Field(default_factory=list)
    max_sentences: int = 2

class ProcessTurnResponse(BaseModel):
    conversation_id: str
    detected_language: str
    detected_intent: str
    intent_confidence: float
    extracted_slots: Dict[str, Any]
    next_state: str
    tool_call_required: Optional[Dict[str, Any]] = None
    response_text: str
    latency_ms: Dict[str, float]

class EvaluateRequest(BaseModel):
    messages: List[Dict[str, Any]]
    tool_executions: List[Dict[str, Any]] = Field(default_factory=list)
    max_sentences: int = 2

@app.get("/health")
def healthcheck():
    return {
        "status": "healthy",
        "service": "VoxaFlow AI Orchestrator (FastAPI)",
        "version": "1.0.0",
        "timestamp": time.time()
    }

@app.post("/v1/orchestrator/process-turn", response_model=ProcessTurnResponse)
def process_turn(req: ProcessTurnRequest):
    start_time = time.time()
    user_text = req.content.strip()

    # 1. Detect Code-Switched Language & Extract Slots
    detected_lang = HinglishParser.detect_language(user_text)
    entities = HinglishParser.extract_entities(user_text)
    
    merged_slots = dict(req.extracted_slots)
    merged_slots.update(entities)

    # 2. Classify Shopping Intent
    lower = user_text.lower()
    tool_call = None
    agent_reply = ""
    intent = "GENERAL_QUERY"
    confidence = 0.85

    if any(w in lower for w in ["shoe", "running", "phone", "headphone", "oil", "search", "show", "dikhao", "chahiye", "buy", "under", "budget"]):
        intent = "PRODUCT_SEARCH"
        confidence = 0.96
        tool_call = {
            "tool_name": "search_products",
            "arguments": {
                "query": user_text,
                "category": merged_slots.get("category"),
                "max_price": merged_slots.get("budget_max"),
                "limit": 4
            }
        }
        agent_reply = "Main aapke liye matching products search kar raha hoon." if detected_lang == "hinglish" else "Searching for matching products in our catalog."

    elif any(w in lower for w in ["discount", "coupon", "offer", "code", "milega"]):
        intent = "DISCOUNT_INQUIRY"
        confidence = 0.94
        tool_call = {
            "tool_name": "calculate_discount",
            "arguments": {
                "coupon_code": "VOXA10",
                "subtotal": 2000
            }
        }
        agent_reply = "Aapke liye coupon VOXA10 available hai jisse 10% discount milega!" if detected_lang == "hinglish" else "Coupon VOXA10 is active for 10% off your purchase."

    elif any(w in lower for w in ["order", "track", "status", "kahan"]):
        intent = "ORDER_TRACKING"
        confidence = 0.92
        order_match = re.search(r'(?:vf-?|#)?(\d{5,6})', lower)
        order_num = f"VF-{order_match.group(1)}" if order_match else "VF-89214"
        tool_call = {
            "tool_name": "get_order_status",
            "arguments": {"order_number": order_num}
        }
        agent_reply = f"Aapka order #{order_num} check kar raha hoon." if detected_lang == "hinglish" else f"Checking status for order #{order_num}."

    else:
        agent_reply = "Namaste! Main aapki shopping mein kaise madad kar sakta hoon?" if detected_lang == "hinglish" else "Hello! How can I assist you with your shopping today?"

    # 3. State Transition
    next_state, _ = ConversationStateMachine.transition(req.current_state, intent, merged_slots)

    # 4. Voice Sanitization (Strip markdown)
    clean_reply = re.sub(r'[*#`_\[\]]', '', agent_reply).strip()

    total_latency_ms = (time.time() - start_time) * 1000

    return ProcessTurnResponse(
        conversation_id=req.conversation_id,
        detected_language=detected_lang,
        detected_intent=intent,
        intent_confidence=confidence,
        extracted_slots=merged_slots,
        next_state=next_state,
        tool_call_required=tool_call,
        response_text=clean_reply,
        latency_ms={
            "orchestrator_ms": round(total_latency_ms, 2)
        }
    )

@app.post("/v1/orchestrator/evaluate")
def evaluate_conversation(req: EvaluateRequest):
    return ConversationEvaluator.evaluate(req.messages, req.tool_executions, req.max_sentences)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
