import pytest
from backend.app.domain.tax_reconciler import TaxReconciler

def test_corporate_tds_194c_2_percent():
    reconciler = TaxReconciler()
    gross = 118000.0  # 1,00,000 base + 18% GST (18,000)
    # 2% TDS on 1,00,000 base = 2,000 TDS -> Net = 1,16,000
    res = reconciler.analyze_short_payment(
        invoice_id="INV-TAX-01",
        gross_invoice_amount_inr=gross,
        actual_received_inr=116000.0,
        gst_rate_pct=0.18,
        stated_tds_pct=0.02,
    )
    assert res.is_legitimate_tds_withholding is True
    assert res.reconciliation_verdict == "LEGITIMATE_TDS_WITHHOLDING"
    assert res.expected_tds_pct == 0.02
    assert res.unexplained_variance_inr <= 1.0

def test_individual_tds_194c_1_percent():
    reconciler = TaxReconciler()
    gross = 59000.0  # 50,000 base + 18% GST (9,000)
    # 1% TDS on 50,000 base = 500 TDS -> Net = 58,500
    res = reconciler.analyze_short_payment(
        invoice_id="INV-TAX-02",
        gross_invoice_amount_inr=gross,
        actual_received_inr=58500.0,
        gst_rate_pct=0.18,
        stated_tds_pct=0.01,
    )
    assert res.is_legitimate_tds_withholding is True
    assert res.reconciliation_verdict == "LEGITIMATE_TDS_WITHHOLDING"
    assert res.expected_tds_pct == 0.01

def test_professional_tds_194j_10_percent():
    reconciler = TaxReconciler()
    gross = 236000.0  # 2,00,000 base + 18% GST (36,000)
    # 10% TDS on 2,00,000 base = 20,000 TDS -> Net = 2,16,000
    res = reconciler.analyze_short_payment(
        invoice_id="INV-TAX-03",
        gross_invoice_amount_inr=gross,
        actual_received_inr=216000.0,
        gst_rate_pct=0.18,
        stated_tds_pct=0.10,
    )
    assert res.is_legitimate_tds_withholding is True
    assert res.reconciliation_verdict == "LEGITIMATE_TDS_WITHHOLDING"
    assert res.expected_tds_pct == 0.10

def test_arbitrary_short_payment_triggers_unreconciled_dispute():
    reconciler = TaxReconciler()
    # 25% unexplained short payment
    res = reconciler.analyze_short_payment(
        invoice_id="INV-TAX-04",
        gross_invoice_amount_inr=100000.0,
        actual_received_inr=75000.0,
        gst_rate_pct=0.18,
        stated_tds_pct=0.02,
    )
    assert res.is_legitimate_tds_withholding is False
    assert res.reconciliation_verdict == "RECONCILIATION_REQUIRED"
    assert res.unexplained_variance_inr > 1000.0
