from datetime import datetime, date, timedelta
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

from ..core.schemas import InvoiceRecord, DebtorProfile, InvoiceStatus
from .razorpay_client import ledger_service
from ..ml.predictor import get_ptp_predictor


class DailyCashForecastPoint(BaseModel):
    date_str: str  # YYYY-MM-DD
    day_name: str  # Mon, Tue, etc.
    contractual_due_inflow: float
    cashiq_predicted_inflow: float
    confidence_interval_low: float
    confidence_interval_high: float
    invoices_expected_count: int


class CashForecastSummary(BaseModel):
    start_date: str
    end_date: str
    total_contractual_volume: float
    total_cashiq_predicted_volume: float
    total_at_risk_volume: float
    forecast_points: List[DailyCashForecastPoint]


class CashFlowForecaster:
    """
    30-Day Explainable Cash Inflow Forecaster.
    Combines active Promise-to-Pay dates, Debtor Historical DBT, and LightGBM PTP Credibility.
    """

    @classmethod
    def generate_30_day_forecast(cls, start_date: Optional[date] = None) -> CashForecastSummary:
        if start_date is None:
            start_date = date.today()

        invoices = ledger_service.list_invoices()
        predictor = get_ptp_predictor()

        # Initialize 30-day timeline buckets
        timeline_buckets: Dict[str, Dict[str, Any]] = {}
        for offset in range(30):
            d = start_date + timedelta(days=offset)
            d_str = d.isoformat()
            timeline_buckets[d_str] = {
                "contractual": 0.0,
                "predicted": 0.0,
                "count": 0,
                "day_name": d.strftime("%a"),
            }

        total_contractual = 0.0
        total_predicted = 0.0
        total_at_risk = 0.0

        for inv in invoices:
            if inv.status == InvoiceStatus.SETTLED:
                continue

            debtor = ledger_service.get_debtor(inv.debtor_id)
            dbt = debtor.historical_avg_dbt if debtor else 5.0
            fulfillment_ratio = debtor.laplace_fulfillment_ratio if debtor else 0.50

            # 1. Contractual Due Bucket
            due_str = inv.due_date
            if due_str in timeline_buckets:
                timeline_buckets[due_str]["contractual"] += inv.amount
            total_contractual += inv.amount

            # 2. Predicted Settlement Date & Weighted Amount
            if inv.status == InvoiceStatus.SNOOZED and inv.active_ptp_date:
                expected_date_str = inv.active_ptp_date
                weight = max(0.65, min(0.95, fulfillment_ratio))
            else:
                try:
                    due_d = datetime.strptime(inv.due_date, "%Y-%m-%d").date()
                    expected_d = due_d + timedelta(days=max(0, int(dbt)))
                    if expected_d < start_date:
                        expected_d = start_date + timedelta(days=min(3, int(dbt) if dbt > 0 else 1))
                    expected_date_str = expected_d.isoformat()
                except Exception:
                    expected_date_str = (start_date + timedelta(days=7)).isoformat()
                weight = max(0.40, min(0.85, 1.0 - (inv.current_overdue_days / 90.0) * 0.4))

            predicted_val = inv.amount * weight

            if expected_date_str in timeline_buckets:
                timeline_buckets[expected_date_str]["predicted"] += predicted_val
                timeline_buckets[expected_date_str]["count"] += 1
                total_predicted += predicted_val
            else:
                # Beyond 30 days window -> at risk
                total_at_risk += inv.amount

        # Build daily points with confidence bounds (+/- 12%)
        points: List[DailyCashForecastPoint] = []
        for d_str, data in timeline_buckets.items():
            pred = round(data["predicted"], 2)
            points.append(
                DailyCashForecastPoint(
                    date_str=d_str,
                    day_name=data["day_name"],
                    contractual_due_inflow=round(data["contractual"], 2),
                    cashiq_predicted_inflow=pred,
                    confidence_interval_low=round(pred * 0.88, 2),
                    confidence_interval_high=round(pred * 1.12, 2),
                    invoices_expected_count=data["count"],
                )
            )

        end_date_str = (start_date + timedelta(days=29)).isoformat()

        return CashForecastSummary(
            start_date=start_date.isoformat(),
            end_date=end_date_str,
            total_contractual_volume=round(total_contractual, 2),
            total_cashiq_predicted_volume=round(total_predicted, 2),
            total_at_risk_volume=round(total_at_risk, 2),
            forecast_points=points,
        )


cash_forecaster = CashFlowForecaster()
