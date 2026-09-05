import React from 'react';
import { ArrowRight, Check, CirclePlay, LockKeyhole, ShieldCheck, Sparkles, TrendingUp } from 'lucide-react';

const benefits = [
  ['Prioritize the cash that matters', 'Focus the team on high-impact collections work, not spreadsheet triage.'],
  ['Keep humans in control', 'Every sensitive action is policy checked and ready for a clear approval decision.'],
  ['Forecast with real payment signals', 'See the difference between contractual dates and likely cash arrival.'],
];

export default function LandingPage({ onEnterApp, onOpenExecutiveModal }) {
  return <div className="min-h-screen bg-canvas text-tx-primary overflow-hidden">
    <header className="relative z-10 max-w-7xl mx-auto px-5 sm:px-8 h-20 flex items-center justify-between">
      <button type="button" onClick={onEnterApp} className="flex items-center gap-3 text-left"><span className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent to-[#8b5cf6] flex items-center justify-center shadow-accent-sm"><TrendingUp className="w-5 h-5 text-white" /></span><span><span className="block font-bold tracking-tight text-lg">Cash<span className="text-accent-hover">IQ</span></span><span className="block text-[9px] font-semibold text-tx-tertiary uppercase tracking-[0.15em]">Receivables OS</span></span></button>
      <div className="flex gap-3 items-center"><span className="hidden sm:inline text-xs text-tx-secondary">For modern finance teams</span><button type="button" onClick={onEnterApp} className="btn-outline text-xs py-2 px-3">Open demo</button></div>
    </header>

    <main className="relative">
      <div className="absolute inset-x-0 top-0 -z-0 h-[640px] bg-[radial-gradient(ellipse_at_top,rgba(99,102,241,0.22),transparent_65%)]" />
      <section className="relative z-10 max-w-5xl mx-auto px-5 sm:px-8 pt-20 sm:pt-28 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-accent/30 bg-accent/[0.1] text-[11px] font-semibold text-accent-hover"><Sparkles className="w-3.5 h-3.5" />Built for faster, safer cash collection</div>
        <h1 className="mt-6 text-4xl sm:text-6xl lg:text-7xl font-bold tracking-[-0.05em] leading-[1.02]">Turn receivables into<br className="hidden sm:block" /> <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#a5b4fc] to-[#c4b5fd]">predictable cash.</span></h1>
        <p className="max-w-2xl mx-auto mt-6 text-base sm:text-lg leading-relaxed text-tx-secondary">CashIQ helps finance teams spot risk, approve the right next action, and confidently forecast when money will land.</p>
        <div className="mt-9 flex flex-col sm:flex-row justify-center gap-3"><button type="button" onClick={onEnterApp} className="btn-primary text-sm flex items-center justify-center gap-2">Explore the live workspace <ArrowRight className="w-4 h-4" /></button><button type="button" onClick={onOpenExecutiveModal || onEnterApp} className="btn-outline text-sm flex items-center justify-center gap-2"><CirclePlay className="w-4 h-4" />See how it works</button></div>
        <p className="mt-4 text-[11px] text-tx-tertiary">No setup required — open the Buildathon demo workspace.</p>
      </section>

      <section className="relative z-10 max-w-6xl mx-auto mt-16 sm:mt-20 px-5 sm:px-8">
        <div className="rounded-2xl border border-white/[0.12] bg-[#10101a]/80 shadow-[0_30px_100px_rgba(0,0,0,0.45)] overflow-hidden">
          <div className="h-11 border-b border-white/[0.08] px-4 flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-danger/80" /><span className="w-2 h-2 rounded-full bg-warning/80" /><span className="w-2 h-2 rounded-full bg-success/80" /><span className="mx-auto text-[10px] font-mono text-tx-tertiary">Northstar Commerce · CashIQ</span></div>
          <div className="p-5 sm:p-8 grid grid-cols-1 md:grid-cols-[0.78fr_1.22fr] gap-5 bg-[linear-gradient(135deg,rgba(99,102,241,0.08),transparent_45%)]">
            <div className="rounded-xl border border-white/[0.08] bg-black/20 p-5"><p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-tx-tertiary">Today’s priority actions</p><div className="mt-5 space-y-3">{['Review ₹8.4L escalation', 'Approve payment reminder', 'Resolve GST mismatch'].map((item, i) => <div key={item} className="flex gap-3 items-center"><span className={`w-6 h-6 rounded-full text-[10px] font-bold grid place-items-center ${i === 0 ? 'bg-danger/15 text-danger' : 'bg-accent/15 text-accent-hover'}`}>{i + 1}</span><span className="text-xs text-tx-secondary">{item}</span></div>)}</div></div>
            <div className="rounded-xl border border-accent/25 bg-accent/[0.06] p-5"><p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-accent-hover">Expected inflows this month</p><p className="mt-3 text-4xl font-mono font-bold">₹42.8L</p><div className="mt-7 flex h-24 gap-2 items-end">{[32, 50, 38, 64, 56, 82, 70, 95, 76, 100, 88, 76].map((h, i) => <span key={i} style={{ height: `${h}%` }} className={`flex-1 rounded-t-sm ${i > 7 ? 'bg-success' : 'bg-accent'}`} />)}</div><div className="mt-2 flex justify-between text-[10px] text-tx-tertiary"><span>Forecast</span><span className="text-success">High confidence</span></div></div>
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-5 sm:px-8 py-24 sm:py-32"><div className="grid md:grid-cols-3 gap-5">{benefits.map(([title, description], index) => <div key={title} className="card-surface p-6"><span className="w-9 h-9 rounded-lg bg-accent/[0.1] text-accent-hover grid place-items-center">{index === 0 ? <TrendingUp className="w-4 h-4" /> : index === 1 ? <ShieldCheck className="w-4 h-4" /> : <LockKeyhole className="w-4 h-4" />}</span><h2 className="mt-5 text-base font-semibold">{title}</h2><p className="mt-2 text-sm leading-relaxed text-tx-secondary">{description}</p></div>)}</div></section>
    </main>

    <footer className="max-w-7xl mx-auto px-5 sm:px-8 py-7 border-t border-white/[0.06] flex flex-col sm:flex-row justify-between gap-3 text-xs text-tx-tertiary"><span>© 2026 CashIQ · A Razorpay Buildathon project</span><span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-success" />Human-approved, policy-controlled intelligence</span></footer>
  </div>;
}
