import React from 'react';
import { Phone, Mail, MapPin, Stethoscope, ShieldCheck, Lock, FileText, RefreshCw, AlertCircle } from 'lucide-react';

export default function Footer({ setCurrentView, onOpenAuditModal, onOpenCheckout, onOpenLegalModal }) {
  return (
    <footer style={{ background: 'var(--bg-secondary)', borderTop: '1px solid var(--border-color)', padding: '60px 0 30px', marginTop: '80px' }}>
      <div className="container">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '40px', marginBottom: '40px' }}>
          
          {/* Brand Info */}
          <div>
            <div className="brand-logo" style={{ marginBottom: '16px' }}>
              <div className="logo-icon">
                <Stethoscope size={20} color="#fff" />
              </div>
              <div>
                <span className="text-gradient" style={{ fontSize: '20px', fontWeight: '900' }}>GrowClinic</span>
                <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1.5px', display: 'block', color: 'var(--gc-emerald)', marginTop: '-4px', fontWeight: '800' }}>
                  gmb.growclinic.io
                </span>
              </div>
            </div>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Consent-led Google Business Profile operations & reputation safety engine for ambitious doctors, clinics, and hospitals.
            </p>
            <div style={{ display: 'flex', gap: '10px', fontSize: '13px', color: 'var(--text-muted)' }}>
              <span>📍 Noida, Uttar Pradesh, India</span>
            </div>
          </div>

          {/* Healthcare AI Tools */}
          <div>
            <h4 style={{ fontSize: '16px', marginBottom: '16px', color: 'var(--text-main)' }}>Clinic Operations</h4>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '14px', color: 'var(--text-muted)' }}>
              <li><a href="#hero" onClick={onOpenAuditModal}>Clinic Profile Health Audit</a></li>
              <li><a href="#features">AI Patient Update Generator</a></li>
              <li><a href="#features">AI Patient Review Reply Assistant</a></li>
              <li><a href="#features">Medical SEO Keyword Finder</a></li>
              <li><a href="#features">Reception Review QR Standee</a></li>
            </ul>
          </div>

          {/* Legal & Compliance Links */}
          <div>
            <h4 style={{ fontSize: '16px', marginBottom: '16px', color: 'var(--text-main)' }}>India Legal & Policies</h4>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '14px', color: 'var(--text-muted)' }}>
              <li>
                <button onClick={() => onOpenLegalModal('terms')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <FileText size={14} color="var(--gc-blue)" />
                  <span>Terms of Service</span>
                </button>
              </li>
              <li>
                <button onClick={() => onOpenLegalModal('privacy')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Lock size={14} color="var(--gc-emerald)" />
                  <span>Privacy Policy & 90-Day Retention</span>
                </button>
              </li>
              <li>
                <button onClick={() => onOpenLegalModal('refund')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <RefreshCw size={14} color="var(--gc-amber)" />
                  <span>Refund & Cancellation Policy</span>
                </button>
              </li>
              <li>
                <button onClick={() => onOpenLegalModal('google-api')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <AlertCircle size={14} color="var(--gc-purple)" />
                  <span>Google API Disclosure</span>
                </button>
              </li>
            </ul>
          </div>

          {/* Contact Details */}
          <div>
            <h4 style={{ fontSize: '16px', marginBottom: '16px', color: 'var(--text-main)' }}>Contact & Support</h4>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px', color: 'var(--text-muted)' }}>
              <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Phone size={16} color="var(--gc-emerald)" />
                <a href="tel:+917287774212">+91 72877 74212</a>
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Mail size={16} color="var(--gc-blue)" />
                <a href="mailto:hi@growclinic.io">hi@growclinic.io</a>
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MapPin size={16} color="var(--gc-purple)" />
                <span>Cloutrr Grow (OPC) Pvt Ltd, Noida</span>
              </li>
            </ul>
          </div>

        </div>

        {/* Disclaimer & Copyright */}
        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '24px', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '12px', fontSize: '13px', color: 'var(--text-dim)' }}>
          <p>© {new Date().getFullYear()} GrowClinic (Cloutrr Grow OPC Pvt Ltd). All rights reserved.</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
            <button
              onClick={() => setCurrentView && setCurrentView('app')}
              style={{ background: 'none', border: 'none', color: 'var(--text-dim)', fontSize: '12px', cursor: 'pointer' }}
            >
              Open Dashboard (demo)
            </button>
            <button
              onClick={() => setCurrentView && setCurrentView('super-admin')}
              style={{ background: 'none', border: 'none', color: 'var(--text-dim)', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}
            >
              <Lock size={12} /> Super Admin
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
