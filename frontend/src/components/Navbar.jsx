import React from 'react';
import { ShieldCheck, Zap, Users, FlaskConical, BookOpen, RefreshCw } from 'lucide-react';

const tabs = [
  { id: 'demolab',        label: 'Decision Lab',    icon: Zap,           isHero: true },
  { id: 'control_center', label: 'Control Center',  icon: ShieldCheck,   showBadge: true },
  { id: 'debtor_twin',    label: 'Debtor Twins',    icon: Users },
  { id: 'experiments',    label: 'A/B Evidence',    icon: FlaskConical },
  { id: 'invoices',       label: 'Ledger',          icon: BookOpen },
];

export default function Navbar({ activeTab, setActiveTab, pendingActionCount, isRefreshing, onRefresh }) {
  return (
    <header
      className="sticky top-0 z-50 border-b border-surface-border"
      style={{
        background: 'rgba(5, 5, 8, 0.82)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
      }}
    >
      <div className="max-w-[1400px] mx-auto flex items-center justify-between h-[60px] px-6">

        {/* ── Brand Mark ── */}
        <div className="flex items-center gap-3 min-w-[180px]">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent to-accent-hover flex items-center justify-center shadow-accent-sm">
            <ShieldCheck className="w-4.5 h-4.5 text-white" strokeWidth={2.5} />
          </div>
          <div className="flex flex-col">
            <span className="text-[15px] font-bold text-tx-primary tracking-tight leading-tight">
              Cash<span className="text-accent">IQ</span>
            </span>
            <span className="text-[10px] font-medium text-tx-tertiary uppercase tracking-[0.08em] leading-none">
              Decision Intelligence
            </span>
          </div>
        </div>

        {/* ── Navigation Tabs ── */}
        <nav className="flex items-center gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex items-center gap-1.5 px-3.5 py-2 text-[13px] font-medium transition-colors duration-150 rounded-lg ${
                  isActive
                    ? 'text-tx-primary'
                    : 'text-tx-secondary hover:text-tx-primary hover:bg-white/[0.03]'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-accent' : ''}`} />
                <span>{tab.label}</span>

                {/* Notification dot for Control Center */}
                {tab.showBadge && pendingActionCount > 0 && (
                  <span className="w-1.5 h-1.5 rounded-full bg-danger absolute top-1.5 right-1.5 animate-pulse-dot" />
                )}

                {/* Active underline — clean 2px accent bar */}
                {isActive && (
                  <span className="absolute bottom-0 left-3 right-3 h-[2px] bg-accent rounded-full" />
                )}
              </button>
            );
          })}
        </nav>

        {/* ── Right Zone: Status + Refresh ── */}
        <div className="flex items-center gap-3 min-w-[180px] justify-end">
          <div className="flex items-center gap-1.5 text-[11px] text-tx-tertiary">
            <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse-dot" />
            <span className="font-mono text-tx-secondary">Live</span>
            <span className="text-surface-border mx-1">·</span>
            <span className="font-mono">Test Mode</span>
          </div>

          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="p-1.5 rounded-lg text-tx-tertiary hover:text-tx-primary hover:bg-white/[0.04] transition-colors duration-150"
            title="Refresh Ledger"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-accent' : ''}`} />
          </button>
        </div>
      </div>
    </header>
  );
}
