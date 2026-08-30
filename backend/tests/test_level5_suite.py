"""
Comprehensive Pytest Suite for CashIQ Level 5 B2B Decision Intelligence:
- Debtor Digital Twin & Promise Credibility Scoring
- Receivables Ledger Decomposition
- Integer Paise EV Optimizer & Policy Veto Verification
- Ambiguity Gate (Refusal to Guess)
- GST / TDS Short Payment Reconciler
- Deterministic Decision Replay
- 50/50 Randomized Trial Simulation
- End-to-End API Integration
"""

import pytest
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.domain.debtor_twin import DebtorDigitalTwin, debtor_twin_repo
from backend.app.domain.decision_engine import decision_engine
from backend.app.domain.ambiguity_gate import ambiguity_gate
from backend.app.domain.tax_reconciler import tax_reconciler
from backend.app.domain.replay_engine import replay_engine
from backend.app.domain.experiments import experiment_engine
from backend.app.domain.schemas import ActionType, PolicyVerdict

client = TestClient(app)


def test_debtor_digital_twin_and_credibility_scoring():
    """Verifies Promise Credibility Scoring across debtor archetypes."""
    # 1. Cold Start Debtor (0/0)
    cold_start = DebtorDigitalTwin(
        debtor_id="COLD_001",
        company_name="New Startup LLP",
        contact_email="ap@newstartup.in",
        promises_kept=0,
        promises_broken=0,
        average_dbt_days=0.0,
        relationship_age_years=0.0,
        dispute_count=0,
    )
    assert cold_start.laplace_fulfillment_ratio == 0.50
    assert 45 <= cold_start.promise_credibility_score <= 65

    # 2. High-Trust Debtor (18/20, low DBT)
    high_trust = DebtorDigitalTwin(
        debtor_id="HIGH_001",
        company_name="Apex Logistics Ltd",
        contact_email="ap@apex.in",
        promises_kept=18,
        promises_broken=2,
        average_dbt_days=2.0,
        relationship_age_years=2.4,
        dispute_count=0,
    )
    assert high_trust.laplace_fulfillment_ratio > 0.85
    assert high_trust.promise_credibility_score >= 85

    # 3. Chronic Delayer (1/8, high DBT)
    delayer = DebtorDigitalTwin(
        debtor_id="DELAY_001",
        company_name="Vague Commercial Corp",
        contact_email="ap@vague.in",
        promises_kept=1,
        promises_broken=8,
        average_dbt_days=38.0,
        relationship_age_years=0.9,
        dispute_count=1,
    )
    assert delayer.laplace_fulfillment_ratio < 0.25
    assert delayer.promise_credibility_score < 40


def test_receivables_decomposition_endpoint():
    """Verifies 6-bucket receivables decomposition math."""
    response = client.get("/api/receivables/decomposition")
    assert response.status_code == 200
    data = response.json()
    
    total = data["total_outstanding_inr"]
    collectible = data["collectible_now_inr"]
    promised = data["promised_snoozed_inr"]
    disputed = data["under_dispute_inr"]
    tds = data["tax_tds_withheld_inr"]
    reconcile = data["reconciliation_variance_inr"]
    not_due = data["not_yet_due_inr"]

    # Sum of buckets equals total within tolerance
    reconstructed = collectible + promised + disputed + tds + reconcile + not_due
    assert abs(total - reconstructed) < 1.0
    assert data["provenance"] == "DETERMINISTIC_DERIVED"


