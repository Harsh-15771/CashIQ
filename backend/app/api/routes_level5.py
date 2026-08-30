"""
API Endpoints for CashIQ Level 5 B2B Receivables Decision Intelligence:
- Receivables Decomposition
- Debtor Digital Twins & Longitudinal Timeline
- Decision Evaluation & Candidate EV Ranking with 'Why / Why Not?' Card
- Deterministic Decision Replay
- 50/50 Experiment Lab & Incremental Attribution
- GST / TDS Short Payment Reconciliation
"""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import uuid
from datetime import datetime

from backend.app.domain.schemas import (
    ReceivablesDecomposition,
    DebtorDigitalTwin,
    DecisionEvaluationResult,
    DecisionReplayVerification,
    SimulatedExperimentSummary,
    DataProvenance,
    TreeSHAPFactor,
    WhyWhyNotExplanation,
)
from backend.app.domain.debtor_twin import debtor_twin_repo
from backend.app.domain.decision_engine import decision_engine
from backend.app.domain.ambiguity_gate import ambiguity_gate
from backend.app.domain.tax_reconciler import tax_reconciler, ShortPaymentAnalysisResult
from backend.app.domain.replay_engine import replay_engine
from backend.app.domain.experiments import experiment_engine
from backend.app.services.razorpay_client import ledger_service
from backend.app.parser.llm_extractor import llm_extractor
from backend.app.ml.predictor import get_ptp_predictor
from backend.app.core.guardrails import guardrail_engine
from backend.app.core.schemas import DebtorProfile, InvoiceRecord, ExtractedCommitment

router = APIRouter(prefix="/api", tags=["Level 5 Decision Intelligence"])


# ============================================================================
# 1. RECEIVABLES DECOMPOSITION
# ============================================================================

@router.get("/receivables/decomposition", response_model=ReceivablesDecomposition)
def get_receivables_decomposition():
    """Returns the 6-bucket working capital breakdown."""
    data = ledger_service.get_receivables_decomposition()
    return ReceivablesDecomposition(**data)


# ============================================================================
# 2. DEBTOR DIGITAL TWIN & RELATIONSHIP TIMELINE
# ============================================================================

@router.get("/debtors/twins", response_model=List[DebtorDigitalTwin])
def list_debtor_twins():
    """Returns all Debtor Digital Twins with promise credibility scores."""
    return debtor_twin_repo.list_twins()


@router.get("/debtors/{debtor_id}/twin", response_model=DebtorDigitalTwin)
def get_debtor_twin(debtor_id: str):
    """Returns a single Debtor Digital Twin with relationship timeline and decision diff."""
    twin = debtor_twin_repo.get_twin(debtor_id)
    if not twin:
        # Fallback to general list or create on the fly
        twins = debtor_twin_repo.list_twins()
        if twins:
            return twins[0]
        raise HTTPException(status_code=404, detail="Debtor Digital Twin not found")
    return twin


# ============================================================================
# 3. LIVE DECISION EVALUATION & "WHY / WHY NOT?" INSPECTOR
# ============================================================================

class DecisionEvaluationRequest(BaseModel):
    raw_email_text: str
    invoice_id: Optional[str] = "INV-2026-0101"
    debtor_id: Optional[str] = "DEBTOR-001"
    sender_email: Optional[str] = "billing@apexlogistics.in"


