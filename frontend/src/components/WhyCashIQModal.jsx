import React from 'react';
import { X, Check, AlertTriangle, ShieldCheck, Zap, Sparkles, Scale, Building2 } from 'lucide-react';

export default function WhyCashIQModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  const comparisonRows = [
    {
      dimension: 'Inbound Communication Understanding',
      manual: 'Manual email triage taking 2–4 hours/day per finance clerk.',
      dunning: 'Blind timer; ignores reply emails and client payment updates.',
      cashiq: 'Gemini 1.5 Pro parses intent, promised dates, UTRs, and tax deductions with Ambiguity Gate refusal.',
      highlight: true,
    },
    {
      dimension: 'Indian Tax & TDS Compliance (Sec 194C/194J)',
      manual: 'Manual month-end reconciliation of Form 26AS; discrepancies treated as disputes.',
      dunning: 'Zero tax awareness; treats lawful 2% TDS deduction as delinquent debt and spams client.',
      cashiq: 'Native TDS recognition; automatically locks post-TDS settlement amount without penalty.',
      highlight: true,
    },
    {
      dimension: 'GSTR-2B Input Tax Credit (ITC) Locks',
      manual: 'Phone calls between accounting teams to verify portal filings.',
      dunning: 'Cannot detect GST filing status; keeps dunning during active portal mismatches.',
      cashiq: 'Deterministic GSTR-2B lock guardrail pauses aggressive dunning and issues reconciliation memo.',
      highlight: false,
    },
    {
      dimension: 'Decision Making & Value Attribution',
      manual: 'Subjective intuition of individual collection agents.',
      dunning: 'Sends reminder every N days; claims 100% of organic customer payments as bot value.',
      cashiq: 'Integer-Paise Expected Value optimizer evaluates NO_ACTION = 0; only claims true net incremental uplift.',
      highlight: true,
    },
    {
      dimension: 'Customer Relationship Protection',
      manual: 'Inconsistent; depends on collector personality.',
      dunning: 'Harasses enterprise clients with repetitive emails, burning long-term contract goodwill.',
      cashiq: 'Superlinear fatigue model: Friction × (Contacts + 1)^1.4 automatically vetos over-contacting.',
      highlight: true,
    },
    {
      dimension: 'Hallucination Defense & Guardrails',
      manual: 'Human errors and unauthorized verbal commitments.',
      dunning: 'No reasoning capability.',
      cashiq: 'Price-lock rule, >₹2.5L human-in-the-loop approval gate, and 100% bit-identical decision replay.',
      highlight: false,
    },
  ];

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md transition-opacity" onClick={onClose} />

      {/* Modal Container */}
      <div className="fixed inset-4 sm:inset-10 z-50 max-w-5xl mx-auto my-auto max-h-[90vh] bg-[#0D0D15] border border-white/[0.1] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-fade-up">
        
        {/* Header */}
        <div className="p-6 border-b border-white/[0.08] flex items-center justify-between bg-[#131322]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-tx-primary">Why CashIQ?</h2>
                <span className="badge-accent text-[10px]">Architectural Comparison</span>
              </div>
              <p className="text-xs text-tx-tertiary mt-0.5">
                How CashIQ’s evidence-driven, policy-controlled engine differs from manual spreadsheets and naive dunning bots.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg text-tx-tertiary hover:text-tx-primary hover:bg-white/[0.05] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Table */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="overflow-x-auto rounded-xl border border-white/[0.06]">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/[0.08] bg-[#08080E]">
                  <th className="py-3.5 px-4 text-[11px] font-bold uppercase tracking-wider text-tx-tertiary w-1/4">
                    Capability / Dimension
                  </th>
                  <th className="py-3.5 px-4 text-[11px] font-bold uppercase tracking-wider text-tx-secondary w-1/4 bg-white/[0.01]">
                    Manual Excel / ERP
                  </th>
                  <th className="py-3.5 px-4 text-[11px] font-bold uppercase tracking-wider text-danger/80 w-1/4">
                    Naive Dunning Bots
                  </th>
                  <th className="py-3.5 px-4 text-[11px] font-bold uppercase tracking-wider text-accent w-1/4 bg-accent/[0.04]">
                    ⚡ CashIQ Autonomous OS
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03]">
                {comparisonRows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-white/[0.01] transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-tx-primary">
                      {row.dimension}
                    </td>
                    <td className="py-3.5 px-4 text-tx-tertiary bg-white/[0.01] leading-relaxed">
                      {row.manual}
                    </td>
                    <td className="py-3.5 px-4 text-tx-secondary leading-relaxed">
                      {row.dunning}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-tx-primary bg-accent/[0.04] leading-relaxed border-l border-accent/20">
                      <div className="flex items-start gap-1.5">
                        <Check className="w-4 h-4 text-success flex-shrink-0 mt-0.5" />
                        <span>{row.cashiq}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Bottom Callout Banner */}
          <div className="mt-6 p-4 rounded-xl border border-success/20 bg-success/[0.04] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-5 h-5 text-success flex-shrink-0" />
              <div>
                <p className="font-bold text-tx-primary">The Core Difference</p>
                <p className="text-tx-secondary mt-0.5">
                  The AI proposes and extracts evidence; deterministic Python backend rules authorize and execute. The business never gives up control.
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="btn-primary text-xs py-2 px-4 flex-shrink-0"
            >
              Explore Live Workspace
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
