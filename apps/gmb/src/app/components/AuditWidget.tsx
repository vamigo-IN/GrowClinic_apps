import { useState, useRef } from "react";
import { Search, MapPin, Star, ArrowRight, CheckCircle2, AlertTriangle, XCircle, Loader2 } from "lucide-react";
import { api } from "../lib/api";
import { BG, PRIMARY, PRIMARY_DARK, TEXT, MUTED, nm, CARD_BG, CARD_RADIUS } from "../theme";

export default function AuditWidget({ onClaim, onReport }: { onClaim: (place: any) => void; onReport?: (data: any) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [loadingReport, setLoadingReport] = useState(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");
  const debounceRef = useRef<any>(null);

  const onType = (v: string) => {
    setQuery(v); setError(""); if (data) setData(null);
    clearTimeout(debounceRef.current);
    if (v.trim().length < 3) { setResults([]); return; }
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      try { const r = await api.auditSearch(v.trim()); setResults(r.results || []); }
      catch (e: any) { setError(e.message || "Search failed"); }
      finally { setSearching(false); }
    }, 350);
  };

  const runAudit = async (placeId: string) => {
    setResults([]); setLoadingReport(true); setError("");
    try { const r = await api.auditPlace(placeId); setData(r); }
    catch (e: any) { setError(e.message || "Could not run the audit"); }
    finally { setLoadingReport(false); }
  };

  const scoreColor = (s: number) => (s >= 85 ? "#17a57e" : s >= 70 ? "#22c55e" : s >= 55 ? "#F59E0B" : s >= 40 ? "#f97316" : "#EF4444");
  const sevIcon = (sev: string) => sev === "critical" ? <XCircle size={16} color="#EF4444" /> : sev === "warning" ? <AlertTriangle size={16} color="#F59E0B" /> : <AlertTriangle size={16} color="#94a3b8" />;

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", width: "100%" }}>
      {!data && (
        <div style={{ position: "relative" }}>
          <div className="rounded-2xl" style={{ display: "flex", alignItems: "center", gap: 12, background: CARD_BG, padding: "18px 22px", borderRadius: CARD_RADIUS, boxShadow: nm.card }}>
            <Search size={22} color={PRIMARY} />
            <input value={query} onChange={(e) => onType(e.target.value)} placeholder="Type your clinic name…"
              style={{ flex: 1, border: "none", outline: "none", fontSize: 17, color: TEXT, background: "transparent" }} />
            {searching && <Loader2 size={20} color={PRIMARY} className="spin" />}
          </div>

          {results.length > 0 && (
            <div className="rounded-2xl" style={{ position: "absolute", top: "100%", left: 0, right: 0, marginTop: 10, background: CARD_BG, borderRadius: CARD_RADIUS, boxShadow: nm.card, overflow: "hidden", zIndex: 30 }}>
              {results.map((r) => (
                <button key={r.placeId} onClick={() => runAudit(r.placeId)}
                  style={{ display: "flex", gap: 12, alignItems: "flex-start", width: "100%", textAlign: "left", padding: "13px 18px", background: "transparent", border: "none", borderBottom: "1px solid rgba(15,23,42,0.06)", cursor: "pointer" }}>
                  <MapPin size={16} color={PRIMARY} style={{ marginTop: 3 }} />
                  <span>
                    <span style={{ display: "block", fontWeight: 700, color: TEXT, fontSize: 14 }}>{r.primaryText}</span>
                    <span style={{ display: "block", color: MUTED, fontSize: 12 }}>{r.secondaryText}</span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="rounded-xl" style={{ marginTop: 14, background: "#FEF2F2", color: "#B91C1C", padding: "10px 14px", fontSize: 14 }}>{error}</div>
      )}

      {loadingReport && (
        <div style={{ textAlign: "center", padding: "40px 0", color: MUTED }}>
          <Loader2 size={28} className="spin" />
          <p style={{ marginTop: 10, fontWeight: 600 }}>Checking your Google Business Profile…</p>
        </div>
      )}

      {data && !loadingReport && (
        <div className="rounded-2xl" style={{ background: CARD_BG, padding: 26, borderRadius: CARD_RADIUS, boxShadow: nm.card }}>
          <div style={{ display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap", marginBottom: 20 }}>
            <div className="rounded-full" style={{ width: 100, height: 100, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flexShrink: 0, background: BG, boxShadow: nm.inset, border: `4px solid ${scoreColor(data.report.score)}` }}>
              <span style={{ fontSize: 28, fontWeight: 800, color: TEXT, lineHeight: 1 }}>{data.report.score}</span>
              <span style={{ fontSize: 11, color: MUTED }}>/ 100</span>
            </div>
            <div style={{ flex: 1, minWidth: 220 }}>
              <h3 style={{ fontSize: 20, fontWeight: 800, color: TEXT, margin: 0 }}>{data.place.name}</h3>
              <p style={{ color: MUTED, fontSize: 13, margin: "4px 0" }}>{data.place.address}</p>
              <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 6, fontSize: 13, color: "#334155" }}>
                {data.place.rating != null && <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Star size={14} color="#F59E0B" /> {data.place.rating} ({data.place.reviewCount})</span>}
                {data.place.primaryCategory && <span>{data.place.primaryCategory}</span>}
                <span style={{ fontWeight: 700, color: scoreColor(data.report.score) }}>Grade {data.report.grade}</span>
              </div>
            </div>
          </div>

          <p style={{ fontWeight: 700, color: TEXT, marginBottom: 12 }}>
            {data.report.passedCount}/{data.report.checksCount} checks passed · {data.report.issues.length} to fix
          </p>

          <div style={{ display: "grid", gap: 8 }}>
            {data.report.issues.slice(0, 6).map((i: any) => (
              <div key={i.key} className="rounded-xl" style={{ display: "flex", gap: 10, alignItems: "flex-start", background: BG, boxShadow: nm.insetSm, padding: "11px 13px" }}>
                {sevIcon(i.severity)}
                <span>
                  <span style={{ display: "block", fontWeight: 700, color: TEXT, fontSize: 14 }}>{i.label}</span>
                  <span style={{ display: "block", color: MUTED, fontSize: 13 }}>{i.recommendation}</span>
                </span>
              </div>
            ))}
            {data.report.issues.length === 0 && (
              <div style={{ display: "flex", gap: 8, alignItems: "center", color: PRIMARY, fontWeight: 700 }}>
                <CheckCircle2 size={18} /> Great, no major gaps found. Claim it to keep it that way.
              </div>
            )}
          </div>

          <div style={{ marginTop: 22, display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button onClick={() => onClaim(data.place)} className="rounded-xl"
              style={{ flex: 1, minWidth: 200, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, background: PRIMARY, color: "#fff", fontWeight: 700, padding: "14px 20px", border: "none", cursor: "pointer", boxShadow: nm.primary }}>
              Claim &amp; fix my profile <ArrowRight size={16} />
            </button>
            {onReport && (
              <button onClick={() => onReport(data)} className="rounded-xl"
                style={{ background: CARD_BG, color: PRIMARY_DARK, fontWeight: 700, padding: "14px 20px", border: "none", cursor: "pointer", boxShadow: nm.sm }}>
                Full report
              </button>
            )}
            <button onClick={() => { setData(null); setQuery(""); }} className="rounded-xl"
              style={{ background: BG, color: TEXT, fontWeight: 700, padding: "14px 20px", border: "none", cursor: "pointer", boxShadow: nm.sm }}>
              Check another
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
