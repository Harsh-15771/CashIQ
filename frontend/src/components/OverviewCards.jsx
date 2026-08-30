import React from 'react';
import { IndianRupee, AlertTriangle, ShieldCheck, Clock } from 'lucide-react';

export default function OverviewCards({ stats }) {
  if (!stats) return null;

  const formatINR = (val) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val || 0);

  const cards = [
    {
      label: 'Total Outstanding',
      value: formatINR(stats.total_outstanding_amount_inr),
      sub: `${stats.total_invoices_count} Active Invoices`,
      icon: IndianRupee,
      valueColor: 'text-tx-primary',
      accentColor: 'text-accent',
      accentBg: 'bg-accent/8',
      borderColor: 'border-accent/15',
    },
    {
      label: 'Overdue Volume',
      value: formatINR(stats.total_overdue_amount_inr),
      sub: `${stats.broken_ptp_count} Broken PTPs · ${stats.disputed_count} Disputed`,
      icon: AlertTriangle,
      valueColor: 'text-danger',
      accentColor: 'text-danger',
      accentBg: 'bg-danger/8',
      borderColor: 'border-danger/15',
    },
    {
      label: 'Protected / Snoozed',
      value: formatINR(stats.snoozed_promises_volume_inr),
      sub: `${stats.snoozed_promises_count} High-Credibility Promises`,
      icon: ShieldCheck,
      valueColor: 'text-success',
      accentColor: 'text-success',
      accentBg: 'bg-success/8',
      borderColor: 'border-success/15',
    },
    {
      label: 'Avg Payment Delay',
      value: `+${stats.average_merchant_dbt}d`,
      sub: 'Days Beyond Terms (DBT)',
      icon: Clock,
      valueColor: 'text-tx-primary',
      accentColor: 'text-warning',
      accentBg: 'bg-warning/8',
      borderColor: 'border-warning/15',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-3 animate-fade-up-1">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            className={`card-surface p-5 group hover:border-white/10 relative overflow-hidden`}
          >
            <div className="flex justify-between items-start">
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-tx-tertiary mb-2">
                  {card.label}
                </p>
                <h3 className={`text-2xl font-bold font-mono ${card.valueColor} tracking-tight leading-none`}>
                  {card.value}
                </h3>
                <p className="text-[11px] text-tx-secondary mt-2 truncate">{card.sub}</p>
              </div>
              <div className={`p-2 rounded-lg ${card.accentBg} ${card.accentColor} flex-shrink-0`}>
                <Icon className="w-4 h-4" />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
