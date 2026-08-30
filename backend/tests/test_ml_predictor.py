import pytest
from datetime import date
from backend.app.core.schemas import (
    DebtorProfile,
    InvoiceRecord,
    ExtractedCommitment,
    ActionDecision,
)
from backend.app.ml.predictor import PTPPredictor
from backend.app.ml.train import train_ptp_model


@pytest.fixture(scope="module")
def trained_predictor(tmp_path_factory):
    tmp_dir = str(tmp_path_factory.mktemp("ml_artifacts"))
    metrics = train_ptp_model(n_samples=2000)
    assert metrics["roc_auc"] >= 0.75, f"Expected ROC-AUC >= 0.75, got {metrics['roc_auc']}"
    return PTPPredictor()


def test_reliable_debtor_with_utr_prediction(trained_predictor):
    """A reliable debtor with high fulfillment history and explicit UTR should receive high credibility and SNOOZE."""
    debtor = DebtorProfile(
        debtor_id="DEBTOR_001",
        company_name="Apex Logistics India Ltd",
        contact_email="finance@apexlogistics.in",
        historical_promises_kept=18,
        historical_promises_total=20,
        historical_avg_dbt=1.5,
        total_invoices_settled_count=25,
    )
    invoice = InvoiceRecord(
        invoice_id="INV-2026-001",
        debtor_id="DEBTOR_001",
        amount=150000.0,
        issue_date="2026-07-15",
        due_date="2026-08-15",
        current_overdue_days=7,
    )
    commitment = ExtractedCommitment(
        has_promise=True,
        promised_date="2026-08-25",
        utr_number="SBIN00293847192",
        has_condition=False,
    )

    result = trained_predictor.predict(debtor, invoice, commitment, current_date=date(2026, 8, 22))

    assert result.fulfillment_probability >= 0.70, f"Expected prob >= 0.70, got {result.fulfillment_probability}"
    assert result.risk_category == "HIGH_CREDIBILITY"
    assert result.decision_recommendation == ActionDecision.SNOOZE
    assert len(result.top_shap_attributions) == 3


def test_chronic_delayer_prediction(trained_predictor):
    """A chronic delayer with multiple broken promises and conditional delay should receive low credibility and ESCALATE."""
    debtor = DebtorProfile(
        debtor_id="DEBTOR_002",
        company_name="Vague Retail Enterprises",
        contact_email="accounts@vagueretail.com",
        historical_promises_kept=1,
        historical_promises_total=10,
        historical_avg_dbt=35.0,
        total_invoices_settled_count=12,
    )
    invoice = InvoiceRecord(
        invoice_id="INV-2026-002",
        debtor_id="DEBTOR_002",
        amount=850000.0,
        issue_date="2026-06-01",
        due_date="2026-07-01",
        current_overdue_days=52,
    )
    commitment = ExtractedCommitment(
        has_promise=True,
        promised_date="2026-09-30",
        has_condition=True,
        raw_condition="Subject to internal auditor clearance and board approval",
    )

    result = trained_predictor.predict(debtor, invoice, commitment, current_date=date(2026, 8, 22))

    assert result.fulfillment_probability < 0.50, f"Expected prob < 0.50, got {result.fulfillment_probability}"
    assert result.risk_category == "LOW_CREDIBILITY"
    assert result.decision_recommendation == ActionDecision.ESCALATE


def test_cold_start_debtor_prediction(trained_predictor):
    """A brand new debtor (N=0) should evaluate safely without NaN or crash."""
    debtor = DebtorProfile(
        debtor_id="DEBTOR_NEW",
        company_name="Fresh Startup India LLP",
        contact_email="ap@freshstartup.in",
        historical_promises_kept=0,
        historical_promises_total=0,
        historical_avg_dbt=0.0,
        total_invoices_settled_count=0,
    )
    invoice = InvoiceRecord(
        invoice_id="INV-2026-003",
        debtor_id="DEBTOR_NEW",
        amount=50000.0,
        issue_date="2026-08-01",
        due_date="2026-08-15",
        current_overdue_days=7,
    )
    commitment = ExtractedCommitment(
        has_promise=True,
        promised_date="2026-08-25",
        has_condition=False,
    )

    result = trained_predictor.predict(debtor, invoice, commitment, current_date=date(2026, 8, 22))

    assert 0.0 <= result.fulfillment_probability <= 1.0
    assert result.decision_recommendation in [ActionDecision.SNOOZE, ActionDecision.WATCH, ActionDecision.ESCALATE]
    assert len(result.top_shap_attributions) == 3
