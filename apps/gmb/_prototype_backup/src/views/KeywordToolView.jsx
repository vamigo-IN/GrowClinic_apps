import React, { useState } from 'react';
import { KEYWORD_DATABASE } from '../data/keywordDatabase';
import { Search, Sparkles, Plus, Check, TrendingUp, Tag, Copy, Stethoscope } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function KeywordToolView({ activeProfile }) {
  const [niche, setNiche] = useState('Dentist');
  const [city, setCity] = useState(activeProfile?.city || 'Delhi');
  const [addedKeywords, setAddedKeywords] = useState([]);
  const [copiedAll, setCopiedAll] = useState(false);

  const rawList = KEYWORD_DATABASE[niche] || KEYWORD_DATABASE['Dentist'];
  const formattedKeywords = rawList.map(item => ({
    ...item,
    keyword: item.keyword.replace('{city}', city)
  }));

  const handleAddKeyword = (kw) => {
    if (!addedKeywords.includes(kw)) {
      setAddedKeywords([...addedKeywords, kw]);
      confetti({ particleCount: 30, spread: 40 });
    }
  };

  const handleCopyAll = () => {
    const text = formattedKeywords.map(k => k.keyword).join(', ');
    navigator.clipboard.writeText(text);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: '900' }}>Medical Local SEO Keyword Finder</h2>
        <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
          Discover high-converting patient search terms for your clinical specialty & city.
        </p>
      </div>

      {/* Search Header */}
      <div className="card-glass" style={{ marginBottom: '28px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '16px', alignItems: 'end' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label>Clinical Specialty</label>
            <select className="input-control" value={niche} onChange={(e) => setNiche(e.target.value)}>
              <option value="Dentist">Dental Clinic / Dentist</option>
              <option value="Dermatologist">Dermatologist & Skin Clinic</option>
              <option value="Hospital">Multispecialty Hospital & ER</option>
              <option value="IVF & Fertility">IVF & Fertility Center</option>
              <option value="Trichology">Trichology & Hair Clinic</option>
            </select>
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label>Target City / Area</label>
            <input 
              type="text" 
              className="input-control" 
              value={city} 
              onChange={(e) => setCity(e.target.value)} 
              placeholder="e.g. South Delhi / Bandra Mumbai"
            />
          </div>

          <button className="btn btn-outline" onClick={handleCopyAll}>
            {copiedAll ? <Check size={16} color="var(--gc-emerald)" /> : <Copy size={16} />}
            <span>{copiedAll ? "Copied All!" : "Copy Keywords"}</span>
          </button>
        </div>
      </div>

      {/* Keywords Table */}
      <div className="card-glass">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '800' }}>High Patient-Intent Keywords ({formattedKeywords.length})</h3>
          <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Selected: <strong>{addedKeywords.length}</strong> terms added to clinic strategy
          </span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '12px 16px' }}>Patient Search Query</th>
                <th style={{ padding: '12px 16px' }}>Intent</th>
                <th style={{ padding: '12px 16px' }}>Monthly Volume</th>
                <th style={{ padding: '12px 16px' }}>Competition</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {formattedKeywords.map((item, idx) => {
                const isAdded = addedKeywords.includes(item.keyword);
                return (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '14px 16px', fontWeight: '700' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Tag size={14} color="var(--gc-blue)" />
                        <span>{item.keyword}</span>
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span className="badge" style={{ fontSize: '11px' }}>{item.intent}</span>
                    </td>
                    <td style={{ padding: '14px 16px', fontWeight: '800', color: 'var(--gc-emerald)' }}>
                      {item.volume}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span className={`badge ${item.competition === 'High' ? '' : item.competition === 'Medium' ? 'badge-amber' : 'badge-emerald'}`} style={{ fontSize: '11px' }}>
                        {item.competition}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                      <button 
                        className={`btn ${isAdded ? 'btn-outline' : 'btn-green'} btn-sm`}
                        onClick={() => handleAddKeyword(item.keyword)}
                      >
                        {isAdded ? <Check size={14} color="var(--gc-emerald)" /> : <Plus size={14} />}
                        <span>{isAdded ? "Added" : "Add to Profile"}</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
