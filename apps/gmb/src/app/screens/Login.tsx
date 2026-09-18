import { useState, useEffect, useRef } from "react";
import { ArrowRight, ArrowLeft, Loader2, BarChart2, Bot, TrendingUp, Users, Star, Stethoscope, ChevronDown, Search, MapPin } from "lucide-react";
import { api } from "../lib/api";
import { BG, PRIMARY, PRIMARY_DARK, PRIMARY_LIGHT, TEXT, MUTED, nm, CARD_BG, CARD_RADIUS, PAGE_BG } from "../theme";

const VALUE_PROPS = [
  { icon: BarChart2, title: "Smart insights", desc: "Track performance & ranking in real time." },
  { icon: Bot, title: "AI automation", desc: "Auto posts, review replies & optimizations." },
  { icon: TrendingUp, title: "More visibility", desc: "Rank higher and get discovered by more patients." },
  { icon: Users, title: "Easy management", desc: "Manage multiple clinics from one place." },
];

// Country dial codes. `min` = expected national-number length (for validation).
type Country = { iso: string; name: string; dial: string; flag: string; min: number };
const TOP_COUNTRIES: Country[] = [
  { iso: "IN", name: "India", dial: "+91", flag: "🇮🇳", min: 10 },
  { iso: "UK", name: "United Kingdom", dial: "+44", flag: "🇬🇧", min: 10 },
  { iso: "AE", name: "United Arab Emirates", dial: "+971", flag: "🇦🇪", min: 8 },
  { iso: "US", name: "United States", dial: "+1", flag: "🇺🇸", min: 10 },
  { iso: "CA", name: "Canada", dial: "+1", flag: "🇨🇦", min: 10 },
  { iso: "AU", name: "Australia", dial: "+61", flag: "🇦🇺", min: 9 },
];
const MORE_COUNTRIES: Country[] = [
  { iso: "SG", name: "Singapore", dial: "+65", flag: "🇸🇬", min: 8 },
  { iso: "SA", name: "Saudi Arabia", dial: "+966", flag: "🇸🇦", min: 9 },
  { iso: "QA", name: "Qatar", dial: "+974", flag: "🇶🇦", min: 8 },
  { iso: "KW", name: "Kuwait", dial: "+965", flag: "🇰🇼", min: 8 },
  { iso: "OM", name: "Oman", dial: "+968", flag: "🇴🇲", min: 8 },
  { iso: "BH", name: "Bahrain", dial: "+973", flag: "🇧🇭", min: 8 },
  { iso: "NZ", name: "New Zealand", dial: "+64", flag: "🇳🇿", min: 8 },
  { iso: "BD", name: "Bangladesh", dial: "+880", flag: "🇧🇩", min: 10 },
  { iso: "LK", name: "Sri Lanka", dial: "+94", flag: "🇱🇰", min: 9 },
  { iso: "NP", name: "Nepal", dial: "+977", flag: "🇳🇵", min: 10 },
  { iso: "MY", name: "Malaysia", dial: "+60", flag: "🇲🇾", min: 9 },
  { iso: "DE", name: "Germany", dial: "+49", flag: "🇩🇪", min: 10 },
  { iso: "FR", name: "France", dial: "+33", flag: "🇫🇷", min: 9 },
  { iso: "ZA", name: "South Africa", dial: "+27", flag: "🇿🇦", min: 9 },
];
const ALL_COUNTRIES = [...TOP_COUNTRIES, ...MORE_COUNTRIES];

const PREFIXES = ["Dr.", "Mr", "Mrs", "Ms", "Prof."]; // Dr. first (most clinic owners)

