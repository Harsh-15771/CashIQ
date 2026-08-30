import pytest
from backend.app.domain.debtor_twin import DebtorDigitalTwin

def test_cold_start_debtor_laplace_is_exactly_half():
    twin = DebtorDigitalTwin(
        debtor_id="COLD-START-01",
        company_name="New Venture Pvt Ltd",
        contact_email="accounts@newventure.in",
        promises_kept=0,
        promises_broken=0,
        total_invoices_count=0,
        relationship_age_years=0.0,
        average_dbt_days=0.0,
        dispute_count=0,
    )
    # (0 + 1) / (0 + 2) == 0.50
    assert twin.laplace_fulfillment_ratio == 0.50
    # Credibility score should be well-defined in [0, 100], never NaN
    assert 40 <= twin.promise_credibility_score <= 75

def test_perfect_history_approaches_one():
    twin = DebtorDigitalTwin(
        debtor_id="PERFECT-01",
        company_name="Ultra Reliable Corp",
        contact_email="cfo@ultra.in",
        promises_kept=50,
        promises_broken=0,
        relationship_age_years=5.0,
        average_dbt_days=0.0,
        dispute_count=0,
    )
    # (50 + 1) / (50 + 2) = 51/52 = 0.9807 -> 0.981
    assert twin.laplace_fulfillment_ratio > 0.95
    assert twin.promise_credibility_score >= 90

def test_terrible_history_approaches_zero():
    twin = DebtorDigitalTwin(
        debtor_id="DEFAULT-01",
        company_name="Chronic Default Ltd",
        contact_email="avoid@default.in",
        promises_kept=0,
        promises_broken=20,
        relationship_age_years=0.5,
        average_dbt_days=60.0,
        dispute_count=5,
    )
    # (0 + 1) / (20 + 2) = 1/22 = 0.045
    assert twin.laplace_fulfillment_ratio < 0.10
    assert twin.promise_credibility_score <= 30

@pytest.mark.parametrize("kept,broken,expected_min,expected_max", [
    (0, 0, 45, 80),
    (1, 0, 50, 85),
    (5, 1, 60, 95),
    (18, 2, 75, 100),
    (0, 5, 20, 60),
])
def test_credibility_score_monotonicity(kept, broken, expected_min, expected_max):
    twin = DebtorDigitalTwin(
        debtor_id="MONO-TEST",
        company_name="Mono Test",
        contact_email="mono@test.in",
        promises_kept=kept,
        promises_broken=broken,
        average_dbt_days=5.0,
        relationship_age_years=1.5,
    )
    score = twin.promise_credibility_score
    assert expected_min <= score <= expected_max
    assert isinstance(score, int)

def test_extreme_dbt_delay_clamps_properly():
    twin = DebtorDigitalTwin(
        debtor_id="DELAYED-01",
        company_name="Late Payer",
        contact_email="late@payer.in",
        promises_kept=5,
        promises_broken=5,
        average_dbt_days=180.0,  # 6 months late
    )
    # max(0, 1 - 180/45) = 0.0, should not crash or produce negative component
    assert twin.promise_credibility_score >= 0
    assert twin.promise_credibility_score <= 100
