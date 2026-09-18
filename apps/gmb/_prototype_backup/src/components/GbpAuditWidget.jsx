import React, { useState, useRef } from 'react';
import { Search, MapPin, Star, ArrowRight, CheckCircle2, AlertTriangle, XCircle, Loader2 } from 'lucide-react';
import { api } from '../lib/api';

// Public "instant GBP audit" front door — search a business, get a free score,
// then claim it (register). Self-contained; onClaim(place) opens onboarding.
export default function GbpAuditWidget({ onClaim }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [loadingReport, setLoadingReport] = useState(false);
  const [data, setData] = useState(null); // { place, report }
  const [error, setError] = useState('');
  const debounceRef = useRef(null);

  const onType = (v) => {
    setQuery(v);
    setError('');
    if (data) setData(null);
    clearTimeout(debounceRef.current);
    if (v.trim().length < 3) { setResults([]); return; }
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const r = await api.auditSearch(v.trim());
        setResults(r.results || []);
      } catch (e) {
        setError(e.message || 'Search failed');
      } finally { setSearching(false); }
    }, 350);
  };

  const runAudit = async (placeId) => {
    setResults([]);
    setLoadingReport(true);
    setError('');
    try {
      const r = await api.auditPlace(placeId);
      setData(r);
    } catch (e) {
      setError(e.message || 'Could not run the audit');
    } finally { setLoadingReport(false); }
  };

  const scoreColor = (s) => (s >= 85 ? '#10b981' : s >= 70 ? '#22c55e' : s >= 55 ? '#f59e0b' : s >= 40 ? '#f97316' : '#ef4444');
  const sevIcon = (sev) => sev === 'critical'
    ? <XCircle size={16} color="#ef4444" />
    : sev === 'warning' ? <AlertTriangle size={16} color="#f59e0b" /> : <AlertTriangle size={16} color="#94a3b8" />;

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', width: '100%' }}>
      {/* Search box */}
      {!data && (
        <div style={{ position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: '18px 22px', boxShadow: '0 18px 40px rgba(2,6,23,0.10)' }}>
            <Search size={22} color="#16a34a" />
            <input
              value={query}
              onChange={(e) => onType(e.target.value)}
              placeholder="Type your clinic name…"
              style={{ flex: 1, border: 'none', outline: 'none', fontSize: 17, color: '#0f172a', background: 'transparent' }}
            />
            {searching && <Loader2 size={20} color="#16a34a" className="spin" />}
          </div>

          {/* Autocomplete dropdown */}
          {results.length > 0 && (
            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 8, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, boxShadow: '0 20px 40px rgba(2,6,23,0.12)', overflow: 'hidden', zIndex: 30 }}>
              {results.map((r) => (
                <button key={r.placeId} onClick={() => runAudit(r.placeId)}
                  style={{ display: 'flex', gap: 12, alignItems: 'flex-start', width: '100%', textAlign: 'left', padding: '12px 16px', background: 'transparent', border: 'none', borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }}>
                  <MapPin size={16} color="#10b981" style={{ marginTop: 3 }} />
                  <span>
                    <span style={{ display: 'block', fontWeight: 700, color: '#0f172a', fontSize: 14 }}>{r.primaryText}</span>
                    <span style={{ display: 'block', color: '#64748b', fontSize: 12 }}>{r.secondaryText}</span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {error && (
        <div style={{ marginTop: 14, background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', padding: '10px 14px', borderRadius: 10, fontSize: 14 }}>{error}</div>
      )}

      {loadingReport && (
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#475569' }}>
          <Loader2 size={28} className="spin" />
          <p style={{ marginTop: 10, fontWeight: 600 }}>Checking your Google Business Profile…</p>
        </div>
      )}

      {/* Report */}
      {data && !loadingReport && (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 18, padding: 24, boxShadow: '0 20px 50px rgba(2,6,23,0.08)' }}>
          <div style={{ display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap', borderBottom: '1px solid #f1f5f9', paddingBottom: 20, marginBottom: 20 }}>
            <div style={{ width: 96, height: 96, borderRadius: '50%', border: `6px solid ${scoreColor(data.report.score)}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ fontSize: 28, fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>{data.report.score}</span>
              <span style={{ fontSize: 11, color: '#64748b' }}>/ 100</span>
            </div>
            <div style={{ flex: 1, minWidth: 220 }}>
              <h3 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', margin: 0 }}>{data.place.name}</h3>
              <p style={{ color: '#64748b', fontSize: 13, margin: '4px 0' }}>{data.place.address}</p>
              <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 6, fontSize: 13, color: '#334155' }}>
                {data.place.rating != null && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Star size={14} color="#f59e0b" /> {data.place.rating} ({data.place.reviewCount})</span>}
                {data.place.primaryCategory && <span>{data.place.primaryCategory}</span>}
                <span style={{ fontWeight: 700, color: scoreColor(data.report.score) }}>Grade {data.report.grade}</span>
              </div>
            </div>
          </div>

          <p style={{ fontWeight: 700, color: '#0f172a', marginBottom: 12 }}>
            {data.report.passedCount}/{data.report.checksCount} checks passed · {data.report.issues.length} to fix
          </p>

          <div style={{ display: 'grid', gap: 8 }}>
            {data.report.issues.slice(0, 6).map((i) => (
              <div key={i.key} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', background: '#f8fafc', border: '1px solid #eef2f7', borderRadius: 10, padding: '10px 12px' }}>
                {sevIcon(i.severity)}
                <span>
                  <span style={{ display: 'block', fontWeight: 700, color: '#0f172a', fontSize: 14 }}>{i.label}</span>
                  <span style={{ display: 'block', color: '#64748b', fontSize: 13 }}>{i.recommendation}</span>
                </span>
              </div>
            ))}
            {data.report.issues.length === 0 && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', color: '#10b981', fontWeight: 700 }}>
                <CheckCircle2 size={18} /> Great — no major gaps found. Claim it to keep it that way.
              </div>
            )}
          </div>

          <div style={{ marginTop: 22, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button className="btn-green" style={{ flex: 1, minWidth: 200, justifyContent: 'center' }} onClick={() => onClaim && onClaim(data.place)}>
              <span>Claim &amp; fix my profile</span> <ArrowRight size={16} />
            </button>
            <button onClick={() => { setData(null); setQuery(''); }} style={{ background: 'transparent', border: '1px solid #e2e8f0', borderRadius: 10, padding: '10px 18px', color: '#475569', fontWeight: 700, cursor: 'pointer' }}>
              Check another
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
