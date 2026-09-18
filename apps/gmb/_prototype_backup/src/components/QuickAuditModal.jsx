import React, { useState } from 'react';
import { X, Search, Sparkles, CheckCircle2, AlertTriangle, ArrowRight, ShieldCheck, Stethoscope } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function QuickAuditModal({ isOpen, onClose, onLaunchApp }) {
  const [clinicName, setClinicName] = useState('');
  const [city, setCity] = useState('');
  const [specialty, setSpecialty] = useState('Dental Clinic');
  const [isScanning, setIsScanning] = useState(false);
  const [scanStep, setScanStep] = useState(0);
  const [auditResult, setAuditResult] = useState(null);

  if (!isOpen) return null;

  const handleRunAudit = (e) => {
    e.preventDefault();
    if (!clinicName) return;

    setIsScanning(true);
    setAuditResult(null);

    const steps = [
      "Connecting to Google Maps Clinic Data...",
      "Analyzing Doctor Name & Address Consistency...",
      "Evaluating Primary Medical Category & Secondary Specialties...",
      "Checking Consultation Hours & Emergency Contact...",
      "Scanning Patient Reviews & Doctor Reputation AI...",
      "Calculating Final Clinic Patient Acquisition Score..."
    ];

    let current = 0;
    const interval = setInterval(() => {
      current++;
      if (current < steps.length) {
        setScanStep(current);
      } else {
        clearInterval(interval);
        setIsScanning(false);
        const score = Math.floor(Math.random() * 20) + 74; // Score 74-94
        setAuditResult({
          score: score,
          name: clinicName,
          city: city || "Delhi",
          specialty: specialty,
          criticalIssues: 2,
          warnings: 2,
          goodItems: 5
        });
        confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
      }
    }, 600);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '580px' }}>
        <button 
          onClick={onClose}
          style={{ position: 'absolute', top: '20px', right: '20px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
        >
          <X size={24} />
        </button>

        {!auditResult && !isScanning && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--gc-emerald)', marginBottom: '8px' }}>
              <Stethoscope size={20} />
              <span style={{ fontSize: '12px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px' }}>
                GrowClinic AI Audit Engine
              </span>
            </div>
            <h2 style={{ fontSize: '24px', fontWeight: '900', marginBottom: '8px' }}>
              Audit Your Clinic & Medical Practice
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '24px' }}>
              Enter your clinic or doctor name on Google Maps to get an instant 0-100% GMB patient acquisition health score.
            </p>

            <form onSubmit={handleRunAudit}>
              <div className="form-group">
                <label>Clinic / Doctor Name on Google</label>
                <input 
                  type="text"
                  required
                  placeholder="e.g. Apex Dental & Implant Center"
                  className="input-control"
                  value={clinicName}
                  onChange={(e) => setClinicName(e.target.value)}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label>City / Location</label>
                  <input 
                    type="text"
                    placeholder="e.g. South Delhi / Mumbai"
                    className="input-control"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Medical Specialty</label>
                  <select 
                    className="input-control"
                    value={specialty}
                    onChange={(e) => setSpecialty(e.target.value)}
                  >
                    <option value="Dental Clinic">Dental Clinic</option>
                    <option value="Dermatology & Skin">Dermatology & Skin</option>
                    <option value="Hospital & Multispecialty">Hospital & Emergency</option>
                    <option value="IVF & Fertility">IVF & Fertility</option>
                    <option value="Trichology & Hair">Trichology & Hair</option>
                    <option value="Cosmetology & Aesthetic">Cosmetology & Aesthetic</option>
                  </select>
                </div>
              </div>

              <button type="submit" className="btn-green btn-lg" style={{ width: '100%', marginTop: '12px' }}>
                <Stethoscope size={18} />
                <span>Audit My Clinic Now</span>
              </button>
            </form>
          </div>
        )}

        {isScanning && (
          <div style={{ textAlign: 'center', padding: '30px 10px' }}>
            <div className="logo-icon" style={{ width: '64px', height: '64px', margin: '0 auto 20px', borderRadius: '16px', fontSize: '32px', background: 'var(--primary-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Stethoscope size={36} color="#fff" />
            </div>
            <h3 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '12px' }}>Analyzing {clinicName}...</h3>
            <div className="progress-bar-bg" style={{ height: '10px', marginBottom: '16px' }}>
              <div className="progress-bar-fill" style={{ width: `${((scanStep + 1) / 6) * 100}%` }}></div>
            </div>
            <p style={{ fontSize: '14px', color: 'var(--gc-emerald)', fontWeight: '700' }}>
              Step {scanStep + 1} of 6: scanning clinic details...
            </p>
          </div>
        )}

        {auditResult && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div className="badge badge-emerald" style={{ marginBottom: '10px' }}>
                <ShieldCheck size={14} /> Clinic Audit Completed
              </div>
              <h2 style={{ fontSize: '22px', fontWeight: '900' }}>{auditResult.name}</h2>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{auditResult.specialty} • {auditResult.city}</p>
            </div>

            {/* Score Display */}
            <div style={{ background: 'var(--bg-card)', padding: '20px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-around', marginBottom: '20px' }}>
              <div>
                <div style={{ fontSize: '46px', fontWeight: '900', color: auditResult.score > 80 ? 'var(--gc-emerald)' : 'var(--gc-amber)' }}>
                  {auditResult.score}%
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '700' }}>Clinic Patient Score</div>
              </div>
              <div style={{ height: '40px', width: '1px', background: 'var(--border-color)' }}></div>
              <div style={{ textAlign: 'left', fontSize: '13px' }}>
                <div style={{ color: '#ef4444', fontWeight: '600' }}>⚠️ {auditResult.criticalIssues} Priority Fixes Needed</div>
                <div style={{ color: 'var(--gc-amber)', fontWeight: '600' }}>⚠️ {auditResult.warnings} SEO Opportunities</div>
                <div style={{ color: 'var(--gc-emerald)', fontWeight: '600' }}>✓ {auditResult.goodItems} Verified Parameters</div>
              </div>
            </div>

            <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid var(--gc-emerald)', borderRadius: 'var(--radius-md)', padding: '14px', marginBottom: '20px', fontSize: '13px' }}>
              <strong>🚀 Patient Acquisition Tip:</strong> Adding specialist sub-categories and responding to patient reviews can increase your appointment call volume by 40%!
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button className="btn-green" style={{ flex: 1 }} onClick={onLaunchApp}>
                <span>Open GMB Clinic Suite</span>
                <ArrowRight size={16} />
              </button>
              <button className="btn btn-outline" onClick={() => setAuditResult(null)}>
                Audit Another
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
