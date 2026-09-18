"""
VoxaFlow Hinglish Code-Switching & Entity Parser
Recognizes mixed Hindi + English phrasing, extracts price ceilings and shopping intent.
"""
import re
from typing import Dict, Any, Tuple

class HinglishParser:
    HINGLISH_MARKERS = [
        "chahiye", "dikhao", "dikhaye", "kuch", "hai", "batao", "kitna",
        "kaise", "milega", "hoga", "bhai", "wala", "wali", "wale", "karo",
        "rakho", "lena", "kharidna", "under", "ke under", "tak", "rupay",
        "ka", "ki", "ke", "pe", "par", "mein", "shukriya", "dhanyawad"
    ]

    @staticmethod
    def detect_language(text: str) -> str:
        """
        Classifies language as 'hinglish', 'hindi', or 'en-IN'.
        """
        lower = text.lower()
        words = set(re.findall(r'\b\w+\b', lower))
        
        # Check Devanagari script for Hindi
        if re.search(r'[\u0900-\u097F]', text):
            return "hi-IN"

        # Check Hinglish keywords
        hinglish_hits = sum(1 for marker in HinglishParser.HINGLISH_MARKERS if marker in words or marker in lower)
        if hinglish_hits >= 1:
            return "hinglish"

        return "en-IN"

    @staticmethod
    def extract_entities(text: str) -> Dict[str, Any]:
        """
        Extracts budget, category, and color attributes from conversational text.
        """
        lower = text.lower()
        entities = {}

        # 1. Budget extraction
        # e.g. "3000 ke under", "under 3000", "below 2500", "3k budget"
        budget_match = (
            re.search(r'(?:under|below|budget|less than|ke under|tak)\s*(?:rs\.?|inr|₹)?\s*(\d+)', lower) or
            re.search(r'(\d+)\s*(?:ke under|tak|rup[a-z]+)', lower) or
            re.search(r'(\d+)\s*k\b', lower)
        )
        if budget_match:
            val_str = budget_match.group(1)
            if "k" in budget_match.group(0):
                entities["budget_max"] = int(val_str) * 1000
            else:
                entities["budget_max"] = int(val_str)

        # 2. Category extraction
        if any(w in lower for w in ["shoe", "running", "sneaker", "footwear", "boot", "joota"]):
            entities["category"] = "Footwear"
        elif any(w in lower for w in ["phone", "headphone", "earbud", "keyboard", "tech", "laptop", "charger"]):
            entities["category"] = "Electronics"
        elif any(w in lower for w in ["oil", "ghee", "salt", "grocery", "organic", "rice", "dal", "masala"]):
            entities["category"] = "Grocery"

        # 3. Color extraction
        for color in ["black", "white", "blue", "red", "green", "kala", "safed", "neela", "lal"]:
            if color in lower:
                entities["color"] = "Black" if color == "kala" else ("White" if color == "safed" else color.capitalize())
                break

        return entities
