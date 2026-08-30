import os
import joblib
import numpy as np
import pandas as pd
from typing import Dict, Any, Optional, List
from datetime import datetime, date

from ..core.schemas import (
    DebtorProfile,
    InvoiceRecord,
    ExtractedCommitment,
    MLPredictionResult,
    ActionDecision,
    SHAPAttribution,
)
from .train import FEATURE_COLUMNS, train_ptp_model


class PTPPredictor:
    """
    Inference engine for Promise-to-Pay (PTP) reliability scoring.
    Combines Debtor History, Invoice Characteristics, and LLM-extracted Promise Specifics
    to produce calibrated fulfillment probabilities and TreeSHAP feature attributions.
    """

    def __init__(self, artifacts_dir: Optional[str] = None):
        if artifacts_dir is None:
            artifacts_dir = os.path.join(os.path.dirname(__file__), "artifacts")
        self.artifacts_dir = artifacts_dir
        self.model = None
        self.explainer = None
        self._load_or_train()

    def _load_or_train(self):
        model_path = os.path.join(self.artifacts_dir, "ptp_classifier.joblib")
        explainer_path = os.path.join(self.artifacts_dir, "shap_explainer.joblib")

        if not os.path.exists(model_path) or not os.path.exists(explainer_path):
            print("Model artifacts not found. Initiating training pipeline...")
            train_ptp_model()

        self.model = joblib.load(model_path)
        self.explainer = joblib.load(explainer_path)

    def extract_features(
        self,
        debtor: DebtorProfile,
        invoice: InvoiceRecord,
        commitment: ExtractedCommitment,
        current_date: Optional[date] = None,
    ) -> pd.DataFrame:
        if current_date is None:
            current_date = date.today()

        # 1. Debtor History
        fulfillment_ratio = float(debtor.laplace_fulfillment_ratio)
        avg_dbt = float(debtor.historical_avg_dbt)
        invoices_settled = int(debtor.total_invoices_settled_count)

        # 2. Invoice Characteristics
        log_amount = float(np.log(max(1000.0, invoice.amount)))
        try:
            due_d = datetime.strptime(invoice.due_date, "%Y-%m-%d").date()
            overdue_days = max(0, (current_date - due_d).days)
        except Exception:
            overdue_days = float(invoice.current_overdue_days)

        # 3. Promise Specifics
        if commitment.promised_date:
            try:
                prom_d = datetime.strptime(commitment.promised_date, "%Y-%m-%d").date()
                promise_extension_days = max(1, (prom_d - current_date).days)
                is_month_end_promise = 1 if prom_d.day >= 25 else 0
            except Exception:
                promise_extension_days = 7
                is_month_end_promise = 0
        else:
            promise_extension_days = 7
            is_month_end_promise = 0

        has_utr = 1 if (commitment.utr_number and len(commitment.utr_number.strip()) >= 6) else 0
        has_condition = 1 if (commitment.has_condition or commitment.raw_condition) else 0

        feature_dict = {
            "historical_fulfillment_ratio": fulfillment_ratio,
            "historical_avg_dbt": avg_dbt,
            "total_invoices_settled_count": invoices_settled,
            "log_invoice_amount": log_amount,
            "current_overdue_days": float(overdue_days),
            "promise_extension_days": float(promise_extension_days),
            "has_utr_stated": has_utr,
            "is_month_end_promise": is_month_end_promise,
            "has_condition_attached": has_condition,
        }

        return pd.DataFrame([feature_dict])[FEATURE_COLUMNS]

    def predict(
        self,
        debtor: DebtorProfile,
        invoice: InvoiceRecord,
        commitment: ExtractedCommitment,
        current_date: Optional[date] = None,
    ) -> MLPredictionResult:
        X = self.extract_features(debtor, invoice, commitment, current_date=current_date)

        # Predict calibrated probability
        prob = float(self.model.predict_proba(X)[0, 1])

        # Compute SHAP values for explainability
        shap_values = self.explainer.shap_values(X)
        if isinstance(shap_values, list):
            # Binary classification list: [negative_class_shap, positive_class_shap]
            sv = shap_values[1][0]
        elif len(shap_values.shape) == 3:
            sv = shap_values[0, :, 1]
        else:
            sv = shap_values[0]

        # Top 3 most impactful SHAP attributions (by magnitude)
        indices = np.argsort(np.abs(sv))[::-1][:3]
        top_shap: List[SHAPAttribution] = []
        for idx in indices:
            col_name = FEATURE_COLUMNS[idx]
            raw_val = X[col_name].iloc[0]
            # Convert numpy types to native python float/int for strict JSON serialization
            py_val = raw_val.item() if hasattr(raw_val, "item") else raw_val
            attribution = float(sv[idx])
            top_shap.append(
                SHAPAttribution(
                    feature_name=col_name,
                    feature_value=py_val,
                    attribution_value=round(attribution, 4),
                )
            )

        # 3-Zone Probability Decision Matrix:
        if prob >= 0.70:
            risk_category = "HIGH_CREDIBILITY"
            decision = ActionDecision.SNOOZE
        elif prob >= 0.50:
            risk_category = "MODERATE_UNCERTAIN"
            decision = ActionDecision.WATCH
        else:
            risk_category = "LOW_CREDIBILITY"
            decision = ActionDecision.ESCALATE

        return MLPredictionResult(
            fulfillment_probability=round(prob, 4),
            risk_category=risk_category,
            decision_recommendation=decision,
            top_shap_attributions=top_shap,
        )


# Global singleton instance
_predictor_instance: Optional[PTPPredictor] = None


def get_ptp_predictor() -> PTPPredictor:
    global _predictor_instance
    if _predictor_instance is None:
        _predictor_instance = PTPPredictor()
    return _predictor_instance
