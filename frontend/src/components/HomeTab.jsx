import React from 'react';
import { ArrowRight, CalendarDays, CheckCircle2, Clock3, FileWarning, Sparkles, TrendingDown, TrendingUp } from 'lucide-react';

const formatINR = (value) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value || 0);
const formatCompactINR = (value) => `₹${((value || 0) / 100000).toFixed(1)}L`;

function MetricCard({ label, value, helper, tone = 'neutral', icon: Icon }) {
  const tones = {
    neutral: 'bg-white/[0.035] border-white/[0.07] text-tx-primary',
    danger: 'bg-danger/[0.055] border-danger/20 text-danger',
    success: 'bg-success/[0.055] border-success/20 text-success',
    accent: 'bg-accent/[0.07] border-accent/25 text-accent-hover',
  };
  return <div className={`rounded-2xl border p-4 sm:p-5 ${tones[tone]}`}>
    <div className="flex justify-between items-start"><p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-tx-tertiary">{label}</p>{Icon && <span className="p-2 rounded-lg bg-black/10"><Icon className="w-4 h-4" /></span>}</div>
    <p className="mt-4 text-2xl sm:text-[28px] leading-none tracking-tight font-bold font-mono">{value}</p>
    <p className="mt-2 text-xs text-tx-secondary">{helper}</p>
  </div>;
}

export default function HomeTab({ stats, queue = [], invoices = [], forecastData, onNavigate }) {
  const highPriority = queue.slice(0, 3);
  const totalExpected = forecastData?.total_cashiq_predicted_volume || 0;
  const paidCount = invoices.filter((item) => item.invoice?.status === 'PAID').length;
  const firstName = 'Harsh';

  return <div className="space-y-6 animate-fade-up">
    <section className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
      <div>
        <div className="flex items-center gap-2 text-xs font-medium text-accent-hover"><span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse-dot" />MONDAY, 01 SEPTEMBER</div>
        <h1 className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-tx-primary">Good morning, {firstName}.</h1>
        <p className="mt-2 text-sm text-tx-secondary">Here’s what needs attention to keep this week’s cash on track.</p>
      </div>
      <button type="button" onClick={() => onNavigate('control_center')} className="btn-primary flex items-center justify-center gap-2 whitespace-nowrap"><Sparkles className="w-4 h-4" />Review today’s actions <ArrowRight className="w-4 h-4" /></button>
    </section>

    <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
      <MetricCard label="Overdue exposure" value={formatCompactINR(stats?.total_overdue_amount_inr)} helper={`${stats?.broken_ptp_count || 0} broken promises need review`} tone="danger" icon={FileWarning} />
      <MetricCard label="Expected this month" value={formatCompactINR(totalExpected)} helper="AI-adjusted payment forecast" tone="success" icon={TrendingUp} />
      <MetricCard label="Protected cash" value={formatCompactINR(stats?.snoozed_promises_volume_inr)} helper={`${stats?.snoozed_promises_count || 0} credible payment promises`} tone="accent" icon={CheckCircle2} />
      <MetricCard label="Average payment delay" value={`+${stats?.average_merchant_dbt || 0}d`} helper="Days beyond agreed payment terms" icon={Clock3} />
    </section>

    <section className="grid grid-cols-1 xl:grid-cols-[1.35fr_0.85fr] gap-5">
      <div className="card-surface overflow-hidden">
        <div className="p-5 sm:p-6 flex items-start justify-between gap-4 border-b border-white/[0.06]">
          <div><p className="text-sm font-semibold text-tx-primary">Today’s priority actions</p><p className="mt-1 text-xs text-tx-secondary">Recommendations requiring a human decision before they run.</p></div>
          <button type="button" onClick={() => onNavigate('control_center')} className="text-xs font-semibold text-accent-hover hover:text-white whitespace-nowrap">Open Action Center</button>
        </div>
        {highPriority.length ? <div className="divide-y divide-white/[0.05]">
          {highPriority.map((item, index) => <button type="button" key={item.invoice_id} onClick={() => onNavigate('control_center')} className="w-full p-4 sm:px-6 flex gap-4 text-left hover:bg-white/[0.025] transition-colors">
            <span className={`w-7 h-7 shrink-0 rounded-full flex items-center justify-center text-xs font-bold ${index === 0 ? 'bg-danger/15 text-danger' : 'bg-accent/10 text-accent-hover'}`}>{index + 1}</span>
            <span className="min-w-0 flex-1"><span className="flex flex-wrap gap-x-2 gap-y-1 items-center"><span className="text-sm font-semibold text-tx-primary">{item.debtor_name}</span><span className="badge badge-warning text-[9px]">{item.status?.replace('_', ' ')}</span></span><span className="block mt-1 text-xs text-tx-secondary truncate">{item.reason || `Review the recommendation for ${item.invoice_id}`}</span><span className="block mt-2 text-[10px] font-semibold uppercase tracking-wide text-accent-hover">Recommended: {item.recommended_action?.replaceAll('_', ' ')}</span></span>
            <span className="hidden sm:block text-sm font-bold font-mono text-tx-primary whitespace-nowrap">{formatINR(item.amount)}</span><ArrowRight className="w-4 h-4 mt-1 text-tx-tertiary" />
          </button>)}
        </div> : <div className="p-10 text-center"><CheckCircle2 className="w-7 h-7 mx-auto text-success" /><p className="mt-3 text-sm font-semibold">Your priority queue is clear</p><p className="mt-1 text-xs text-tx-secondary">CashIQ is monitoring your receivables for changes.</p></div>}
      </div>

      <div className="card-surface p-5 sm:p-6 flex flex-col">
        <div className="flex items-center justify-between"><div><p className="text-sm font-semibold text-tx-primary">Cash outlook</p><p className="mt-1 text-xs text-tx-secondary">Next 30 days</p></div><CalendarDays className="w-4 h-4 text-accent-hover" /></div>
        <div className="mt-8"><p className="text-[11px] uppercase tracking-[0.08em] font-semibold text-tx-tertiary">Predicted inflows</p><p className="mt-2 text-3xl font-bold tracking-tight font-mono text-success">{formatCompactINR(totalExpected)}</p><div className="mt-5 h-2 rounded-full bg-white/[0.06] overflow-hidden"><div className="h-full w-[72%] rounded-full bg-gradient-to-r from-success to-[#34d399]" /></div><div className="mt-2 flex justify-between text-[10px] text-tx-tertiary"><span>Confidence: high</span><span>72% expected by day 15</span></div></div>
        <div className="mt-auto pt-7 border-t border-white/[0.06] flex items-center gap-3"><span className="w-8 h-8 rounded-lg bg-success/[0.1] text-success grid place-items-center"><TrendingDown className="w-4 h-4" /></span><p className="text-xs text-tx-secondary"><span className="font-semibold text-success">{paidCount || 3} invoices</span> cleared since the last review.</p></div>
      </div>
    </section>

    <section className="card-surface p-5 sm:p-6 flex flex-col md:flex-row gap-5 md:items-center justify-between bg-gradient-to-r from-accent/[0.09] to-transparent border-accent/20">
      <div><p className="text-sm font-semibold text-tx-primary">Receivables health is monitored continuously</p><p className="mt-1 text-xs text-tx-secondary">CashIQ checks payment signals, customer history, and policy rules before recommending an action.</p></div>
      <button type="button" onClick={() => onNavigate('invoices')} className="btn-outline text-xs whitespace-nowrap">Explore receivables</button>
    </section>
  </div>;
}
