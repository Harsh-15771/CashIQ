# ⚡ Razorpay CashIQ: Autonomous B2B Receivables Intelligence & Guardrailed Recovery Engine
## Comprehensive PRD, SRS, Architecture, UI/UX Specification & Merchant Deployment Guide

---

# 📑 TABLE OF CONTENTS
1. [Executive Summary & Real-Life Merchant Value](#1-executive-summary--real-life-merchant-value)
2. [Product Requirements Document (PRD)](#2-product-requirements-document-prd)
3. [Software Requirements Specification (SRS)](#3-software-requirements-specification-srs)
4. [Mathematical & Algorithmic Formulations](#4-mathematical--algorithmic-formulations)
5. [System Architecture & Pipeline Flow](#5-system-architecture--pipeline-flow)
6. [UI/UX Flow & Screen Breakdown](#6-uiux-flow--screen-breakdown)
7. [Development & Implementation Details](#7-development--implementation-details)
8. [Automated Test Suite & Adversarial Security Report](#8-automated-test-suite--adversarial-security-report)
9. [Merchant Real-Life Onboarding & Production Deployment](#9-merchant-real-life-onboarding--production-deployment)

---

# 1. Executive Summary & Real-Life Merchant Value

### The Real-World B2B Problem in India
Indian B2B enterprises and MSMEs lose over **₹100M+ in working capital annually** to delayed receivables. The average Days Sales Outstanding (DSO) in India exceeds **65 days**, and average Days Beyond Terms (DBT) is **+22 days**. 

The root cause of delayed cash flow is rarely outright refusal to pay; rather, it is:
1. **Asynchronous Communication Debt:** Payment promises, scheduled payment run dates, and NEFT/RTGS UTR references are buried inside unstructured email replies (`"We will clear this in our Friday payment run on the 28th via NEFT"`).
2. **Procedural Disputes:** Legitimate delays caused by GST 2A/2B input tax credit mismatches, missing customer Purchase Orders (POs), or TDS withholding (194C/194J 2% or 10%).
3. **Empty Delay Tactics:** Habitual delinquent debtors string merchants along with vague excuses (`"Pending board approval"`, `"Checking with CFO"`).
4. **Blind Dunning Spam:** Standard automated tools blast repetitive reminder emails every 3 days. When a customer has *already promised* to pay on Friday, getting a generic reminder on Thursday damages enterprise client relationships.

### How CashIQ Solves This for Real Merchants
**Razorpay CashIQ** transforms Razorpay from a passive invoice generator into an **autonomous receivables intelligence engine**.

```
[Inbound Debtor Email / Webhook] 
       │
       ▼
[MIME Parser & Signature Stripper] 
       │
       ▼
[Gemini Flash Semantic Extractor] (Gated at Confidence ≥ 0.80)
       │
       ▼
[Razorpay Ledger Synchronization] (Fetches debtor history & DBT)
       │
       ▼
[LightGBM PTP Classifier + TreeSHAP Explainer] (Predicts P(Fulfill))
       │
       ▼
[Financial Guardrail Engine] (Price-Lock, Cooldown, >₹2.5L Human Gate)
       │
       ▼
[Deterministic State Machine] ──► [SNOOZED] | [WATCH] | [ESCALATED] | [DISPUTED]
       │
       ▼
[Dynamic Locked Razorpay Payment Link] (Auto-calculated with TDS deduction)
```

---

# 2. Product Requirements Document (PRD)

## 2.1 User Personas
* **Finance Director / CFO:** Wants aggregate cash flow visibility, 30-day probabilistic inflow projections, and zero risk of brand/relationship damage.
* **Credit Controller / AR Lead:** Wants to stop manually reading hundreds of emails, identify chronic delayers instantly, and have a 1-click approval queue for high-value receivables.
* **Debtor Accounts Payable (AP) Team:** Wants their payment promises respected without being spammed, correct TDS deductions pre-calculated, and instant payment links.

## 2.2 Core Value Propositions & Business Impact
| Metric | Industry Baseline (Manual / Blind Dunning) | CashIQ Performance Target |
| :--- | :--- | :--- |
| **Days Sales Outstanding (DSO)** | 68 Days | **51 Days (-25% DSO)** |
| **Relationship Churn from Over-Contact** | 14% merchant dissatisfaction | **< 1% (Snoozes valid promises)** |
| **AR Team Manual Processing Time** | ~4.5 hours / day reading emails | **< 20 minutes / day (1-click queue)** |
| **Cash Inflow Forecast Accuracy** | ±38% error (Contractual due dates) | **±7% error (Weighted by PTP & DBT)** |

## 2.3 Functional Requirements
* **FR-1 (MIME Email Ingestion):** Ingest raw RFC 822 emails via SendGrid/Mailgun webhook; strip email signatures, disclaimers, and reply chains.
* **FR-2 (Semantic Commitment Extraction):** Extract payment intent, promised payment date (ISO-8601), bank UTR number, TDS withholding percentage, and dispute categorization via LLM.
* **FR-3 (Promise Reliability ML Scoring):** Predict the mathematical probability $P(\text{Promise Fulfilled} \mid \text{History, Offer, Timing})$ using a trained LightGBM model.
* **FR-4 (TreeSHAP Explainability):** Output the exact top-3 features influencing the probability for auditability.
* **FR-5 (4 Inviolable Financial Guardrails):** Enforce Price-Lock, 4-day Cooldown, $>₹2.5\text{L}$ High-Value human gate, and $<0.80$ Confidence gate.
* **FR-6 (30-Day Probabilistic Cash Forecaster):** Generate daily expected cash inflow curves weighted by active PTP dates and debtor historical DBT.

---

# 3. Software Requirements Specification (SRS)

## 3.1 System Interfaces
1. **Razorpay Invoices & Payment Links API:** REST integration for fetching invoices, creating customer virtual accounts, and issuing locked dynamic payment links.
2. **Razorpay Webhooks API:** Ingests `payment.captured`, `payment_link.paid`, and `invoice.paid` events with HMAC SHA-256 signature verification (`X-Razorpay-Signature`).
3. **Inbound Email Webhook API:** Ingests raw SendGrid/Postmark/Mailgun webhook JSON payloads or raw `.eml` strings.
4. **Google Gemini Flash 2.0 SDK:** Low-latency structured JSON extraction using Pydantic v2 schemas.

## 3.2 Domain Data Schemas
```python
class IntentType(str, Enum):
    PROMISE_TO_PAY = "PROMISE_TO_PAY"
    DISPUTE_RAISED = "DISPUTE_RAISED"
    CLAIMED_PAID = "CLAIMED_PAID"
    PROCEDURAL_DELAY = "PROCEDURAL_DELAY"
    IRRELEVANT = "IRRELEVANT"

class DisputeType(str, Enum):
    GST_2A_MISMATCH = "GST_2A_MISMATCH"
    MISSING_PO = "MISSING_PO"
    DAMAGED_GOODS = "DAMAGED_GOODS"
    PRICE_MISMATCH = "PRICE_MISMATCH"
    NONE = "NONE"

class InvoiceStatus(str, Enum):
    ISSUED = "ISSUED"
    OVERDUE = "OVERDUE"
    PARSING = "PARSING"
    SNOOZED = "SNOOZED"
    WATCH_CADENCE = "WATCH_CADENCE"
    ESCALATED = "ESCALATED"
    DISPUTED = "DISPUTED"
    BROKEN_PTP = "BROKEN_PTP"
    UNVERIFIED_PAYMENT_CLAIM = "UNVERIFIED_PAYMENT_CLAIM"
    SETTLED = "SETTLED"
```

## 3.3 The 4 Inviolable Financial Guardrails
```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       FINANCIAL GUARDRAIL ENGINE                            │
├─────────────────────────────────────────────────────────────────────────────┤
│ 1. PRICE-LOCK GUARD:                                                        │
│    Settlement_Amount = Invoice_Amount * (1.0 - Validated_TDS_Percentage)    │
│    • AI output has ZERO write-access to invoice amount in the database.     │
│                                                                             │
│ 2. PROACTIVE COOLDOWN ENFORCER:                                             │
│    • Hard limit of 1 proactive communication per 4 business days.           │
│                                                                             │
│ 3. HIGH-VALUE HUMAN-IN-THE-LOOP GATING:                                     │
│    • Invoices >= ₹2,50,000 automatically route to 1-click human approval.   │
│                                                                             │
│ 4. CONFIDENCE GATING:                                                       │
│    • Extraction confidence < 0.80 routes to MANUAL_REVIEW.                  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

# 4. Mathematical & Algorithmic Formulations

### 1. Laplace-Smoothed Debtor Fulfillment Ratio
To safely handle **cold-start debtors** with zero prior history ($N=0$) without dividing by zero or assuming 0% / 100%:
$$\text{Fulfillment Ratio} = \frac{\text{Promises Kept} + 1}{\text{Total Promises Made} + 2}$$
* Cold-start debtor ($0/0$) yields prior: $\frac{0+1}{0+2} = 0.50$ (50% neutral baseline).
* Highly reliable debtor ($9/10$) yields: $\frac{9+1}{10+2} = 0.833$.
* Chronic delayer ($1/8$) yields: $\frac{1+1}{8+2} = 0.200$.

### 2. The 3-Zone Probability Decision Matrix
Given the trained LightGBM probability $P = P(\text{Promise Fulfilled} \mid \vec{x})$:
$$\text{Decision}(P) = \begin{cases} 
\text{SNOOZE (Suppress reminders until } T_{\text{promise}} + 1\text{)} & \text{if } P \ge 0.70 \\
\text{WATCH\_CADENCE (Maintain normal reminder cadence)} & \text{if } 0.50 \le P < 0.70 \\
\text{ESCALATE (Trigger warm nudge / manual review)} & \text{if } P < 0.50 
\end{cases}$$

### 3. Capped Collection Priority Ranking Formula
To rank outstanding invoices without explosive priority inflation on ancient overdue bills:
$$\text{Priority Score} = \text{Amount} \times \min\left(1 + \frac{\text{Days Overdue}}{30}, 3.0\right) \times (1.0 - \text{Fulfillment Ratio})$$

### 4. 30-Day Probabilistic Cash Forecaster
For day $t \in [1, 30]$:
$$\text{Expected Inflow}(t) = \sum_{i \in \text{Invoices}} \text{Amount}_i \times \Pr(\text{Settlement Date}_i = t)$$
Where $\Pr(\text{Settlement Date}_i = t)$ is modeled as a Gaussian kernel centered at:
$$\mu_i = \begin{cases} 
T_{\text{promised}, i} & \text{if } \text{status}_i = \text{SNOOZED} \\
\text{DueDate}_i + \text{AvgDBT}_{\text{debtor}} & \text{otherwise} 
\end{cases}$$

---

# 5. System Architecture & Pipeline Flow

```
[Inbound Email .eml / Webhook]
             │
             ▼
   [1. InboundMIMEParser] ────────────► [No Invoice ID Found?] ──► [State: UNLINKED_INBOUND]
             │
             ▼
 [2. LLMSemanticExtractor] (Gemini 2.0 Flash)
             │
             ├──► [Adversarial Injection Detected?] ──► [FLAGGED_AS_ADVERSARIAL_INJECTION]
             │                                          (Price locked to DB, Alert logged)
             ├──► [Invalid Date Trap (e.g. Feb 31)?] ──► [Confidence < 0.80 -> MANUAL_REVIEW]
             │
             ▼
  [3. Razorpay Ledger Sync]
  (Fetches Debtor Fulfillment History, Avg DBT, Invoices Settled)
             │
             ▼
  [4. LightGBM PTP Predictor + TreeSHAP Explainer]
  (Vector: [Ratio, DBT, Count, LogAmount, Overdue, Extension, HasUTR, MonthEnd, Condition])
             │
             ▼
 [5. FinancialGuardrailEngine]
  ├── Guardrail 1: Price Lock -> Settlement = Amount * (1 - TDS)
  ├── Guardrail 2: Cooldown -> Blocks nudges within 4 days
  ├── Guardrail 3: High Value -> Amount >= ₹2.5L forces MANUAL_REVIEW
  └── Guardrail 4: Confidence Gate -> Conf < 0.80 forces MANUAL_REVIEW
             │
             ▼
[6. DeterministicStateMachine]
  ├── SNOOZED (P >= 0.70) -> Sets active_ptp_date, suppresses reminders
  ├── WATCH_CADENCE (0.50 <= P < 0.70) -> Keeps standard collection cycle
  ├── ESCALATED (P < 0.50) -> Routes to high-priority recovery
  └── DISPUTED -> Categorizes GST/PO mismatch & logs required document
             │
             ▼
[7. Dynamic Payment Link Generator] (Locked Razorpay URL)
```

---

# 6. UI/UX Flow & Screen Breakdown

The frontend is built with **Vite, React 18, Tailwind CSS, Recharts, and Lucide Icons**, running on dark mode at `http://localhost:3000`.

### Screen 1: Action Queue & Immutable Guardrails Audit Trail
* **Pending Actions Table:** Shows all invoices requiring 1-click human confirmation (e.g., invoices $\ge ₹2.5\text{L}$, disputed GST bills, or unverified UTR claims).
* **1-Click Approval:** AR leads can confirm or edit actions in 1 click.
* **Live Audit Trail Log:** Displays real-time intercepted prompt injection attacks, price-locks, cooldown blocks, and status updates with timestamps and parameters.

### Screen 2: Invoices Ledger & 30-Day Cash Forecast
* **30-Day Probabilistic Cash Inflow Forecast:** Recharts Area Chart comparing **Contractual Due Date Curve** vs **CashIQ Expected Inflow Curve**.
* **Filterable Invoice Ledger:** Sorted descending by **Capped Collection Priority Score**.
* **Debtor Intelligence:** Visual progress bars displaying each debtor's Laplace-smoothed Promise Kept ratio.

### Screen 3: Live Inbound Email Simulator (Hero Judge Demo)
* **Interactive Evaluation Scenarios:**
  1. 🟢 **Reliable Debtor + UTR:** Shows $P=93\%$, SNOOZE decision, TreeSHAP bars (`+18.4% UTR`, `+12.1% History`), and locked payment link with 2% TDS deducted.
  2. 🔴 **Chronic Delayer + Vague Promise:** Shows $P=26\%$, ESCALATE decision, and negative TreeSHAP drivers (`-14.2% High DBT`, `-9.1% Conditional Promise`).
  3. 🟡 **GST 2A Mismatch Dispute:** Shows DISPUTED state and flags missing document `GST_2A_RECONCILIATION_REPORT`.
  4. 🛡️ **Prompt Injection Attack:** Attempts system override balance to 0; engine catches attack, isolates text, locks price to true DB amount, and writes to audit log.
  5. ⚠️ **Invalid Date Trap (Feb 31):** Catches invalid date, lowers confidence below 0.80, and routes to manual review.
  6. 🔍 **Fake UTR Claim:** Catches unverified UTR and routes to `UNVERIFIED_PAYMENT_CLAIM`.

---

# 7. Development & Implementation Details

### Directory Structure
[`Hackathon Project/razorpay-cashiq/`](file:///c:/Users/harsh/Desktop/Harsh%20Folder/Hackathon%20Project/razorpay-cashiq)
```
razorpay-cashiq/
├── backend/
│   ├── app/
│   │   ├── main.py                     # FastAPI app with CORS & lifespan events
│   │   ├── config.py                   # Pydantic v2 Settings & thresholds
│   │   ├── core/
│   │   │   ├── schemas.py              # Pydantic v2 domain schemas (Invoices, Commitments, SHAP)
│   │   │   ├── guardrails.py           # 4 Financial Guardrails & Audit Logger
│   │   │   └── state_machine.py        # 3-Way Deterministic State Machine (Snooze/Watch/Escalate)
│   │   ├── ml/
│   │   │   ├── generate_data.py        # Deterministic PTP dataset generator (5,000 records)
│   │   │   ├── train.py                # LightGBM Classifier & TreeSHAP Explainer training
│   │   │   ├── predictor.py            # Real-time inference & top-3 SHAP attribution
│   │   │   └── artifacts/              # Serialized ptp_classifier.joblib & metrics.json
│   │   ├── parser/
│   │   │   ├── mime_parser.py          # RFC 822 / SendGrid parser & signature stripper
│   │   │   └── llm_extractor.py        # Gemini Flash structured extractor & injection trap
│   │   ├── services/
│   │   │   ├── razorpay_client.py      # Razorpay Ledger engine & webhook HMAC verifier
│   │   │   └── cash_forecaster.py      # 30-Day explainable cash inflow forecaster
│   │   └── api/
│   │       ├── routes_inbound.py       # Email webhook & simulation endpoint
│   │       ├── routes_invoices.py      # Invoice list, priority scores & overview stats
│   │       ├── routes_actions.py       # Action queue, 1-click approvals & audit trail
│   │       └── routes_razorpay.py      # Webhook listener & 30-day forecast endpoint
│   ├── tests/                          # 16 Automated Pytest Unit & Integration Tests
│   ├── requirements.txt
│   └── venv/                           # Dedicated Python 3.11 virtual environment
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx              # Brand header & tab navigation
│   │   │   ├── OverviewCards.jsx       # 4 Key financial metrics cards
│   │   │   ├── ActionQueueTab.jsx      # Screen 1: 1-Click approvals & Guardrail audit trail
│   │   │   ├── InvoicesTab.jsx         # Screen 2: Invoices table & 30-day cash forecast
│   │   │   └── LiveSimulatorTab.jsx    # Screen 3: Interactive Judge Testing Playground
│   │   ├── api.js                      # API client with auto-polling
│   │   ├── App.jsx                     # Root React application
│   │   └── main.jsx
│   ├── package.json
│   ├── vite.config.js
│   └── tailwind.config.js
├── README.md
└── b2b_receivables_intelligence_masterplan.md
```

---

# 8. Automated Test Suite & Adversarial Security Report

All 16 unit, integration, ML, and security tests pass 100%:

```bash
pytest backend/tests/ -v
```

```
backend/tests/test_adversarial_suite.py::test_adversarial_prompt_injection_defense   PASSED
backend/tests/test_adversarial_suite.py::test_adversarial_invalid_date_trap          PASSED
backend/tests/test_adversarial_suite.py::test_adversarial_fake_utr_verification      PASSED
backend/tests/test_api_endpoints.py::test_health_and_root_endpoints                 PASSED
backend/tests/test_api_endpoints.py::test_invoices_and_stats_endpoints              PASSED
backend/tests/test_api_endpoints.py::test_inbound_email_processing_flow              PASSED
backend/tests/test_api_endpoints.py::test_30_day_cash_forecast_endpoint             PASSED
backend/tests/test_guardrails_and_state_machine.py::test_guardrail_price_lock_with_tds PASSED
backend/tests/test_guardrails_and_state_machine.py::test_guardrail_high_value_gating PASSED
backend/tests/test_guardrails_and_state_machine.py::test_guardrail_confidence_gating PASSED
backend/tests/test_guardrails_and_state_machine.py::test_state_machine_3way_transitions PASSED
backend/tests/test_mime_parser.py::test_parse_standard_invoice_reply                 PASSED
backend/tests/test_mime_parser.py::test_unlinked_inbound_fallback                    PASSED
backend/tests/test_ml_predictor.py::test_reliable_debtor_with_utr_prediction        PASSED
backend/tests/test_ml_predictor.py::test_chronic_delayer_prediction                 PASSED
backend/tests/test_ml_predictor.py::test_cold_start_debtor_prediction               PASSED
======================= 16 passed in 5.47s =======================
```

---

# 9. Merchant Real-Life Onboarding & Production Deployment

### How a Real Merchant Uses CashIQ in 3 Steps:

1. **Step 1: Connect Razorpay API Credentials**
   The merchant generates a Key ID & Secret from their Razorpay Dashboard and pastes them in their `.env`:
   ```env
   RAZORPAY_KEY_ID=rzp_live_xxxxxxxxxxxx
   RAZORPAY_KEY_SECRET=yyyyyyyyyyyyyyyyyyyy
   RAZORPAY_WEBHOOK_SECRET=cashiq_webhook_secret_2026
   ```

2. **Step 2: Route Inbound Invoicing Emails**
   The merchant configures their SendGrid / Postmark Inbound Parse Webhook to point to:
   `https://cashiq.merchantdomain.com/api/inbound/process-email`
   Whenever a debtor replies to `invoices@merchantdomain.com`, SendGrid posts the raw email to CashIQ.

3. **Step 3: AR Team Operates in 1-Click Mode**
   * Valid promises are automatically snoozed, protecting client relationships.
   * High-value invoices ($> ₹2.5\text{L}$) appear in the Action Queue for 1-click confirmation.
   * GST mismatches automatically alert the tax ops team with the required document name.
   * Razorpay Webhooks automatically mark invoices as `SETTLED` the instant payment is captured.
