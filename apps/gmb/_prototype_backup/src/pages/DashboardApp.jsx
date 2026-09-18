import React, { useState } from 'react';
import OverviewView from '../views/OverviewView';
import AuditView from '../views/AuditView';
import PostGeneratorView from '../views/PostGeneratorView';
import ReviewReplyView from '../views/ReviewReplyView';
import KeywordToolView from '../views/KeywordToolView';
import QrGeneratorView from '../views/QrGeneratorView';
import PhotoPlannerView from '../views/PhotoPlannerView';
import AddClinicModal from '../components/AddClinicModal';
import ProtectedConsentModal from '../components/ProtectedConsentModal';

import { 
  LayoutDashboard, ShieldCheck, FileText, MessageSquare, Key, 
  QrCode, Image as ImageIcon, Plus, ChevronDown, Sparkles, Stethoscope,
  Lock, Home, LockKeyhole, FileCode
} from 'lucide-react';

export default function DashboardApp({ setCurrentView, profiles, setProfiles, selectedProfileId, setSelectedProfileId, onOpenAuditModal, onOpenCheckout, onOpenLegalModal, showToast }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [isAddClinicModalOpen, setIsAddClinicModalOpen] = useState(false);

  // Consent modal state
  const [consentData, setConsentData] = useState(null);

  const activeProfile = profiles.find(p => p.id === selectedProfileId) || profiles[0];

  const handleAddProfile = (newProfile) => {
    setProfiles(prev => [newProfile, ...prev]);
    setSelectedProfileId(newProfile.id);
    if (showToast) showToast(`Added ${newProfile.name} to GrowClinic GMB!`);
  };

  const handleRequestConsent = (data) => {
    setConsentData(data);
  };

  const sidebarNavItems = [
    { id: 'overview', label: 'Patient Dashboard', icon: LayoutDashboard },
    { id: 'audit', label: 'Clinic Health Audit', icon: ShieldCheck, badge: activeProfile.completionScore < 95 ? `${activeProfile.completionScore}%` : null },
    { id: 'posts', label: 'AI Patient Posts', icon: FileText },
    { id: 'reviews', label: 'Doctor Review Replies', icon: MessageSquare, badge: activeProfile.recentReviews.filter(r => !r.replied).length > 0 ? `${activeProfile.recentReviews.filter(r => !r.replied).length}` : null },
    { id: 'keywords', label: 'Medical SEO Keywords', icon: Key },
    { id: 'qr', label: 'Reception Review QR', icon: QrCode },
    { id: 'photos', label: 'Equipment & Alt Tags', icon: ImageIcon }
  ];

  return (
    <div>
      {/* Authenticated Application Header (No marketing header per design system rules) */}
      <div style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)', padding: '14px 28px', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
        
        {/* Profile & Practice Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ padding: '6px', background: 'var(--primary-gradient)', borderRadius: '8px', color: '#fff' }}>
            <Stethoscope size={18} />
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '800', letterSpacing: '0.5px' }}>
              Active Practice Location
            </div>
            <select 
              className="input-control" 
              style={{ width: 'auto', padding: '4px 10px', fontSize: '14px', fontWeight: '800', marginTop: '2px' }}
              value={selectedProfileId}
              onChange={(e) => {
                if (e.target.value === 'ADD_NEW') {
                  setIsAddClinicModalOpen(true);
                } else {
                  setSelectedProfileId(e.target.value);
                }
              }}
            >
              {profiles.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.city})
                </option>
              ))}
              <option value="ADD_NEW">+ Add New Practice Location...</option>
            </select>
          </div>
        </div>

        {/* Action Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button className="btn-green btn-sm" onClick={() => setIsAddClinicModalOpen(true)}>
            <Plus size={14} />
            <span>Add Practice</span>
          </button>

          <button className="btn btn-outline btn-sm" onClick={onOpenAuditModal}>
            <Sparkles size={14} />
            <span>Scan Profile</span>
          </button>

          <button className="btn btn-outline btn-sm" onClick={() => onOpenLegalModal('terms')}>
            <span>Legal Policies</span>
          </button>

          <button className="btn btn-outline btn-sm" onClick={() => setCurrentView('landing')}>
            <Home size={14} />
            <span>Landing Page</span>
          </button>

          <button 
            className="btn btn-sm"
            style={{ background: 'linear-gradient(135deg,#7c3aed,#4f46e5)' }}
            onClick={() => setCurrentView('super-admin')}
          >
            <LockKeyhole size={14} />
            <span>Super Admin</span>
          </button>
        </div>
      </div>

      {/* Main Layout */}
      <div className="dashboard-layout">
        {/* Sidebar */}
        <aside className="sidebar">
          <ul className="sidebar-menu">
            {sidebarNavItems.map(item => {
              const IconComp = item.icon;
              return (
                <li 
                  key={item.id} 
                  className={`sidebar-item ${activeTab === item.id ? 'active' : ''}`}
                  onClick={() => setActiveTab(item.id)}
                >
                  <IconComp size={18} />
                  <span style={{ flex: 1 }}>{item.label}</span>
                  {item.badge && (
                    <span className="badge badge-amber" style={{ fontSize: '10px', padding: '2px 8px' }}>
                      {item.badge}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>

          <div style={{ marginTop: '30px', padding: '14px', background: 'rgba(59, 130, 246, 0.08)', borderRadius: '12px', border: '1px solid rgba(59, 130, 246, 0.2)', fontSize: '12px', color: 'var(--text-muted)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--gc-blue)', fontWeight: '700', marginBottom: '4px' }}>
              <Lock size={14} />
              <span>Consent Guard Active</span>
            </div>
            Protected GBP edits require owner authorization before publishing to Google.
          </div>
        </aside>

        {/* Content Views */}
        <main className="main-content-area">
          {activeTab === 'overview' && (
            <OverviewView 
              activeProfile={activeProfile} 
              setActiveTab={setActiveTab} 
              onOpenAuditModal={onOpenAuditModal} 
              showToast={showToast}
            />
          )}

          {activeTab === 'audit' && (
            <AuditView 
              activeProfile={activeProfile} 
              setActiveTab={setActiveTab} 
              onRequestConsent={handleRequestConsent}
              showToast={showToast}
            />
          )}

          {activeTab === 'posts' && (
            <PostGeneratorView 
              activeProfile={activeProfile} 
              showToast={showToast}
            />
          )}

          {activeTab === 'reviews' && (
            <ReviewReplyView 
              activeProfile={activeProfile} 
              showToast={showToast}
            />
          )}

          {activeTab === 'keywords' && (
            <KeywordToolView 
              activeProfile={activeProfile} 
              showToast={showToast}
            />
          )}

          {activeTab === 'qr' && (
            <QrGeneratorView 
              activeProfile={activeProfile} 
              showToast={showToast}
            />
          )}

          {activeTab === 'photos' && (
            <PhotoPlannerView 
              activeProfile={activeProfile} 
              showToast={showToast}
            />
          )}
        </main>
      </div>

      <AddClinicModal 
        isOpen={isAddClinicModalOpen}
        onClose={() => setIsAddClinicModalOpen(false)}
        onAddProfile={handleAddProfile}
      />

      {consentData && (
        <ProtectedConsentModal
          isOpen={!!consentData}
          onClose={() => setConsentData(null)}
          fieldName={consentData.fieldName}
          currentValue={consentData.currentValue}
          proposedValue={consentData.proposedValue}
          impactNote={consentData.impactNote}
          onConfirm={(record) => {
            if (consentData.onConfirm) consentData.onConfirm(record);
            if (showToast) showToast(`Protected Edit Authorized & Logged: ${record.field}`);
          }}
        />
      )}
    </div>
  );
}
