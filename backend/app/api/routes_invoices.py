from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional, Dict, Any
from pydantic import BaseModel

from ..services.razorpay_client import ledger_service
from ..core.schemas import InvoiceRecord, DebtorProfile, InvoiceStatus

router = APIRouter(prefix="/api", tags=["Invoices & Debtors"])


class EnrichedInvoiceResponse(BaseModel):
    invoice: InvoiceRecord
    debtor: Optional[DebtorProfile]
    priority_score: float
    is_high_value: bool


class LedgerOverviewStats(BaseModel):
    total_invoices_count: int
    total_outstanding_amount_inr: float
    total_overdue_amount_inr: float
    snoozed_promises_count: int
    snoozed_promises_volume_inr: float
    disputed_count: int
    escalated_count: int
    broken_ptp_count: int
    average_merchant_dbt: float


@router.get("/invoices", response_model=List[EnrichedInvoiceResponse])
def get_invoices(status: Optional[InvoiceStatus] = Query(None)):
    """Returns all invoices with debtor profiles and calculated collection priority scores."""
    raw_invoices = ledger_service.list_invoices(status=status)
    results = []

    for inv in raw_invoices:
        debtor = ledger_service.get_debtor(inv.debtor_id)
        fulfillment_ratio = debtor.laplace_fulfillment_ratio if debtor else 0.50

        # Capped Priority Score Formula:
        # Priority = Amount * min(1 + overdue_days / 30, 3.0) * (1 - fulfillment_ratio)
        overdue_mult = min(1.0 + (inv.current_overdue_days / 30.0), 3.0)
        risk_weight = 1.0 - fulfillment_ratio
        priority = round(inv.amount * overdue_mult * risk_weight, 2)

        results.append(
            EnrichedInvoiceResponse(
                invoice=inv,
                debtor=debtor,
                priority_score=priority,
                is_high_value=inv.amount >= 250000.0,
            )
        )

    # Sort descending by priority score
    results.sort(key=lambda x: x.priority_score, reverse=True)
    return results


@router.get("/debtors", response_model=List[DebtorProfile])
def get_debtors():
    """Returns all debtor profiles with historical fulfillment ratios and average DBT."""
    return list(ledger_service.debtors.values())


@router.get("/stats/overview", response_model=LedgerOverviewStats)
def get_overview_stats():
    """Computes high-level overview metrics for the executive dashboard."""
    invoices = ledger_service.list_invoices()
    debtors = list(ledger_service.debtors.values())

    total_outstanding = sum(inv.amount for inv in invoices if inv.status != InvoiceStatus.SETTLED)
    total_overdue = sum(inv.amount for inv in invoices if inv.current_overdue_days > 0 and inv.status != InvoiceStatus.SETTLED)
    snoozed_invoices = [inv for inv in invoices if inv.status == InvoiceStatus.SNOOZED]
    snoozed_volume = sum(inv.amount for inv in snoozed_invoices)

    avg_dbt = sum(d.historical_avg_dbt for d in debtors) / max(1, len(debtors))

    return LedgerOverviewStats(
        total_invoices_count=len(invoices),
        total_outstanding_amount_inr=round(total_outstanding, 2),
        total_overdue_amount_inr=round(total_overdue, 2),
        snoozed_promises_count=len(snoozed_invoices),
        snoozed_promises_volume_inr=round(snoozed_volume, 2),
        disputed_count=len([inv for inv in invoices if inv.status == InvoiceStatus.DISPUTED]),
        escalated_count=len([inv for inv in invoices if inv.status == InvoiceStatus.ESCALATED]),
        broken_ptp_count=len([inv for inv in invoices if inv.status == InvoiceStatus.BROKEN_PTP]),
        average_merchant_dbt=round(avg_dbt, 1),
    )
