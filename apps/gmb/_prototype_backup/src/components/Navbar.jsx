import React, { useState } from 'react';
import { Stethoscope, Sun, Moon, Menu, X, Smartphone, ShieldCheck } from 'lucide-react';

const NAV_LINKS = [
  ['#hero', 'Home'],
  ['#specialties', 'Specialties'],
  ['#features', 'Solutions'],
  ['#how-it-works', 'How It Works'],
  ['#pricing', 'Pricing'],
  ['#faqs', 'FAQs'],
];

export default function Navbar({ currentView, setCurrentView, theme, setTheme, onOpenAuditModal, onOpenLegalModal, onOpenOtpModal }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const goToSection = () => {
    setCurrentView('landing');
    setMobileMenuOpen(false);
  };

  return (
    <>
      {/* Top Announcement Bar */}
      <div className="top-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '0 auto', flexWrap: 'wrap', justifyContent: 'center' }}>
          <ShieldCheck size={15} />
          <span>Consent-led Google Business Profile operations for clinics &amp; hospitals • <strong>gmb.growclinic.io</strong></span>
        </div>
      </div>

      {/* Main Navbar */}
      <header className="navbar">
        <div className="container nav-container">
          {/* Logo */}
          <div className="brand-logo" style={{ cursor: 'pointer' }} onClick={goToSection}>
            <div className="logo-icon">
              <Stethoscope size={22} color="#fff" />
            </div>
            <div>
              <span className="text-gradient" style={{ fontSize: '20px', fontWeight: '900' }}>GrowClinic</span>
              <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1.5px', display: 'block', color: 'var(--gc-green)', marginTop: '-2px', fontWeight: '800' }}>
                GMB AI Engine
              </span>
            </div>
          </div>

          {/* Desktop Nav Links */}
          <ul className="nav-links">
            {NAV_LINKS.map(([href, label]) => (
              <li key={href}><a href={href} onClick={goToSection}>{label}</a></li>
            ))}
            <li><button onClick={() => onOpenLegalModal('terms')}>Legal</button></li>
          </ul>

          {/* Action Buttons */}
          <div className="nav-actions">
            <button
              className="nav-icon-btn"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              title="Toggle theme"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            <button className="btn btn-outline btn-sm desktop-only" onClick={onOpenAuditModal}>
              <Stethoscope size={15} />
              <span>Free Clinic Audit</span>
            </button>

            <button className="btn-green btn-sm desktop-only" onClick={onOpenOtpModal}>
              <Smartphone size={15} />
              <span>WhatsApp Login</span>
            </button>

            <button
              className="nav-icon-btn nav-toggle"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Menu"
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile dropdown menu */}
        <div className={`mobile-menu ${mobileMenuOpen ? 'open' : ''}`}>
          {NAV_LINKS.map(([href, label]) => (
            <a key={href} href={href} onClick={goToSection}>{label}</a>
          ))}
          <button className="mobile-link" onClick={() => { onOpenLegalModal('terms'); setMobileMenuOpen(false); }}>
            Legal Policies
          </button>
          <div className="mobile-cta-row">
            <button className="btn btn-outline btn-lg" onClick={() => { onOpenAuditModal(); setMobileMenuOpen(false); }}>
              <Stethoscope size={16} />
              <span>Free Clinic Audit</span>
            </button>
            <button className="btn-green btn-lg" onClick={() => { onOpenOtpModal(); setMobileMenuOpen(false); }}>
              <Smartphone size={16} />
              <span>WhatsApp Login &amp; Connect</span>
            </button>
          </div>
        </div>
      </header>
    </>
  );
}
