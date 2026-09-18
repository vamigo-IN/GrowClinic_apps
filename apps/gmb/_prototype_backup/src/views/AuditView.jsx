import React, { useState } from 'react';
import { ShieldCheck, AlertTriangle, CheckCircle2, Sparkles, Zap, Stethoscope, Lock } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function AuditView({ activeProfile, setActiveTab, onRequestConsent }) {
  const [issues, setIssues] = useState(activeProfile?.auditDetails?.issues || []);

  if (!activeProfile) return null;

  // Protected GBP fields per v1-requirements policy. Consent is decided by the
  // structured `field` on the issue (reliable) with a title-keyword fallback for
  // legacy/unlabelled issues (language-fragile, so only a safety net).
  const PROTECTED_FIELDS = ['name', 'address', 'phone', 'category', 'categories', 'hours', 'appointment', 'appointmenturl', 'practitioner', 'practitioners'];
  const PROTECTED_TITLE_KEYWORDS = ['category', 'categories', 'hours', 'address', 'name', 'appointment', 'practitioner', 'specialization', 'phone'];

  const handleFixIssue = (item) => {
    const fieldKey = (item.field || '').toLowerCase();
    const titleText = (item.title || '').toLowerCase();
    const isProtectedField =
      PROTECTED_FIELDS.includes(fieldKey) ||
      PROTECTED_TITLE_KEYWORDS.some(kw => titleText.includes(kw));

    if (isProtectedField && onRequestConsent) {
      onRequestConsent({
        fieldName: item.title,
        currentValue: 'Current Unoptimized / Missing Listing Record',
        proposedValue: 'Verified Healthcare Category & Structured Record',
        impactNote: 'Google requires explicit consent for core identity edits. Updating improves patient search matching.',
        onConfirm: () => {
          setIssues(prev => prev.map(i => i.id === item.id ? { ...i, type: 'good', title: i.title + ' (Consent Recorded — Pending Publish)', desc: 'Change authorized by the owner. It will be published to Google once the Business Profile connection is live.' } : i));
        }
      });
    } else {
      setIssues(prev => prev.map(i => i.id === item.id ? { ...i, type: 'good', title: i.title + ' (Marked for Optimization)', desc: 'Recommendation accepted. The change will apply to your listing once the Google connection is live.' } : i));
      confetti({ particleCount: 50, spread: 50 });
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: '900' }}>AI Clinic Diagnostics & Health Score</h2>
            <span className="badge badge-emerald">Explainable Audit Rubric</span>
          </div>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
            Automated patient acquisition inspection for <strong>{activeProfile.name}</strong>.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <span style={{ fontSize: '12px', color: 'var(--gc-amber)', display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(251, 188, 4, 0.1)', padding: '6px 12px', borderRadius: '8px', border: '1px solid rgba(251, 188, 4, 0.3)' }}>
            <Lock size={14} />
            <span>Protected Fields Require Explicit Consent</span>
          </span>
        </div>
      </div>

      {/* Audit Highlights */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '28px' }}>
        <div className="card-glass" style={{ textAlign: 'center', padding: '20px' }}>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '4px' }}>Completeness Score</div>
          <div style={{ fontSize: '32px', fontWeight: '900', color: 'var(--gc-emerald)' }}>{activeProfile.completionScore}%</div>
        </div>
        <div className="card-glass" style={{ textAlign: 'center', padding: '20px' }}>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '4px' }}>Medical Keyword Coverage</div>
          <div style={{ fontSize: '32px', fontWeight: '900', color: 'var(--gc-blue)' }}>{activeProfile.keywordCoverage}%</div>
        </div>
        <div className="card-glass" style={{ textAlign: 'center', padding: '20px' }}>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '4px' }}>Doctor Review Response</div>
          <div style={{ fontSize: '32px', fontWeight: '900', color: 'var(--gc-amber)' }}>{activeProfile.reviewResponseRate}%</div>
        </div>
        <div className="card-glass" style={{ textAlign: 'center', padding: '20px' }}>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '4px' }}>Clinic Photos Uploaded</div>
          <div style={{ fontSize: '32px', fontWeight: '900', color: 'var(--gc-purple)' }}>{activeProfile.photoCount} Photos</div>
        </div>
      </div>

      {/* Issues List */}
      <div className="card-glass">
        <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '20px' }}>Diagnostic Findings & Evidence ({issues.length})</h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {issues.map(item => (
            <div key={item.id} style={{
              background: 'var(--bg-primary)',
              padding: '20px',
              borderRadius: 'var(--radius-lg)',
              border: `1px solid ${item.type === 'critical' ? '#ef4444' : item.type === 'warning' ? 'var(--gc-amber)' : 'var(--gc-emerald)'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '20px'
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                <div style={{ marginTop: '2px' }}>
                  {item.type === 'critical' && <AlertTriangle color="#ef4444" size={24} />}
                  {item.type === 'warning' && <AlertTriangle color="var(--gc-amber)" size={24} />}
                  {item.type === 'good' && <CheckCircle2 color="var(--gc-emerald)" size={24} />}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                    <h4 style={{ fontSize: '16px', fontWeight: '700' }}>{item.title}</h4>
                    <span className={`badge ${item.type === 'critical' ? '' : item.type === 'warning' ? 'badge-amber' : 'badge-emerald'}`}>
                      Impact: {item.impact}
                    </span>
                  </div>
                  <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>{item.desc}</p>
                </div>
              </div>

              {item.type !== 'good' && (
                <button className="btn-green btn-sm" onClick={() => handleFixIssue(item)}>
                  <Sparkles size={14} />
                  <span>Review & Fix Edit</span>
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
