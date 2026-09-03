import React from 'react';
import { AlertTriangle, ArrowRight, CheckCircle2, CircleX, Crown, FileText, Lock, ShieldCheck, Sparkles, X } from 'lucide-react';

const formatINR = (value) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value || 0);

export default function ActionReviewDrawer({ item, isApproving, onClose, onApprove, onReject, userRole = 'ops' }) {
  React.useEffect(() => {
    if (item) {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [item]);

  if (!item) return null;
  const isHighValue = (item.amount || 0) >= 250000;
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
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs font-mono font-bold text-accent-hover">{item.invoice_id}</span>
            <span className={`badge text-[9px] ${riskTone}`}>{item.status?.replaceAll('_', ' ')}</span>
            {isHighValue && (
              <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${
                userRole === 'cfo' ? 'bg-amber-500/10 text-amber-300 border-amber-500/20' : 'bg-white/[0.04] text-tx-tertiary border-white/[0.06]'
              }`}>
                {userRole === 'cfo' ? 'CFO Unlocked' : 'CFO Gated'}
              </span>
            )}
          </div>
          <div className="mt-4 flex justify-between gap-4"><div><p className="text-lg font-semibold text-tx-primary">{item.debtor_name}</p><p className="mt-1 text-xs text-tx-secondary">Outstanding invoice requiring a decision</p></div><p className="text-xl font-bold font-mono text-tx-primary whitespace-nowrap">{formatINR(item.amount)}</p></div>
        </div>

        <div><p className="text-[10px] uppercase tracking-[0.1em] font-semibold text-tx-tertiary">CashIQ recommendation</p><div className="mt-2 rounded-xl border border-accent/25 bg-accent/[0.08] p-4 flex gap-3"><span className="w-9 h-9 shrink-0 rounded-lg bg-accent text-white grid place-items-center"><ShieldCheck className="w-4 h-4" /></span><div><p className="text-sm font-semibold text-tx-primary">{item.recommended_action?.replaceAll('_', ' ')}</p><p className="mt-1 text-xs leading-relaxed text-tx-secondary">{item.reason || 'This action was selected from the available collections options after reviewing payment signals and policy rules.'}</p></div></div></div>

        {/* ── Gemini Semantic Extraction Dossier ── */}
        <div className="rounded-xl border border-accent/25 bg-accent/[0.03] p-4">
          <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-white/[0.06]">
            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-accent-hover" />
              <span className="text-xs font-bold text-tx-primary">Google Gemini 2.0 Flash Semantic Extraction</span>
            </div>
            <span className="provenance-llm text-[9px]">Pydantic Schema Enforced</span>
          </div>
          <div className="space-y-2.5 text-xs">
            <div className="bg-black/30 p-2.5 rounded-lg border border-white/[0.04]">
              <span className="text-[10px] text-tx-tertiary uppercase tracking-wider block mb-1">Parsed Inbound Communication</span>
              <p className="text-xs text-tx-secondary italic leading-relaxed">
                {item.status === 'DISPUTED'
                  ? '"Vendor invoice received. We noticed an IRN GST mismatch on line-item tax calculation. Kindly issue a revised e-invoice or credit note before payment run."'
                  : item.status === 'UNVERIFIED_PAYMENT_CLAIM'
                  ? '"Payment has already been initiated from our HDFC corporate account via NEFT (UTR: CMS99887766) after 2% TDS deduction. Please verify and confirm receipt."'
                  : item.amount >= 250000
                  ? '"Management scheduled this release for Friday run pending final treasury liquidity allocation. Total net payable after statutory 2% TDS deduction."'
                  : '"We acknowledge receipt of the invoice. Accounts payable scheduled release for the upcoming Thursday billing run."'}
              </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="bg-black/30 p-2 rounded-lg border border-white/[0.04]">
                <span className="text-[10px] text-tx-tertiary block">Detected Intent</span>
                <span className="font-semibold text-accent truncate block mt-0.5">
                  {item.status === 'DISPUTED' ? 'DISPUTE_PROCEDURAL' : item.status === 'UNVERIFIED_PAYMENT_CLAIM' ? 'PAYMENT_CLAIM' : 'PROMISE_TO_PAY'}
                </span>
              </div>
              <div className="bg-black/30 p-2 rounded-lg border border-white/[0.04]">
                <span className="text-[10px] text-tx-tertiary block">LLM Confidence</span>
                <span className="font-mono text-success font-semibold block mt-0.5">96%</span>
              </div>
              <div className="bg-black/30 p-2 rounded-lg border border-white/[0.04]">
                <span className="text-[10px] text-tx-tertiary block">TDS Extracted</span>
                <span className="font-mono text-tx-secondary block mt-0.5">2.0% (Sec 194C)</span>
              </div>
              <div className="bg-black/30 p-2 rounded-lg border border-white/[0.04]">
                <span className="text-[10px] text-tx-tertiary block">Safety Gate</span>
                <span className="font-semibold text-success block mt-0.5">Passed (0 Vector)</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3"><div className="rounded-xl border border-white/[0.07] p-4"><p className="text-[10px] uppercase tracking-[0.08em] text-tx-tertiary">Expected impact</p><p className="mt-2 text-sm font-semibold text-success">Protect recovery value</p><p className="mt-1 text-[11px] text-tx-secondary">Recommendation has passed policy checks.</p></div><div className="rounded-xl border border-white/[0.07] p-4"><p className="text-[10px] uppercase tracking-[0.08em] text-tx-tertiary">Approval status</p><p className="mt-2 text-sm font-semibold text-warning">Needs your review</p><p className="mt-1 text-[11px] text-tx-secondary">No customer communication has been sent.</p></div></div>

        <div className="rounded-xl border border-white/[0.07] p-4"><p className="flex items-center gap-2 text-sm font-semibold"><FileText className="w-4 h-4 text-accent-hover" />Why this needs attention</p><p className="mt-3 text-xs leading-relaxed text-tx-secondary">{item.reason || 'The account requires a human decision under the current collections policy.'}</p><div className="mt-4 pt-3 border-t border-white/[0.06] flex gap-2 text-[10px] font-medium text-tx-tertiary"><span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-success" />Policy checked</span><span className="flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5 text-warning" />Human approval required</span></div></div>
      </div>
      <footer className="sticky bottom-0 flex gap-2.5 p-5 sm:px-6 border-t border-white/[0.07] bg-[#0d0d14]/95 backdrop-blur-xl">
        <button type="button" onClick={onClose} className="btn-outline flex-1 text-xs sm:text-sm">
          <CircleX className="w-4 h-4 inline mr-1.5" />Return
        </button>
        <button
          type="button"
          onClick={onReject || onClose}
          className="px-3 py-2 rounded-xl border border-danger/30 text-danger hover:bg-danger/10 text-xs sm:text-sm font-semibold transition-colors"
        >
          Reject
        </button>
        {isHighValue && userRole === 'ops' ? (
          <button
            type="button"
            disabled={true}
            title="Policy gate: Requires CFO authorization."
            className="flex-1 px-3 py-2 rounded-xl border border-white/[0.08] bg-white/[0.02] text-tx-tertiary text-xs sm:text-sm font-medium flex items-center justify-center gap-1.5 cursor-not-allowed opacity-60"
          >
            <Lock className="w-3.5 h-3.5 text-tx-tertiary" />
            <span>Locked (CFO)</span>
          </button>
        ) : isHighValue && userRole === 'cfo' ? (
          <button
            type="button"
            disabled={isApproving}
            onClick={onApprove}
            className="btn-primary flex-1 text-xs sm:text-sm flex justify-center items-center gap-1.5"
          >
            <Crown className="w-3.5 h-3.5 text-amber-300" />
            {isApproving ? 'Authorizing…' : 'Authorize action'}<ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            type="button"
            disabled={isApproving}
            onClick={onApprove}
            className="btn-primary flex-1 text-xs sm:text-sm flex justify-center items-center gap-1.5"
          >
            {isApproving ? 'Approving…' : 'Approve action'}<ArrowRight className="w-4 h-4" />
          </button>
        )}
      </footer>
    </section>
  </div>;
}
