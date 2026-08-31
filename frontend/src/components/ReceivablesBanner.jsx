import React, { useState } from 'react';
import { ChevronDown, ChevronUp, CheckCircle2 } from 'lucide-react';

const BUCKET_COLORS = {
  collectible:    { bar: '#10B981', bg: 'bg-success/8',  text: 'text-success',   label: 'Collectible' },
  snoozed:        { bar: '#6366F1', bg: 'bg-accent/8',   text: 'text-accent',    label: 'Promised' },
  disputed:       { bar: '#F59E0B', bg: 'bg-warning/8',  text: 'text-warning',   label: 'Disputed' },
  tds:            { bar: '#A78BFA', bg: 'bg-purple-400/8',text: 'text-purple-400',label: 'TDS Withheld' },
  reconciliation: { bar: '#38BDF8', bg: 'bg-sky-400/8',  text: 'text-sky-400',   label: 'Reconciliation' },
  not_due:        { bar: '#4B5563', bg: 'bg-tx-tertiary/8',text: 'text-tx-secondary',label: 'Not Yet Due' },
};

function formatLakh(val) {
  if (!val) return '₹0';
  const lakh = val / 100000;
  if (lakh >= 1) return `₹${lakh.toFixed(1)}L`;
  const thousand = val / 1000;
  return `₹${thousand.toFixed(0)}K`;
}

function formatINR(val) {
  return `₹${(val || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

export default function ReceivablesBanner({ decomposition }) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!decomposition) return null;

  const total = decomposition.total_outstanding_inr || 1;

  const buckets = [
    { key: 'collectible',    amount: decomposition.collectible_now_inr,        count: decomposition.collectible_count,       desc: 'Active recovery target' },
    { key: 'snoozed',        amount: decomposition.promised_snoozed_inr,       count: decomposition.promised_count,          desc: 'High-trust active PTP' },
    { key: 'disputed',       amount: decomposition.under_dispute_inr,          count: decomposition.disputed_count,          desc: 'GSTR-2B / PO mismatch' },
    { key: 'tds',            amount: decomposition.tax_tds_withheld_inr,       count: decomposition.tds_count,               desc: 'Sec 194C withholding' },
    { key: 'reconciliation', amount: decomposition.reconciliation_variance_inr,count: decomposition.reconciliation_count,    desc: 'Short payment variance' },
    { key: 'not_due',        amount: decomposition.not_yet_due_inr,            count: decomposition.not_due_count,           desc: 'Within Net 30 terms' },
  ];

  const overdueAmount = (decomposition.collectible_now_inr || 0) +
                         (decomposition.under_dispute_inr || 0) +
                         (decomposition.reconciliation_variance_inr || 0);

  return (
    <div className="card-surface animate-fade-up">
      {/* ── Collapsed Strip (always visible) ── */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-5 py-3 text-left group"
      >
        <div className="flex items-center gap-3 sm:gap-6 text-sm flex-wrap">
          <span className="text-tx-secondary font-medium text-xs sm:text-sm">Outstanding</span>
          <span className="font-mono font-bold text-tx-primary text-[13px] sm:text-[15px]">{formatINR(total)}</span>

          <span className="w-px h-4 bg-surface-border hidden sm:block" />

          <span className="text-tx-secondary font-medium text-xs sm:text-sm">Overdue</span>
          <span className="font-mono font-bold text-danger text-[13px] sm:text-[15px]">{formatLakh(overdueAmount)}</span>

          <span className="w-px h-4 bg-surface-border hidden sm:block" />

          <span className="text-tx-secondary font-medium text-xs sm:text-sm">Protected</span>
          <span className="font-mono font-bold text-success text-[13px] sm:text-[15px]">{formatLakh(decomposition.promised_snoozed_inr)}</span>
        </div>

        <div className="flex items-center gap-3">
          <span className="provenance-deterministic flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            Verified
          </span>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-tx-tertiary group-hover:text-tx-secondary transition-colors" />
          ) : (
            <ChevronDown className="w-4 h-4 text-tx-tertiary group-hover:text-tx-secondary transition-colors" />
          )}
        </div>
      </button>

      {/* ── Expanded Detail ── */}
      {isExpanded && (
        <div className="px-5 pb-5 animate-fade-up">
          {/* Segmented bar */}
          <div className="h-2 rounded-full overflow-hidden flex mb-4 bg-elevated">
            {buckets.map((b) => {
              const pct = ((b.amount || 0) / total) * 100;
              if (pct < 0.5) return null;
              const color = BUCKET_COLORS[b.key];
              return (
                <div
                  key={b.key}
                  className="h-full transition-all duration-500"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: color.bar,
                    minWidth: pct > 0 ? '4px' : '0',
                  }}
                  title={`${color.label}: ${formatINR(b.amount)} (${pct.toFixed(1)}%)`}
                />
              );
            })}
          </div>

          {/* Bucket cards grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
            {buckets.map((b) => {
              const color = BUCKET_COLORS[b.key];
              const pct = ((b.amount || 0) / total * 100).toFixed(1);
              return (
                <div
                  key={b.key}
                  className={`rounded-lg p-3 ${color.bg} transition-all duration-150 hover:scale-[1.02]`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`text-[11px] font-medium ${color.text} opacity-80`}>{color.label}</span>
                    {b.count > 0 && (
                      <span className="text-[10px] font-mono text-tx-tertiary">{b.count}</span>
                    )}
                  </div>
                  <p className="text-[17px] font-bold font-mono text-tx-primary leading-tight">
                    {formatINR(b.amount)}
                  </p>
                  <p className="text-[10px] text-tx-tertiary mt-1">{pct}% · {b.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
