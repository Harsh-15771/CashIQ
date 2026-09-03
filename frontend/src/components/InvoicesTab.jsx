import React, { useState } from 'react';
import { TrendingUp, ExternalLink, BookOpen } from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';

const STATUS_BADGE = {
  SNOOZED: 'badge-success',
  OVERDUE: 'badge-danger',
  DISPUTED: 'badge-warning',
  BROKEN_PTP: 'badge-danger',
  ESCALATED: 'badge-danger',
  ISSUED: 'badge-neutral',
  PAID: 'badge-success',
};

const ROW_BG = {
  OVERDUE: 'rgba(239,68,68,0.04)',
  DISPUTED: 'rgba(245,158,11,0.04)',
  BROKEN_PTP: 'rgba(239,68,68,0.04)',
  ESCALATED: 'rgba(239,68,68,0.04)',
};

const ROW_BORDER = {
  OVERDUE: '#EF4444',
  DISPUTED: '#F59E0B',
  SNOOZED: '#6B7280',
  PAID: '#10B981',
  BROKEN_PTP: '#EF4444',
  ESCALATED: '#EF4444',
};

const formatINR = (val) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val || 0);

/* ── Custom Tooltip ── */
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="card-elevated px-4 py-3 text-[12px]" style={{ minWidth: '180px' }}>
      <p className="text-tx-tertiary mb-1.5 font-mono">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center justify-between gap-4 mb-0.5">
          <span className="text-tx-secondary">{p.name}</span>
          <span className="font-mono font-bold" style={{ color: p.color }}>{formatINR(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

export default function InvoicesTab({ invoices, forecastData }) {
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedItem, setSelectedItem] = useState(null);

  React.useEffect(() => {
    if (selectedItem) {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [selectedItem]);

  const filteredInvoices = invoices.filter((item) => {
    if (selectedStatus === 'ALL') return true;
    return item.invoice.status === selectedStatus;
  });

  const chartData = forecastData?.forecast_points?.map((pt) => ({
    date: pt.date_str.slice(5),
    Contractual: pt.contractual_due_inflow,
    CashIQ: pt.cashiq_predicted_inflow,
  })) || [];

  const filters = ['ALL', 'OVERDUE', 'SNOOZED', 'DISPUTED', 'ESCALATED', 'ISSUED'];

  return (
    <div className="space-y-5">

      {/* ── Cash Flow Chart ── */}
      <div className="card-surface p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
          <div>
            <h2 className="section-heading flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-success" />
              30-Day Cash Inflow Forecast
            </h2>
            <p className="section-subheading">
              Contractual due dates vs CashIQ predicted inflows
            </p>
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-0.5 rounded-full" style={{ backgroundColor: '#64748b' }} />
              <span className="text-tx-tertiary">Contractual (₹{forecastData ? Math.round(forecastData.total_contractual_volume / 100000) : 0}L)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-0.5 rounded-full bg-success" />
              <span className="text-success font-medium">CashIQ (₹{forecastData ? Math.round(forecastData.total_cashiq_predicted_volume / 100000) : 0}L)</span>
            </span>
          </div>
        </div>

        <div style={{ height: '280px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gradCashIQ" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="gradContract" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#64748b" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#64748b" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" stroke="#4B5563" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="#4B5563" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
              <Tooltip content={<ChartTooltip />} />
              <Area type="monotone" dataKey="Contractual" stroke="#64748b" strokeDasharray="4 4" fillOpacity={1} fill="url(#gradContract)" dot={false} name="Contractual" />
              <Area type="monotone" dataKey="CashIQ" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#gradCashIQ)" dot={false} name="CashIQ Expected" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Invoices Table ── */}
      <div className="card-surface overflow-hidden">
        <div className="px-5 py-3.5 border-b border-white/[0.04] flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-accent" />
            <h3 className="text-sm font-semibold text-tx-primary">Invoices Ledger</h3>
            <span className="text-[10px] text-tx-tertiary font-mono">·</span>
            <span className="text-[10px] text-tx-tertiary">{filteredInvoices.length} records</span>
          </div>

          {/* Filter pills */}
          <div className="flex items-center gap-1 flex-wrap">
            {filters.map((status) => (
              <button
                key={status}
                onClick={() => setSelectedStatus(status)}
                className={`px-3 py-1 rounded-md text-[11px] font-semibold transition-all duration-150 ${selectedStatus === status
                    ? 'bg-accent text-white'
                    : 'text-tx-tertiary hover:text-tx-secondary hover:bg-white/[0.03]'
                  }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="border-b border-white/[0.04]" style={{ backgroundColor: 'rgba(5,5,8,0.5)' }}>
                <th className="py-2.5 px-5 text-[10px] font-semibold uppercase tracking-[0.06em] text-tx-tertiary">Status</th>
                <th className="py-2.5 px-4 text-[10px] font-semibold uppercase tracking-[0.06em] text-tx-tertiary">Invoice</th>
                <th className="py-2.5 px-4 text-[10px] font-semibold uppercase tracking-[0.06em] text-tx-tertiary">Debtor</th>
                <th className="py-2.5 px-4 text-[10px] font-semibold uppercase tracking-[0.06em] text-tx-tertiary hidden sm:table-cell">Due Date</th>
                <th className="py-2.5 px-4 text-[10px] font-semibold uppercase tracking-[0.06em] text-tx-tertiary text-right">Amount</th>
                <th className="py-2.5 px-4 text-[10px] font-semibold uppercase tracking-[0.06em] text-tx-tertiary hidden md:table-cell">Promise Ratio</th>
                <th className="py-2.5 px-4 text-[10px] font-semibold uppercase tracking-[0.06em] text-tx-tertiary text-right">Priority</th>
                <th className="py-2.5 px-4 text-[10px] font-semibold uppercase tracking-[0.06em] text-tx-tertiary text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.map((item) => {
                const { invoice, debtor, priority_score, is_high_value } = item;
                const status = invoice.status;
                const borderColor = ROW_BORDER[status] || 'transparent';
                const rowBg = ROW_BG[status] || 'transparent';

                return (
                  <tr
                    key={invoice.invoice_id}
                    onClick={() => setSelectedItem(item)}
                    className="border-b border-white/[0.02] hover:bg-white/[0.04] transition-colors cursor-pointer group"
                    style={{
                      backgroundColor: rowBg,
                      borderLeft: borderColor !== 'transparent' ? `3px solid ${borderColor}` : 'none',
                    }}
                  >
                    <td className="py-2.5 px-5">
                      <span className={`badge text-[10px] ${STATUS_BADGE[status] || 'badge-neutral'}`}>
                        {status}
                      </span>
                    </td>
                    <td className="py-2.5 px-4">
                      <span className="font-mono font-medium text-accent">{invoice.invoice_id}</span>
                      {invoice.razorpay_payment_link_id && (
                        <span className="ml-1.5 text-tx-tertiary group-hover:text-accent">
                          <ExternalLink className="w-3 h-3 inline" />
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-4">
                      <p className="font-medium text-tx-primary">{debtor?.company_name || 'Enterprise'}</p>
                      <p className="text-[10px] text-tx-tertiary">{debtor?.contact_email}</p>
                    </td>
                    <td className="py-2.5 px-4 hidden sm:table-cell">
                      <span className="text-tx-secondary font-mono text-[12px]">{invoice.due_date}</span>
                      {invoice.current_overdue_days > 0 ? (
                        <span className="block text-[10px] text-danger font-bold">+{invoice.current_overdue_days}d late</span>
                      ) : (
                        <span className="block text-[10px] text-success">On schedule</span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <span className="font-mono font-bold text-tx-primary">{formatINR(invoice.amount)}</span>
                      {is_high_value && <span className="block text-[9px] text-warning font-bold">&gt; ₹2.5L</span>}
                    </td>
                    <td className="py-2.5 px-4 hidden md:table-cell">
                      {debtor ? (() => {
                        const kept = debtor.historical_promises_kept ?? 0;
                        const total = debtor.historical_promises_total ?? 0;
                        const ratio = typeof debtor.laplace_fulfillment_ratio === 'number'
                          ? debtor.laplace_fulfillment_ratio
                          : (kept + 1.0) / (total + 2.0);
                        const pct = Math.round(ratio * 100);
                        const barColor = ratio >= 0.7 ? '#10B981' : ratio >= 0.5 ? '#F59E0B' : '#EF4444';
                        return (
                          <div>
                            <span className="text-[12px] font-bold text-tx-primary">{pct}%</span>
                            <span className="text-[10px] text-tx-tertiary ml-1">({kept}/{total})</span>
                            <div className="w-20 h-1 rounded-full mt-1 overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
                              <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: barColor }} />
                            </div>
                          </div>
                        );
                      })() : <span className="text-[11px] text-tx-tertiary">Cold Start</span>}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-[12px] text-warning font-medium">
                      {formatINR(priority_score)}
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedItem(item);
                        }}
                        className="px-2.5 py-1 rounded bg-white/[0.04] hover:bg-accent hover:text-white border border-white/[0.08] text-[11px] font-medium transition-colors"
                      >
                        View Details →
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Invoice Detail Drawer / Modal ── */}
      {selectedItem && (
        <div className="fixed inset-0 z-[80] flex justify-end" role="dialog" aria-modal="true">
          <div
            className="absolute inset-0 bg-black/65 backdrop-blur-sm transition-opacity"
            onClick={() => setSelectedItem(null)}
          />
          <aside className="relative h-full w-full max-w-lg overflow-y-auto border-l border-white/[0.1] bg-[#0d0d14] shadow-2xl p-6 flex flex-col space-y-5 animate-fade-up">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-accent-hover">Invoice Intelligence Drawer</p>
                <h3 className="text-lg font-bold font-mono text-tx-primary mt-1">{selectedItem.invoice.invoice_id}</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="p-1.5 rounded-lg text-tx-tertiary hover:bg-white/[0.06] hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Debtor Profile Card */}
            <div className="card-surface p-4 rounded-xl border border-white/[0.08] space-y-2">
              <p className="text-[10px] uppercase tracking-wider text-tx-tertiary font-semibold">Debtor Account</p>
              <h4 className="text-base font-bold text-tx-primary">{selectedItem.debtor?.company_name || 'Enterprise Account'}</h4>
              <p className="text-xs text-tx-secondary">{selectedItem.debtor?.contact_email}</p>
              <p className="text-xs text-tx-tertiary font-mono">GSTIN: {selectedItem.debtor?.gstin || '27AABCT3518Q1Z8'}</p>
            </div>

            {/* Section 194C TDS Calculation Breakdown */}
            <div className="card-surface p-4 rounded-xl border border-accent/20 bg-accent/[0.02] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-accent">Section 194C TDS Breakdown</span>
                <span className="badge-accent text-[9px]">Statutory Rate 2%</span>
              </div>
              <div className="space-y-1.5 text-xs font-mono">
                <div className="flex justify-between text-tx-secondary">
                  <span>Gross Invoice Value:</span>
                  <span>{formatINR(selectedItem.invoice.amount)}</span>
                </div>
                <div className="flex justify-between text-warning">
                  <span>Legitimate 2% TDS Withheld:</span>
                  <span>−{formatINR(selectedItem.invoice.amount * 0.02)}</span>
                </div>
                <div className="pt-2 border-t border-white/[0.06] flex justify-between font-bold text-tx-primary text-sm">
                  <span>Price-Locked Net Receivable:</span>
                  <span className="text-success">{formatINR(selectedItem.invoice.amount * 0.98)}</span>
                </div>
              </div>
            </div>

            {/* Behavioral & Payment Schedule */}
            <div className="grid grid-cols-2 gap-3">
              <div className="card-surface p-3.5 rounded-xl border border-white/[0.06]">
                <p className="text-[10px] text-tx-tertiary uppercase font-semibold">Contractual Due</p>
                <p className="mt-1 text-sm font-mono font-bold text-tx-primary">{selectedItem.invoice.due_date}</p>
                <p className="mt-0.5 text-[11px] text-danger">{selectedItem.invoice.current_overdue_days > 0 ? `+${selectedItem.invoice.current_overdue_days} days late` : 'Current'}</p>
              </div>
              <div className="card-surface p-3.5 rounded-xl border border-white/[0.06]">
                <p className="text-[10px] text-tx-tertiary uppercase font-semibold">Laplace Credibility</p>
                <p className="mt-1 text-sm font-mono font-bold text-accent">
                  {selectedItem.debtor ? `${Math.round(((selectedItem.debtor.historical_promises_kept + 1) / (selectedItem.debtor.historical_promises_total + 2)) * 100)}%` : '50% (Prior)'}
                </p>
                <p className="mt-0.5 text-[11px] text-tx-tertiary">Historical fulfillment ratio</p>
              </div>
            </div>

            {/* Payment Link Action */}
            <div className="card-surface p-4 rounded-xl border border-white/[0.08] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-tx-primary">Smart Payment Link</span>
                <span className="px-1.5 py-0.5 rounded bg-warning/10 border border-warning/25 text-warning text-[9px] font-mono uppercase">
                  Demo Sandbox Link
                </span>
              </div>
              <p className="text-xs font-mono text-accent bg-accent/[0.08] p-2.5 rounded-lg border border-accent/20 truncate">
                https://rzp.io/i/{selectedItem.invoice.invoice_id.toLowerCase()}
              </p>
              <p className="text-[11px] text-tx-tertiary">Cryptographically locked to post-TDS settlement amount. No AI write-access.</p>
            </div>

            <div className="mt-auto pt-4 border-t border-white/[0.06]">
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="btn-outline w-full py-2.5 text-xs"
              >
                Close Drawer
              </button>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