export default function Login({ onAuthed, onBack, prefill }: { onAuthed: () => void; onBack: () => void; prefill?: any }) {
  const [step, setStep] = useState<"phone" | "code" | "profile">("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [testCode, setTestCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [country, setCountry] = useState<Country>(TOP_COUNTRIES[0]);
  const [countryOpen, setCountryOpen] = useState(false);

  // Onboarding (profile step): person + clinic.
  const [prefix, setPrefix] = useState("Dr.");
  const [prefixOpen, setPrefixOpen] = useState(false);
  const [personName, setPersonName] = useState("");
  const [clinicMode, setClinicMode] = useState<"gmb" | "manual">("gmb");
  const [selectedClinic, setSelectedClinic] = useState<any>(null); // full place from GMB
  const [manualClinic, setManualClinic] = useState("");
  const [clinicQuery, setClinicQuery] = useState("");
  const [clinicResults, setClinicResults] = useState<any[]>([]);
  const [clinicSearching, setClinicSearching] = useState(false);
  const clinicDebounce = useRef<any>(null);

  // If the user arrived via "Claim" from the audit, pre-select that GMB clinic.
  useEffect(() => { if (prefill?.name) { setSelectedClinic(prefill); setClinicMode("gmb"); } }, [prefill]);

  const nationalDigits = () => phone.replace(/\D/g, "");
  const e164 = () => country.dial + nationalDigits();

  const send = async () => {
    setError("");
    if (nationalDigits().length < country.min) { setError(`Enter a valid ${country.name} mobile number`); return; }
    setLoading(true);
    try { const r = await api.otpRequest(e164()); setStep("code"); if (r?.testCode) { setTestCode(r.testCode); setOtp(r.testCode); } }
    catch (err: any) { setError(err.message || "Could not send code"); }
    finally { setLoading(false); }
  };

  const verify = async () => {
    setError(""); if (otp.length !== 6) { setError("Enter the 6-digit code"); return; }
    setLoading(true);
    try {
      const r = await api.otpVerify(e164(), otp);
      // Always collect the person's name + confirm the clinic before entering.
      if (r?.needsOrg) { setStep("profile"); setLoading(false); return; }
      onAuthed();
    } catch (err: any) { setError(err.message || "Incorrect code"); setLoading(false); }
  };

  // GMB clinic search (reuses the public Places-backed audit endpoints).
  const onClinicType = (v: string) => {
    setClinicQuery(v); setError("");
    clearTimeout(clinicDebounce.current);
    if (v.trim().length < 3) { setClinicResults([]); return; }
    setClinicSearching(true);
    clinicDebounce.current = setTimeout(async () => {
      try { const r = await api.auditSearch(v.trim()); setClinicResults(r.results || []); }
      catch { setClinicResults([]); }
      finally { setClinicSearching(false); }
    }, 350);
  };
  const pickClinic = async (placeId: string) => {
    setClinicResults([]); setClinicSearching(true); setError("");
    try { const r = await api.auditPlace(placeId); setSelectedClinic(r.place); setClinicQuery(""); }
    catch { setError("Could not load that clinic. Try again or enter details manually."); }
    finally { setClinicSearching(false); }
  };

  const clinicName = () => (clinicMode === "gmb" ? selectedClinic?.name : manualClinic).trim?.() || "";

  const finishProfile = async () => {
    const fullName = `${prefix} ${personName.trim()}`.trim();
    if (!personName.trim()) { setError("Please enter your name"); return; }
    if (!clinicName()) { setError(clinicMode === "gmb" ? "Select your clinic from Google, or add it manually" : "Enter your clinic name"); return; }
    setLoading(true); setError("");
    try {
      await api.setProfile(fullName);
      await api.createOrg(clinicName());
      const c = clinicMode === "gmb" ? (selectedClinic || {}) : { name: manualClinic };
      await api.createLocation({ name: clinicName(), city: c.city, primaryCategory: c.primaryCategory, placeId: c.placeId, address: c.address, phone: c.phone, website: c.website });
      onAuthed();
    } catch (err: any) { setError(err.message || "Could not create workspace"); setLoading(false); }
  };

  const primaryBtn: React.CSSProperties = { width: "100%", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, background: PRIMARY, color: "#fff", fontWeight: 700, padding: "15px", border: "none", borderRadius: 14, cursor: "pointer", boxShadow: nm.primary, marginTop: 18, fontSize: 15 };
  const field: React.CSSProperties = { width: "100%", padding: "15px 16px", background: BG, border: "none", borderRadius: 14, color: TEXT, fontSize: 16, outline: "none", boxShadow: nm.inset };

  return (
    <div className="flex min-h-screen w-full" style={{ background: PAGE_BG, fontFamily: "'Satoshi', sans-serif" }}>
      {/* Left panel, brand + value props + preview (desktop only) */}
      <div className="hidden lg:flex flex-col justify-center flex-1 p-14" style={{ background: `linear-gradient(160deg, ${PRIMARY_LIGHT} 0%, ${BG} 60%)` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28 }}>
          <div className="rounded-2xl" style={{ width: 46, height: 46, background: PRIMARY, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: nm.primary }}>
            <Stethoscope size={22} color="#fff" />
          </div>
          <span style={{ fontSize: 22, fontWeight: 800, color: TEXT }}>GrowClinic <span style={{ color: PRIMARY }}>GMB</span></span>
        </div>
        <h2 style={{ fontSize: 40, fontWeight: 800, lineHeight: 1.12, color: TEXT, marginBottom: 12 }}>
          Manage. Optimize.<br /><span style={{ color: PRIMARY }}>Grow your clinic.</span>
        </h2>
        <p style={{ color: MUTED, fontSize: 16, maxWidth: 440, marginBottom: 30 }}>
          The consent-led platform to run your Google Business Profile, boost visibility, and get more patients.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, maxWidth: 480 }}>
          {VALUE_PROPS.map((v) => (
            <div key={v.title} className="rounded-2xl" style={{ background: CARD_BG, borderRadius: CARD_RADIUS, boxShadow: nm.card, padding: 16 }}>
              <div className="rounded-xl" style={{ width: 38, height: 38, background: PRIMARY_LIGHT, color: PRIMARY_DARK, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: nm.xs, marginBottom: 10 }}>
                <v.icon size={18} />
              </div>
              <div style={{ fontWeight: 700, color: TEXT, fontSize: 14 }}>{v.title}</div>
              <div style={{ color: MUTED, fontSize: 12, marginTop: 2 }}>{v.desc}</div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 26, color: MUTED, fontSize: 13 }}>
          <Star size={15} color="#F59E0B" /> Trusted by ambitious clinics &amp; hospitals across India
        </div>
      </div>

      {/* Right panel, form */}
      <div className="flex flex-col justify-center items-center flex-1 p-6 md:p-14">
        <div className="rounded-2xl" style={{ width: "100%", maxWidth: 420, background: CARD_BG, borderRadius: CARD_RADIUS, boxShadow: nm.card, padding: 34 }}>
          <button onClick={step === "phone" ? onBack : () => setStep("phone")} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "none", border: "none", color: MUTED, cursor: "pointer", fontSize: 13, marginBottom: 20 }}>
            <ArrowLeft size={15} /> Back
          </button>

          <div className="lg:hidden" style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
            <div className="rounded-xl" style={{ width: 40, height: 40, background: PRIMARY, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: nm.primary }}>
              <Stethoscope size={20} color="#fff" />
            </div>
            <span style={{ fontSize: 18, fontWeight: 800, color: TEXT }}>GrowClinic GMB</span>
          </div>

          <h1 style={{ fontSize: 24, fontWeight: 800, color: TEXT }}>
            {step === "profile" ? "Set up your clinic" : "Welcome 👋"}
          </h1>
          <p style={{ color: MUTED, fontSize: 14, marginTop: 4 }}>
            {step === "phone" ? "Sign in to manage your Google Business Profile." : step === "code" ? "Enter the code we sent you." : "Tell us who you are and pick your clinic."}
          </p>

          {error && <div className="rounded-xl" style={{ margin: "16px 0 0", background: "#FEF2F2", color: "#B91C1C", padding: "10px 14px", fontSize: 14 }}>{error}</div>}

          {step === "phone" && (
            <div style={{ marginTop: 20 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: MUTED }}>WhatsApp mobile number</label>
              <div style={{ display: "flex", gap: 10, marginTop: 8, position: "relative" }}>
                {/* Country selector, flag + dial code + dropdown */}
                <button
                  type="button"
                  onClick={() => setCountryOpen((o) => !o)}
                  style={{ display: "flex", alignItems: "center", gap: 7, padding: "0 12px", background: BG, borderRadius: 14, boxShadow: nm.inset, fontWeight: 700, color: TEXT, border: "none", cursor: "pointer", whiteSpace: "nowrap" }}
                >
                  <span style={{ fontSize: 18, lineHeight: 1 }}>{country.flag}</span>
                  <span>{country.dial}</span>
                  <ChevronDown size={14} style={{ color: MUTED, transform: countryOpen ? "rotate(180deg)" : "none", transition: "transform .15s" }} />
                </button>
                <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Enter mobile number" inputMode="numeric" style={{ ...field, flex: 1 }} />

                {countryOpen && (
                  <>
                    {/* click-away layer */}
                    <div onClick={() => setCountryOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 40 }} />
                    <div className="rounded-2xl" style={{ position: "absolute", top: "calc(100% + 8px)", left: 0, zIndex: 50, width: 300, maxHeight: 320, overflowY: "auto", background: "#fff", borderRadius: CARD_RADIUS, boxShadow: nm.card, padding: 6 }}>
                      {ALL_COUNTRIES.map((c, i) => {
                        const isTopEnd = i === TOP_COUNTRIES.length - 1;
                        const selected = c.iso === country.iso;
                        return (
                          <div key={c.iso}>
                            <button
                              type="button"
                              onClick={() => { setCountry(c); setCountryOpen(false); }}
                              style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "10px 12px", background: selected ? PRIMARY_LIGHT : "transparent", border: "none", borderRadius: 10, cursor: "pointer", textAlign: "left" }}
                            >
                              <span style={{ fontSize: 18, lineHeight: 1 }}>{c.flag}</span>
                              <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: TEXT }}>{c.name}</span>
                              <span style={{ fontSize: 13, fontWeight: 700, color: selected ? PRIMARY_DARK : MUTED }}>{c.dial}</span>
                            </button>
                            {isTopEnd && <div style={{ height: 1, background: "rgba(0,0,0,0.06)", margin: "6px 8px" }} />}
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
              <p style={{ color: MUTED, fontSize: 12, marginTop: 8 }}>We&apos;ll send a one-time code to your WhatsApp.</p>
              <button onClick={send} disabled={loading} style={primaryBtn}>
                {loading ? <Loader2 size={16} className="spin" /> : null} {loading ? "Sending…" : "Continue"} {!loading && <ArrowRight size={16} />}
              </button>
            </div>
          )}

          {step === "code" && (
            <div style={{ marginTop: 20 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: MUTED }}>Enter 6-digit code</label>
              <input value={otp} onChange={(e) => setOtp(e.target.value)} maxLength={6} placeholder="123456" style={{ ...field, marginTop: 8, textAlign: "center", letterSpacing: "0.4em", fontWeight: 800, fontSize: 22 }} />
              {testCode && <div className="rounded-xl" style={{ marginTop: 12, background: "rgba(23,165,126,0.08)", color: PRIMARY_DARK, padding: "10px 14px", fontSize: 13 }}>🧪 Test mode, code auto-filled.</div>}
              <button onClick={verify} disabled={loading} style={primaryBtn}>
                {loading ? <Loader2 size={16} className="spin" /> : null} {loading ? "Verifying…" : "Verify & continue"} {!loading && <ArrowRight size={16} />}
              </button>
            </div>
          )}

          {step === "profile" && (
            <div style={{ marginTop: 20 }}>
              {/* Your name — honorific prefix + full name */}
              <label style={{ fontSize: 13, fontWeight: 600, color: MUTED }}>Your name</label>
              <div style={{ display: "flex", gap: 10, marginTop: 8, position: "relative" }}>
                <button type="button" onClick={() => setPrefixOpen((o) => !o)}
                  style={{ display: "flex", alignItems: "center", gap: 7, padding: "0 14px", background: BG, borderRadius: 14, boxShadow: nm.inset, fontWeight: 700, color: TEXT, border: "none", cursor: "pointer", whiteSpace: "nowrap" }}>
                  <span>{prefix}</span>
                  <ChevronDown size={14} style={{ color: MUTED, transform: prefixOpen ? "rotate(180deg)" : "none", transition: "transform .15s" }} />
                </button>
                <input value={personName} onChange={(e) => setPersonName(e.target.value)} placeholder="Full name" style={{ ...field, flex: 1 }} />
                {prefixOpen && (
                  <>
                    <div onClick={() => setPrefixOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 40 }} />
                    <div className="rounded-xl" style={{ position: "absolute", top: "calc(100% + 8px)", left: 0, zIndex: 50, width: 130, background: "#fff", borderRadius: CARD_RADIUS, boxShadow: nm.card, padding: 6 }}>
                      {PREFIXES.map((p) => (
                        <button key={p} type="button" onClick={() => { setPrefix(p); setPrefixOpen(false); }}
                          style={{ display: "block", width: "100%", padding: "9px 12px", background: p === prefix ? PRIMARY_LIGHT : "transparent", color: p === prefix ? PRIMARY_DARK : TEXT, fontWeight: 700, border: "none", borderRadius: 9, cursor: "pointer", textAlign: "left", fontSize: 14 }}>
                          {p}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Your clinic — prefer picking the real Google Business Profile */}
              <label style={{ fontSize: 13, fontWeight: 600, color: MUTED, display: "block", marginTop: 16 }}>Your clinic</label>
              {clinicMode === "gmb" ? (
                selectedClinic ? (
                  <div className="rounded-xl" style={{ marginTop: 8, background: BG, boxShadow: nm.inset, padding: "12px 14px", display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <MapPin size={16} color={PRIMARY} style={{ marginTop: 3, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, color: TEXT, fontSize: 14 }}>{selectedClinic.name}</div>
                      {selectedClinic.address && <div style={{ color: MUTED, fontSize: 12, marginTop: 2 }}>{selectedClinic.address}</div>}
                    </div>
                    <button type="button" onClick={() => { setSelectedClinic(null); setClinicQuery(""); }}
                      style={{ background: "none", border: "none", color: PRIMARY_DARK, fontWeight: 700, fontSize: 12, cursor: "pointer", flexShrink: 0 }}>Change</button>
                  </div>
                ) : (
                  <div style={{ position: "relative", marginTop: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, ...field }}>
                      <Search size={16} color={PRIMARY} />
                      <input value={clinicQuery} onChange={(e) => onClinicType(e.target.value)} placeholder="Search your clinic on Google…"
                        style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontSize: 15, color: TEXT }} />
                      {clinicSearching && <Loader2 size={16} color={PRIMARY} className="spin" />}
                    </div>
                    {clinicResults.length > 0 && (
                      <div className="rounded-xl" style={{ position: "absolute", top: "calc(100% + 8px)", left: 0, right: 0, zIndex: 50, background: "#fff", borderRadius: CARD_RADIUS, boxShadow: nm.card, padding: 6, maxHeight: 240, overflowY: "auto" }}>
                        {clinicResults.map((r) => (
                          <button key={r.placeId} type="button" onClick={() => pickClinic(r.placeId)}
                            style={{ display: "flex", gap: 10, alignItems: "flex-start", width: "100%", textAlign: "left", padding: "10px 12px", background: "transparent", border: "none", borderRadius: 9, cursor: "pointer" }}>
                            <MapPin size={15} color={PRIMARY} style={{ marginTop: 3, flexShrink: 0 }} />
                            <span style={{ minWidth: 0 }}>
                              <span style={{ display: "block", fontWeight: 700, color: TEXT, fontSize: 14 }}>{r.primaryText}</span>
                              <span style={{ display: "block", color: MUTED, fontSize: 12 }}>{r.secondaryText}</span>
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )
              ) : (
                <input value={manualClinic} onChange={(e) => setManualClinic(e.target.value)} placeholder="e.g. Apex Care Clinic" style={{ ...field, marginTop: 8 }} />
              )}
              <button type="button"
                onClick={() => { setClinicMode((m) => (m === "gmb" ? "manual" : "gmb")); setSelectedClinic(null); setClinicResults([]); setError(""); }}
                style={{ background: "none", border: "none", color: PRIMARY_DARK, fontWeight: 600, fontSize: 12.5, cursor: "pointer", marginTop: 10, padding: 0 }}>
                {clinicMode === "gmb" ? "We don't have a Google Business Profile" : "Search on Google instead"}
              </button>

              <button onClick={finishProfile} disabled={loading} style={primaryBtn}>
                {loading ? <Loader2 size={16} className="spin" /> : null} {loading ? "Setting up…" : "Create workspace"} {!loading && <ArrowRight size={16} />}
              </button>
            </div>
          )}

          <p style={{ color: MUTED, fontSize: 11, marginTop: 18, textAlign: "center" }}>
            By continuing you agree to our Terms &amp; Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  );
}
