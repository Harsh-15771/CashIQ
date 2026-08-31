import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

export function useToast() {
  return useContext(ToastContext);
}

const ICONS = {
  success: CheckCircle2,
  error: AlertTriangle,
  info: Info,
};

const COLORS = {
  success: { bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.3)', text: '#10B981' },
  error:   { bg: 'rgba(239,68,68,0.12)',  border: 'rgba(239,68,68,0.3)',  text: '#EF4444' },
  info:    { bg: 'rgba(99,102,241,0.12)',  border: 'rgba(99,102,241,0.3)', text: '#6366F1' },
};

function Toast({ id, type, message, onDismiss }) {
  const [isLeaving, setIsLeaving] = useState(false);
  const Icon = ICONS[type] || Info;
  const color = COLORS[type] || COLORS.info;

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLeaving(true);
      setTimeout(() => onDismiss(id), 300);
    }, 4000);
    return () => clearTimeout(timer);
  }, [id, onDismiss]);

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm max-w-sm shadow-elevated transition-all duration-300 ${
        isLeaving ? 'opacity-0 translate-x-6' : 'opacity-100 translate-x-0'
      }`}
      style={{
        backgroundColor: '#131320',
        border: `1px solid ${color.border}`,
        animation: isLeaving ? undefined : 'fadeSlideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1) both',
      }}
    >
      <Icon className="w-4 h-4 flex-shrink-0" style={{ color: color.text }} />
      <span className="text-tx-primary text-[13px] flex-1">{message}</span>
      <button
        onClick={() => { setIsLeaving(true); setTimeout(() => onDismiss(id), 300); }}
        className="text-tx-tertiary hover:text-tx-primary transition-colors p-0.5"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((type, message) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, type, message }]);
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const toast = {
    success: (msg) => addToast('success', msg),
    error: (msg) => addToast('error', msg),
    info: (msg) => addToast('info', msg),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {/* Toast Container */}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col-reverse gap-2 pointer-events-auto">
        {toasts.map(t => (
          <Toast key={t.id} id={t.id} type={t.type} message={t.message} onDismiss={dismissToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}
