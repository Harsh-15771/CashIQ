import React, { useState, useEffect } from 'react';
import { Play, RotateCcw, FlaskConical } from 'lucide-react';

/* ── Bar Race Row ── */
function BarRaceRow({ label, controlVal, treatmentVal, controlPct, treatmentPct, unit = '', isWinner = false, format = 'number' }) {
  const maxPct = Math.max(controlPct || 1, treatmentPct || 1, 1);
  const controlWidth = (controlPct / maxPct) * 100;
  const treatmentWidth = (treatmentPct / maxPct) * 100;

  const formatVal = (v) => {
    if (format === 'inr') return `₹${v.toLocaleString('en-IN')}`;
    return `${v}${unit}`;
  };

  return (
    <div
      className="py-3 px-5 border-b border-white/[0.02] last:border-b-0"
      style={isWinner ? { backgroundColor: 'rgba(16,185,129,0.04)' } : {}}
    >
      <p className="text-[12px] font-medium text-tx-secondary mb-2">{label}</p>
      <div className="space-y-1.5">
        {/* Control bar */}
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-tx-tertiary w-14 flex-shrink-0">Control</span>
          <div className="flex-1 h-4 rounded-[3px] overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}>
            <div
              className="h-full rounded-[3px] transition-all duration-700"
              style={{ width: `${controlWidth}%`, backgroundColor: 'rgba(255,255,255,0.08)' }}
            />
          </div>
          <span className="text-[11px] font-mono text-tx-tertiary w-28 text-right flex-shrink-0">{formatVal(controlVal)}</span>
        </div>
        {/* Treatment bar */}
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-accent w-14 flex-shrink-0">CashIQ</span>
          <div className="flex-1 h-4 rounded-[3px] overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}>
            <div
              className="h-full rounded-[3px] transition-all duration-700"
              style={{ width: `${treatmentWidth}%`, backgroundColor: '#6366F1' }}
            />
          </div>
          <span className={`text-[11px] font-mono w-28 text-right flex-shrink-0 ${isWinner ? 'text-success font-bold' : 'text-tx-secondary'}`}>
            {formatVal(treatmentVal)}
            {isWinner && ' ✓'}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function Screen4_ExperimentLab({ onRunExperiment, onReplayDecision }) {
  const [experimentData, setExperimentData] = useState(null);
  const [loadingExp, setLoadingExp] = useState(false);
  const [replayId, setReplayId] = useState('DEC-DEMO-001');
  const [replayResult, setReplayResult] = useState(null);
  const [loadingReplay, setLoadingReplay] = useState(false);

  useEffect(() => { handleRunExp(); }, []);

  const handleRunExp = async () => {
    setLoadingExp(true);
    try { setExperimentData(await onRunExperiment()); } catch (err) { console.error(err); }
    finally { setLoadingExp(false); }
  };

  const handleReplay = async () => {
    if (!replayId) return;
    setLoadingReplay(true);
    try { setReplayResult(await onReplayDecision(replayId)); } catch (err) { console.error(err); }
    finally { setLoadingReplay(false); }
  };

  return (
    <div className="space-y-5">

      {/* ── Header + Provenance ── */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h2 className="section-heading flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-accent" />
            A/B Evidence — Incremental Recovery Proof
          </h2>
          <p className="section-subheading">
            50/50 randomized assignment · N=500 · SHA-256 deterministic · Seed #42
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="provenance-synthetic">Simulated</span>
          <span className="provenance-deterministic">Seeded Population</span>
        </div>
      </div>

      {/* ── Hero KPIs ── */}
      {experimentData && (
        <div className="animate-fade-up space-y-4">
          {/* Big hero card */}
          <div className="card-glow p-8 text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-tx-tertiary mb-2">
              Net Incremental Working Capital Recovered
            </p>
            <h2 className="text-hero text-success font-extrabold font-mono tracking-tight">
              +₹{experimentData.net_incremental_value_inr.toLocaleString('en-IN')}
            </h2>
            <p className="text-sm text-tx-tertiary mt-2">
              Treatment arm recovered ₹{(experimentData.net_incremental_value_inr / 100000).toFixed(2)}L more than naive baseline
            </p>
          </div>

          {/* Two smaller KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="card-surface p-5">
              <p className="text-[10px] text-tx-tertiary uppercase tracking-wider mb-1.5">Recovery Rate Uplift</p>
              <p className="text-2xl font-bold font-mono text-accent">
                +{experimentData.relative_recovery_uplift_pct.toFixed(1)}%
              </p>
              <p className="text-[11px] text-tx-tertiary mt-1">
                {experimentData.treatment_arm.recovery_rate_pct}% (CashIQ) vs {experimentData.control_arm.recovery_rate_pct}% (Naive)
              </p>
            </div>
            <div className="card-surface p-5">
              <p className="text-[10px] text-tx-tertiary uppercase tracking-wider mb-1.5">Spam Messages Eliminated</p>
              <p className="text-2xl font-bold font-mono text-accent">
                −{experimentData.spam_contacts_reduced_count}
              </p>
              <p className="text-[11px] text-tx-tertiary mt-1">
                {experimentData.spam_reduction_pct}% reduction · Protects client goodwill
              </p>
            </div>
          </div>

          {/* ── Bar Race Comparison ── */}
          <div className="card-surface overflow-hidden">
            <div className="px-5 py-3 border-b border-white/[0.04] flex items-center justify-between">
              <h4 className="text-sm font-semibold text-tx-primary">Side-by-Side Comparison</h4>
              <span className="text-[10px] text-tx-tertiary font-mono">Control vs Treatment</span>
            </div>

            <BarRaceRow
              label="Recovered Volume"
              controlVal={experimentData.control_arm.recovered_amount_inr}
              treatmentVal={experimentData.treatment_arm.recovered_amount_inr}
              controlPct={experimentData.control_arm.recovered_amount_inr}
              treatmentPct={experimentData.treatment_arm.recovered_amount_inr}
              format="inr"
              isWinner={true}
            />
            <BarRaceRow
              label="Recovery Rate"
              controlVal={experimentData.control_arm.recovery_rate_pct}
              treatmentVal={experimentData.treatment_arm.recovery_rate_pct}
              controlPct={experimentData.control_arm.recovery_rate_pct}
              treatmentPct={experimentData.treatment_arm.recovery_rate_pct}
              unit="%"
              isWinner={true}
            />
            <BarRaceRow
              label="Dunning Messages Sent"
              controlVal={experimentData.control_arm.total_contacts_sent}
              treatmentVal={experimentData.treatment_arm.total_contacts_sent}
              controlPct={experimentData.control_arm.total_contacts_sent}
              treatmentPct={experimentData.treatment_arm.total_contacts_sent}
              unit=" msgs"
            />
            <BarRaceRow
              label="Human Escalations Required"
              controlVal={experimentData.control_arm.human_escalations_count}
              treatmentVal={experimentData.treatment_arm.human_escalations_count}
              controlPct={experimentData.control_arm.human_escalations_count}
              treatmentPct={experimentData.treatment_arm.human_escalations_count}
              unit=" cases"
            />
            <BarRaceRow
              label="Intervention Costs"
              controlVal={experimentData.control_arm.intervention_costs_inr}
              treatmentVal={experimentData.treatment_arm.intervention_costs_inr}
              controlPct={experimentData.control_arm.intervention_costs_inr}
              treatmentPct={experimentData.treatment_arm.intervention_costs_inr}
              format="inr"
            />

            {/* Summary row */}
            <div className="px-5 py-3 border-t border-white/[0.06] flex items-center justify-between" style={{ backgroundColor: 'rgba(16,185,129,0.04)' }}>
              <span className="text-sm font-bold text-tx-primary">Simulated Net Incremental Value</span>
              <span className="text-lg font-bold font-mono text-success">
                +₹{experimentData.net_incremental_value_inr.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {/* Re-run action panel */}
          <div className="card-surface p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="text-sm text-tx-secondary">
              <span className="font-mono text-tx-tertiary">Seed: 42</span>
              <span className="mx-2 text-surface-border">·</span>
              Re-run with same or different seed
            </div>
            <button
              onClick={handleRunExp}
              disabled={loadingExp}
              className="btn-primary flex items-center gap-2 text-xs py-2 px-4"
            >
              {loadingExp ? (
                <><div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Simulating…</>
              ) : (
                <><Play className="w-3.5 h-3.5" /> Re-Run Trial</>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ── Decision Replay ── */}
      <div className="card-surface p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-tx-primary flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-success" />
              Deterministic Decision Replay
            </h3>
            <p className="text-[12px] text-tx-tertiary mt-0.5">
              Proves 100% bit-identical reproducibility from cached extraction snapshots
            </p>
          </div>
          <span className="provenance-deterministic text-[10px]">Reproducibility</span>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          <input
            type="text"
            value={replayId}
            onChange={(e) => setReplayId(e.target.value)}
            placeholder="Decision ID (e.g. DEC-2026-0842)"
            className="flex-1 px-4 py-2.5 text-[13px] font-mono rounded-lg focus:outline-none focus:ring-1 focus:ring-accent/30 focus:border-accent transition-all"
            style={{ backgroundColor: '#050508', border: '1px solid rgba(255,255,255,0.06)', color: '#E5E7EB' }}
          />
          <button
            onClick={handleReplay}
            disabled={loadingReplay || !replayId}
            className="btn-outline flex items-center gap-2 text-xs py-2.5 px-4"
          >
            {loadingReplay ? (
              <><div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Verifying…</>
            ) : (
              <><RotateCcw className="w-3.5 h-3.5" /> Replay & Verify</>
            )}
          </button>
        </div>

        {replayResult && (
          <div
            className="mt-3 p-4 rounded-lg space-y-2"
            style={{
              backgroundColor: replayResult.is_deterministic_match ? 'rgba(16,185,129,0.06)' : 'rgba(239,68,68,0.06)',
              border: `1px solid ${replayResult.is_deterministic_match ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
            }}
          >
            <div className="flex items-center justify-between">
              <span className={`text-xs font-bold font-mono flex items-center gap-2 ${replayResult.is_deterministic_match ? 'text-success' : 'text-danger'}`}>
                <span className="w-2 h-2 rounded-full animate-pulse-dot" style={{ backgroundColor: replayResult.is_deterministic_match ? '#10B981' : '#EF4444' }} />
                {replayResult.is_deterministic_match ? '100% DETERMINISTIC MATCH CONFIRMED' : 'REPLAY VERIFICATION'}
              </span>
              <span className="text-[10px] font-mono text-tx-tertiary">
                {replayResult.model_version_used} · {replayResult.policy_version_used}
              </span>
            </div>
            <p className="text-[13px] text-tx-secondary">{replayResult.verification_message}</p>
          </div>
        )}
      </div>
    </div>
  );
}