def test_integer_paise_ev_and_policy_veto():
    """
    Verifies that EV proposes, but Policy holds absolute veto power.
    For a reliable debtor, ESCALATE_HUMAN yields highest raw EV, but is BLOCKED by Policy,
    and WAIT is SELECTED.
    """
    twin = debtor_twin_repo.get_twin("DEBTOR-001")  # Apex Logistics (High Trust)
    assert twin is not None

    candidates, selected, verdict, why_card = decision_engine.evaluate_candidates(
        invoice_id="INV-2026-0101",
        invoice_amount_inr=45000.0,
        validated_tds_pct=0.02,
        debtor=twin,
        base_probability=0.93,
        intent="PROMISE_TO_PAY",
    )

    assert selected == ActionType.WAIT
    assert verdict == PolicyVerdict.SELECTED

    # Locate ESCALATE_HUMAN in candidates
    esc_cand = next(c for c in candidates if c.action == ActionType.ESCALATE_HUMAN)
    wait_cand = next(c for c in candidates if c.action == ActionType.WAIT)
    no_act_cand = next(c for c in candidates if c.action == ActionType.NO_ACTION)

    # Escalate has higher raw EV, but is BLOCKED by Policy
    assert esc_cand.expected_value_inr > wait_cand.expected_value_inr
    assert esc_cand.verdict == PolicyVerdict.BLOCKED_POLICY_VETO
    assert "Blocked by Policy" in esc_cand.verdict_reason

    # NO_ACTION has flat 0 EV
    assert no_act_cand.expected_value_inr == 0.0
    assert no_act_cand.probability_recovery is None

    # Verify Why/Why Not card exists
    assert len(why_card.why_chosen) > 0
    assert why_card.why_not_escalate is not None


def test_ambiguity_gate_refusal_to_guess():
    """Verifies that Ambiguity Gate halts automated execution when evidence is split."""
    # Text with ambiguous tax/portal references
    is_amb, reason = ambiguity_gate.check_ambiguity(
        top_intent="GST_DISCREPANCY",
        top_confidence=0.52,
        runner_up_intent="TDS_DISCREPANCY",
        runner_up_confidence=0.48,
        raw_text="We cannot process invoice because tax amount does not match what portal has.",
    )
    assert is_amb is True
    assert "refuses to guess" in reason.lower()


def test_gst_tds_short_payment_analysis():
    """Verifies short payment matching for Section 194C TDS withholding."""
    # Gross: ₹5,90,000 | Base: ₹5,00,000 | TDS 2%: ₹10,000 | Net: ₹5,80,000
    res = tax_reconciler.analyze_short_payment(
        invoice_id="INV-2026-0105",
        gross_invoice_amount_inr=590000.0,
        actual_received_inr=580000.0,
        gst_rate_pct=0.18,
        stated_tds_pct=0.02,
    )
    assert res.is_legitimate_tds_withholding is True
    assert res.reconciliation_verdict == "LEGITIMATE_TDS_WITHHOLDING"
    assert res.unexplained_variance_inr == 0.0


def test_deterministic_decision_replay_with_cache():
    """Verifies that decision replay against cached extraction snapshot is 100% deterministic."""
    eval_req = {
        "raw_email_text": "We will pay INV-2026-0101 on 2026-08-28 via NEFT UTR SBIN00293847192. Deducting 2% TDS.",
        "invoice_id": "INV-2026-0101",
        "debtor_id": "DEBTOR-001",
    }
    eval_res = client.post("/api/decisions/evaluate", json=eval_req)
    assert eval_res.status_code == 200
    eval_data = eval_res.json()
    dec_id = eval_data["decision_id"]

    # Replay
    replay_res = client.get(f"/api/decisions/replay/{dec_id}")
    assert replay_res.status_code == 200
    replay_data = replay_res.json()
    assert replay_data["is_deterministic_match"] is True
    assert "100% DETERMINISTIC MATCH" in replay_data["verification_message"]


def test_simulated_50_50_experiment_engine():
    """Verifies 50/50 A/B randomized trial produces positive incremental value."""
    exp_res = client.get("/api/experiments/summary")
    assert exp_res.status_code == 200
    exp_data = exp_res.json()

    assert exp_data["population_size"] == 500
    assert exp_data["treatment_arm"]["recovered_amount_inr"] > exp_data["control_arm"]["recovered_amount_inr"]
    assert exp_data["incremental_recovered_inr"] > 0
    assert exp_data["spam_contacts_reduced_count"] > 0
    assert exp_data["net_incremental_value_inr"] > 0
    assert exp_data["provenance"] == "SYNTHETIC_SEEDED"
