# CashIQ Architecture & System Design

> **Autonomous B2B Receivables Decision Intelligence**  
> Built for the Razorpay Hackathon by Harsh  
> Full codebase: Python (FastAPI + LightGBM + Pydantic) + React (Vite + Tailwind)

---

## Table of Contents

1. [Problem Statement & Motivation](#1-problem-statement--motivation)
2. [Core Concept: Outstanding vs Collectible Debt](#2-core-concept-outstanding-vs-collectible-debt)
3. [System Architecture](#3-system-architecture)
4. [Mathematical & Algorithmic Models](#4-mathematical--algorithmic-models)
   - 4.1 6-Bucket Receivables Decomposition
   - 4.2 Debtor Promise Credibility Score ($C_{\mathrm{ptp}}$)
   - 4.3 Integer Paise Expected Value ($\mathrm{EV}$) Engine
   - 4.4 Superlinear Customer Fatigue Penalty
5. [Indian B2B Invoicing & Tax Realities](#5-indian-b2b-invoicing--tax-realities)
   - 5.1 Section 194C / 194J TDS Withholding
   - 5.2 GSTR-2B Input Tax Credit (ITC) Disputes
   - 5.3 Banking UTR & NEFT Reconciliation
6. [Machine Learning & Explainability](#6-machine-learning--explainability)
   - 6.1 LightGBM PTP Classifier & Baseline Comparison
   - 6.2 TreeSHAP Local Feature Attributions
7. [Guardrails & Security](#7-guardrails--security)
   - 7.1 Ambiguity Gate ("Refusal to Guess")
   - 7.2 Price-Lock & High-Value Human Gating
   - 7.3 Adversarial Prompt Injection Defense
8. [Deterministic Decision Replay](#8-deterministic-decision-replay)
9. [50/50 Randomized Controlled Trial (A/B Evidence)](#9-5050-randomized-controlled-trial-ab-evidence)
10. [Frontend Design & Consoles](#10-frontend-design--consoles)
11. [Data Models & API Schemas](#11-data-models--api-schemas)
12. [Automated Test Suite (50/50 Passing)](#12-automated-test-suite-5050-passing)
13. [How to Run the Project](#13-how-to-run-the-project)

---

## 1. Problem Statement & Motivation

When we looked into enterprise B2B payments in India, we noticed a huge pain point: companies often have crores in overdue invoices, but **most overdue payments aren't malicious defaults**. 

In reality, payments get delayed because of common operational reasons:
1. **Tax Withholdings (TDS):** A buyer pays ₹98,000 on a ₹1,00,000 invoice because they legally deducted 2% TDS under Section 194C. Traditional dunning bots treat the missing ₹2,000 as delinquent debt and start spamming the client.
2. **GST / ITC Disputes:** If the seller hasn't uploaded their invoice to the GST portal by the 11th of the month, the buyer can't claim Input Tax Credit (ITC) in GSTR-2B, so they hold payment until the invoice reflects.
3. **Unmatched Bank Transfers:** The debtor already sent the money via NEFT and emailed a UTR reference number, but it sits unread in an accounts inbox while automated reminders keep going out.
4. **Spam & Contact Fatigue:** Sending a payment reminder every 3–4 days irritates clients and burns enterprise goodwill.

We built **CashIQ** to fix this. Instead of blindly blasting payment reminders on a timer, CashIQ acts as a decision engine: it reads incoming debtor messages (emails/WhatsApp/ERP notes), checks debtor credibility, calculates the exact Expected Value of every possible response in integer paise, and applies safety guardrails before taking action.

---

## 2. Core Concept: Outstanding vs Collectible Debt

Most billing tools treat all overdue invoices as one big bucket of "debt to collect." We decompose the total outstanding ledger into 6 distinct categories:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                               TOTAL OUTSTANDING INVOICES                               │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │
    ┌───────────────────────┬───────────────┴───────────────┬───────────────────────┐
    ▼                       ▼                               ▼                       ▼
┌──────────────┐    ┌──────────────┐                ┌──────────────┐        ┌──────────────┐
│ COLLECTIBLE  │    │ SNOOZED PTP  │                │ UNDER        │        │ STATUTORY    │
│ NOW          │    │ (High Trust) │                │ DISPUTE      │        │ TDS (194C)   │
│              │    │              │                │              │        │              │
│ Target for   │    │ Legitimate   │                │ Procedural   │        │ Legally non- │
│ active       │    │ commitment;  │                │ tax/PO gap;  │        │ recoverable  │
│ recovery     │    │ hold nudges  │                │ route to ops │        │ variance     │
└──────────────┘    └──────────────┘                └──────────────┘        └──────────────┘
```

By categorizing receivables into these buckets, the system knows when to send a nudge, when to pause reminders (snooze), and when to flag an issue for the finance team.

---

## 3. System Architecture

We followed a simple architectural rule: **LLMs are great at reading messy human text, but they should never make financial decisions or do math.**

We separated the pipeline into clear stages:
1. **Gemini 2.0** extracts unstructured text into a strict Pydantic schema (finding promise dates, UTR numbers, tax codes).
2. **Deterministic Python backend** computes the credibility score, runs the LightGBM classifier, calculates Expected Value in integer paise, and enforces safety rules.

```
                                INBOUND DEBTOR PAYLOAD
                       (RFC 822 MIME Email / Webhook / WhatsApp)
                                         │
                                         ▼
                 ┌───────────────────────────────────────────────┐
                 │         1. MIME & Text Normalizer             │
                 │   Strips signatures, headers & noise          │
                 └───────────────────────┬───────────────────────┘
                                         │
                                         ▼
                 ┌───────────────────────────────────────────────┐
                 │     2. LLM Semantic Extractor (Gemini)        │
                 │   Extracts PTP date, UTR, TDS %, intent       │
                 │   Constrained to Pydantic v2 Schema           │
                 └───────────────────────┬───────────────────────┘
                                         │
                                         ▼
                 ┌───────────────────────────────────────────────┐
                 │         3. Ambiguity Gate ("Refusal to Guess")│
                 │   Halt if Confidence < 0.80 or Multi-Intent   │
                 └───────────────────────┬───────────────────────┘
                                         │
                                         ▼
                 ┌───────────────────────────────────────────────┐
                 │  4. Debtor Digital Twin & Longitudinal Store  │
                 │   Fetches Laplace Credibility & Historical DBT│
                 └───────────────────────┬───────────────────────┘
                                         │
                                         ▼
                 ┌───────────────────────────────────────────────┐
                 │   5. ML Predictor (LightGBM + TreeSHAP)       │
                 │   Calibrates P(Recovery) & Feature Impact     │
                 └───────────────────────┬───────────────────────┘
                                         │
                                         ▼
                 ┌───────────────────────────────────────────────┐
                 │ 6. Integer Paise EV Optimizer (No Float Math) │
                 │   Evaluates: Nudge, Wait, Escalate, No_Action │
                 └───────────────────────┬───────────────────────┘
                                         │
                                         ▼
                 ┌───────────────────────────────────────────────┐
                 │     7. Deterministic Policy Gate & Veto       │
                 │   Absolute Veto on Price Locks, Gating >₹2.5L │
                 └───────────────────────┬───────────────────────┘
                                         │
                                         ▼
                       FINAL VERDICT & AUDIT REPLAY SNAPSHOT
```

---

## 4. Mathematical & Algorithmic Models

### 4.1 6-Bucket Receivables Decomposition

For any portfolio of invoices $I$:

$$\mathrm{Total\ Outstanding} = \sum_{i \in I} \mathrm{Amount}_i = V_{\mathrm{collectible}} + V_{\mathrm{promised}} + V_{\mathrm{disputed}} + V_{\mathrm{tax}} + V_{\mathrm{reconcile}} + V_{\mathrm{not\_due}}$$

Where:
* $V_{\mathrm{collectible}}$: Overdue invoices with no active promise or dispute.
* $V_{\mathrm{promised}}$: Invoices with an active, high-credibility payment promise ($C_{\mathrm{ptp}} \ge 70$).
* $V_{\mathrm{disputed}}$: Invoices with a commercial or GST dispute.
* $V_{\mathrm{tax}}$: Legitimate 2% or 1% TDS deductions under Section 194C/194J.
* $V_{\mathrm{reconcile}}$: Unverified bank transfers pending matching.
* $V_{\mathrm{not\_due}}$: Invoices still within their contractual credit terms.

---

### 4.2 Debtor Promise Credibility Score ($C_{\mathrm{ptp}} \in [0, 100]$)

We calculate a debtor's trustworthiness score using four weighted components:

$$C_{\mathrm{ptp}} = \mathrm{round}\left( 100 \times \left[ 0.45 \cdot \frac{\mathrm{Kept} + 1}{\mathrm{Total} + 2} + 0.25 \cdot \max\left(0, 1 - \frac{\mathrm{AvgDBT}}{45}\right) + 0.15 \cdot \min\left(1, \frac{\mathrm{Age}}{2.0}\right) + 0.15 \cdot \max\left(0, 1 - \frac{\mathrm{Disputes}}{3}\right) \right] \right)$$

#### Why Laplace Smoothing?
If a brand new debtor pays their very first invoice ($1/1$), a basic division gives $100\%$, which makes them look as reliable as a 5-year client with 50/50 payments. Conversely, $0/0$ causes a division by zero error. Laplace smoothing ($\frac{\mathrm{Kept} + 1}{\mathrm{Total} + 2}$) gives brand-new debtors a neutral starting score of $50\%$, which smoothly updates as more payment data comes in.

---

### 4.3 Integer Paise Expected Value ($\mathrm{EV}$) Engine

In financial software, standard floating-point arithmetic (like `0.1 + 0.2 = 0.30000000000000004`) causes rounding errors. We converted all monetary amounts to **integer paise** ($\mathrm{INR} \times 100$) before running calculations:

$$\mathrm{EV}(a) = \left\lfloor P_{\mathrm{rec}}(a) \times \mathrm{Amount}_{\mathrm{paise}} - \mathrm{Cost}_{\mathrm{paise}}(a) - \mathrm{Fatigue}_{\mathrm{paise}}(a) \right\rfloor$$

#### Action Candidates Evaluated:
1. **`WAIT` (Snooze):** If the debtor is reliable and made a valid promise, we hold reminders:
   $$\mathrm{EV}(\mathrm{WAIT}) = \left\lfloor P_{\mathrm{credibility}} \times \mathrm{Amount}_{\mathrm{paise}} \right\rfloor$$
2. **`NUDGE_EMAIL` / `NUDGE_WHATSAPP`:** Active reminder message:
   $$\mathrm{EV}(\mathrm{NUDGE}) = \left\lfloor P_{\mathrm{rec}} \times \mathrm{Amount}_{\mathrm{paise}} - \mathrm{Cost}_{\mathrm{channel}} - \mathrm{Fatigue}_{\mathrm{paise}} \right\rfloor$$
3. **`ESCALATE_HUMAN`:** High-friction manual intervention by an account manager or legal team.
4. **`NO_ACTION`:** Defined strictly as **0 paise**. We never count natural/organic debtor payments as value created by our AI.

---

### 4.4 Superlinear Customer Fatigue Penalty

Spamming debtors backfires. We modeled this with a superlinear penalty function ($(\mathrm{Contacts} + 1)^{1.4}$):

$$\mathrm{Fatigue}_{\mathrm{paise}}(a) = \left\lfloor \mathrm{FrictionRate}(a) \times (\mathrm{ContactCount} + 1)^{1.4} \times \mathrm{Amount}_{\mathrm{paise}} \right\rfloor$$

* $\text{FrictionRate}(\text{Email}) = 0.005$ (0.5% value penalty)
* $\text{FrictionRate}(\text{WhatsApp}) = 0.015$ (1.5% value penalty)
* After 3 recent contacts, the penalty grows sharply, making the optimizer prefer waiting over sending another reminder.

---

## 5. Indian B2B Invoicing & Tax Realities

### 5.1 Section 194C / 194J TDS Withholding
Under Indian tax rules, corporate clients must deduct **2% TDS** (or 1% for individuals) under Section 194C, or **10%** under Section 194J for professional services.
* **The Common Bug:** A debtor pays ₹98,000 on a ₹1,00,000 invoice. Standard bots treat the ₹2,000 as unpaid debt.
* **Our Solution:** CashIQ validates the 2% / 10% math against the gross invoice. If the difference matches TDS, it marks the ₹98,000 as paid and reconciles the ₹2,000 without sending an alert.

### 5.2 GSTR-2B Input Tax Credit (ITC) Disputes
When a debtor says *"Invoice is not reflecting on the GST portal"*, CashIQ tags the invoice as `DISPUTE_GSTR2B`, stops dunning reminders, and alerts the internal finance team to upload the invoice to GSTR-1.

### 5.3 Banking UTR Verification
We validate Indian NEFT/RTGS UTR numbers (16-character alphanumeric strings like `SBIN00293847192`) so that debtors who have already paid aren't sent duplicate dunning emails.

---

## 6. Machine Learning & Explainability

### 6.1 LightGBM PTP Classifier & Baseline Comparison
We trained a **LightGBM binary classifier** on 2,000 synthetic records with a 400-record stratified test split to predict payment probability $P(\text{Recovery}) \in [0.0, 1.0]$.

Here are the test results comparing our models:

| Model / Approach | ROC-AUC | Accuracy | F1 Score | Brier Score | Notes |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **Heuristic Baseline** (Historical Ratio) | 0.7687 | 64.25% | 0.7039 | 0.2241 | Simple rule; fails on new debtors and message fatigue. |
| **Logistic Regression** | **0.8317** | 74.00% | **0.7174** | 0.1798 | Strong linear baseline. |
| **LightGBM Classifier (CashIQ)** | 0.8206 | **74.50%** | 0.7119 | **0.1725** | Captures non-linear feature interactions + supports TreeSHAP. |

**Why LightGBM?**  
Logistic Regression and LightGBM performed almost identically on ROC-AUC (0.8317 vs 0.8206). We went with LightGBM because it allows **TreeSHAP local feature attributions**, which let us show finance operators the exact percentage reasons behind every prediction.

### 6.2 TreeSHAP Local Feature Attributions
For every evaluated decision, we run TreeSHAP to show human operators why the model made its prediction:
```
TreeSHAP Feature Contributions:
├── "Valid NEFT UTR Provided":       +28.4% (Strong positive factor)
├── "High Historical Fulfillment":   +18.2% (Debtor has kept 86% of past promises)
└── "Recent Message Fatigue":        -12.1% (3 contacts in last 10 days)
```

---

## 7. Guardrails & Security

```
                                  INBOUND MESSAGE
                                         │
                                         ▼
                 ┌───────────────────────────────────────────────┐
                 │           GUARDRAIL 1: AMBIGUITY GATE         │
                 │  "Refusal to Guess" on Confidence < 80%       │
                 │  or Multi-Intent Split Evidence               │
                 └───────────────────────┬───────────────────────┘
                                         │ (Passed)
                                         ▼
                 ┌───────────────────────────────────────────────┐
                 │       GUARDRAIL 2: ADVERSARIAL DEFENSE        │
                 │  Blocks prompt injection, SQLi, date traps,   │
                 │  and balance overwrite attempts               │
                 └───────────────────────┬───────────────────────┘
                                         │ (Passed)
                                         ▼
                 ┌───────────────────────────────────────────────┐
                 │       GUARDRAIL 3: FINANCIAL POLICY GATE      │
                 │  • Invoices > ₹2.5L require 1-click approval  │
                 │  • Price-Lock guarantees original sum         │
                 │  • Cooldown timer enforces 4-day silence      │
                 └───────────────────────────────────────────────┘
```

### 7.1 Ambiguity Gate ("Refusal to Guess")
If a message is unclear (e.g. *"We have tax issues"* without specifying GST or TDS), the engine refuses to guess. It flags the message as `NEEDS_REVIEW` and routes it to a human operator.

### 7.2 Price-Lock & High-Value Approvals
* **Price Lock:** The LLM cannot change invoice amounts or grant discounts.
* **High-Value Gate ($> ₹2,50,000$):** Any invoice above ₹2.5L is held in the Control Center for 1-click human sign-off before any action is taken.

### 7.3 How We Hardened Our Adversarial Defense
We tested our system against a battery of 6 prompt injection attacks (overrides, fake UTRs, invalid dates like Feb 30, balance overwrite tricks):
1. **Iteration 1 (Basic Prompting):** Blocked only 1/6 attacks (16.7%). Attackers could trick the LLM into zeroing balances.
2. **Iteration 2 (Pydantic Validation):** Blocked 3/6 attacks (50.0%). Caught bad formats, but missed semantic tricks (like invalid calendar dates).
3. **Iteration 3 (Ambiguity Gate + Regex + Policy Gate):** Blocked 6/6 attacks (100%) by separating parsing from execution and validating dates with ISO regex.

---

## 8. Deterministic Decision Replay

LLMs can give slightly different outputs across runs. To make CashIQ 100% auditable:
1. When a decision is made, we save the extracted JSON payload and a hash of the ledger state into a snapshot.
2. During a compliance audit or review, clicking **Replay & Verify** re-runs the deterministic math, LightGBM model, and policy gates against the cached snapshot.
3. This guarantees **100% bit-identical results** with zero API cost and zero network lag.

---

## 9. 50/50 Randomized Controlled Trial (A/B Evidence)

To test CashIQ without making unsubstantiated claims:
* We split 500 synthetic debtor accounts 50/50 using deterministic **SHA-256 hash partitioning** on `debtor_id + seed_42`.
* **Control Group:** Standard naive dunning (sends an automated reminder email every 4 days).
* **Treatment Group (CashIQ):** Intelligent policy (Laplace credibility filtering, fatigue penalties, TDS recognition).

### Results (Seed #42):
* **Net Incremental Capital Recovered:** **+₹6,57,930**
* **Recovery Rate Uplift:** **+23.0%** (83.0% CashIQ vs 60.0% Control)
* **Spam Emails Eliminated:** **464 messages (-61.9%)**

---

## 10. Frontend Design & Consoles

We built the frontend in React + Tailwind CSS with a dark theme (`#050508` canvas, `#6366F1` indigo accent) using Inter and JetBrains Mono fonts.

### The 5 Dashboard Tabs:
1. **Decision Lab:** Test scenarios, view extracted intents, inspect candidate EV tables, and check TreeSHAP feature attributions.
2. **Control Center:** Human approval queue for high-value invoices ($>₹2.5\text{L}$) and procedural disputes with an audit log.
3. **Debtor Twins:** Debtor relationship cards showing Laplace credibility gauges, PTP health bars, and "What Changed?" decision diffs.
4. **A/B Evidence:** Live side-by-side comparison of CashIQ vs naive dunning with Decision Replay verification.
5. **Ledger:** 30-day cash flow forecast curve and searchable invoice records.

---

## 11. Data Models & API Schemas

### Inbound Request Example:
```json
{
  "raw_email_text": "Hi Accounts, We will process invoice INV-2026-0101 for INR 45,000 on 2026-08-28 via NEFT UTR SBIN00293847192. Deducting 2% TDS. Thanks, Apex Logistics",
  "invoice_id": "INV-2026-0101",
  "debtor_id": "DEBTOR-001"
}
```

### Decision Engine Output Example:
```json
{
  "decision_id": "DEC-DA2C7B3A",
  "selected_action": "WAIT",
  "final_ev_inr": 41537.79,
  "intent_detected": "PROMISE_TO_PAY",
  "intent_confidence": 0.95,
  "locked_settlement_amount_inr": 44100.0,
  "tds_rate_pct": 2.0,
  "candidates_table": [
    { "action": "WAIT", "expected_value_inr": 41537.79, "verdict": "SELECTED" },
    { "action": "NUDGE_EMAIL", "expected_value_inr": 40144.64, "verdict": "ALLOWED" },
    { "action": "ESCALATE_HUMAN", "expected_value_inr": 42326.59, "verdict": "BLOCKED (Policy Veto)" },
    { "action": "NO_ACTION", "expected_value_inr": 0.0, "verdict": "BASELINE" }
  ],
  "top_shap_factors": [
    { "display_label": "Valid NEFT UTR Provided", "impact_pct": 28.4, "positive": true }
  ]
}
```

---

## 12. Automated Test Suite (50/50 Passing)

We wrote 50 automated tests covering every layer of the backend in `backend/tests/`:

```bash
& "backend\venv\Scripts\python.exe" -m pytest backend\tests\ -v
```

### Test Coverage:
* `test_adversarial_suite.py`: Interception of prompt injections, invalid date traps, and fake UTRs.
* `test_agentic_tool_trace_and_adversarial_failure.py`: Tests the 3-generation security evolution and fallback handling.
* `test_api_endpoints.py`: Tests FastAPI endpoints for health, overview stats, and email ingestion.
* `test_ev_optimizer_edge_cases.py`: Tests integer paise math, superlinear fatigue curves, and NO_ACTION baselines.
* `test_guardrails_and_state_machine.py`: Tests price locks, high-value $>₹2.5\text{L}$ gating, and state transitions.
* `test_laplace_credibility_mathematics.py`: Tests cold-start 50% priors, decay curves, and score clamping.
* `test_level5_suite.py`: End-to-end testing of debtor twins, 6-bucket decomposition, and 50/50 trial logic.
* `test_mime_parser.py`: Tests RFC 822 email header and signature parsing.
* `test_ml_predictor.py`: Tests LightGBM prediction inference and TreeSHAP attribution outputs.
* `test_tax_and_gstr2b_reconciliation.py`: Tests Section 194C (1% & 2%), Section 194J (10%), and GST dispute routing.

---

## 13. How to Run the Project

### 1. Start the Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```

### 2. Start the Frontend
```bash
cd frontend
npm install
npm run dev
```

### 3. Quick Demo Walkthrough
1. Open `http://localhost:3000`. Check the **Receivables Decomposition Strip** at the top.
2. In the **Decision Lab** tab, select **Scenario 1 (Reliable Debtor + Promise)** and run the decision engine to see the EV candidates and TreeSHAP impact bars.
3. Test prompt injection defense by clicking **Scenario 6 (Prompt Injection Attack)**.
4. Switch to the **Debtor Twins** tab to view debtor profiles and the "What Changed?" decision diffs.
5. In the **A/B Evidence** tab, check the 50/50 randomized trial results and verify a past decision with **Decision Replay**.
