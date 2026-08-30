# CashIQ: Judge Defense, Empirical Benchmarks & Technical FAQ

> **Architectural Thesis:**  
> In enterprise B2B finance, **Outstanding $\neq$ Collectible Debt**.  
> CashIQ asks an earlier question: *Is this actually money we need to recover, and if so, what should happen next?*  
> **AI proposes and reasons; deterministic backend services authorize and execute.**

---

## Question 1: How do you prevent LLM hallucinations from making unauthorized financial commitments or granting price reductions?

**Answer:**  
CashIQ enforces an absolute separation between the non-deterministic LLM reasoning layer and deterministic execution services. The Gemini 2.0 LLM is strictly employed as a structured semantic parser with JSON schema constraints. It outputs extracted parameters (e.g. promised date, stated UTR, TDS percentage, dispute category) into a strongly typed Pydantic v2 schema.

The actual financial state transitions and outbound communications are governed entirely by deterministic backend guardrails:
1. **Price-Lock Guardrail:** Outbound payment links lock the exact gross invoice amount less legally validated TDS (Section 194C 2% or Section 194J 10%). The LLM cannot authorize arbitrary discounts or write-offs.
2. **Deterministic State Machine:** A 3-way transition gate (`SNOOZED`, `DISPUTED`, `ESCALATED`) ensures that invoice statuses can only transition through verified backend state transitions.
3. **High-Value Gating ($> ₹2,50,000$):** Any single invoice or exposure exceeding ₹2.5L is automatically intercepted and routed to the Credit Operations Action Queue for mandatory 1-click human sign-off before any communication or payment link is dispatched.

---

## Question 2: Is your debtor population real or synthetic, and how do you prevent evaluation leakage?

**Answer:**  
For the hackathon demo environment, the baseline debtor portfolio of 25 enterprise accounts and historical settlement timelines are deterministically seeded using fixed pseudo-random seeds (`seed=42`). 

To guarantee zero evaluation leakage:
* The seeded population spans realistic Indian B2B archetypes (High-Trust logistics enterprises, Chronic delayers, GST dispute debtors, and Cold-Start accounts).
* All longitudinal metrics (Days Beyond Terms, Laplace-smoothed promise fulfillment ratios, and Promise Credibility Scores) are calculated dynamically in-memory from historical ledger records.
* In production, the system connects directly to live Razorpay Invoices API (`GET /v1/invoices`, `POST /v1/payment_links`) and Razorpay Webhook streams (`payment.captured`, `settlement.processed`).

---

## Question 3: What are the exact empirical metrics of your ML model vs. standard baselines?

**Answer (Unvarnished Empirical Benchmark Disclosure):**  
We evaluated our trained **LightGBM PTP Classifier** ($N=2,000$ training records, $N=400$ stratified test split) against standard linear and heuristic baselines on the same test set:

| Model / Approach | ROC-AUC | Accuracy | F1 Score | Brier Score (Calibration) | Role / Value Proposition |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **Heuristic Baseline** (Historical Ratio Alone) | 0.7687 | 64.25% | 0.7039 | 0.2241 | Naive rule prior; fails on cold-start & multi-touch fatigue. |
| **Logistic Regression** | **0.8317** | 74.00% | **0.7174** | 0.1798 | Strong linear benchmark; lacks non-linear TreeSHAP interactions. |
| **LightGBM Classifier (CashIQ)** | 0.8206 | **74.50%** | 0.7119 | **0.1725** | **Selected**: Non-linear feature interactions + local TreeSHAP attributions. |

**The Honest Insight:**  
LightGBM and Logistic Regression perform at near parity on tabular receivables signals ($\text{AUC } 0.8206 \text{ vs } 0.8317$). We deliberately chose LightGBM not for an exaggerated metric claim, but because it enables **exact local TreeSHAP attribution generation**, providing human Credit Ops leads with interpretable $+28.4\%$ UTR / $-12.1\%$ fatigue impact percentages.

---

## Question 4: How is the Promise Credibility Score calculated, and why do you use Laplace smoothing?

**Answer:**  
The Promise Credibility Score ($C_{\text{ptp}} \in [0, 100]$) quantifies the historical trustworthiness of a debtor's payment commitment:

$$C_{\text{ptp}} = \text{round}\left( 100 \times \left[ 0.45 \cdot \frac{\text{Kept} + 1}{\text{Total} + 2} + 0.25 \cdot \max\left(0, 1 - \frac{\text{AvgDBT}}{45}\right) + 0.15 \cdot \min\left(1, \frac{\text{Age}_{\text{years}}}{2.0}\right) + 0.15 \cdot \max\left(0, 1 - \frac{\text{Disputes}}{3}\right) \right] \right)$$

**Why Laplace Smoothing:**  
Naive fulfillment ratios ($\frac{\text{Kept}}{\text{Total}}$) fail on cold-start accounts with 0 historical promises, producing undefined division-by-zero errors ($\frac{0}{0} \to \text{NaN}$). Furthermore, a debtor with $1/1$ promises kept would naively appear to have $100\%$ credibility, identical to a multi-year client with $20/20$ fulfilled promises. Laplace smoothing ($\frac{\text{Kept} + 1}{\text{Total} + 2}$) places unobserved cold-start debtors at a neutral prior of $0.50$ ($50\%$), gracefully adjusting as empirical evidence accumulates.

---

## Question 5: How does your Integer Paise EV Optimizer work, and why does Policy have veto power over EV?

**Answer:**  
In B2B receivables, executing high-pressure actions (e.g. repeated dunning or immediate human escalation) may have a high raw mathematical probability of short-term recovery, but damages customer relationships and causes severe contact fatigue.

