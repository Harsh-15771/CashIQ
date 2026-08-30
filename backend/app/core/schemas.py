from datetime import datetime, date
from enum import Enum
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, field_validator, computed_field


class IntentType(str, Enum):
    PROMISE_TO_PAY = "PROMISE_TO_PAY"
    DISPUTE_RAISED = "DISPUTE_RAISED"
    CLAIMED_PAID = "CLAIMED_PAID"
    PROCEDURAL_DELAY = "PROCEDURAL_DELAY"
    IRRELEVANT = "IRRELEVANT"


class DisputeType(str, Enum):
    GST_2A_MISMATCH = "GST_2A_MISMATCH"
    MISSING_PO = "MISSING_PO"
    DAMAGED_GOODS = "DAMAGED_GOODS"
    PRICE_MISMATCH = "PRICE_MISMATCH"
    NONE = "NONE"


class InvoiceStatus(str, Enum):
    ISSUED = "ISSUED"
    OVERDUE = "OVERDUE"
    PARSING = "PARSING"
    SNOOZED = "SNOOZED"
    WATCH_CADENCE = "WATCH_CADENCE"
    DISPUTED = "DISPUTED"
    ESCALATED = "ESCALATED"
    BROKEN_PTP = "BROKEN_PTP"
    UNVERIFIED_PAYMENT_CLAIM = "UNVERIFIED_PAYMENT_CLAIM"
    UNLINKED_INBOUND = "UNLINKED_INBOUND"
    SETTLED = "SETTLED"


class ActionDecision(str, Enum):
    SNOOZE = "SNOOZE"
    WATCH = "WATCH"
    ESCALATE = "ESCALATE"
    FLAG_DISPUTE = "FLAG_DISPUTE"
    VERIFY_UTR = "VERIFY_UTR"
    MANUAL_REVIEW = "MANUAL_REVIEW"


class ExtractedCommitment(BaseModel):
    has_promise: bool = Field(default=False, description="True if email contains a concrete or conditional payment promise")
    promised_date: Optional[str] = Field(default=None, description="ISO-8601 string YYYY-MM-DD")
    utr_number: Optional[str] = Field(default=None, description="Bank transaction reference UTR if mentioned")
    tds_percentage: Optional[float] = Field(default=None, ge=0.0, le=0.10, description="Withholding tax rate e.g. 0.02 for 2%")
    has_condition: bool = Field(default=False, description="True if promise is contingent on another event")
    raw_condition: Optional[str] = Field(default=None, description="Extracted text of condition e.g. 'pending CFO signature'")

    @field_validator("promised_date")
    @classmethod
    def validate_date_format(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            try:
                datetime.strptime(v, "%Y-%m-%d")
            except ValueError as e:
                raise ValueError(f"Invalid calendar date string: '{v}'. Must be valid ISO-8601 YYYY-MM-DD.") from e
        return v


class EmailAnalysisResult(BaseModel):
    invoice_id: Optional[str] = Field(default=None, description="Matched invoice identifier e.g. INV-1004")
    intent: IntentType = Field(default=IntentType.IRRELEVANT)
    dispute: DisputeType = Field(default=DisputeType.NONE)
    commitment: ExtractedCommitment = Field(default_factory=ExtractedCommitment)
    confidence_score: float = Field(..., ge=0.0, le=1.0, description="LLM Extraction Confidence")
    suggested_action: str = Field(default="", description="Recommended operational action")
    missing_document_requirement: Optional[str] = Field(default=None, description="Specific document needed if disputed")


class DebtorProfile(BaseModel):
    debtor_id: str
    company_name: str
    gstin: Optional[str] = None
    contact_email: str
    historical_promises_kept: int = 0
    historical_promises_total: int = 0
    historical_avg_dbt: float = 0.0  # Average Days Beyond Terms on settled invoices
    total_invoices_settled_count: int = 0

    @computed_field
    @property
    def laplace_fulfillment_ratio(self) -> float:
        """Computes Laplace-smoothed fulfillment ratio: (kept + 1) / (total + 2). Defaults to 0.50 when total=0."""
        return round((self.historical_promises_kept + 1.0) / (self.historical_promises_total + 2.0), 3)


class InvoiceRecord(BaseModel):
    invoice_id: str
    debtor_id: str
    amount: float = Field(..., gt=0.0)
    issue_date: str  # YYYY-MM-DD
    due_date: str    # YYYY-MM-DD
    payment_terms_days: int = 30  # Net 15, 30, 45, 60
    status: InvoiceStatus = InvoiceStatus.ISSUED
    settled_date: Optional[str] = None
    active_ptp_date: Optional[str] = None
    last_contact_date: Optional[str] = None
    current_overdue_days: int = 0
    tds_deduction_amount: float = 0.0
    razorpay_payment_link_id: Optional[str] = None


class SHAPAttribution(BaseModel):
    feature_name: str
    feature_value: Any
    attribution_value: float  # Positive = increases fulfillment likelihood, Negative = decreases


class MLPredictionResult(BaseModel):
    fulfillment_probability: float = Field(..., ge=0.0, le=1.0, description="Calibrated P(Promise Fulfilled)")
    risk_category: str = Field(..., description="HIGH_CREDIBILITY (>=0.70) | MODERATE_UNCERTAIN (0.50-0.70) | LOW_CREDIBILITY (<0.50)")
    decision_recommendation: ActionDecision
    top_shap_attributions: List[SHAPAttribution] = Field(default_factory=list)
    model_version: str = "lightgbm_ptp_v1.0"