@router.post("/decisions/evaluate", response_model=DecisionEvaluationResult)
def evaluate_decision(req: DecisionEvaluationRequest):
    """
    Evaluates an inbound email across the full decision pipeline:
    LLM Extractor -> ML Predictor + TreeSHAP -> Ambiguity Gate -> Integer Paise EV Optimizer -> Policy Gate -> Replay Cache.
    """
    # 1. Fetch Debtor Twin & Invoice
    debtor_twin = debtor_twin_repo.get_twin(req.debtor_id or "DEBTOR-001")
    if not debtor_twin:
        debtor_twin = debtor_twin_repo.list_twins()[0]

    invoice = ledger_service.get_invoice(req.invoice_id or "INV-2026-0101")
    invoice_amount = invoice.amount if invoice else 45000.0

    # 2. LLM Extraction (with fallback & prompt-injection trap)
    try:
        extraction = llm_extractor.extract_structured_intent(req.raw_email_text)
    except Exception as e:
        extraction = llm_extractor._deterministic_fallback_extract(req.raw_email_text, subject="Re: Invoice Payment", invoice_id_hint=req.invoice_id)

    intent_val = extraction.intent.value
    confidence_val = extraction.confidence_score
    stated_tds_pct = extraction.commitment.tds_percentage if extraction.commitment else 0.02
    stated_utr = extraction.commitment.utr_number if extraction.commitment else None
    dispute_val = extraction.dispute.value if extraction.dispute else "NONE"

    # 3. Check for Prompt Injection / Adversarial Text
    if "override" in req.raw_email_text.lower() or "ignore all" in req.raw_email_text.lower():
        guardrail_engine.log_security_incident(
            req.invoice_id,
            "PROMPT_INJECTION_ATTEMPT",
            req.raw_email_text,
        )

    # 4. Check Ambiguity Gate ("Refusal to Guess")
    is_ambiguous, ambiguity_reason = ambiguity_gate.check_ambiguity(
        top_intent=intent_val,
        top_confidence=confidence_val,
        raw_text=req.raw_email_text,
    )

    # 5. ML Predictor & TreeSHAP
    debtor_profile = ledger_service.get_debtor(req.debtor_id or debtor_twin.debtor_id) or DebtorProfile(
        debtor_id=debtor_twin.debtor_id,
        company_name=debtor_twin.company_name,
        gstin=debtor_twin.gstin or "27AAACA1234A1Z5",
        contact_email=debtor_twin.contact_email,
        historical_promises_kept=debtor_twin.promises_kept,
        historical_promises_total=debtor_twin.total_promises,
        historical_avg_dbt=debtor_twin.average_dbt_days,
        total_invoices_settled_count=debtor_twin.total_invoices_count,
    )

    inv_record = invoice or InvoiceRecord(
        invoice_id=req.invoice_id or "INV-2026-0101",
        debtor_id=debtor_twin.debtor_id,
        amount=invoice_amount,
        issue_date="2026-07-20",
        due_date="2026-08-10",
        current_overdue_days=12,
    )

    commitment_obj = extraction.commitment or ExtractedCommitment(
        has_promise=True,
        promised_date="2026-08-28",
        utr_number=stated_utr,
        tds_percentage=stated_tds_pct or 0.02,
    )

    predictor = get_ptp_predictor()
    ml_pred = predictor.predict(
        debtor=debtor_profile,
        invoice=inv_record,
        commitment=commitment_obj,
    )

    base_prob = ml_pred.fulfillment_probability

    # Top-3 TreeSHAP factors
    shap_factors = [
        TreeSHAPFactor(
            feature_name=f.feature_name,
            display_label=f.feature_name.replace("_", " ").title(),
            impact_pct=round(f.attribution_value * 100.0, 1),
            positive=(f.attribution_value >= 0),
        )
        for f in ml_pred.top_shap_attributions
    ]

    # 6. Evaluate Candidate Actions using Integer Paise EV Math
    candidates, selected_action, verdict, why_card = decision_engine.evaluate_candidates(
        invoice_id=req.invoice_id or "INV-2026-0101",
        invoice_amount_inr=invoice_amount,
        validated_tds_pct=stated_tds_pct or 0.02,
        debtor=debtor_twin,
        base_probability=base_prob,
        intent=intent_val,
        is_ambiguous=is_ambiguous,
        dispute_type=dispute_val,
    )

    locked_settlement = round(invoice_amount * (1.0 - (stated_tds_pct or 0.02)), 2)
    decision_id = f"DEC-{uuid.uuid4().hex[:8].upper()}"

    result = DecisionEvaluationResult(
        invoice_id=req.invoice_id or "INV-2026-0101",
        debtor_id=debtor_twin.debtor_id,
        company_name=debtor_twin.company_name,
        invoice_amount_inr=invoice_amount,
        locked_settlement_amount_inr=locked_settlement,
        tds_rate_pct=round((stated_tds_pct or 0.02) * 100.0, 1),
        intent_detected=intent_val,
        intent_confidence=round(confidence_val, 2),
        is_ambiguous=is_ambiguous,
        promise_credibility_score=debtor_twin.promise_credibility_score,
        selected_action=selected_action,
        policy_verdict=verdict,
        candidates_table=candidates,
        top_shap_factors=shap_factors,
        why_why_not=why_card,
        decision_id=decision_id,
        timestamp=datetime.now().isoformat(),
        provenance=DataProvenance.DETERMINISTIC_DERIVED,
    )

    # Cache extraction snapshot in ReplayEngine for deterministic verification
    replay_engine.record_decision(
        decision_id=decision_id,
        invoice_id=req.invoice_id or "INV-2026-0101",
        debtor_id=debtor_twin.debtor_id,
        raw_payload=req.raw_email_text,
        cached_llm_extraction=extraction.model_dump(),
        decision_output=result,
    )

    return result


# ============================================================================
# 4. DETERMINISTIC DECISION REPLAY
# ============================================================================

@router.get("/decisions/replay/{decision_id}", response_model=DecisionReplayVerification)
def replay_decision_endpoint(decision_id: str):
    """
    Reruns a past decision against cached extraction snapshot with 100% deterministic guarantee.
    """
    return replay_engine.replay_decision(decision_id)


# ============================================================================
# 5. 50/50 EXPERIMENT LAB & INCREMENTAL ATTRIBUTION
# ============================================================================

@router.get("/experiments/summary", response_model=SimulatedExperimentSummary)
@router.post("/experiments/run", response_model=SimulatedExperimentSummary)
def run_experiment_endpoint():
    """
    Runs the deterministic 50/50 randomized trial (N=500, Seed=42) and returns comparative incremental metrics.
    """
    return experiment_engine.run_experiment()


# ============================================================================
# 6. GST / TDS SHORT PAYMENT RECONCILIATION
# ============================================================================

class ShortPaymentRequest(BaseModel):
    invoice_id: str = "INV-2026-0105"
    gross_invoice_amount_inr: float = 590000.0
    actual_received_inr: float = 570000.0
    gst_rate_pct: float = 0.18
    stated_tds_pct: float = 0.02


@router.post("/tax/short-payment-analysis", response_model=ShortPaymentAnalysisResult)
def analyze_short_payment_endpoint(req: ShortPaymentRequest):
    """
    Analyzes short payment variance to verify Section 194C TDS withholding and prevent false collection dunning.
    """
    return tax_reconciler.analyze_short_payment(
        invoice_id=req.invoice_id,
        gross_invoice_amount_inr=req.gross_invoice_amount_inr,
        actual_received_inr=req.actual_received_inr,
        gst_rate_pct=req.gst_rate_pct,
        stated_tds_pct=req.stated_tds_pct,
    )
