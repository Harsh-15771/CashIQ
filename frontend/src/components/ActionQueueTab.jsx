import React, { useState } from 'react';
import { CheckCircle2, ShieldAlert, ArrowRight, Lock, Crown, Sparkles } from 'lucide-react';
import { approveAction, rejectAction } from '../api';

const STATUS_STYLES = {
  DISPUTED: { border: '#F59E0B', badge: 'badge-warning' },
  BROKEN_PTP: { border: '#EF4444', badge: 'badge-danger' },
  ESCALATED: { border: '#EF4444', badge: 'badge-danger' },
  SNOOZED: { border: '#6B7280', badge: 'badge-neutral' },
  DEFAULT: { border: '#3B82F6', badge: 'badge-info' },
};

function getStatus(status) {
  return STATUS_STYLES[status] || STATUS_STYLES.DEFAULT;
}

const formatINR = (val) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val || 0);

function formatAction(action) {
  if (!action) return '—';
  return action
    .replace(/^APPROVED_/, 'Approved: ')
    .replace(/^REJECTED_/, 'Rejected: ')
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, c => c.toUpperCase());
}

function renderAuditDetails(entry) {
  let details = entry.details;
  if (!details) return '—';
  if (typeof details === 'string') {
    try {
      details = JSON.parse(details);
    } catch {
      return details;
    }
  }

  // 1. Prompt Injection / Security Event
  if (details.attack_type) {
    return (
      <span className="text-danger font-medium">
        Prompt injection intercepted & quarantined {details.raw_snippet ? `("${details.raw_snippet.slice(0, 35)}…")` : ''}
      </span>
    );
  }

  // 2. High-Value Gate (> ₹2.5L)
  if (details.invoice_amount && details.threshold) {
    return (
      <span className="text-tx-secondary">
        Amount <strong className="text-tx-primary font-mono">₹{Number(details.invoice_amount).toLocaleString('en-IN')}</strong> exceeds ₹{(details.threshold / 100000).toFixed(1)}L SoD limit (CFO approval required)
      </span>
    );
  }

  // 3. UTR Claim Verification
  if (details.utr_number) {
    return (
      <span className="text-tx-secondary">
        Claimed UTR <span className="font-mono text-accent font-semibold">{details.utr_number}</span> routed to Razorpay ledger reconciliation
      </span>
    );
  }

  // 4. Dispute Logged
  if (details.dispute_type) {
    return (
      <span className="text-warning">
        Debtor raised {details.dispute_type.replaceAll('_', ' ')} {details.missing_doc ? `(${details.missing_doc})` : ''} · Dunning paused
      </span>
    );
  }

  // 5. Human Approval
  if (details.approved_by) {
    const roleLabel = details.approved_by.includes('cfo') ? 'Finance Controller (CFO)' : 'Credit Operations Lead';
    return (
      <span className="text-success font-medium">
        {roleLabel} authorized release of ₹{Number(details.amount || 0).toLocaleString('en-IN')}
      </span>
    );
  }

  // 6. Operator Override / Rejection
  if (details.overridden_by) {
    const roleLabel = details.overridden_by.includes('cfo') ? 'CFO' : 'Operator';
    return (
      <span className="text-danger font-medium">
        Manually rejected by {roleLabel} ({details.rejected_action?.replaceAll('_', ' ') || 'Action dismissed'})
      </span>
    );
  }

  // 7. Price Lock Guard
  if (details.locked_settlement_amount) {
    return (
      <span className="text-tx-secondary">
        Settlement locked at <strong className="text-tx-primary font-mono">₹{Number(details.locked_settlement_amount).toLocaleString('en-IN')}</strong> after {((details.validated_tds_percentage || 0) * 100).toFixed(0)}% TDS deduction (Sec 194C)
      </span>
    );
  }

  // 8. Outreach Cooldown
  if (details.cooldown_days && details.days_since_contact !== undefined) {
    return (
      <span className="text-tx-secondary">
        Follow-up paused ({details.days_since_contact}d since last contact; {details.cooldown_days}d policy cooldown)
      </span>
    );
  }

  // 9. Confidence Gating
  if (details.confidence_score !== undefined) {
    return (
      <span className="text-warning">
        LLM confidence {Math.round(details.confidence_score * 100)}% below {Math.round((details.threshold || 0.8) * 100)}% safety gate · Routed to manual review
      </span>
    );
  }

  // Fallback: clean readable key-value pairs
  if (typeof details === 'object') {
    return Object.entries(details)
      .filter(([k]) => k !== 'raw_snippet')
      .map(([k, v]) => `${k.replace(/_/g, ' ')}: ${typeof v === 'number' ? v.toLocaleString('en-IN') : String(v)}`)
      .join(' · ');
  }

  return String(details);
}

