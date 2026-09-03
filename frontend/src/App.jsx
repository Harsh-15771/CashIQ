import React, { useState, useEffect, useCallback } from 'react';
import { MobileNav, ProductTopbar } from './components/ProductSidebar';
import ProductSidebar from './components/ProductSidebar';
import LandingPage from './components/LandingPage';
import HomeTab from './components/HomeTab';
import ActionReviewDrawer from './components/ActionReviewDrawer';
import ReceivablesBanner from './components/ReceivablesBanner';
import OverviewCards from './components/OverviewCards';
import ActionQueueTab from './components/ActionQueueTab';
import InvoicesTab from './components/InvoicesTab';
import Screen2_DebtorTwin from './components/Screen2_DebtorTwin';
import Screen3_DemoLab from './components/Screen3_DemoLab';
import Screen4_ExperimentLab from './components/Screen4_ExperimentLab';
import CommandPalette from './components/CommandPalette';
import WhyCashIQModal from './components/WhyCashIQModal';
import ExecutiveSummaryModal from './components/ExecutiveSummaryModal';
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
  approveAction,
  rejectAction,
  evaluateDecision,
  replayDecision,
  runExperiment,
} from './api';

/* ── Tab Titles ── */
const TAB_TITLES = {
  welcome: 'CashIQ',
  home: 'Home',
  demolab: 'Decision Lab',
  control_center: 'Control Center',
  debtor_twin: 'Debtor Twins',
  experiments: 'A/B Evidence',
  invoices: 'Ledger',
};

/* ── Hash-based routing helpers ── */
function getTabFromHash() {
  const hash = window.location.hash.replace('#', '');
  return TAB_TITLES[hash] ? hash : 'welcome';
}

