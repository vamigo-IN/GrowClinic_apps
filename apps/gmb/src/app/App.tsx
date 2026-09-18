import { useState, useRef, useEffect, createContext, useContext } from "react";
import { api } from "./lib/api";
import {
  LayoutDashboard, Search, TrendingUp, Building2, Star, FileText,
  Briefcase, Image as ImageIcon, HelpCircle, BarChart2, Users,
  Activity, FileBarChart, Settings, Bell, ChevronRight, Plus,
  Download, Eye, Phone, Globe, Navigation2, MessageSquare,
  ThumbsUp, Send, Zap, Target, AlertTriangle, CheckCircle2,
  Info, MapPin, Calendar, MoreHorizontal, ArrowUp, ArrowDown,
  Bot, Camera, Clock, Edit2, Trash2, X, Check, Sparkles,
  Share2, User, LogOut, ExternalLink, Minus, Filter,
  TrendingDown, RefreshCw, Shield, Copy, ChevronDown,
  ChevronLeft, Lock, Mail, SlidersHorizontal, Hash, Layers, Menu
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from "recharts";

// ─────────────────────────────────────────
// DESIGN TOKENS
// ─────────────────────────────────────────
// Brand palette: white #ffffff · green #17a57e · navy #0a0d31 · black #000000 · gray #7a7676.
const BG = "#F4F8F7";
const PRIMARY = "#17a57e";
const PRIMARY_DARK = "#0F7A5C";
const PRIMARY_LIGHT = "#E4F3EE";
const TEXT = "#0a0d31";
const MUTED = "#7a7676";
const WARN = "#F59E0B";
const DANGER = "#EF4444";
const INFO_C = "#3B82F6";
const PURPLE = "#8B5CF6";

// White card face + sharper corners; subtle dark-purple ambient for depth.
const CARD_BG = "#FFFFFF";
const CARD_RADIUS = 10;
const PAGE_BG =
  "radial-gradient(1100px 620px at 80% -8%, rgba(67,24,130,0.06), transparent 60%), radial-gradient(900px 520px at 8% 108%, rgba(67,24,130,0.05), transparent 60%), #EDF0F5";

const nm = {
  card: "5px 5px 12px rgba(176,185,201,0.5), -5px -5px 12px #FFFFFF, 0 7px 16px -9px rgba(67,24,130,0.22)",
  sm: "3px 3px 9px rgba(176,185,201,0.45), -3px -3px 9px #FFFFFF, 0 5px 12px -8px rgba(67,24,130,0.16)",
  xs: "2px 2px 6px rgba(176,185,201,0.4), -2px -2px 6px #FFFFFF, 0 3px 8px -6px rgba(67,24,130,0.14)",
  inset: "inset 4px 4px 10px #CBD2D0, inset -4px -4px 10px #FFFFFF",
  insetSm: "inset 2px 2px 6px #CBD2D0, inset -2px -2px 6px #FFFFFF",
  primary: "4px 4px 12px rgba(23,165,126,0.4), -2px -2px 8px rgba(255,255,255,0.9)",
};

// ─────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────
type Screen =
  | "dashboard" | "audit" | "growth-plan" | "gbp-management"
  | "reviews" | "posts" | "services" | "photos" | "qa"
  | "rankings" | "competitors" | "performance" | "reports"
  | "ai-assistant" | "settings";

// ─────────────────────────────────────────
// CLINIC CONTEXT — the real logged-in clinic (from the API)
// ─────────────────────────────────────────
type ScoreIssue = { key: string; label: string; passed: boolean; severity: "critical" | "warning" | "info"; evidence: string; recommendation: string | null };
type ScoreReport = { score: number; grade: string; checksCount: number; passedCount: number; checks: ScoreIssue[]; issues: ScoreIssue[] };
type ClinicLocation = {
  id: string; name: string; primaryCategory?: string | null; city?: string | null;
  locality?: string | null; address?: string | null; phone?: string | null;
  website?: string | null; email?: string | null; status?: string;
};
type ClinicCtx = {
  loading: boolean;
  user: { name?: string | null; phone?: string | null } | null;
  role: string | null;
  orgName: string | null;
  location: ClinicLocation | null;
  score: ScoreReport | null;
  connected: boolean;
};
const ClinicContext = createContext<ClinicCtx>({
  loading: true, user: null, role: null, orgName: null, location: null, score: null, connected: false,
});
const useClinic = () => useContext(ClinicContext);

// A person's display name falls back to their phone, then a neutral label.
const displayName = (u: ClinicCtx["user"]) => u?.name || u?.phone || "Your account";
const initialsOf = (s: string) => s.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("") || "•";
const roleLabel = (r: string | null) => ({
  clinic_admin: "Clinic Admin", location_manager: "Location Manager",
  content_reviewer: "Content Reviewer", analyst: "Analyst",
}[r || ""] || "Member");

// Honest placeholder for any metric that needs a live Google connection Gmb
// doesn't have yet — never a fabricated number attributed to the clinic.
function ConnectGooglePanel({ what }: { what: string }) {
  return (
    <div className="rounded-2xl flex flex-col items-center text-center p-8"
      style={{ background: BG, boxShadow: nm.inset }}>
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3"
        style={{ background: PRIMARY_LIGHT }}>
        <Lock size={20} style={{ color: PRIMARY }} />
      </div>
      <p className="text-sm font-bold" style={{ color: TEXT }}>Connect your Google Business Profile</p>
      <p className="text-xs mt-1 max-w-xs" style={{ color: MUTED }}>
        {what} appears here once you connect Google. We only ever show your real profile data, never estimates.
      </p>
      <a href="/api/google/connect" className="mt-4 px-4 py-2 rounded-xl text-xs font-semibold inline-flex items-center gap-2 hover:bg-opacity-80 transition-opacity"
        style={{ background: PRIMARY, color: "#fff" }}>
        <Lock size={13} /> Connect Google Profile
      </a>
    </div>
  );
}

// Small banner marking a screen whose data isn't live yet, so nothing on it is
// mistaken for this clinic's real numbers.
function PreviewBanner({ label = "Preview" }: { label?: string }) {
  return (
    <div className="rounded-xl flex items-center gap-2.5 px-4 py-2.5 mb-1"
      style={{ background: "#FFFBEB", border: "1px solid #F59E0B33" }}>
      <Info size={15} style={{ color: WARN }} />
      <p className="text-xs font-semibold" style={{ color: "#92400E" }}>
        {label}, sample layout. Your real data appears here after you connect Google Business Profile.
      </p>
    </div>
  );
}

// ─────────────────────────────────────────
// REUSABLE COMPONENTS
// ─────────────────────────────────────────
function NmCard({ children, className = "", inset = false, style = {} }: {
  children: React.ReactNode; className?: string; inset?: boolean; style?: React.CSSProperties;
}) {
  return (
    <div
      className={className}
      style={{ background: inset ? BG : CARD_BG, borderRadius: CARD_RADIUS, boxShadow: inset ? nm.inset : nm.card, ...style }}
    >
      {children}
    </div>
  );
}

function NmButton({ children, variant = "primary", size = "md", onClick, className = "", disabled = false }: {
  children: React.ReactNode; variant?: "primary" | "secondary" | "ghost" | "danger" | "warning";
  size?: "sm" | "md" | "lg"; onClick?: () => void; className?: string; disabled?: boolean;
}) {
  const base = "inline-flex items-center gap-2 font-semibold rounded-xl transition-all duration-150 cursor-pointer select-none";
  const sizes: Record<string, string> = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base",
  };
  const variantStyles: Record<string, React.CSSProperties> = {
    primary: { background: PRIMARY, color: "#fff", boxShadow: nm.primary },
    secondary: { background: BG, color: TEXT, boxShadow: nm.sm },
    ghost: { background: "transparent", color: PRIMARY, border: `1.5px solid ${PRIMARY_LIGHT}` },
    danger: { background: "#FEF2F2", color: DANGER, boxShadow: nm.xs },
    warning: { background: "#FFFBEB", color: WARN, boxShadow: nm.xs },
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${sizes[size]} ${className} ${disabled ? "opacity-50 cursor-not-allowed" : "active:scale-[0.97]"}`}
      style={variantStyles[variant]}
    >
      {children}
    </button>
  );
}

function Badge({ label, color = "primary" }: { label: string; color?: "primary" | "warning" | "danger" | "info" | "purple" | "muted" }) {
  const colors: Record<string, { bg: string; text: string }> = {
    primary: { bg: PRIMARY_LIGHT, text: PRIMARY_DARK },
    warning: { bg: "#FFFBEB", text: "#92400E" },
    danger: { bg: "#FEF2F2", text: "#B91C1C" },
    info: { bg: "#EFF6FF", text: "#1D4ED8" },
    purple: { bg: "#F5F3FF", text: "#6D28D9" },
    muted: { bg: "#F1F5F9", text: MUTED },
  };
  const c = colors[color];
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold"
      style={{ background: c.bg, color: c.text }}>
      {label}
    </span>
  );
}

function SectionHeader({ title, subtitle, action }: {
  title: string; subtitle?: string; action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between mb-5">
      <div>
        <h2 className="text-lg font-bold" style={{ color: TEXT }}>{title}</h2>
        {subtitle && <p className="text-sm mt-0.5" style={{ color: MUTED }}>{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

function StatCard({ label, value, delta, deltaLabel, icon: Icon, iconBg, accent }: {
  label: string; value: string; delta?: number; deltaLabel?: string;
  icon: React.ElementType; iconBg: string; accent?: string;
}) {
  const isPos = (delta ?? 0) >= 0;
  return (
    <NmCard className="p-5">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: MUTED }}>{label}</p>
          <p className="text-3xl font-bold mb-1" style={{ color: accent || TEXT }}>{value}</p>
          {delta !== undefined && (
            <div className="flex items-center gap-1 text-xs font-semibold">
              {isPos ? <ArrowUp size={12} style={{ color: PRIMARY }} /> : <ArrowDown size={12} style={{ color: DANGER }} />}
              <span style={{ color: isPos ? PRIMARY : DANGER }}>{Math.abs(delta)}%</span>
              {deltaLabel && <span style={{ color: MUTED }}>{deltaLabel}</span>}
            </div>
          )}
        </div>
        <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: iconBg, boxShadow: nm.xs }}>
          <Icon size={20} style={{ color: accent || PRIMARY }} />
        </div>
      </div>
    </NmCard>
  );
}

function ScoreGauge({ value, max = 100, size = 160, label = "Score" }: {
  value: number; max?: number; size?: number; label?: string;
}) {
  const r = 56;
  const cx = size / 2;
  const cy = size / 2 + 8;
  const arcAngle = 240;
  const startDeg = -120 + 90;
  const endDeg = startDeg + arcAngle;
  const pct = Math.min(value / max, 1);
  const progressEndDeg = startDeg + pct * arcAngle;

  const polarToXY = (deg: number) => {
    const rad = (deg * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  };

  const arcPath = (deg1: number, deg2: number) => {
    const s = polarToXY(deg1);
    const e = polarToXY(deg2);
    const large = deg2 - deg1 > 180 ? 1 : 0;
    return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y}`;
  };

  const scoreColor = value >= 80 ? PRIMARY : value >= 60 ? WARN : DANGER;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <path d={arcPath(startDeg, endDeg)} fill="none" stroke="#DDE4E2" strokeWidth={8} strokeLinecap="round" />
      {pct > 0 && (
        <path d={arcPath(startDeg, progressEndDeg)} fill="none" stroke={scoreColor}
          strokeWidth={8} strokeLinecap="round" />
      )}
      <text x={cx} y={cy - 10} textAnchor="middle" fontSize={28} fontWeight={700} fill={TEXT} fontFamily="Satoshi">{value}</text>
      <text x={cx} y={cy + 12} textAnchor="middle" fontSize={11} fill={MUTED} fontFamily="Satoshi">{label}</text>
      <text x={cx} y={cy + 28} textAnchor="middle" fontSize={10} fill={scoreColor} fontWeight={600} fontFamily="Satoshi">
        {value >= 80 ? "Excellent" : value >= 60 ? "Good" : "Needs Work"}
      </text>
    </svg>
  );
}

