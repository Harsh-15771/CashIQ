"""
Core Domain Schemas for CashIQ B2B Receivables Decision Intelligence.
Enforces Integer Paise financial precision, Pydantic v2 validation,
and explicit data provenance labeling.
"""

from datetime import date, datetime
from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field, computed_field


class ActionType(str, Enum):
    WAIT = "WAIT"
    NUDGE_EMAIL = "NUDGE_EMAIL"
    NUDGE_WHATSAPP = "NUDGE_WHATSAPP"
    ESCALATE_HUMAN = "ESCALATE_HUMAN"
    RECONCILE_TAX = "RECONCILE_TAX"
    FLAG_DISPUTE = "FLAG_DISPUTE"
    NEEDS_REVIEW = "NEEDS_REVIEW"
    NO_ACTION = "NO_ACTION"


class PolicyVerdict(str, Enum):
    SELECTED = "SELECTED"
    ALLOWED = "ALLOWED"
    BLOCKED_POLICY_VETO = "BLOCKED (Policy Veto)"
    REQUIRES_APPROVAL = "REQUIRES_APPROVAL (> ₹2.5L)"
    BASELINE = "BASELINE"


class DisputeCategory(str, Enum):
    NONE = "NONE"
    GST_2A_MISMATCH = "GST_2A_MISMATCH"
    MISSING_PO = "MISSING_PO"
    PRICE_MISMATCH = "PRICE_MISMATCH"
    SERVICE_DEFICIENCY = "SERVICE_DEFICIENCY"
    TAX_WITHHOLDING_AMBIGUITY = "TAX_WITHHOLDING_AMBIGUITY"


class DataProvenance(str, Enum):
    SYNTHETIC_SEEDED = "SYNTHETIC_SEEDED"
    RAZORPAY_TEST_MODE = "RAZORPAY_TEST_MODE"
    LLM_EXTRACTED = "LLM_EXTRACTED"
    DETERMINISTIC_DERIVED = "DETERMINISTIC_DERIVED"
    POLICY_ENFORCED = "POLICY_ENFORCED"


# ============================================================================
# 1. DEBTOR DIGITAL TWIN & RELATIONSHIP TIMELINE
# ============================================================================

class TimelineEvent(BaseModel):
    date: str
    invoice_id: str
    amount_inr: float
    event_type: str  # PAID, PROMISE_KEPT, PROMISE_BROKEN, DISPUTED, ACTIVE_PROMISE
    days_delayed: int = 0
    note: str
    provenance: DataProvenance = DataProvenance.SYNTHETIC_SEEDED


class DecisionDiff(BaseModel):
    previous_decision: str
    previous_date: str
    current_decision: str
    current_date: str
    reason_for_diff: str
    credibility_delta: int


class DebtorDigitalTwin(BaseModel):
    debtor_id: str
    company_name: str
    contact_email: str
    contact_phone: Optional[str] = None
    relationship_age_years: float = 1.0
    total_invoices_count: int = 0
    total_invoiced_amount_inr: float = 0.0
    total_outstanding_inr: float = 0.0
    total_overdue_inr: float = 0.0
    promises_kept: int = 0
    promises_broken: int = 0
    dispute_count: int = 0
    average_dbt_days: float = 0.0
    last_contact_date: Optional[str] = None
    contact_count_current_cycle: int = 0
    gstin: Optional[str] = None
    pan: Optional[str] = None
    timeline: List[TimelineEvent] = Field(default_factory=list)
    decision_diff: Optional[DecisionDiff] = None

    @computed_field
    @property
    def total_promises(self) -> int:
        return self.promises_kept + self.promises_broken

    @computed_field
    @property
    def laplace_fulfillment_ratio(self) -> float:
        """Laplace-smoothed fulfillment ratio: (kept + 1) / (total + 2). Never NaN."""
        return round((self.promises_kept + 1) / (self.total_promises + 2), 3)

    @computed_field
    @property
    def promise_credibility_score(self) -> int:
        """
        Promise Credibility Score C_ptp in [0, 100].
        Weights:
        - Laplace Promise Ratio: 45%
        - DBT Speed Factor: 25%
        - Relationship Age: 15%
        - Low Dispute History: 15%
        """
        laplace_comp = 0.45 * self.laplace_fulfillment_ratio
        dbt_comp = 0.25 * max(0.0, 1.0 - (self.average_dbt_days / 45.0))
        age_comp = 0.15 * min(1.0, self.relationship_age_years / 2.0)
        dispute_penalty = 0.15 * max(0.0, 1.0 - (self.dispute_count / 3.0))
        raw_score = 100.0 * (laplace_comp + dbt_comp + age_comp + dispute_penalty)
        return int(round(max(0.0, min(100.0, raw_score))))


