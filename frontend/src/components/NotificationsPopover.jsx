import React from 'react';
import { Bell, ShieldAlert, CheckCircle2, Zap, ArrowRight, X } from 'lucide-react';

export default function NotificationsPopover({ isOpen, onClose, queue = [], auditTrail = [], onNavigateTab }) {
  if (!isOpen) return null;

  const notifications = [
    ...queue.map(q => ({
      id: `queue-${q.invoice_id}`,
      type: 'queue',
      title: `Action Required: ${q.invoice_id}`,
      subtitle: `${q.debtor_name} · Recommended: ${q.recommended_action}`,
      timestamp: 'Pending Review',
      priority: q.amount >= 250000 ? 'high' : 'normal',
      tab: 'control_center',
    })),
    ...auditTrail.slice(0, 5).map((a, i) => ({
      id: `audit-${i}`,
      type: 'audit',
      title: a.guardrail_name || 'Autonomous Action Logged',
      subtitle: `${a.invoice_id || 'System'}: ${a.action_taken}`,
      timestamp: new Date(a.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      priority: a.security_event ? 'high' : 'low',
      tab: 'control_center',
    }))
  ];

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      {/* Popover Card */}
      <div className="absolute right-4 sm:right-6 top-[65px] z-50 w-full max-w-sm card-elevated rounded-2xl border border-white/[0.08] shadow-2xl overflow-hidden animate-fade-up">
        {/* Header */}
        <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between bg-[#131320]">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-accent" />
            <span className="text-xs font-bold uppercase tracking-wider text-tx-primary">Live Activity & Alerts</span>
          </div>
          <span className="badge-accent text-[9px]">{notifications.length} Total</span>
        </div>

        {/* List */}
        <div className="max-h-80 overflow-y-auto divide-y divide-white/[0.04] bg-[#0D0D14]">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-xs text-tx-tertiary">
              No recent notifications. System running smoothly.
            </div>
          ) : (
            notifications.map((n) => (
              <button
                key={n.id}
                onClick={() => {
                  if (onNavigateTab) onNavigateTab(n.tab);
                  onClose();
                }}
                className="w-full text-left p-3.5 hover:bg-white/[0.03] transition-colors flex items-start gap-3 group"
              >
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                  n.priority === 'high' ? 'bg-danger/10 text-danger' :
                  n.type === 'queue' ? 'bg-warning/10 text-warning' : 'bg-success/10 text-success'
                }`}>
                  {n.priority === 'high' ? <ShieldAlert className="w-3.5 h-3.5" /> :
                   n.type === 'queue' ? <Zap className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-tx-primary truncate">{n.title}</p>
                    <span className="text-[10px] font-mono text-tx-tertiary">{n.timestamp}</span>
                  </div>
                  <p className="text-[11px] text-tx-tertiary truncate mt-0.5">{n.subtitle}</p>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-2.5 bg-[#131320] border-t border-white/[0.04] text-center">
          <button
            onClick={() => {
              if (onNavigateTab) onNavigateTab('control_center');
              onClose();
            }}
            className="text-xs text-accent hover:text-accent-hover font-medium flex items-center justify-center gap-1 w-full py-1"
          >
            <span>Open Guardrail Audit Stream</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </>
  );
}
