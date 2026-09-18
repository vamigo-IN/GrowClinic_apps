import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export default function Toast({ toast, onClose }) {
  if (!toast) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '24px',
      right: '24px',
      zIndex: 2000,
      background: 'var(--bg-secondary)',
      border: `1px solid ${toast.type === 'error' ? '#ef4444' : 'var(--gc-emerald)'}`,
      borderRadius: 'var(--radius-md)',
      padding: '14px 20px',
      boxShadow: 'var(--shadow-lg)',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      color: 'var(--text-main)',
      fontSize: '14px',
      fontWeight: '600',
      animation: 'slideUp 0.3s ease'
    }}>
      {toast.type === 'error' ? (
        <AlertCircle color="#ef4444" size={20} />
      ) : (
        <CheckCircle2 color="var(--gc-emerald)" size={20} />
      )}
      <span>{toast.message}</span>
      <button 
        onClick={onClose}
        style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', marginLeft: '8px' }}
      >
        <X size={16} />
      </button>
    </div>
  );
}
