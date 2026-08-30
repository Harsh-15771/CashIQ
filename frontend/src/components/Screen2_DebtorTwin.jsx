import React, { useState, useEffect } from 'react';
import { Users } from 'lucide-react';

function getScoreColor(score) {
  if (score >= 80) return { text: 'text-success', bg: 'bg-success', bar: '#10B981' };
  if (score >= 50) return { text: 'text-warning', bg: 'bg-warning', bar: '#F59E0B' };
  return { text: 'text-danger', bg: 'bg-danger', bar: '#EF4444' };
}

const EVENT_COLORS = {
  PAID:           { dot: '#10B981', badge: 'badge-success' },
  PROMISE_KEPT:   { dot: '#3B82F6', badge: 'badge-info' },
  ACTIVE_PROMISE: { dot: '#6366F1', badge: 'badge-accent' },
  DISPUTED:       { dot: '#F59E0B', badge: 'badge-warning' },
  PROMISE_BROKEN: { dot: '#EF4444', badge: 'badge-danger' },
  DEFAULT:        { dot: '#4B5563', badge: 'badge-neutral' },
};

export default function Screen2_DebtorTwin({ twins, onSelectDebtorForDemo }) {
  const [selectedTwin, setSelectedTwin] = useState(null);

  useEffect(() => {
    if (twins && twins.length > 0 && !selectedTwin) setSelectedTwin(twins[0]);
  }, [twins]);

  if (!twins || twins.length === 0) {
    return (
      <div className="card-surface p-12 text-center">
        <Users className="w-8 h-8 text-accent/40 mx-auto mb-3" />
        <p className="text-tx-secondary">Loading Debtor Digital Twins…</p>
      </div>
    );
  }

  const activeTwin = selectedTwin || twins[0];
  const scoreColor = getScoreColor(activeTwin.promise_credibility_score);

  return (
    <div className="flex gap-5 items-start" style={{ minHeight: 'calc(100vh - 340px)' }}>

      {/* ════════════ LEFT PANEL — Debtor List ════════════ */}
      <div className="w-[300px] flex-shrink-0 space-y-1.5 sticky top-[100px]">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold uppercase tracking-[0.06em] text-tx-tertiary">Debtors</h3>
          <span className="text-[10px] font-mono text-tx-tertiary">{twins.length} total</span>
        </div>

        {twins.map((twin) => {
          const isSelected = activeTwin?.debtor_id === twin.debtor_id;
          const sc = getScoreColor(twin.promise_credibility_score);

          return (
            <button
              key={twin.debtor_id}
              onClick={() => setSelectedTwin(twin)}
              className={`w-full text-left p-3.5 rounded-[10px] transition-all duration-150 ${
                isSelected
                  ? 'card-glow'
                  : 'card-surface hover:border-white/10'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold text-tx-primary truncate pr-2">{twin.company_name}</h4>
              </div>

              <p className="text-xs text-tx-tertiary mb-3 font-mono">
                ₹{(twin.total_outstanding_inr || 0).toLocaleString('en-IN')} outstanding
              </p>

              {/* PTP Health Bar */}
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${twin.promise_credibility_score}%`,
                      backgroundColor: sc.bar,
                    }}
                  />
                </div>
                <span className={`text-[11px] font-mono font-bold ${sc.text}`}>
                  {twin.promise_credibility_score}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* ════════════ RIGHT PANEL — Detail View ════════════ */}
      <div className="flex-1 min-w-0 space-y-4 animate-fade-up" key={activeTwin.debtor_id}>

        {/* Header */}
        <div className="card-surface p-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold text-tx-primary tracking-tight">{activeTwin.company_name}</h2>
              <p className="text-sm text-tx-tertiary mt-1">
                <span className="font-mono text-tx-secondary">{activeTwin.gstin || 'No GSTIN'}</span>
                <span className="mx-2 text-surface-border">·</span>
                {activeTwin.relationship_age_years} year relationship
                <span className="mx-2 text-surface-border">·</span>
                <span className="font-mono text-tx-secondary">{activeTwin.debtor_id}</span>
              </p>
            </div>

            {/* Score Hero */}
            <div className="text-right flex-shrink-0 ml-4">
              <p className="text-[10px] text-tx-tertiary uppercase tracking-wider mb-1">Promise Credibility</p>
              <div className={`text-3xl font-extrabold font-mono ${scoreColor.text}`}>
                {activeTwin.promise_credibility_score}
                <span className="text-lg text-tx-tertiary font-normal">/100</span>
              </div>
              <p className="text-[10px] text-tx-tertiary mt-1">
                Laplace(45%) + DBT(25%) + Age(15%) + Dispute(15%)
              </p>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-3 gap-3 mt-5 pt-4 border-t border-white/[0.04]">
            <div>
              <p className="text-[10px] text-tx-tertiary uppercase tracking-wider mb-0.5">Promises Kept</p>
              <p className="text-lg font-bold font-mono text-tx-primary">
                {activeTwin.promises_kept}/{activeTwin.total_promises}
                <span className="text-sm text-tx-secondary font-normal ml-1">
                  ({(activeTwin.laplace_fulfillment_ratio * 100).toFixed(0)}%)
                </span>
              </p>
            </div>
            <div>
              <p className="text-[10px] text-tx-tertiary uppercase tracking-wider mb-0.5">Avg Delay</p>
              <p className="text-lg font-bold font-mono text-tx-primary">
                +{activeTwin.average_dbt_days.toFixed(1)}<span className="text-sm text-tx-secondary font-normal">d DBT</span>
              </p>
            </div>
            <div>
              <p className="text-[10px] text-tx-tertiary uppercase tracking-wider mb-0.5">Outstanding</p>
              <p className="text-lg font-bold font-mono text-tx-primary">
                ₹{(activeTwin.total_outstanding_inr || 0).toLocaleString('en-IN')}
              </p>
            </div>
          </div>
        </div>

        {/* ── Decision Diff ("What Changed?") ── */}
        {activeTwin.decision_diff && (
          <div className="card-surface overflow-hidden" style={{ borderLeft: '3px solid #6366F1' }}>
            <div className="p-5">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-tx-primary flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-accent animate-pulse-dot" />
                  What Changed?
                </h4>
                <span className={`badge text-[10px] ${
                  activeTwin.decision_diff.credibility_delta > 0 ? 'badge-success' : 'badge-danger'
                }`}>
                  Δ PTP: {activeTwin.decision_diff.credibility_delta > 0 ? '+' : ''}{activeTwin.decision_diff.credibility_delta}
                </span>
              </div>

              {/* Timeline mini */}
              <div className="flex items-center gap-4">
                <div className="flex-1 p-3 rounded-lg" style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}>
                  <p className="text-[10px] text-tx-tertiary">{activeTwin.decision_diff.previous_date}</p>
                  <p className="text-sm font-semibold text-tx-secondary font-mono">{activeTwin.decision_diff.previous_decision}</p>
                </div>
                <div className="text-tx-tertiary text-lg">→</div>
                <div className="flex-1 p-3 rounded-lg" style={{ backgroundColor: 'rgba(99,102,241,0.06)' }}>
                  <p className="text-[10px] text-accent">{activeTwin.decision_diff.current_date}</p>
                  <p className="text-sm font-semibold text-success font-mono">{activeTwin.decision_diff.current_decision}</p>
                </div>
              </div>

              <p className="text-[13px] text-tx-secondary mt-3 leading-relaxed">
                {activeTwin.decision_diff.reason_for_diff}
              </p>
            </div>
          </div>
        )}

        {/* ── Timeline ── */}
        <div className="card-surface p-5">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-semibold text-tx-primary">Payment & Commitment Timeline</h4>
            <span className="provenance-synthetic text-[9px]">Synthetic Seeded</span>
          </div>

          {activeTwin.timeline && activeTwin.timeline.length > 0 ? (
            <div className="relative ml-3 space-y-0">
              {/* Vertical line */}
              <div className="absolute left-0 top-2 bottom-2 w-px" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }} />

              {activeTwin.timeline.map((ev, idx) => {
                const evColor = EVENT_COLORS[ev.event_type] || EVENT_COLORS.DEFAULT;
                return (
                  <div key={idx} className="relative pl-7 py-2.5 group">
                    {/* Dot */}
                    <div
                      className="absolute left-[-4px] top-4 w-2 h-2 rounded-full border-2"
                      style={{ backgroundColor: evColor.dot, borderColor: evColor.dot }}
                    />

                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[12px] font-mono text-tx-secondary">{ev.date}</span>
                          <span className={`badge text-[9px] ${evColor.badge}`}>{ev.event_type}</span>
                          <span className="text-[11px] text-tx-tertiary">{ev.invoice_id}</span>
                        </div>
                        <p className="text-[13px] text-tx-tertiary mt-0.5">{ev.note}</p>
                      </div>
                      <span className="text-[12px] font-mono font-medium text-tx-secondary flex-shrink-0 ml-3">
                        ₹{ev.amount_inr.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-tx-tertiary text-center py-6">No historical timeline records available</p>
          )}
        </div>
      </div>
    </div>
  );
}
