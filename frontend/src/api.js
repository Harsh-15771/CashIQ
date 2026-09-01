const rawApiUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE || 'http://localhost:8000';
const API_BASE = rawApiUrl.endsWith('/api') ? rawApiUrl : `${rawApiUrl.replace(/\/$/, '')}/api`;

// ============================================================================
// Core Invoices & Overview
// ============================================================================

export async function fetchInvoices(status = null) {
  const url = status ? `${API_BASE}/invoices?status=${status}` : `${API_BASE}/invoices`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch invoices');
  return res.json();
}

export async function fetchOverviewStats() {
  const res = await fetch(`${API_BASE}/stats/overview`);
  if (!res.ok) throw new Error('Failed to fetch overview stats');
  return res.json();
}

export async function fetchDebtors() {
  const res = await fetch(`${API_BASE}/debtors`);
  if (!res.ok) throw new Error('Failed to fetch debtors');
  return res.json();
}

export async function fetchActionQueue() {
  const res = await fetch(`${API_BASE}/actions/queue`);
  if (!res.ok) throw new Error('Failed to fetch action queue');
  return res.json();
}

export async function approveAction(invoiceId, approvedAction, notes = '') {
  const res = await fetch(`${API_BASE}/actions/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      invoice_id: invoiceId,
      approved_action: approvedAction,
      approved_by: 'credit_ops_lead',
      notes,
    }),
  });
  if (!res.ok) throw new Error('Failed to approve action');
  return res.json();
}

export async function fetchAuditTrail(limit = 50) {
  const res = await fetch(`${API_BASE}/actions/audit-trail?limit=${limit}`);
  if (!res.ok) throw new Error('Failed to fetch audit trail');
  return res.json();
}

export async function fetch30DayForecast() {
  const res = await fetch(`${API_BASE}/forecast/30-day`);
  if (!res.ok) throw new Error('Failed to fetch 30-day forecast');
  return res.json();
}

// ============================================================================
// Level 5 Decision Intelligence & Labs
// ============================================================================

export async function fetchReceivablesDecomposition() {
  const res = await fetch(`${API_BASE}/receivables/decomposition`);
  if (!res.ok) throw new Error('Failed to fetch receivables decomposition');
  return res.json();
}

export async function fetchDebtorTwins() {
  const res = await fetch(`${API_BASE}/debtors/twins`);
  if (!res.ok) throw new Error('Failed to fetch debtor twins');
  return res.json();
}

export async function fetchDebtorTwin(debtorId) {
  const res = await fetch(`${API_BASE}/debtors/${debtorId}/twin`);
  if (!res.ok) throw new Error('Failed to fetch debtor twin');
  return res.json();
}

export async function evaluateDecision(payload) {
  const res = await fetch(`${API_BASE}/decisions/evaluate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to evaluate decision');
  return res.json();
}

export async function replayDecision(decisionId) {
  const res = await fetch(`${API_BASE}/decisions/replay/${decisionId}`);
  if (!res.ok) throw new Error('Failed to replay decision');
  return res.json();
}

export async function runExperiment() {
  const res = await fetch(`${API_BASE}/experiments/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error('Failed to run experiment');
  return res.json();
}

export async function analyzeShortPayment(payload) {
  const res = await fetch(`${API_BASE}/tax/short-payment-analysis`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to analyze short payment');
  return res.json();
}
