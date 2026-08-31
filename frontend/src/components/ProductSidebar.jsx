import React from 'react';
import {
  Activity, Bell, BookOpen, BrainCircuit, ChartNoAxesCombined, ChevronDown,
  CircleHelp, FileText, FlaskConical, LayoutDashboard, Settings, ShieldCheck,
  Users, Zap,
} from 'lucide-react';

const primaryItems = [
  { id: 'home', label: 'Home', icon: LayoutDashboard },
  { id: 'control_center', label: 'Action Center', icon: ShieldCheck, badge: true },
  { id: 'invoices', label: 'Receivables', icon: FileText },
  { id: 'debtor_twin', label: 'Customers', icon: Users },
  { id: 'forecast', label: 'Forecast', icon: ChartNoAxesCombined },
];

const intelligenceItems = [
  { id: 'demolab', label: 'Decision review', icon: Zap },
  { id: 'experiments', label: 'Performance evidence', icon: FlaskConical },
];

function NavigationItem({ item, activeTab, onNavigate, pendingActionCount }) {
  const Icon = item.icon;
  const isActive = activeTab === item.id;
  const isDisabled = item.id === 'forecast';

  return (
    <button
      type="button"
      onClick={() => !isDisabled && onNavigate(item.id)}
      disabled={isDisabled}
      className={`w-full group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${isActive
        ? 'bg-accent text-white shadow-accent-sm'
        : isDisabled
          ? 'text-tx-tertiary/50 cursor-not-allowed'
          : 'text-tx-secondary hover:bg-white/[0.05] hover:text-tx-primary'
      }`}
    >
      <Icon className="w-4 h-4 flex-none" strokeWidth={isActive ? 2.4 : 2} />
      <span className="flex-1 text-left font-medium">{item.label}</span>
      {item.badge && pendingActionCount > 0 && (
        <span className={`min-w-5 h-5 px-1 rounded-full flex items-center justify-center text-[10px] font-bold ${isActive ? 'bg-white/20 text-white' : 'bg-danger text-white'}`}>
          {pendingActionCount > 9 ? '9+' : pendingActionCount}
        </span>
      )}
      {isDisabled && <span className="text-[9px] uppercase tracking-wider">Soon</span>}
    </button>
  );
}

