"""
VoxaFlow State Machine Engine
Deterministic state transition graph for voice commerce interactions.
"""
from typing import Dict, Any, Tuple, Optional
from enum import Enum

class ConversationState(str, Enum):
    INIT = "INIT"
    IDENTIFY_INTENT = "IDENTIFY_INTENT"
    PRODUCT_SEARCH = "PRODUCT_SEARCH"
    FILTER_PRODUCTS = "FILTER_PRODUCTS"
    COMPARE_PRODUCTS = "COMPARE_PRODUCTS"
    SELECT_PRODUCT = "SELECT_PRODUCT"
    CHECK_DISCOUNT = "CHECK_DISCOUNT"
    CONFIRM_ORDER = "CONFIRM_ORDER"
    CHECKOUT = "CHECKOUT"
    COMPLETE = "COMPLETE"
    FALLBACK = "FALLBACK"

class ConversationStateMachine:
    @staticmethod
    def transition(
        current_state: str,
        detected_intent: str,
        slots: Dict[str, Any],
        tool_result: Optional[Dict[str, Any]] = None
    ) -> Tuple[str, Dict[str, Any]]:
        """
        Determines next conversation state node based on current state, intent, and tool outcomes.
        """
        next_state = current_state
        updated_slots = dict(slots)

        if detected_intent == "PRODUCT_SEARCH":
            if tool_result and tool_result.get("total_found", 0) > 1:
                next_state = ConversationState.FILTER_PRODUCTS
            elif tool_result and tool_result.get("total_found", 0) == 1:
                next_state = ConversationState.SELECT_PRODUCT
            else:
                next_state = ConversationState.PRODUCT_SEARCH

        elif detected_intent == "DISCOUNT_INQUIRY":
            next_state = ConversationState.CHECK_DISCOUNT

        elif detected_intent == "ORDER_TRACKING":
            next_state = ConversationState.COMPLETE

        elif detected_intent == "CHECKOUT_INITIATED":
            next_state = ConversationState.CONFIRM_ORDER

        elif detected_intent == "ORDER_PLACED":
            next_state = ConversationState.COMPLETE

        elif detected_intent == "FALLBACK":
            next_state = ConversationState.FALLBACK

        return next_state, updated_slots
