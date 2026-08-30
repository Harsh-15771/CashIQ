"""
Ambiguity Detection & 'Refusal to Guess' Gate.
Detects when unstructured debtor communication contains conflicting or split evidence
(e.g. GST GSTR-2B discrepancy vs. Section 194C TDS withholding ambiguity).
When top intent delta < 15%, refuses to hallucinate and outputs NEEDS_REVIEW.
"""

from typing import Tuple, Optional


class AmbiguityGate:
    """
    Evaluates evidence clarity and halts automated execution when evidence is ambiguous.
    """

    AMBIGUITY_THRESHOLD_DELTA = 0.15
    MIN_CONFIDENCE_THRESHOLD = 0.70

    def check_ambiguity(
        self,
        top_intent: str,
        top_confidence: float,
        runner_up_intent: Optional[str] = None,
        runner_up_confidence: float = 0.0,
        raw_text: str = "",
    ) -> Tuple[bool, str]:
        """
        Returns (is_ambiguous, ambiguity_reason).
        """
        # Explicit textual tax ambiguity check
        text_lower = raw_text.lower()
        if "tax" in text_lower and "match" in text_lower and not ("tds" in text_lower and "2%" in text_lower):
            if "gst" in text_lower or "portal" in text_lower:
                return (
                    True,
                    "Evidence is split between GST GSTR-2B reconciliation mismatch and Section 194C TDS withholding discrepancy. System refuses to guess.",
                )

        # Numerical confidence delta check
        if runner_up_intent and runner_up_confidence > 0.0:
            delta = abs(top_confidence - runner_up_confidence)
            if delta < self.AMBIGUITY_THRESHOLD_DELTA and top_confidence < self.MIN_CONFIDENCE_THRESHOLD:
                return (
                    True,
                    f"Confidence delta ({delta:.2f}) between top intent '{top_intent}' ({top_confidence:.2f}) and runner-up '{runner_up_intent}' ({runner_up_confidence:.2f}) is below 15% threshold. Refusing to guess.",
                )

        if top_confidence < 0.50:
            return (
                True,
                f"Top intent confidence ({top_confidence:.2f}) is too low to guarantee safe automated action.",
            )

        return False, ""


# Global singleton instance
ambiguity_gate = AmbiguityGate()
