import React, { useState } from 'react';
import { PRICING_PLANS, TESTIMONIALS, FAQS } from '../data/marketingData';
import { 
  Sparkles, CheckCircle2, Search, ArrowRight, ShieldCheck, 
  BarChart3, FileText, MessageSquare, Key, Image as ImageIcon, QrCode, 
  ChevronDown, ChevronUp, Star, Phone, Check, Zap, Eye, MapPin, Stethoscope,
  Smile, Scissors, Gem, Building2, Calendar, Award, Smartphone, FileText as FileIcon
} from 'lucide-react';

export default function LandingPage({ onOpenAuditModal, onOpenCheckout, onLaunchApp, onOpenOtpModal, onOpenLegalModal }) {
  const [currency, setCurrency] = useState('INR');
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [openFaq, setOpenFaq] = useState(null);
  const [activeSpecialty, setActiveSpecialty] = useState('Dental');

  const specialties = [
    { id: 'Dental', name: 'Dental Clinic', icon: Smile, desc: 'Root canal, clear aligners & dental implants acquisition' },
    { id: 'Dermatology', name: 'Dermatology & Skin', icon: Sparkles, desc: 'Acne, hydrafacial & anti-aging laser patient systems' },
    { id: 'IVF', name: 'IVF & Fertility', icon: Stethoscope, desc: 'High-intent fertility patient consultation systems' },
    { id: 'Trichology', name: 'Trichology & Hair', icon: Scissors, desc: 'PRP & hair transplant patient search engineering' },
    { id: 'Cosmetology', name: 'Cosmetology & Aesthetics', icon: Gem, desc: 'Cosmetic surgery & aesthetic clinic patient bookings' },
    { id: 'Hospital', name: 'Multispecialty Hospital', icon: Building2, desc: '24/7 ER, cardiology & orthopedic department growth' }
  ];

  const toggleFaq = (idx) => {
    setOpenFaq(openFaq === idx ? null : idx);
  };

  return (
    <div>
      {/* Hero Section */}
      <section id="hero" className="hero-section">
        <div className="container hero-grid">
          
          {/* Left Hero Content */}
          <div className="hero-content">
            <div className="badge badge-emerald" style={{ marginBottom: '16px' }}>
              <Stethoscope size={14} /> Consent-Led GMB Operations Engine for Clinics
            </div>

            <h1>
              Accurate, Compliant Google Profiles for Your <span className="text-gradient">Medical Practice</span>
            </h1>

            <p>
              Gmb helps clinic owners and doctors discover profile gaps, handle patient review replies safely, and publish consent-authorized edits to Google Business Profile.
            </p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', marginBottom: '24px' }}>
              <button className="btn-green btn-lg" onClick={onOpenOtpModal}>
                <Smartphone size={18} />
                <span>WhatsApp Login & Connect</span>
                <ArrowRight size={18} />
              </button>
              <button className="btn btn-outline btn-lg" onClick={onOpenAuditModal}>
                <span>Free Clinic Profile Audit</span>
              </button>
            </div>

            <div className="hero-checklist">
              <div className="hero-check-item"><CheckCircle2 size={16} /> Explainable Health Score</div>
              <div className="hero-check-item"><CheckCircle2 size={16} /> Protected Field Consent Modal</div>
              <div className="hero-check-item"><CheckCircle2 size={16} /> Sensitive Review Escalation</div>
              <div className="hero-check-item"><CheckCircle2 size={16} /> Reception Review QR Standee</div>
              <div className="hero-check-item"><CheckCircle2 size={16} /> Medical SEO Keyword Finder</div>
              <div className="hero-check-item"><CheckCircle2 size={16} /> Immutable Audit Records</div>
            </div>
          </div>

          {/* Right Hero Dashboard Preview */}
          <div className="dashboard-preview">
            <div className="preview-header">
              <div className="window-dots">
                <span className="dot red"></span>
                <span className="dot yellow"></span>
                <span className="dot green"></span>
              </div>
              <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)' }}>gmb.growclinic.io Dashboard</span>
              <span className="badge badge-amber" style={{ fontSize: '10px' }}>VISUAL PROTOTYPE</span>
            </div>

            <div className="preview-body">
              <div className="score-circle-box">
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '700' }}>Health Score</div>
                  <div style={{ fontSize: '13px', color: 'var(--gc-emerald)', fontWeight: '800' }}>Apex Dental Care Delhi</div>
                </div>
                <div className="score-big">92%</div>
              </div>

              <div className="progress-list">
                <div>
                  <div className="progress-item-label">
                    <span>Clinic Profile Completeness</span>
                    <span>94%</span>
                  </div>
                  <div className="progress-bar-bg">
                    <div className="progress-bar-fill" style={{ width: '94%' }}></div>
                  </div>
                </div>

                <div>
                  <div className="progress-item-label">
                    <span>Medical Keyword Coverage</span>
                    <span>90%</span>
                  </div>
                  <div className="progress-bar-bg">
                    <div className="progress-bar-fill" style={{ width: '90%' }}></div>
                  </div>
                </div>

                <div>
                  <div className="progress-item-label">
                    <span>Doctor Review Response Rate</span>
                    <span>98%</span>
                  </div>
                  <div className="progress-bar-bg">
                    <div className="progress-bar-fill" style={{ width: '98%' }}></div>
                  </div>
                </div>
              </div>

              <div className="preview-stats-grid">
                <div className="mini-stat-card">
                  <div className="val">+35%</div>
                  <div className="lbl">Map Views</div>
                </div>
                <div className="mini-stat-card">
                  <div className="val">680</div>
                  <div className="lbl">Calls</div>
                </div>
                <div className="mini-stat-card">
                  <div className="val">512</div>
                  <div className="lbl">Reviews</div>
                </div>
                <div className="mini-stat-card">
                  <div className="val">950</div>
                  <div className="lbl">Directions</div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* Specialty Selector Section */}
      <section id="specialties" style={{ padding: '60px 0', background: 'var(--bg-secondary)', borderTop: '1px solid var(--border-color)' }}>
        <div className="container">
          <div className="section-title">
            <h2>Built For Your <span className="text-gradient">Clinical Specialty</span></h2>
            <p>Every medical specialty has unique services and keywords. Configured via service templates, not separate codebases.</p>
          </div>

          <div className="specialty-grid">
            {specialties.map(spec => {
              const IconComp = spec.icon;
              const isActive = activeSpecialty === spec.id;
              return (
                <div 
                  key={spec.id}
                  className={`specialty-card ${isActive ? 'active' : ''}`}
                  onClick={() => setActiveSpecialty(spec.id)}
                >
                  <div className="specialty-icon">
                    <IconComp size={22} />
                  </div>
                  <h4 style={{ fontSize: '15px', fontWeight: '800', marginBottom: '6px' }}>{spec.name}</h4>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: '1.4' }}>{spec.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Quick Answer GEO Box */}
      <section style={{ padding: '20px 0' }}>
        <div className="container">
          <div className="ai-quick-answer">
            <div className="tag">⚡ GrowClinic Product Guardrails</div>
            <p style={{ fontSize: '15px', color: 'var(--text-main)', lineHeight: '1.7' }}>
              <strong>GrowClinic GMB (gmb.growclinic.io)</strong> is an operations platform for doctors, clinics, and hospitals in India. Starting at <strong>₹1999/month</strong>, it provides clinic health audits, daily posts, doctor review replies, and review QR standees under strict consent, privacy, and 90-day data retention guardrails.
            </p>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" style={{ padding: '80px 0' }}>
        <div className="container">
          <div className="section-title">
            <h2>How <span className="text-gradient">GrowClinic GMB</span> Works</h2>
            <p>From authentication to consent-approved profile updates in 4 simple steps.</p>
          </div>

          <div className="steps-grid">
            <div className="step-card">
              <div className="step-num">1</div>
              <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '8px' }}>WhatsApp OTP Login</h3>
              <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Authenticate your clinic practice securely with single-use WhatsApp OTP code.</p>
            </div>

            <div className="step-card">
              <div className="step-num">2</div>
              <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '8px' }}>Connect Google OAuth</h3>
              <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Authorize read-first Google Business Profile access to fetch verified listing facts.</p>
            </div>

            <div className="step-card">
              <div className="step-num">3</div>
              <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '8px' }}>Review Audit Evidence</h3>
              <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Inspect transparent score deductions, evidence, and prioritized action recommendations.</p>
            </div>

            <div className="step-card">
              <div className="step-num">4</div>
              <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '8px' }}>Approve Protected Edits</h3>
              <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Inspect before/after values and consent before any change is published to Google.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" style={{ padding: '80px 0', background: 'var(--bg-secondary)' }}>
        <div className="container">
          <div className="section-title">
            <h2>GrowClinic Solutions For <span className="text-gradient">Medical Practices</span></h2>
            <p>Our healthcare management stack is designed exclusively for dentists, doctors & hospitals.</p>
          </div>

          <div className="features-grid">
            <div className="card-glass feature-card">
              <div className="feature-icon"><BarChart3 /></div>
              <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '8px' }}>Clinic Profile Health Audit</h3>
              <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Diagnostic score with deduction evidence pinpointing missing categories & patient access details.</p>
            </div>

            <div className="card-glass feature-card">
              <div className="feature-icon" style={{ background: 'rgba(16,185,129,0.12)', color: 'var(--gc-emerald)' }}><FileText /></div>
              <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '8px' }}>Daily Doctor Post Generator</h3>
              <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>AI generated health tips, treatment showcases, and patient updates with owner approval.</p>
            </div>

            <div className="card-glass feature-card">
              <div className="feature-icon" style={{ background: 'rgba(59,130,246,0.12)', color: 'var(--gc-blue)' }}><MessageSquare /></div>
              <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '8px' }}>AI Patient Review Replies</h3>
              <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Generate professional, privacy-safe responses to patient reviews with sensitive escalation alerts.</p>
            </div>

            <div className="card-glass feature-card">
              <div className="feature-icon" style={{ background: 'rgba(251,188,4,0.12)', color: 'var(--gc-amber)' }}><Key /></div>
              <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '8px' }}>Medical SEO Keywords</h3>
              <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Discover search terms for your locality & specialty (e.g. dental clinic Noida, dermatologist nearby).</p>
            </div>

            <div className="card-glass feature-card">
              <div className="feature-icon" style={{ background: 'rgba(139,92,246,0.12)', color: '#8b5cf6' }}><QrCode /></div>
              <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '8px' }}>Reception Review QR Standee</h3>
              <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Generate branded printable QR standees for your front desk to collect voluntary patient feedback.</p>
            </div>

            <div className="card-glass feature-card">
              <div className="feature-icon" style={{ background: 'rgba(59,130,246,0.12)', color: 'var(--gc-blue)' }}><ImageIcon /></div>
              <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '8px' }}>Equipment Photo Alt Tags</h3>
              <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Photo guidelines for consultation rooms & advanced equipment + AI image Alt tags.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" style={{ padding: '80px 0' }}>
        <div className="container">
          <div className="section-title">
            <h2>Transparent Pricing For <span className="text-gradient">Medical Practices</span></h2>
            <p>Billed in INR via Razorpay with standard GST invoices.</p>

            {/* Currency & Billing Switchers */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '24px' }}>
              <div style={{ background: 'var(--bg-card)', padding: '4px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', display: 'inline-flex' }}>
                <button 
                  className={`btn ${billingCycle === 'monthly' ? 'btn-green' : 'btn-outline'}`}
                  style={{ padding: '6px 16px', fontSize: '13px' }}
                  onClick={() => setBillingCycle('monthly')}
                >
                  Monthly Billing
                </button>
                <button 
                  className={`btn ${billingCycle === 'annual' ? 'btn-green' : 'btn-outline'}`}
                  style={{ padding: '6px 16px', fontSize: '13px' }}
                  onClick={() => setBillingCycle('annual')}
                >
                  Annual (Save 20%)
                </button>
              </div>

              <div style={{ background: 'var(--bg-card)', padding: '4px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', display: 'inline-flex' }}>
                <button 
                  className={`btn ${currency === 'INR' ? 'btn-green' : 'btn-outline'}`}
                  style={{ padding: '6px 14px', fontSize: '13px' }}
                  onClick={() => setCurrency('INR')}
                >
                  🇮🇳 INR (₹)
                </button>
                <button 
                  className={`btn ${currency === 'USD' ? 'btn-green' : 'btn-outline'}`}
                  style={{ padding: '6px 14px', fontSize: '13px' }}
                  onClick={() => setCurrency('USD')}
                >
                  🌐 USD ($)
                </button>
              </div>
            </div>
          </div>

          <div className="pricing-grid">
            {PRICING_PLANS.map((plan) => {
              const price = billingCycle === 'monthly'
                ? (currency === 'INR' ? `₹${plan.priceMonthlyINR}` : `$${plan.priceMonthlyUSD}`)
                : (currency === 'INR' ? `₹${plan.priceAnnualINR}` : `$${plan.priceAnnualUSD}`);

              return (
                <div key={plan.id} className={`card-glass pricing-card ${plan.popular ? 'popular' : ''}`}>
                  {plan.popular && <span className="pop-badge">{plan.badge}</span>}
                  
                  <div>
                    <h3 style={{ fontSize: '22px', fontWeight: '800', marginBottom: '4px' }}>{plan.name}</h3>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>{plan.subtitle}</p>

                    <div className="price-tag">
                      {price} <span>/ month</span>
                    </div>

                    <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px', margin: '20px 0', fontSize: '14px', color: 'var(--text-muted)' }}>
                      {plan.features.map((feat, idx) => (
                        <li key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Check size={16} color="var(--gc-emerald)" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <button className={`btn ${plan.popular ? 'btn-green' : 'btn-outline'} btn-lg`} style={{ width: '100%' }} onClick={() => onOpenCheckout(plan)}>
                    Choose {plan.name}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* FAQs */}
      <section id="faqs" style={{ padding: '80px 0', background: 'var(--bg-secondary)' }}>
        <div className="container" style={{ maxWidth: '800px' }}>
          <div className="section-title">
            <h2>Frequently Asked <span className="text-gradient">Questions</span></h2>
            <p>Everything you need to know about GrowClinic GMB software.</p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {FAQS.map((faq, idx) => (
              <div 
                key={idx} 
                className="card-glass" 
                style={{ cursor: 'pointer', padding: '20px' }}
                onClick={() => toggleFaq(idx)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: '800', fontSize: '16px' }}>
                  <span>{faq.question}</span>
                  {openFaq === idx ? <ChevronUp size={20} color="var(--gc-emerald)" /> : <ChevronDown size={20} />}
                </div>
                {openFaq === idx && (
                  <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '12px', lineHeight: '1.6' }}>
                    {faq.answer}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section style={{ padding: '64px 0', background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)', color: '#fff', textAlign: 'center' }}>
        <div className="container">
          <h2 style={{ fontSize: '36px', fontWeight: '900', marginBottom: '16px', color: '#fff' }}>
            Ready to Take Control of Your Clinic Profile?
          </h2>
          <p style={{ fontSize: '18px', maxWidth: '640px', margin: '0 auto 28px', opacity: 0.92 }}>
            Join doctors and clinic directors using GrowClinic GMB today. Hosted at <strong>gmb.growclinic.io</strong>.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <button
              className="btn btn-lg"
              style={{ background: '#fff', color: 'var(--gc-green-dark)' }}
              onClick={onOpenOtpModal}
            >
              <Smartphone size={18} />
              <span>WhatsApp Login</span>
            </button>
            <button
              className="btn btn-lg"
              style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.6)', color: '#fff' }}
              onClick={() => onOpenLegalModal('terms')}
            >
              View Legal Policies
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
