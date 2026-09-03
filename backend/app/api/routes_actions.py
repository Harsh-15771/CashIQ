from fastapi import APIRouter, HTTPException
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

from ..core.schemas import InvoiceRecord, InvoiceStatus, ActionDecision
from ..core.guardrails import guardrail_engine, GuardrailAuditEntry
from ..services.razorpay_client import ledger_service

router = APIRouter(prefix="/api/actions", tags=["Actions & Guardrails Queue"])


class ActionQueueItem(BaseModel):
    invoice_id: str
    debtor_name: str
    amount: float
    status: InvoiceStatus
    recommended_action: ActionDecision
    reason: str
    requires_human_approval: bool
    audit_entry: Optional[GuardrailAuditEntry] = None


class ApproveActionRequest(BaseModel):
    invoice_id: str
    approved_action: ActionDecision
    approved_by: str = "credit_ops_lead"
    notes: Optional[str] = None


# Persistent in-memory tracking of approved/rejected items for demo session
resolved_action_ids: set = set()


@router.get("/queue", response_model=List[ActionQueueItem])
def get_action_queue():
    """Returns all pending actionable invoices requiring human 1-click confirmation or review."""
    invoices = ledger_service.list_invoices()
    queue: List[ActionQueueItem] = []

    for inv in invoices:
        if inv.invoice_id in resolved_action_ids:
            continue

        debtor = ledger_service.get_debtor(inv.debtor_id)
        d_name = debtor.company_name if debtor else "Unknown Debtor"

        if inv.status in [InvoiceStatus.ESCALATED, InvoiceStatus.BROKEN_PTP]:
            queue.append(
                ActionQueueItem(
                    invoice_id=inv.invoice_id,
                    debtor_name=d_name,
                    amount=inv.amount,
                    status=inv.status,
                    recommended_action=ActionDecision.ESCALATE,
                    reason="Low PTP fulfillment credibility or promise broken.",
                    requires_human_approval=inv.amount >= 250000.0,
                )
            )
        elif inv.status == InvoiceStatus.DISPUTED:
            queue.append(
                ActionQueueItem(
                    invoice_id=inv.invoice_id,
                    debtor_name=d_name,
                    amount=inv.amount,
                    status=inv.status,
                    recommended_action=ActionDecision.FLAG_DISPUTE,
                    reason="Debtor raised procedural dispute (GST/PO). Requires document attachment.",
                    requires_human_approval=False,
                )
            )
        elif inv.status == InvoiceStatus.UNVERIFIED_PAYMENT_CLAIM:
            queue.append(
                ActionQueueItem(
                    invoice_id=inv.invoice_id,
                    debtor_name=d_name,
                    amount=inv.amount,
                    status=inv.status,
                    recommended_action=ActionDecision.VERIFY_UTR,
                    reason="Debtor claimed UTR payment; unverified against Razorpay ledger.",
                    requires_human_approval=True,
                )
            )
        elif inv.amount >= 250000.0 and inv.current_overdue_days > 0 and inv.status not in [InvoiceStatus.SETTLED, InvoiceStatus.SNOOZED]:
            queue.append(
                ActionQueueItem(
                    invoice_id=inv.invoice_id,
                    debtor_name=d_name,
                    amount=inv.amount,
                    status=inv.status,
                    recommended_action=ActionDecision.ESCALATE,
                    reason=f"High-Value Enterprise Account (> ₹2.5L) overdue by {inv.current_overdue_days} days. Policy requires CFO authorization.",
                    requires_human_approval=True,
                )
            )

    return queue


@router.post("/approve")
def approve_action(req: ApproveActionRequest):
    """1-Click Credit Ops Approval to dispatch communications or confirm status."""
    inv = ledger_service.get_invoice(req.invoice_id)
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")

    resolved_action_ids.add(req.invoice_id)
    if req.approved_action == ActionDecision.VERIFY_UTR:
        inv.status = InvoiceStatus.SETTLED
    elif req.approved_action == ActionDecision.SNOOZE:
        inv.status = InvoiceStatus.SNOOZED
    else:
        inv.status = InvoiceStatus.WATCH_CADENCE

    guardrail_engine._log_audit(
        invoice_id=inv.invoice_id,
        guardrail_name="HUMAN_IN_THE_LOOP_APPROVAL",
        action_taken=f"APPROVED_{req.approved_action.value}",
        details={"approved_by": req.approved_by, "notes": req.notes, "amount": inv.amount},
    )

    return {
        "status": "success",
        "invoice_id": inv.invoice_id,
        "message": f"Action '{req.approved_action.value}' approved by {req.approved_by}.",
    }


@router.post("/reject")
def reject_action(req: ApproveActionRequest):
    """Operator rejection / override of recommended action."""
    inv = ledger_service.get_invoice(req.invoice_id)
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")

    resolved_action_ids.add(req.invoice_id)
    guardrail_engine._log_audit(
        invoice_id=inv.invoice_id,
        guardrail_name="OPERATOR_OVERRIDE_REJECT",
        action_taken=f"REJECTED_{req.approved_action.value}",
        details={"rejected_by": req.approved_by, "notes": req.notes or "Operator override", "amount": inv.amount},
    )

    return {
        "status": "success",
        "invoice_id": inv.invoice_id,
        "message": f"Action '{req.approved_action.value}' rejected by {req.approved_by}.",
    }


@router.get("/audit-trail", response_model=List[GuardrailAuditEntry])
def get_audit_trail(limit: int = 50):
    """Returns immutable security & guardrail audit trail."""
    return guardrail_engine.get_audit_trail(limit=limit)
    return guardrail_engine.get_audit_trail(limit=limit)
