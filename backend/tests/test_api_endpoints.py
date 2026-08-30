import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)


def test_health_and_root_endpoints():
    r_root = client.get("/")
    assert r_root.status_code == 200
    assert r_root.json()["app"] == "Razorpay CashIQ"

    r_health = client.get("/health")
    assert r_health.status_code == 200
    assert r_health.json()["status"] == "healthy"


def test_invoices_and_stats_endpoints():
    r_inv = client.get("/api/invoices")
    assert r_inv.status_code == 200
    invoices = r_inv.json()
    assert len(invoices) > 0
    assert "priority_score" in invoices[0]

    r_stats = client.get("/api/stats/overview")
    assert r_stats.status_code == 200
    stats = r_stats.json()
    assert stats["total_invoices_count"] > 0
    assert stats["total_outstanding_amount_inr"] > 0


def test_inbound_email_processing_flow():
    payload = {
        "from_address": "ap-finance@apexlogistics.in",
        "subject": "Re: Overdue Invoice INV-2026-0101",
        "email_body": "Hi, we will process payment for INV-2026-0101 on 2026-08-28 via NEFT UTR SBIN00293847192. Deducting 2% TDS.",
    }
    response = client.post("/api/inbound/process-email", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert data["matched_invoice_id"] == "INV-2026-0101"
    assert data["analysis"]["intent"] == "PROMISE_TO_PAY"
    assert data["locked_payment_link"] is not None
    assert "https://rzp.io/i/cashiq_" in data["locked_payment_link"]


def test_30_day_cash_forecast_endpoint():
    response = client.get("/api/forecast/30-day")
    assert response.status_code == 200
    data = response.json()
    assert "forecast_points" in data
    assert len(data["forecast_points"]) == 30
    assert data["total_contractual_volume"] > 0
