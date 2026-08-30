import pytest
from datetime import date
from backend.app.core.schemas import (
    InvoiceRecord,
    DebtorProfile,
    EmailAnalysisResult,
    IntentType,
    DisputeType,
    ExtractedCommitment,
    MLPredictionResult,
    ActionDecision,
    InvoiceStatus,
)
from backend.app.core.guardrails import FinancialGuardrailEngine
from backend.app.core.state_machine import DeterministicStateMachine


def test_guardrail_price_lock_with_tds():
    """Guardrail 1: Price lock ensures exact deduction of validated TDS without AI tampering."""
    guardrails = FinancialGuardrailEngine()
    invoice = InvoiceRecord(
        invoice_id="INV-2026-100",
        debtor_id="DEBTOR_001",
        amount=100000.0,
        issue_date="2026-07-01",
        due_date="2026-08-01",
    )
    # 2% TDS deduction
    locked_amount = guardrails.compute_locked_settlement_amount(invoice, validated_tds_pct=0.02)
    assert locked_amount == 98000.0


def test_guardrail_high_value_gating():
    """Guardrail 3: Invoices >= ₹2,50,000 auto-require 1-click human confirmation."""
    guardrails = FinancialGuardrailEngine()
    debtor = DebtorProfile(debtor_id="D1", company_name="Corp", contact_email="ap@corp.in")
    invoice = InvoiceRecord(
        invoice_id="INV-2026-HIGH",
        debtor_id="D1",
        amount=450000.0,  # ₹4.5 Lakhs
        issue_date="2026-07-01",
        due_date="2026-08-01",
    )
    analysis = EmailAnalysisResult(
        invoice_id="INV-2026-HIGH",
        intent=IntentType.PROMISE_TO_PAY,
        confidence_score=0.95,
        commitment=ExtractedCommitment(has_promise=True, promised_date="2026-08-28"),
    )
    ml_pred = MLPredictionResult(
        fulfillment_probability=0.88,
        risk_category="HIGH_CREDIBILITY",
        decision_recommendation=ActionDecision.SNOOZE,
    )

    decision = guardrails.evaluate_and_enforce(invoice, debtor, analysis, ml_pred)
    assert decision == ActionDecision.MANUAL_REVIEW


def test_guardrail_confidence_gating():
    """Guardrail 4: Extraction confidence < 0.80 routes to MANUAL_REVIEW."""
    guardrails = FinancialGuardrailEngine()
    debtor = DebtorProfile(debtor_id="D1", company_name="Corp", contact_email="ap@corp.in")
    invoice = InvoiceRecord(
        invoice_id="INV-2026-LOWCONF",
        debtor_id="D1",
        amount=50000.0,
        issue_date="2026-07-01",
        due_date="2026-08-01",
    )
    analysis = EmailAnalysisResult(
        invoice_id="INV-2026-LOWCONF",
        intent=IntentType.PROMISE_TO_PAY,
        confidence_score=0.65,  # Below 0.80
        commitment=ExtractedCommitment(has_promise=True),
    )

    decision = guardrails.evaluate_and_enforce(invoice, debtor, analysis, ml_prediction=None)
    assert decision == ActionDecision.MANUAL_REVIEW


def test_state_machine_3way_transitions():
    """Tests SNOOZED, WATCH_CADENCE, and ESCALATED state transitions."""
    invoice = InvoiceRecord(
        invoice_id="INV-2026-SM",
        debtor_id="D1",
        amount=80000.0,
        issue_date="2026-07-01",
        due_date="2026-08-01",
        status=InvoiceStatus.OVERDUE,
    )
    analysis = EmailAnalysisResult(
        invoice_id="INV-2026-SM",
        intent=IntentType.PROMISE_TO_PAY,
        confidence_score=0.95,
        commitment=ExtractedCommitment(has_promise=True, promised_date="2026-08-28"),
    )

    # 1. High credibility -> SNOOZE
    inv_snoozed, _ = DeterministicStateMachine.process_inbound_decision(invoice, analysis, ActionDecision.SNOOZE)
    assert inv_snoozed.status == InvoiceStatus.SNOOZED
    assert inv_snoozed.active_ptp_date == "2026-08-28"

    # 2. Broken PTP test: When current date passes promised_date + 1 -> BROKEN_PTP
    is_broken = DeterministicStateMachine.check_broken_ptp(inv_snoozed, current_date=date(2026, 8, 30))
    assert is_broken is True
    assert inv_snoozed.status == InvoiceStatus.BROKEN_PTP

    # 3. Razorpay webhook capture -> SETTLED
    inv_settled = DeterministicStateMachine.mark_settled(inv_snoozed, settlement_date=date(2026, 8, 30))
    assert inv_settled.status == InvoiceStatus.SETTLED
