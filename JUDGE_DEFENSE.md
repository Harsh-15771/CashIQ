# CashIQ: Judge Defense & Technical FAQ

> **Core Idea:** In enterprise B2B finance, **Outstanding $\neq$ Collectible Debt**.  
> CashIQ asks: *Is this actually money that needs to be chased, or is there a valid business reason (TDS, GST, bank delay)?*  
> **Rule:** AI extracts and reasons; deterministic Python code handles the math, tax rules, and execution.

---

### Q1: How do you prevent LLM hallucinations from making bad financial commitments or offering discounts?

**Answer:**  
I completely separated unstructured text parsing from financial execution. Gemini 2.0 is used strictly as a semantic parser with strict JSON schema outputs. It extracts key details (promised payment date, UTR reference, TDS rate, dispute category) into a strongly-typed Pydantic schema.

The actual decision-making and money math are handled by deterministic Python backend rules:
1. **Price-Lock Rule:** Outbound payment links are locked to the gross invoice amount minus verified statutory TDS (2% for Section 194C or 10% for Section 194J). The LLM has zero ability to change amounts or offer discounts.
2. **Deterministic State Machine:** Status transitions (`SNOOZED`, `DISPUTED`, `ESCALATED`) follow strict backend code logic.
3. **High-Value Gate ($> ₹2,50,000$):** Any invoice over ₹2.5L is automatically held in the Control Center queue for 1-click human sign-off before any message or link is dispatched.

---

### Q2: Is your debtor population real or synthetic, and how do you prevent evaluation leakage?

**Answer:**  
For the hackathon demo environment, I seeded a portfolio of 25 enterprise accounts and payment timelines deterministically using fixed seeds (`seed=42`). 

To make sure there's zero data leakage:
* The seeded population covers real Indian B2B debtor profiles: high-trust logistics firms, chronic delayers, debtors facing GST portal issues, and new accounts.
* All longitudinal metrics (Days Beyond Terms, Laplace promise fulfillment ratios, and Promise Credibility Scores) are calculated dynamically from ledger history.
* In production, the system hooks directly into the live Razorpay Invoices API (`GET /v1/invoices`, `POST /v1/payment_links`) and Razorpay webhooks (`payment.captured`, `settlement.processed`).

---

### Q3: What are the exact metrics of your ML model vs standard baselines?

**Answer:**  
I evaluated the trained **LightGBM PTP Classifier** ($N=2,000$ synthetic training records, $N=400$ stratified test split) against standard baselines on the same test set:

| Model / Approach | ROC-AUC | Accuracy | F1 Score | Brier Score (Calibration) | Notes |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **Heuristic Baseline** (Historical Ratio Alone) | 0.7687 | 64.25% | 0.7039 | 0.2241 | Fails on new accounts and multi-touch message fatigue. |
| **Logistic Regression** | **0.8317** | 74.00% | **0.7174** | 0.1798 | Strong linear baseline. |
| **LightGBM Classifier (CashIQ)** | 0.8206 | **74.50%** | 0.7119 | **0.1725** | Captures non-linear interactions + allows TreeSHAP explanations. |

**My Takeaway:**  
Honestly, LightGBM and Logistic Regression performed almost identically on tabular receivables data ($\text{AUC } 0.8206 \text{ vs } 0.8317$). I chose LightGBM not to boast about an inflated metric, but because it enables **TreeSHAP local feature attributions**, allowing the UI to show finance operators exactly why a decision was made (e.g. $+28.4\%$ for a valid UTR, $-12.1\%$ for contact fatigue).

---

### Q4: How is the Promise Credibility Score calculated, and why use Laplace smoothing?

**Answer:**  
The Promise Credibility Score ($C_{\mathrm{ptp}} \in [0, 100]$) scores a debtor's historical commitment reliability:

