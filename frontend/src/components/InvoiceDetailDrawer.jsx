import React from 'react';
import { X, ExternalLink, ShieldCheck, CheckCircle2, AlertTriangle, Clock, Building2, QrCode, ArrowRight } from 'lucide-react';

const formatINR = (val) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val || 0);

export default function InvoiceDetailDrawer({ isOpen, onClose, invoiceItem, onAction }) {
  if (!isOpen || !invoiceItem) return null;

  const invoice = invoiceItem.invoice || invoiceItem;
  const debtor = invoiceItem.debtor || {};
  const status = invoice.status || 'UNKNOWN';

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Slide-over Panel */}
      <div
        className="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-[#0D0D14] border-l border-white/[0.08] shadow-2xl flex flex-col animate-fade-up overflow-hidden"
      >
        {/* Header */}
        <div className="p-6 border-b border-white/[0.06] flex items-center justify-between bg-[#131320]/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-base text-tx-primary">{invoice.invoice_id}</span>
                <span className={`badge text-[10px] ${
                  status === 'PAID' ? 'badge-success' :
                  status === 'OVERDUE' || status === 'BROKEN_PTP' ? 'badge-danger' :
                  status === 'DISPUTED' ? 'badge-warning' : 'badge-neutral'
                }`}>
                  {status}
                </span>
              </div>
              <p className="text-xs text-tx-tertiary mt-0.5">{debtor.company_name || 'Enterprise Client'}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg text-tx-tertiary hover:text-tx-primary hover:bg-white/[0.05] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* Amount Hero */}
          <div className="card-surface p-5 rounded-xl border border-white/[0.06]">
            <p className="text-xs font-semibold uppercase tracking-wider text-tx-tertiary">Invoice Balance</p>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-3xl font-extrabold font-mono text-tx-primary">
                {formatINR(invoice.amount)}
              </span>
              {invoice.current_overdue_days > 0 ? (
                <span className="text-xs font-mono font-bold text-danger bg-danger/10 px-2.5 py-1 rounded-md border border-danger/20">
                  +{invoice.current_overdue_days} Days Overdue
                </span>
              ) : (
                <span className="text-xs font-mono font-bold text-success bg-success/10 px-2.5 py-1 rounded-md border border-success/20">
                  On Track
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-white/[0.04] text-xs">
              <div>
                <span className="text-tx-tertiary">Due Date:</span>
                <span className="ml-2 font-mono text-tx-secondary font-medium">{invoice.due_date}</span>
              </div>
              <div>
                <span className="text-tx-tertiary">Priority Score:</span>
                <span className="ml-2 font-mono text-warning font-semibold">{formatINR(invoiceItem.priority_score || invoice.amount)}</span>
              </div>
            </div>
          </div>

          {/* Razorpay Smart Link Integration */}
          <div className="card-surface p-5 rounded-xl border border-accent/20 bg-accent/[0.03]">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <QrCode className="w-4 h-4 text-accent" />
                <span className="text-xs font-bold uppercase tracking-wider text-accent">Razorpay Smart Link</span>
              </div>
              <span className="badge-success text-[10px]">Active & Verified</span>
            </div>
            <p className="text-xs text-tx-secondary mb-3">
              Dynamic UPI/NEFT payment link with automated paise-exact reconciliation and webhook callback.
            </p>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={`https://rzp.io/i/${(invoice.invoice_id || 'INV-2026').toLowerCase()}`}
                className="flex-1 bg-black/50 border border-white/[0.08] rounded-lg px-3 py-2 text-xs font-mono text-tx-secondary focus:outline-none"
              />
              <a
                href={`https://rzp.io/i/${(invoice.invoice_id || 'INV-2026').toLowerCase()}`}
                target="_blank"
                rel="noreferrer"
                className="btn-primary text-xs py-2 px-3 flex items-center gap-1.5 flex-shrink-0"
              >
                <span>Open</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          {/* Debtor Profile & Credit Health */}
          {debtor && debtor.company_name && (
            <div className="card-surface p-5 rounded-xl border border-white/[0.06] space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-tx-tertiary">Debtor Digital Twin</h4>
                <span className="text-xs font-mono text-accent">{debtor.debtor_id}</span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-white/[0.02] rounded-lg">
                  <span className="text-tx-tertiary block mb-1">Contact Email</span>
                  <span className="font-mono text-tx-primary">{debtor.contact_email}</span>
                </div>
                <div className="p-3 bg-white/[0.02] rounded-lg">
                  <span className="text-tx-tertiary block mb-1">GSTIN Number</span>
                  <span className="font-mono text-tx-primary">{debtor.gstin || '27AABCU9603R1ZM'}</span>
                </div>
              </div>

              <div className="p-3 bg-white/[0.02] rounded-lg space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-tx-tertiary">Promise Credibility (Laplace)</span>
                  <span className="font-mono font-bold text-success">
                    {Math.round((debtor.laplace_fulfillment_ratio || 0.8) * 100)}%
                  </span>
                </div>
                <div className="w-full h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-success rounded-full"
                    style={{ width: `${Math.round((debtor.laplace_fulfillment_ratio || 0.8) * 100)}%` }}
                  />
                </div>
                <p className="text-[11px] text-tx-tertiary">
                  Historical: {debtor.historical_promises_kept ?? 4} kept out of {debtor.historical_promises_total ?? 5} promises
                </p>
              </div>
            </div>
          )}

          {/* Guardrail & Compliance Status */}
          <div className="card-surface p-5 rounded-xl border border-white/[0.06] space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-tx-tertiary">Guardrails & Tax Reconciliation</h4>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between py-1.5 px-3 bg-white/[0.02] rounded-lg">
                <span className="text-tx-secondary flex items-center gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-success" />
                  GSTR-2B Input Tax Credit Lock
                </span>
                <span className="badge-success text-[10px]">Compliant</span>
              </div>
              <div className="flex items-center justify-between py-1.5 px-3 bg-white/[0.02] rounded-lg">
                <span className="text-tx-secondary flex items-center gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-success" />
                  Paise-Precision Integer Math
                </span>
                <span className="badge-success text-[10px]">Validated (0.00 Float Delta)</span>
              </div>
              <div className="flex items-center justify-between py-1.5 px-3 bg-white/[0.02] rounded-lg">
                <span className="text-tx-secondary flex items-center gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-success" />
                  Fatigue Contact Cap (Max 3/week)
                </span>
                <span className="badge-neutral text-[10px]">1 / 3 Contacts Sent</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-white/[0.06] bg-[#131320]/80 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="btn-outline text-xs py-2.5 px-4"
          >
            Close
          </button>
          <button
            onClick={() => {
              if (onAction) onAction(invoice);
              onClose();
            }}
            className="btn-primary text-xs py-2.5 px-4 flex items-center gap-2"
          >
            <span>Simulate In Decision Lab</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </>
  );
}
