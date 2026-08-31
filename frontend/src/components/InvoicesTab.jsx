import React, { useState } from 'react';
import { TrendingUp, ExternalLink, BookOpen, Download, Search, Filter, QrCode, ArrowUpDown } from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import ReceivablesBanner from './ReceivablesBanner';
import OverviewCards from './OverviewCards';

const STATUS_BADGE = {
  SNOOZED:    'badge-success',
  OVERDUE:    'badge-danger',
  DISPUTED:   'badge-warning',
  BROKEN_PTP: 'badge-danger',
  ESCALATED:  'badge-danger',
  ISSUED:     'badge-neutral',
  PAID:       'badge-success',
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
    <div className="card-elevated px-4 py-3 text-[12px] rounded-xl border border-white/[0.08]" style={{ minWidth: '180px' }}>
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

export default function InvoicesTab({ invoices, forecastData, stats, decomposition, onInspectInvoice }) {
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredInvoices = invoices.filter((item) => {
    const inv = item.invoice;
    const debtor = item.debtor;
    const matchesStatus = selectedStatus === 'ALL' || inv.status === selectedStatus;
    const matchesSearch = !searchQuery ||
      inv.invoice_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (debtor?.company_name && debtor.company_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (debtor?.gstin && debtor.gstin.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesStatus && matchesSearch;
  });

  const chartData = forecastData?.forecast_points?.map((pt) => ({
    date: pt.date_str.slice(5),
    Contractual: pt.contractual_due_inflow,
    CashIQ: pt.cashiq_predicted_inflow,
  })) || [];

  const filters = ['ALL', 'OVERDUE', 'SNOOZED', 'DISPUTED', 'ESCALATED', 'ISSUED'];

  // CSV Export handler
  const handleExportCSV = () => {
    const headers = ['Invoice ID', 'Status', 'Debtor Name', 'GSTIN', 'Due Date', 'Overdue Days', 'Amount INR', 'Priority Score'];
    const rows = filteredInvoices.map(i => [
      i.invoice.invoice_id,
      i.invoice.status,
      `"${i.debtor?.company_name || 'Enterprise'}"`,
      i.debtor?.gstin || '',
      i.invoice.due_date,
      i.invoice.current_overdue_days,
      i.invoice.amount,
      i.priority_score
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `cashiq_invoices_ledger_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-fade-up">

      {/* ── Executive Receivables KPI Summary ── */}
      <div className="space-y-4">
        <ReceivablesBanner decomposition={decomposition} />
        <OverviewCards stats={stats} />
      </div>

      {/* ── Cash Flow Chart ── */}
      <div className="card-surface p-4 sm:p-5 rounded-xl border border-white/[0.06]">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
          <div>
            <h2 className="section-heading flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-success" />
              30-Day Cash Inflow Forecast
            </h2>
            <p className="section-subheading">
              Contractual due dates vs CashIQ AI predicted inflow curve
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

        <div style={{ height: '240px' }}>
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

      {/* ── Invoices Ledger Table ── */}
      <div className="card-surface rounded-xl border border-white/[0.06] overflow-hidden">
        {/* Table Header Controls */}
        <div className="p-4 border-b border-white/[0.04] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-[#0D0D14]">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-accent" />
            <h3 className="text-sm font-bold text-tx-primary">Invoices Ledger</h3>
            <span className="badge-neutral text-[10px]">{filteredInvoices.length} Records</span>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            {/* Search */}
            <div className="relative flex-1 sm:w-60">
              <Search className="w-3.5 h-3.5 text-tx-tertiary absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search invoice or debtor..."
                className="w-full bg-[#050508] border border-white/[0.06] rounded-lg pl-8 pr-3 py-1.5 text-xs text-tx-primary placeholder:text-tx-tertiary focus:outline-none focus:border-accent"
              />
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1 overflow-x-auto py-1">
              {filters.map((status) => (
                <button
                  key={status}
                  onClick={() => setSelectedStatus(status)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all whitespace-nowrap ${
                    selectedStatus === status
                      ? 'bg-accent text-white'
                      : 'text-tx-tertiary hover:text-tx-secondary hover:bg-white/[0.03]'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>

            {/* CSV Export */}
            <button
              onClick={handleExportCSV}
              className="btn-outline text-xs py-1.5 px-3 flex items-center justify-center gap-1.5 flex-shrink-0"
              title="Download CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Export</span>
            </button>
          </div>
        </div>

        {/* Table View */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/[0.04] bg-[#050508]/60">
                <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-wider text-tx-tertiary">Status</th>
                <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-wider text-tx-tertiary">Invoice ID</th>
                <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-wider text-tx-tertiary">Debtor</th>
                <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-wider text-tx-tertiary hidden sm:table-cell">Due Date</th>
                <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-wider text-tx-tertiary text-right">Amount</th>
                <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-wider text-tx-tertiary hidden md:table-cell">Laplace Credibility</th>
                <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-wider text-tx-tertiary text-right">Priority</th>
                <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-wider text-tx-tertiary text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.map((item) => {
                const { invoice, debtor, priority_score, is_high_value } = item;
                const status = invoice.status;
                const borderColor = ROW_BORDER[status] || 'transparent';

                return (
                  <tr
                    key={invoice.invoice_id}
                    onClick={() => onInspectInvoice && onInspectInvoice(item)}
                    className="border-b border-white/[0.02] hover:bg-white/[0.03] transition-colors cursor-pointer group"
                    style={{
                      borderLeft: borderColor !== 'transparent' ? `3px solid ${borderColor}` : 'none',
                    }}
                  >
                    <td className="py-3 px-4">
                      <span className={`badge text-[10px] ${STATUS_BADGE[status] || 'badge-neutral'}`}>
                        {status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-mono font-bold text-accent group-hover:underline">{invoice.invoice_id}</span>
                      {invoice.razorpay_payment_link_id && (
                        <span className="ml-1 text-tx-tertiary" title="Razorpay Smart Link Enabled">
                          <QrCode className="w-3 h-3 inline text-accent/70" />
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-semibold text-tx-primary">{debtor?.company_name || 'Enterprise'}</p>
                      <p className="text-[10px] text-tx-tertiary font-mono">{debtor?.contact_email}</p>
                    </td>
                    <td className="py-3 px-4 hidden sm:table-cell">
                      <span className="text-tx-secondary font-mono">{invoice.due_date}</span>
                      {invoice.current_overdue_days > 0 ? (
                        <span className="block text-[10px] text-danger font-bold">+{invoice.current_overdue_days}d late</span>
                      ) : (
                        <span className="block text-[10px] text-success">On track</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="font-mono font-bold text-tx-primary">{formatINR(invoice.amount)}</span>
                      {is_high_value && <span className="block text-[9px] text-warning font-bold">&gt; ₹2.5L Gated</span>}
                    </td>
                    <td className="py-3 px-4 hidden md:table-cell">
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
                            <span className="text-xs font-bold text-tx-primary">{pct}%</span>
                            <span className="text-[10px] text-tx-tertiary ml-1">({kept}/{total})</span>
                            <div className="w-20 h-1 rounded-full mt-1 overflow-hidden bg-white/[0.06]">
                              <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: barColor }} />
                            </div>
                          </div>
                        );
                      })() : <span className="text-[11px] text-tx-tertiary">Cold Start</span>}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-warning font-semibold">
                      {formatINR(priority_score)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onInspectInvoice) onInspectInvoice(item);
                        }}
                        className="btn-outline text-[10px] py-1 px-2.5 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        Inspect
                      </button>
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
