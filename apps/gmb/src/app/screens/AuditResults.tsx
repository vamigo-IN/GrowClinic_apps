import { useState } from "react";
import {
  Stethoscope, MapPin, Phone, Globe, Star, Camera, Clock, ArrowRight, ArrowLeft,
  CheckCircle2, AlertTriangle, XCircle, ExternalLink, Share2, Search,
} from "lucide-react";
import { BG, PRIMARY, PRIMARY_DARK, PRIMARY_LIGHT, TEXT, MUTED, WARN, DANGER, nm, CARD_BG, CARD_RADIUS, PAGE_BG, GRAD_DEEP } from "../theme";

type Issue = { key: string; label: string; passed: boolean; severity: "critical" | "warning" | "info"; evidence: string; recommendation: string | null };
type AuditData = {
  place: { placeId: string; name: string; address: string; phone?: string; website?: string; primaryCategory?: string; rating?: number | null; reviewCount?: number; photoCount?: number; hasHours?: boolean; mapsUri?: string };
  report: { score: number; grade: string; checksCount: number; passedCount: number; checks: Issue[]; issues: Issue[] };
};

const scoreColor = (s: number) => (s >= 85 ? PRIMARY : s >= 70 ? "#22c55e" : s >= 55 ? WARN : s >= 40 ? "#f97316" : DANGER);
const sevMeta = {
  critical: { color: DANGER, bg: "#FEF2F2", label: "Critical", Icon: XCircle },
  warning: { color: WARN, bg: "#FFFBEB", label: "Warning", Icon: AlertTriangle },
  info: { color: "#3B82F6", bg: "#EFF6FF", label: "Suggestion", Icon: AlertTriangle },
} as const;

function Gauge({ value }: { value: number }) {
  const size = 168, r = 68, cx = size / 2, cy = size / 2, circ = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, value / 100));
  const col = scoreColor(value);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#E7EAF0" strokeWidth={12} />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={col} strokeWidth={12} strokeLinecap="round"
        strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)} />
      <g style={{ transform: "rotate(90deg)", transformOrigin: "center" }}>
        <text x={cx} y={cy - 4} textAnchor="middle" fontSize={44} fontWeight={800} fill={TEXT}>{value}</text>
        <text x={cx} y={cy + 20} textAnchor="middle" fontSize={12} fill={MUTED}>out of 100</text>
      </g>
    </svg>
  );
}

