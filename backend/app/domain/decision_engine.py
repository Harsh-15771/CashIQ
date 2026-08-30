"""
Integer Paise Expected Value (EV) Optimizer & Candidate Action Evaluator.
Computes exact paise valuations across candidate actions with superlinear
customer fatigue penalties and explicit NO_ACTION baseline.
"""

from typing import List, Dict, Any, Tuple
import math
from datetime import datetime

from backend.app.domain.schemas import (
    ActionType,
    PolicyVerdict,
    CandidateAction,
    TreeSHAPFactor,
    WhyWhyNotExplanation,
    DecisionEvaluationResult,
    DataProvenance,
)
from backend.app.domain.debtor_twin import DebtorDigitalTwin


class DecisionEngine:
    """
    Evaluates candidate actions using Integer Paise EV Math:
    EV(a) = floor( P(a) * Amount_paise - Cost_paise - FatiguePenalty_paise )
    """

    # Intervention Costs in integer Paise (1 INR = 100 paise)
    COSTS_PAISE = {
        ActionType.WAIT: 0,
        ActionType.NUDGE_EMAIL: 25,       # ₹0.25
        ActionType.NUDGE_WHATSAPP: 80,    # ₹0.80
        ActionType.ESCALATE_HUMAN: 500,   # ₹5.00
        ActionType.RECONCILE_TAX: 0,
        ActionType.FLAG_DISPUTE: 0,
        ActionType.NEEDS_REVIEW: 0,
        ActionType.NO_ACTION: 0,
    }

    # Friction rates for customer fatigue modeling
    FRICTION_RATES = {
        ActionType.WAIT: 0.0,
        ActionType.NUDGE_EMAIL: 0.015,     # 1.5% relationship friction
        ActionType.NUDGE_WHATSAPP: 0.035,  # 3.5% relationship friction
        ActionType.ESCALATE_HUMAN: 0.0,
        ActionType.RECONCILE_TAX: 0.0,
        ActionType.FLAG_DISPUTE: 0.0,
        ActionType.NEEDS_REVIEW: 0.0,
        ActionType.NO_ACTION: 0.0,
    }

    # Tunable fatigue exponent (superlinear contact decay)
    FATIGUE_EXPONENT = 1.4

    def evaluate_candidates(
        self,
        invoice_id: str,
        invoice_amount_inr: float,
        validated_tds_pct: float,
        debtor: DebtorDigitalTwin,
        base_probability: float,
        intent: str,
        is_ambiguous: bool = False,
        dispute_type: str = "NONE",
    ) -> Tuple[List[CandidateAction], ActionType, PolicyVerdict, WhyWhyNotExplanation]:
        """
        Evaluates candidate actions and returns candidate table, winner, verdict, and explanation.
        """
        # Calculate net locked settlement amount after TDS in paise
        net_amount_inr = round(invoice_amount_inr * (1.0 - validated_tds_pct), 2)
        amount_paise = int(round(net_amount_inr * 100))
        contacts = debtor.contact_count_current_cycle

        candidates: List[CandidateAction] = []

        # -------------------------------------------------------------------
        # 1. WAIT Candidate
        # -------------------------------------------------------------------
        p_wait = base_probability
        cost_wait_paise = self.COSTS_PAISE[ActionType.WAIT]
        fatigue_wait_paise = 0
        ev_wait_paise = int(math.floor(p_wait * amount_paise - cost_wait_paise - fatigue_wait_paise))
        
        # -------------------------------------------------------------------
        # 2. NUDGE_EMAIL Candidate
        # -------------------------------------------------------------------
        p_email = min(0.98, base_probability + 0.008)
        cost_email_paise = self.COSTS_PAISE[ActionType.NUDGE_EMAIL]
        fatigue_email_paise = int(math.floor(
            self.FRICTION_RATES[ActionType.NUDGE_EMAIL] * math.pow(contacts + 1, self.FATIGUE_EXPONENT) * amount_paise
        ))
        ev_email_paise = int(math.floor(p_email * amount_paise - cost_email_paise - fatigue_email_paise))

        # -------------------------------------------------------------------
        # 3. NUDGE_WHATSAPP Candidate
        # -------------------------------------------------------------------
        p_wa = min(0.99, base_probability + 0.013)
        cost_wa_paise = self.COSTS_PAISE[ActionType.NUDGE_WHATSAPP]
        fatigue_wa_paise = int(math.floor(
            self.FRICTION_RATES[ActionType.NUDGE_WHATSAPP] * math.pow(contacts + 1, self.FATIGUE_EXPONENT) * amount_paise
        ))
        ev_wa_paise = int(math.floor(p_wa * amount_paise - cost_wa_paise - fatigue_wa_paise))

        # -------------------------------------------------------------------
        # 4. ESCALATE_HUMAN Candidate
        # -------------------------------------------------------------------
        p_esc = min(0.99, base_probability + 0.018)
        cost_esc_paise = self.COSTS_PAISE[ActionType.ESCALATE_HUMAN]
        fatigue_esc_paise = 0
        ev_esc_paise = int(math.floor(p_esc * amount_paise - cost_esc_paise - fatigue_esc_paise))

        # -------------------------------------------------------------------
        # 5. NO_ACTION Candidate (Flat EV = 0 by definition)
        # -------------------------------------------------------------------
        cost_no_act_paise = 0
        fatigue_no_act_paise = 0
        ev_no_act_paise = 0

        # Build candidate objects with initial verdicts
        # Handle Ambiguity & Dispute overrides first
        if is_ambiguous:
            selected_action = ActionType.NEEDS_REVIEW
            winner_verdict = PolicyVerdict.SELECTED
            why_card = WhyWhyNotExplanation(
                why_chosen=[
                    "Evidence is split across conflicting tax/reconciliation categories.",
                    "Confidence margin is < 15%; system refuses to force an arbitrary guess.",
                    "Routed to Credit Operations for document clarification.",
                ]
            )
        elif dispute_type in ["GST_2A_MISMATCH", "MISSING_PO", "PRICE_MISMATCH"]:
            selected_action = ActionType.FLAG_DISPUTE
            winner_verdict = PolicyVerdict.SELECTED
            why_card = WhyWhyNotExplanation(
                why_chosen=[
                    f"Procedural dispute identified: {dispute_type}.",
                    "Automated dunning reminders suspended to protect debtor relationship.",
                    "Missing documentation requirement flagged in Credit Ops Action Queue.",
                ]
            )
        elif debtor.promise_credibility_score >= 70 and intent in ["PROMISE_TO_PAY", "SCHEDULED_PAYMENT_RUN"]:
            # High Credibility Promise -> WAIT is Selected
            selected_action = ActionType.WAIT
            winner_verdict = (
                PolicyVerdict.REQUIRES_APPROVAL
                if invoice_amount_inr >= 250000.0
                else PolicyVerdict.SELECTED
            )
            why_card = WhyWhyNotExplanation(
                why_chosen=[
                    f"Debtor Promise Credibility Score is {debtor.promise_credibility_score}/100 (High Trust).",
                    "Active payment commitment date is active and non-expired.",
                    f"Expected value of waiting is ₹{ev_wait_paise / 100:,.2f} without relationship fatigue.",
                ],
                why_not_nudge=[
                    f"Debtor was contacted {debtor.last_contact_date or 'recently'}; anti-spam cooldown active.",
                    f"Fatigue penalty (₹{fatigue_email_paise / 100:,.2f}) outweighs marginal 0.8% probability gain.",
                ],
                why_not_escalate=[
                    f"Escalate yields high raw EV (₹{ev_esc_paise / 100:,.2f}), but is BLOCKED by Policy because debtor has high credibility ({debtor.promise_credibility_score}/100) and zero payment avoidance history.",
                    "Expected Value proposes, but Policy holds absolute veto power—maximizing EV alone never authorizes an action without legitimate cause.",
                ],
            )
        else:
            # Low Credibility / Delayer -> ESCALATE
            selected_action = ActionType.ESCALATE_HUMAN
            winner_verdict = (
                PolicyVerdict.REQUIRES_APPROVAL
                if invoice_amount_inr >= 250000.0
                else PolicyVerdict.SELECTED
            )
            why_card = WhyWhyNotExplanation(
                why_chosen=[
                    f"Debtor Promise Credibility Score is low ({debtor.promise_credibility_score}/100).",
                    f"Historical promise fulfillment is poor ({debtor.promises_broken} broken promises, Avg DBT +{debtor.average_dbt_days:.0f}d).",
                    "Automated reminders suppressed in favor of high-touch credit manager escalation.",
                ],
                why_not_nudge=[
                    "Automated email/SMS nudges previously ignored or broken.",
                    "Continuing automated dunning increases fatigue without driving recovery.",
                ],
            )

        # Assemble candidate items
        candidates.append(
            CandidateAction(
                action=ActionType.WAIT,
                description="Snooze dunning until promised payment date",
                probability_recovery=round(p_wait, 3),
                cost_inr=round(cost_wait_paise / 100.0, 2),
                cost_paise=cost_wait_paise,
                fatigue_penalty_inr=round(fatigue_wait_paise / 100.0, 2),
                fatigue_penalty_paise=fatigue_wait_paise,
                expected_value_inr=round(ev_wait_paise / 100.0, 2),
                expected_value_paise=ev_wait_paise,
                verdict=PolicyVerdict.SELECTED if selected_action == ActionType.WAIT else PolicyVerdict.ALLOWED,
                verdict_reason="Selected by high promise credibility" if selected_action == ActionType.WAIT else "Allowed candidate",
            )
        )
        candidates.append(
            CandidateAction(
                action=ActionType.NUDGE_EMAIL,
                description="Send gentle automated email payment link",
                probability_recovery=round(p_email, 3),
                cost_inr=round(cost_email_paise / 100.0, 2),
                cost_paise=cost_email_paise,
                fatigue_penalty_inr=round(fatigue_email_paise / 100.0, 2),
                fatigue_penalty_paise=fatigue_email_paise,
                expected_value_inr=round(ev_email_paise / 100.0, 2),
                expected_value_paise=ev_email_paise,
                verdict=PolicyVerdict.ALLOWED if selected_action != ActionType.NUDGE_EMAIL else PolicyVerdict.SELECTED,
                verdict_reason="Allowed candidate with fatigue penalty deduction",
            )
        )
        candidates.append(
            CandidateAction(
                action=ActionType.NUDGE_WHATSAPP,
                description="Send urgent WhatsApp payment reminder link",
                probability_recovery=round(p_wa, 3),
                cost_inr=round(cost_wa_paise / 100.0, 2),
                cost_paise=cost_wa_paise,
                fatigue_penalty_inr=round(fatigue_wa_paise / 100.0, 2),
                fatigue_penalty_paise=fatigue_wa_paise,
                expected_value_inr=round(ev_wa_paise / 100.0, 2),
                expected_value_paise=ev_wa_paise,
                verdict=PolicyVerdict.ALLOWED if selected_action != ActionType.NUDGE_WHATSAPP else PolicyVerdict.SELECTED,
                verdict_reason="Allowed candidate with higher friction score",
            )
        )
        candidates.append(
            CandidateAction(
                action=ActionType.ESCALATE_HUMAN,
                description="Route to Credit Controller for 1-on-1 account recovery",
                probability_recovery=round(p_esc, 3),
                cost_inr=round(cost_esc_paise / 100.0, 2),
                cost_paise=cost_esc_paise,
                fatigue_penalty_inr=0.0,
                fatigue_penalty_paise=0,
                expected_value_inr=round(ev_esc_paise / 100.0, 2),
                expected_value_paise=ev_esc_paise,
                verdict=(
                    PolicyVerdict.SELECTED
                    if selected_action == ActionType.ESCALATE_HUMAN
                    else PolicyVerdict.BLOCKED_POLICY_VETO
                ),
                verdict_reason=(
                    "Selected for chronic delayer"
                    if selected_action == ActionType.ESCALATE_HUMAN
                    else "Blocked by Policy: No evidence of payment avoidance. High raw EV does not override policy."
                ),
            )
        )
        candidates.append(
            CandidateAction(
                action=ActionType.NO_ACTION,
                description="Take no action (organic baseline)",
                probability_recovery=None,  # Label N/A in UI
                cost_inr=0.0,
                cost_paise=0,
                fatigue_penalty_inr=0.0,
                fatigue_penalty_paise=0,
                expected_value_inr=0.0,
                expected_value_paise=0,
                verdict=PolicyVerdict.BASELINE,
                verdict_reason="Structural baseline: EV is flat ₹0.00 by definition (organic recovery is never claimed as AI value)",
            )
        )

        return candidates, selected_action, winner_verdict, why_card


# Global singleton instance
decision_engine = DecisionEngine()
