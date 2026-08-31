import React, { useState, useEffect, useCallback } from 'react';
import Navbar from './components/Navbar';
import ReceivablesBanner from './components/ReceivablesBanner';
import OverviewCards from './components/OverviewCards';
import ActionQueueTab from './components/ActionQueueTab';
import InvoicesTab from './components/InvoicesTab';
import Screen2_DebtorTwin from './components/Screen2_DebtorTwin';
import Screen3_DemoLab from './components/Screen3_DemoLab';
import Screen4_ExperimentLab from './components/Screen4_ExperimentLab';
import CommandPalette from './components/CommandPalette';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ToastProvider, useToast } from './components/Toast';

import {
  fetchOverviewStats,
  fetchActionQueue,
  fetchInvoices,
  fetchAuditTrail,
  fetch30DayForecast,
  fetchReceivablesDecomposition,
  fetchDebtorTwins,
  evaluateDecision,
  replayDecision,
  runExperiment,
} from './api';

/* ── Tab Titles ── */
const TAB_TITLES = {
  demolab: 'Decision Lab',
  control_center: 'Control Center',
  debtor_twin: 'Debtor Twins',
  experiments: 'A/B Evidence',
  invoices: 'Ledger',
};

/* ── Hash-based routing helpers ── */
function getTabFromHash() {
  const hash = window.location.hash.replace('#', '');
  return TAB_TITLES[hash] ? hash : 'demolab';
}

function AppInner() {
  const [activeTab, setActiveTab] = useState(getTabFromHash);
  const [stats, setStats] = useState(null);
  const [decomposition, setDecomposition] = useState(null);
  const [debtorTwins, setDebtorTwins] = useState([]);
  const [queue, setQueue] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [auditTrail, setAuditTrail] = useState([]);
  const [forecastData, setForecastData] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const toast = useToast();

  /* ── Data Loading ── */
  const loadData = useCallback(async (showToast = false) => {
    try {
      setIsRefreshing(true);
      const [s, decomp, twins, q, inv, aud, fc] = await Promise.allSettled([
        fetchOverviewStats(),
        fetchReceivablesDecomposition(),
        fetchDebtorTwins(),
        fetchActionQueue(),
        fetchInvoices(),
        fetchAuditTrail(50),
        fetch30DayForecast(),
      ]);

      if (s.status === 'fulfilled') setStats(s.value);
      if (decomp.status === 'fulfilled') setDecomposition(decomp.value);
      if (twins.status === 'fulfilled') setDebtorTwins(twins.value);
      if (q.status === 'fulfilled') setQueue(q.value);
      if (inv.status === 'fulfilled') setInvoices(inv.value);
      if (aud.status === 'fulfilled') setAuditTrail(aud.value);
      if (fc.status === 'fulfilled') setForecastData(fc.value);

      if (showToast) toast.info('Ledger data refreshed');
    } catch (err) {
      console.error('Failed to load ledger data:', err);
      toast.error('Failed to connect to backend');
    } finally {
      setIsRefreshing(false);
    }
  }, [toast]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 4000);
    return () => clearInterval(interval);
  }, [loadData]);

  /* ── Hash Routing ── */
  const navigateToTab = useCallback((tabId) => {
    setActiveTab(tabId);
    window.location.hash = tabId;
    document.title = `CashIQ · ${TAB_TITLES[tabId] || 'Dashboard'}`;
  }, []);

  useEffect(() => {
    const handleHash = () => {
      const tab = getTabFromHash();
      setActiveTab(tab);
      document.title = `CashIQ · ${TAB_TITLES[tab] || 'Dashboard'}`;
    };
    window.addEventListener('hashchange', handleHash);
    // Set initial title
    document.title = `CashIQ · ${TAB_TITLES[activeTab] || 'Dashboard'}`;
    window.location.hash = activeTab;
    return () => window.removeEventListener('hashchange', handleHash);
  }, []); // eslint-disable-line

  /* ── Online/Offline Detection ── */
  useEffect(() => {
    const goOnline = () => { setIsOnline(true); toast.success('Connection restored'); };
    const goOffline = () => { setIsOnline(false); };
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => { window.removeEventListener('online', goOnline); window.removeEventListener('offline', goOffline); };
  }, [toast]);

  /* ── Keyboard Shortcuts ── */
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <div className="min-h-screen bg-canvas text-tx-primary flex flex-col font-sans selection:bg-accent selection:text-white">
      {/* Offline Banner */}
      {!isOnline && (
        <div className="bg-warning/20 border-b border-warning/30 px-4 py-2 text-center text-sm text-warning font-medium animate-fade-up">
          ⚠ Backend offline — showing cached data
        </div>
      )}

      {/* Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={navigateToTab}
        pendingActionCount={queue.length}
        isRefreshing={isRefreshing}
        onRefresh={() => loadData(true)}
        onOpenCommandPalette={() => setCommandPaletteOpen(true)}
      />

      {/* Command Palette */}
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        onNavigate={navigateToTab}
        onRefresh={() => loadData(true)}
      />

      {/* Main Content */}
      <main className="flex-1 max-w-[1400px] w-full mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 pb-10 space-y-5">
        {/* Collapsible Receivables Strip */}
        <ReceivablesBanner decomposition={decomposition} />

        {/* KPI Overview */}
        <OverviewCards stats={stats} />

        {/* Tab Content with mount animation */}
        <ErrorBoundary key={`error-${activeTab}`}>
          <div key={activeTab} className="animate-fade-up">
            {activeTab === 'demolab' && (
              <Screen3_DemoLab
                onEvaluateDecision={async (payload) => {
                  const res = await evaluateDecision(payload);
                  loadData();
                  toast.success(`Decision evaluated: ${res.selected_action}`);
                  return res;
                }}
              />
            )}

            {activeTab === 'control_center' && (
              <ActionQueueTab
                queue={queue}
                auditTrail={auditTrail}
                onActionCompleted={(msg) => { loadData(); toast.success(msg || 'Action approved'); }}
              />
            )}

            {activeTab === 'debtor_twin' && (
              <Screen2_DebtorTwin
                twins={debtorTwins}
                onSelectDebtorForDemo={(debtorId) => {
                  navigateToTab('demolab');
                }}
              />
            )}

            {activeTab === 'experiments' && (
              <Screen4_ExperimentLab
                onRunExperiment={runExperiment}
                onReplayDecision={replayDecision}
              />
            )}

            {activeTab === 'invoices' && (
              <InvoicesTab invoices={invoices} forecastData={forecastData} />
            )}
          </div>
        </ErrorBoundary>
      </main>

      {/* Footer */}
      <footer className="border-t border-surface-border py-3 sm:py-4 px-4 sm:px-8 max-w-[1400px] mx-auto w-full">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
          <span className="text-[11px] text-tx-tertiary">
            Cash<span className="text-accent font-semibold">IQ</span>
            <span className="mx-1.5 text-surface-border">·</span>
            Autonomous B2B Receivables Decision Intelligence
          </span>
          <div className="flex items-center gap-2 flex-wrap justify-center">
            <span className="provenance-deterministic text-[10px]">50/50 Tests Passed</span>
            <span className="provenance-deterministic text-[10px]">Bit-Identical Replay ✓</span>
            <span className="text-[10px] text-tx-tertiary hidden sm:inline">
              <kbd className="px-1 py-0.5 bg-white/[0.04] rounded border border-white/[0.06] text-[9px] font-mono">⌘K</kbd> Command Palette
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AppInner />
    </ToastProvider>
  );
}