$$C_{\mathrm{ptp}} = \mathrm{round}\left( 100 \times \left[ 0.45 \cdot \frac{\mathrm{Kept} + 1}{\mathrm{Total} + 2} + 0.25 \cdot \max\left(0, 1 - \frac{\mathrm{AvgDBT}}{45}\right) + 0.15 \cdot \min\left(1, \frac{\mathrm{Age}}{2.0}\right) + 0.15 \cdot \max\left(0, 1 - \frac{\mathrm{Disputes}}{3}\right) \right] \right)$$

**Why Laplace Smoothing:**  
A simple division ($\frac{\mathrm{Kept}}{\mathrm{Total}}$) breaks on brand new debtors with 0 past promises ($\frac{0}{0}$). Also, a debtor who paid $1/1$ invoices would naively get $100\%$, looking as trustworthy as an enterprise with $20/20$ fulfilled promises. Laplace smoothing ($\frac{\mathrm{Kept} + 1}{\mathrm{Total} + 2}$) gives brand-new accounts a neutral starting prior of $50\%$, which smoothly updates as more payment data is recorded.

---

### Q5: How does your Integer Paise EV Optimizer work, and why does Policy have veto power over EV?

**Answer:**  
Repeated dunning or immediate human escalation might yield a slightly higher short-term mathematical probability of recovery, but it annoys clients and damages long-term relationships.

I model this tradeoff explicitly in integer paise:

$$\mathrm{EV}(a) = \left\lfloor P(a) \times \mathrm{Amount}_{\mathrm{paise}} - \mathrm{Cost}_{\mathrm{paise}} - \mathrm{FatiguePenalty}_{\mathrm{paise}} \right\rfloor$$

Where:
$$\mathrm{FatiguePenalty}_{\mathrm{paise}} = \left\lfloor \mathrm{FrictionRate}(a) \times (\mathrm{Contacts} + 1)^{1.4} \times \mathrm{Amount}_{\mathrm{paise}} \right\rfloor$$

**Policy Veto Principle:**  
For a reliable debtor (e.g. Apex Logistics, Credibility: 93/100), `ESCALATE_HUMAN` might have the highest raw EV (₹42,326.59), but the backend policy engine blocks it with a **`BLOCKED (Policy Veto)`** because the debtor is trustworthy and actively communicating. Instead, `WAIT` is selected (EV: ₹41,537.79).

**EV proposes, but business policy has final veto power.** An AI system shouldn't harass a good client just because escalation has a marginally higher raw number.

---

### Q6: Why is `NO_ACTION` defined as flat ₹0 EV instead of claiming natural payments?

**Answer:**  
In B2B collections, many invoices get paid naturally when due. If an AI tool assigns invoice amounts to `NO_ACTION`, it takes credit for payments that would have happened anyway. By defining `NO_ACTION` as flat ₹0, CashIQ ensures that all reported value gains represent **true incremental recovery** generated by intelligent actions.

---

### Q7: What happens when an incoming debtor message is ambiguous?

**Answer:**  
Instead of guessing or hallucinating, CashIQ uses an **Ambiguity Gate ("Refusal to Guess")**:
* If a debtor mentions a tax issue without specifying whether it's a GST GSTR-2B mismatch or a Section 194C TDS deduction.
* If the confidence gap between top choices is small ($|P_1 - P_2| < 0.15$) and confidence is $< 70\%$.

When triggered, the system pauses automated action, marks the case as **`NEEDS_REVIEW`**, and sends it to the human Action Queue with an explanation.

---

### Q8: How does your Decision Replay Engine ensure 100% deterministic reproducibility?

**Answer:**  
LLM outputs can fluctuate slightly across calls. To make CashIQ audit-ready:
1. When a decision is evaluated, CashIQ saves the extracted JSON and a hash of the ledger state into a decision snapshot.
2. When someone clicks **Replay & Verify**, the system runs the cached JSON against the deterministic Python layers (LightGBM, EV math, and Policy Gate) without making another LLM API call.
3. This gives **100% identical results** every single time, with zero API latency and zero extra cost.

---

### Q9: Where does the "actual receipt" amount for reconciliation come from?

