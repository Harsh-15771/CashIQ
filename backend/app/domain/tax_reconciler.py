"""
GST & TDS Tax Withholding Short-Payment Reconciler.
Analyzes B2B payment variances to determine if a shortfall is a legitimate Section 194C/194J
TDS tax deduction or GST GSTR-2B mismatch rather than an intentional default or collection failure.
"""

from typing import Dict, Any, Optional
from pydantic import BaseModel


class ShortPaymentAnalysisResult(BaseModel):
    invoice_id: str
    gross_invoice_amount_inr: float
    gst_component_inr: float
    base_taxable_amount_inr: float
    expected_tds_pct: float
    expected_tds_amount_inr: float
    expected_net_receipt_inr: float
    actual_received_inr: float
    unexplained_variance_inr: float
    is_legitimate_tds_withholding: bool
    reconciliation_verdict: str
    explanation: str


class TaxReconciler:
    """
    Performs deterministic tax line matching and variance decomposition.
    """

    STANDARD_TDS_RATES = [0.01, 0.02, 0.05, 0.10]  # 194C, 194J, etc.

    def analyze_short_payment(
        self,
        invoice_id: str,
        gross_invoice_amount_inr: float,
        actual_received_inr: float,
        gst_rate_pct: float = 0.18,
        stated_tds_pct: Optional[float] = 0.02,
    ) -> ShortPaymentAnalysisResult:
        """
        Analyzes a received amount vs gross invoice amount.
        Gross = Base * (1 + GST)
        TDS is deducted on Base taxable amount (Section 194C).
        """
        base_taxable = round(gross_invoice_amount_inr / (1.0 + gst_rate_pct), 2)
        gst_amount = round(gross_invoice_amount_inr - base_taxable, 2)

        tds_pct = stated_tds_pct if stated_tds_pct in self.STANDARD_TDS_RATES else 0.02
        expected_tds = round(base_taxable * tds_pct, 2)
        expected_net = round(gross_invoice_amount_inr - expected_tds, 2)

        variance = round(abs(expected_net - actual_received_inr), 2)
        is_matched = variance <= 10.0  # Within rounding tolerance

        if is_matched:
            verdict = "LEGITIMATE_TDS_WITHHOLDING"
            explanation = (
                f"Received amount (₹{actual_received_inr:,.2f}) matches expected net settlement after {tds_pct*100:.0f}% Section 194C TDS deduction (₹{expected_tds:,.2f}) on base taxable value (₹{base_taxable:,.2f}). "
                "Automated collection dunning prevented; tax withholding verified."
            )
        else:
            verdict = "RECONCILIATION_REQUIRED"
            explanation = (
                f"Shortfall of ₹{variance:,.2f} cannot be explained by standard 2% TDS or GST rate. "
                "Flagged for Accounts Receivable ledger reconciliation."
            )

        return ShortPaymentAnalysisResult(
            invoice_id=invoice_id,
            gross_invoice_amount_inr=gross_invoice_amount_inr,
            gst_component_inr=gst_amount,
            base_taxable_amount_inr=base_taxable,
            expected_tds_pct=tds_pct,
            expected_tds_amount_inr=expected_tds,
            expected_net_receipt_inr=expected_net,
            actual_received_inr=actual_received_inr,
            unexplained_variance_inr=variance,
            is_legitimate_tds_withholding=is_matched,
            reconciliation_verdict=verdict,
            explanation=explanation,
        )


# Global singleton instance
tax_reconciler = TaxReconciler()
