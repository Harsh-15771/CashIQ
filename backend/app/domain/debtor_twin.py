"""
Debtor Digital Twin Management & Longitudinal Intelligence.
Provides relationship history, timeline event generation, promise credibility scoring,
and 'What Changed?' decision diff tracking.
"""

from typing import Dict, List, Optional
from datetime import datetime, date, timedelta
from backend.app.domain.schemas import (
    DebtorDigitalTwin,
    TimelineEvent,
    DecisionDiff,
    DataProvenance,
)


class DebtorTwinRepository:
    """In-memory longitudinal repository for Debtor Digital Twins."""

    def __init__(self):
        self._twins: Dict[str, DebtorDigitalTwin] = {}
        self._seed_default_twins()

    def get_twin(self, debtor_id: str) -> Optional[DebtorDigitalTwin]:
        return self._twins.get(debtor_id)

    def list_twins(self) -> List[DebtorDigitalTwin]:
        return list(self._twins.values())

    def update_twin(self, twin: DebtorDigitalTwin):
        self._twins[twin.debtor_id] = twin

    def _seed_default_twins(self):
        # 1. Apex Logistics (High-trust, reliable debtor)
        apex = DebtorDigitalTwin(
            debtor_id="DEBTOR-001",
            company_name="Apex Logistics Ltd",
            contact_email="billing@apexlogistics.in",
            contact_phone="+91 98201 11223",
            relationship_age_years=2.4,
            total_invoices_count=24,
            total_invoiced_amount_inr=1450000.0,
            total_outstanding_inr=45000.0,
            total_overdue_inr=45000.0,
            promises_kept=18,
            promises_broken=2,
            dispute_count=0,
            average_dbt_days=2.4,
            last_contact_date="2026-08-20",
            contact_count_current_cycle=1,
            gstin="27AAACA1234A1Z1",
            pan="AAACA1234A",
            timeline=[
                TimelineEvent(
                    date="2026-01-15",
                    invoice_id="INV-2026-0012",
                    amount_inr=85000.0,
                    event_type="PAID",
                    days_delayed=1,
                    note="Paid via NEFT on invoice due date",
                ),
                TimelineEvent(
                    date="2026-03-10",
                    invoice_id="INV-2026-0034",
                    amount_inr=120000.0,
                    event_type="PROMISE_KEPT",
                    days_delayed=3,
                    note="Promised payment by March 15; settled on March 15 with 2% TDS",
                ),
                TimelineEvent(
                    date="2026-05-20",
                    invoice_id="INV-2026-0067",
                    amount_inr=95000.0,
                    event_type="PAID",
                    days_delayed=0,
                    note="Instant RTGS transfer upon reminder",
                ),
                TimelineEvent(
                    date="2026-08-22",
                    invoice_id="INV-2026-0101",
                    amount_inr=45000.0,
                    event_type="ACTIVE_PROMISE",
                    days_delayed=0,
                    note="Active commitment: Scheduled payment on 2026-08-28 (UTR SBIN00293847192)",
                ),
            ],
            decision_diff=DecisionDiff(
                previous_decision="NUDGE_EMAIL",
                previous_date="2026-08-20",
                current_decision="WAIT (Snoozed until Aug 28)",
                current_date="2026-08-22",
                reason_for_diff="Inbound email received with valid UTR & 2% TDS commitment. Promise Credibility rose from 68 to 93/100, triggering proactive reminder snooze.",
                credibility_delta=+25,
            ),
        )

        # 2. Zenith Retail (Disputed debtor with GST issue)
        zenith = DebtorDigitalTwin(
            debtor_id="DEBTOR-002",
            company_name="Zenith Retail Outlets",
            contact_email="ap@zenithretail.com",
            contact_phone="+91 98402 33445",
            relationship_age_years=1.8,
            total_invoices_count=16,
            total_invoiced_amount_inr=890000.0,
            total_outstanding_inr=120000.0,
            total_overdue_inr=120000.0,
            promises_kept=8,
            promises_broken=4,
            dispute_count=2,
            average_dbt_days=14.2,
            last_contact_date="2026-08-18",
            contact_count_current_cycle=2,
            gstin="29AABCZ9876B1Z5",
            pan="AABCZ9876B",
            timeline=[
                TimelineEvent(
                    date="2026-02-12",
                    invoice_id="INV-2026-0025",
                    amount_inr=60000.0,
                    event_type="PAID",
                    days_delayed=8,
                    note="Settled after 1st reminder",
                ),
                TimelineEvent(
                    date="2026-04-18",
                    invoice_id="INV-2026-0051",
                    amount_inr=110000.0,
                    event_type="DISPUTED",
                    days_delayed=22,
                    note="Dispute: GSTR-2B filing mismatch resolved with credit note",
                ),
                TimelineEvent(
                    date="2026-08-21",
                    invoice_id="INV-2026-0102",
                    amount_inr=120000.0,
                    event_type="DISPUTED",
                    days_delayed=12,
                    note="Dispute raised: Missing GSTR-2B Input Tax Credit reconciliation report",
                ),
            ],
            decision_diff=DecisionDiff(
                previous_decision="NUDGE_EMAIL",
                previous_date="2026-08-18",
                current_decision="FLAG_DISPUTE (Action Queue)",
                current_date="2026-08-21",
                reason_for_diff="Debtor submitted formal GSTR-2B tax portal discrepancy. Nudges suspended; routed to Accounts Ops for tax reconciliation.",
                credibility_delta=-12,
            ),
        )

        # 3. Vague Corp / Chronic Delayer (Low-trust debtor)
        vague = DebtorDigitalTwin(
            debtor_id="DEBTOR-003",
            company_name="Vague Commercial Corp",
            contact_email="finance@vaguecorp.org",
            contact_phone="+91 97110 55667",
            relationship_age_years=0.9,
            total_invoices_count=10,
            total_invoiced_amount_inr=420000.0,
            total_outstanding_inr=85000.0,
            total_overdue_inr=85000.0,
            promises_kept=1,
            promises_broken=8,
            dispute_count=1,
            average_dbt_days=38.6,
            last_contact_date="2026-08-19",
            contact_count_current_cycle=3,
            gstin="07AAACV4455C1Z8",
            pan="AAACV4455C",
            timeline=[
                TimelineEvent(
                    date="2026-03-01",
                    invoice_id="INV-2026-0040",
                    amount_inr=40000.0,
                    event_type="PROMISE_BROKEN",
                    days_delayed=35,
                    note="Promise made for March 10; defaulted; settled on April 15 after legal notice",
                ),
                TimelineEvent(
                    date="2026-06-14",
                    invoice_id="INV-2026-0078",
                    amount_inr=55000.0,
                    event_type="PROMISE_BROKEN",
                    days_delayed=42,
                    note="Broken promise cycle repeated 3 times",
                ),
                TimelineEvent(
                    date="2026-08-22",
                    invoice_id="INV-2026-0103",
                    amount_inr=85000.0,
                    event_type="PROMISE_BROKEN",
                    days_delayed=28,
                    note="Vague delay excuse without UTR or CFO authorization",
                ),
            ],
            decision_diff=DecisionDiff(
                previous_decision="NUDGE_EMAIL",
                previous_date="2026-08-19",
                current_decision="ESCALATE_HUMAN",
                current_date="2026-08-22",
                reason_for_diff="Debtor provided ambiguous delay excuse with 8/9 broken promise history. Credibility is 27/100; automated reminders suppressed in favor of credit ops escalation.",
                credibility_delta=-18,
            ),
        )

        # 4. Bharat Heavy (High-value enterprise debtor)
        bharat = DebtorDigitalTwin(
            debtor_id="DEBTOR-004",
            company_name="Bharat Heavy Infrastructure",
            contact_email="cfo@bharatheavy.com",
            contact_phone="+91 99001 77889",
            relationship_age_years=3.5,
            total_invoices_count=40,
            total_invoiced_amount_inr=18500000.0,
            total_outstanding_inr=2800000.0,
            total_overdue_inr=2800000.0,
            promises_kept=32,
            promises_broken=3,
            dispute_count=1,
            average_dbt_days=8.5,
            last_contact_date="2026-08-15",
            contact_count_current_cycle=1,
            gstin="33AABCB5566D1Z2",
            pan="AABCB5566D",
            timeline=[
                TimelineEvent(
                    date="2026-01-20",
                    invoice_id="INV-2026-0015",
                    amount_inr=2200000.0,
                    event_type="PAID",
                    days_delayed=5,
                    note="Enterprise milestone payment cleared via RTGS",
                ),
                TimelineEvent(
                    date="2026-04-10",
                    invoice_id="INV-2026-0049",
                    amount_inr=3100000.0,
                    event_type="PROMISE_KEPT",
                    days_delayed=8,
                    note="Promised payment settled on Board sign-off date",
                ),
                TimelineEvent(
                    date="2026-08-22",
                    invoice_id="INV-2026-0104",
                    amount_inr=2800000.0,
                    event_type="ACTIVE_PROMISE",
                    days_delayed=0,
                    note="Commitment received: ₹28L payment scheduled for 2026-08-30",
                ),
            ],
            decision_diff=DecisionDiff(
                previous_decision="NUDGE_EMAIL",
                previous_date="2026-08-15",
                current_decision="REQUIRES_APPROVAL (> ₹2.5L Gated)",
                current_date="2026-08-22",
                reason_for_diff="Invoice is ₹28,00,000 (exceeds ₹2.5L threshold). Automated dunning held; routed for 1-click Credit Director sign-off.",
                credibility_delta=+10,
            ),
        )

        self._twins = {
            apex.debtor_id: apex,
            zenith.debtor_id: zenith,
            vague.debtor_id: vague,
            bharat.debtor_id: bharat,
        }


# Global singleton instance
debtor_twin_repo = DebtorTwinRepository()
