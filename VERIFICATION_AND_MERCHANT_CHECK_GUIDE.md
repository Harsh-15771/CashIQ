# Razorpay CashIQ: Level 5 Decision Intelligence Verification & Demonstration Guide

---

## 🏛️ Executive Summary: What We Accomplished

We have successfully designed, built, and verified the complete **Level 5 B2B Receivables Decision Intelligence Engine** for CashIQ. The platform operates on the core insight that in enterprise B2B finance:

> **"Outstanding $\neq$ Collectible Debt."**  
> CashIQ asks an earlier question: *Is this actually money we need to recover, and if so, what should happen next?*  
> **AI proposes and reasons; deterministic backend services authorize and execute.**

---

## 🚀 Key Modules Built & Verified

| Module | Location | Purpose & Architectural Invariants |
| :--- | :--- | :--- |
| **Receivables Decomposition** | [`backend/app/domain/schemas.py`](file:///c:/Users/harsh/Desktop/Harsh%20Folder/Hackathon%20Project/razorpay-cashiq/backend/app/domain/schemas.py), [`razorpay_client.py`](file:///c:/Users/harsh/Desktop/Harsh%20Folder/Hackathon%20Project/razorpay-cashiq/backend/app/services/razorpay_client.py) | Breaks down the total ledger into **6 distinct working capital buckets**: Collectible Now, Promised (Snoozed), Under Dispute, TDS Withheld (2%), Reconciliation Variance, and Not Due. |
| **Debtor Digital Twin & Credibility Score** | [`backend/app/domain/debtor_twin.py`](file:///c:/Users/harsh/Desktop/Harsh%20Folder/Hackathon%20Project/razorpay-cashiq/backend/app/domain/debtor_twin.py) | Tracks longitudinal payment history, DBT, and calculates **Promise Credibility Score ($0\text{--}100$)** with "What Changed?" Decision Diffs. |
| **Integer Paise EV Optimizer** | [`backend/app/domain/decision_engine.py`](file:///c:/Users/harsh/Desktop/Harsh%20Folder/Hackathon%20Project/razorpay-cashiq/backend/app/domain/decision_engine.py) | Evaluates candidate actions (`WAIT`, `NUDGE_EMAIL`, `NUDGE_WHATSAPP`, `ESCALATE`, `NO_ACTION`) using integer paise precision, superlinear customer fatigue decay ($\text{exponent}=1.4$), and explicit flat $EV=0$ baseline for `NO_ACTION`. |
| **Policy Gate & Veto Power** | [`backend/app/domain/decision_engine.py`](file:///c:/Users/harsh/Desktop/Harsh%20Folder/Hackathon%20Project/razorpay-cashiq/backend/app/domain/decision_engine.py) | **EV proposes, but Policy holds absolute veto power**: For reliable debtors, `ESCALATE_HUMAN` has highest raw EV but is **BLOCKED BY POLICY**; `WAIT` is selected. |
| **Ambiguity Gate ("Refusal to Guess")** | [`backend/app/domain/ambiguity_gate.py`](file:///c:/Users/harsh/Desktop/Harsh%20Folder/Hackathon%20Project/razorpay-cashiq/backend/app/domain/ambiguity_gate.py) | Halts automated actions and flags `NEEDS_REVIEW` when evidence is split or top intent confidence delta is $< 15\%$. |
| **Tax & TDS Reconciler** | [`backend/app/domain/tax_reconciler.py`](file:///c:/Users/harsh/Desktop/Harsh%20Folder/Hackathon%20Project/razorpay-cashiq/backend/app/domain/tax_reconciler.py) | Performs Section 194C (2% TDS) and GST taxable value matching on short payments, preventing false dunning for legally withheld taxes. |
| **Deterministic Decision Replay** | [`backend/app/domain/replay_engine.py`](file:///c:/Users/harsh/Desktop/Harsh%20Folder/Hackathon%20Project/razorpay-cashiq/backend/app/domain/replay_engine.py) | Caches extraction JSON snapshots at decision time and re-runs deterministic layers with **100% bit-identical match guarantee**. |
| **50/50 A/B Experiment Lab** | [`backend/app/domain/experiments.py`](file:///c:/Users/harsh/Desktop/Harsh%20Folder/Hackathon%20Project/razorpay-cashiq/backend/app/domain/experiments.py) | Simulates a 50/50 SHA-256 randomized trial under a seeded population ($N=500$, Seed=42) to prove Net Incremental Working Capital created (**+₹6,57,930**). |
| **Transparent Data Provenance** | Frontend UI Components | Explicit badges across all metrics (`[SYNTHETIC_SEEDED]`, `[RAZORPAY_TEST_MODE]`, `[LLM_EXTRACTED]`, `[DETERMINISTIC_DERIVED]`, `[POLICY_ENFORCED]`). |

---

## 🧪 Test Suite Results: 23 / 23 Tests Passed (100%)

All unit and integration tests are verified and passing:

```bash
cd "c:\Users\harsh\Desktop\Harsh Folder\Hackathon Project\razorpay-cashiq"
& "backend\venv\Scripts\python.exe" -m pytest backend\tests\ -v
```

### Verified Test Cases:
1. `test_adversarial_prompt_injection_defense` $\rightarrow$ **PASSED**
2. `test_adversarial_invalid_date_trap` $\rightarrow$ **PASSED**
3. `test_adversarial_fake_utr_verification` $\rightarrow$ **PASSED**
4. `test_health_and_root_endpoints` $\rightarrow$ **PASSED**
5. `test_invoices_and_stats_endpoints` $\rightarrow$ **PASSED**
6. `test_inbound_email_processing_flow` $\rightarrow$ **PASSED**
7. `test_30_day_cash_forecast_endpoint` $\rightarrow$ **PASSED**
8. `test_guardrail_price_lock_with_tds` $\rightarrow$ **PASSED**
9. `test_guardrail_high_value_gating` $\rightarrow$ **PASSED**
10. `test_guardrail_confidence_gating` $\rightarrow$ **PASSED**
11. `test_state_machine_3way_transitions` $\rightarrow$ **PASSED**
12. `test_debtor_digital_twin_and_credibility_scoring` $\rightarrow$ **PASSED**
13. `test_receivables_decomposition_endpoint` $\rightarrow$ **PASSED**
14. `test_integer_paise_ev_and_policy_veto` $\rightarrow$ **PASSED**
15. `test_ambiguity_gate_refusal_to_guess` $\rightarrow$ **PASSED**
16. `test_gst_tds_short_payment_analysis` $\rightarrow$ **PASSED**
17. `test_deterministic_decision_replay_with_cache` $\rightarrow$ **PASSED**
18. `test_simulated_50_50_experiment_engine` $\rightarrow$ **PASSED**
19. `test_parse_standard_invoice_reply` $\rightarrow$ **PASSED**
20. `test_unlinked_inbound_fallback` $\rightarrow$ **PASSED**
21. `test_reliable_debtor_with_utr_prediction` $\rightarrow$ **PASSED**
22. `test_chronic_delayer_prediction` $\rightarrow$ **PASSED**
23. `test_cold_start_debtor_prediction` $\rightarrow$ **PASSED**

---

## 🖥️ How to Test & Demo the Application (Step-by-Step)

The application is running live at **`http://localhost:3000`** (Frontend) and **`http://127.0.0.1:8000`** (FastAPI Backend).

### Step 1: Inspect the Receivables Decomposition Banner
* Look at the top banner of the application:
* Observe the **6 distinct buckets**:
  1. 🟢 **Collectible Now**: ₹28,97,000 (Active recovery target)
  2. 🔵 **Promised (Snoozed)**: ₹3,40,000 (High-trust PTP commitments)
  3. 🟠 **Under Dispute**: ₹1,20,000 (GSTR-2B & PO mismatches)
  4. 🟣 **TDS Withheld (2%)**: ₹70,900 (Section 194C compliance)
  5. 🔷 **Reconciliation**: ₹90,000 (Short-payment variance)
  6. ⚫ **Not Yet Due**: ₹0 (Within credit terms)
* Note the provenance badge: `[DETERMINISTIC_DERIVED]`

---

### Step 2: Screen 3 — Demo Lab & "Why / Why Not?" Inspector (The Hero Demo)
1. In the top navbar, click **`Screen 3: Demo Lab`**.
2. Click on **`Scenario 1: Reliable Debtor + Promise`** and click **`▶ Run CashIQ Decision Engine`**:
   * **Diagnosis:** Intent = `PROMISE_TO_PAY` (92% conf), Locked Settlement = `₹44,100` (2% TDS).
   * **TreeSHAP Feature Attributions:** Top drivers (`+18.4% UTR Stated`, `+14.1% Debtor History`, `-5.2% Overdue Days`).
   * **EV Candidate Table:**
     * Observe that `ESCALATE_HUMAN` has raw EV of `₹43,735.00` but is **`BLOCKED (Policy Veto)`** because the debtor has 93/100 credibility and no avoidance history.
     * `WAIT` is **`SELECTED`** with EV of `₹41,850.00`.
     * `NO_ACTION` shows `P(Recovery) = N/A` with flat EV = `₹0.00`.
   * **The "Why / Why Not?" Card:**
     * *Why WAIT?* $\checkmark$ Promise Credibility: 93/100 $\checkmark$ Active commitment date.
     * *Why Not Nudge?* $\times$ Cooldown active $\times$ Fatigue penalty outweighs 0.8% probability gain.
     * *Why Not Escalate?* $\times$ Blocked by Policy veto.
3. Test **1-Click Adversarial Defense**:
   * Click the red **`⚡ Attack System (Adversarial Test)`** button.
   * Notice malicious prompt injection payload loads.
   * Click **`▶ Run CashIQ Decision Engine`** $\rightarrow$ Observe that the system intercepts the attack, triggers security logging, and refuses unauthorized modification.

---

### Step 3: Screen 2 — Debtor Digital Twin & Longitudinal Timeline
1. In the top navbar, click **`Screen 2: Debtor Twin`**.
2. Click on **Apex Logistics Ltd**:
   * Observe **Promise Credibility Score: 93/100** (High Trust).
   * Review the **"What Changed?" Decision Diff**:
     * Previous: `NUDGE_EMAIL`
     * Current: `WAIT (Snoozed until Aug 28)`
     * Reason: Inbound promise received with valid UTR & 2% TDS commitment; credibility surged $+25$.
   * Scroll down the **Chronological Payment & Commitment Timeline** showing historical Paid, Promise Kept, and Active Promise nodes.
3. Click on **Zenith Retail Outlets**:
   * Observe PTP Credibility: 68/100, Dispute history, and routing to Action Queue for GST reconciliation.
4. Click on **Vague Commercial Corp**:
   * Observe PTP Credibility: 27/100, 8 broken promises, and escalation reason.

---

### Step 4: Screen 4 — 50/50 Experiment Lab & Deterministic Decision Replay
1. In the top navbar, click **`Screen 4: 50/50 Lab`**.
2. **50/50 Randomized Controlled Trial:**
   * Click **`▶ Re-Run 500-Debtor Trial (Seed 42)`**.
   * Compare:
     * **Treatment Arm (CashIQ):** 83.0% recovery, 286 contacts sent, 19 escalations.
     * **Control Arm (Naive Dunning):** 60.0% recovery, 750 contacts sent, 42 escalations.
     * **Net Incremental Working Capital Created:** **`+₹6,57,930`** (+23.0% recovery uplift, -464 spam messages eliminated).
   * Note title: *"Simulated Incremental Recovery Under Seeded Population (N=500, Seed=42)"* with `[SYNTHETIC_SEEDED]` badge.
3. **Deterministic Decision Replay Inspector:**
   * In the Decision ID input box, paste or keep the Decision ID (e.g. `DEC-DEMO-001` or the one generated from your Screen 3 run).
   * Click **`🔍 Replay Decision & Verify`**.
   * Observe the verified result card:
     * **`REPLAY VERDICT: 100% DETERMINISTIC MATCH ✓`**
     * Model Version: `PTP-LGBM-v1.0` & Policy: `CashIQ-Policy-v2.0` verified against cached snapshot state hash.

---

### Step 5: Screen 1 — Control Center & Guardrails
1. In the top navbar, click **`Screen 1: Control Center`**.
2. Inspect the **Action Queue**:
   * High-value invoices ($> ₹2.5\text{L}$) and hard procedural disputes requiring human sign-off.
   * Click **`1-Click Approve`** on an action and watch it execute and transition in real-time.
3. Review the **Immutable Audit Trail** recording state transitions, guardrail validations, and execution timestamps.

---

## 📁 Artifacts & Screenshots Available in Directory

* `cashiq_receivables_decomposition_1788116150433.png`: 6-Bucket Decomposition Banner.
* `scenario1_normal_evaluation_1788116175160.png`: Screen 3 Candidate EV Table, TreeSHAP & Why/Why Not card.
* `adversarial_attack_run_1788116218417.png`: Adversarial Prompt Injection Defense.
* `debtor_twin_apex_logistics_1788116252510.png`: Debtor Digital Twin (Apex Logistics).
* `debtor_twin_zenith_retail_1788116270316.png`: Debtor Digital Twin (Zenith Retail).
* `debtor_twin_vague_commercial_1788116288199.png`: Debtor Digital Twin (Vague Commercial).
