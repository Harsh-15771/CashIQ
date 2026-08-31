import React from 'react';
import { AlertTriangle, ArrowRight, CheckCircle2, CircleX, FileText, ShieldCheck, X } from 'lucide-react';

const formatINR = (value) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value || 0);

export default function ActionReviewDrawer({ item, isApproving, onClose, onApprove }) {
  if (!item) return null;
  const riskTone = item.status === 'DISPUTED' ? 'text-warning bg-warning/[0.1] border-warning/20' : 'text-danger bg-danger/[0.1] border-danger/20';

  return <div className="fixed inset-0 z-[80] flex justify-end" role="dialog" aria-modal="true" aria-label="Review recommended action">
    <button type="button" aria-label="Close review" onClick={onClose} className="absolute inset-0 bg-black/65 backdrop-blur-sm" />
    <section className="relative h-full w-full max-w-xl overflow-y-auto border-l border-white/[0.1] bg-[#0d0d14] shadow-2xl animate-fade-up">
      <header className="sticky top-0 z-10 flex items-center justify-between px-5 sm:px-6 py-4 border-b border-white/[0.07] bg-[#0d0d14]/95 backdrop-blur-xl">
        <div><p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-accent-hover">Action review</p><h2 className="mt-1 text-base font-semibold">Approve a recommended next step</h2></div>
        <button type="button" onClick={onClose} className="p-2 rounded-lg text-tx-tertiary hover:bg-white/[0.05] hover:text-tx-primary"><X className="w-4 h-4" /></button>
      </header>
      <div className="p-5 sm:p-6 space-y-6">
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5">
          <div className="flex flex-wrap gap-2 items-center"><span className="text-xs font-mono font-bold text-accent-hover">{item.invoice_id}</span><span className={`badge text-[9px] ${riskTone}`}>{item.status?.replaceAll('_', ' ')}</span></div>
          <div className="mt-4 flex justify-between gap-4"><div><p className="text-lg font-semibold text-tx-primary">{item.debtor_name}</p><p className="mt-1 text-xs text-tx-secondary">Outstanding invoice requiring a decision</p></div><p className="text-xl font-bold font-mono text-tx-primary whitespace-nowrap">{formatINR(item.amount)}</p></div>
        </div>

        <div><p className="text-[10px] uppercase tracking-[0.1em] font-semibold text-tx-tertiary">CashIQ recommendation</p><div className="mt-2 rounded-xl border border-accent/25 bg-accent/[0.08] p-4 flex gap-3"><span className="w-9 h-9 shrink-0 rounded-lg bg-accent text-white grid place-items-center"><ShieldCheck className="w-4 h-4" /></span><div><p className="text-sm font-semibold text-tx-primary">{item.recommended_action?.replaceAll('_', ' ')}</p><p className="mt-1 text-xs leading-relaxed text-tx-secondary">{item.reason || 'This action was selected from the available collections options after reviewing payment signals and policy rules.'}</p></div></div></div>

        <div className="grid grid-cols-2 gap-3"><div className="rounded-xl border border-white/[0.07] p-4"><p className="text-[10px] uppercase tracking-[0.08em] text-tx-tertiary">Expected impact</p><p className="mt-2 text-sm font-semibold text-success">Protect recovery value</p><p className="mt-1 text-[11px] text-tx-secondary">Recommendation has passed policy checks.</p></div><div className="rounded-xl border border-white/[0.07] p-4"><p className="text-[10px] uppercase tracking-[0.08em] text-tx-tertiary">Approval status</p><p className="mt-2 text-sm font-semibold text-warning">Needs your review</p><p className="mt-1 text-[11px] text-tx-secondary">No customer communication has been sent.</p></div></div>

        <div className="rounded-xl border border-white/[0.07] p-4"><p className="flex items-center gap-2 text-sm font-semibold"><FileText className="w-4 h-4 text-accent-hover" />Why this needs attention</p><p className="mt-3 text-xs leading-relaxed text-tx-secondary">{item.reason || 'The account requires a human decision under the current collections policy.'}</p><div className="mt-4 pt-3 border-t border-white/[0.06] flex gap-2 text-[10px] font-medium text-tx-tertiary"><span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-success" />Policy checked</span><span className="flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5 text-warning" />Human approval required</span></div></div>
      </div>
      <footer className="sticky bottom-0 flex gap-3 p-5 sm:px-6 border-t border-white/[0.07] bg-[#0d0d14]/95 backdrop-blur-xl"><button type="button" onClick={onClose} className="btn-outline flex-1 text-sm"><CircleX className="w-4 h-4 inline mr-1.5" />Return to queue</button><button type="button" disabled={isApproving} onClick={onApprove} className="btn-primary flex-1 text-sm flex justify-center items-center gap-2">{isApproving ? 'Approving…' : 'Approve action'}<ArrowRight className="w-4 h-4" /></button></footer>
    </section>
  </div>;
}
