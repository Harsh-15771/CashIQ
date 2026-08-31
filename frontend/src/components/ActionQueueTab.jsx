import React, { useState } from 'react';
import { CheckCircle2, ShieldAlert, ArrowRight } from 'lucide-react';
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

export default function ActionQueueTab({ queue, auditTrail, onActionCompleted }) {
  const [approvingId, setApprovingId] = useState(null);

  const handleApprove = async (item) => {
    try {
      setApprovingId(item.invoice_id);
      await approveAction(item.invoice_id, item.recommended_action);
      if (onActionCompleted) onActionCompleted(`${item.invoice_id} approved — ${item.recommended_action}`);
    } catch (err) {
      if (onActionCompleted) onActionCompleted(null); // will just say 'Action approved'
    } finally {
      setApprovingId(null);
    }
  };

  return (
    <div className="space-y-5">
      {/* ── Page Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="section-heading">Credit Operations Center</h2>
          <p className="section-subheading">Actions requiring human review or override</p>
        </div>
        <span className={`badge ${queue.length > 0 ? 'badge-warning' : 'badge-success'}`}>
          {queue.length > 0 ? `${queue.length} Pending` : 'Queue Clear'}
        </span>
      </div>

      {/* ── Action Cards ── */}
      {queue.length === 0 ? (
        <div className="card-surface p-12 text-center">
          <CheckCircle2 className="w-8 h-8 text-success mx-auto mb-3" />
          <p className="text-base font-semibold text-tx-primary">Queue clear — CashIQ is running autonomously</p>
          <p className="text-sm text-tx-tertiary mt-1">No invoices require manual intervention</p>
        </div>
      ) : (
        <div className="space-y-3">
          {queue.map((item) => {
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
                      <span className="badge badge-warning text-[9px]">&gt; ₹2.5L Gated</span>
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
                    <button className="btn-outline text-xs py-1.5 px-3 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity min-h-[36px]">
                      Details
                    </button>
                    <button
                      onClick={() => handleApprove(item)}
                      disabled={approvingId === item.invoice_id}
                      className="btn-primary text-xs py-2 px-4 flex items-center gap-1.5 min-h-[36px]"
                    >
                      <span>{approvingId === item.invoice_id ? 'Confirming…' : 'Approve'}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
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
            <tbody className="font-mono">
              {auditTrail.map((entry, idx) => (
                <tr
                  key={idx}
                  className={`border-b border-white/[0.02] hover:bg-white/[0.02] transition-colors ${
                    entry.security_event ? '' : ''
                  }`}
                  style={entry.security_event ? { borderLeft: '3px solid #EF4444', backgroundColor: 'rgba(239,68,68,0.04)' } : {}}
                >
                  <td className="py-2 px-5 text-tx-tertiary">{new Date(entry.timestamp).toLocaleTimeString()}</td>
                  <td className="py-2 px-4 text-accent font-bold">{entry.invoice_id || 'SYSTEM'}</td>
                  <td className="py-2 px-4">
                    <span className={`badge text-[10px] ${
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