CashIQ models this tradeoff explicitly using Integer Paise Expected Value:

$$\text{EV}(a) = \left\lfloor P(a) \times \text{Amount}_{\text{paise}} - \text{Cost}_{\text{paise}} - \text{FatiguePenalty}_{\text{paise}} \right\rfloor$$

Where:
$$\text{FatiguePenalty}_{\text{paise}} = \left\lfloor \text{FrictionRate}(a) \times (\text{Contacts} + 1)^{1.4} \times \text{Amount}_{\text{paise}} \right\rfloor$$

**Policy Veto Principle (The Hero Thesis):**  
In our candidate evaluation table for a reliable debtor (e.g. Apex Logistics, Credibility: 93/100), `ESCALATE_HUMAN` has the highest raw EV (₹42,326.59), but is marked **`BLOCKED (Policy Veto)`** by our backend policy engine because the debtor has high credibility and zero payment avoidance history. `WAIT` is selected (EV: ₹41,537.79).

**Expected Value proposes, but Policy holds absolute veto power.** An AI decision engine should never harass a high-trust partner simply because immediate escalation has a marginally higher raw mathematical value.

---

## Question 6: Why is `NO_ACTION` defined as flat ₹0 EV rather than claiming organic debtor payments?

**Answer:**  
`NO_ACTION` is defined with $\text{EV} = ₹0.00$ and $P(\text{Recovery}) = \text{N/A}$ as a foundational architectural invariant. In B2B dunning, organic payments happen naturally when invoices mature. If an AI engine assigns raw invoice value to `NO_ACTION`, it claims organic working capital as system-generated value. By defining `NO_ACTION` as a flat ₹0 benchmark, CashIQ ensures that reported value reflects **pure incremental recovery** generated by intelligent intervention.

---

## Question 7: What happens when inbound debtor communication is ambiguous?

**Answer:**  
Rather than hallucinating or forcing an arbitrary guess, CashIQ implements an **Ambiguity Gate ("Refusal to Guess")**:
* When evidence is split across conflicting categories (e.g. a debtor cites an unspecified tax deduction that could be a GST GSTR-2B filing mismatch or a Section 194C TDS deduction).
* When the top intent confidence delta between the top-1 and top-2 candidates is $< 15\%$ ($|P_1 - P_2| < 0.15$) and confidence is $< 70\%$.

In these scenarios, the engine halts automated execution and outputs **`NEEDS_REVIEW`**, routing the item directly to the Credit Operations Action Queue with the specific ambiguity explanation attached.

---

## Question 8: How does your Decision Replay Engine guarantee 100% deterministic reproducibility?

**Answer:**  
LLMs are inherently non-deterministic; even at temperature $0.0$, subtle API version updates, tokenization shifts, and server float precision differences can cause output variance on repeat calls.

To provide airtight auditability:
1. When a live decision is evaluated, CashIQ caches the extraction JSON and records the ledger state hash into an immutable decision snapshot (`backend/app/domain/replay_engine.py`).
2. During Decision Replay, the engine **replays the stored extraction JSON against the pinned deterministic layers** (LightGBM predictor, EV optimizer, and Policy Gate) without re-calling the LLM API.
3. This guarantees **100% bit-identical reproducibility** with zero API latency and zero cost during regulatory or internal compliance audits.

---

## Question 9: Where does the "actual receipt" amount for reconciliation come from?

**Answer:**  
In the hackathon demonstration ledger, the actual receipt amounts used for short-payment matching are simulated within the seeded ledger records to illustrate Section 194C 2% TDS withholding and GSTR-2B mismatch detection. 

In production deployments, this data is ingested in real-time from:
1. **Razorpay Webhook Streams:** Ingesting `payment.captured` and `settlement.processed` payloads containing net bank transfer amounts and UTR references.
2. **Bank Statement Feeds:** Parsing standard ISO 20022 `camt.053` or MT940 electronic bank statements to match bank ledger credits against open invoice line items.

---

## Question 10: Does your agent have write authority, and how is tool-calling bounded?

**Answer:**  
CashIQ implements a **Bounded Read-Only Agentic Tool Layer with Zero Write Authority**:
* The LLM and evaluation subagents are only granted read-only tools:
  * `inspect_debtor_digital_twin(debtor_id)`
  * `query_gstr2b_reconciliation_status(invoice_id)`
  * `calculate_integer_paise_ev(candidates)`
* **Zero Write Authority:** The AI cannot directly update bank accounts, modify database balances, delete invoices, or dispatch unverified communications. Any outbound action is either executed by deterministic policy rules or held for 1-click human confirmation in the Credit Operations Console.

---

## Question 11: What was your genuine adversarial failure and security evolution curve?

**Answer (Honest Security Evolution Narrative):**  
We did not achieve 100% adversarial defense on day one. Our security architecture evolved through three distinct iterations tested against a battery of 6 attack vectors (system prompt overrides, fake UTRs, invalid leap-day date traps, balance clear injections):

1. **Iteration 1 (Vanilla LLM Prompting):** Blocked only **1 / 6 attacks (16.7% defense)**. Prompt injections successfully convinced the LLM to mark invoice balance as 0 INR.
2. **Iteration 2 (Strict Pydantic Validation):** Blocked **3 / 6 attacks (50.0% defense)**. Structural type validation stopped balance overwrite injections, but semantic date traps (e.g. "We will pay on Feb 30") bypassed the parser and scheduled invalid snooze dates.
3. **Iteration 3 (Ambiguity Gate + Deterministic Policy Gate - Current):** Achieved **6 / 6 defense (100% interception)** by enforcing ISO-8601 regex date validation, decoupling semantic extraction from execution authority, and routing unverified claims to the human Action Queue.
