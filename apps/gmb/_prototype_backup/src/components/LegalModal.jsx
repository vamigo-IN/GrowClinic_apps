import React, { useState } from 'react';
import { X, ShieldCheck, FileText, Lock, RefreshCw, AlertCircle } from 'lucide-react';

export default function LegalModal({ isOpen, onClose, initialTab = 'terms' }) {
  const [activeTab, setActiveTab] = useState(initialTab);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content" 
        style={{ maxWidth: '820px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ShieldCheck size={24} color="var(--gc-emerald)" />
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: '800' }}>Legal & Compliance Policy</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>GrowClinic (Cloutrr Grow OPC Pvt Ltd) • Hosted at gmb.growclinic.io</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
          >
            <X size={22} />
          </button>
        </div>

        {/* Policy Tabs */}
        <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', marginBottom: '20px', overflowX: 'auto' }}>
          <button
            className={`btn btn-sm ${activeTab === 'terms' ? 'btn-green' : 'btn-outline'}`}
            onClick={() => setActiveTab('terms')}
          >
            <FileText size={14} />
            <span>Terms of Service</span>
          </button>
          <button
            className={`btn btn-sm ${activeTab === 'privacy' ? 'btn-green' : 'btn-outline'}`}
            onClick={() => setActiveTab('privacy')}
          >
            <Lock size={14} />
            <span>Privacy & Retention</span>
          </button>
          <button
            className={`btn btn-sm ${activeTab === 'refund' ? 'btn-green' : 'btn-outline'}`}
            onClick={() => setActiveTab('refund')}
          >
            <RefreshCw size={14} />
            <span>Refund & Cancellation</span>
          </button>
          <button
            className={`btn btn-sm ${activeTab === 'google-api' ? 'btn-green' : 'btn-outline'}`}
            onClick={() => setActiveTab('google-api')}
          >
            <AlertCircle size={14} />
            <span>Google API Disclosure</span>
          </button>
        </div>

        {/* Content Body */}
        <div style={{ flex: 1, overflowY: 'auto', paddingRight: '8px', fontSize: '14px', lineHeight: '1.7', color: 'var(--text-muted)' }}>
          {activeTab === 'terms' && (
            <div>
              <h4 style={{ color: 'var(--text-main)', marginBottom: '12px', fontSize: '16px' }}>1. Terms of Service</h4>
              <p style={{ marginBottom: '12px' }}>
                Welcome to <strong>Gmb</strong> (hosted at <code>gmb.growclinic.io</code>), operated by <strong>Cloutrr Grow (OPC) Private Limited</strong>, Noida, Uttar Pradesh, India.
              </p>
              <h5 style={{ color: 'var(--text-main)', marginTop: '16px', marginBottom: '8px' }}>Scope of Services</h5>
              <p style={{ marginBottom: '12px' }}>
                Gmb provides clinic owners, doctors, and healthcare institutions with profile audit insights, reputation management workflow helpers, and consent-led Google Business Profile management tools.
              </p>
              <h5 style={{ color: 'var(--text-main)', marginTop: '16px', marginBottom: '8px' }}>Explicit Guardrails & No-Guarantee Policy</h5>
              <p style={{ marginBottom: '12px' }}>
                Gmb improves profile accuracy and health factors under the clinic's direct control. Gmb <strong>does not guarantee</strong> Google search rankings, patient footfall, appointment volumes, or specific Google search outcomes. All protected field changes require explicit user authorization.
              </p>
              <h5 style={{ color: 'var(--text-main)', marginTop: '16px', marginBottom: '8px' }}>User Responsibilities</h5>
              <p style={{ marginBottom: '12px' }}>
                Clinics must maintain valid medical council registration, accurate location listings, and strictly adhere to ethical patient review guidelines. Medical advertising rules in India prohibit deceptive rating gating or false claims.
              </p>
            </div>
          )}

          {activeTab === 'privacy' && (
            <div>
              <h4 style={{ color: 'var(--text-main)', marginBottom: '12px', fontSize: '16px' }}>2. Privacy Policy & Data Retention</h4>
              <p style={{ marginBottom: '12px' }}>
                Gmb is committed to strict data protection under the Digital Personal Data Protection (DPDP) Act of India and international privacy standards.
              </p>
              <h5 style={{ color: 'var(--text-main)', marginTop: '16px', marginBottom: '8px' }}>90-Day Retention Schedule</h5>
              <p style={{ marginBottom: '12px' }}>
                Public Google review content, AI review draft logs, and generated post drafts are retained in encrypted storage for <strong>90 days</strong>, after which they are automatically purged unless retained for active legal compliance.
              </p>
              <h5 style={{ color: 'var(--text-main)', marginTop: '16px', marginBottom: '8px' }}>Immediate Token Deletion</h5>
              <p style={{ marginBottom: '12px' }}>
                When a clinic practice disconnects its Google account or deletes its workspace, all encrypted OAuth access and refresh tokens are deleted immediately from our credentials vault.
              </p>
            </div>
          )}

          {activeTab === 'refund' && (
            <div>
              <h4 style={{ color: 'var(--text-main)', marginBottom: '12px', fontSize: '16px' }}>3. Subscription, Refund & Cancellation Policy</h4>
              <p style={{ marginBottom: '12px' }}>
                Gmb subscriptions are billed via Razorpay in Indian Rupees (INR) with standard GST compliant tax invoices.
              </p>
              <h5 style={{ color: 'var(--text-main)', marginTop: '16px', marginBottom: '8px' }}>Cancellation Terms</h5>
              <p style={{ marginBottom: '12px' }}>
                You may cancel your monthly or annual subscription at any time from the account dashboard. Access remains active through the end of your prepaid billing period.
              </p>
              <h5 style={{ color: 'var(--text-main)', marginTop: '16px', marginBottom: '8px' }}>Refund Policy</h5>
              <p style={{ marginBottom: '12px' }}>
                If you experience service interruption or issue a cancellation within 7 days of initial subscription signup, a full pro-rated refund will be processed to your original payment method via Razorpay within 5–7 business days.
              </p>
            </div>
          )}

          {activeTab === 'google-api' && (
            <div>
              <h4 style={{ color: 'var(--text-main)', marginBottom: '12px', fontSize: '16px' }}>4. Google API User Data Disclosure</h4>
              <p style={{ marginBottom: '12px' }}>
                Gmb's use and transfer to any other app of information received from Google APIs will adhere to the <strong>Google API Services User Data Policy</strong>, including the Limited Use requirements.
              </p>
              <h5 style={{ color: 'var(--text-main)', marginTop: '16px', marginBottom: '8px' }}>Permissions & Scopes</h5>
              <p style={{ marginBottom: '12px' }}>
                We request read/write access to Google Business Profile data solely to perform audits, display review metrics, and publish updates explicitly approved by the clinic owner.
              </p>
              <h5 style={{ color: 'var(--text-main)', marginTop: '16px', marginBottom: '8px' }}>No Unauthorized Publishing</h5>
              <p style={{ marginBottom: '12px' }}>
                Gmb will never automatically update profile fields or reply to sensitive patient reviews without owner confirmation.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Grievance Officer Contact: <strong>grievance@growclinic.io</strong></span>
          <button className="btn btn-outline btn-sm" onClick={onClose}>
            Close Notice
          </button>
        </div>
      </div>
    </div>
  );
}