export default function ProductSidebar({ activeTab, onNavigate, pendingActionCount }) {
  return (
    <aside className="hidden lg:flex w-[252px] shrink-0 sticky top-0 h-screen flex-col border-r border-white/[0.07] bg-[#090911] px-3 py-5">
      <button type="button" onClick={() => onNavigate('home')} className="px-3 mb-8 flex items-center gap-3 text-left">
        <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent to-[#8b5cf6] flex items-center justify-center shadow-accent-sm">
          <Activity className="w-5 h-5 text-white" />
        </span>
        <span>
          <span className="block text-[17px] leading-none font-bold tracking-tight text-tx-primary">Cash<span className="text-accent-hover">IQ</span></span>
          <span className="block mt-1 text-[10px] uppercase tracking-[0.12em] font-semibold text-tx-tertiary">Receivables OS</span>
        </span>
      </button>

      <nav className="space-y-1" aria-label="Primary navigation">
        {primaryItems.map((item) => <NavigationItem key={item.id} item={item} activeTab={activeTab} onNavigate={onNavigate} pendingActionCount={pendingActionCount} />)}
      </nav>

      <p className="mt-7 px-3 mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-tx-tertiary">Intelligence</p>
      <nav className="space-y-1" aria-label="Intelligence navigation">
        {intelligenceItems.map((item) => <NavigationItem key={item.id} item={item} activeTab={activeTab} onNavigate={onNavigate} pendingActionCount={pendingActionCount} />)}
      </nav>

      <div className="mt-auto space-y-1 pt-5 border-t border-white/[0.06]">
        <button type="button" className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-tx-secondary hover:bg-white/[0.05] hover:text-tx-primary">
          <BookOpen className="w-4 h-4" /><span className="font-medium">Knowledge base</span>
        </button>
        <button type="button" className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-tx-secondary hover:bg-white/[0.05] hover:text-tx-primary">
          <Settings className="w-4 h-4" /><span className="font-medium">Settings</span>
        </button>
        <button type="button" className="w-full flex items-center gap-3 px-3 py-2.5 mt-2 rounded-xl bg-white/[0.035] border border-white/[0.05] text-left">
          <span className="w-7 h-7 rounded-full bg-gradient-to-br from-[#818cf8] to-[#c084fc] flex items-center justify-center text-[11px] font-bold text-white">H</span>
          <span className="min-w-0 flex-1"><span className="block text-xs font-semibold text-tx-primary truncate">Harsh</span><span className="block text-[10px] text-tx-tertiary truncate">Finance operations</span></span>
          <ChevronDown className="w-3.5 h-3.5 text-tx-tertiary" />
        </button>
      </div>
    </aside>
  );
}

export function ProductTopbar({ onOpenCommandPalette, onRefresh, isRefreshing, pendingActionCount, onNavigate }) {
  return (
    <header className="sticky top-0 z-40 h-16 flex items-center justify-between px-4 sm:px-6 border-b border-white/[0.07] bg-[#090911]/85 backdrop-blur-xl">
      <button type="button" onClick={() => onNavigate('home')} className="lg:hidden flex items-center gap-2">
        <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent to-[#8b5cf6] flex items-center justify-center"><Activity className="w-4 h-4 text-white" /></span>
        <span className="font-bold text-tx-primary">Cash<span className="text-accent-hover">IQ</span></span>
      </button>
      <div className="hidden lg:block"><p className="text-xs text-tx-tertiary">Northstar Commerce Pvt. Ltd.</p></div>
      <button type="button" onClick={onOpenCommandPalette} className="hidden sm:flex w-[min(360px,35vw)] items-center gap-2.5 px-3 py-2 rounded-lg bg-white/[0.035] border border-white/[0.07] text-tx-tertiary hover:border-white/[0.14] hover:text-tx-secondary transition-colors">
        <BrainCircuit className="w-4 h-4" /><span className="text-xs flex-1 text-left">Search customers, invoices, or actions</span><kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/[0.06]">⌘ K</kbd>
      </button>
      <div className="flex items-center gap-2 sm:gap-3 ml-auto">
        <button type="button" onClick={onRefresh} title="Refresh workspace" className="p-2 rounded-lg text-tx-tertiary hover:text-tx-primary hover:bg-white/[0.05]">
          <Activity className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-accent' : ''}`} />
        </button>
        <button type="button" onClick={() => onNavigate('control_center')} className="relative p-2 rounded-lg text-tx-tertiary hover:text-tx-primary hover:bg-white/[0.05]" title="Action Center">
          <Bell className="w-4 h-4" />
          {pendingActionCount > 0 && <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-danger text-[9px] font-bold text-white flex items-center justify-center">{pendingActionCount}</span>}
        </button>
        <span className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border border-success/20 bg-success/[0.06] text-[10px] font-medium text-success"><span className="w-1.5 h-1.5 rounded-full bg-success" />Live data</span>
        <CircleHelp className="hidden sm:block w-4 h-4 text-tx-tertiary" />
      </div>
    </header>
  );
}

export function MobileNav({ activeTab, onNavigate, pendingActionCount }) {
  const items = primaryItems.filter((item) => item.id !== 'forecast');
  return <nav className="lg:hidden fixed z-50 bottom-0 inset-x-0 flex justify-around px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] bg-[#090911]/95 backdrop-blur-xl border-t border-white/[0.08]" aria-label="Mobile navigation">
    {items.map((item) => {
      const Icon = item.icon;
      const isActive = item.id === activeTab;
      return <button key={item.id} type="button" onClick={() => onNavigate(item.id)} className={`relative min-w-[62px] px-2 py-1.5 rounded-lg flex flex-col items-center gap-1 text-[9px] font-medium ${isActive ? 'text-accent-hover' : 'text-tx-tertiary'}`}>
        <Icon className="w-4 h-4" strokeWidth={isActive ? 2.6 : 2} />
        <span>{item.label.replace('Action Center', 'Actions')}</span>
        {item.badge && pendingActionCount > 0 && <span className="absolute top-0 right-2 min-w-4 h-4 px-1 rounded-full bg-danger text-[8px] text-white grid place-items-center">{pendingActionCount}</span>}
      </button>;
    })}
  </nav>;
}
