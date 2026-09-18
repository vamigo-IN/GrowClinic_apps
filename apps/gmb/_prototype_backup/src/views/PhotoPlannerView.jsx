import React, { useState } from 'react';
import { Camera, Sparkles, Check, Image as ImageIcon, Tag, Stethoscope } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function PhotoPlannerView({ activeProfile }) {
  const [photoCategory, setPhotoCategory] = useState('Clinic Reception & Ambiance');
  const [photoDescription, setPhotoDescription] = useState('Sterile dental consultation room with modern chair & laser equipment');
  const [isGenerating, setIsGenerating] = useState(false);
  const [altTags, setAltTags] = useState(null);

  if (!activeProfile) return null;

  const photoChecklist = [
    { title: "Clinic Entrance & Building Facade", status: "Uploaded", rec: "2 photos showing clear building sign & entrance", statusColor: "var(--gc-emerald)" },
    { title: "Reception Area & Patient Waiting Lounge", status: "Action Needed", rec: "Upload 3 bright photos of clean waiting area", statusColor: "var(--gc-amber)" },
    { title: "Doctors & Medical Specialists at Work", status: "Uploaded", rec: "2 photos showing friendly doctors consulting patients", statusColor: "var(--gc-emerald)" },
    { title: "Advanced Medical & Surgical Equipment", status: "Action Needed", rec: "Upload 4 photos of state-of-the-art diagnostic machines", statusColor: "var(--gc-amber)" },
    { title: "Patient Smiles & Certificates", status: "Recommended", rec: "Upload doctor degrees & patient appreciation frames", statusColor: "var(--gc-blue)" }
  ];

  const handleGenerateAltTags = (e) => {
    e.preventDefault();
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
      setAltTags({
        filename: `${activeProfile.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${photoCategory.toLowerCase().replace(/[^a-z0-9]/g, '-')}.jpg`,
        altText: `${activeProfile.name} ${photoCategory} in ${activeProfile.locality} ${activeProfile.city} - ${photoDescription}`,
        geoTags: `Latitude: 28.5355° N, Longitude: 77.2610° E, City: ${activeProfile.city}`,
        title: `${activeProfile.name} - Top Rated ${activeProfile.category} ${activeProfile.city}`
      });
      confetti({ particleCount: 40, spread: 40 });
    }, 600);
  };

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: '900' }}>Clinic Photo Strategy & Image Alt Tag Engine</h2>
        <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
          Keep your clinic photos fresh and optimize image EXIF metadata for Google Maps search indexing.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.1fr', gap: '28px' }}>
        
        {/* Photo Checklist */}
        <div className="card-glass">
          <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '20px' }}>Weekly Clinic Photo Refresh Checklist</h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {photoChecklist.map((item, idx) => (
              <div key={idx} style={{ background: 'var(--bg-primary)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontWeight: '700', fontSize: '14px' }}>{item.title}</span>
                  <span className="badge" style={{ color: item.statusColor, borderColor: item.statusColor, fontSize: '11px' }}>
                    {item.status}
                  </span>
                </div>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{item.rec}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Image Alt Tag Generator */}
        <div className="card-glass">
          <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '20px' }}>AI Medical Image Metadata & Alt Tag Tool</h3>

          <form onSubmit={handleGenerateAltTags}>
            <div className="form-group">
              <label>Photo Type</label>
              <select className="input-control" value={photoCategory} onChange={(e) => setPhotoCategory(e.target.value)}>
                <option value="Clinic Reception & Ambiance">Clinic Reception & Ambiance</option>
                <option value="Consultation Room">Doctor Consultation Room</option>
                <option value="Advanced Equipment">Advanced Diagnostic Equipment</option>
                <option value="Doctor & Patient Care">Doctor & Patient Care</option>
              </select>
            </div>

            <div className="form-group">
              <label>Photo Brief Description</label>
              <input 
                type="text" 
                className="input-control" 
                value={photoDescription} 
                onChange={(e) => setPhotoDescription(e.target.value)} 
                placeholder="e.g. Sterile dental consultation room"
              />
            </div>

            <button type="submit" className="btn-green btn-lg" style={{ width: '100%', marginTop: '10px' }} disabled={isGenerating}>
              <Stethoscope size={18} />
              <span>{isGenerating ? "AI Processing Medical Metadata..." : "Generate SEO Alt Tags"}</span>
            </button>
          </form>

          {altTags && (
            <div style={{ marginTop: '20px', background: 'var(--bg-primary)', padding: '18px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--gc-emerald)' }}>
              <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--gc-emerald)', marginBottom: '8px' }}>
                ✓ Optimized Image Metadata:
              </div>
              <div style={{ fontSize: '13px', marginBottom: '8px' }}>
                <strong>Filename:</strong> <code style={{ color: 'var(--gc-amber)' }}>{altTags.filename}</code>
              </div>
              <div style={{ fontSize: '13px', marginBottom: '8px' }}>
                <strong>Alt Text Tag:</strong> <span>"{altTags.altText}"</span>
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                <strong>Geo Medical Exif:</strong> <span>{altTags.geoTags}</span>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
