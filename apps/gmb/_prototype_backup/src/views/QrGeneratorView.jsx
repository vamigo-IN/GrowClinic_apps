import React, { useState } from 'react';
import { QrCode, Download, Printer, Sparkles, Star, Heart, Check, Stethoscope, Send, MessageCircle } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function QrGeneratorView({ activeProfile, showToast }) {
  const [headerText, setHeaderText] = useState('Scan to Review Your Doctor on Google');
  const [tagline, setTagline] = useState('Your honest feedback helps patients find quality healthcare.');
  const [primaryColor, setPrimaryColor] = useState('#2563eb');
  const [reviewPrompt, setReviewPrompt] = useState('Share your honest experience of your visit on Google.');
  const [downloading, setDownloading] = useState(false);

  // WhatsApp Review Request Generator
  const [patientMobile, setPatientMobile] = useState('');
  const [patientName, setPatientName] = useState('');

  if (!activeProfile) return null;

  const reviewUrl = activeProfile.googleReviewUrl || `https://g.page/r/${activeProfile.id}/review`;

  const handleDownload = () => {
    setDownloading(true);
    setTimeout(() => {
      setDownloading(false);
      confetti({ particleCount: 80, spread: 60 });
      if (showToast) showToast('Standee preview ready — printable PDF export coming soon.');
    }, 1000);
  };

  const handleSendWhatsapp = (e) => {
    e.preventDefault();
    if (!patientMobile) return;

    const message = `Hello ${patientName || 'Dear Patient'}, thank you for visiting ${activeProfile.name} today! We hope you had a comfortable consultation experience. If you have a moment, we'd be grateful if you could share your honest review of your visit on Google: ${reviewUrl}`;
    // Normalize to an Indian E.164 number without duplicating the country code.
    let digits = patientMobile.replace(/[^0-9]/g, '');
    if (digits.startsWith('0')) digits = digits.slice(1);
    if (digits.startsWith('91') && digits.length > 10) digits = digits.slice(2);
    if (digits.length !== 10) {
      if (showToast) showToast('Enter a valid 10-digit mobile number.', 'error');
      return;
    }
    const waUrl = `https://wa.me/91${digits}?text=${encodeURIComponent(message)}`;

    window.open(waUrl, '_blank', 'noopener,noreferrer');
    if (showToast) showToast(`WhatsApp review request link created for ${patientMobile}!`);
  };

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: '900' }}>Reception Patient Review QR Standee & WhatsApp Tool</h2>
        <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
          Create custom branded review standees for your clinic reception and send automated WhatsApp review requests.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.1fr', gap: '28px' }}>
        
        {/* Customize Options & WhatsApp Tool */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="card-glass">
            <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '20px' }}>Clinic QR Standee Customizer</h3>

            <div className="form-group">
              <label>Google Clinic Review URL</label>
              <input type="text" className="input-control" value={reviewUrl} readOnly />
            </div>

            <div className="form-group">
              <label>Standee Header Title</label>
              <input 
                type="text" 
                className="input-control" 
                value={headerText} 
                onChange={(e) => setHeaderText(e.target.value)} 
              />
            </div>

            <div className="form-group">
              <label>Patient Reassurance Tagline</label>
              <input 
                type="text" 
                className="input-control" 
                value={tagline} 
                onChange={(e) => setTagline(e.target.value)} 
              />
            </div>

            <div className="form-group">
              <label>Review Starter Suggestion</label>
              <textarea 
                rows="2"
                className="input-control" 
                value={reviewPrompt} 
                onChange={(e) => setReviewPrompt(e.target.value)} 
              />
            </div>

            <div className="form-group">
              <label>Standee Theme Accent</label>
              <div style={{ display: 'flex', gap: '12px' }}>
                {['#2563eb', '#10b981', '#7b2cbf', '#0f172a', '#d97706'].map(color => (
                  <button
                    key={color}
                    type="button"
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '50%',
                      background: color,
                      border: primaryColor === color ? '3px solid #fff' : '2px solid rgba(0,0,0,0.5)',
                      cursor: 'pointer',
                      boxShadow: primaryColor === color ? '0 0 14px ' + color + ', inset 0 2px 4px rgba(255,255,255,0.4)' : '0 4px 6px rgba(0,0,0,0.4)'
                    }}
                    onClick={() => setPrimaryColor(color)}
                  />
                ))}
              </div>
            </div>

            <button className="btn-green btn-lg" style={{ width: '100%', marginTop: '14px' }} onClick={handleDownload} disabled={downloading}>
              <Download size={18} />
              <span>{downloading ? "Preparing High Res Print PDF..." : "Download Printable Clinic QR Standee"}</span>
            </button>
          </div>

          {/* WhatsApp Patient Review Request Tool */}
          <div className="card-glass" style={{ border: '1px solid var(--gc-emerald)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--gc-emerald)', marginBottom: '12px' }}>
              <MessageCircle size={20} />
              <h3 style={{ fontSize: '16px', fontWeight: '800' }}>WhatsApp Patient Review Sender</h3>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Send direct WhatsApp review links to patients right after their clinic consultation.
            </p>

            <form onSubmit={handleSendWhatsapp}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label>Patient Name</label>
                  <input 
                    type="text" 
                    className="input-control" 
                    placeholder="e.g. Rahul Sharma" 
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>WhatsApp Number *</label>
                  <input 
                    type="tel" 
                    required 
                    className="input-control" 
                    placeholder="9876543210" 
                    value={patientMobile}
                    onChange={(e) => setPatientMobile(e.target.value)}
                  />
                </div>
              </div>

              <button type="submit" className="btn btn-green btn-sm" style={{ width: '100%', marginTop: '8px', background: 'linear-gradient(180deg, #22c55e 0%, #16a34a 100%)' }}>
                <Send size={15} />
                <span>Send Patient WhatsApp Review Link</span>
              </button>
            </form>
          </div>
        </div>

        {/* Live Poster Preview Standee */}
        <div className="card-glass" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '20px', alignSelf: 'flex-start' }}>Printable Reception Standee Preview</h3>

          {/* Skeuomorphic Standee Poster Box */}
          <div style={{
            width: '330px',
            background: 'linear-gradient(180deg, #ffffff 0%, #f1f5f9 100%)',
            color: '#0f172a',
            borderRadius: '24px',
            padding: '30px 24px',
            boxShadow: '0 25px 60px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.9)',
            textAlign: 'center',
            border: `8px solid ${primaryColor}`
          }}>
            {/* Header Badge */}
            <div style={{ background: primaryColor, color: '#fff', padding: '6px 14px', borderRadius: '50px', fontSize: '11px', fontWeight: '800', display: 'inline-flex', alignItems: 'center', gap: '6px', textTransform: 'uppercase', marginBottom: '14px', boxShadow: '0 4px 10px rgba(0,0,0,0.3)' }}>
              <Stethoscope size={14} /> Google Patient Reviews
            </div>

            <h3 style={{ fontSize: '19px', fontWeight: '900', color: primaryColor, marginBottom: '6px', textShadow: 'none' }}>{headerText}</h3>
            <p style={{ fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '16px', textShadow: 'none' }}>{tagline}</p>

            {/* QR SVG Mock Render */}
            <div style={{ background: '#ffffff', padding: '16px', borderRadius: '20px', display: 'inline-block', border: '2px solid #cbd5e1', boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.1), 0 6px 16px rgba(0,0,0,0.1)', marginBottom: '16px' }}>
              <svg width="150" height="150" viewBox="0 0 100 100" fill={primaryColor}>
                <rect x="5" y="5" width="30" height="30" rx="4" fill={primaryColor}/>
                <rect x="10" y="10" width="20" height="20" rx="2" fill="#fff"/>
                <rect x="15" y="15" width="10" height="10" rx="1" fill={primaryColor}/>
                
                <rect x="65" y="5" width="30" height="30" rx="4" fill={primaryColor}/>
                <rect x="70" y="10" width="20" height="20" rx="2" fill="#fff"/>
                <rect x="75" y="15" width="10" height="10" rx="1" fill={primaryColor}/>

                <rect x="5" y="65" width="30" height="30" rx="4" fill={primaryColor}/>
                <rect x="10" y="70" width="20" height="20" rx="2" fill="#fff"/>
                <rect x="15" y="75" width="10" height="10" rx="1" fill={primaryColor}/>

                <rect x="40" y="10" width="15" height="10" fill={primaryColor}/>
                <rect x="45" y="25" width="10" height="20" fill={primaryColor}/>
                <rect x="65" y="45" width="25" height="10" fill={primaryColor}/>
                <rect x="40" y="65" width="20" height="15" fill={primaryColor}/>
                <rect x="70" y="75" width="20" height="20" fill={primaryColor}/>
                <rect x="40" y="45" width="15" height="15" fill={primaryColor}/>

                <circle cx="50" cy="50" r="12" fill="#fff" />
                <path d="M50 42 L52 47 L57 48 L53 52 L54 57 L50 54 L46 57 L47 52 L43 48 L48 47 Z" fill="#FBBC04" />
              </svg>
            </div>

            {/* Neutral rating row — outline stars, no pre-set rating (avoids review gating) */}
            <div style={{ color: '#94a3b8', fontSize: '20px', marginBottom: '10px' }}>
              ☆☆☆☆☆
            </div>

            <p style={{ fontSize: '11px', color: '#64748b', fontStyle: 'italic', textShadow: 'none' }}>
              "{reviewPrompt}"
            </p>
            <div style={{ marginTop: '12px', fontSize: '12px', fontWeight: '900', color: primaryColor, textShadow: 'none' }}>
              {activeProfile.name}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