function StatTile({ icon: Icon, label, value, accent }: { icon: any; label: string; value: string; accent?: string }) {
  return (
    <div style={{ background: BG, boxShadow: nm.inset, borderRadius: CARD_RADIUS, padding: "12px 14px", flex: 1, minWidth: 120 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, color: MUTED, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em" }}>
        <Icon size={13} color={accent || PRIMARY} /> {label}
      </div>
      <div style={{ fontSize: 20, fontWeight: 800, color: TEXT, marginTop: 4 }}>{value}</div>
    </div>
  );
}

export default function AuditResults({ data, onClaim, onBack, onHome }: {
  data: AuditData; onClaim: (place: any) => void; onBack: () => void; onHome: () => void;
}) {
  const { place, report } = data;
  const [copied, setCopied] = useState(false);
  const grouped: ("critical" | "warning" | "info")[] = ["critical", "warning", "info"];
  const passed = report.checks.filter((c) => c.passed);

  const share = async () => {
    const url = `${location.origin}/audit?place=${encodeURIComponent(place.placeId)}`;
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1800); }
    catch { /* clipboard blocked */ }
  };

  return (
    <div style={{ minHeight: "100vh", background: PAGE_BG, fontFamily: "'Satoshi', sans-serif", color: TEXT }}>
      {/* Nav */}
      <header style={{ position: "sticky", top: 0, zIndex: 40, background: "rgba(244,248,247,0.85)", backdropFilter: "blur(12px)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 24px", maxWidth: 1100, margin: "0 auto" }}>
          <button onClick={onHome} style={{ display: "flex", alignItems: "center", gap: 10, background: "none", border: "none", cursor: "pointer" }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: PRIMARY, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: nm.primary }}>
              <Stethoscope size={20} color="#fff" />
            </div>
            <div style={{ textAlign: "left" }}>
              <div style={{ fontWeight: 800, fontSize: 18 }}>GrowClinic <span style={{ color: PRIMARY }}>GMB</span></div>
              <div style={{ fontSize: 10, letterSpacing: "1.5px", textTransform: "uppercase", color: MUTED, fontWeight: 700, marginTop: -2 }}>Profile Engine</div>
            </div>
          </button>
          <button onClick={() => onClaim(place)} style={{ background: PRIMARY, color: "#fff", fontWeight: 700, padding: "10px 20px", border: "none", borderRadius: 12, cursor: "pointer", boxShadow: nm.primary }}>
            Claim this profile
          </button>
        </div>
      </header>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 24px 60px" }}>
        <button onClick={onBack} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "none", border: "none", color: MUTED, cursor: "pointer", fontSize: 13, marginBottom: 16 }}>
          <ArrowLeft size={15} /> New check
        </button>

        {/* Hero: identity + score */}
        <div style={{ display: "grid", gap: 20 }} className="lg:grid-cols-[1.4fr_1fr]">
          {/* Identity */}
          <div style={{ background: CARD_BG, borderRadius: CARD_RADIUS, boxShadow: nm.card, padding: 26 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 6 }}>
              <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0 }}>{place.name}</h1>
              {place.primaryCategory && (
                <span style={{ background: PRIMARY_LIGHT, color: PRIMARY_DARK, fontWeight: 700, fontSize: 12, padding: "4px 10px", borderRadius: 999 }}>{place.primaryCategory}</span>
              )}
            </div>
            <div style={{ display: "grid", gap: 6, color: MUTED, fontSize: 14, marginBottom: 18 }}>
              {place.address && <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}><MapPin size={15} color={PRIMARY} style={{ marginTop: 2, flexShrink: 0 }} /> {place.address}</div>}
              {place.phone && <div style={{ display: "flex", gap: 8, alignItems: "center" }}><Phone size={15} color={PRIMARY} /> {place.phone}</div>}
              {place.website
                ? <div style={{ display: "flex", gap: 8, alignItems: "center" }}><Globe size={15} color={PRIMARY} /> <a href={place.website} target="_blank" rel="noreferrer" style={{ color: PRIMARY_DARK, textDecoration: "none" }}>{place.website.replace(/^https?:\/\//, "")}</a></div>
                : <div style={{ display: "flex", gap: 8, alignItems: "center", color: DANGER }}><Globe size={15} /> No website / booking link</div>}
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <StatTile icon={Star} label="Rating" value={place.rating != null ? `${place.rating}★` : "—"} accent={WARN} />
              <StatTile icon={Star} label="Reviews" value={String(place.reviewCount ?? 0)} />
              <StatTile icon={Camera} label="Photos" value={String(place.photoCount ?? 0)} />
              <StatTile icon={Clock} label="Hours" value={place.hasHours ? "Listed" : "Missing"} accent={place.hasHours ? PRIMARY : DANGER} />
            </div>
            <div style={{ display: "flex", gap: 14, marginTop: 16, flexWrap: "wrap" }}>
              {place.mapsUri && <a href={place.mapsUri} target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 6, color: PRIMARY_DARK, fontWeight: 700, fontSize: 13, textDecoration: "none" }}><ExternalLink size={14} /> View on Google Maps</a>}
              <button onClick={share} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "none", border: "none", color: MUTED, fontWeight: 700, fontSize: 13, cursor: "pointer", padding: 0 }}><Share2 size={14} /> {copied ? "Link copied!" : "Share report"}</button>
            </div>
          </div>

          {/* Score */}
          <div style={{ background: CARD_BG, borderRadius: CARD_RADIUS, boxShadow: nm.card, padding: 26, display: "flex", flexDirection: "column", alignItems: "center" }}>
            <p style={{ fontWeight: 800, fontSize: 15, margin: "0 0 4px" }}>Profile Health Score</p>
            <Gauge value={report.score} />
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
              <span style={{ fontWeight: 800, color: scoreColor(report.score) }}>Grade {report.grade}</span>
              <span style={{ color: MUTED, fontSize: 13 }}>· {report.passedCount}/{report.checksCount} passed</span>
            </div>
            <div style={{ display: "flex", gap: 14, marginTop: 14 }}>
              {grouped.map((sev) => {
                const n = report.issues.filter((i) => i.severity === sev).length;
                const m = sevMeta[sev];
                return (
                  <div key={sev} style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: m.color }}>{n}</div>
                    <div style={{ fontSize: 11, color: MUTED, fontWeight: 600 }}>{m.label}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Issues */}
        <h2 style={{ fontSize: 20, fontWeight: 800, margin: "34px 0 14px" }}>What to fix</h2>
        {report.issues.length === 0 ? (
          <div style={{ background: CARD_BG, borderRadius: CARD_RADIUS, boxShadow: nm.card, padding: 22, display: "flex", gap: 12, alignItems: "center" }}>
            <CheckCircle2 size={22} color={PRIMARY} />
            <span style={{ fontWeight: 700 }}>No major gaps found on the public profile. Claim it to keep it that way.</span>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {grouped.flatMap((sev) => report.issues.filter((i) => i.severity === sev)).map((i) => {
              const m = sevMeta[i.severity];
              return (
                <div key={i.key} style={{ background: CARD_BG, borderRadius: CARD_RADIUS, boxShadow: nm.card, padding: "16px 18px", display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <div style={{ width: 34, height: 34, borderRadius: 9, background: m.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <m.Icon size={17} color={m.color} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ fontWeight: 800, fontSize: 15 }}>{i.label}</span>
                      <span style={{ background: m.bg, color: m.color, fontWeight: 700, fontSize: 11, padding: "2px 8px", borderRadius: 999 }}>{m.label}</span>
                    </div>
                    <p style={{ color: MUTED, fontSize: 13.5, margin: "4px 0 0" }}>{i.evidence}</p>
                    {i.recommendation && <p style={{ color: PRIMARY_DARK, fontSize: 13.5, margin: "6px 0 0", fontWeight: 600 }}>→ {i.recommendation}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Passing checks */}
        {passed.length > 0 && (
          <>
            <h3 style={{ fontSize: 15, fontWeight: 800, margin: "26px 0 12px", color: MUTED }}>Already looking good ({passed.length})</h3>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {passed.map((c) => (
                <span key={c.key} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: CARD_BG, borderRadius: CARD_RADIUS, boxShadow: nm.xs, padding: "8px 12px", fontSize: 13, fontWeight: 600 }}>
                  <CheckCircle2 size={14} color={PRIMARY} /> {c.label}
                </span>
              ))}
            </div>
          </>
        )}

        {/* CTA */}
        <div style={{ background: GRAD_DEEP, color: "#fff", borderRadius: CARD_RADIUS, padding: "34px 28px", textAlign: "center", marginTop: 34, boxShadow: "0 24px 60px rgba(10,59,47,0.32)" }}>
          <h2 style={{ fontSize: "clamp(22px,3.5vw,30px)", fontWeight: 900, margin: "0 0 8px" }}>Fix these and win more patients from Google</h2>
          <p style={{ opacity: 0.92, maxWidth: 520, margin: "0 auto 20px", fontSize: 15 }}>Claim {place.name} on GrowClinic and we'll keep your profile accurate, active and discoverable, with your consent on every change.</p>
          <button onClick={() => onClaim(place)} style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#fff", color: PRIMARY_DARK, fontWeight: 800, padding: "14px 30px", border: "none", borderRadius: 12, cursor: "pointer" }}>
            Claim &amp; fix my profile <ArrowRight size={16} />
          </button>
        </div>

        <p style={{ color: MUTED, fontSize: 12, textAlign: "center", marginTop: 22, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
          <Search size={13} /> Based on your public Google profile. Connect Google after claiming for the full audit (reviews, posts, performance).
        </p>
      </div>
    </div>
  );
}
