import { Stethoscope, ShieldCheck, Clock, Lock, ListChecks, Search, MessageSquare, TrendingUp, Camera, Bot, Star, CheckCircle2, ArrowRight } from "lucide-react";
import AuditWidget from "../components/AuditWidget";
import { BG, PRIMARY, PRIMARY_DARK, PRIMARY_LIGHT, TEXT, MUTED, nm, GRAD_DEEP, CARD_BG, CARD_RADIUS, PAGE_BG } from "../theme";

const FEATURES = [
  { icon: Search, title: "Profile health audit", desc: "See exactly what's holding your Google profile back, with evidence and prioritized fixes." },
  { icon: MessageSquare, title: "Review replies", desc: "Reply faster with safe, on-brand drafts. Sensitive reviews are flagged, never auto-sent." },
  { icon: Bot, title: "AI posts & updates", desc: "Generate compliant posts, offers and Q&A that keep your profile active and ranking." },
  { icon: TrendingUp, title: "Rank tracking", desc: "Track your Map rankings and see how you stack up against nearby clinics." },
  { icon: Camera, title: "Photo planner", desc: "Close the photo gap with competitors, a top driver of profile clicks and calls." },
  { icon: ShieldCheck, title: "Consent-led control", desc: "Every profile change needs your explicit approval. Nothing is published behind your back." },
];

const STEPS = [
  { n: "1", title: "Search your clinic", desc: "Find your Google Business Profile in seconds, no login needed." },
  { n: "2", title: "Get your free score", desc: "See your visibility score and the exact gaps hurting your ranking." },
  { n: "3", title: "Fix & grow", desc: "Claim your profile and let GrowClinic keep it accurate, active and discoverable." },
];

function Pill({ icon: Icon, children }: { icon: any; children: any }) {
  return (
    <span className="rounded-full" style={{ display: "inline-flex", alignItems: "center", gap: 6, background: BG, boxShadow: nm.xs, padding: "8px 14px", fontSize: 13, fontWeight: 700, color: PRIMARY_DARK }}>
      <Icon size={13} /> {children}
    </span>
  );
}

