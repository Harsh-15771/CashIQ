import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Zap, ShieldCheck, Users, FlaskConical, BookOpen, RefreshCw, Command } from 'lucide-react';

const COMMANDS = [
  { id: 'demolab',        label: 'Go to Decision Lab',   icon: Zap,          tab: 'demolab' },
  { id: 'control_center', label: 'Go to Control Center',  icon: ShieldCheck,  tab: 'control_center' },
  { id: 'debtor_twin',    label: 'Go to Debtor Twins',    icon: Users,        tab: 'debtor_twin' },
  { id: 'experiments',    label: 'Go to A/B Evidence',    icon: FlaskConical, tab: 'experiments' },
  { id: 'invoices',       label: 'Go to Ledger',          icon: BookOpen,     tab: 'invoices' },
  { id: 'refresh',        label: 'Refresh Ledger Data',   icon: RefreshCw,    action: 'refresh' },
];

export default function CommandPalette({ isOpen, onClose, onNavigate, onRefresh }) {
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);

  const filtered = COMMANDS.filter(c =>
    c.label.toLowerCase().includes(query.toLowerCase())
  );

  const handleSelect = useCallback((cmd) => {
    if (cmd.tab) {
      onNavigate(cmd.tab);
    } else if (cmd.action === 'refresh') {
      onRefresh();
    }
    onClose();
    setQuery('');
  }, [onNavigate, onRefresh, onClose]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
    if (!isOpen) setQuery('');
  }, [isOpen]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key === 'Enter' && filtered.length > 0) {
        handleSelect(filtered[0]);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, filtered, onClose, handleSelect]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        style={{ animation: 'fadeIn 0.15s ease both' }}
      />

      {/* Palette */}
      <div
        className="fixed top-[20%] left-1/2 -translate-x-1/2 z-[91] w-full max-w-lg"
        style={{ animation: 'fadeSlideUp 0.2s cubic-bezier(0.16, 1, 0.3, 1) both' }}
      >
        <div className="card-elevated overflow-hidden rounded-2xl" style={{ boxShadow: '0 25px 50px -12px rgba(0,0,0,0.8)' }}>
          {/* Search Input */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-white/[0.06]">
            <Search className="w-5 h-5 text-tx-tertiary flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type a command..."
              className="flex-1 bg-transparent text-[15px] text-tx-primary placeholder:text-tx-tertiary focus:outline-none"
            />
            <kbd className="px-2 py-0.5 text-[10px] font-mono text-tx-tertiary bg-white/[0.04] rounded border border-white/[0.06]">ESC</kbd>
          </div>

          {/* Results */}
          <div className="py-2 max-h-[300px] overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="px-5 py-4 text-sm text-tx-tertiary text-center">No commands found</p>
            ) : (
              filtered.map((cmd, idx) => {
                const Icon = cmd.icon;
                return (
                  <button
                    key={cmd.id}
                    onClick={() => handleSelect(cmd)}
                    className={`w-full flex items-center gap-3 px-5 py-3 text-left text-sm transition-colors hover:bg-white/[0.04] ${
                      idx === 0 ? 'bg-accent/[0.06] text-tx-primary' : 'text-tx-secondary'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${idx === 0 ? 'text-accent' : 'text-tx-tertiary'}`} />
                    <span className="flex-1">{cmd.label}</span>
                    {idx === 0 && (
                      <span className="text-[10px] text-tx-tertiary font-mono">↵ Enter</span>
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="px-5 py-2.5 border-t border-white/[0.04] flex items-center justify-between">
            <div className="flex items-center gap-3 text-[10px] text-tx-tertiary">
              <span className="flex items-center gap-1">
                <Command className="w-3 h-3" />K to toggle
              </span>
              <span>↵ to select</span>
              <span>ESC to close</span>
            </div>
            <span className="text-[10px] text-tx-tertiary font-mono">CashIQ</span>
          </div>
        </div>
      </div>
    </>
  );
}
