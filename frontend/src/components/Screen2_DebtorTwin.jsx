import React, { useState, useEffect } from 'react';
import { Users, ArrowLeft, Zap } from 'lucide-react';

function getScoreColor(score) {
  if (score >= 80) return { text: 'text-success', bg: 'bg-success', bar: '#10B981' };
  if (score >= 50) return { text: 'text-warning', bg: 'bg-warning', bar: '#F59E0B' };
  return { text: 'text-danger', bg: 'bg-danger', bar: '#EF4444' };
}

const EVENT_COLORS = {
  PAID: { dot: '#10B981', badge: 'badge-success' },
  PROMISE_KEPT: { dot: '#3B82F6', badge: 'badge-info' },
  ACTIVE_PROMISE: { dot: '#6366F1', badge: 'badge-accent' },
  DISPUTED: { dot: '#F59E0B', badge: 'badge-warning' },
  PROMISE_BROKEN: { dot: '#EF4444', badge: 'badge-danger' },
  DEFAULT: { dot: '#4B5563', badge: 'badge-neutral' },
};

export default function Screen2_DebtorTwin({ twins, onSelectDebtorForDemo }) {
  const [selectedTwin, setSelectedTwin] = useState(null);
  // On mobile: false = show list, true = show detail
  const [showDetail, setShowDetail] = useState(false);

  useEffect(() => {
    if (twins && twins.length > 0 && !selectedTwin) setSelectedTwin(twins[0]);
  }, [twins]);

  const handleSelectTwin = (twin) => {
    setSelectedTwin(twin);
    setShowDetail(true); // On mobile, switch to detail view
  };

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
    <div className="flex flex-col lg:flex-row gap-5 items-start" style={{ minHeight: 'calc(100vh - 340px)' }}>

      {/* ════════════ LEFT PANEL — Debtor List ════════════ */}
      <div className={`w-full lg:w-[300px] flex-shrink-0 space-y-1.5 lg:sticky lg:top-[100px] ${showDetail ? 'hidden lg:block' : ''}`}>
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
              onClick={() => handleSelectTwin(twin)}
              className={`w-full text-left p-3.5 rounded-[10px] transition-all duration-150 min-h-[48px] ${isSelected
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
      <div className={`flex-1 min-w-0 space-y-4 animate-fade-up ${showDetail ? '' : 'hidden lg:block'}`} key={activeTwin.debtor_id}>

        {/* Mobile Back Button */}
        <button
          onClick={() => setShowDetail(false)}
          className="lg:hidden flex items-center gap-2 text-sm text-tx-secondary hover:text-tx-primary transition-colors mb-2 min-h-[44px]"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to debtors
        </button>

        {/* Header */}
        <div className="card-surface p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-tx-primary tracking-tight">{activeTwin.company_name}</h2>
              <p className="text-xs sm:text-sm text-tx-tertiary mt-1 flex flex-wrap gap-x-2">
                <span className="font-mono text-tx-secondary">{activeTwin.gstin || 'No GSTIN'}</span>
                <span className="text-surface-border hidden sm:inline">·</span>
                <span>{activeTwin.relationship_age_years} year relationship</span>
                <span className="text-surface-border hidden sm:inline">·</span>
                <span className="font-mono text-tx-secondary">{activeTwin.debtor_id}</span>
              </p>
              <button
                type="button"
                onClick={() => onSelectDebtorForDemo?.(activeTwin.debtor_id)}
                className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5 mt-3 shadow-accent-sm"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Test with Decision Engine →</span>
              </button>
            </div>

            {/* Score Hero */}
            <div className="sm:text-right flex-shrink-0">
              <p className="text-[10px] text-tx-tertiary uppercase tracking-wider mb-1">Promise Credibility</p>
              <div className={`text-2xl sm:text-3xl font-extrabold font-mono ${scoreColor.text}`}>
                {activeTwin.promise_credibility_score}
                <span className="text-lg text-tx-tertiary font-normal">/100</span>
              </div>
              <p className="text-[10px] text-tx-tertiary mt-1">
                Laplace(45%) + DBT(25%) + Age(15%) + Dispute(15%)
              </p>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-white/[0.04]">
            <div>
              <p className="text-[10px] text-tx-tertiary uppercase tracking-wider mb-0.5">Promises Kept</p>
              <p className="text-lg font-bold font-mono text-tx-primary">
                {activeTwin.promises_kept}/{activeTwin.total_promises}
                <span className="text-xs text-tx-secondary font-normal ml-1">
                  ({(activeTwin.laplace_fulfillment_ratio * 100).toFixed(0)}%)
                </span>
              </p>
            </div>
            <div>
              <p className="text-[10px] text-tx-tertiary uppercase tracking-wider mb-0.5">Avg Delay</p>
              <p className="text-lg font-bold font-mono text-tx-primary">
                +{activeTwin.average_dbt_days.toFixed(1)}<span className="text-xs text-tx-secondary font-normal">d DBT</span>
              </p>
            </div>
            <div>
              <p className="text-[10px] text-tx-tertiary uppercase tracking-wider mb-0.5">Outstanding</p>
              <p className="text-lg font-bold font-mono text-tx-primary">
                ₹{(activeTwin.total_outstanding_inr || 0).toLocaleString('en-IN')}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-tx-tertiary uppercase tracking-wider mb-0.5">Pressure Tolerance</p>
              <p className={`text-lg font-bold font-mono ${activeTwin.contact_count_current_cycle <= 1 ? 'text-success' : activeTwin.contact_count_current_cycle <= 2 ? 'text-warning' : 'text-danger'}`}>
                {activeTwin.contact_count_current_cycle <= 1 ? 'High' : activeTwin.contact_count_current_cycle <= 2 ? 'Medium' : 'Low'}
                <span className="text-xs text-tx-tertiary font-normal ml-1">
                  ({activeTwin.contact_count_current_cycle || 1}/3 contacts)
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* ── Pressure & Fatigue Tolerance Card ── */}
        <div className="card-surface p-4 sm:p-5 rounded-xl border border-white/[0.06] space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${
                activeTwin.contact_count_current_cycle <= 1 ? 'bg-success' : activeTwin.contact_count_current_cycle <= 2 ? 'bg-warning' : 'bg-danger'
              }`} />
              <h4 className="text-xs font-bold uppercase tracking-wider text-tx-primary">
                Relationship Fatigue Guard
              </h4>
            </div>
            <span className={`badge text-[10px] font-semibold ${
              activeTwin.contact_count_current_cycle <= 1 ? 'badge-success' : activeTwin.contact_count_current_cycle <= 2 ? 'badge-warning' : 'badge-danger'
            }`}>
              {activeTwin.contact_count_current_cycle <= 1
                ? 'Standard Outreach Permitted'
                : activeTwin.contact_count_current_cycle <= 2
                ? 'Pause Outreach Today'
                : 'Outreach Locked by Policy'}
            </span>
          </div>

          <div className="p-3 bg-black/40 rounded-xl border border-white/[0.04]">
            <p className="text-xs font-medium text-tx-secondary leading-relaxed">
              {activeTwin.contact_count_current_cycle <= 1
                ? 'Standard outreach permitted. Low contact friction this cycle; reminders will not risk relationship goodwill.'
                : activeTwin.contact_count_current_cycle === 2
                ? 'Outreach paused today. An additional reminder is predicted to lower recovery probability and cause counterparty fatigue.'
                : 'Automated outreach locked. Contact limit reached; routed to account manager for personal follow-up.'}
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs pt-1">
            <span className="text-tx-tertiary text-[11px]">Weekly Fatigue Load:</span>
            <div className="flex-1 h-1.5 bg-white/[0.06] rounded-full overflow-hidden max-w-xs">
              <div
                className={`h-full rounded-full ${
                  activeTwin.contact_count_current_cycle <= 1 ? 'bg-success' : activeTwin.contact_count_current_cycle <= 2 ? 'bg-warning' : 'bg-danger'
                }`}
                style={{ width: `${Math.min(100, ((activeTwin.contact_count_current_cycle || 1) / 3) * 100)}%` }}
              />
            </div>
            <span className="font-mono text-[11px] text-tx-secondary">
              {Math.round(((activeTwin.contact_count_current_cycle || 1) / 3) * 100)}% ({activeTwin.contact_count_current_cycle || 1}/3 touches)
            </span>
          </div>
        </div>

        {/* ── Decision Diff ("What Changed?") ── */}
        {activeTwin.decision_diff && (
          <div className="card-surface overflow-hidden" style={{ borderLeft: '3px solid #6366F1' }}>
            <div className="p-4 sm:p-5">
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <h4 className="text-sm font-semibold text-tx-primary flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-accent animate-pulse-dot" />
                  What Changed?
                </h4>
                <span className={`badge text-[10px] ${activeTwin.decision_diff.credibility_delta > 0 ? 'badge-success' : 'badge-danger'
                  }`}>
                  Δ PTP: {activeTwin.decision_diff.credibility_delta > 0 ? '+' : ''}{activeTwin.decision_diff.credibility_delta}
                </span>
              </div>

              {/* Timeline mini */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4">
                <div className="flex-1 p-3 rounded-lg" style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}>
                  <p className="text-[10px] text-tx-tertiary">{activeTwin.decision_diff.previous_date}</p>
                  <p className="text-sm font-semibold text-tx-secondary font-mono">{activeTwin.decision_diff.previous_decision}</p>
                </div>
                <div className="text-tx-tertiary text-lg text-center sm:text-left">→</div>
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
        <div className="card-surface p-4 sm:p-5">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
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

                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[12px] font-mono text-tx-secondary">{ev.date}</span>
                          <span className={`badge text-[9px] ${evColor.badge}`}>{ev.event_type}</span>
                          <span className="text-[11px] text-tx-tertiary">{ev.invoice_id}</span>
                        </div>
                        <p className="text-[13px] text-tx-tertiary mt-0.5">{ev.note}</p>
                      </div>
                      <span className="text-[12px] font-mono font-medium text-tx-secondary flex-shrink-0">
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