export default function Landing({ onClaim, onLogin, onReport }: { onClaim: (place: any) => void; onLogin: () => void; onReport: (data: any) => void }) {
  return (
    <div style={{ minHeight: "100vh", background: PAGE_BG, fontFamily: "'Satoshi', sans-serif", color: TEXT }}>
      {/* Nav */}
      <header style={{ position: "sticky", top: 0, zIndex: 40, background: "rgba(244,248,247,0.85)", backdropFilter: "blur(12px)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 24px", maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div className="rounded-xl" style={{ width: 40, height: 40, background: PRIMARY, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: nm.primary }}>
              <Stethoscope size={20} color="#fff" />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 18 }}>GrowClinic <span style={{ color: PRIMARY }}>GMB</span></div>
              <div style={{ fontSize: 10, letterSpacing: "1.5px", textTransform: "uppercase", color: MUTED, fontWeight: 700, marginTop: -2 }}>Profile Engine</div>
            </div>
          </div>
          <button onClick={onLogin} className="rounded-xl" style={{ background: PRIMARY, color: "#fff", fontWeight: 700, padding: "10px 20px", border: "none", cursor: "pointer", boxShadow: nm.primary }}>
            Sign in
          </button>
        </div>
      </header>

      {/* Hero, two columns: copy + audit panel */}
      <section style={{ maxWidth: 1200, margin: "0 auto", padding: "48px 24px 20px" }}>
        <div style={{ display: "grid", gap: 40, alignItems: "center" }} className="lg:grid-cols-2">
          <div>
            <Pill icon={ShieldCheck}>Free Google check-up</Pill>
            <h1 style={{ fontSize: "clamp(32px,5vw,52px)", fontWeight: 800, lineHeight: 1.08, margin: "18px 0 16px" }}>
              Are patients finding you on Google, or <span style={{ color: PRIMARY }}>your competitor?</span>
            </h1>
            <p style={{ fontSize: 18, color: MUTED, maxWidth: 520, marginBottom: 24 }}>
              GrowClinic GMB keeps your Google Business Profile accurate, active and discoverable, so more patients choose you. Start with a free 60-second audit.
            </p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 22 }}>
              <button onClick={onLogin} className="rounded-xl" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: PRIMARY, color: "#fff", fontWeight: 700, padding: "13px 24px", border: "none", cursor: "pointer", boxShadow: nm.primary }}>
                Get started <ArrowRight size={16} />
              </button>
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Pill icon={Clock}>60-second report</Pill>
              <Pill icon={Lock}>No login</Pill>
              <Pill icon={ListChecks}>12 checks</Pill>
            </div>
          </div>

          {/* Audit panel */}
          <div className="rounded-2xl" style={{ background: CARD_BG, borderRadius: CARD_RADIUS, boxShadow: nm.card, padding: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <Search size={18} color={PRIMARY} />
              <span style={{ fontWeight: 800, fontSize: 16 }}>Free Google check-up</span>
            </div>
            <p style={{ color: MUTED, fontSize: 13, marginBottom: 16 }}>Type your clinic name to see your free report in seconds.</p>
            <AuditWidget onClaim={onClaim} onReport={onReport} />
          </div>
        </div>
      </section>

      {/* Trust strip */}
      <section style={{ maxWidth: 1100, margin: "40px auto 0", padding: "0 24px" }}>
        <div className="rounded-2xl" style={{ background: BG, boxShadow: nm.insetSm, padding: "18px 24px", display: "flex", alignItems: "center", justifyContent: "center", gap: 14, flexWrap: "wrap", color: MUTED, fontSize: 14 }}>
          <Star size={16} color="#F59E0B" /> Trusted by ambitious clinics &amp; hospitals across India · Dermatology · Dental · IVF · Ortho · Multispecialty
        </div>
      </section>

      {/* Features */}
      <section style={{ maxWidth: 1100, margin: "70px auto 0", padding: "0 24px" }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <Pill icon={ListChecks}>Everything in one place</Pill>
          <h2 style={{ fontSize: "clamp(26px,4vw,36px)", fontWeight: 800, marginTop: 14 }}>Run your Google profile like a pro</h2>
          <p style={{ color: MUTED, marginTop: 8 }}>One consent-led operations engine for clinics &amp; hospitals.</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20 }}>
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-2xl" style={{ background: CARD_BG, borderRadius: CARD_RADIUS, boxShadow: nm.card, padding: 26 }}>
              <div className="rounded-xl" style={{ width: 48, height: 48, background: PRIMARY_LIGHT, color: PRIMARY_DARK, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: nm.xs, marginBottom: 14 }}>
                <f.icon size={22} />
              </div>
              <h3 style={{ fontSize: 17, fontWeight: 800, marginBottom: 6 }}>{f.title}</h3>
              <p style={{ color: MUTED, fontSize: 14, lineHeight: 1.6 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section style={{ maxWidth: 1000, margin: "80px auto 0", padding: "0 24px" }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <h2 style={{ fontSize: "clamp(26px,4vw,36px)", fontWeight: 800 }}>From invisible to unmissable in 3 steps</h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 20 }}>
          {STEPS.map((s) => (
            <div key={s.n} className="rounded-2xl" style={{ background: CARD_BG, borderRadius: CARD_RADIUS, boxShadow: nm.card, padding: 26 }}>
              <div className="rounded-full" style={{ width: 40, height: 40, background: PRIMARY, color: "#fff", fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: nm.primary, marginBottom: 14 }}>{s.n}</div>
              <h3 style={{ fontSize: 17, fontWeight: 800, marginBottom: 6 }}>{s.title}</h3>
              <p style={{ color: MUTED, fontSize: 14, lineHeight: 1.6 }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA, deep-green brand gradient (color blending) */}
      <section style={{ maxWidth: 960, margin: "80px auto", padding: "0 24px" }}>
        <div className="rounded-2xl" style={{ background: GRAD_DEEP, color: "#fff", padding: "52px 32px", textAlign: "center", boxShadow: "0 24px 60px rgba(10,59,47,0.35)" }}>
          <h2 style={{ fontSize: "clamp(26px,4vw,34px)", fontWeight: 900, marginBottom: 10 }}>Ready to win more patients from Google?</h2>
          <p style={{ opacity: 0.92, maxWidth: 540, margin: "0 auto 24px", fontSize: 16 }}>Run your free audit above, or sign in to start managing your profile in minutes.</p>
          <button onClick={onLogin} className="rounded-xl" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#fff", color: PRIMARY_DARK, fontWeight: 800, padding: "14px 30px", border: "none", cursor: "pointer" }}>
            Get started <ArrowRight size={16} />
          </button>
        </div>
      </section>

      {/* Footer, deep-green brand blend */}
      <footer style={{ background: GRAD_DEEP, color: "rgba(255,255,255,0.85)", padding: "40px 24px 28px", marginTop: 20 }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", flexWrap: "wrap", gap: 20, alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div className="rounded-xl" style={{ width: 34, height: 34, background: "rgba(255,255,255,0.14)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Stethoscope size={17} color="#fff" />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 15, color: "#fff" }}>GrowClinic GMB</div>
              <div style={{ fontSize: 12 }}>Bringing measurable growth to clinics, one profile at a time.</div>
            </div>
          </div>
          <div style={{ fontSize: 12.5, textAlign: "right" }}>
            © {new Date().getFullYear()} GrowClinic (Cloutrr Grow OPC Pvt Ltd)<br />gmb.growclinic.io
          </div>
        </div>
      </footer>
    </div>
  );
}
