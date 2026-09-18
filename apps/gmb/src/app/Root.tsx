import { useState, useEffect, lazy, Suspense } from "react";
import Landing from "./screens/Landing";
import Login from "./screens/Login";
import AuditResults from "./screens/AuditResults";
import { PrivacyScreen, TermsScreen } from "./screens/Legal";
import { api } from "./lib/api";
import { BG, PAGE_BG, PRIMARY, MUTED } from "./theme";

// Lazy-load the heavy dashboard (Recharts etc.) so the public landing + login
// load instantly; the dashboard chunk only downloads after sign-in.
const DashboardApp = lazy(() => import("./App"));

type View = "landing" | "login" | "app" | "audit" | "privacy" | "terms";

// The product lives under /app (and the legacy /admin alias); the shareable
// public report is /audit?place=<id>; everything else is the landing at /.
const APP_PATH = "/app";
const isAppPath = (p: string) => /^\/(app|admin)(\/|$)?/.test(p);
const isAuditPath = (p: string) => /^\/audit(\/|$)?/.test(p);
const isPrivacyPath = (p: string) => /^\/privacy(\/|$)?/.test(p);
const isTermsPath = (p: string) => /^\/terms(\/|$)?/.test(p);

function initialView(): View {
  if (isAuditPath(location.pathname)) return "audit";
  if (isPrivacyPath(location.pathname)) return "privacy";
  if (isTermsPath(location.pathname)) return "terms";
  if (isAppPath(location.pathname)) return "login";
  return "landing";
}

export default function Root() {
  const [view, setView] = useState<View>(initialView());
  const [prefill, setPrefill] = useState<any>(null);
  const [auditData, setAuditData] = useState<any>(null);
  const [auditError, setAuditError] = useState("");

  // Navigate landing/login/app and keep the address bar in sync.
  const go = (v: View, opts: { replace?: boolean } = {}) => {
    setView(v);
    let next = "/";
    if (v === "app") next = APP_PATH;
    else if (v === "privacy") next = "/privacy";
    else if (v === "terms") next = "/terms";
    else if (v === "audit") return; // Handled by viewReport
    
    // Preserve query string if we are just switching view on the same base path
    if (location.pathname === next && location.search) {
      next += location.search;
    }
    
    if (location.pathname + location.search !== next) {
      if (opts.replace) history.replaceState({}, "", next);
      else history.pushState({}, "", next);
    }
  };

  // Open the full report for an already-fetched audit (no refetch); shareable URL.
  const viewReport = (data: any) => {
    setAuditData(data); setAuditError(""); setView("audit");
    history.pushState({}, "", `/audit?place=${encodeURIComponent(data.place.placeId)}`);
  };

  useEffect(() => {
    // Normalize the legacy /admin alias to /app.
    if (/^\/admin(\/|$)?/.test(location.pathname)) history.replaceState({}, "", APP_PATH);

    // Deep-link: /audit?place=<id> → fetch and render the shareable report.
    if (isAuditPath(location.pathname)) {
      const placeId = new URLSearchParams(location.search).get("place");
      if (placeId) {
        api.auditPlace(placeId)
          .then((d) => setAuditData(d))
          .catch(() => setAuditError("We couldn't load that report. Try a new check."));
      } else {
        setAuditError("No clinic specified.");
      }
    }

    // Handoff integration: /?t=<token>
    const handoffToken = new URLSearchParams(location.search).get("t");
    if (handoffToken && !isAppPath(location.pathname)) {
      api.handoffExchange(handoffToken)
        .then((data) => {
          // Pre-seed login flow with the clinic data
          setPrefill({
            name: data.clinicName,
            address: data.city,
            phone: data.phone,
            types: [data.specialty],
          });
          go("login", { replace: true });
        })
        .catch((e) => {
          console.warn("Handoff token failed:", e.message);
        });
    }

    // A live session sends the user to the app — unless they're viewing a public report or legal pages.
    api.me()
      .then((r) => { 
        if (r && r.user && !isAuditPath(location.pathname) && !isPrivacyPath(location.pathname) && !isTermsPath(location.pathname)) {
          go("app", { replace: true }); 
        }
      })
      .catch(() => { /* not signed in — stay on the current view */ });

    const onPop = () => setView(initialView());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const logout = async () => {
    try { await api.logout(); } catch { /* ignore */ }
    setPrefill(null);
    go("landing");
  };

  if (view === "privacy") return <PrivacyScreen />;
  if (view === "terms") return <TermsScreen />;
  if (view === "audit") {
    if (auditData) {
      return (
        <AuditResults
          data={auditData}
          onClaim={(place) => { setPrefill(place); go("login"); }}
          onBack={() => go("landing")}
          onHome={() => go("landing")}
        />
      );
    }
    return (
      <div style={{ minHeight: "100vh", background: PAGE_BG, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12, fontFamily: "'Satoshi', sans-serif" }}>
        {auditError
          ? <><p style={{ color: MUTED }}>{auditError}</p><button onClick={() => go("landing")} style={{ background: PRIMARY, color: "#fff", border: "none", borderRadius: 12, padding: "12px 24px", fontWeight: 700, cursor: "pointer" }}>Run a new check</button></>
          : <p style={{ color: MUTED }}>Loading report…</p>}
      </div>
    );
  }

  if (view === "landing") {
    return (
      <Landing
        onClaim={(place) => { setPrefill(place); go("login"); }}
        onLogin={() => { setPrefill(null); go("login"); }}
        onReport={viewReport}
      />
    );
  }

  if (view === "login") {
    return (
      <Login
        prefill={prefill}
        onBack={() => go("landing")}
        onAuthed={() => go("app")}
      />
    );
  }

  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: BG }} />}>
      <DashboardApp onLogout={logout} />
    </Suspense>
  );
}
