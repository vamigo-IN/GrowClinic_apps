import React, { useState } from 'react';
import { Stethoscope, TrendingUp, Phone, MapPin, Eye, MousePointer, Star, CheckCircle, AlertCircle, ArrowUpRight, MessageSquare, Download } from 'lucide-react';

export default function OverviewView({ activeProfile, setActiveTab, onOpenAuditModal, showToast }) {
  const [timeRange, setTimeRange] = useState('30D');

  if (!activeProfile) return null;

  const handleExportReport = () => {
    if (showToast) showToast(`Report preview generated for ${activeProfile.name} — PDF export coming soon.`);
  };

  return (
    <div>
      {/* Top Banner Profile Summary */}
      <div style={{ background: 'var(--card-gradient)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '28px', marginBottom: '28px', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '20px' }}>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          <img 
            src={activeProfile.logoImage} 
            alt={activeProfile.name} 
            style={{ width: '72px', height: '72px', borderRadius: '16px', objectFit: 'cover', border: '2px solid var(--gc-blue)' }} 
          />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: '900' }}>{activeProfile.name}</h2>
              <span className="badge badge-emerald">✓ {activeProfile.status}</span>
            </div>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
              {activeProfile.category} • {activeProfile.locality}, {activeProfile.city}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '6px', fontSize: '13px' }}>
              <span style={{ color: 'var(--gc-amber)', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Star size={14} fill="var(--gc-amber)" /> {activeProfile.rating} ({activeProfile.reviewCount} patient reviews)
              </span>
              <span>•</span>
              <span style={{ color: 'var(--text-muted)' }}>{activeProfile.businessHours}</span>
            </div>
          </div>
        </div>

        {/* Score & Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ background: 'var(--bg-card)', padding: '16px 24px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color-strong)', textAlign: 'center' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '800', letterSpacing: '1px' }}>
              Patient Acquisition Score
            </div>
            <div style={{ fontSize: '42px', fontWeight: '900', color: activeProfile.completionScore >= 80 ? 'var(--gc-emerald)' : 'var(--gc-amber)', fontFamily: 'var(--font-heading)' }}>
              {activeProfile.completionScore}%
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button className="btn-green btn-sm" onClick={() => setActiveTab('audit')}>
              Fix Diagnostic Items
            </button>
            <button className="btn btn-outline btn-sm" onClick={handleExportReport}>
              <Download size={14} />
              <span>Export PDF Report</span>
            </button>
          </div>
        </div>
      </div>

      {/* Time Range Filter Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: '800' }}>Patient Performance Analytics</h3>
        <div style={{ background: 'var(--bg-card)', padding: '4px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', display: 'inline-flex' }}>
          {['7D', '30D', '90D', '1Y'].map(range => (
            <button
              key={range}
              className={`btn ${timeRange === range ? 'btn-green' : 'btn-outline'}`}
              style={{ padding: '4px 12px', fontSize: '12px' }}
              onClick={() => setTimeRange(range)}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '28px' }}>
        <div className="card-glass">
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '13px', marginBottom: '10px' }}>
            <span>Monthly Patient Views</span>
            <Eye size={18} color="var(--gc-blue)" />
          </div>
          <div style={{ fontSize: '28px', fontWeight: '900', marginBottom: '4px' }}>{activeProfile.metrics.monthlyViews.toLocaleString()}</div>
          <div style={{ fontSize: '12px', color: 'var(--gc-emerald)', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <TrendingUp size={14} /> {activeProfile.metrics.viewsTrend} vs last {timeRange}
          </div>
        </div>

        <div className="card-glass">
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '13px', marginBottom: '10px' }}>
            <span>Patient Appointment Calls</span>
            <Phone size={18} color="var(--gc-emerald)" />
          </div>
          <div style={{ fontSize: '28px', fontWeight: '900', marginBottom: '4px' }}>{activeProfile.metrics.monthlyCalls}</div>
          <div style={{ fontSize: '12px', color: 'var(--gc-emerald)', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <TrendingUp size={14} /> {activeProfile.metrics.callsTrend} vs last {timeRange}
          </div>
        </div>

        <div className="card-glass">
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '13px', marginBottom: '10px' }}>
            <span>Clinic Direction Requests</span>
            <MapPin size={18} color="var(--gc-amber)" />
          </div>
          <div style={{ fontSize: '28px', fontWeight: '900', marginBottom: '4px' }}>{activeProfile.metrics.directionRequests}</div>
          <div style={{ fontSize: '12px', color: 'var(--gc-emerald)', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <TrendingUp size={14} /> {activeProfile.metrics.directionsTrend} vs last {timeRange}
          </div>
        </div>

        <div className="card-glass">
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '13px', marginBottom: '10px' }}>
            <span>Appointment Booking Clicks</span>
            <MousePointer size={18} color="var(--gc-purple)" />
          </div>
          <div style={{ fontSize: '28px', fontWeight: '900', marginBottom: '4px' }}>{activeProfile.metrics.websiteClicks}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>High Intent Patients</div>
        </div>
      </div>

      {/* Analytics SVG Graph Chart */}
      <div className="card-glass" style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: '800' }}>Patient Acquisition Trend ({timeRange})</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Daily search impressions & patient appointment conversions</p>
          </div>
          <div style={{ display: 'flex', gap: '16px', fontSize: '12px', fontWeight: '700' }}>
            <span style={{ color: 'var(--gc-blue)', display: 'flex', alignItems: 'center', gap: '6px' }}>● Map Views</span>
            <span style={{ color: 'var(--gc-emerald)', display: 'flex', alignItems: 'center', gap: '6px' }}>● Appointment Calls</span>
          </div>
        </div>

        {/* Interactive SVG Chart */}
        <div style={{ width: '100%', height: '160px', position: 'relative' }}>
          <svg width="100%" height="100%" viewBox="0 0 500 120" preserveAspectRatio="none">
            <line x1="0" y1="30" x2="500" y2="30" stroke="var(--border-color)" strokeDasharray="4 4" />
            <line x1="0" y1="70" x2="500" y2="70" stroke="var(--border-color)" strokeDasharray="4 4" />
            
            <path d="M0,100 Q 100,40 200,60 T 400,20 T 500,10 L 500,120 L 0,120 Z" fill="rgba(59, 130, 246, 0.12)" />
            <path d="M0,110 Q 100,70 200,85 T 400,50 T 500,35 L 500,120 L 0,120 Z" fill="rgba(16, 185, 129, 0.12)" />

            <path d="M0,100 Q 100,40 200,60 T 400,20 T 500,10" fill="none" stroke="var(--gc-blue)" strokeWidth="3" />
            <path d="M0,110 Q 100,70 200,85 T 400,50 T 500,35" fill="none" stroke="var(--gc-emerald)" strokeWidth="3" />
          </svg>
        </div>
      </div>

      {/* Two Column Section */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '28px' }}>
        
        {/* Recommended Actions */}
        <div className="card-glass">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '800' }}>⚡ Priority Medical Actions</h3>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Updated Daily</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ background: 'var(--bg-primary)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: '700', marginBottom: '2px' }}>📝 Generate Today's Clinical Update</div>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Publish patient case study or doctor health tip to boost Google rank.</div>
              </div>
              <button className="btn-green btn-sm" onClick={() => setActiveTab('posts')}>
                Create Post
              </button>
            </div>

            <div style={{ background: 'var(--bg-primary)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: '700', marginBottom: '2px' }}>💬 Reply to Patient Reviews</div>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{activeProfile.recentReviews.filter(r => !r.replied).length} patient reviews awaiting doctor response.</div>
              </div>
              <button className="btn btn-outline btn-sm" onClick={() => setActiveTab('reviews')}>
                Auto Reply AI
              </button>
            </div>

            <div style={{ background: 'var(--bg-primary)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: '700', marginBottom: '2px' }}>📱 Print Reception Review Standee</div>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Place QR standee at clinic checkout counter for 2x more 5-star patient reviews.</div>
              </div>
              <button className="btn btn-outline btn-sm" onClick={() => setActiveTab('qr')}>
                Get QR Standee
              </button>
            </div>
          </div>
        </div>

        {/* Recent Patient Reviews */}
        <div className="card-glass">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '800' }}>Recent Patient Reviews</h3>
            <button className="btn btn-outline btn-sm" onClick={() => setActiveTab('reviews')}>View All</button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {activeProfile.recentReviews.map(rev => (
              <div key={rev.id} style={{ background: 'var(--bg-primary)', padding: '14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontWeight: '700', fontSize: '14px' }}>{rev.author}</span>
                  <span style={{ color: 'var(--gc-amber)', fontSize: '13px', fontWeight: '700' }}>{'★'.repeat(rev.rating)}</span>
                </div>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' }}>"{rev.text}"</p>
                {rev.replied ? (
                  <div style={{ fontSize: '11px', color: 'var(--gc-emerald)', fontWeight: '700' }}>✓ Responded by Doctor</div>
                ) : (
                  <button className="btn-green btn-sm" style={{ padding: '4px 10px', fontSize: '11px' }} onClick={() => setActiveTab('reviews')}>
                    Generate Doctor Reply
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