# ============================================================================
# 2. RECEIVABLES LEDGER DECOMPOSITION
# ============================================================================

class ReceivablesDecomposition(BaseModel):
    total_outstanding_inr: float
    collectible_now_inr: float
    promised_snoozed_inr: float
    under_dispute_inr: float
    tax_tds_withheld_inr: float
    reconciliation_variance_inr: float
    not_yet_due_inr: float
    
    # Item counts
    total_invoices_count: int
    collectible_count: int
    promised_count: int
    disputed_count: int
    tds_count: int
    reconciliation_count: int
    not_due_count: int
    
    provenance: DataProvenance = DataProvenance.DETERMINISTIC_DERIVED


# ============================================================================
# 3. EXPECTED VALUE & CANDIDATE ACTION EVALUATION
# ============================================================================

class CandidateAction(BaseModel):
    action: ActionType
    description: str
    probability_recovery: Optional[float] = None  # None for NO_ACTION
    cost_inr: float
    cost_paise: int
    fatigue_penalty_inr: float
    fatigue_penalty_paise: int
    expected_value_inr: float
    expected_value_paise: int
    verdict: PolicyVerdict
    verdict_reason: str


class TreeSHAPFactor(BaseModel):
    feature_name: str
    display_label: str
    impact_pct: float
    positive: bool


class WhyWhyNotExplanation(BaseModel):
    why_chosen: List[str]
    why_not_nudge: Optional[List[str]] = None
    why_not_escalate: Optional[List[str]] = None
    why_not_dispute: Optional[List[str]] = None


class DecisionEvaluationResult(BaseModel):
    invoice_id: str
    debtor_id: str
    company_name: str
    invoice_amount_inr: float
    locked_settlement_amount_inr: float
    tds_rate_pct: float
    intent_detected: str
    intent_confidence: float
    is_ambiguous: bool
    promise_credibility_score: int
    selected_action: ActionType
    policy_verdict: PolicyVerdict
    candidates_table: List[CandidateAction]
    top_shap_factors: List[TreeSHAPFactor]
    why_why_not: WhyWhyNotExplanation
    decision_id: str
    timestamp: str
    provenance: DataProvenance = DataProvenance.DETERMINISTIC_DERIVED


# ============================================================================
# 4. DECISION REPLAY CACHE & AUDIT
# ============================================================================

class DecisionSnapshot(BaseModel):
    decision_id: str
    timestamp: str
    invoice_id: str
    debtor_id: str
    raw_payload_snippet: str
    cached_llm_extraction: Dict[str, Any]
    model_version: str = "PTP-LGBM-v1.0"
    policy_version: str = "CashIQ-Policy-v2.0"
    ledger_state_hash: str
    decision_output: DecisionEvaluationResult


class DecisionReplayVerification(BaseModel):
    decision_id: str
    model_version_used: str
    policy_version_used: str
    original_action: str
    replayed_action: str
    is_deterministic_match: bool
    verification_message: str


# ============================================================================
# 5. 50/50 EXPERIMENT LAB & INCREMENTAL ATTRIBUTION
# ============================================================================

class ExperimentMetrics(BaseModel):
    arm_name: str  # TREATMENT or CONTROL
    strategy_description: str
    debtor_count: int
    total_at_risk_inr: float
    recovered_amount_inr: float
    recovery_rate_pct: float
    total_contacts_sent: int
    human_escalations_count: int
    intervention_costs_inr: float
    net_recovered_inr: float


class SimulatedExperimentSummary(BaseModel):
    experiment_id: str
    title: str = "Simulated Incremental Recovery Under Seeded Population (N=500, Seed=42)"
    population_size: int = 500
    random_seed: int = 42
    control_arm: ExperimentMetrics
    treatment_arm: ExperimentMetrics
    incremental_recovered_inr: float
    relative_recovery_uplift_pct: float
    spam_contacts_reduced_count: int
    spam_reduction_pct: float
    manual_escalations_reduced_count: int
    net_incremental_value_inr: float
    provenance: DataProvenance = DataProvenance.SYNTHETIC_SEEDED