**Answer:**  
In the demo ledger, receipt amounts are simulated in the seeded data to demonstrate Section 194C 2% TDS deductions and GSTR-2B mismatch detection.

In a live production setup, this data flows in from:
1. **Razorpay Webhooks:** Listening to `payment.captured` and `settlement.processed` events containing net amounts and bank UTRs.
2. **Bank Feeds:** Ingesting standard MT940 / ISO 20022 bank statements to match incoming NEFT/RTGS credits against open invoices.

---

### Q10: Does the agent have write authority to modify databases or bank balances?

**Answer:**  
**No. The agent operates with strictly bounded, read-only tools:**
* Tools available to the LLM:
  * `inspect_debtor_digital_twin(debtor_id)`
  * `query_gstr2b_reconciliation_status(invoice_id)`
  * `calculate_integer_paise_ev(candidates)`
* **Zero Write Authority:** The AI cannot update database balances, change invoice amounts, delete records, or send unapproved messages. Outbound actions are executed by deterministic backend code or held for 1-click human sign-off.

---

### Q11: How did your prompt injection defense evolve during testing?

**Answer:**  
I didn't get the defenses right on the first try. I tested the pipeline against 6 attack vectors (system prompt overrides, fake UTRs, invalid dates like Feb 30, balance overwrite tricks):

1. **Iteration 1 (Basic Prompting):** Blocked only **1 / 6 attacks (16.7%)**. Prompt injections easily tricked the LLM into resetting invoice balances to 0.
2. **Iteration 2 (Strict Pydantic Validation):** Blocked **3 / 6 attacks (50.0%)**. Structural types prevented balance overwrites, but semantic date tricks (e.g. "We will pay on Feb 30") still slipped through.
3. **Iteration 3 (Ambiguity Gate + ISO Regex + Policy Gate - Current):** Blocked **6 / 6 attacks (100%)** by validating dates with regex, keeping parsing strictly separated from execution, and routing unverified claims to the human Action Queue.

---

### Q12: Why does Contractual Due show ₹81L while CashIQ Expected Inflows shows ₹57L? Does this mean CashIQ is underperforming?

**Answer:**  
**Absolutely not — in fact, the opposite is true.**

* **Contractual Due (₹81L):** Represents the naive accounting sum of all open invoice due dates. It dangerously assumes that 100% of enterprise debtors pay on the exact day agreed upon, with zero bank delays, zero TDS withholdings, and zero disputes. Relying on Contractual Due is why enterprises experience sudden cash crunches and payroll shortfalls.
* **CashIQ Expected Inflows (₹57L):** Represents the **mathematically calibrated, real-world cash forecast**. CashIQ discounts for chronic delayers (using historical Days Beyond Terms), accounts for verified statutory 2% TDS under Section 194C, and isolates unverified UTR claims.
* **The ₹24L difference is not lost cash; it is protected clarity.** By showing the finance team exactly which ₹24L is at risk or delayed, CashIQ enables proactive liquidity management rather than blind month-end surprises.

---

### Q13: What happens when you switch between Credit Operations Lead and Finance Controller / CFO?

**Answer:**  
The role switcher demonstrates **Segregation of Duties (SoD Level 2)** and enterprise dual-control governance:

1. **Credit Operations Lead (`ops`):**
   * Can approve, pause, or snooze standard daily operational actions on invoices under ₹2.5L.
   * High-value invoices ($\ge$ ₹2,50,000) are **policy-locked** (`Locked (CFO)`). An operations analyst cannot unilaterally authorize large settlement deductions or pause dunning on major accounts.
2. **Finance Controller / CFO (`cfo`):**
   * Unlocks executive financial authority (`👑 Authorize`).
   * Can sign off on high-value exposures ($\ge$ ₹2.5L) as well as standard invoices, maintaining full executive oversight.
3. **Audit Trail Transparency:**
   * Every decision is recorded with approver attribution (`approved_by: "cfo_controller"` vs `"credit_ops_lead"`) and rendered in plain, human-readable English in the Guardrail Audit Log.