function AppInner() {
  const [activeTab, setActiveTab] = useState(getTabFromHash);
  const [userRole, setUserRole] = useState('ops'); // 'ops' | 'cfo'
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
  const [reviewingAction, setReviewingAction] = useState(null);
  const [isApprovingReview, setIsApprovingReview] = useState(false);
  const [isExecutiveModalOpen, setIsExecutiveModalOpen] = useState(false);
  const [isWhyModalOpen, setIsWhyModalOpen] = useState(false);
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
    window.scrollTo({ top: 0, behavior: 'auto' });
    document.title = `CashIQ · ${TAB_TITLES[tabId] || 'Dashboard'}`;
  }, []);

  useEffect(() => {
    const handleHash = () => {
      const tab = getTabFromHash();
      setActiveTab(tab);
      window.scrollTo({ top: 0, behavior: 'auto' });
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

  if (activeTab === 'welcome') {
    return <LandingPage onEnterApp={() => navigateToTab('home')} />;
  }

  return (
    <div className="min-h-screen bg-canvas text-tx-primary flex font-sans selection:bg-accent selection:text-white">
      <ProductSidebar
        activeTab={activeTab}
        onNavigate={navigateToTab}
        pendingActionCount={queue.length}
        onOpenWhyModal={() => setIsWhyModalOpen(true)}
        onOpenExecutiveModal={() => setIsExecutiveModalOpen(true)}
        role={userRole}
        onRoleChange={setUserRole}
      />

      <div className="min-w-0 flex-1 flex flex-col">
      <ProductTopbar
        onNavigate={navigateToTab}
        pendingActionCount={queue.length}
        isRefreshing={isRefreshing}
        onRefresh={() => loadData(true)}
        onOpenCommandPalette={() => setCommandPaletteOpen(true)}
        onOpenWhyModal={() => setIsWhyModalOpen(true)}
        onOpenExecutiveModal={() => setIsExecutiveModalOpen(true)}
      />

      {/* Why CashIQ Modal */}
      <WhyCashIQModal
        isOpen={isWhyModalOpen}
        onClose={() => setIsWhyModalOpen(false)}
      />

      {/* 60s Executive Summary Modal */}
      <ExecutiveSummaryModal
        isOpen={isExecutiveModalOpen}
        onClose={() => setIsExecutiveModalOpen(false)}
        stats={stats}
        forecastData={forecastData}
        onLaunchDemo={() => navigateToTab('demolab')}
        onNavigate={navigateToTab}
      />

      {/* Command Palette */}
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        onNavigate={navigateToTab}
        onRefresh={() => loadData(true)}
      />
      <ActionReviewDrawer
        item={reviewingAction}
        isApproving={isApprovingReview}
        userRole={userRole}
        onClose={() => setReviewingAction(null)}
        onApprove={async () => {
          const action = reviewingAction;
          if (!action) return;
          try {
            setIsApprovingReview(true);
            await approveAction(
              action.invoice_id,
              action.recommended_action,
              userRole === 'cfo' ? 'cfo_controller' : 'credit_ops_lead'
            );
            setReviewingAction(null);
            loadData();
            toast.success(`${action.invoice_id} ${userRole === 'cfo' ? 'authorized by CFO' : 'approved'}`);
          } catch {
            toast.error('Unable to approve this action. Please try again.');
          } finally {
            setIsApprovingReview(false);
          }
        }}
        onReject={async () => {
          const action = reviewingAction;
          if (!action) return;
          try {
            await rejectAction(
              action.invoice_id,
              action.recommended_action,
              userRole === 'cfo' ? 'cfo_controller' : 'credit_ops_lead'
            );
            setReviewingAction(null);
            loadData();
            toast.success(`${action.invoice_id} rejected`);
          } catch {
            toast.error('Unable to reject this action. Please try again.');
          }
        }}
      />

      {/* Main Content */}
      <main className="flex-1 max-w-[1500px] w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 pb-24 lg:pb-10">
        {!isOnline && (
          <div className="mb-5 bg-warning/10 border border-warning/25 rounded-xl px-4 py-2.5 text-center text-xs text-warning font-medium animate-fade-up">
            Backend offline — showing the last available workspace snapshot.
          </div>
        )}

        {/* Tab Content with mount animation */}
        <ErrorBoundary key={`error-${activeTab}`}>
          <div key={activeTab} className="animate-fade-up">
            {activeTab === 'home' && (
              <HomeTab
                stats={stats}
                queue={queue}
                invoices={invoices}
                forecastData={forecastData}
                onNavigate={navigateToTab}
              />
            )}

            {activeTab === 'demolab' && (
              <div className="space-y-5">
                <div><p className="text-xs font-semibold uppercase tracking-[0.1em] text-accent-hover">Intelligence</p><h1 className="mt-1 text-2xl font-bold tracking-tight">Decision review</h1><p className="mt-1 text-sm text-tx-secondary">Inspect the decision engine’s recommendation and supporting evidence.</p></div>
                <Screen3_DemoLab onEvaluateDecision={async (payload) => { const res = await evaluateDecision(payload); loadData(); toast.success(`Decision evaluated: ${res.selected_action}`); return res; }} />
              </div>
            )}

            {activeTab === 'control_center' && (
              <ActionQueueTab
                queue={queue}
                auditTrail={auditTrail}
                onActionCompleted={(msg) => { loadData(); toast.success(msg || 'Action approved'); }}
                onReviewAction={setReviewingAction}
                userRole={userRole}
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
              <div className="space-y-5">
                <div><p className="text-xs font-semibold uppercase tracking-[0.1em] text-accent-hover">Receivables</p><h1 className="mt-1 text-2xl font-bold tracking-tight">Invoice workspace</h1><p className="mt-1 text-sm text-tx-secondary">Track outstanding invoices and payment expectations in one place.</p></div>
                <ReceivablesBanner decomposition={decomposition} />
                <OverviewCards stats={stats} />
                <InvoicesTab invoices={invoices} forecastData={forecastData} />
              </div>
            )}
          </div>
        </ErrorBoundary>
      </main>

      {/* Footer */}
      <footer className="border-t border-surface-border py-3 sm:py-4 px-4 sm:px-8 max-w-[1500px] mx-auto w-full">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
          <span className="text-[11px] text-tx-tertiary">
            Cash<span className="text-accent font-semibold">IQ</span>
            <span className="mx-1.5 text-surface-border">·</span>
            Receivables intelligence for modern finance teams
          </span>
          <div className="flex items-center gap-2 flex-wrap justify-center">
            <span className="text-[10px] text-tx-tertiary">Policy-controlled recommendations</span>
            <span className="text-[10px] text-tx-tertiary hidden sm:inline">
              <kbd className="px-1 py-0.5 bg-white/[0.04] rounded border border-white/[0.06] text-[9px] font-mono">⌘K</kbd> Command Palette
            </span>
          </div>
        </div>
      </footer>
      <MobileNav activeTab={activeTab} onNavigate={navigateToTab} pendingActionCount={queue.length} />
      </div>
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
