import React, { useState } from 'react';
import { AlertTriangle, ShieldCheck, ArrowRight, X, CheckCircle2 } from 'lucide-react';

export default function ProtectedConsentModal({ isOpen, onClose, fieldName, currentValue, proposedValue, impactNote, onConfirm }) {
  const [agreed, setAgreed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleApprove = () => {
    if (!agreed) return;
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      onConfirm({
        field: fieldName,
        before: currentValue,
        after: proposedValue,
        timestamp: new Date().toISOString(),
        status: 'Consent recorded — pending Google publish',
        googleResultCode: null
      });
      onClose();
    }, 1000);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content" 
        style={{ maxWidth: '580px', border: '1px solid var(--gc-amber)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ padding: '8px', background: 'rgba(251, 188, 4, 0.15)', borderRadius: '10px', color: 'var(--gc-amber)' }}>
              <AlertTriangle size={22} />
            </div>
            <div>
              <h3 style={{ fontSize: '17px', fontWeight: '800', color: 'var(--text-main)' }}>Protected Profile Edit Consent</h3>
              <span className="badge badge-amber" style={{ marginTop: '2px' }}>Requires Owner Approval</span>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {/* Policy Warning Banner */}
        <div style={{ background: 'rgba(251, 188, 4, 0.08)', border: '1px solid rgba(251, 188, 4, 0.3)', padding: '12px 16px', borderRadius: '10px', fontSize: '13px', color: 'var(--text-main)', marginBottom: '20px' }}>
          <strong>Google Business Profile Rule:</strong> Changing protected core identity fields ({fieldName}) requires explicit owner confirmation. Gmb will never alter these fields automatically.
        </div>

        {/* Before / After Comparison Card */}
        <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
          <div style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: '10px' }}>
            Target Field: <span style={{ color: 'var(--gc-blue)' }}>{fieldName}</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 30px 1fr', gap: '10px', alignItems: 'center' }}>
            {/* Current Value */}
            <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '12px', borderRadius: '8px' }}>
              <div style={{ fontSize: '11px', color: 'var(--gc-danger)', fontWeight: '700', marginBottom: '4px' }}>CURRENT GOOGLE VALUE</div>
              <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-main)' }}>{currentValue || '(Empty)'}</div>
            </div>

            <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
              <ArrowRight size={18} />
            </div>

            {/* Proposed Value */}
            <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '12px', borderRadius: '8px' }}>
              <div style={{ fontSize: '11px', color: 'var(--gc-emerald)', fontWeight: '700', marginBottom: '4px' }}>PROPOSED NEW VALUE</div>
              <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-main)' }}>{proposedValue}</div>
            </div>
          </div>
        </div>

        {/* Impact Rationale */}
        <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px', background: 'var(--bg-card)', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
          <strong>Google Impact Note:</strong> {impactNote || 'Updating this information aligns your business record with official healthcare guidelines and improves patient discovery accuracy.'}
        </div>

        {/* Explicit Consent Checkbox */}
        <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '13px', color: 'var(--text-main)', cursor: 'pointer', marginBottom: '20px', userSelect: 'none' }}>
          <input 
            type="checkbox" 
            checked={agreed} 
            onChange={(e) => setAgreed(e.target.checked)} 
            style={{ marginTop: '3px', accentColor: 'var(--gc-emerald)', width: '16px', height: '16px' }} 
          />
          <span>I confirm I am an authorized practice administrator and consent to publishing this edit directly to Google Business Profile.</span>
        </label>

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', paddingTop: '12px', borderTop: '1px solid var(--border-color)' }}>
          <button className="btn btn-outline btn-sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </button>
          <button 
            className="btn-green btn-sm" 
            onClick={handleApprove} 
            disabled={!agreed || isSubmitting}
            style={{ opacity: !agreed ? 0.5 : 1, cursor: !agreed ? 'not-allowed' : 'pointer' }}
          >
            {isSubmitting ? (
              <span>Recording consent...</span>
            ) : (
              <>
                <CheckCircle2 size={16} />
                <span>Approve & Authorize Edit</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
