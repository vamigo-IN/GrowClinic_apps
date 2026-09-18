import React, { useState } from 'react';
import { Sparkles, Copy, Check, Image as ImageIcon, Send, Stethoscope, Tag } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function PostGeneratorView({ activeProfile }) {
  const [postType, setPostType] = useState('Patient Tip');
  const [tone, setTone] = useState('Doctor Authoritative & Empathetic');
  const [targetKeyword, setTargetKeyword] = useState(activeProfile?.category || 'Painless Dental Treatment');
  const [cta, setCta] = useState('Book Appointment');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPost, setGeneratedPost] = useState(null);
  const [copied, setCopied] = useState(false);

  if (!activeProfile) return null;

  const handleGenerate = (e) => {
    e.preventDefault();
    setIsGenerating(true);

    setTimeout(() => {
      setIsGenerating(false);
      
      let text = "";
      let hashtags = "";
      let imageIdea = "";

      if (postType === 'Patient Tip') {
        text = `💡 Doctor's Health Tip from ${activeProfile.name}: Maintaining optimal oral & skin hygiene prevents long-term complications. Consult our senior specialists at ${activeProfile.locality}, ${activeProfile.city} for personalized treatment plans!`;
        hashtags = `#${activeProfile.city.replace(/\s+/g, '')}Doctors #${activeProfile.category.replace(/\s+/g, '')} #HealthcareTips #${activeProfile.locality.replace(/\s+/g, '')}`;
        imageIdea = `Doctor at ${activeProfile.name} providing consultation to a patient.`;
      } else if (postType === 'Offer') {
        text = `✨ SPECIAL HEALTH CHECKUP OFFER at ${activeProfile.name}! Get 25% OFF on full consultation & diagnostic imaging this month in ${activeProfile.city}. Prioritize your health today!`;
        hashtags = `#${activeProfile.city.replace(/\s+/g, '')}HealthOffer #DoctorConsultation #${activeProfile.locality.replace(/\s+/g, '')}`;
        imageIdea = `High resolution banner displaying free diagnostic checkup at ${activeProfile.name}.`;
      } else {
        text = `🎉 Patient Success Story! Our clinical team at ${activeProfile.name} successfully helped another patient achieve a healthy, confident smile. Experience advanced care at ${activeProfile.address}!`;
        hashtags = `#PatientCare #${activeProfile.city.replace(/\s+/g, '')}Clinic #MedicalExcellence`;
        imageIdea = `Sterile, modern treatment room at ${activeProfile.name} in ${activeProfile.city}.`;
      }

      setGeneratedPost({ text, hashtags, imageIdea, cta });
      confetti({ particleCount: 60, spread: 60 });
    }, 800);
  };

  const handleCopy = () => {
    if (!generatedPost) return;
    navigator.clipboard.writeText(`${generatedPost.text}\n\n${generatedPost.hashtags}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: '900' }}>AI Daily Clinical Post Generator</h2>
        <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
          Create engaging, compliance-friendly Google Business updates tailored for medical practices & doctors.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '28px' }}>
        
        {/* Controls */}
        <div className="card-glass">
          <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '20px' }}>Post Configuration</h3>
          
          <form onSubmit={handleGenerate}>
            <div className="form-group">
              <label>Post Type</label>
              <select className="input-control" value={postType} onChange={(e) => setPostType(e.target.value)}>
                <option value="Patient Tip">💡 Doctor Health Tip & Awareness</option>
                <option value="Offer">🏷 Special Health Checkup Package</option>
                <option value="Case Study">🎉 Patient Care Success Story</option>
                <option value="Equipment">🔬 Advanced Medical Equipment Feature</option>
              </select>
            </div>

            <div className="form-group">
              <label>Tone of Voice</label>
              <select className="input-control" value={tone} onChange={(e) => setTone(e.target.value)}>
                <option value="Doctor Authoritative & Empathetic">Doctor Authoritative & Empathetic</option>
                <option value="Professional Clinical">Professional Clinical</option>
                <option value="Reassuring & Friendly">Reassuring & Friendly</option>
              </select>
            </div>

            <div className="form-group">
              <label>Target Medical Keyword</label>
              <input 
                type="text" 
                className="input-control"
                value={targetKeyword}
                onChange={(e) => setTargetKeyword(e.target.value)}
                placeholder="e.g. Laser Root Canal / Hydrafacial"
              />
            </div>

            <div className="form-group">
              <label>Call To Action (CTA Button)</label>
              <select className="input-control" value={cta} onChange={(e) => setCta(e.target.value)}>
                <option value="Book Appointment">📅 Book Appointment</option>
                <option value="Call Clinic">📞 Call Clinic ({activeProfile.phone})</option>
                <option value="Visit Clinic Website">🌐 Visit Clinic Website</option>
                <option value="Get Directions">📍 Get Directions to Clinic</option>
              </select>
            </div>

            <button type="submit" className="btn-green btn-lg" style={{ width: '100%', marginTop: '12px' }} disabled={isGenerating}>
              <Sparkles size={18} />
              <span>{isGenerating ? "AI Writing Clinical Copy..." : "Generate AI Medical Post"}</span>
            </button>
          </form>
        </div>

        {/* Live Preview */}
        <div className="card-glass">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '800' }}>Google Maps Post Preview</h3>
            {generatedPost && (
              <button className="btn btn-outline btn-sm" onClick={handleCopy}>
                {copied ? <Check size={14} color="var(--gc-emerald)" /> : <Copy size={14} />}
                <span>{copied ? "Copied!" : "Copy Text"}</span>
              </button>
            )}
          </div>

          {!generatedPost ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)', border: '2px dashed var(--border-color)', borderRadius: 'var(--radius-lg)' }}>
              <Stethoscope size={36} color="var(--gc-blue)" style={{ margin: '0 auto 12px' }} />
              <p style={{ fontSize: '15px', fontWeight: '700' }}>Your AI generated clinical update will appear here.</p>
              <p style={{ fontSize: '13px' }}>Select post options on the left and click "Generate AI Medical Post".</p>
            </div>
          ) : (
            <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color-strong)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
              <div style={{ padding: '16px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <img src={activeProfile.logoImage} alt="" style={{ width: '40px', height: '40px', borderRadius: '50%' }} />
                <div>
                  <div style={{ fontWeight: '800', fontSize: '14px' }}>{activeProfile.name}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Verified Clinic Profile • Just Now</div>
                </div>
              </div>

              {/* Cover */}
              <div style={{ position: 'relative', height: '180px', overflow: 'hidden' }}>
                <img src={activeProfile.coverImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <div style={{ position: 'absolute', bottom: '10px', right: '10px', background: 'rgba(0,0,0,0.75)', color: '#fff', fontSize: '11px', padding: '4px 10px', borderRadius: '12px' }}>
                  🖼 Suggested Photo Idea
                </div>
              </div>

              <div style={{ padding: '20px' }}>
                <p style={{ fontSize: '14px', lineHeight: '1.6', marginBottom: '12px', color: 'var(--text-main)' }}>
                  {generatedPost.text}
                </p>
                <p style={{ fontSize: '13px', color: 'var(--gc-blue)', fontWeight: '700', marginBottom: '16px' }}>
                  {generatedPost.hashtags}
                </p>
                <div style={{ background: 'var(--gc-emerald)', color: '#fff', padding: '10px', borderRadius: 'var(--radius-md)', textAlign: 'center', fontWeight: '800', fontSize: '14px', cursor: 'pointer' }}>
                  {generatedPost.cta}
                </div>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
