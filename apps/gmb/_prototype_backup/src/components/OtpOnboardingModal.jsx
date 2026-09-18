import React, { useState, useEffect } from 'react';
import { Smartphone, ShieldCheck, Building2, CheckCircle2, ArrowRight, X, Sparkles, AlertCircle } from 'lucide-react';
import { api } from '../lib/api';

export default function OtpOnboardingModal({ isOpen, onClose, onComplete, prefill }) {
  const [step, setStep] = useState(1);
  const [phone, setPhone] = useState('+91 ');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [testCode, setTestCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Org state
  const [orgName, setOrgName] = useState('');
  const [specialty, setSpecialty] = useState('Dermatology & Skin Care');
  const [city, setCity] = useState('');

  // Google location state (M2 — still simulated for now)
  const [googleConnected, setGoogleConnected] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState('');

  // Prefill from a confirmed Google Business Profile (instant-audit → claim).
  useEffect(() => {
    if (isOpen && prefill) {
      if (prefill.name) setOrgName(prefill.name);
      if (prefill.city) setCity(prefill.city);
      if (prefill.primaryCategory) setSpecialty(prefill.primaryCategory);
      if (prefill.name) setSelectedLocation(prefill.name);
    }
  }, [isOpen, prefill]);

  if (!isOpen) return null;

  const handleSendOtp = async () => {
    setError('');
    setLoading(true);
    try {
      const r = await api.otpRequest(phone);
      setOtpSent(true);
      if (r && r.testCode) { setTestCode(r.testCode); setOtp(r.testCode); } // OTP_TEST_MODE
    } catch (e) {
      setError(e.message || 'Could not send code');
    } finally { setLoading(false); }
  };

  const handleVerifyOtp = async () => {
    setError('');
    if (otp.length !== 6) { setError('Enter the 6-digit code'); return; }
    setLoading(true);
    try {
      await api.otpVerify(phone, otp);
      setStep(2);
    } catch (e) {
      setError(e.message || 'Incorrect code');
    } finally { setLoading(false); }
  };

  const handleCreateOrg = async () => {
    setError('');
    if (!orgName.trim()) { setError('Enter your clinic name'); return; }
    setLoading(true);
    try {
      await api.createOrg(orgName.trim());
      await api.createLocation({
        name: orgName.trim(), city, primaryCategory: specialty,
        placeId: prefill?.placeId, address: prefill?.address, phone: prefill?.phone, website: prefill?.website,
      });
      setSelectedLocation(`${orgName} - ${city}`);
      setStep(3);
    } catch (e) {
      setError(e.message || 'Could not save clinic');
    } finally { setLoading(false); }
  };

  const handleConnectGoogle = () => {
    // Google OAuth arrives in Milestone 2 — simulated confirmation for now.
    setGoogleConnected(true);
  };

  const handleFinishOnboarding = () => {
    onComplete({
      name: orgName,
      city: city,
      specialty: specialty,
      completionScore: 84,
      isVerified: true,
      googleConnected,
      selectedLocation: selectedLocation
    });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content" 
        style={{ maxWidth: '640px', background: '#050507', border: '1px solid rgba(255, 255, 255, 0.15)', color: 'rgba(255, 255, 255, 0.96)', fontFamily: 'Inter, sans-serif' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ padding: '8px', background: 'rgba(16, 185, 129, 0.15)', borderRadius: '10px', color: '#10b981' }}>
              <ShieldCheck size={24} />
            </div>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#ffffff' }}>Clinic Practice Onboarding</h3>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>Step {step} of 3 • Hosted at gmb.growclinic.io</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {/* Step Indicator */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '24px' }}>
          <div style={{ padding: '8px', borderRadius: '8px', background: step >= 1 ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255,255,255,0.04)', border: step === 1 ? '1px solid #3b82f6' : '1px solid transparent', textAlign: 'center', fontSize: '12px', fontWeight: '700', color: step >= 1 ? '#60a5fa' : 'rgba(255,255,255,0.4)' }}>
            1. WhatsApp OTP
          </div>
          <div style={{ padding: '8px', borderRadius: '8px', background: step >= 2 ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255,255,255,0.04)', border: step === 2 ? '1px solid #3b82f6' : '1px solid transparent', textAlign: 'center', fontSize: '12px', fontWeight: '700', color: step >= 2 ? '#60a5fa' : 'rgba(255,255,255,0.4)' }}>
            2. Clinic Profile
          </div>
          <div style={{ padding: '8px', borderRadius: '8px', background: step >= 3 ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255,255,255,0.04)', border: step === 3 ? '1px solid #3b82f6' : '1px solid transparent', textAlign: 'center', fontSize: '12px', fontWeight: '700', color: step >= 3 ? '#60a5fa' : 'rgba(255,255,255,0.4)' }}>
            3. Google Connect
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.35)', color: '#fca5a5', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', marginBottom: '16px' }}>
            <AlertCircle size={16} /> <span>{error}</span>
          </div>
        )}

        {/* STEP 1: WHATSAPP OTP */}
        {step === 1 && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <Smartphone size={38} color="#10b981" style={{ marginBottom: '10px' }} />
              <h4 style={{ fontSize: '16px', fontWeight: '700', color: '#fff' }}>Secure WhatsApp Authentication</h4>
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', marginTop: '4px' }}>
                We send single-use OTPs directly to your doctor/clinic WhatsApp number.
              </p>
            </div>

            <div className="form-group">
              <label style={{ color: 'rgba(255,255,255,0.8)' }}>WhatsApp Mobile Number</label>
              <input 
                type="text"
                className="input-control"
                style={{ background: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.15)', color: '#fff', fontSize: '16px' }}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
              />
            </div>

            {!otpSent ? (
              <button className="btn-green" style={{ width: '100%', marginTop: '12px' }} onClick={handleSendOtp} disabled={loading}>
                <span>{loading ? 'Sending…' : 'Send WhatsApp OTP Code'}</span>
              </button>
            ) : (
              <div>
                <div className="form-group" style={{ marginTop: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label style={{ color: 'rgba(255,255,255,0.8)' }}>Enter 6-Digit WhatsApp OTP Code</label>
                    <span style={{ fontSize: '11px', color: '#10b981' }}>✓ Code Sent via WhatsApp</span>
                  </div>
                  <input 
                    type="text"
                    className="input-control"
                    style={{ background: 'rgba(255,255,255,0.06)', borderColor: '#10b981', color: '#fff', letterSpacing: '6px', fontSize: '20px', textAlign: 'center', fontWeight: '800' }}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    maxLength={6}
                  />
                </div>

                {testCode ? (
                  <div style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)', padding: '10px 14px', borderRadius: '8px', fontSize: '12px', color: '#60a5fa', marginBottom: '16px' }}>
                    🧪 Test mode — code auto-filled: <strong>{testCode}</strong>. Click Continue to verify.
                  </div>
                ) : (
                  <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)', padding: '10px 14px', borderRadius: '8px', fontSize: '12px', color: '#6ee7b7', marginBottom: '16px' }}>
                    Enter the 6-digit code sent to your WhatsApp.
                  </div>
                )}

                <button className="btn-green" style={{ width: '100%' }} onClick={handleVerifyOtp} disabled={loading}>
                  <span>{loading ? 'Verifying…' : 'Verify OTP & Continue'}</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            )}
          </div>
        )}

        {/* STEP 2: CLINIC ORGANIZATION */}
        {step === 2 && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <Building2 size={38} color="#60a5fa" style={{ marginBottom: '10px' }} />
              <h4 style={{ fontSize: '16px', fontWeight: '700', color: '#fff' }}>Clinic & Practice Details</h4>
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', marginTop: '4px' }}>
                Setup your medical organization to scope your Google Business Profile audit.
              </p>
            </div>

            <div className="form-group">
              <label style={{ color: 'rgba(255,255,255,0.8)' }}>Practice / Clinic Name</label>
              <input 
                type="text"
                className="input-control"
                style={{ background: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.15)', color: '#fff' }}
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label style={{ color: 'rgba(255,255,255,0.8)' }}>Primary Medical Specialty</label>
              <select 
                className="input-control"
                style={{ background: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.15)', color: '#fff' }}
                value={specialty}
                onChange={(e) => setSpecialty(e.target.value)}
              >
                <option value="Dermatology & Skin Care">Dermatology & Skin Care</option>
                <option value="Dental Clinic & Orthodontics">Dental Clinic & Orthodontics</option>
                <option value="Orthopedic & Joint Replacement">Orthopedic & Joint Replacement</option>
                <option value="Pediatrics & Child Care">Pediatrics & Child Care</option>
                <option value="General & Internal Medicine">General & Internal Medicine</option>
                <option value="Multi-Specialty Hospital">Multi-Specialty Hospital</option>
              </select>
            </div>

            <div className="form-group">
              <label style={{ color: 'rgba(255,255,255,0.8)' }}>Primary City / Location</label>
              <input 
                type="text"
                className="input-control"
                style={{ background: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.15)', color: '#fff' }}
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </div>

            <button className="btn-green" style={{ width: '100%', marginTop: '12px' }} onClick={handleCreateOrg} disabled={loading}>
              <span>{loading ? 'Saving…' : 'Save Practice Profile'}</span>
              <ArrowRight size={16} />
            </button>
          </div>
        )}

        {/* STEP 3: GOOGLE CONNECT */}
        {step === 3 && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <Sparkles size={38} color="#fbbc04" style={{ marginBottom: '10px' }} />
              <h4 style={{ fontSize: '16px', fontWeight: '700', color: '#fff' }}>Connect Google Business Profile</h4>
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', marginTop: '4px' }}>
                Grant read-first OAuth permissions to fetch NAP profile data, reviews, and post status.
              </p>
            </div>

            {!googleConnected ? (
              <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', padding: '24px', borderRadius: '12px', textAlign: 'center', marginBottom: '20px' }}>
                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)', marginBottom: '16px' }}>
                  Authorize GrowClinic (<code>gmb.growclinic.io</code>) to securely sync your verified Google listing. Your OAuth tokens are encrypted and deleted immediately if disconnected.
                </p>

                <button 
                  className="btn" 
                  style={{ background: '#ffffff', color: '#171717', border: 'none', fontWeight: '800', width: '100%', padding: '12px' }}
                  onClick={handleConnectGoogle}
                >
                  <img src="https://www.google.com/favicon.ico" alt="Google" style={{ width: '18px', height: '18px' }} />
                  <span>Connect Google Account via OAuth 2.0</span>
                </button>
              </div>
            ) : (
              <div>
                <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '14px 18px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                  <CheckCircle2 size={24} color="#10b981" />
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: '700', color: '#ffffff' }}>Google Account Connected Successfully</div>
                    <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}>OAuth Scope: Business Profile Read/Write (Consent Guarded)</div>
                  </div>
                </div>

                <div className="form-group">
                  <label style={{ color: 'rgba(255,255,255,0.8)' }}>Select Verified Facility Listing</label>
                  <select 
                    className="input-control"
                    style={{ background: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.15)', color: '#fff' }}
                    value={selectedLocation}
                    onChange={(e) => setSelectedLocation(e.target.value)}
                  >
                    <option value="Apex Care Clinic - Sector 62 Noida">{orgName} - {city} (Verified)</option>
                    <option value="Apex Care Branch 2 - Indirapuram">{orgName} - Indirapuram Branch (Verified)</option>
                  </select>
                </div>

                <button className="btn-green" style={{ width: '100%', marginTop: '12px' }} onClick={handleFinishOnboarding}>
                  <Sparkles size={16} />
                  <span>Launch Practice Dashboard & Calculate Health Score</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
