import React, { useState } from 'react';
import { CheckCircle2, ShieldAlert, ArrowRight, ShieldCheck, Zap, AlertTriangle, ExternalLink, CheckCheck } from 'lucide-react';
import { approveAction } from '../api';

const STATUS_STYLES = {
  DISPUTED:   { border: '#F59E0B', badge: 'badge-warning' },
  BROKEN_PTP: { border: '#EF4444', badge: 'badge-danger' },
  ESCALATED:  { border: '#EF4444', badge: 'badge-danger' },
  SNOOZED:    { border: '#6B7280', badge: 'badge-neutral' },
  DEFAULT:    { border: '#3B82F6', badge: 'badge-info' },
};

function getStatus(status) {
  return STATUS_STYLES[status] || STATUS_STYLES.DEFAULT;
}

const formatINR = (val) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val || 0);

export default function ActionQueueTab({ queue = [], auditTrail = [], onActionCompleted, onInspectInvoice }) {
  const [approvingId, setApprovingId] = useState(null);
  const [isApprovingAll, setIsApprovingAll] = useState(false);

  const handleApprove = async (item) => {
    try {
      setApprovingId(item.invoice_id);
      await approveAction(item.invoice_id, item.recommended_action);
      if (onActionCompleted) onActionCompleted(`${item.invoice_id} approved — ${item.recommended_action}`);
    } catch (err) {
      if (onActionCompleted) onActionCompleted(null);
    } finally {
      setApprovingId(null);
    }
  };

  const handleApproveAll = async () => {
    if (queue.length === 0) return;
    setIsApprovingAll(true);
    try {
      for (const item of queue) {
        await approveAction(item.invoice_id, item.recommended_action);
      }
      if (onActionCompleted) onActionCompleted(`All ${queue.length} pending actions approved`);
    } catch (err) {
      console.error(err);
    } finally {
      setIsApprovingAll(false);
    }
  };

  const highValueCount = queue.filter(q => q.amount >= 250000).length;

  return (
    <div className="space-y-6 animate-fade-up">

      {/* ── Control Center Header ── */}
      <div className="card-surface p-4 rounded-xl border border-white/[0.06] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-tx-primary flex items-center gap-2">
              Autonomous Action Queue & Guardrail Triage
              <span className="badge-accent text-[9px]">{queue.length} Pending Review</span>
            </h2>
            <p className="text-xs text-tx-tertiary">
              Deterministic state machine gates high-risk and high-value actions for human sign-off while executing low-risk workflows automatically.
            </p>
          </div>
        </div>

        {queue.length > 0 && (
          <button
            onClick={handleApproveAll}
            disabled={isApprovingAll}
            className="btn-primary text-xs py-2 px-4 flex items-center gap-1.5 flex-shrink-0"
          >
            <CheckCheck className="w-4 h-4" />
            <span>{isApprovingAll ? 'Approving All…' : `Approve All (${queue.length})`}</span>
          </button>
        )}
      </div>

      {/* ── Queue Cards ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-tx-tertiary">
            Pending Action Items
          </h3>
          <div className="flex items-center gap-2 text-xs">
            {highValueCount > 0 && (
              <span className="badge-warning text-[10px]">{highValueCount} Gated (> ₹2.5L)</span>
            )}
            <span className="text-tx-tertiary font-mono">{queue.length} items in queue</span>
          </div>
        </div>

        {queue.length === 0 ? (
          <div className="card-surface p-12 text-center rounded-xl border border-white/[0.06] space-y-2">
            <CheckCircle2 className="w-8 h-8 text-success mx-auto mb-2" />
            <p className="text-sm font-bold text-tx-primary">Queue is clear — CashIQ running autonomously</p>
            <p className="text-xs text-tx-tertiary">No invoices require human credit ops approval at this moment.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {queue.map((item) => {
              const st = getStatus(item.status);
              return (
                <div
                  key={item.invoice_id}
                  className="card-surface p-4 sm:p-5 rounded-xl border border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-4 group hover:border-white/10 transition-all"
                  style={{ borderLeft: `3px solid ${st.border}` }}
                >
                  {/* Left: Invoice info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
                      <span className="text-xs font-mono font-bold text-tx-primary">{item.invoice_id}</span>
                      <span className={`badge text-[10px] ${st.badge}`}>{item.status}</span>
                      {item.amount >= 250000 && (
                        <span className="badge-warning text-[9px] font-bold">&gt; ₹2.5L Policy Gate</span>
                      )}
                    </div>
                    <p className="text-xs font-semibold text-tx-primary">{item.debtor_name}</p>
                    <p className="text-xs text-tx-tertiary mt-1 line-clamp-1">{item.reason}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="provenance-deterministic text-[9px]">Gated by Policy Engine</span>
                      <span className="provenance-deterministic text-[9px]">Recommended: {item.recommended_action}</span>
                    </div>
                  </div>

                  {/* Right: Amount + Actions */}
                  <div className="flex items-center gap-3 sm:gap-5 flex-shrink-0 flex-wrap justify-between sm:justify-end">
                    <div className="text-left sm:text-right">
                      <span className="text-base sm:text-lg font-bold font-mono text-tx-primary block">{formatINR(item.amount)}</span>
                      <span className="text-[10px] text-tx-tertiary">Pending Decision</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onInspectInvoice && onInspectInvoice({ invoice: { invoice_id: item.invoice_id, amount: item.amount, status: item.status }, debtor: { company_name: item.debtor_name } })}
                        className="btn-outline text-xs py-2 px-3"
                      >
                        Inspect
                      </button>
                      <button
                        onClick={() => handleApprove(item)}
                        disabled={approvingId === item.invoice_id}
                        className="btn-primary text-xs py-2 px-4 flex items-center gap-1.5"
                      >
                        <span>{approvingId === item.invoice_id ? 'Confirming…' : 'Approve Action'}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Guardrail Audit Log ── */}
      <div className="card-surface rounded-xl border border-white/[0.06] overflow-hidden">
        <div className="px-5 py-3.5 border-b border-white/[0.04] flex items-center justify-between bg-[#0D0D14]">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-success" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-tx-primary">Live Guardrail Audit Stream</h3>
          </div>
          <span className="text-[10px] font-mono text-tx-tertiary">Last 50 Immutable Events</span>
        </div>

        <div className="overflow-x-auto max-h-72 overflow-y-auto">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-[#050508]/90 backdrop-blur-md">
              <tr className="border-b border-white/[0.04]">
                <th className="py-2.5 px-4 text-[10px] font-bold uppercase tracking-wider text-tx-tertiary">Time</th>
                <th className="py-2.5 px-4 text-[10px] font-bold uppercase tracking-wider text-tx-tertiary">Invoice</th>
                <th className="py-2.5 px-4 text-[10px] font-bold uppercase tracking-wider text-tx-tertiary">Guardrail Rule</th>
                <th className="py-2.5 px-4 text-[10px] font-bold uppercase tracking-wider text-tx-tertiary">Action Taken</th>
                <th className="py-2.5 px-4 text-[10px] font-bold uppercase tracking-wider text-tx-tertiary">Details</th>
              </tr>
            </thead>
            <tbody className="font-mono text-[11px]">
              {auditTrail.map((entry, idx) => (
                <tr
                  key={idx}
                  className="border-b border-white/[0.02] hover:bg-white/[0.02] transition-colors"
                  style={entry.security_event ? { borderLeft: '3px solid #EF4444', backgroundColor: 'rgba(239,68,68,0.04)' } : {}}
                >
                  <td className="py-2 px-4 text-tx-tertiary">{new Date(entry.timestamp).toLocaleTimeString()}</td>
                  <td className="py-2 px-4 text-accent font-bold">{entry.invoice_id || 'SYSTEM'}</td>
                  <td className="py-2 px-4">
                    <span className={`badge text-[9px] ${
                      entry.security_event ? 'badge-danger'
                        : entry.guardrail_name === 'PRICE_LOCK_GUARD' ? 'badge-success'
                        : 'badge-neutral'
                    }`}>
                      {entry.guardrail_name}
                    </span>
                  </td>
                  <td className="py-2 px-4 text-tx-primary font-medium">{entry.action_taken}</td>
                  <td className="py-2 px-4 text-tx-tertiary max-w-xs truncate">
                    {typeof entry.details === 'object' ? JSON.stringify(entry.details) : entry.details}
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
