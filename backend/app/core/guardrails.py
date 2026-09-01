from datetime import datetime, date, timedelta
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

from .schemas import (
    InvoiceRecord,
    DebtorProfile,
    EmailAnalysisResult,
    MLPredictionResult,
    ActionDecision,
    InvoiceStatus,
)
from ..config import settings


class GuardrailAuditEntry(BaseModel):
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    invoice_id: Optional[str]
    guardrail_name: str
    action_taken: str
    details: Dict[str, Any]
    security_event: bool = False


class FinancialGuardrailEngine:
    """
    Inviolable Financial Guardrails for CashIQ:
      1. Price-Lock: Locks payment link to (Invoice_Amount - Validated_TDS). No AI write access.
      2. Cooldown Enforcer: Max 1 proactive nudge per 4 business days.
      3. High-Value Gating: Invoices > ₹2,50,000 auto-require 1-click human confirmation.
      4. Confidence Gating: Extractions with confidence < 0.80 route to MANUAL_REVIEW.
    """

    def __init__(self):
        self.audit_log: List[GuardrailAuditEntry] = []

    def evaluate_and_enforce(
        self,
        invoice: InvoiceRecord,
        debtor: DebtorProfile,
        analysis: EmailAnalysisResult,
        ml_prediction: Optional[MLPredictionResult],
        current_date: Optional[date] = None,
    ) -> ActionDecision:
        if current_date is None:
            current_date = date.today()

        # Guardrail 4: Confidence Gating (< 0.80 -> MANUAL_REVIEW)
        if analysis.confidence_score < settings.EXTRACTION_CONFIDENCE_GATE:
            self._log_audit(
                invoice_id=invoice.invoice_id,
                guardrail_name="CONFIDENCE_GATING",
                action_taken="ROUTED_TO_MANUAL_REVIEW",
                details={
                    "confidence_score": analysis.confidence_score,
                    "threshold": settings.EXTRACTION_CONFIDENCE_GATE,
                    "reason": "LLM extraction confidence below safety threshold",
                },
            )
            return ActionDecision.MANUAL_REVIEW

        # Guardrail 3: High-Value Human-in-the-Loop (> ₹2,50,000)
        if invoice.amount >= settings.HIGH_VALUE_THRESHOLD_INR:
            self._log_audit(
                invoice_id=invoice.invoice_id,
                guardrail_name="HIGH_VALUE_HUMAN_IN_THE_LOOP",
                action_taken="FLAGGED_FOR_HUMAN_APPROVAL",
                details={
                    "invoice_amount": invoice.amount,
                    "threshold": settings.HIGH_VALUE_THRESHOLD_INR,
                    "reason": "Invoice amount exceeds ₹2.5L threshold, requiring 1-click credit ops approval",
                },
            )
            return ActionDecision.MANUAL_REVIEW

        # Handle Disputes
        if analysis.intent.value == "DISPUTE_RAISED":
            self._log_audit(
                invoice_id=invoice.invoice_id,
                guardrail_name="DISPUTE_ROUTING",
                action_taken="DISPUTE_LOGGED",
                details={
                    "dispute_type": analysis.dispute.value,
                    "missing_doc": analysis.missing_document_requirement,
                },
            )
            return ActionDecision.FLAG_DISPUTE

        # Handle UTR Claim verification
        if analysis.intent.value == "CLAIMED_PAID":
            self._log_audit(
                invoice_id=invoice.invoice_id,
                guardrail_name="UTR_VERIFICATION_CHECK",
                action_taken="ROUTED_TO_LEDGER_CHECK",
                details={
                    "utr_number": analysis.commitment.utr_number,
                    "reason": "Unverified payment claim requires direct Razorpay ledger reconciliation",
                },
            )
            return ActionDecision.VERIFY_UTR

        # Guardrail 2: Follow-up Cooldown Check for active nudges
        if ml_prediction and ml_prediction.decision_recommendation == ActionDecision.ESCALATE:
            if invoice.last_contact_date:
                try:
                    last_c = datetime.strptime(invoice.last_contact_date, "%Y-%m-%d").date()
                    days_since_contact = (current_date - last_c).days
                    if days_since_contact < settings.PROACTIVE_COOLDOWN_DAYS:
                        self._log_audit(
                            invoice_id=invoice.invoice_id,
                            guardrail_name="COOLDOWN_ENFORCER",
                            action_taken="NUDGE_SUPPRESSED_COOLDOWN",
                            details={
                                "days_since_contact": days_since_contact,
                                "cooldown_days": settings.PROACTIVE_COOLDOWN_DAYS,
                                "reason": "Proactive nudge suppressed to prevent spamming debtor",
                            },
                        )
                        return ActionDecision.WATCH
                except Exception:
                    pass

        # Return ML decision if all guardrails pass
        if ml_prediction:
            return ml_prediction.decision_recommendation

        return ActionDecision.WATCH

    def compute_locked_settlement_amount(
        self,
        invoice: InvoiceRecord,
        validated_tds_pct: Optional[float] = None,
    ) -> float:
        """
        Guardrail 1: Price-Lock Guard.
        Strict deterministic deduction: Net_Amount = Invoice_Amount * (1 - Validated_TDS).
        AI output cannot modify base invoice price.
        """
        tds = validated_tds_pct if (validated_tds_pct and 0.0 <= validated_tds_pct <= 0.10) else 0.0
        locked_amount = round(invoice.amount * (1.0 - tds), 2)

        self._log_audit(
            invoice_id=invoice.invoice_id,
            guardrail_name="PRICE_LOCK_GUARD",
            action_taken="SETTLEMENT_AMOUNT_LOCKED",
            details={
                "base_invoice_amount": invoice.amount,
                "validated_tds_percentage": tds,
                "locked_settlement_amount": locked_amount,
            },
        )
        return locked_amount

    def log_security_incident(self, invoice_id: Optional[str], attack_type: str, raw_text: str):
        """Logs prompt injections or adversarial attacks intercepted by the system."""
        self._log_audit(
            invoice_id=invoice_id,
            guardrail_name="ADVERSARIAL_SECURITY_INTERCEPTOR",
            action_taken="ATTACK_BLOCKED_AND_LOGGED",
            details={"attack_type": attack_type, "raw_snippet": raw_text[:200]},
            security_event=True,
        )

    def _log_audit(
        self,
        invoice_id: Optional[str],
        guardrail_name: str,
        action_taken: str,
        details: Dict[str, Any],
        security_event: bool = False,
    ):
        entry = GuardrailAuditEntry(
            invoice_id=invoice_id,
            guardrail_name=guardrail_name,
            action_taken=action_taken,
            details=details,
            security_event=security_event,
        )
        self.audit_log.append(entry)

    def get_audit_trail(self, limit: int = 50) -> List[GuardrailAuditEntry]:
        return list(reversed(self.audit_log[-limit:]))


# Global singleton instance
guardrail_engine = FinancialGuardrailEngine()
