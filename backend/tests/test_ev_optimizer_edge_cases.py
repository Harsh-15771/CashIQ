import pytest
from backend.app.domain.decision_engine import DecisionEngine
from backend.app.domain.debtor_twin import DebtorDigitalTwin
from backend.app.domain.schemas import ActionType, PolicyVerdict

@pytest.fixture
def sample_debtor():
    return DebtorDigitalTwin(
        debtor_id="DEBTOR-TEST",
        company_name="Test Corp",
        contact_email="test@corp.in",
        relationship_age_years=2.0,
        promises_kept=10,
        promises_broken=2,
        average_dbt_days=5.0,
        contact_count_current_cycle=0,
    )

def test_no_action_is_strictly_zero_ev(sample_debtor):
    engine = DecisionEngine()
    candidates, winner, verdict, why = engine.evaluate_candidates(
        invoice_id="INV-001",
        invoice_amount_inr=100000.0,
        validated_tds_pct=0.02,
        debtor=sample_debtor,
        base_probability=0.85,
        intent="PROMISE_TO_PAY",
    )
    no_action_cand = next(c for c in candidates if c.action == ActionType.NO_ACTION)
    assert no_action_cand.expected_value_inr == 0.0
    assert no_action_cand.cost_inr == 0.0
    assert no_action_cand.fatigue_penalty_inr == 0.0
    assert no_action_cand.verdict == PolicyVerdict.BASELINE

@pytest.mark.parametrize("contact_count", [0, 1, 2, 3])
def test_superlinear_fatigue_penalty_scaling(sample_debtor, contact_count):
    sample_debtor.contact_count_current_cycle = contact_count
    engine = DecisionEngine()
    candidates, _, _, _ = engine.evaluate_candidates(
        invoice_id="INV-001",
        invoice_amount_inr=100000.0,
        validated_tds_pct=0.0,
        debtor=sample_debtor,
        base_probability=0.80,
        intent="OVERDUE_DUNNING",
    )
    email_cand = next(c for c in candidates if c.action == ActionType.NUDGE_EMAIL)
    assert email_cand.fatigue_penalty_inr > 0
    if contact_count > 0:
        prev_debtor = DebtorDigitalTwin(
            debtor_id="DEBTOR-PREV",
            company_name="Prev Corp",
            contact_email="prev@corp.in",
            contact_count_current_cycle=contact_count - 1,
        )
        prev_cands, _, _, _ = engine.evaluate_candidates(
            invoice_id="INV-001",
            invoice_amount_inr=100000.0,
            validated_tds_pct=0.0,
            debtor=prev_debtor,
            base_probability=0.80,
            intent="OVERDUE_DUNNING",
        )
        prev_email = next(c for c in prev_cands if c.action == ActionType.NUDGE_EMAIL)
        assert email_cand.fatigue_penalty_inr > prev_email.fatigue_penalty_inr

def test_integer_paise_exactness_no_fractional_paise(sample_debtor):
    engine = DecisionEngine()
    candidates, _, _, _ = engine.evaluate_candidates(
        invoice_id="INV-ODD",
        invoice_amount_inr=43217.89,
        validated_tds_pct=0.02,
        debtor=sample_debtor,
        base_probability=0.7314,
        intent="PROMISE_TO_PAY",
    )
    for c in candidates:
        paise_val = round(c.expected_value_inr * 100)
        assert abs(c.expected_value_inr - (paise_val / 100.0)) < 1e-4

def test_policy_veto_blocks_escalation_on_high_trust(sample_debtor):
    sample_debtor.promises_kept = 25
    sample_debtor.promises_broken = 0
    sample_debtor.average_dbt_days = 1.0
    
    engine = DecisionEngine()
    candidates, winner, verdict, _ = engine.evaluate_candidates(
        invoice_id="INV-HIGH-TRUST",
        invoice_amount_inr=50000.0,
        validated_tds_pct=0.02,
        debtor=sample_debtor,
        base_probability=0.92,
        intent="PROMISE_TO_PAY",
    )
    escalate_cand = next(c for c in candidates if c.action == ActionType.ESCALATE_HUMAN)
    assert "BLOCKED" in escalate_cand.verdict or "Policy Veto" in escalate_cand.verdict
    assert winner == ActionType.WAIT

def test_ambiguity_gate_forces_needs_review(sample_debtor):
    engine = DecisionEngine()
    candidates, winner, verdict, why = engine.evaluate_candidates(
        invoice_id="INV-AMBIG",
        invoice_amount_inr=50000.0,
        validated_tds_pct=0.0,
        debtor=sample_debtor,
        base_probability=0.50,
        intent="UNKNOWN",
        is_ambiguous=True,
    )
    assert winner == ActionType.NEEDS_REVIEW
    assert "refuses" in why.why_chosen[1] or "split" in why.why_chosen[0]
