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
  SNOOZED:    'badge-success',
  OVERDUE:    'badge-danger',
  DISPUTED:   'badge-warning',
  BROKEN_PTP: 'badge-danger',
  ESCALATED:  'badge-danger',
  ISSUED:     'badge-neutral',
  PAID:       'badge-success',
};

const ROW_BG = {
  OVERDUE:    'rgba(239,68,68,0.04)',
  DISPUTED:   'rgba(245,158,11,0.04)',
  BROKEN_PTP: 'rgba(239,68,68,0.04)',
  ESCALATED:  'rgba(239,68,68,0.04)',
};

const ROW_BORDER = {
  OVERDUE:    '#EF4444',
  DISPUTED:   '#F59E0B',
  SNOOZED:    '#6B7280',
  PAID:       '#10B981',
  BROKEN_PTP: '#EF4444',
  ESCALATED:  '#EF4444',
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
                className={`px-3 py-1 rounded-md text-[11px] font-semibold transition-all duration-150 ${
                  selectedStatus === status
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
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.map(({ invoice, debtor, priority_score, is_high_value }) => {
                const status = invoice.status;
                const borderColor = ROW_BORDER[status] || 'transparent';
                const rowBg = ROW_BG[status] || 'transparent';

                return (
                  <tr
                    key={invoice.invoice_id}
                    className="border-b border-white/[0.02] hover:bg-white/[0.02] transition-colors"
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
                        <a href={`https://rzp.io/i/${invoice.invoice_id.toLowerCase()}`} target="_blank" rel="noreferrer" className="ml-1 text-tx-tertiary hover:text-accent">
                          <ExternalLink className="w-3 h-3 inline" />
                        </a>
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
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
