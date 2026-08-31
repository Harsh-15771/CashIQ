import React, { useState, useEffect } from 'react';
import { Users, ArrowLeft, Search, ShieldCheck, Zap, AlertTriangle, Clock, ArrowRight, Building2, TrendingUp } from 'lucide-react';

function getScoreColor(score) {
  if (score >= 80) return { text: 'text-success', bg: 'bg-success', bar: '#10B981', tier: 'Tier A (High Trust)' };
  if (score >= 50) return { text: 'text-warning', bg: 'bg-warning', bar: '#F59E0B', tier: 'Tier B (Moderate Risk)' };
  return { text: 'text-danger', bg: 'bg-danger', bar: '#EF4444', tier: 'Tier C (High Delinquency)' };
}

const EVENT_COLORS = {
  PAID:           { dot: '#10B981', badge: 'badge-success' },
  PROMISE_KEPT:   { dot: '#3B82F6', badge: 'badge-info' },
  ACTIVE_PROMISE: { dot: '#6366F1', badge: 'badge-accent' },
  DISPUTED:       { dot: '#F59E0B', badge: 'badge-warning' },
  PROMISE_BROKEN: { dot: '#EF4444', badge: 'badge-danger' },
  DEFAULT:        { dot: '#4B5563', badge: 'badge-neutral' },
};

