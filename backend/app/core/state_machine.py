from datetime import datetime, date, timedelta
from typing import Optional, Dict, Any, Tuple
from .schemas import (
    InvoiceRecord,
    InvoiceStatus,
    ActionDecision,
    EmailAnalysisResult,
)


class DeterministicStateMachine:
    """
    Deterministic State Machine for CashIQ Receivables Lifecycle.
    Transitions are strictly rule-based and cannot be skipped by AI.
    """

    ALLOWED_TRANSITIONS = {
        InvoiceStatus.ISSUED: [InvoiceStatus.OVERDUE, InvoiceStatus.SETTLED],
        InvoiceStatus.OVERDUE: [
            InvoiceStatus.PARSING,
            InvoiceStatus.SNOOZED,
            InvoiceStatus.WATCH_CADENCE,
            InvoiceStatus.DISPUTED,
            InvoiceStatus.ESCALATED,
            InvoiceStatus.UNVERIFIED_PAYMENT_CLAIM,
            InvoiceStatus.SETTLED,
        ],
        InvoiceStatus.PARSING: [
            InvoiceStatus.SNOOZED,
            InvoiceStatus.WATCH_CADENCE,
            InvoiceStatus.DISPUTED,
            InvoiceStatus.ESCALATED,
            InvoiceStatus.UNVERIFIED_PAYMENT_CLAIM,
            InvoiceStatus.OVERDUE,
        ],
        InvoiceStatus.SNOOZED: [InvoiceStatus.BROKEN_PTP, InvoiceStatus.SETTLED, InvoiceStatus.DISPUTED],
        InvoiceStatus.WATCH_CADENCE: [InvoiceStatus.SNOOZED, InvoiceStatus.ESCALATED, InvoiceStatus.DISPUTED, InvoiceStatus.SETTLED],
        InvoiceStatus.DISPUTED: [InvoiceStatus.SNOOZED, InvoiceStatus.WATCH_CADENCE, InvoiceStatus.ESCALATED, InvoiceStatus.SETTLED],
        InvoiceStatus.ESCALATED: [InvoiceStatus.SNOOZED, InvoiceStatus.DISPUTED, InvoiceStatus.SETTLED],
        InvoiceStatus.BROKEN_PTP: [InvoiceStatus.ESCALATED, InvoiceStatus.SNOOZED, InvoiceStatus.SETTLED],
        InvoiceStatus.UNVERIFIED_PAYMENT_CLAIM: [InvoiceStatus.ESCALATED, InvoiceStatus.SETTLED],
        InvoiceStatus.UNLINKED_INBOUND: [],
        InvoiceStatus.SETTLED: [],  # Terminal state
    }

    @classmethod
    def process_inbound_decision(
        cls,
        invoice: InvoiceRecord,
        analysis: EmailAnalysisResult,
        decision: ActionDecision,
        current_date: Optional[date] = None,
    ) -> Tuple[InvoiceRecord, str]:
        """Applies state transition based on the enforced action decision."""
        if current_date is None:
            current_date = date.today()

        prev_status = invoice.status
        reason = ""

        if decision == ActionDecision.SNOOZE:
            invoice.status = InvoiceStatus.SNOOZED
            invoice.active_ptp_date = analysis.commitment.promised_date
            reason = f"High-credibility promise extracted for {analysis.commitment.promised_date}. Automated reminders snoozed."
        elif decision == ActionDecision.WATCH:
            invoice.status = InvoiceStatus.WATCH_CADENCE
            reason = "Moderate credibility promise / uncertain signal. Maintaining standard cadence without snoozing."
        elif decision == ActionDecision.ESCALATE:
            invoice.status = InvoiceStatus.ESCALATED
            reason = "Low credibility promise / delay tactic detected. Escalated for warm follow-up."
        elif decision == ActionDecision.FLAG_DISPUTE:
            invoice.status = InvoiceStatus.DISPUTED
            reason = f"Dispute flagged ({analysis.dispute.value}). Requirement logged in audit trail."
        elif decision == ActionDecision.VERIFY_UTR:
            invoice.status = InvoiceStatus.UNVERIFIED_PAYMENT_CLAIM
            reason = f"Debtor claimed payment via UTR '{analysis.commitment.utr_number}'. Marked unverified pending Razorpay ledger match."
        elif decision == ActionDecision.MANUAL_REVIEW:
            invoice.status = InvoiceStatus.OVERDUE
            reason = "Confidence threshold not met or high-value threshold triggered. Queued for human 1-click approval."

        invoice.last_contact_date = current_date.isoformat()
        return invoice, f"State transitioned from {prev_status.value} to {invoice.status.value}: {reason}"

    @classmethod
    def check_broken_ptp(cls, invoice: InvoiceRecord, current_date: Optional[date] = None) -> bool:
        """Checks if a snoozed invoice has passed its promised date + 1 day without settlement."""
        if current_date is None:
            current_date = date.today()

        if invoice.status == InvoiceStatus.SNOOZED and invoice.active_ptp_date:
            try:
                prom_d = datetime.strptime(invoice.active_ptp_date, "%Y-%m-%d").date()
                if current_date > (prom_d + timedelta(days=1)):
                    invoice.status = InvoiceStatus.BROKEN_PTP
                    return True
            except Exception:
                pass
        return False

    @classmethod
    def mark_settled(cls, invoice: InvoiceRecord, settlement_date: Optional[date] = None) -> InvoiceRecord:
        """Triggered strictly by Razorpay webhook when payment is captured."""
        if settlement_date is None:
            settlement_date = date.today()
        invoice.status = InvoiceStatus.SETTLED
        invoice.settled_date = settlement_date.isoformat()
        return invoice
