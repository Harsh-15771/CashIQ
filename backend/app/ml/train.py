import os
import json
import joblib
import numpy as np
import pandas as pd
from typing import Optional
from sklearn.model_selection import train_test_split
from sklearn.metrics import roc_auc_score, brier_score_loss, accuracy_score, classification_report
import lightgbm as lgb
import shap

from .generate_data import generate_ptp_dataset

FEATURE_COLUMNS = [
    "historical_fulfillment_ratio",
    "historical_avg_dbt",
    "total_invoices_settled_count",
    "log_invoice_amount",
    "current_overdue_days",
    "promise_extension_days",
    "has_utr_stated",
    "is_month_end_promise",
    "has_condition_attached",
]


def train_ptp_model(n_samples: int = 5000, random_state: int = 42, artifacts_dir: Optional[str] = None) -> dict:
    """
    Trains the LightGBM Promise-to-Pay Fulfillment Classifier and creates a TreeSHAP explainer.
    Saves model artifacts to artifacts_dir (defaults to backend/app/ml/artifacts/).
    """
    print(f"Generating {n_samples} synthetic training records...")
    df = generate_ptp_dataset(n_samples=n_samples, random_state=random_state)

    X = df[FEATURE_COLUMNS]
    y = df["fulfilled"]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=random_state, stratify=y
    )

    print("Training LightGBM Classifier...")
    model = lgb.LGBMClassifier(
        n_estimators=120,
        learning_rate=0.04,
        max_depth=4,
        num_leaves=15,
        min_child_samples=25,
        subsample=0.85,
        colsample_bytree=0.85,
        random_state=random_state,
        verbosity=-1
    )

    model.fit(X_train, y_train)

    # 4. Evaluation
    y_pred_proba = model.predict_proba(X_test)[:, 1]
    y_pred = (y_pred_proba >= 0.50).astype(int)

    roc_auc = float(roc_auc_score(y_test, y_pred_proba))
    brier = float(brier_score_loss(y_test, y_pred_proba))
    accuracy = float(accuracy_score(y_test, y_pred))

    print(f"Evaluation Results on Test Set (N={len(X_test)}):")
    print(f"  - ROC-AUC Score: {roc_auc:.4f}")
    print(f"  - Brier Score (Calibration): {brier:.4f}")
    print(f"  - Accuracy: {accuracy:.2%}")
    print("\nClassification Report:\n", classification_report(y_test, y_pred))

    # 5. TreeSHAP Explainer Setup
    print("Building TreeSHAP Explainer...")
    explainer = shap.TreeExplainer(model)

    # 6. Artifact Serialization
    if artifacts_dir is None:
        artifacts_dir = os.path.join(os.path.dirname(__file__), "artifacts")
    os.makedirs(artifacts_dir, exist_ok=True)

    model_path = os.path.join(artifacts_dir, "ptp_classifier.joblib")
    explainer_path = os.path.join(artifacts_dir, "shap_explainer.joblib")
    metrics_path = os.path.join(artifacts_dir, "metrics.json")

    joblib.dump(model, model_path)
    joblib.dump(explainer, explainer_path)

    feature_importances = dict(zip(FEATURE_COLUMNS, [float(v) for v in model.feature_importances_]))

    metrics = {
        "model_name": "LightGBM Promise-to-Pay Classifier",
        "version": "1.0.0",
        "training_samples": n_samples,
        "test_samples": len(X_test),
        "roc_auc": round(roc_auc, 4),
        "brier_score": round(brier, 4),
        "accuracy": round(accuracy, 4),
        "features": FEATURE_COLUMNS,
        "feature_importances": feature_importances,
    }

    with open(metrics_path, "w") as f:
        json.dump(metrics, f, indent=2)

    print(f"Artifacts successfully saved to {artifacts_dir}")
    return metrics


if __name__ == "__main__":
    train_ptp_model()
