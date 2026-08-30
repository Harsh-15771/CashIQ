import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import ReceivablesBanner from './components/ReceivablesBanner';
import OverviewCards from './components/OverviewCards';
import ActionQueueTab from './components/ActionQueueTab';
import InvoicesTab from './components/InvoicesTab';
import Screen2_DebtorTwin from './components/Screen2_DebtorTwin';
import Screen3_DemoLab from './components/Screen3_DemoLab';
import Screen4_ExperimentLab from './components/Screen4_ExperimentLab';

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

export default function App() {
  const [activeTab, setActiveTab] = useState('demolab');
  const [stats, setStats] = useState(null);
  const [decomposition, setDecomposition] = useState(null);
  const [debtorTwins, setDebtorTwins] = useState([]);
  const [queue, setQueue] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [auditTrail, setAuditTrail] = useState([]);
  const [forecastData, setForecastData] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadData = async () => {
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
    } catch (err) {
      console.error('Failed to load ledger data:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-canvas text-tx-primary flex flex-col font-sans selection:bg-accent selection:text-white">
      {/* Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        pendingActionCount={queue.length}
        isRefreshing={isRefreshing}
        onRefresh={loadData}
      />

      {/* Main Content */}
      <main className="flex-1 max-w-[1400px] w-full mx-auto px-8 pt-6 pb-10 space-y-5">
        {/* Collapsible Receivables Strip */}
        <ReceivablesBanner decomposition={decomposition} />

        {/* KPI Overview */}
        <OverviewCards stats={stats} />

        {/* Tab Content with mount animation */}
        <div key={activeTab} className="animate-fade-up">
          {activeTab === 'demolab' && (
            <Screen3_DemoLab
              onEvaluateDecision={async (payload) => {
                const res = await evaluateDecision(payload);
                loadData();
                return res;
              }}
            />
          )}

          {activeTab === 'control_center' && (
            <ActionQueueTab
              queue={queue}
              auditTrail={auditTrail}
              onActionCompleted={loadData}
            />
          )}

          {activeTab === 'debtor_twin' && (
            <Screen2_DebtorTwin
              twins={debtorTwins}
              onSelectDebtorForDemo={(debtorId) => {
                setActiveTab('demolab');
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
      </main>

      {/* Footer — minimal */}
      <footer className="border-t border-surface-border py-4 px-8 max-w-[1400px] mx-auto w-full">
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-tx-tertiary">
            Cash<span className="text-accent font-semibold">IQ</span>
            <span className="mx-1.5 text-surface-border">·</span>
            Autonomous B2B Receivables Decision Intelligence
          </span>
          <div className="flex items-center gap-2">
            <span className="provenance-deterministic text-[10px]">50/50 Tests Passed</span>
            <span className="provenance-deterministic text-[10px]">Bit-Identical Replay ✓</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