export default function Screen2_DebtorTwin({ twins = [], onSelectDebtorForDemo }) {
  const [selectedTwin, setSelectedTwin] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (twins && twins.length > 0 && !selectedTwin) setSelectedTwin(twins[0]);
  }, [twins]);

  const handleSelectTwin = (twin) => {
    setSelectedTwin(twin);
    setShowDetail(true);
  };

  const filteredTwins = twins.filter(t =>
    t.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.debtor_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (t.gstin && t.gstin.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (!twins || twins.length === 0) {
    return (
      <div className="card-surface p-12 text-center rounded-xl border border-white/[0.06]">
        <Users className="w-8 h-8 text-accent/40 mx-auto mb-3 animate-pulse" />
        <p className="text-sm text-tx-secondary">Loading Debtor Digital Twins…</p>
      </div>
    );
  }

  const activeTwin = selectedTwin || twins[0];
  const scoreInfo = getScoreColor(activeTwin.promise_credibility_score);

  return (
    <div className="space-y-5 animate-fade-up">

      {/* Header Banner */}
      <div className="card-surface p-4 rounded-xl border border-white/[0.06] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-tx-primary flex items-center gap-2">
              Debtor Digital Twins & Credit Intelligence
              <span className="badge-accent text-[9px]">{twins.length} Active Profiles</span>
            </h2>
            <p className="text-xs text-tx-tertiary">
              Continuous behavioral credit scoring updated deterministically from promises, historical payment delays (DBT), and GSTR-2B compliance.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="provenance-deterministic text-[10px]">Laplace Smoothing Engine</span>
          <span className="provenance-deterministic text-[10px]">Continuous PTP Calibration</span>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-5 items-start">

        {/* ════════════ LEFT PANEL — Debtor Directory List ════════════ */}
        <div className={`w-full lg:w-[320px] flex-shrink-0 space-y-2 lg:sticky lg:top-[80px] ${showDetail ? 'hidden lg:block' : ''}`}>
          {/* Search Box */}
          <div className="relative mb-2">
            <Search className="w-3.5 h-3.5 text-tx-tertiary absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search debtor or GSTIN..."
              className="w-full bg-[#0D0D14] border border-white/[0.06] rounded-lg pl-8 pr-3 py-2 text-xs text-tx-primary placeholder:text-tx-tertiary focus:outline-none focus:border-accent"
            />
          </div>

          <div className="space-y-1.5 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
            {filteredTwins.map((twin) => {
              const isSelected = activeTwin?.debtor_id === twin.debtor_id;
              const sc = getScoreColor(twin.promise_credibility_score);

              return (
                <button
                  key={twin.debtor_id}
                  onClick={() => handleSelectTwin(twin)}
                  className={`w-full text-left p-3.5 rounded-xl transition-all duration-150 border ${
                    isSelected
                      ? 'bg-accent/[0.08] border-accent/40 shadow-sm'
                      : 'card-surface hover:border-white/10 border-white/[0.04]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <h4 className="text-xs font-bold text-tx-primary truncate pr-2">{twin.company_name}</h4>
                    <span className={`text-[10px] font-mono font-bold ${sc.text}`}>
                      {twin.promise_credibility_score}/100
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-tx-tertiary mb-2 font-mono">
                    <span>₹{(twin.total_outstanding_inr || 0).toLocaleString('en-IN')} due</span>
                    <span>+{twin.average_dbt_days.toFixed(0)}d DBT</span>
                  </div>

                  {/* PTP Health Bar */}
                  <div className="w-full h-1 bg-white/[0.06] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${twin.promise_credibility_score}%`,
                        backgroundColor: sc.bar,
                      }}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ════════════ RIGHT PANEL — Detail Dossier View ════════════ */}
        <div className={`flex-1 min-w-0 space-y-4 animate-fade-up ${showDetail ? '' : 'hidden lg:block'}`} key={activeTwin.debtor_id}>

          {/* Mobile Back Button */}
          <button
            onClick={() => setShowDetail(false)}
            className="lg:hidden flex items-center gap-2 text-xs font-medium text-tx-secondary hover:text-tx-primary transition-colors mb-1 py-1"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to debtor directory
          </button>

          {/* Profile Header Card */}
          <div className="card-surface p-5 sm:p-6 rounded-xl border border-white/[0.06]">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg sm:text-xl font-bold text-tx-primary tracking-tight">{activeTwin.company_name}</h2>
                  <span className={`badge text-[10px] ${
                    activeTwin.promise_credibility_score >= 80 ? 'badge-success' :
                    activeTwin.promise_credibility_score >= 50 ? 'badge-warning' : 'badge-danger'
                  }`}>
                    {scoreInfo.tier}
                  </span>
                </div>
                <p className="text-xs text-tx-tertiary mt-1.5 flex flex-wrap items-center gap-x-2">
                  <span className="font-mono text-tx-secondary">{activeTwin.gstin || '27AABCU9603R1ZM'}</span>
                  <span className="text-surface-border">·</span>
                  <span>{activeTwin.relationship_age_years} Year Enterprise Relationship</span>
                  <span className="text-surface-border">·</span>
                  <span className="font-mono text-tx-secondary">{activeTwin.debtor_id}</span>
                </p>
              </div>

              {/* Score Hero */}
              <div className="sm:text-right flex-shrink-0 bg-black/40 p-3 rounded-xl border border-white/[0.04]">
                <p className="text-[10px] text-tx-tertiary uppercase tracking-wider mb-0.5 font-bold">Promise Credibility</p>
                <div className={`text-2xl sm:text-3xl font-extrabold font-mono ${scoreInfo.text}`}>
                  {activeTwin.promise_credibility_score}
                  <span className="text-sm text-tx-tertiary font-normal">/100</span>
                </div>
                <p className="text-[10px] text-tx-tertiary mt-0.5 font-mono">
                  Laplace(45%) + DBT(25%) + Age(15%) + Dispute(15%)
                </p>
              </div>
            </div>

            {/* Quick Metrics Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5 pt-4 border-t border-white/[0.04]">
              <div className="p-3 bg-white/[0.02] rounded-lg">
                <p className="text-[10px] text-tx-tertiary uppercase tracking-wider mb-1 font-bold">Promises Kept (Laplace)</p>
                <p className="text-base font-bold font-mono text-tx-primary">
                  {activeTwin.promises_kept}/{activeTwin.total_promises}
                  <span className="text-xs text-tx-secondary font-normal ml-1.5">
                    ({(activeTwin.laplace_fulfillment_ratio * 100).toFixed(0)}% ratio)
                  </span>
                </p>
              </div>
              <div className="p-3 bg-white/[0.02] rounded-lg">
                <p className="text-[10px] text-tx-tertiary uppercase tracking-wider mb-1 font-bold">Average Delay (DBT)</p>
                <p className="text-base font-bold font-mono text-tx-primary">
                  +{activeTwin.average_dbt_days.toFixed(1)}<span className="text-xs text-tx-secondary font-normal ml-1">Days Beyond Terms</span>
                </p>
              </div>
              <div className="p-3 bg-white/[0.02] rounded-lg">
                <p className="text-[10px] text-tx-tertiary uppercase tracking-wider mb-1 font-bold">Total Outstanding</p>
                <p className="text-base font-bold font-mono text-tx-primary">
                  ₹{(activeTwin.total_outstanding_inr || 0).toLocaleString('en-IN')}
                </p>
              </div>
            </div>

            {/* Simulation Action Bar */}
            <div className="mt-4 pt-4 border-t border-white/[0.04] flex flex-col sm:flex-row items-center justify-between gap-3">
              <span className="text-xs text-tx-tertiary">
                Launch a simulated decision evaluation for this specific debtor.
              </span>
              <button
                onClick={() => {
                  if (onSelectDebtorForDemo) onSelectDebtorForDemo(activeTwin.debtor_id);
                }}
                className="btn-primary text-xs py-2 px-4 flex items-center gap-1.5 flex-shrink-0"
              >
                <Zap className="w-3.5 h-3.5 fill-current" />
                <span>Simulate In Decision Lab</span>
              </button>
            </div>
          </div>

          {/* ── Decision Diff ("What Changed?") ── */}
          {activeTwin.decision_diff && (
            <div className="card-surface rounded-xl border border-accent/20 bg-accent/[0.02] overflow-hidden" style={{ borderLeft: '3px solid #6366F1' }}>
              <div className="p-5">
                <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-tx-primary flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-accent animate-pulse-dot" />
                    Behavioral Shift & Decision Diff
                  </h4>
                  <span className={`badge text-[10px] ${
                    activeTwin.decision_diff.credibility_delta > 0 ? 'badge-success' : 'badge-danger'
                  }`}>
                    Δ Credibility: {activeTwin.decision_diff.credibility_delta > 0 ? '+' : ''}{activeTwin.decision_diff.credibility_delta} pts
                  </span>
                </div>

                {/* Timeline Comparison */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4">
                  <div className="flex-1 p-3 rounded-lg bg-black/40 border border-white/[0.04]">
                    <p className="text-[10px] text-tx-tertiary font-mono">{activeTwin.decision_diff.previous_date}</p>
                    <p className="text-xs font-bold text-tx-secondary font-mono mt-0.5">{activeTwin.decision_diff.previous_decision}</p>
                  </div>
                  <div className="text-tx-tertiary text-sm text-center sm:text-left">→</div>
                  <div className="flex-1 p-3 rounded-lg bg-accent/10 border border-accent/20">
                    <p className="text-[10px] text-accent font-mono">{activeTwin.decision_diff.current_date}</p>
                    <p className="text-xs font-bold text-success font-mono mt-0.5">{activeTwin.decision_diff.current_decision}</p>
                  </div>
                </div>

                <p className="text-xs text-tx-secondary mt-3 leading-relaxed">
                  {activeTwin.decision_diff.reason_for_diff}
                </p>
              </div>
            </div>
          )}

          {/* ── Timeline ── */}
          <div className="card-surface p-5 rounded-xl border border-white/[0.06]">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-tx-primary">Payment & Commitment History</h4>
              <span className="provenance-synthetic text-[9px]">Verified Ledger Records</span>
            </div>

            {activeTwin.timeline && activeTwin.timeline.length > 0 ? (
              <div className="relative ml-3 space-y-0">
                {/* Vertical line */}
                <div className="absolute left-0 top-2 bottom-2 w-px bg-white/[0.06]" />

                {activeTwin.timeline.map((ev, idx) => {
                  const evColor = EVENT_COLORS[ev.event_type] || EVENT_COLORS.DEFAULT;
                  return (
                    <div key={idx} className="relative pl-7 py-3 group">
                      {/* Dot */}
                      <div
                        className="absolute left-[-4px] top-4 w-2 h-2 rounded-full border-2"
                        style={{ backgroundColor: evColor.dot, borderColor: evColor.dot }}
                      />

                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-mono text-tx-secondary font-semibold">{ev.date}</span>
                            <span className={`badge text-[9px] ${evColor.badge}`}>{ev.event_type}</span>
                            <span className="text-[11px] font-mono text-accent">{ev.invoice_id}</span>
                          </div>
                          <p className="text-xs text-tx-tertiary mt-0.5">{ev.note}</p>
                        </div>
                        <span className="text-xs font-mono font-bold text-tx-primary flex-shrink-0">
                          ₹{ev.amount_inr.toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-tx-tertiary text-center py-6">No historical records found for this debtor.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
