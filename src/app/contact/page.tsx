"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Mail, Phone, MapPin, Instagram, Linkedin, Send, CheckCircle2, AlertCircle, ChevronDown } from "lucide-react";
import Link from "next/link";

const COUNTRY_CODES = [
    { code: "+91", country: "India", flag: "🇮🇳" },
    { code: "+1", country: "USA", flag: "🇺🇸" },
    { code: "+44", country: "UK", flag: "🇬🇧" },
    { code: "+971", country: "UAE", flag: "🇦🇪" },
    { code: "+65", country: "Singapore", flag: "🇸🇬" },
    { code: "+61", country: "Australia", flag: "🇦🇺" },
    { code: "+966", country: "Saudi Arabia", flag: "🇸🇦" },
    { code: "+974", country: "Qatar", flag: "🇶🇦" },
    { code: "+968", country: "Oman", flag: "🇴🇲" },
    { code: "+977", country: "Nepal", flag: "🇳🇵" },
    { code: "+880", country: "Bangladesh", flag: "🇧🇩" },
    { code: "+94", country: "Sri Lanka", flag: "🇱🇰" },
    { code: "+60", country: "Malaysia", flag: "🇲🇾" },
    { code: "+49", country: "Germany", flag: "🇩🇪" },
    { code: "+33", country: "France", flag: "🇫🇷" },
];

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    countryCode: "+91",
    phone: "",
    source: "",
    message: "",
  });

  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setErrorMessage("");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          phone: formData.phone ? formData.countryCode + formData.phone : "",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to submit form");
      }

      setStatus("success");
      setFormData({ name: "", email: "", countryCode: "+91", phone: "", source: "", message: "" });
    } catch (error: any) {
      setStatus("error");
      setErrorMessage(error.message);
    }
  };

  return (
    <div className="min-h-screen bg-mesh-gradient flex flex-col pt-32 pb-24 relative overflow-hidden">
      {/* Background flair */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[120px] pointer-events-none -mr-64 -mt-32 opacity-60"></div>
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-accent/5 rounded-full blur-[100px] pointer-events-none -ml-48 -mb-32 opacity-40"></div>

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        <div className="text-center mb-16 max-w-3xl mx-auto">
          <h1 className="text-5xl md:text-6xl font-black text-slate-900 tracking-tight mb-6">
            Let's Engineer Your <span className="text-gradient-primary">Growth</span>
          </h1>
          <p className="text-xl text-slate-600 font-medium leading-relaxed">
            Ready to scale your medical practice? Fill out the form below or reach out directly to our headquarters.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Contact Info Sidebar */}
          <div className="lg:col-span-4 space-y-6">
            <div className="glass-morphism p-8 rounded-[2.5rem] border border-white/40 shadow-xl">
              <h3 className="text-2xl font-black text-slate-900 mb-8 flex items-center gap-3">
                Mission Control
                <span className="w-8 h-1 bg-primary rounded-full"></span>
              </h3>
              
              <div className="space-y-8">
                <a href="mailto:hi@growclinic.io" className="flex items-center gap-5 group">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all duration-300">
                    <Mail className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-1">Email Us</p>
                    <p className="text-slate-900 font-black text-lg">hi@growclinic.io</p>
                  </div>
                </a>

                <a href="tel:+919718304212" className="flex items-center gap-5 group">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all duration-300">
                    <Phone className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-1">Call Us</p>
                    <p className="text-slate-900 font-black text-lg">+91 97183 04212</p>
                  </div>
                </a>

                <a 
                  href="https://maps.google.com/?q=GrowClinic+Noida" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="flex items-center gap-5 group"
                >
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all duration-300">
                    <MapPin className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-1">Visit Us</p>
                    <p className="text-slate-900 font-black text-lg leading-tight">Noida, Uttar Pradesh, India</p>
                  </div>
                </a>
              </div>

              <div className="mt-12 pt-10 border-t border-slate-100/50">
                <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-6">Social Systems</p>
                <div className="flex gap-4">
                  <a 
                    href="https://www.linkedin.com/showcase/growclinic-io" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="w-12 h-12 rounded-2xl bg-white/50 flex items-center justify-center text-slate-500 hover:bg-primary hover:text-white transition-all duration-300 shadow-sm border border-white/20"
                  >
                    <Linkedin className="w-5 h-5" />
                  </a>
                  <a 
                    href="https://www.instagram.com/growclinic.io" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="w-12 h-12 rounded-2xl bg-white/50 flex items-center justify-center text-slate-500 hover:bg-primary hover:text-white transition-all duration-300 shadow-sm border border-white/20"
                  >
                    <Instagram className="w-5 h-5" />
                  </a>
                </div>
              </div>
            </div>

            <div className="bg-primary-gradient p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden group">
              <div className="relative z-10">
                <p className="text-primary-light font-black uppercase tracking-widest text-[10px] mb-4">Availability</p>
                <h4 className="text-xl font-bold mb-2">24/7 Priority Support</h4>
                <p className="text-white/80 text-sm leading-relaxed">
                  Our team typically responds within 2 hours for urgent medical practice audits.
                </p>
              </div>
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-white/20 transition-all"></div>
            </div>
          </div>

          {/* Form Section */}
          <div className="lg:col-span-8 relative">
            <div className="glass-morphism p-8 md:p-12 rounded-[2.5rem] border border-white/40 shadow-2xl relative overflow-hidden">
              {status === "success" ? (
                <div className="absolute inset-0 bg-white/95 backdrop-blur-md z-20 flex flex-col items-center justify-center p-12 text-center animate-in fade-in duration-500">
                  <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-8 animate-bounce">
                    <CheckCircle2 className="w-12 h-12 text-green-600" />
                  </div>
                  <h3 className="text-4xl font-black text-slate-900 mb-4 tracking-tight">Transmission Received!</h3>
                  <p className="text-xl text-slate-600 mb-10 max-w-md font-medium">
                    Thank you for reaching out. Our engineering team has received your lead and will contact you shortly to schedule your growth audit.
                  </p>
                  <Button variant="outline" size="lg" onClick={() => setStatus("idle")} className="rounded-2xl border-slate-200">
                    Send Another Message
                  </Button>
                </div>
              ) : null}

              <form onSubmit={handleSubmit} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label htmlFor="name" className="text-sm font-black uppercase tracking-widest text-slate-500">Full Name</label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      required
                      value={formData.name}
                      onChange={handleChange}
                      className="w-full px-6 py-4 bg-white/50 border border-slate-200 text-slate-900 rounded-2xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none font-bold"
                      placeholder="Dr. John Smith"
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="email" className="text-sm font-black uppercase tracking-widest text-slate-500">Email Address</label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      required
                      value={formData.email}
                      onChange={handleChange}
                      className="w-full px-6 py-4 bg-white/50 border border-slate-200 text-slate-900 rounded-2xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none font-bold"
                      placeholder="hi@example.com"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label htmlFor="phone" className="text-sm font-black uppercase tracking-widest text-slate-500">Phone (Optional)</label>
                    <div className="flex gap-2">
                      <div className="relative w-[130px] flex-shrink-0">
                        <select
                          name="countryCode"
                          value={formData.countryCode}
                          onChange={handleChange}
                          className="w-full px-3 py-4 bg-white/50 border border-slate-200 text-slate-900 rounded-2xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none font-bold text-sm appearance-none cursor-pointer"
                        >
                          {COUNTRY_CODES.map((cc) => (
                            <option key={cc.code + cc.country} value={cc.code}>
                              {cc.flag} {cc.code}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                      </div>
                      <input
                        type="tel"
                        id="phone"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        className="flex-1 px-6 py-4 bg-white/50 border border-slate-200 text-slate-900 rounded-2xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none font-bold"
                        placeholder="00000 00000"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="source" className="text-sm font-black uppercase tracking-widest text-slate-500">Discovery Channel</label>
                    <select
                      id="source"
                      name="source"
                      required
                      value={formData.source}
                      onChange={handleChange}
                      className="w-full px-6 py-4 bg-white/50 border border-slate-200 text-slate-900 rounded-2xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none font-bold appearance-none cursor-pointer"
                    >
                      <option value="" disabled>Select discovery source</option>
                      <option value="Google">Google Search</option>
                      <option value="Social Media">Social Media</option>
                      <option value="Referral">Referral / Colleague</option>
                      <option value="Advertisement">Advertisement</option>
                      <option value="Other">Other Channel</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="message" className="text-sm font-black uppercase tracking-widest text-slate-500">Your Objectives</label>
                  <textarea
                    id="message"
                    name="message"
                    required
                    rows={5}
                    value={formData.message}
                    onChange={handleChange}
                    className="w-full px-6 py-4 bg-white/50 border border-slate-200 text-slate-900 rounded-2xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none font-bold resize-none"
                    placeholder="Tell us about your practice goals..."
                  ></textarea>
                </div>

                {status === "error" && (
                  <div className="p-5 bg-red-50 text-red-600 rounded-2xl border border-red-100 flex items-center gap-4 animate-in slide-in-from-top-4 duration-300">
                    <AlertCircle className="w-6 h-6 shrink-0" />
                    <span className="font-bold">{errorMessage}</span>
                  </div>
                )}

                <div className="pt-4">
                  <Button 
                    type="submit" 
                    variant="primary" 
                    size="lg" 
                    className="w-full md:w-auto min-w-[240px] rounded-2xl flex gap-2 group shadow-glow hover:shadow-glow-accent transition-all duration-500"
                    disabled={status === "loading"}
                  >
                    {status === "loading" ? (
                      <span className="flex items-center gap-2">
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        Processing...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        Initiate Contact
                        <Send className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                      </span>
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

