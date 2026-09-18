import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import LandingPage from './pages/LandingPage';
import DashboardApp from './pages/DashboardApp';
import SuperAdminView from './pages/SuperAdminView';
import QuickAuditModal from './components/QuickAuditModal';
import CheckoutModal from './components/CheckoutModal';
import LegalModal from './components/LegalModal';
import OtpOnboardingModal from './components/OtpOnboardingModal';
import GbpAuditWidget from './components/GbpAuditWidget';
import Toast from './components/Toast';
import { ShieldCheck, Clock, Lock, ListChecks } from 'lucide-react';
import { PRICING_PLANS } from './data/marketingData';
import { SAMPLE_PROFILES } from './data/sampleProfiles';
import { createClinicProfile } from './data/profileFactory';

export default function App() {
  const [currentView, setCurrentView] = useState('landing');
  const [theme, setTheme] = useState('light');
  const [profiles, setProfiles] = useState(SAMPLE_PROFILES);
  const [selectedProfileId, setSelectedProfileId] = useState(SAMPLE_PROFILES[0].id);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isLegalModalOpen, setIsLegalModalOpen] = useState(false);
  const [legalTab, setLegalTab] = useState('terms');
  const [isOtpModalOpen, setIsOtpModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(PRICING_PLANS[1]);
  const [auditPrefill, setAuditPrefill] = useState(null); // confirmed GBP place from instant audit
  const [toast, setToast] = useState(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  const handleOpenCheckout = (plan) => {
    if (plan) setSelectedPlan(plan);
    setIsCheckoutOpen(true);
  };

  const handleOpenLegalModal = (tab = 'terms') => {
    setLegalTab(tab);
    setIsLegalModalOpen(true);
  };

  const handleLaunchApp = () => {
    setIsAuditModalOpen(false);
    setCurrentView('app');
    showToast('Launched GrowClinic GMB Patient Acquisition Suite!');
  };

  const handleCompleteOtpOnboarding = (profileData) => {
    // Build a complete profile from the onboarding inputs and make it the
    // active clinic so the dashboard reflects what the user just set up.
    const newProfile = createClinicProfile({
      name: profileData.name,
      city: profileData.city,
      category: profileData.specialty,
      completionScore: profileData.completionScore ?? 84,
    });
    setProfiles(prev => [newProfile, ...prev]);
    setSelectedProfileId(newProfile.id);
    setCurrentView('app');
    showToast(`WhatsApp Authenticated! ${newProfile.name} onboarded.`);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Navbar ONLY on public landing page per design system rule */}
      {currentView === 'landing' && (
        <Navbar 
          currentView={currentView}
          setCurrentView={setCurrentView}
          theme={theme}
          setTheme={setTheme}
          onOpenAuditModal={() => setIsAuditModalOpen(true)}
          onOpenCheckout={() => handleOpenCheckout(PRICING_PLANS[1])}
          onOpenLegalModal={handleOpenLegalModal}
          onOpenOtpModal={() => setIsOtpModalOpen(true)}
        />
      )}

      {/* Main View Area */}
      <div style={{ flex: 1 }}>
        {currentView === 'landing' ? (
          <>
            {/* Instant GBP audit — the front door (design-system aligned) */}
            <section className="hero-section" style={{ paddingBottom: '44px' }}>
              <div className="container" style={{ maxWidth: '860px', textAlign: 'center' }}>
                <span className="badge" style={{ marginBottom: '20px' }}>
                  <ShieldCheck size={13} /> Free Google check-up
                </span>
                <h1 style={{ fontSize: 'clamp(30px, 5vw, 54px)', fontWeight: 900, lineHeight: 1.06, letterSpacing: '-0.02em', margin: '0 auto 16px', maxWidth: '800px' }}>
                  Are patients finding you on Google —<br />or <span className="text-gradient">your competitor?</span>
                </h1>
                <p style={{ fontSize: '18px', color: 'var(--text-muted)', maxWidth: '580px', margin: '0 auto 30px' }}>
                  Search your clinic and get a free Google Business Profile report in 60 seconds. No login, no card.
                </p>
                <GbpAuditWidget onClaim={(place) => { setAuditPrefill(place); setIsOtpModalOpen(true); }} />
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap', marginTop: '26px' }}>
                  <span className="badge badge-emerald"><Clock size={12} /> 60-second report</span>
                  <span className="badge badge-emerald"><Lock size={12} /> No login needed</span>
                  <span className="badge badge-emerald"><ListChecks size={12} /> 12 checks</span>
                  <span className="badge badge-emerald"><ShieldCheck size={12} /> Consent-led</span>
                </div>
              </div>
            </section>
            <LandingPage
              onOpenAuditModal={() => setIsAuditModalOpen(true)}
              onOpenCheckout={handleOpenCheckout}
              onLaunchApp={handleLaunchApp}
              onOpenOtpModal={() => setIsOtpModalOpen(true)}
              onOpenLegalModal={handleOpenLegalModal}
              showToast={showToast}
            />
          </>
        ) : currentView === 'super-admin' ? (
          <SuperAdminView 
            setCurrentView={setCurrentView}
            showToast={showToast} 
          />
        ) : (
          <DashboardApp
            setCurrentView={setCurrentView}
            profiles={profiles}
            setProfiles={setProfiles}
            selectedProfileId={selectedProfileId}
            setSelectedProfileId={setSelectedProfileId}
            onOpenAuditModal={() => setIsAuditModalOpen(true)}
            onOpenCheckout={handleOpenCheckout}
            onOpenLegalModal={handleOpenLegalModal}
            showToast={showToast}
          />
        )}
      </div>

      {/* Footer ONLY on public landing page per design system rule */}
      {currentView === 'landing' && (
        <Footer
          setCurrentView={setCurrentView}
          onOpenAuditModal={() => setIsAuditModalOpen(true)}
          onOpenCheckout={() => handleOpenCheckout(PRICING_PLANS[1])}
          onOpenLegalModal={handleOpenLegalModal}
        />
      )}

      {/* Modals */}
      <QuickAuditModal 
        isOpen={isAuditModalOpen}
        onClose={() => setIsAuditModalOpen(false)}
        onLaunchApp={handleLaunchApp}
      />

      <CheckoutModal 
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        plan={selectedPlan}
      />

      <LegalModal 
        isOpen={isLegalModalOpen}
        onClose={() => setIsLegalModalOpen(false)}
        initialTab={legalTab}
      />

      <OtpOnboardingModal
        isOpen={isOtpModalOpen}
        onClose={() => { setIsOtpModalOpen(false); setAuditPrefill(null); }}
        onComplete={handleCompleteOtpOnboarding}
        prefill={auditPrefill}
      />

      <Toast 
        toast={toast}
        onClose={() => setToast(null)}
      />
    </div>
  );
}
