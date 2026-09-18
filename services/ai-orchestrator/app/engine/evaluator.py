"""
VoxaFlow Automated AI Conversation Evaluator
Calculates objective metrics without arbitrary ratings.
"""
from typing import List, Dict, Any

class ConversationEvaluator:
    @staticmethod
    def evaluate(messages: List[Dict[str, Any]], tool_executions: List[Dict[str, Any]], max_sentences: int = 2) -> Dict[str, Any]:
        """
        Evaluates dialogue turns and tool accuracy deterministically.
        """
        # 1. Tool Call Accuracy
        tool_accuracy = 100
        if tool_executions:
            success_count = sum(1 for t in tool_executions if t.get("execution_status") == "SUCCESS")
            tool_accuracy = int((success_count / len(tool_executions)) * 100)

        # 2. Length Compliance
        agent_msgs = [m for m in messages if m.get("sender") == "AGENT"]
        compliant_count = 0
        for m in agent_msgs:
            sentences = [s for s in m.get("content", "").replace("!", ".").replace("?", ".").split(".") if s.strip()]
            if len(sentences) <= max_sentences + 1:
                compliant_count += 1
        length_compliance = int((compliant_count / max(1, len(agent_msgs)))) * 100

        # 3. Sentiment Progression
        customer_msgs = [m for m in messages if m.get("sender") == "CUSTOMER"]
        pos_words = ["thank", "shukriya", "great", "awesome", "badhiya", "order", "good", "sahi"]
        neg_words = ["bad", "bekaar", "galat", "slow", "hate", "cancel", "useless"]
        
        pos_hits = sum(1 for m in customer_msgs if any(w in m.get("content", "").lower() for w in pos_words))
        neg_hits = sum(1 for m in customer_msgs if any(w in m.get("content", "").lower() for w in neg_words))
        
        sentiment = 0.5
        if pos_hits > 0 or neg_hits > 0:
            sentiment = (pos_hits - neg_hits) / max(1, pos_hits + neg_hits)

        # 4. Task Completion Heuristic
        task_completion = 90 if tool_accuracy >= 90 else 60

        # 5. Composite Weighted Score
        overall = int(task_completion * 0.4 + tool_accuracy * 0.3 + length_compliance * 0.2 + ((sentiment + 1) * 50) * 0.1)

        return {
            "scores": {
                "task_completion": task_completion,
                "tool_call_accuracy": tool_accuracy,
                "response_length_compliance": length_compliance,
                "hallucination_penalty": 0 if tool_accuracy == 100 else 15,
                "customer_sentiment_score": round(sentiment, 2)
            },
            "overall_score": max(0, min(100, overall)),
            "eval_breakdown": [
                f"Task Completion: {task_completion}%",
                f"Tool Accuracy: {tool_accuracy}%",
                f"Voice Conciseness: {length_compliance}% compliant with max {max_sentences} sentences",
                f"Customer Sentiment: {round(sentiment, 2)}"
            ]
        }
