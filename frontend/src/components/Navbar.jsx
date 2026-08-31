import React, { useState } from 'react';
import { ShieldCheck, Zap, Users, FlaskConical, BookOpen, RefreshCw, Menu, X, Bell, Command, ChevronRight, Activity } from 'lucide-react';
import NotificationsPopover from './NotificationsPopover';

const tabs = [
  { id: 'demolab',        label: 'Decision Lab',    icon: Zap,           isHero: true },
  { id: 'control_center', label: 'Control Center',  icon: ShieldCheck,   showBadge: true },
  { id: 'debtor_twin',    label: 'Debtor Twins',    icon: Users },
  { id: 'experiments',    label: 'A/B Evidence',    icon: FlaskConical },
  { id: 'invoices',       label: 'Ledger',          icon: BookOpen },
];

export default function Navbar({
  activeTab,
  setActiveTab,
  pendingActionCount,
  isRefreshing,
  onRefresh,
  onOpenCommandPalette,
  queue = [],
  auditTrail = [],
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const handleTabClick = (tabId) => {
    setActiveTab(tabId);
    setMobileOpen(false);
    setNotificationsOpen(false);
  };

  const activeTabObj = tabs.find(t => t.id === activeTab) || tabs[0];

  return (
    <>
      <header
        className="sticky top-0 z-40 border-b border-surface-border bg-[#050508]/85 backdrop-blur-xl"
      >
        <div className="max-w-[1440px] mx-auto flex items-center justify-between h-[62px] px-4 sm:px-6">

          {/* ── Left: Brand & Breadcrumb ── */}
          <div className="flex items-center gap-3">
            {/* Hamburger — mobile only */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden p-2 -ml-2 rounded-lg text-tx-secondary hover:text-tx-primary hover:bg-white/[0.04] transition-colors"
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            {/* Brand Logo */}
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent to-indigo-700 flex items-center justify-center shadow-lg shadow-accent/25">
                <ShieldCheck className="w-4.5 h-4.5 text-white" strokeWidth={2.5} />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[15px] font-extrabold text-tx-primary tracking-tight">
                  Cash<span className="text-accent">IQ</span>
                </span>
                <span className="hidden xl:inline-block px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-accent/10 text-accent border border-accent/20">
                  Razorpay Live Tenant
                </span>
              </div>
            </div>

            {/* Breadcrumb — desktop only */}
            <div className="hidden md:flex items-center gap-1.5 pl-3 ml-2 border-l border-white/[0.06] text-xs">
              <span className="text-tx-tertiary">Operations</span>
              <ChevronRight className="w-3.5 h-3.5 text-tx-tertiary" />
              <span className="text-tx-primary font-semibold">{activeTabObj.label}</span>
            </div>
          </div>

          {/* ── Center: Navigation Tabs — desktop ── */}
          <nav className="hidden lg:flex items-center gap-1 bg-[#0D0D14]/80 p-1 rounded-xl border border-white/[0.06]">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabClick(tab.id)}
                  className={`relative flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold transition-all duration-150 rounded-lg ${
                    isActive
                      ? 'bg-accent text-white shadow-sm'
                      : 'text-tx-secondary hover:text-tx-primary hover:bg-white/[0.04]'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-tx-tertiary'}`} />
                  <span>{tab.label}</span>

                  {tab.showBadge && pendingActionCount > 0 && (
                    <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-bold ${
                      isActive ? 'bg-white text-accent' : 'bg-danger text-white animate-pulse'
                    }`}>
                      {pendingActionCount}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* ── Right Zone: System Health + Notifications + User ── */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Quick Cmd+K button */}
            <button
              onClick={onOpenCommandPalette}
              className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-tx-tertiary hover:text-tx-secondary hover:bg-white/[0.04] transition-colors border border-white/[0.06] text-xs"
              title="Command Palette"
            >
              <Command className="w-3 h-3" />
              <span className="text-[10px] font-mono">⌘K</span>
            </button>

            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="relative p-2 rounded-lg text-tx-tertiary hover:text-tx-primary hover:bg-white/[0.04] transition-colors"
                title="Activity & Notifications"
              >
                <Bell className="w-4 h-4" />
                {pendingActionCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-danger text-[9px] font-bold text-white flex items-center justify-center animate-pulse">
                    {pendingActionCount}
                  </span>
                )}
              </button>

              {/* Notification Popover */}
              <NotificationsPopover
                isOpen={notificationsOpen}
                onClose={() => setNotificationsOpen(false)}
                queue={queue}
                auditTrail={auditTrail}
                onNavigateTab={handleTabClick}
              />
            </div>

            {/* Live Engine Status */}
            <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-md bg-success/10 border border-success/20 text-[10px] font-mono text-success">
              <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse-dot" />
              <span>Live Engine</span>
            </div>

            {/* Refresh */}
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="p-2 rounded-lg text-tx-tertiary hover:text-tx-primary hover:bg-white/[0.04] transition-colors"
              title="Sync Ledger Data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-accent' : ''}`} />
            </button>

            {/* User Avatar */}
            <div className="flex items-center gap-2 pl-2 sm:pl-3 ml-1 sm:ml-2 border-l border-white/[0.06]">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent to-purple-600 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                H
              </div>
              <div className="hidden md:flex flex-col text-left">
                <span className="text-[12px] font-semibold text-tx-primary leading-tight">Harsh</span>
                <span className="text-[10px] text-tx-tertiary leading-tight">Finance Operations</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ── Mobile Drawer Overlay ── */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" onClick={() => setMobileOpen(false)}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
        </div>
      )}

      {/* ── Mobile Drawer ── */}
      <div
        className={`fixed top-[62px] left-0 bottom-0 w-72 z-50 lg:hidden transition-transform duration-300 ease-out bg-[#0D0D14] border-r border-white/[0.08] flex flex-col justify-between ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <nav className="p-4 space-y-1.5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-tx-tertiary px-3 mb-2">Navigation</p>
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-semibold transition-all min-h-[44px] ${
                  isActive
                    ? 'bg-accent text-white shadow-sm'
                    : 'text-tx-secondary hover:text-tx-primary hover:bg-white/[0.03]'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-tx-tertiary'}`} />
                <span>{tab.label}</span>
                {tab.showBadge && pendingActionCount > 0 && (
                  <span className={`ml-auto px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    isActive ? 'bg-white text-accent' : 'bg-danger text-white'
                  }`}>
                    {pendingActionCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Drawer Footer */}
        <div className="p-4 border-t border-white/[0.06] bg-[#131320]/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent to-purple-600 flex items-center justify-center text-white text-xs font-bold">
              H
            </div>
            <div>
              <p className="text-xs font-bold text-tx-primary">Harsh</p>
              <p className="text-[10px] text-tx-tertiary">Finance Ops · Razorpay Live</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
