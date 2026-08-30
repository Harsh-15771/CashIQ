from fastapi import APIRouter, HTTPException, Body
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any

from ..parser.mime_parser import InboundMIMEParser
from ..parser.llm_extractor import llm_extractor
from ..services.razorpay_client import ledger_service
from ..ml.predictor import get_ptp_predictor
from ..core.guardrails import guardrail_engine
from ..core.state_machine import DeterministicStateMachine
from ..core.schemas import (
    EmailAnalysisResult,
    MLPredictionResult,
    ActionDecision,
    InvoiceStatus,
)

router = APIRouter(prefix="/api/inbound", tags=["Inbound Email"])


class InboundSimulationRequest(BaseModel):
    raw_email: Optional[str] = Field(None, description="Raw RFC 822 / MIME email text")
    from_address: Optional[str] = "ap-finance@apexlogistics.in"
    subject: Optional[str] = "Re: Invoice Reminder"
    email_body: Optional[str] = None
    invoice_id: Optional[str] = None


class InboundProcessingResponse(BaseModel):
    matched_invoice_id: Optional[str]
    debtor_name: Optional[str]
    analysis: EmailAnalysisResult
    ml_prediction: Optional[MLPredictionResult]
    final_decision: ActionDecision
    transition_summary: str
    locked_payment_link: Optional[str] = None


@router.post("/process-email", response_model=InboundProcessingResponse)
def process_inbound_email(req: InboundSimulationRequest):
    """
    Core Inbound Pipeline:
      1. MIME / RFC 822 parsing & signature stripping
      2. LLM semantic extraction (Gemini Flash)
      3. Razorpay ledger sync (DBT, historical fulfillment ratio)
      4. LightGBM Promise-Fulfillment ML scoring + TreeSHAP explainability
      5. Financial guardrail enforcement (Price-lock, cooldown, >₹2.5L gating)
      6. Deterministic state machine transition
    """
    # 1. MIME Parsing
    if req.raw_email:
        parsed_email = InboundMIMEParser.parse_raw_rfc822(req.raw_email)
    else:
        parsed_email = InboundMIMEParser.parse_webhook_payload({
            "from": req.from_address,
            "subject": req.subject,
            "text": req.email_body or "",
        })

    invoice_id = req.invoice_id or parsed_email.matched_invoice_id

    # If no invoice ID matched -> Fallback to UNLINKED_INBOUND state
    if not invoice_id:
        analysis = llm_extractor.extract(parsed_email.clean_body, subject=parsed_email.subject)
        return InboundProcessingResponse(
            matched_invoice_id=None,
            debtor_name=None,
            analysis=analysis,
            ml_prediction=None,
            final_decision=ActionDecision.MANUAL_REVIEW,
            transition_summary="No invoice ID matched in email headers or body. Routed to UNLINKED_INBOUND triage queue.",
        )

    # 2. Match with Razorpay Ledger
    invoice = ledger_service.get_invoice(invoice_id)
    if not invoice:
        # Fallback to general parsing
        analysis = llm_extractor.extract(parsed_email.clean_body, subject=parsed_email.subject, invoice_id_hint=invoice_id)
        return InboundProcessingResponse(
            matched_invoice_id=invoice_id,
            debtor_name=None,
            analysis=analysis,
            ml_prediction=None,
            final_decision=ActionDecision.MANUAL_REVIEW,
            transition_summary=f"Invoice '{invoice_id}' referenced in email does not exist in active ledger. Queued for review.",
        )

    debtor = ledger_service.get_debtor(invoice.debtor_id)

    # 3. LLM Extraction Tier
    analysis = llm_extractor.extract(parsed_email.clean_body, subject=parsed_email.subject, invoice_id_hint=invoice_id)

    # 4. LightGBM PTP ML Prediction Tier (if promise extracted)
    ml_prediction = None
    if analysis.commitment.has_promise and debtor:
        predictor = get_ptp_predictor()
        ml_prediction = predictor.predict(debtor, invoice, analysis.commitment)

    # 5. Financial Guardrail Engine
    final_decision = guardrail_engine.evaluate_and_enforce(
        invoice=invoice,
        debtor=debtor,
        analysis=analysis,
        ml_prediction=ml_prediction,
    )

    # 6. Deterministic State Machine Transition
    invoice, transition_summary = DeterministicStateMachine.process_inbound_decision(
        invoice=invoice,
        analysis=analysis,
        decision=final_decision,
    )

    # 7. Dynamic Payment Link Generation with Price-Lock
    locked_amount = guardrail_engine.compute_locked_settlement_amount(
        invoice=invoice,
        validated_tds_pct=analysis.commitment.tds_percentage,
    )
    payment_link = ledger_service.create_payment_link(invoice.invoice_id, locked_amount)

    return InboundProcessingResponse(
        matched_invoice_id=invoice.invoice_id,
        debtor_name=debtor.company_name if debtor else None,
        analysis=analysis,
        ml_prediction=ml_prediction,
        final_decision=final_decision,
        transition_summary=transition_summary,
        locked_payment_link=payment_link,
    )