export default function ActionQueueTab({ queue, auditTrail, onActionCompleted, onReviewAction, userRole = 'ops' }) {
  const [approvingId, setApprovingId] = useState(null);
  const [filter, setFilter] = useState('ALL');
  const [rejectedIds, setRejectedIds] = useState(new Set());
  const [approvedIds, setApprovedIds] = useState(new Set());

  const handleApprove = async (item) => {
    try {
      setApprovingId(item.invoice_id);
      setApprovedIds(prev => new Set([...prev, item.invoice_id]));
      await approveAction(
        item.invoice_id,
        item.recommended_action,
        userRole === 'cfo' ? 'cfo_controller' : 'credit_ops_lead'
      );
      if (onActionCompleted) {
        onActionCompleted(
          `${item.invoice_id} ${userRole === 'cfo' ? 'authorized by CFO' : 'approved by Operations'} — ${item.recommended_action}`
        );
      }
    } catch (err) {
      setApprovedIds(prev => {
        const next = new Set(prev);
        next.delete(item.invoice_id);
        return next;
      });
      if (onActionCompleted) onActionCompleted(null);
    } finally {
      setApprovingId(null);
    }
  };

  const handleReject = async (item) => {
    setRejectedIds(prev => new Set([...prev, item.invoice_id]));
    try {
      await rejectAction(
        item.invoice_id,
        item.recommended_action,
        userRole === 'cfo' ? 'cfo_controller' : 'credit_ops_lead'
      );
    } catch (e) {
      console.warn('Reject API call optional fallback:', e);
    }
    if (onActionCompleted) {
      onActionCompleted(
        `${item.invoice_id} rejected by ${userRole === 'cfo' ? 'CFO' : 'operator'} — override logged to audit trail`
      );
    }
  };

  const visibleQueue = queue.filter(item => {
    if (rejectedIds.has(item.invoice_id) || approvedIds.has(item.invoice_id)) return false;
    if (filter === 'ALL') return true;
    if (filter === 'DISPUTED') return item.status === 'DISPUTED';
    if (filter === 'ESCALATED') return item.status === 'ESCALATED';
    if (filter === 'HIGH_VALUE') return item.amount >= 250000;
    return true;
  });

  const remainingTotal = queue.filter(item => !rejectedIds.has(item.invoice_id) && !approvedIds.has(item.invoice_id)).length;

  const filterOptions = [
    { id: 'ALL', label: `All (${remainingTotal})` },
    { id: 'DISPUTED', label: 'Disputed' },
    { id: 'ESCALATED', label: 'Escalated' },
    { id: 'HIGH_VALUE', label: '> ₹2.5L Gated' },
  ];

  return (
    <div className="space-y-5">
      {/* ── Role Context Banner ── */}
      {userRole === 'cfo' ? (
        <div className="p-3.5 rounded-xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/25 flex items-center justify-between animate-fade-up">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
              <Crown className="w-3.5 h-3.5 text-amber-400" />
              Executive Controller (CFO) Governance Active
            </span>
            <span className="text-xs text-tx-secondary hidden sm:inline">
              — High-Value Gated Invoices (&gt; ₹2.5L) & legal overrides unlocked for release.
            </span>
          </div>
          <span className="badge badge-warning text-[9px] font-mono">SoD Level 2 Unlocked</span>
        </div>
      ) : (
        <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-accent animate-pulse" />
            <span className="text-xs font-semibold text-tx-primary">AR Operations Desk Active</span>
            <span className="text-xs text-tx-tertiary hidden sm:inline">
              — Standard dunning triage. Invoices above ₹2.5L gated for CFO sign-off.
            </span>
          </div>
          <span className="badge-accent text-[9px] font-mono">Operations Desk</span>
        </div>
      )}

      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="section-heading">Credit Operations Center</h2>
          <p className="section-subheading">Actions requiring human review, approval, or operator override</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Filter Pills */}
          <div className="flex items-center gap-1 bg-white/[0.04] p-1 rounded-lg border border-white/[0.06]">
            {filterOptions.map(opt => (
              <button
                key={opt.id}
                onClick={() => setFilter(opt.id)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
                  filter === opt.id
                    ? 'bg-accent text-white shadow-accent-sm'
                    : 'text-tx-tertiary hover:text-tx-secondary hover:bg-white/[0.04]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <span className={`badge ${visibleQueue.length > 0 ? 'badge-warning' : 'badge-success'}`}>
            {visibleQueue.length > 0 ? `${visibleQueue.length} Pending` : 'Queue Clear'}
          </span>
        </div>
      </div>

      {/* ── Action Cards ── */}
      {visibleQueue.length === 0 ? (
        <div className="card-surface p-12 text-center">
          <CheckCircle2 className="w-8 h-8 text-success mx-auto mb-3" />
          <p className="text-base font-semibold text-tx-primary">Queue clear — CashIQ is running autonomously</p>
          <p className="text-sm text-tx-tertiary mt-1">No invoices in this view require manual intervention</p>
        </div>
      ) : (
        <div className="space-y-3">
          {visibleQueue.map((item) => {
            const st = getStatus(item.status);
            return (
              <div
                key={item.invoice_id}
                className="card-surface p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 group"
                style={{ borderLeft: `3px solid ${st.border}` }}
              >
                {/* Left: Invoice info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1.5">
                    <span className="text-sm font-mono font-bold text-tx-primary">{item.invoice_id}</span>
                    <span className={`badge text-[10px] ${st.badge}`}>{item.status}</span>
                    {item.amount >= 250000 && (
                      <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${
                        userRole === 'cfo'
                          ? 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                          : 'bg-white/[0.04] text-tx-tertiary border-white/[0.06]'
                      }`}>
                        {userRole === 'cfo' ? 'CFO Unlocked' : 'CFO Gated'}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-tx-primary font-medium">{item.debtor_name}</p>
                  <p className="text-[13px] text-tx-tertiary mt-1 line-clamp-1">{item.reason}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="provenance-synthetic text-[9px]">Synthetic</span>
                    <span className="provenance-llm text-[9px]">LLM-Extracted</span>
                  </div>
                </div>

                {/* Right: Amount + Actions */}
                <div className="flex items-center gap-3 sm:gap-5 flex-shrink-0 flex-wrap">
                  <span className="text-lg sm:text-xl font-bold font-mono text-tx-primary">{formatINR(item.amount)}</span>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => onReviewAction?.(item)} className="btn-outline text-xs py-1.5 px-3 min-h-[36px]">
                      Details
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReject(item)}
                      className="px-3 py-1.5 rounded-lg border border-danger/30 text-danger hover:bg-danger/10 text-xs font-semibold transition-colors min-h-[36px]"
                    >
                      Reject
                    </button>
                    {item.amount >= 250000 && userRole === 'ops' ? (
                      <button
                        type="button"
                        disabled={true}
                        title="Policy Gate: Invoices ≥ ₹2.5L require Finance Controller / CFO authorization."
                        className="px-3 py-1.5 rounded-lg border border-white/[0.08] bg-white/[0.02] text-tx-tertiary text-xs font-medium flex items-center gap-1.5 cursor-not-allowed opacity-60 min-h-[36px]"
                      >
                        <Lock className="w-3 h-3 text-tx-tertiary" />
                        <span>Locked (CFO)</span>
                      </button>
                    ) : item.amount >= 250000 && userRole === 'cfo' ? (
                      <button
                        type="button"
                        onClick={() => handleApprove(item)}
                        disabled={approvingId === item.invoice_id}
                        className="btn-primary text-xs py-2 px-3.5 flex items-center gap-1.5 min-h-[36px]"
                      >
                        <Crown className="w-3 h-3 text-amber-300" />
                        <span>{approvingId === item.invoice_id ? 'Authorizing…' : 'Authorize'}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <button
                        onClick={() => handleApprove(item)}
                        disabled={approvingId === item.invoice_id}
                        className="btn-primary text-xs py-2 px-4 flex items-center gap-1.5 min-h-[36px]"
                      >
                        <span>{approvingId === item.invoice_id ? 'Confirming…' : 'Approve'}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Audit Trail ── */}
      <div className="card-surface overflow-hidden">
        <div className="px-5 py-3.5 border-b border-white/[0.04] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-success" />
            <h3 className="text-sm font-semibold text-tx-primary">Guardrail Audit Log</h3>
          </div>
          <span className="text-[10px] font-mono text-tx-tertiary">Last 50 events</span>
        </div>

        <div className="overflow-x-auto max-h-72 overflow-y-auto">
          <table className="w-full text-left text-[12px]">
            <thead className="sticky top-0" style={{ backgroundColor: '#0D0D14' }}>
              <tr className="border-b border-white/[0.04]">
                <th className="py-2 px-5 text-[10px] font-semibold uppercase tracking-[0.06em] text-tx-tertiary">Time</th>
                <th className="py-2 px-4 text-[10px] font-semibold uppercase tracking-[0.06em] text-tx-tertiary">Invoice</th>
                <th className="py-2 px-4 text-[10px] font-semibold uppercase tracking-[0.06em] text-tx-tertiary">Guardrail</th>
                <th className="py-2 px-4 text-[10px] font-semibold uppercase tracking-[0.06em] text-tx-tertiary">Action</th>
                <th className="py-2 px-4 text-[10px] font-semibold uppercase tracking-[0.06em] text-tx-tertiary">Details</th>
              </tr>
            </thead>
            <tbody className="text-xs">
              {auditTrail.map((entry, idx) => (
                <tr
                  key={idx}
                  className={`border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors`}
                  style={entry.security_event ? { borderLeft: '3px solid #EF4444', backgroundColor: 'rgba(239,68,68,0.04)' } : {}}
                >
                  <td className="py-2.5 px-5 text-tx-tertiary whitespace-nowrap font-mono">{new Date(entry.timestamp).toLocaleTimeString()}</td>
                  <td className="py-2.5 px-4 text-accent font-bold font-mono">{entry.invoice_id || 'SYSTEM'}</td>
                  <td className="py-2.5 px-4 whitespace-nowrap">
                    <span className={`badge text-[10px] ${entry.security_event ? 'badge-danger'
                        : entry.guardrail_name === 'PRICE_LOCK_GUARD' ? 'badge-success'
                          : 'badge-neutral'
                      }`}>
                      {entry.guardrail_name?.replaceAll('_', ' ')}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-tx-primary font-medium whitespace-nowrap">{formatAction(entry.action_taken)}</td>
                  <td
                    className="py-2.5 px-4 text-tx-secondary text-xs leading-relaxed max-w-md"
                    title={typeof entry.details === 'object' ? JSON.stringify(entry.details, null, 2) : String(entry.details)}
                  >
                    {renderAuditDetails(entry)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