function IssueRow({ severity, title, description, fix }: {
  severity: "critical" | "warning" | "info"; title: string; description: string; fix: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [fixed, setFixed] = useState(false);
  const cfg = {
    critical: { icon: AlertTriangle, bg: "#FEF2F2", text: DANGER, label: "Critical" },
    warning: { icon: AlertTriangle, bg: "#FFFBEB", text: WARN, label: "Warning" },
    info: { icon: Info, bg: "#EFF6FF", text: INFO_C, label: "Info" },
  }[severity];
  const Icon = cfg.icon;
  return (
    <div className="rounded-xl overflow-hidden" style={{ boxShadow: nm.xs }}>
      <div
        className="flex items-center gap-3 p-4 cursor-pointer hover:bg-white/40 transition-colors"
        style={{ background: BG }}
        onClick={() => setExpanded(!expanded)}
      >
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: cfg.bg }}>
          <Icon size={14} style={{ color: cfg.text }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold" style={{ color: fixed ? MUTED : TEXT }}>{title}</span>
            {fixed && <Badge label="Fixed" color="primary" />}
          </div>
          <p className="text-xs mt-0.5" style={{ color: MUTED }}>{description}</p>
        </div>
        <Badge label={cfg.label} color={severity === "critical" ? "danger" : severity === "warning" ? "warning" : "info"} />
        <ChevronDown size={14} style={{ color: MUTED, transform: expanded ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
      </div>
      {expanded && !fixed && (
        <div className="px-4 pb-4 pt-0" style={{ background: BG, borderTop: "1px solid rgba(0,0,0,0.05)" }}>
          <p className="text-xs mb-3 mt-3 p-3 rounded-lg" style={{ background: cfg.bg, color: cfg.text }}>
            <strong>Recommended Fix:</strong> {fix}
          </p>
          <NmButton size="sm" onClick={() => setFixed(true)}>
            <Check size={12} /> Fix Now
          </NmButton>
        </div>
      )}
    </div>
  );
}

function Modal({ open, onClose, children, title }: {
  open: boolean; onClose: () => void; children: React.ReactNode; title: string;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.3)" }}>
      <div className="w-full max-w-lg rounded-2xl p-6" style={{ background: BG, boxShadow: nm.card }}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold" style={{ color: TEXT }}>{title}</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/60 transition-colors" style={{ color: MUTED }}>
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// NAV CONFIG
// ─────────────────────────────────────────
// Nav grouped into clear feature areas. `soon` marks features whose live data
// needs the Google connection (M2+) — shown honestly rather than as if ready.
type NavItem = { id: Screen; label: string; icon: React.ElementType; soon?: boolean };
const navGroups: { heading: string; items: NavItem[] }[] = [
  { heading: "Overview", items: [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "audit", label: "GBP Audit", icon: Search },
    { id: "growth-plan", label: "Growth Plan", icon: TrendingUp, soon: true },
  ] },
  { heading: "Profile", items: [
    { id: "gbp-management", label: "GBP Management", icon: Building2 },
    { id: "services", label: "Services", icon: Briefcase, soon: true },
    { id: "photos", label: "Photos", icon: ImageIcon, soon: true },
    { id: "qa", label: "Q&A", icon: HelpCircle, soon: true },
  ] },
  { heading: "Reputation", items: [
    { id: "reviews", label: "Reviews", icon: Star, soon: true },
    { id: "posts", label: "Posts", icon: FileText, soon: true },
  ] },
  { heading: "Visibility", items: [
    { id: "rankings", label: "Rankings", icon: BarChart2, soon: true },
    { id: "competitors", label: "Competitors", icon: Users, soon: true },
    { id: "performance", label: "Performance", icon: Activity, soon: true },
    { id: "reports", label: "Reports", icon: FileBarChart, soon: true },
  ] },
];

// ─────────────────────────────────────────
// SIDEBAR
// ─────────────────────────────────────────
function Sidebar({ active, setActive, onLogout, open = false }: { active: Screen; setActive: (s: Screen) => void; onLogout?: () => void; open?: boolean }) {
  const { orgName, location, user, role } = useClinic();
  const clinicName = location?.name || orgName || "Your clinic";
  const person = displayName(user);
  return (
    <div
      className={"flex flex-col h-full w-64 flex-shrink-0 fixed inset-y-0 left-0 z-50 transition-transform duration-200 md:static md:z-auto md:translate-x-0 " + (open ? "translate-x-0" : "-translate-x-full")}
      style={{ background: "#ECF1EF", boxShadow: "4px 0 20px rgba(0,0,0,0.06)" }}
    >
      {/* Logo */}
      <div className="px-5 py-5 border-b" style={{ borderColor: "rgba(0,0,0,0.07)" }}>
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: PRIMARY, boxShadow: nm.primary }}>
            <TrendingUp size={18} color="#fff" />
          </div>
          <div>
            <p className="text-sm font-bold" style={{ color: TEXT }}>GrowClinic <span style={{ color: PRIMARY }}>GMB</span></p>
            <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: MUTED }}>Profile Engine</p>
          </div>
        </div>
        {/* Clinic selector */}
        <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer hover:bg-white/40 transition-colors"
          style={{ boxShadow: nm.xs, background: BG }}>
          <MapPin size={12} style={{ color: PRIMARY }} />
          <span className="text-xs font-semibold flex-1 truncate" style={{ color: TEXT }}>{clinicName}</span>
          <ChevronDown size={12} style={{ color: MUTED }} />
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-3">
        {navGroups.map((group) => (
          <div key={group.heading} className="space-y-0.5">
            <p className="text-[10px] font-bold uppercase tracking-wider px-3 pb-1" style={{ color: "#94A3B8" }}>{group.heading}</p>
            {group.items.map(({ id, label, icon: Icon, soon }) => {
              const isActive = active === id;
              return (
                <button
                  key={id}
                  onClick={() => setActive(id)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 relative"
                  style={{
                    color: isActive ? "#fff" : MUTED,
                    background: isActive ? PRIMARY : "transparent",
                    boxShadow: isActive ? nm.primary : "none",
                  }}
                >
                  <Icon size={16} />
                  <span className="flex-1 text-left">{label}</span>
                  {soon && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wide"
                      style={{ background: isActive ? "rgba(255,255,255,0.22)" : "#E2E8F0", color: isActive ? "#fff" : "#7a7676" }}>Soon</span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Bottom */}
      <div className="px-3 py-3 border-t space-y-0.5" style={{ borderColor: "rgba(0,0,0,0.07)" }}>
        <button
          onClick={() => setActive("ai-assistant")}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150"
          style={{
            color: active === "ai-assistant" ? "#fff" : PRIMARY,
            background: active === "ai-assistant" ? PRIMARY : PRIMARY_LIGHT,
            boxShadow: active === "ai-assistant" ? nm.primary : nm.xs,
          }}
        >
          <Sparkles size={16} />
          <span>AI Assistant</span>
        </button>
        <button
          onClick={() => setActive("settings")}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150"
          style={{ color: active === "settings" ? "#fff" : MUTED, background: active === "settings" ? PRIMARY : "transparent", boxShadow: active === "settings" ? nm.primary : "none" }}
        >
          <Settings size={16} />
          <span>Settings</span>
        </button>
        {/* Profile */}
        <div className="flex items-center gap-3 px-3 py-3 mt-2 rounded-xl cursor-pointer hover:bg-white/40 transition-colors">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
            style={{ background: PRIMARY }}>{initialsOf(person)}</div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold truncate" style={{ color: TEXT }}>{person}</p>
            <p className="text-[10px]" style={{ color: MUTED }}>{roleLabel(role)}</p>
          </div>
          <button onClick={onLogout} title="Log out" style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
            <LogOut size={13} style={{ color: MUTED }} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// HEADER
// ─────────────────────────────────────────
const screenTitles: Record<Screen, { title: string; subtitle: string }> = {
  dashboard: { title: "Dashboard", subtitle: "Your clinic at a glance" },
  audit: { title: "GBP Audit", subtitle: "Profile health check & issue detection" },
  "growth-plan": { title: "Growth Plan", subtitle: "AI-prioritized actions to grow your GBP" },
  "gbp-management": { title: "GBP Management", subtitle: "Edit your business profile details" },
  reviews: { title: "Reviews", subtitle: "Monitor and respond to patient reviews" },
  posts: { title: "Posts", subtitle: "Create and schedule GBP content" },
  services: { title: "Services & Categories", subtitle: "Optimize your service offerings" },
  photos: { title: "Photos", subtitle: "Manage your photo library" },
  qa: { title: "Q&A", subtitle: "AI-generated questions and answers" },
  rankings: { title: "Rankings", subtitle: "Local keyword positions & Maps ranking" },
  competitors: { title: "Competitors", subtitle: "Compare against nearby practices" },
  performance: { title: "Performance", subtitle: "GBP insights & engagement metrics" },
  reports: { title: "Reports", subtitle: "Monthly GBP growth summary" },
  "ai-assistant": { title: "AI Assistant", subtitle: "Profile-specific recommendations" },
  settings: { title: "Settings", subtitle: "Account, notifications & integrations" },
};

function Header({ screen, onMenu }: { screen: Screen; onMenu?: () => void }) {
  const { title, subtitle: defaultSubtitle } = screenTitles[screen];
  const { location, orgName, user } = useClinic();
  const person = displayName(user);
  // For the dashboard, show the real clinic identity instead of the demo one.
  const subtitle = screen === "dashboard"
    ? [location?.name || orgName, [location?.locality, location?.city].filter(Boolean).join(", ")].filter(Boolean).join(" · ") || defaultSubtitle
    : defaultSubtitle;
  return (
    <div className="flex items-center justify-between px-5 md:px-7 py-4 border-b flex-shrink-0"
      style={{ borderColor: "rgba(0,0,0,0.07)", background: BG }}>
      <div className="flex items-center gap-3">
        <button onClick={onMenu} className="md:hidden w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: BG, boxShadow: nm.xs }}>
          <Menu size={18} style={{ color: TEXT }} />
        </button>
        <div>
          <h1 className="text-lg md:text-xl font-bold" style={{ color: TEXT }}>{title}</h1>
          <p className="text-xs md:text-sm" style={{ color: MUTED }}>{subtitle}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button className="w-9 h-9 rounded-xl flex items-center justify-center relative"
          style={{ background: BG, boxShadow: nm.xs }}>
          <Bell size={16} style={{ color: MUTED }} />
          <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full" style={{ background: DANGER }} />
        </button>
        <button className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold"
          style={{ background: BG, boxShadow: nm.xs, color: MUTED }}>
          <div className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold text-white"
            style={{ background: PRIMARY }}>{initialsOf(person)}</div>
          <span className="hidden sm:inline max-w-[140px] truncate">{person}</span>
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// SCREEN: DASHBOARD
// ─────────────────────────────────────────
function LockedStat({ label, icon: Icon, iconBg }: { label: string; icon: React.ElementType; iconBg: string }) {
  return (
    <NmCard className="p-5">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: MUTED }}>{label}</p>
          <p className="text-3xl font-bold mb-1" style={{ color: "#CBD5E1" }}>-</p>
          <a href="/api/google/connect" className="flex items-center gap-1 text-xs font-semibold hover:opacity-80 transition-opacity" style={{ color: PRIMARY }}>
            <Lock size={11} /> Connect Google
          </a>
        </div>
        <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: iconBg, boxShadow: nm.xs }}>
          <Icon size={20} style={{ color: MUTED }} />
        </div>
      </div>
    </NmCard>
  );
}

function DashboardScreen({ setScreen }: { setScreen: (s: Screen) => void }) {
  const { score, connected, loading } = useClinic();
  const scoreVal = score?.score ?? 0;
  return (
    <div className="p-7 space-y-6 overflow-y-auto h-full">
      {/* Top KPI row: real profile score + Google-gated metrics locked until connected */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard label={connected ? "Profile Health Score" : "Profile Setup Score"} value={loading ? "…" : String(scoreVal)} deltaLabel={connected ? "" : "profile completeness"} icon={TrendingUp} iconBg={PRIMARY_LIGHT} accent={PRIMARY} />
        <LockedStat label="Maps Ranking" icon={MapPin} iconBg="#F0FDF4" />
        <LockedStat label="Average Rating" icon={Star} iconBg="#FFFBEB" />
        <LockedStat label="Monthly Views" icon={Eye} iconBg="#EFF6FF" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Performance needs live Google data, honest empty state until connected */}
        <NmCard className="col-span-1 lg:col-span-2 p-5">
          <SectionHeader title="GBP Performance" subtitle="Profile views, calls & website clicks" />
          <ConnectGooglePanel what="Views, calls and website clicks from Google" />
        </NmCard>

        {/* Real profile score + its evidence breakdown */}
        <NmCard className="p-5 flex flex-col items-center">
          <p className="text-sm font-bold mb-1" style={{ color: TEXT }}>{connected ? "Profile Health Score" : "Profile Setup Score"}</p>
          <p className="text-xs mb-3" style={{ color: MUTED }}>Out of 100 possible points</p>
          <ScoreGauge value={scoreVal} label={connected ? "Health" : "Setup"} />
          <div className="w-full mt-4 space-y-2">
            {(score?.checks || []).slice(0, 5).map((c) => (
              <div key={c.key} className="flex items-center gap-2 text-xs">
                {c.passed
                  ? <CheckCircle2 size={13} style={{ color: PRIMARY }} />
                  : <AlertTriangle size={13} style={{ color: c.severity === "critical" ? DANGER : WARN }} />}
                <span className="flex-1" style={{ color: c.passed ? MUTED : TEXT }}>{c.label}</span>
              </div>
            ))}
            {!score && <p className="text-xs" style={{ color: MUTED }}>{loading ? "Loading your profile…" : "Finish setting up your clinic to see your score."}</p>}
          </div>
          {!connected && score && (
            <p className="text-[11px] text-center mt-3" style={{ color: MUTED }}>
              This reflects the details on file. Connect Google for a live health score.
            </p>
          )}
        </NmCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Growth Actions, derived from the real score's failed checks */}
        <NmCard className="p-5">
          <SectionHeader title="Recommended Actions" subtitle="From your profile audit" />
          <div className="space-y-2">
            {(score?.issues || []).slice(0, 4).map((iss) => (
              <div key={iss.key} className="flex items-center gap-3 p-3 rounded-xl"
                style={{ boxShadow: nm.xs, background: BG }}>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: iss.severity === "critical" ? "#FEF2F2" : "#FFFBEB" }}>
                  <AlertTriangle size={13} style={{ color: iss.severity === "critical" ? DANGER : WARN }} />
                </div>
                <span className="text-sm flex-1 font-medium" style={{ color: TEXT }}>{iss.recommendation || iss.label}</span>
                <Badge label={iss.severity === "critical" ? "High" : "Medium"} color={iss.severity === "critical" ? "danger" : "warning"} />
              </div>
            ))}
            {score && score.issues.length === 0 && (
              <div className="flex items-center gap-2 p-3 text-sm" style={{ color: PRIMARY }}>
                <CheckCircle2 size={16} /> Your profile details are complete. Connect Google to go further.
              </div>
            )}
            {!score && <p className="text-xs" style={{ color: MUTED }}>{loading ? "Loading recommendations…" : "Complete your profile to get recommendations."}</p>}
          </div>
          <NmButton size="sm" className="w-full mt-3 justify-center" onClick={() => setScreen("audit")}>
            <Target size={13} /> View Full Audit
          </NmButton>
        </NmCard>

        {/* Reviews need live Google data */}
        <NmCard className="p-5 col-span-1 lg:col-span-2">
          <SectionHeader title="Recent Reviews" subtitle="Latest patient feedback" action={
            <NmButton size="sm" variant="secondary" onClick={() => setScreen("reviews")}>View All</NmButton>
          } />
          <ConnectGooglePanel what="Your latest Google reviews" />
        </NmCard>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// SCREEN: GBP AUDIT
// ─────────────────────────────────────────
function AuditScreen() {
  const { score, connected, loading } = useClinic();
  const issues = score?.issues || [];
  const counts = {
    critical: issues.filter((i) => i.severity === "critical").length,
    warning: issues.filter((i) => i.severity === "warning").length,
    info: issues.filter((i) => i.severity === "info").length,
  };
  const grouped: { sev: "critical" | "warning" | "info"; color: string; label: string }[] = [
    { sev: "critical", color: DANGER, label: "Critical" },
    { sev: "warning", color: WARN, label: "Warning" },
    { sev: "info", color: INFO_C, label: "Suggestions" },
  ];
  return (
    <div className="p-7 space-y-6 overflow-y-auto h-full">
      {!connected && !loading && <PreviewBanner label="Setup audit" />}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <NmCard className="p-5 flex flex-col items-center col-span-1">
          <p className="text-sm font-bold mb-1" style={{ color: TEXT }}>{connected ? "Profile Health Score" : "Profile Setup Score"}</p>
          <p className="text-xs mb-3" style={{ color: MUTED }}>{connected ? "Live from Google" : "From details on file"}</p>
          <ScoreGauge value={score?.score ?? 0} label={connected ? "Health" : "Setup"} />
          <div className="w-full mt-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ background: DANGER }} />
                <span className="text-xs font-semibold" style={{ color: MUTED }}>Critical Issues</span>
              </div>
              <span className="text-sm font-bold" style={{ color: DANGER }}>{counts.critical}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ background: WARN }} />
                <span className="text-xs font-semibold" style={{ color: MUTED }}>Warnings</span>
              </div>
              <span className="text-sm font-bold" style={{ color: WARN }}>{counts.warning}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ background: INFO_C }} />
                <span className="text-xs font-semibold" style={{ color: MUTED }}>Suggestions</span>
              </div>
              <span className="text-sm font-bold" style={{ color: INFO_C }}>{counts.info}</span>
            </div>
          </div>
          {!connected && (
            <p className="text-[11px] text-center mt-4" style={{ color: MUTED }}>
              This checks the details you've provided. Connect Google for the full health audit (reviews, photos, hours, posts).
            </p>
          )}
        </NmCard>

        <div className="col-span-1 lg:col-span-2 space-y-4">
          <SectionHeader title="Audit Issues" subtitle={connected ? "Fix these to improve your profile" : "Complete these profile details first"} />
          {loading && <p className="text-sm" style={{ color: MUTED }}>Running your audit…</p>}
          {!loading && issues.length === 0 && (
            <NmCard className="p-6 flex items-center gap-3">
              <CheckCircle2 size={20} style={{ color: PRIMARY }} />
              <div>
                <p className="text-sm font-bold" style={{ color: TEXT }}>No gaps in the details on file.</p>
                <p className="text-xs" style={{ color: MUTED }}>Connect Google to audit reviews, photos, hours and posts too.</p>
              </div>
            </NmCard>
          )}
          <div className="space-y-2">
            {grouped.map(({ sev, color, label }) => {
              const group = issues.filter((i) => i.severity === sev);
              if (!group.length) return null;
              return (
                <div key={sev} className="space-y-2">
                  <p className="text-xs font-bold uppercase tracking-wider px-1 pt-2" style={{ color }}>{label}</p>
                  {group.map((i) => (
                    <IssueRow key={i.key} severity={i.severity} title={i.label}
                      description={i.evidence} fix={i.recommendation || "Update this detail in GBP Management."} />
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// SCREEN: GROWTH PLAN
// ─────────────────────────────────────────
const growthActions = [
  { id: 1, impact: "High", effort: "Low", label: "Reply to 8 unanswered reviews", detail: "Responding to reviews improves ranking and builds trust. AI can write replies for you.", category: "Reviews", done: false },
  { id: 2, impact: "High", effort: "Medium", label: "Add 15 new photos", detail: "Upload exterior, team, and treatment room photos. Fresh photos improve Maps visibility.", category: "Photos", done: false },
  { id: 3, impact: "High", effort: "Low", label: "Add appointment booking link", detail: "Critical issue: add your Calendly or website booking link to GBP profile.", category: "GBP Profile", done: false },
  { id: 4, impact: "High", effort: "Medium", label: "Update primary category", detail: 'Change from "Dentist" to "Cosmetic Dentist" for better keyword targeting.', category: "Categories", done: true },
  { id: 5, impact: "Medium", effort: "Low", label: "Post 2x this week", detail: "Share a teeth whitening tip and a team spotlight post to boost engagement.", category: "Posts", done: false },
  { id: 6, impact: "Medium", effort: "Medium", label: "Add 3 secondary categories", detail: 'Add "Teeth Whitening Service", "Orthodontist", and "Pediatric Dentist".', category: "Categories", done: false },
  { id: 7, impact: "Medium", effort: "Low", label: "Enable Google Messaging", detail: "Allow patients to message directly from your listing. Turn on in GBP settings.", category: "GBP Profile", done: false },
  { id: 8, impact: "Medium", effort: "High", label: "Expand business description", detail: "Rewrite to 700+ characters. Include specialties, insurance, and unique value.", category: "GBP Profile", done: false },
  { id: 9, impact: "Low", effort: "Low", label: "Add business attributes", detail: "Mark: Wheelchair accessible, Accepts new patients, Same-day appointments.", category: "GBP Profile", done: false },
  { id: 10, impact: "Low", effort: "Low", label: "Upload Q&A responses", detail: "Seed 8 AI-generated Q&As to cover common patient questions.", category: "Q&A", done: false },
];

function GrowthPlanScreen({ setScreen }: { setScreen: (s: Screen) => void }) {
  const { location, connected } = useClinic();
  const [issues, setIssues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchIssues = async () => {
    if (!location) return;
    try {
      const res = await api.edits(location.id);
      setIssues(res.issues);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIssues();
  }, [location]);

  const handleApprove = async (id: string, field: string) => {
    // If it's a field we mock update for now (like phone or website) we prompt
    // In a real flow, this would be a specific form per field.
    let val = undefined;
    if (field === "phone") val = prompt("Enter the phone number to publish:");
    if (field === "website") val = prompt("Enter the website URL to publish:");
    // Nothing is published without a value (the server rejects it as well).
    if ((field === "phone" || field === "website") && !val?.trim()) return;

    try {
      await api.editsApprove(id, val);
      alert("Edit published to Google!");
      fetchIssues(); // Refresh list
    } catch (e: any) {
      alert("Failed to publish edit. Are you connected to Google?");
    }
  };

  const done = 0; // We just remove them from the list when done

  return (
    <div className="p-7 space-y-6 overflow-y-auto h-full">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-bold" style={{ color: TEXT }}>Consented Edits & Growth Plan</h1>
      </div>

      {!connected && (
        <NmCard className="p-6 text-center">
          <p className="text-sm font-semibold mb-3">Connect Google to generate a live growth plan</p>
          <a href="/api/google/connect" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-white font-semibold shadow" style={{ background: PRIMARY }}>
            Connect Google
          </a>
        </NmCard>
      )}

      {connected && loading && <p className="text-sm text-gray-500">Loading your actionable edits...</p>}
      
      {connected && !loading && issues.length === 0 && (
        <NmCard className="p-6 text-center">
          <p className="text-sm font-semibold text-green-600">Your profile is looking great! No critical edits pending.</p>
        </NmCard>
      )}

      {connected && !loading && issues.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-bold" style={{ color: TEXT }}>Pending Google Edits</h3>
          {issues.map(i => (
            <NmCard key={i.id} className="p-5">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "rgba(255, 69, 0, 0.1)" }}>
                  <AlertTriangle size={14} style={{ color: "rgb(255, 69, 0)" }} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold mb-1">{i.title}</p>
                  <p className="text-xs mb-3 text-gray-500">{i.description}</p>
                  
                  <div className="flex items-center gap-3">
                    <NmButton size="sm" onClick={() => handleApprove(i.id, i.field)}>
                      Publish Fix to Google
                    </NmButton>
                    <NmButton size="sm" variant="secondary" onClick={() => {
                      // In a real app we'd call /api/edits/:id/reject
                      setIssues(issues.filter(x => x.id !== i.id));
                    }}>
                      Dismiss
                    </NmButton>
                  </div>
                </div>
              </div>
            </NmCard>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────
// SCREEN: GBP MANAGEMENT
// ─────────────────────────────────────────
function GBPManagementScreen() {
  const { location, connected } = useClinic();
  const [editing, setEditing] = useState<string | null>(null);
  const clinicName = location?.name || "Your clinic";
  const addressLine = [location?.address, location?.locality, location?.city].filter(Boolean).join(", ") || "No address on file";
  const contactLine = [location?.website, location?.phone].filter(Boolean).join(" · ") || "No website or phone on file";
  const sections = [
    { id: "hours", label: "Business Hours", icon: Clock, status: "warning", detail: "Saturday hours unverified" },
    { id: "category", label: "Categories", icon: Layers, status: "danger", detail: "Primary category too broad" },
    { id: "booking", label: "Booking Link", icon: ExternalLink, status: "danger", detail: "No booking link added" },
    { id: "description", label: "Business Description", icon: FileText, status: "warning", detail: "Only 85/750 chars used" },
    { id: "attributes", label: "Attributes & Amenities", icon: SlidersHorizontal, status: "good", detail: "8 attributes set" },
    { id: "messaging", label: "Google Messaging", icon: MessageSquare, status: "warning", detail: "Not enabled" },
  ];

  const statusStyles = {
    danger: { color: DANGER, label: "Issue" },
    warning: { color: WARN, label: "Warning" },
    good: { color: PRIMARY, label: "Good" },
  };

  return (
    <div className="p-7 space-y-6 overflow-y-auto h-full">
      {/* Profile summary */}
      <NmCard className="p-5">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold text-white flex-shrink-0"
            style={{ background: PRIMARY, boxShadow: nm.primary }}>{initialsOf(clinicName)}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-lg font-bold truncate" style={{ color: TEXT }}>{clinicName}</h2>
              <Badge label={connected ? "Connected" : "Not connected"} color={connected ? "primary" : "muted"} />
            </div>
            <p className="text-sm" style={{ color: MUTED }}>{addressLine}</p>
            <p className="text-sm" style={{ color: MUTED }}>{contactLine}</p>
          </div>
          {connected && (
            <div className="flex flex-col gap-2">
              <NmButton size="sm">
                <ExternalLink size={12} /> Open in GBP
              </NmButton>
              <NmButton size="sm" variant="secondary" onClick={async () => {
                if (confirm("Are you sure you want to disconnect your Google account?")) {
                  try {
                    await api.googleDisconnect();
                    window.location.reload();
                  } catch (e) {
                    alert("Failed to disconnect");
                  }
                }
              }}>
                Disconnect Google
              </NmButton>
            </div>
          )}
        </div>
        {!connected && (
          <div className="mt-4 pt-4 border-t flex items-center gap-2.5" style={{ borderColor: "rgba(0,0,0,0.06)" }}>
            <Info size={15} style={{ color: WARN }} />
            <p className="text-xs" style={{ color: MUTED }}>
              Editing hours, categories, description and other fields on Google requires connecting your Google Business Profile. The sections below are your setup checklist for now.
            </p>
          </div>
        )}
      </NmCard>

      {/* Sections */}
      <div className="grid grid-cols-2 gap-4">
        {sections.map(({ id, label, icon: Icon, status, detail }) => {
          const s = statusStyles[status as keyof typeof statusStyles];
          return (
            <NmCard key={id} className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                    style={{ background: PRIMARY_LIGHT, boxShadow: nm.xs }}>
                    <Icon size={14} style={{ color: PRIMARY }} />
                  </div>
                  <p className="text-sm font-semibold" style={{ color: TEXT }}>{label}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: s.color }} />
                  <span className="text-xs font-semibold" style={{ color: s.color }}>{s.label}</span>
                </div>
              </div>
              <p className="text-xs mb-3" style={{ color: MUTED }}>{detail}</p>
              <NmButton size="sm" variant="secondary" onClick={() => setEditing(id)}>
                <Edit2 size={11} /> Edit
              </NmButton>
            </NmCard>
          );
        })}
      </div>

      {/* Business hours table */}
      <NmCard className="p-5">
        <SectionHeader title="Business Hours" action={
          <NmButton size="sm" variant="secondary"><Edit2 size={12} /> Edit All</NmButton>
        } />
        <div className="space-y-2">
          {[
            { day: "Monday", hours: "8:00 AM – 6:00 PM" },
            { day: "Tuesday", hours: "8:00 AM – 6:00 PM" },
            { day: "Wednesday", hours: "8:00 AM – 6:00 PM" },
            { day: "Thursday", hours: "8:00 AM – 7:00 PM" },
            { day: "Friday", hours: "8:00 AM – 5:00 PM" },
            { day: "Saturday", hours: "10:00 AM – 2:00 PM", warn: true },
            { day: "Sunday", hours: "Closed", closed: true },
          ].map(({ day, hours, warn, closed }) => (
            <div key={day} className="flex items-center justify-between py-2 border-b" style={{ borderColor: "rgba(0,0,0,0.05)" }}>
              <span className="text-sm font-semibold" style={{ color: TEXT }}>{day}</span>
              <div className="flex items-center gap-2">
                {warn && <AlertTriangle size={12} style={{ color: WARN }} />}
                <span className="text-sm" style={{ color: closed ? MUTED : TEXT }}>{hours}</span>
              </div>
            </div>
          ))}
        </div>
      </NmCard>
    </div>
  );
}

// ─────────────────────────────────────────
// SCREEN: REVIEWS
// ─────────────────────────────────────────
function ReviewsScreen() {
  const { connected } = useClinic();

  if (!connected) {
    return (
      <div className="p-7 space-y-6 overflow-y-auto h-full">
        <div className="max-w-2xl mx-auto pt-6">
          <ConnectGooglePanel what="Your patient reviews, ratings and reply drafts" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-7 space-y-6 overflow-y-auto h-full">
      <p>Reviews will appear here once implemented.</p>
    </div>
  );
}

// ─────────────────────────────────────────
// SCREEN: POSTS
// ─────────────────────────────────────────
const postsData = [
  { id: 1, title: "Summer Whitening Special, 30% Off", status: "published", date: "Aug 15", type: "Offer", views: 142 },
  { id: 2, title: "Meet Our New Hygienist, Jessica!", status: "published", date: "Aug 8", type: "Update", views: 98 },
  { id: 3, title: "5 Signs You Might Need a Crown", status: "published", date: "Aug 1", type: "Education", views: 217 },
  { id: 4, title: "Back-to-School Dental Checkup Reminder", status: "scheduled", date: "Aug 22", type: "Update", views: 0 },
  { id: 5, title: "Invisalign Open House, RSVP Required", status: "scheduled", date: "Aug 29", type: "Event", views: 0 },
  { id: 6, title: "Labor Day Hours Notice", status: "draft", date: "-", type: "Update", views: 0 },
  { id: 7, title: "How to Floss Properly", status: "draft", date: "-", type: "Education", views: 0 },
];

function PostsScreen() {
  const [tab, setTab] = useState("All");
  const [showCreate, setShowCreate] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [generatedText, setGeneratedText] = useState("");
  const tabs = ["All", "Published", "Scheduled", "Drafts"];

  const filtered = postsData.filter(p => {
    if (tab === "All") return true;
    return p.status.toLowerCase() === tab.toLowerCase();
  });

  const statusColor: Record<string, "primary" | "warning" | "muted"> = {
    published: "primary", scheduled: "warning", draft: "muted",
  };

  const typeColor: Record<string, "primary" | "info" | "warning" | "purple"> = {
    Offer: "primary", Education: "info", Update: "warning", Event: "purple",
  };

  return (
    <div className="p-7 space-y-6 overflow-y-auto h-full">
      <PreviewBanner label="Posts" />
      <div className="flex items-center gap-3">
        <div className="flex gap-1">
          {tabs.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className="px-4 py-2 rounded-xl text-sm font-semibold transition-all"
              style={tab === t ? { background: PRIMARY, color: "#fff", boxShadow: nm.primary } : { background: BG, color: MUTED, boxShadow: nm.xs }}>
              {t}
              {t !== "All" && (
                <span className="ml-1.5 text-xs">
                  ({postsData.filter(p => p.status === t.toLowerCase()).length})
                </span>
              )}
            </button>
          ))}
        </div>
        <NmButton className="ml-auto" onClick={() => setShowCreate(true)}>
          <Plus size={14} /> Create Post
        </NmButton>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Published" value="18" icon={CheckCircle2} iconBg={PRIMARY_LIGHT} />
        <StatCard label="Scheduled" value="3" icon={Calendar} iconBg="#FFFBEB" accent={WARN} />
        <StatCard label="Drafts" value="2" icon={FileText} iconBg="#F1F5F9" accent={MUTED} />
        <StatCard label="Total Views" value="2,847" icon={Eye} iconBg="#EFF6FF" accent={INFO_C} />
      </div>

      {/* Posts grid */}
      <div className="grid grid-cols-2 gap-4">
        {filtered.map(p => (
          <NmCard key={p.id} className="p-4">
            <div className="flex items-start justify-between mb-2">
              <div className="flex gap-2">
                <Badge label={p.type} color={typeColor[p.type]} />
                <Badge label={p.status} color={statusColor[p.status]} />
              </div>
              <button className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-white/60 transition-colors"
                style={{ color: MUTED }}><MoreHorizontal size={13} /></button>
            </div>
            <p className="text-sm font-semibold mb-1" style={{ color: TEXT }}>{p.title}</p>
            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center gap-1 text-xs" style={{ color: MUTED }}>
                <Calendar size={11} /> {p.date}
              </div>
              {p.views > 0 && (
                <div className="flex items-center gap-1 text-xs" style={{ color: MUTED }}>
                  <Eye size={11} /> {p.views} views
                </div>
              )}
            </div>
            <div className="flex gap-1.5 mt-3">
              <NmButton size="sm" variant="secondary"><Edit2 size={11} /> Edit</NmButton>
              {p.status === "draft" && <NmButton size="sm"><Calendar size={11} /> Schedule</NmButton>}
              {p.status === "scheduled" && <NmButton size="sm" variant="ghost">Publish Now</NmButton>}
            </div>
          </NmCard>
        ))}
      </div>

      {/* Create Post Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create New Post">
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold block mb-1.5" style={{ color: MUTED }}>Post Type</label>
            <div className="flex gap-2">
              {["Update", "Offer", "Event", "Education"].map(t => (
                <button key={t} className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                  style={t === "Offer" ? { background: PRIMARY, color: "#fff" } : { background: BG, color: MUTED, boxShadow: nm.xs }}>
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold block mb-1.5" style={{ color: MUTED }}>AI Generate from prompt</label>
            <div className="flex gap-2">
              <input
                className="flex-1 px-3 py-2.5 rounded-xl text-sm outline-none"
                placeholder="e.g. 'Fall dental checkup promotion'"
                style={{ background: BG, boxShadow: nm.inset, color: TEXT, border: "none" }}
                value={aiPrompt}
                onChange={e => setAiPrompt(e.target.value)}
              />
              <NmButton size="sm" onClick={() => setGeneratedText("Get ahead of the holiday season! Book your fall dental checkup at Bright Smile Dental and receive a complimentary whitening touch-up. Our Austin patients love their bright smiles, yours could be next. Call us or book online today!")}>
                <Bot size={12} /> Generate
              </NmButton>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold block mb-1.5" style={{ color: MUTED }}>Post Content</label>
            <textarea rows={5} value={generatedText} onChange={e => setGeneratedText(e.target.value)}
              className="w-full rounded-xl p-3 text-sm resize-none outline-none"
              placeholder="Write your post or generate with AI..."
              style={{ background: BG, boxShadow: nm.inset, color: TEXT, border: "none" }}
            />
          </div>
          <div className="flex gap-2 justify-end">
            <NmButton variant="secondary" onClick={() => setShowCreate(false)}>Save Draft</NmButton>
            <NmButton><Calendar size={13} /> Schedule</NmButton>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ─────────────────────────────────────────
// SCREEN: SERVICES
// ─────────────────────────────────────────
function ServicesScreen() {
  const current = [
    "General Dentistry", "Teeth Whitening", "Orthodontics",
    "Root Canal Therapy", "Dental Implants", "Dental Veneers",
    "Teeth Cleaning", "Composite Fillings",
  ];
  const missing = [
    { label: "Emergency Dental Care", impact: "High" },
    { label: "Pediatric Dentistry", impact: "High" },
    { label: "Cosmetic Dentistry", impact: "High" },
    { label: "Dental Crowns", impact: "Medium" },
    { label: "Teeth Grinding Treatment", impact: "Medium" },
    { label: "Gum Disease Treatment", impact: "Low" },
  ];
  const [added, setAdded] = useState<string[]>([]);

  return (
    <div className="p-7 space-y-6 overflow-y-auto h-full">
      <PreviewBanner label="Services" />
      <div className="grid grid-cols-2 gap-5">
        <NmCard className="p-5">
          <SectionHeader title="Current Services" subtitle={`${current.length} services listed`} />
          <div className="flex flex-wrap gap-2">
            {current.map(s => (
              <div key={s} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium"
                style={{ background: BG, boxShadow: nm.xs, color: TEXT }}>
                <CheckCircle2 size={13} style={{ color: PRIMARY }} />
                {s}
              </div>
            ))}
          </div>
        </NmCard>

        <NmCard className="p-5">
          <SectionHeader title="AI-Recommended Missing Services" subtitle="Add these to improve keyword coverage" action={
            <Badge label="AI Powered" color="primary" />
          } />
          <div className="space-y-2">
            {missing.map(({ label, impact }) => (
              <div key={label} className="flex items-center gap-3 p-3 rounded-xl"
                style={{ background: BG, boxShadow: nm.xs }}>
                <div className="flex-1">
                  <p className="text-sm font-semibold" style={{ color: added.includes(label) ? MUTED : TEXT }}>{label}</p>
                </div>
                <Badge label={impact} color={impact === "High" ? "primary" : impact === "Medium" ? "warning" : "muted"} />
                {added.includes(label)
                  ? <Badge label="Added" color="primary" />
                  : (
                    <NmButton size="sm" onClick={() => setAdded(p => [...p, label])}>
                      <Plus size={11} /> Add
                    </NmButton>
                  )
                }
              </div>
            ))}
          </div>
        </NmCard>
      </div>

      {/* Category optimization */}
      <NmCard className="p-5">
        <SectionHeader title="Category Optimization" subtitle="Your categories vs top competitors" action={
          <NmButton size="sm"><Sparkles size={12} /> AI Optimize</NmButton>
        } />
        <div className="grid grid-cols-3 gap-4">
          {[
            { type: "Primary Category", current: "Dentist", recommended: "Cosmetic Dentist", status: "warning" },
            { type: "Secondary 1", current: "-", recommended: "Teeth Whitening Service", status: "missing" },
            { type: "Secondary 2", current: "-", recommended: "Orthodontist", status: "missing" },
          ].map(({ type, current, recommended, status }) => (
            <div key={type} className="p-4 rounded-xl" style={{ background: BG, boxShadow: nm.xs }}>
              <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: MUTED }}>{type}</p>
              <p className="text-sm line-through mb-1" style={{ color: status === "missing" ? MUTED : DANGER }}>{current}</p>
              <p className="text-sm font-semibold mb-2" style={{ color: PRIMARY }}>→ {recommended}</p>
              <NmButton size="sm" variant="ghost">Apply Change</NmButton>
            </div>
          ))}
        </div>
      </NmCard>
    </div>
  );
}

// ─────────────────────────────────────────
// SCREEN: PHOTOS
// ─────────────────────────────────────────
const photoCategories = [
  { label: "Exterior", count: 5, target: 8 },
  { label: "Interior & Reception", count: 12, target: 15 },
  { label: "Team & Staff", count: 8, target: 12 },
  { label: "Equipment", count: 5, target: 8 },
  { label: "Before & After", count: 4, target: 10 },
];

const photoUrls = [
  "https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=300&h=200&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1588776814546-1ffbb2cd00ae?w=300&h=200&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=300&h=200&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1609840114035-3c981b782dfe?w=300&h=200&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1571772996211-2f02c9727629?w=300&h=200&fit=crop&auto=format",
  "https://images.unsplash.com/photo-1606811971618-4486d14f3f99?w=300&h=200&fit=crop&auto=format",
];

function PhotosScreen() {
  return (
    <div className="p-7 space-y-6 overflow-y-auto h-full">
      <PreviewBanner label="Photos" />
      {/* Competitor comparison banner */}
      <NmCard className="p-4" style={{ border: `1.5px solid ${WARN}33` }}>
        <div className="flex items-center gap-3">
          <AlertTriangle size={18} style={{ color: WARN }} />
          <div className="flex-1">
            <p className="text-sm font-bold" style={{ color: TEXT }}>You have 34 photos. Your top competitor has 89.</p>
            <p className="text-xs" style={{ color: MUTED }}>Profiles with 100+ photos get 2x more clicks. Add at least 15 this month.</p>
          </div>
          <NmButton size="sm">
            <Plus size={12} /> Upload Photos
          </NmButton>
        </div>
      </NmCard>

      <div className="grid grid-cols-3 gap-5">
        {/* Categories */}
        <NmCard className="p-5">
          <SectionHeader title="Photo Categories" />
          <div className="space-y-3">
            {photoCategories.map(({ label, count, target }) => {
              const pct = (count / target) * 100;
              return (
                <div key={label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span style={{ color: TEXT, fontWeight: 600 }}>{label}</span>
                    <span style={{ color: MUTED }}>{count}/{target}</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full" style={{ background: "#DDE4E2", boxShadow: nm.insetSm }}>
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: pct >= 80 ? PRIMARY : pct >= 50 ? WARN : DANGER }} />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 p-3 rounded-xl text-xs" style={{ background: PRIMARY_LIGHT, color: PRIMARY_DARK }}>
            <strong>AI Tip:</strong> Before/After photos drive 3x more engagement. Add 6 more with patient consent forms.
          </div>
        </NmCard>

        {/* Photo grid */}
        <div className="col-span-2">
          <SectionHeader title="Photo Library" subtitle="34 photos · Last added 3 weeks ago" action={
            <NmButton size="sm"><Plus size={12} /> Upload</NmButton>
          } />
          <div className="grid grid-cols-3 gap-3">
            {photoUrls.map((url, i) => (
              <div key={i} className="relative group rounded-2xl overflow-hidden aspect-video bg-[#DDE4E2]"
                style={{ boxShadow: nm.sm }}>
                <img src={url} alt="Clinic photo" className="w-full h-full object-cover" />
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2"
                  style={{ background: "rgba(0,0,0,0.45)" }}>
                  <button className="w-8 h-8 rounded-xl bg-white/90 flex items-center justify-center">
                    <Eye size={13} style={{ color: TEXT }} />
                  </button>
                  <button className="w-8 h-8 rounded-xl bg-white/90 flex items-center justify-center">
                    <Trash2 size={13} style={{ color: DANGER }} />
                  </button>
                </div>
              </div>
            ))}
            {/* Upload placeholder */}
            <div className="rounded-2xl aspect-video border-2 border-dashed flex flex-col items-center justify-center cursor-pointer hover:bg-white/40 transition-colors"
              style={{ borderColor: PRIMARY + "66", background: PRIMARY_LIGHT }}>
              <Plus size={20} style={{ color: PRIMARY }} />
              <p className="text-xs font-semibold mt-1" style={{ color: PRIMARY }}>Add Photos</p>
            </div>
          </div>
        </div>
      </div>

      {/* Competitor comparison */}
      <NmCard className="p-5">
        <SectionHeader title="Competitor Photo Comparison" subtitle="Austin area dental practices" />
        <div className="space-y-3">
          {[
            { name: "Austin Family Dental (#1)", photos: 89, yours: false },
            { name: "Smiles Forever Dentistry (#2)", photos: 64, yours: false },
            { name: "Bright Smile Dental (You)", photos: 34, yours: true },
            { name: "Capitol Dental Care (#4)", photos: 28, yours: false },
          ].map(({ name, photos, yours }) => (
            <div key={name} className="flex items-center gap-3">
              <span className="text-sm w-52 flex-shrink-0" style={{ color: yours ? PRIMARY : TEXT, fontWeight: yours ? 700 : 500 }}>{name}</span>
              <div className="flex-1 h-2 rounded-full" style={{ background: "#DDE4E2", boxShadow: nm.insetSm }}>
                <div className="h-full rounded-full" style={{ width: `${(photos / 89) * 100}%`, background: yours ? PRIMARY : MUTED + "88" }} />
              </div>
              <span className="text-sm font-bold w-8 text-right" style={{ color: yours ? PRIMARY : MUTED }}>{photos}</span>
            </div>
          ))}
        </div>
      </NmCard>
    </div>
  );
}

// ─────────────────────────────────────────
// SCREEN: Q&A
// ─────────────────────────────────────────
const qaItems = [
  { id: 1, q: "Do you accept Delta Dental insurance?", a: "Yes! We are in-network with Delta Dental, Cigna, Aetna, and most major PPO plans. Call us to verify your specific coverage before your visit.", status: "published" },
  { id: 2, q: "Do you offer same-day emergency appointments?", a: "Absolutely. We reserve slots daily for dental emergencies. Call (512) 555-0193 first thing in the morning and we will do our best to see you the same day.", status: "published" },
  { id: 3, q: "Is parking available at your location?", a: "Yes, we have a free dedicated parking lot with 20 spaces directly in front of our office at 4210 North Lamar Blvd.", status: "published" },
  { id: 4, q: "What is the minimum age for patients?", a: "", status: "pending" },
  { id: 5, q: "How long does a teeth whitening session take?", a: "", status: "pending" },
  { id: 6, q: "Do you offer payment plans or financing?", a: "", status: "pending" },
];

const suggestedQs = [
  "What COVID safety protocols do you follow?",
  "Can I book appointments online?",
  "How often should I get a dental checkup?",
  "Do you offer pediatric dental services?",
];

function QAScreen() {
  const [items, setItems] = useState(qaItems);
  const [editing, setEditing] = useState<number | null>(null);
  const [draft, setDraft] = useState("");

  const generateAnswer = (q: string) => {
    const map: Record<string, string> = {
      "What is the minimum age for patients?": "We welcome patients of all ages, including children as young as 2 years old. Our team is experienced in pediatric dentistry and we create a fun, stress-free environment for young patients.",
      "How long does a teeth whitening session take?": "Our professional in-office whitening treatment takes approximately 60–90 minutes. Many patients see results up to 8 shades whiter in a single session.",
      "Do you offer payment plans or financing?": "Yes! We offer flexible financing through CareCredit and Proceed Finance with 0% interest plans available. We also accept HSA/FSA cards. Talk to our front desk team about finding a plan that fits your budget.",
    };
    return map[q] || "We would be happy to help with that question! Please call us at (512) 555-0193 or visit our office for personalized assistance.";
  };

  return (
    <div className="p-7 space-y-6 overflow-y-auto h-full">
      <PreviewBanner label="Q&A" />
      <div className="grid grid-cols-3 gap-5">
        <div className="col-span-2 space-y-5">
          <SectionHeader title="Q&A Management" subtitle="Published and pending questions" />
          <div className="space-y-3">
            {items.map(item => (
              <NmCard key={item.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <HelpCircle size={14} style={{ color: PRIMARY }} />
                      <p className="text-sm font-semibold" style={{ color: TEXT }}>{item.q}</p>
                    </div>
                    {item.status === "published" && item.a ? (
                      <div className="ml-5 p-2.5 rounded-xl text-xs" style={{ background: PRIMARY_LIGHT, color: PRIMARY_DARK }}>
                        <Bot size={11} className="inline mr-1" />{item.a}
                      </div>
                    ) : editing === item.id ? (
                      <div className="ml-5 space-y-2">
                        <textarea rows={3} value={draft} onChange={e => setDraft(e.target.value)}
                          className="w-full rounded-xl p-3 text-sm resize-none outline-none"
                          style={{ background: BG, boxShadow: nm.inset, color: TEXT, border: "none" }} />
                        <div className="flex gap-2">
                          <NmButton size="sm" onClick={() => {
                            setItems(p => p.map(x => x.id === item.id ? { ...x, a: draft, status: "published" } : x));
                            setEditing(null);
                          }}>
                            <Check size={12} /> Publish
                          </NmButton>
                          <NmButton size="sm" variant="secondary" onClick={() => setEditing(null)}>Cancel</NmButton>
                        </div>
                      </div>
                    ) : (
                      <div className="ml-5 flex gap-2">
                        <NmButton size="sm" onClick={() => { setDraft(generateAnswer(item.q)); setEditing(item.id); }}>
                          <Bot size={12} /> AI Answer
                        </NmButton>
                        <NmButton size="sm" variant="secondary" onClick={() => { setDraft(""); setEditing(item.id); }}>
                          <Edit2 size={12} /> Write Answer
                        </NmButton>
                      </div>
                    )}
                  </div>
                  <Badge label={item.status} color={item.status === "published" ? "primary" : "warning"} />
                </div>
              </NmCard>
            ))}
          </div>
        </div>

        {/* Suggested questions */}
        <div>
          <SectionHeader title="AI Suggestions" subtitle="Questions patients frequently ask" />
          <div className="space-y-2">
            {suggestedQs.map(q => (
              <NmCard key={q} className="p-3">
                <p className="text-xs font-semibold mb-2" style={{ color: TEXT }}>{q}</p>
                <NmButton size="sm" variant="ghost" onClick={() => {
                  const newId = Math.max(...items.map(i => i.id)) + 1;
                  setItems(p => [...p, { id: newId, q, a: "", status: "pending" }]);
                }}>
                  <Plus size={11} /> Add Question
                </NmButton>
              </NmCard>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// SCREEN: RANKINGS
// ─────────────────────────────────────────
const keywords = [
  { kw: "dentist near me", pos: 3, prev: 7, vol: "High" },
  { kw: "dental clinic austin", pos: 4, prev: 9, vol: "High" },
  { kw: "teeth whitening austin", pos: 6, prev: 14, vol: "Medium" },
  { kw: "austin family dentist", pos: 5, prev: 8, vol: "High" },
  { kw: "dental implants austin", pos: 8, prev: 6, vol: "Medium" },
  { kw: "emergency dentist austin", pos: 12, prev: 15, vol: "Medium" },
  { kw: "cosmetic dentist austin", pos: 11, prev: 11, vol: "Low" },
  { kw: "pediatric dentist austin", pos: 18, prev: 22, vol: "Low" },
];

const rankTrendData = [
  { month: "Mar", avg: 9.2 }, { month: "Apr", avg: 8.5 }, { month: "May", avg: 7.8 },
  { month: "Jun", avg: 7.1 }, { month: "Jul", avg: 6.4 }, { month: "Aug", avg: 5.2 },
];

function RankingsScreen() {
  const { connected } = useClinic();

  if (!connected) {
    return (
      <div className="p-7 space-y-6 overflow-y-auto h-full">
        <div className="max-w-2xl mx-auto pt-6">
          <ConnectGooglePanel what="Your local keyword positions and Maps ranking heatmap" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-7 space-y-6 overflow-y-auto h-full">
      <PreviewBanner label="Rankings" />
      <div className="grid grid-cols-3 gap-5">
        <StatCard label="Average Position" value="5.2" delta={14} deltaLabel="improvement" icon={BarChart2} iconBg={PRIMARY_LIGHT} accent={PRIMARY} />
        <StatCard label="Top 3 Keywords" value="2" delta={50} deltaLabel="vs 90 days ago" icon={Target} iconBg="#F0FDF4" accent="#17a57e" />
        <StatCard label="Keywords Tracked" value="8" icon={Hash} iconBg="#EFF6FF" accent={INFO_C} />
      </div>

      <div className="grid grid-cols-3 gap-5">
        <NmCard className="col-span-2 p-5">
          <SectionHeader title="Keyword Rankings" subtitle="Google Maps local positions" action={
            <NmButton size="sm" variant="secondary"><Plus size={12} /> Add Keyword</NmButton>
          } />
          <div className="space-y-1">
            <div className="grid grid-cols-5 text-xs font-bold uppercase tracking-wider pb-2 px-2"
              style={{ color: MUTED, borderBottom: `1px solid rgba(0,0,0,0.07)` }}>
              <span className="col-span-2">Keyword</span>
              <span className="text-center">Position</span>
              <span className="text-center">Change</span>
              <span className="text-center">Volume</span>
            </div>
            {keywords.map(({ kw, pos, prev, vol }) => {
              const change = prev - pos;
              const isUp = change > 0;
              const isFlat = change === 0;
              return (
                <div key={kw} className="grid grid-cols-5 items-center py-3 px-2 rounded-xl hover:bg-white/60 transition-colors">
                  <span className="col-span-2 text-sm font-medium" style={{ color: TEXT }}>{kw}</span>
                  <div className="flex justify-center">
                    <span className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold"
                      style={{ background: pos <= 3 ? PRIMARY_LIGHT : pos <= 10 ? "#FFFBEB" : "#FEF2F2", color: pos <= 3 ? PRIMARY : pos <= 10 ? WARN : DANGER, boxShadow: nm.xs }}>
                      #{pos}
                    </span>
                  </div>
                  <div className="flex items-center justify-center gap-1">
                    {isFlat
                      ? <Minus size={12} style={{ color: MUTED }} />
                      : isUp
                        ? <ArrowUp size={12} style={{ color: PRIMARY }} />
                        : <ArrowDown size={12} style={{ color: DANGER }} />
                    }
                    <span className="text-xs font-bold" style={{ color: isFlat ? MUTED : isUp ? PRIMARY : DANGER }}>
                      {isFlat ? "-" : Math.abs(change)}
                    </span>
                  </div>
                  <div className="flex justify-center">
                    <Badge label={vol} color={vol === "High" ? "primary" : vol === "Medium" ? "warning" : "muted"} />
                  </div>
                </div>
              );
            })}
          </div>
        </NmCard>

        {/* Avg position trend */}
        <NmCard className="p-5">
          <SectionHeader title="Avg Position Trend" subtitle="Lower is better" />
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={rankTrendData} margin={{ top: 5, right: 10, left: -30, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: MUTED }} axisLine={false} tickLine={false} />
              <YAxis reversed tick={{ fontSize: 10, fill: MUTED }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: BG, border: "none", borderRadius: 10, boxShadow: nm.sm, fontSize: 11 }} />
              <Line type="monotone" dataKey="avg" stroke={PRIMARY} strokeWidth={2.5} dot={{ fill: PRIMARY, r: 3 }} name="Avg Position" />
            </LineChart>
          </ResponsiveContainer>
          <div className="mt-3 p-3 rounded-xl text-xs" style={{ background: PRIMARY_LIGHT }}>
            <p className="font-bold mb-0.5" style={{ color: PRIMARY_DARK }}>📈 Strong Improvement</p>
            <p style={{ color: PRIMARY_DARK }}>Average position improved from 9.2 to 5.2 in 6 months.</p>
          </div>
        </NmCard>
      </div>

      {/* Maps Heatmap (visual representation) */}
      <NmCard className="p-5">
        <SectionHeader title='Maps Ranking Heatmap, "Dentist Near Me"' subtitle="Position by location grid across Austin, TX" action={
          <Badge label="Updated Today" color="primary" />
        } />
        <div className="grid grid-cols-9 gap-1.5 p-2">
          {[3,5,4,7,11,14,18,22,25, 2,3,4,6,9,12,16,20,23, 1,2,3,4,7,11,14,17,21, 2,3,3,4,6,9,12,15,19, 4,5,4,5,7,10,14,17,20, 6,7,6,7,9,11,15,18,22, 9,10,9,10,12,14,16,20,24, 12,13,12,13,15,17,19,22,25, 15,16,15,16,18,20,22,24,26].map((pos, i) => {
            const color = pos <= 3 ? PRIMARY : pos <= 7 ? WARN : pos <= 12 ? "#FB923C" : DANGER + "99";
            return (
              <div key={i} className="aspect-square rounded-lg flex items-center justify-center text-xs font-bold"
                style={{ background: color + "33", color, fontSize: 10 }}>
                {pos}
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-4 mt-3 text-xs" style={{ color: MUTED }}>
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded" style={{ background: PRIMARY }} />#1–3</div>
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded" style={{ background: WARN }} />#4–7</div>
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded" style={{ background: "#FB923C" }} />#8–12</div>
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded" style={{ background: DANGER }} />#13+</div>
        </div>
      </NmCard>
    </div>
  );
}

// ─────────────────────────────────────────
// SCREEN: COMPETITORS
// ─────────────────────────────────────────
const competitors = [
  { name: "Austin Family Dental", rank: 1, rating: 4.8, reviews: 218, photos: 89, posts: 42, categories: 5 },
  { name: "Smiles Forever Dentistry", rank: 2, rating: 4.6, reviews: 89, photos: 64, posts: 28, categories: 4 },
  { name: "Bright Smile Dental", rank: 3, rating: 4.7, reviews: 127, photos: 34, posts: 18, categories: 2, isYou: true },
  { name: "Capitol Dental Care", rank: 4, rating: 4.5, reviews: 67, photos: 28, posts: 12, categories: 3 },
];

function CompetitorsScreen() {
  const metrics = ["rating", "reviews", "photos", "posts", "categories"] as const;
  const metricLabels: Record<string, string> = { rating: "Rating", reviews: "Reviews", photos: "Photos", posts: "Posts/Month", categories: "Categories" };
  const you = competitors.find(c => c.isYou)!;

  return (
    <div className="p-7 space-y-6 overflow-y-auto h-full">
      <PreviewBanner label="Competitors" />
      {/* Competitor cards */}
      <div className="grid grid-cols-4 gap-4">
        {competitors.map(c => (
          <NmCard key={c.name} className={`p-4 ${c.isYou ? "ring-2" : ""}`}
            style={c.isYou ? { ringColor: PRIMARY, border: `2px solid ${PRIMARY}44` } : {}}>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold text-white"
                style={{ background: c.isYou ? PRIMARY : MUTED }}>
                {c.name.split(" ").map(w => w[0]).join("").slice(0, 2)}
              </div>
              <div>
                <p className="text-xs font-bold" style={{ color: TEXT }}>{c.isYou ? "You" : c.name}</p>
                <p className="text-[10px]" style={{ color: MUTED }}>Rank #{c.rank}</p>
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span style={{ color: MUTED }}>Rating</span>
                <span className="font-bold" style={{ color: TEXT }}>⭐ {c.rating}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span style={{ color: MUTED }}>Reviews</span>
                <span className="font-bold" style={{ color: TEXT }}>{c.reviews}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span style={{ color: MUTED }}>Photos</span>
                <span className="font-bold" style={{ color: c.photos < you.photos + 10 ? TEXT : DANGER }}>{c.photos}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span style={{ color: MUTED }}>Posts</span>
                <span className="font-bold" style={{ color: TEXT }}>{c.posts}</span>
              </div>
            </div>
          </NmCard>
        ))}
      </div>

      {/* Comparison table */}
      <NmCard className="p-5">
        <SectionHeader title="Detailed Comparison" subtitle="How you stack up across key GBP signals" />
        <div className="space-y-4">
          {metrics.map(m => {
            const max = Math.max(...competitors.map(c => c[m] as number));
            return (
              <div key={m}>
                <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: MUTED }}>{metricLabels[m]}</p>
                <div className="space-y-1.5">
                  {competitors.map(c => {
                    const val = c[m] as number;
                    const pct = (val / max) * 100;
                    return (
                      <div key={c.name} className="flex items-center gap-3">
                        <span className="text-xs w-44 flex-shrink-0 font-medium" style={{ color: c.isYou ? PRIMARY : TEXT }}>
                          {c.isYou ? "You" : c.name}
                        </span>
                        <div className="flex-1 h-2 rounded-full" style={{ background: "#DDE4E2", boxShadow: nm.insetSm }}>
                          <div className="h-full rounded-full transition-all"
                            style={{ width: `${pct}%`, background: c.isYou ? PRIMARY : MUTED + "55" }} />
                        </div>
                        <span className="text-xs font-bold w-8 text-right" style={{ color: c.isYou ? PRIMARY : MUTED }}>{val}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </NmCard>

      {/* AI Recommendations */}
      <NmCard className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles size={16} style={{ color: PRIMARY }} />
          <h3 className="text-sm font-bold" style={{ color: TEXT }}>AI Competitive Recommendations</h3>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[
            { gap: "Photos Gap", detail: "Austin Family Dental has 55 more photos than you. Add 20 photos this month to close the gap.", icon: Camera, urgency: "High" },
            { gap: "Category Gap", detail: "Competitors average 4 categories. You only have 2. Add 3 more to capture keyword traffic.", icon: Layers, urgency: "High" },
            { gap: "Post Frequency Gap", detail: "Top competitor posts 42/month. You post 18. Aim for 4–6 posts/week to close this gap.", icon: FileText, urgency: "Medium" },
          ].map(({ gap, detail, icon: Icon, urgency }) => (
            <div key={gap} className="p-4 rounded-xl" style={{ background: PRIMARY_LIGHT, boxShadow: nm.xs }}>
              <div className="flex items-center gap-2 mb-2">
                <Icon size={14} style={{ color: PRIMARY }} />
                <span className="text-xs font-bold" style={{ color: PRIMARY_DARK }}>{gap}</span>
                <Badge label={urgency} color={urgency === "High" ? "primary" : "warning"} />
              </div>
              <p className="text-xs" style={{ color: PRIMARY_DARK }}>{detail}</p>
            </div>
          ))}
        </div>
      </NmCard>
    </div>
  );
}

// ─────────────────────────────────────────
// SCREEN: PERFORMANCE
// ─────────────────────────────────────────
const perfMetrics = [
  { label: "Business Searches", value: "1,247", delta: 22, icon: Search, iconBg: PRIMARY_LIGHT, accent: PRIMARY },
  { label: "Map Views", value: "2,847", delta: 18, icon: Eye, iconBg: "#EFF6FF", accent: INFO_C },
  { label: "Phone Calls", value: "184", delta: 9, icon: Phone, iconBg: "#F0FDF4", accent: "#17a57e" },
  { label: "Website Clicks", value: "312", delta: 14, icon: Globe, iconBg: "#F5F3FF", accent: PURPLE },
  { label: "Direction Requests", value: "96", delta: 7, icon: Navigation2, iconBg: "#FFFBEB", accent: WARN },
];

const monthlyPerf = [
  { month: "Mar", searches: 980, views: 1840, calls: 124, clicks: 198, dirs: 72 },
  { month: "Apr", searches: 1050, views: 2120, calls: 142, clicks: 234, dirs: 80 },
  { month: "May", searches: 1120, views: 2380, calls: 158, clicks: 267, dirs: 85 },
  { month: "Jun", searches: 1180, views: 2650, calls: 167, clicks: 289, dirs: 91 },
  { month: "Jul", searches: 1210, views: 2710, calls: 178, clicks: 298, dirs: 94 },
  { month: "Aug", searches: 1247, views: 2847, calls: 184, clicks: 312, dirs: 96 },
];

function PerformanceScreen() {
  const { connected } = useClinic();
  const [metric, setMetric] = useState("views");
  const metricMap: Record<string, { label: string; color: string }> = {
    searches: { label: "Business Searches", color: PRIMARY },
    views: { label: "Map Views", color: INFO_C },
    calls: { label: "Phone Calls", color: "#17a57e" },
    clicks: { label: "Website Clicks", color: PURPLE },
    dirs: { label: "Direction Requests", color: WARN },
  };

  if (!connected) {
    return (
      <div className="p-7 space-y-6 overflow-y-auto h-full">
        <div className="max-w-2xl mx-auto pt-6">
          <ConnectGooglePanel what="Your profile views, calls, and website clicks from Google" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-7 space-y-6 overflow-y-auto h-full">
      <PreviewBanner label="Performance" />
      <div className="grid grid-cols-5 gap-4">
        {perfMetrics.map(m => (
          <StatCard key={m.label} {...m} deltaLabel="vs last month" />
        ))}
      </div>

      <NmCard className="p-5">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-bold" style={{ color: TEXT }}>Metric Trend</h2>
            <p className="text-sm" style={{ color: MUTED }}>6-month history</p>
          </div>
          <div className="flex gap-1">
            {Object.entries(metricMap).map(([key, { label }]) => (
              <button key={key} onClick={() => setMetric(key)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
                style={metric === key ? { background: PRIMARY, color: "#fff", boxShadow: nm.primary } : { background: BG, color: MUTED, boxShadow: nm.xs }}>
                {label.split(" ")[0]}
              </button>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={monthlyPerf} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="metricGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={metricMap[metric].color} stopOpacity={0.2} />
                <stop offset="95%" stopColor={metricMap[metric].color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: MUTED }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: MUTED }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ background: BG, border: "none", borderRadius: 12, boxShadow: nm.sm, fontSize: 12 }} />
            <Area type="monotone" dataKey={metric} stroke={metricMap[metric].color}
              fill="url(#metricGrad)" strokeWidth={2.5} dot={false} name={metricMap[metric].label} />
          </AreaChart>
        </ResponsiveContainer>
      </NmCard>

      {/* Discovery breakdown */}
      <div className="grid grid-cols-2 gap-5">
        <NmCard className="p-5">
          <SectionHeader title="Search Discovery" subtitle="How patients find your listing" />
          <div className="space-y-3">
            {[
              { label: "Direct searches (name/address)", val: 68, color: PRIMARY },
              { label: "Discovery searches (category/service)", val: 28, color: INFO_C },
              { label: "Branded searches", val: 4, color: PURPLE },
            ].map(({ label, val, color }) => (
              <div key={label}>
                <div className="flex justify-between text-xs mb-1">
                  <span style={{ color: TEXT }}>{label}</span>
                  <span style={{ color, fontWeight: 700 }}>{val}%</span>
                </div>
                <div className="w-full h-2 rounded-full" style={{ background: "#DDE4E2", boxShadow: nm.insetSm }}>
                  <div className="h-full rounded-full" style={{ width: `${val}%`, background: color }} />
                </div>
              </div>
            ))}
          </div>
        </NmCard>

        <NmCard className="p-5">
          <SectionHeader title="Top Search Queries" subtitle="Keywords driving GBP views" />
          <div className="space-y-2">
            {[
              { q: "bright smile dental austin", count: 312 },
              { q: "dentist near me", count: 287 },
              { q: "teeth whitening austin tx", count: 198 },
              { q: "austin dentist", count: 156 },
              { q: "dental implants austin", count: 134 },
            ].map(({ q, count }) => (
              <div key={q} className="flex items-center justify-between py-1.5 border-b" style={{ borderColor: "rgba(0,0,0,0.05)" }}>
                <span className="text-sm" style={{ color: MUTED }}>{q}</span>
                <span className="text-sm font-bold" style={{ color: TEXT }}>{count}</span>
              </div>
            ))}
          </div>
        </NmCard>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// SCREEN: REPORTS
// ─────────────────────────────────────────
function ReportsScreen() {
  return (
    <div className="p-7 space-y-6 overflow-y-auto h-full">
      <PreviewBanner label="Reports" />
      {/* Report header */}
      <NmCard className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <Badge label="Monthly Report · August 2026" color="primary" />
            <h2 className="text-2xl font-bold mt-2 mb-1" style={{ color: TEXT }}>GBP Growth Report</h2>
            <p className="text-sm" style={{ color: MUTED }}>Bright Smile Dental · Austin, TX · Generated Aug 19, 2026</p>
          </div>
          <div className="flex gap-2">
            <NmButton size="sm" variant="secondary"><Share2 size={12} /> Share</NmButton>
            <NmButton size="sm"><Download size={12} /> Download PDF</NmButton>
          </div>
        </div>

        {/* Executive summary */}
        <div className="mt-5 p-4 rounded-xl text-sm" style={{ background: PRIMARY_LIGHT, color: PRIMARY_DARK }}>
          <p className="font-bold mb-1">Executive Summary</p>
          <p>August was your strongest month of the year. Profile views increased 18% MoM, phone calls are up 9%, and your Maps ranking improved from #5 to #3. The key driver: 12 new patient reviews and 3 posts published during the month. Critical action remaining: add a booking link and upload 15+ photos.</p>
        </div>
      </NmCard>

      {/* KPIs */}
      <div className="grid grid-cols-5 gap-4">
        {[
          { label: "Growth Score", value: "78", prev: "66", up: true },
          { label: "Maps Rank", value: "#3", prev: "#5", up: true },
          { label: "New Reviews", value: "12", prev: "8", up: true },
          { label: "Avg Rating", value: "4.7★", prev: "4.6★", up: true },
          { label: "Profile Views", value: "2,847", prev: "2,410", up: true },
        ].map(({ label, value, prev, up }) => (
          <NmCard key={label} className="p-4 text-center">
            <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: MUTED }}>{label}</p>
            <p className="text-2xl font-bold mb-1" style={{ color: TEXT }}>{value}</p>
            <div className="flex items-center justify-center gap-1 text-xs">
              {up ? <ArrowUp size={11} style={{ color: PRIMARY }} /> : <ArrowDown size={11} style={{ color: DANGER }} />}
              <span style={{ color: MUTED }}>prev: {prev}</span>
            </div>
          </NmCard>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-5">
        <NmCard className="p-5">
          <SectionHeader title="Monthly Views Trend" />
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={perfData} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: MUTED }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: MUTED }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: BG, border: "none", borderRadius: 10, boxShadow: nm.sm, fontSize: 11 }} />
              <Bar dataKey="views" fill={PRIMARY} radius={[6, 6, 0, 0]} name="Views" />
            </BarChart>
          </ResponsiveContainer>
        </NmCard>

        <NmCard className="p-5">
          <SectionHeader title="Actions Completed This Month" />
          <div className="space-y-3 mt-2">
            {[
              { label: "Reviews responded", val: 7, target: 12, done: false },
              { label: "Posts published", val: 3, target: 8, done: false },
              { label: "Photos added", val: 0, target: 15, done: false },
              { label: "New reviews earned", val: 12, target: 10, done: true },
            ].map(({ label, val, target, done }) => (
              <div key={label}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span style={{ color: TEXT, fontWeight: 600 }}>{label}</span>
                  <div className="flex items-center gap-2">
                    <span style={{ color: done ? PRIMARY : MUTED }}>{val}/{target}</span>
                    {done && <CheckCircle2 size={12} style={{ color: PRIMARY }} />}
                  </div>
                </div>
                <div className="w-full h-1.5 rounded-full" style={{ background: "#DDE4E2", boxShadow: nm.insetSm }}>
                  <div className="h-full rounded-full" style={{ width: `${Math.min((val / target) * 100, 100)}%`, background: done ? PRIMARY : WARN }} />
                </div>
              </div>
            ))}
          </div>
        </NmCard>
      </div>

      {/* Next month focus */}
      <NmCard className="p-5">
        <SectionHeader title="September Focus Areas" subtitle="AI-recommended priorities for next month" action={
          <Badge label="AI Generated" color="primary" />
        } />
        <div className="grid grid-cols-3 gap-4">
          {[
            { priority: "1", title: "Upload 15+ photos", detail: "Close the photo gap with Austin Family Dental. Focus on before/afters and team shots.", icon: Camera },
            { priority: "2", title: "Add booking link", detail: "Critical missing element. Connect your Calendly or Jane App scheduling link.", icon: ExternalLink },
            { priority: "3", title: "Post 2x per week", detail: "Maintain momentum from August. Schedule 8 posts in advance using the Posts screen.", icon: FileText },
          ].map(({ priority, title, detail, icon: Icon }) => (
            <div key={priority} className="p-4 rounded-xl" style={{ background: BG, boxShadow: nm.xs }}>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold text-white"
                  style={{ background: PRIMARY }}>{priority}</span>
                <Icon size={14} style={{ color: PRIMARY }} />
              </div>
              <p className="text-sm font-bold mb-1" style={{ color: TEXT }}>{title}</p>
              <p className="text-xs" style={{ color: MUTED }}>{detail}</p>
            </div>
          ))}
        </div>
      </NmCard>
    </div>
  );
}

// ─────────────────────────────────────────
// SCREEN: AI ASSISTANT
// ─────────────────────────────────────────
type Message = { role: "user" | "ai"; text: string };

const initMessages: Message[] = [
  { role: "ai", text: "Hi! I'm your GrowClinic AI assistant. This is a preview of how I'll help, once you connect your Google Business Profile, I'll give you profile-specific recommendations for reviews, posts, categories and local visibility. The example answers below show the kind of guidance you'll get." },
];

const quickActions = [
  "Write a response to my 2-star review",
  "Generate a teeth whitening promotion post",
  "What are my biggest ranking opportunities?",
  "Compare me to Austin Family Dental",
  "Draft 5 Q&A answers for my profile",
];

const aiResponses: Record<string, string> = {
  "Write a response to my 2-star review": `Here's a professional reply to James Liu's review:\n\n"Dear James, thank you for your feedback. We sincerely apologize for the wait time and the experience with our front desk, this falls below the standard we hold ourselves to. We'd love the opportunity to make this right. Please call us at (512) 555-0193 and ask for our Office Manager, Rachel. We'll personally ensure your next visit exceeds expectations."\n\nThis response acknowledges the issue, apologizes, and takes the conversation offline, which Google rewards.`,
  "What are my biggest ranking opportunities?": "Your top 3 ranking opportunities:\n\n1. **Add booking link** (Critical), Listings with booking links rank higher in competitive queries. This alone could move you from #3 to #1 for 'dentist near me'.\n\n2. **Expand categories**, You only have 2 categories vs competitors with 4–5. Adding 'Teeth Whitening Service' and 'Orthodontist' would capture ~600 additional monthly searches.\n\n3. **Photo freshness**, You haven't uploaded photos in 3 weeks. Weekly photo uploads signal active management to Google's algorithm.",
};

function AIAssistantScreen() {
  const [messages, setMessages] = useState<Message[]>(initMessages);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = (text: string) => {
    if (!text.trim()) return;
    const userMsg: Message = { role: "user", text };
    setMessages(p => [...p, userMsg]);
    setInput("");
    setTimeout(() => {
      const reply = aiResponses[text] || "Great question! Based on your profile data, I'd recommend focusing on your photo count and review response rate first, these have the highest immediate impact on your Maps ranking. Would you like me to create an action plan?";
      setMessages(p => [...p, { role: "ai", text: reply }]);
    }, 800);
  };

  const { location, orgName, score } = useClinic();
  const clinicName = location?.name || orgName || "your clinic";
  return (
    <div className="flex flex-col h-full">
      <div className="p-7 flex-1 overflow-y-auto space-y-4">
        <PreviewBanner label="AI Assistant" />
        {/* Profile context */}
        <NmCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: PRIMARY, boxShadow: nm.primary }}>
              <Sparkles size={18} color="#fff" />
            </div>
            <div>
              <p className="text-sm font-bold" style={{ color: TEXT }}>GrowClinic AI, Profile-Aware Assistant</p>
              <p className="text-xs" style={{ color: MUTED }}>{clinicName}{score ? ` · Setup Score ${score.score}/100` : ""}</p>
            </div>
          </div>
        </NmCard>

        {/* Quick actions */}
        <div className="flex flex-wrap gap-2">
          {quickActions.map(q => (
            <button key={q} onClick={() => send(q)}
              className="px-3 py-2 rounded-xl text-xs font-semibold transition-all hover:bg-white/80"
              style={{ background: BG, boxShadow: nm.xs, color: MUTED }}>
              {q}
            </button>
          ))}
        </div>

        {/* Messages */}
        <div className="space-y-4">
          {messages.map((m, i) => (
            <div key={i} className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: m.role === "ai" ? PRIMARY : MUTED, boxShadow: nm.xs }}>
                {m.role === "ai" ? <Bot size={14} color="#fff" /> : <User size={14} color="#fff" />}
              </div>
              <div className="max-w-xl">
                <div className={`p-3.5 rounded-2xl text-sm`}
                  style={{
                    background: m.role === "ai" ? BG : PRIMARY,
                    color: m.role === "ai" ? TEXT : "#fff",
                    boxShadow: m.role === "ai" ? nm.sm : nm.primary,
                    whiteSpace: "pre-line",
                  }}>
                  {m.text}
                </div>
              </div>
            </div>
          ))}
        </div>
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-5 border-t" style={{ borderColor: "rgba(0,0,0,0.07)", background: BG }}>
        <div className="flex gap-3">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
            placeholder="Ask about your profile, rankings, reviews, or growth..."
            className="flex-1 px-4 py-3 rounded-xl text-sm outline-none"
            style={{ background: BG, boxShadow: nm.inset, color: TEXT, border: "none" }}
          />
          <NmButton onClick={() => send(input)} disabled={!input.trim()}>
            <Send size={14} /> Send
          </NmButton>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// SCREEN: SETTINGS
// ─────────────────────────────────────────
function SettingsScreen() {
  const { location, orgName, user, connected } = useClinic();
  const [notifications, setNotifications] = useState({
    newReview: true, weeklyReport: true, rankingAlert: true, competitorAlert: false,
  });
  const dash = (v?: string | null) => v || "-";
  const accountFields = [
    { label: "Practice Name", val: dash(location?.name || orgName) },
    { label: "Owner / Admin", val: dash(user?.name || user?.phone) },
    { label: "Email", val: dash(location?.email) },
    { label: "Phone", val: dash(location?.phone) },
    { label: "City", val: dash([location?.locality, location?.city].filter(Boolean).join(", ") || null) },
    { label: "Primary Category", val: dash(location?.primaryCategory) },
  ];

  return (
    <div className="p-7 space-y-6 overflow-y-auto h-full">
      <div className="grid grid-cols-3 gap-5">
        {/* Account */}
        <NmCard className="p-5 col-span-2">
          <SectionHeader title="Account & Clinic Info" />
          <div className="grid grid-cols-2 gap-4">
            {accountFields.map(({ label, val }) => (
              <div key={label}>
                <p className="text-xs font-semibold mb-1" style={{ color: MUTED }}>{label}</p>
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
                  style={{ background: BG, boxShadow: nm.inset, color: TEXT, fontSize: 14 }}>
                  {val}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex justify-end">
            <NmButton size="sm"><Check size={12} /> Save Changes</NmButton>
          </div>
        </NmCard>

        {/* Plan */}
        <NmCard className="p-5">
          <SectionHeader title="Plan & Billing" />
          <div className="p-4 rounded-xl mb-4" style={{ background: BG, boxShadow: nm.xs }}>
            <div className="flex items-center gap-2 mb-1">
              <Award size={16} style={{ color: MUTED }} />
              <span className="text-sm font-bold" style={{ color: TEXT }}>Free, Setup</span>
            </div>
            <p className="text-xs" style={{ color: MUTED }}>1 location · profile audit &amp; setup</p>
            <p className="text-xs mt-2" style={{ color: MUTED }}>Paid plans (INR, GST invoices via Razorpay) launch soon.</p>
          </div>
          <div className="space-y-2 text-xs" style={{ color: MUTED }}>
            <div className="flex items-center gap-2"><Check size={11} style={{ color: PRIMARY }} /> Free GBP audit &amp; setup checklist</div>
            <div className="flex items-center gap-2"><Info size={11} style={{ color: MUTED }} /> Google connect, reviews &amp; posts, coming soon</div>
          </div>
          <NmButton size="sm" variant="secondary" disabled className="w-full mt-4 justify-center">Billing coming soon</NmButton>
        </NmCard>
      </div>

      {/* Notifications */}
      <NmCard className="p-5">
        <SectionHeader title="Notification Preferences" />
        <div className="grid grid-cols-2 gap-3">
          {Object.entries(notifications).map(([key, enabled]) => {
            const labels: Record<string, { label: string; desc: string }> = {
              newReview: { label: "New Review Alerts", desc: "Get notified when a patient leaves a review" },
              weeklyReport: { label: "Weekly Summary Email", desc: "Performance digest every Monday morning" },
              rankingAlert: { label: "Ranking Changes", desc: "Alert when any keyword moves 3+ positions" },
              competitorAlert: { label: "Competitor Activity", desc: "Notify when competitors add photos or posts" },
            };
            const { label, desc } = labels[key];
            return (
              <div key={key} className="flex items-start justify-between p-3 rounded-xl"
                style={{ background: BG, boxShadow: nm.xs }}>
                <div>
                  <p className="text-sm font-semibold" style={{ color: TEXT }}>{label}</p>
                  <p className="text-xs" style={{ color: MUTED }}>{desc}</p>
                </div>
                <button
                  onClick={() => setNotifications(p => ({ ...p, [key]: !enabled }))}
                  className="w-11 h-6 rounded-full relative flex-shrink-0 ml-4 transition-all"
                  style={{ background: enabled ? PRIMARY : "#DDE4E2", boxShadow: enabled ? nm.primary : nm.insetSm }}>
                  <div className="w-4 h-4 rounded-full bg-white absolute top-1 transition-all"
                    style={{ left: enabled ? "26px" : "2px", boxShadow: "1px 1px 4px rgba(0,0,0,0.15)" }} />
                </button>
              </div>
            );
          })}
        </div>
      </NmCard>

      {/* Integrations */}
      <NmCard className="p-5">
        <SectionHeader title="Integrations" subtitle="Connect third-party tools" />
        <div className="grid grid-cols-3 gap-3">
          {[
            { name: "Google Business Profile", status: connected ? "connected" : "not connected", icon: "G" },
            { name: "Google Search Console", status: "not connected", icon: "SC" },
            { name: "Calendly (Booking)", status: "not connected", icon: "C" },
            { name: "Mailchimp", status: "not connected", icon: "M" },
            { name: "Podium Reviews", status: "not connected", icon: "P" },
            { name: "Birdeye", status: "not connected", icon: "B" },
          ].map(({ name, status, icon }) => (
            <div key={name} className="flex items-center gap-3 p-3 rounded-xl"
              style={{ background: BG, boxShadow: nm.xs }}>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                style={{ background: status === "connected" ? PRIMARY : MUTED }}>
                {icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold truncate" style={{ color: TEXT }}>{name}</p>
                <Badge label={status === "connected" ? "Connected" : "Connect"} color={status === "connected" ? "primary" : "muted"} />
              </div>
            </div>
          ))}
        </div>
      </NmCard>
    </div>
  );
}

// ─────────────────────────────────────────
// LOCATION SELECTOR MODAL
// ─────────────────────────────────────────
function LocationSelectorModal({ onClose, onSuccess }: { onClose: () => void, onSuccess: () => void }) {
  const { location, orgName } = useClinic();
  const [googleLocs, setGoogleLocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    api.googleLocations()
      .then(locs => setGoogleLocs(locs))
      .catch(e => {
        console.error(e);
        setErrorMsg(e.message || "Failed to fetch from Google API. Make sure the My Business APIs are enabled and approved in Google Cloud.");
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSelect = async (gLoc: any) => {
    setSelecting(gLoc.name);
    try {
      let targetLocationId = location?.id;
      
      // If the user has no internal location yet, create a draft one using the Google location's details
      if (!targetLocationId) {
        const newLoc = await api.req("/api/locations", {
          method: "POST",
          body: {
            name: gLoc.title || orgName || "My Clinic",
            address: gLoc.address
          }
        });
        targetLocationId = newLoc.location.id;
      }
      
      await api.googleSelect(gLoc.name, targetLocationId);
      onSuccess();
    } catch (e) {
      alert("Failed to bind location");
      setSelecting(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <NmCard className="w-full max-w-md p-6 bg-white relative z-50 overflow-hidden">
        <h2 className="text-lg font-bold mb-2">Select Google Location</h2>
        <p className="text-sm text-gray-500 mb-6">Which of these Google Business Profile locations corresponds to {location?.name ? `"${location.name}"` : "your clinic"}?</p>
        
        {loading ? (
          <div className="text-sm text-center py-4">Loading your locations...</div>
        ) : errorMsg ? (
          <div className="text-sm text-center py-4 text-red-500 font-semibold">{errorMsg}</div>
        ) : googleLocs.length === 0 ? (
          <div className="text-sm text-center py-4 text-red-500">No locations found on this Google account.</div>
        ) : (
          <div className="space-y-3">
            {googleLocs.map(gLoc => (
              <button 
                key={gLoc.name}
                onClick={() => handleSelect(gLoc)}
                disabled={selecting !== null}
                className="w-full text-left p-4 rounded-xl border hover:border-teal-500 hover:bg-teal-50 transition-colors disabled:opacity-50"
              >
                <div className="font-bold text-sm" style={{ color: TEXT }}>{gLoc.title}</div>
                <div className="text-xs mt-1" style={{ color: MUTED }}>{gLoc.address}</div>
              </button>
            ))}
          </div>
        )}
        <div className="mt-6 flex justify-end">
          <NmButton variant="secondary" onClick={onClose} disabled={selecting !== null}>Cancel</NmButton>
        </div>
      </NmCard>
    </div>
  );
}

// ─────────────────────────────────────────
// APP
// ─────────────────────────────────────────
export default function DashboardApp({ onLogout }: { onLogout?: () => void }) {
  const [screen, setScreen] = useState<Screen>("dashboard");
  const [navOpen, setNavOpen] = useState(false);
  const [clinic, setClinic] = useState<ClinicCtx>({
    loading: true, user: null, role: null, orgName: null, location: null, score: null, connected: false,
  });
  const [showLocationModal, setShowLocationModal] = useState(false);

  const fetchClinic = async (alive = true) => {
    try {
      const me = await api.me().catch(() => null);
      const activeOrg = me?.memberships?.find((m: any) => m.orgId === me?.activeOrgId);
      let location: ClinicLocation | null = null;
      let score: ScoreReport | null = null;
      let connected = false;
      try {
        const locs = await api.locations();
        location = locs?.locations?.[0] || null;
        if (location) {
          const s = await api.score(location.id).catch(() => null);
          if (s) { score = s.report; connected = !!s.connected; }
        }
      } catch { /* no org/location yet */ }
      if (!alive) return;
      setClinic({
        loading: false,
        user: me?.user || null,
        role: me?.role || null,
        orgName: activeOrg?.orgName || null,
        location, score, connected,
      });

      // Check if we need to show the location selector
      const urlParams = new URLSearchParams(window.location.search);
      const justConnected = urlParams.get("connected") === "true";
      
      // If we just connected, show the modal regardless of whether we have a location yet
      if (justConnected || (connected && location && !location.googleLocationId)) {
        setShowLocationModal(true);
        if (justConnected) {
          // clean URL without reloading
          window.history.replaceState({}, document.title, "/app");
        }
      }
    } catch {
      if (alive) setClinic((c) => ({ ...c, loading: false }));
    }
  };

  useEffect(() => {
    let alive = true;
    fetchClinic(alive);
    return () => { alive = false; };
  }, []);

  const screens: Record<Screen, React.ReactNode> = {
    dashboard: <DashboardScreen setScreen={setScreen} />,
    audit: <AuditScreen />,
    "growth-plan": <GrowthPlanScreen setScreen={setScreen} />,
    "gbp-management": <GBPManagementScreen />,
    reviews: <ReviewsScreen />,
    posts: <PostsScreen />,
    services: <ServicesScreen />,
    photos: <PhotosScreen />,
    qa: <QAScreen />,
    rankings: <RankingsScreen />,
    competitors: <CompetitorsScreen />,
    performance: <PerformanceScreen />,
    reports: <ReportsScreen />,
    "ai-assistant": <AIAssistantScreen />,
    settings: <SettingsScreen />,
  };

  return (
    <ClinicContext.Provider value={clinic}>
      <div className="flex h-screen w-full overflow-hidden" style={{ background: PAGE_BG, fontFamily: "'Satoshi', sans-serif" }}>
        <Sidebar active={screen} setActive={(s) => { setScreen(s); setNavOpen(false); }} onLogout={onLogout} open={navOpen} />
        {/* Mobile overlay when the drawer is open */}
        {navOpen && <div onClick={() => setNavOpen(false)} className="fixed inset-0 z-40 bg-black/40 md:hidden" />}
        <div className="flex flex-col flex-1 min-w-0">
          <Header screen={screen} onMenu={() => setNavOpen(true)} />
          <div className="flex-1 overflow-auto" style={{ background: "transparent" }}>
            {screens[screen]}
          </div>
        </div>
      </div>
      {showLocationModal && (
        <LocationSelectorModal 
          onClose={() => setShowLocationModal(false)}
          onSuccess={() => {
            setShowLocationModal(false);
            fetchClinic(); // Refresh state after bind
          }}
        />
      )}
    </ClinicContext.Provider>
  );
}
