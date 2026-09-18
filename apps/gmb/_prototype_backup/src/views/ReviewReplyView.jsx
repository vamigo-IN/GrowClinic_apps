import React, { useState } from 'react';
import { Sparkles, MessageSquare, Star, Copy, Check, ShieldAlert, AlertTriangle, Stethoscope, Lock } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function ReviewReplyView({ activeProfile }) {
  const [reviewText, setReviewText] = useState('Doctor was extremely rushed during consultation and the prescribed medicine caused severe side effects. Seeking a full refund.');
  const [authorName, setAuthorName] = useState('Ananya Roy');
  const [rating, setRating] = useState(1);
  const [sentiment, setSentiment] = useState('Empathetic & Professional Doctor');
  const [isGenerating, setIsGenerating] = useState(false);
  const [replies, setReplies] = useState(null);
  const [copiedIdx, setCopiedIdx] = useState(null);

  if (!activeProfile) return null;

  // Sensitive-review classifier.
  // Only patient-safety, legal, or billing-dispute signals should escalate.
  // Ordinary clinical vocabulary (treatment, pain, medicine, cost, surgery) is
  // deliberately excluded because it appears in positive reviews too, and we
  // match on word boundaries so "pharmacy" no longer trips "harm", etc.
  const SENSITIVE_PATTERNS = [
    'malpractice', 'negligen', 'neglect', 'misdiagnos', 'wrong diagnosis',
    'side effect', 'infection', 'bleeding', 'injur', 'harm', 'death', 'died',
    'lawsuit', 'legal', 'consumer court', 'police', 'refund', 'overcharge',
    'fraud', 'scam', 'billing dispute', 'insurance dispute'
  ];

  const isSensitiveText = (text) => {
    const lower = (text || '').toLowerCase();
    return SENSITIVE_PATTERNS.some((p) => {
      const escaped = p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return new RegExp(`\\b${escaped}`, 'i').test(lower);
    });
  };

  const isSensitive = rating === 1 || isSensitiveText(reviewText);

  const handleGenerateReply = (e) => {
    e.preventDefault();
    if (!reviewText) return;

    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);

      if (isSensitive) {
        setReplies([
          {
            type: "Privacy-Safe Sensitive Escalation Reply (Manual Approval Required)",
            isSensitiveFlag: true,
            text: `Dear ${authorName}, we take all patient feedback seriously. Due to privacy and healthcare confidentiality regulations, we cannot discuss individual patient visits or treatments publicly. Please contact our Practice Director directly at ${activeProfile.phone} or email ${activeProfile.email || 'care@growclinic.io'} to discuss your concerns.`
          },
          {
            type: "Formal Clinical Patient-Relations Draft",
            isSensitiveFlag: true,
            text: `Hello ${authorName}, thank you for reaching out. Patient safety and quality of care are our highest priorities at ${activeProfile.name}. We would appreciate the opportunity to connect directly regarding your feedback. Please contact our clinic manager at ${activeProfile.phone}.`
          }
        ]);
      } else if (rating >= 4) {
        setReplies([
          {
            type: "Empathetic Doctor Response (Recommended)",
            text: `Dear ${authorName}, thank you so much for your kind ${rating}-star feedback! Our entire medical team at ${activeProfile.name} in ${activeProfile.city} is dedicated to providing compassionate, high-quality clinical care. We wish you wonderful health!`
          },
          {
            type: "Keyword-Rich Medical Response",
            text: `Thank you ${authorName}! We are thrilled to be your trusted ${activeProfile.category} in ${activeProfile.locality}, ${activeProfile.city}. Providing sterile, comfortable treatment is our top commitment. Looking forward to your next routine wellness visit!`
          },
          {
            type: "Short & Polite Acknowledgment",
            text: `Thank you ${authorName} for choosing ${activeProfile.name}! We appreciate your trust in our clinical practice.`
          }
        ]);
      } else {
        setReplies([
          {
            type: "Apologetic & Patient Care Resolution",
            text: `Dear ${authorName}, we sincerely regret that your clinic experience did not meet your expectations. Patient satisfaction and safety are our utmost priorities. Please contact our Practice Director directly at ${activeProfile.phone} so we can assist you.`
          }
        ]);
      }

      // No celebratory animation on the sensitive/escalation path.
      if (!isSensitive) confetti({ particleCount: 50, spread: 50 });
    }, 700);
  };

  const handleCopy = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: '900' }}>Doctor Review Reply & Reputation Safety</h2>
          <span className="badge badge-emerald">Ethical Feedback Policy</span>
        </div>
        <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
          Generate professional, privacy-safe, doctor-ready responses for patient reviews in compliance with healthcare regulations.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.1fr', gap: '28px' }}>
        
        {/* Input Review Form */}
        <div className="card-glass">
          <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '20px' }}>Patient Review Input</h3>
          
          <form onSubmit={handleGenerateReply}>
            <div className="form-group">
              <label>Patient Name</label>
              <input 
                type="text" 
                className="input-control"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                placeholder="e.g. Ananya Roy"
              />
            </div>

            <div className="form-group">
              <label>Star Rating</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={star}
                    type="button"
                    style={{
                      background: rating >= star ? (rating === 1 ? 'var(--gc-danger)' : 'var(--gc-amber)') : 'var(--bg-input)',
                      color: rating >= star ? '#fff' : 'var(--text-muted)',
                      border: '1px solid var(--border-color)',
                      padding: '8px 14px',
                      borderRadius: 'var(--radius-sm)',
                      cursor: 'pointer',
                      fontSize: '16px',
                      fontWeight: 'bold'
                    }}
                    onClick={() => setRating(star)}
                  >
                    ★ {star}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label>Patient Review Text</label>
              <textarea 
                rows="4"
                className="input-control"
                placeholder="Paste patient review here..."
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                required
              />
            </div>

            {/* Sensitive review detector banner */}
            {isSensitive && (
              <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '12px 16px', borderRadius: '10px', fontSize: '13px', color: 'var(--text-main)', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--gc-danger)', fontWeight: '800', marginBottom: '4px' }}>
                  <ShieldAlert size={18} />
                  <span>SENSITIVE REVIEW DETECTED — ESCALATION REQUIRED</span>
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  This review contains 1-star rating, medical treatment language, or billing dispute signals. <strong>Auto-reply is strictly disabled</strong> in V1. Requires explicit doctor review.
                </p>
              </div>
            )}

            <div className="form-group">
              <label>Doctor Tone & Style</label>
              <select className="input-control" value={sentiment} onChange={(e) => setSentiment(e.target.value)}>
                <option value="Empathetic & Professional Doctor">Empathetic & Professional Doctor</option>
                <option value="Warm & Reassuring">Warm & Reassuring</option>
                <option value="Formal Clinical Resolution">Formal Clinical Resolution</option>
              </select>
            </div>

            <button type="submit" className="btn-green btn-lg" style={{ width: '100%', marginTop: '10px' }} disabled={isGenerating}>
              <Stethoscope size={18} />
              <span>{isGenerating ? "AI Crafting Doctor Reply..." : "Generate AI Doctor Reply"}</span>
            </button>
          </form>
        </div>

        {/* AI Output Responses */}
        <div className="card-glass">
          <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '20px' }}>Suggested Doctor Responses</h3>

          {!replies ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)', border: '2px dashed var(--border-color)', borderRadius: 'var(--radius-lg)' }}>
              <MessageSquare size={36} color="var(--gc-blue)" style={{ margin: '0 auto 12px' }} />
              <p style={{ fontSize: '15px', fontWeight: '700' }}>No patient review input yet.</p>
              <p style={{ fontSize: '13px' }}>Paste a patient review on the left to get instant AI doctor responses.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {replies.map((rep, idx) => (
                <div key={idx} style={{ background: rep.isSensitiveFlag ? 'rgba(239, 68, 68, 0.05)' : 'var(--bg-primary)', padding: '18px', borderRadius: 'var(--radius-lg)', border: rep.isSensitiveFlag ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <span className={`badge ${rep.isSensitiveFlag ? 'badge-amber' : 'badge-emerald'}`}>{rep.type}</span>
                    <button className="btn btn-outline btn-sm" onClick={() => handleCopy(rep.text, idx)}>
                      {copiedIdx === idx ? <Check size={14} color="var(--gc-emerald)" /> : <Copy size={14} />}
                      <span>{copiedIdx === idx ? "Copied!" : "Copy Response"}</span>
                    </button>
                  </div>
                  
                  {rep.isSensitiveFlag && (
                    <div style={{ fontSize: '12px', color: 'var(--gc-amber)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', fontWeight: '700' }}>
                      <Lock size={14} />
                      <span>Privacy Guard: Never confirm a patient relationship or disclose treatment details publicly.</span>
                    </div>
                  )}

                  <p style={{ fontSize: '14px', lineHeight: '1.6', color: 'var(--text-main)' }}>"{rep.text}"</p>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
