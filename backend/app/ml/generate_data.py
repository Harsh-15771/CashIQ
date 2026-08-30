import numpy as np
import pandas as pd
from typing import Tuple


def generate_ptp_dataset(n_samples: int = 5000, random_state: int = 42) -> pd.DataFrame:
    """
    Generates a deterministically seeded synthetic population of historical Promise-to-Pay (PTP) records.
    Reflects realistic Indian enterprise B2B behaviors across different debtor archetypes
    (prompt payers, bureaucratic enterprises, chronic delayers, and new cold-start accounts).
    
    Target:
      fulfilled (1 = settled within 2 days of promised date, 0 = broken promise / default)
    """
    np.random.seed(random_state)

    # 1. Debtor Archetypes: 0=Reliable Corp (35%), 1=Bureaucratic/TDS (30%), 2=Chronic Delayer (25%), 3=Cold Start (10%)
    archetype = np.random.choice([0, 1, 2, 3], size=n_samples, p=[0.35, 0.30, 0.25, 0.10])

    # 2. Historical Debtor Features
    invoices_settled = np.zeros(n_samples, dtype=int)
    fulfillment_ratio = np.zeros(n_samples, dtype=float)
    avg_dbt = np.zeros(n_samples, dtype=float)

    for i in range(n_samples):
        arch = archetype[i]
        if arch == 0:  # Reliable Corp
            invoices_settled[i] = np.random.randint(10, 60)
            kept = np.random.randint(int(0.85 * invoices_settled[i]), invoices_settled[i] + 1)
            fulfillment_ratio[i] = (kept + 1.0) / (invoices_settled[i] + 2.0)
            avg_dbt[i] = np.random.uniform(-2.0, 5.0)
        elif arch == 1:  # Bureaucratic / Procedural
            invoices_settled[i] = np.random.randint(5, 40)
            kept = np.random.randint(int(0.60 * invoices_settled[i]), int(0.85 * invoices_settled[i]) + 1)
            fulfillment_ratio[i] = (kept + 1.0) / (invoices_settled[i] + 2.0)
            avg_dbt[i] = np.random.uniform(5.0, 18.0)
        elif arch == 2:  # Chronic Delayer
            invoices_settled[i] = np.random.randint(3, 30)
            kept = np.random.randint(0, int(0.45 * invoices_settled[i]) + 1)
            fulfillment_ratio[i] = (kept + 1.0) / (invoices_settled[i] + 2.0)
            avg_dbt[i] = np.random.uniform(15.0, 45.0)
        else:  # Cold Start (N=0)
            invoices_settled[i] = 0
            fulfillment_ratio[i] = 0.50  # Laplace neutral baseline
            avg_dbt[i] = 0.0

    # 3. Invoice Characteristics
    # Invoice amounts in INR: log-normal distributed between ₹25,000 and ₹50,00,000
    raw_amount = np.random.lognormal(mean=11.8, sigma=1.2, size=n_samples)
    invoice_amount = np.clip(raw_amount, 25000.0, 5000000.0)
    log_invoice_amount = np.log(invoice_amount)

    current_overdue_days = np.random.exponential(scale=14.0, size=n_samples)
    current_overdue_days = np.clip(current_overdue_days, 0.0, 90.0)

    # 4. Promise Specifics
    # Gap between overdue date and promised date (e.g. "will pay in 7 days")
    promise_extension_days = np.random.exponential(scale=8.0, size=n_samples) + 1.0
    promise_extension_days = np.clip(promise_extension_days, 1.0, 45.0)

    # UTR provided: More common among reliable debtors, strong positive fulfillment signal
    utr_prob = np.where(archetype == 0, 0.55, np.where(archetype == 1, 0.35, 0.12))
    has_utr_stated = (np.random.rand(n_samples) < utr_prob).astype(int)

    # Month end promise (25th to 31st of month)
    is_month_end_promise = (np.random.rand(n_samples) < 0.28).astype(int)

    # Condition attached (e.g. "pending CFO approval", "after GST credit note")
    cond_prob = np.where(archetype == 1, 0.65, np.where(archetype == 2, 0.45, 0.15))
    has_condition_attached = (np.random.rand(n_samples) < cond_prob).astype(int)

    # 5. Latent Ground Truth Log-Odds Calculation
    # Financial domain weights:
    z = (
        2.8 * (fulfillment_ratio - 0.50)           # Debtor historical track record
        - 0.035 * avg_dbt                           # Past delay penalty
        - 0.22 * (log_invoice_amount - 11.8)        # Large amounts face more internal approval hurdles
        - 0.018 * current_overdue_days              # Highly aged invoices are harder to collect
        - 0.028 * promise_extension_days            # Far-future promises are less reliable
        + 1.35 * has_utr_stated                     # Explicit UTR is a very strong credibility signal
        + 0.15 * is_month_end_promise               # Month-end settlement runs are common in Indian B2B
        - 0.45 * has_condition_attached             # Conditional promises frequently slip
        + np.random.normal(0.0, 0.55, size=n_samples) # Real-world stochastic financial noise
    )

    # Sigmoid function to obtain true probability
    prob_fulfilled = 1.0 / (1.0 + np.exp(-z))
    fulfilled = (np.random.rand(n_samples) < prob_fulfilled).astype(int)

    df = pd.DataFrame({
        "historical_fulfillment_ratio": fulfillment_ratio,
        "historical_avg_dbt": avg_dbt,
        "total_invoices_settled_count": invoices_settled,
        "log_invoice_amount": log_invoice_amount,
        "raw_invoice_amount": invoice_amount,
        "current_overdue_days": current_overdue_days,
        "promise_extension_days": promise_extension_days,
        "has_utr_stated": has_utr_stated,
        "is_month_end_promise": is_month_end_promise,
        "has_condition_attached": has_condition_attached,
        "fulfilled": fulfilled
    })

    return df


if __name__ == "__main__":
    df = generate_ptp_dataset(5000)
    print(f"Generated {len(df)} PTP records. Fulfillment rate: {df['fulfilled'].mean():.2%}")
    print(df.head())
