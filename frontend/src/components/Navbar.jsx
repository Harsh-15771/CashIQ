import React, { useState } from 'react';
import { ShieldCheck, Zap, Users, FlaskConical, BookOpen, RefreshCw, Menu, X, Bell, Command } from 'lucide-react';

const tabs = [
  { id: 'demolab', label: 'Decision Lab', icon: Zap, isHero: true },
  { id: 'control_center', label: 'Control Center', icon: ShieldCheck, showBadge: true },
  { id: 'debtor_twin', label: 'Debtor Twins', icon: Users },
  { id: 'experiments', label: 'A/B Evidence', icon: FlaskConical },
  { id: 'invoices', label: 'Ledger', icon: BookOpen },
];

export default function Navbar({ activeTab, setActiveTab, pendingActionCount, isRefreshing, onRefresh, onOpenCommandPalette }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleTabClick = (tabId) => {
    setActiveTab(tabId);
    setMobileOpen(false);
  };

  return (
    <>
      <header
        className="sticky top-0 z-50 border-b border-surface-border"
        style={{
          background: 'rgba(5, 5, 8, 0.82)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        }}
      >
        <div className="max-w-[1400px] mx-auto flex items-center justify-between h-[60px] px-4 sm:px-6">

          {/* ── Left: Brand + Hamburger ── */}
          <div className="flex items-center gap-3">
            {/* Hamburger — mobile only */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden p-2 -ml-2 rounded-lg text-tx-secondary hover:text-tx-primary hover:bg-white/[0.04] transition-colors"
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            {/* Brand */}
            <div className="flex items-center gap-3 min-w-[140px] sm:min-w-[180px]">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent to-accent-hover flex items-center justify-center shadow-accent-sm">
                <ShieldCheck className="w-4.5 h-4.5 text-white" strokeWidth={2.5} />
              </div>
              <div className="flex flex-col">
                <span className="text-[15px] font-bold text-tx-primary tracking-tight leading-tight">
                  Cash<span className="text-accent">IQ</span>
                </span>
                <span className="text-[10px] font-medium text-tx-tertiary uppercase tracking-[0.08em] leading-none hidden sm:block">
                  Decision Intelligence
                </span>
              </div>
            </div>
          </div>

          {/* ── Center: Navigation Tabs — hidden on mobile ── */}
          <nav className="hidden lg:flex items-center gap-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabClick(tab.id)}
                  className={`relative flex items-center gap-1.5 px-3.5 py-2 text-[13px] font-medium transition-colors duration-150 rounded-lg ${isActive
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

                  {/* Active underline */}
                  {isActive && (
                    <span className="absolute bottom-0 left-3 right-3 h-[2px] bg-accent rounded-full" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* ── Right Zone: Status + Actions ── */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Cmd+K shortcut hint — desktop only */}
            <button
              onClick={onOpenCommandPalette}
              className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-tx-tertiary hover:text-tx-secondary hover:bg-white/[0.04] transition-colors border border-white/[0.06]"
              title="Command Palette"
            >
              <Command className="w-3 h-3" />
              <span className="text-[10px] font-mono">K</span>
            </button>

            {/* Notification Bell */}
            <button
              onClick={() => handleTabClick('control_center')}
              className="relative p-2 rounded-lg text-tx-tertiary hover:text-tx-primary hover:bg-white/[0.04] transition-colors"
              title="Action Queue"
            >
              <Bell className="w-4 h-4" />
              {pendingActionCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-danger text-[9px] font-bold text-white flex items-center justify-center">
                  {pendingActionCount}
                </span>
              )}
            </button>

            {/* Live status — desktop only */}
            <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-tx-tertiary">
              <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse-dot" />
              <span className="font-mono text-tx-secondary">Live</span>
            </div>

            {/* Refresh */}
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="p-2 rounded-lg text-tx-tertiary hover:text-tx-primary hover:bg-white/[0.04] transition-colors duration-150"
              title="Refresh Ledger"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-accent' : ''}`} />
            </button>

            {/* User Avatar */}
            <div className="flex items-center gap-2 pl-2 sm:pl-3 ml-1 sm:ml-2 border-l border-white/[0.06]">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent to-purple-500 flex items-center justify-center text-white text-xs font-bold shadow-accent-sm">
                H
              </div>
              <div className="hidden md:flex flex-col">
                <span className="text-[12px] font-medium text-tx-primary leading-tight">Harsh</span>
                <span className="text-[10px] text-tx-tertiary leading-tight">Finance Ops</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ── Mobile Drawer Overlay ── */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" onClick={() => setMobileOpen(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
        </div>
      )}

      {/* ── Mobile Drawer ── */}
      <div
        className={`fixed top-[60px] left-0 bottom-0 w-72 z-50 lg:hidden transition-transform duration-300 ease-out ${mobileOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        style={{
          backgroundColor: '#0D0D14',
          borderRight: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <nav className="p-4 space-y-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium transition-all duration-150 min-h-[48px] ${isActive
                    ? 'bg-accent/[0.08] text-tx-primary border-l-[3px] border-l-accent'
                    : 'text-tx-secondary hover:text-tx-primary hover:bg-white/[0.03] border-l-[3px] border-l-transparent'
                  }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-accent' : 'text-tx-tertiary'}`} />
                <span>{tab.label}</span>
                {tab.showBadge && pendingActionCount > 0 && (
                  <span className="ml-auto w-5 h-5 rounded-full bg-danger text-[10px] font-bold text-white flex items-center justify-center">
                    {pendingActionCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Mobile drawer footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-accent to-purple-500 flex items-center justify-center text-white text-sm font-bold">
              H
            </div>
            <div>
              <p className="text-sm font-medium text-tx-primary">Harsh</p>
              <p className="text-[11px] text-tx-tertiary">Finance Ops · Test Mode</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
