import React, { useState } from 'react';
import { X, Plus, Stethoscope, Building2, Check } from 'lucide-react';
import confetti from 'canvas-confetti';
import { createClinicProfile } from '../data/profileFactory';

export default function AddClinicModal({ isOpen, onClose, onAddProfile }) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Dental Clinic');
  const [city, setCity] = useState('');
  const [locality, setLocality] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [website, setWebsite] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name || !city) return;

    const newProfile = createClinicProfile({
      name, category, city, locality, address, phone, website,
    });

    onAddProfile(newProfile);
    confetti({ particleCount: 80, spread: 60 });
    onClose();
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

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--gc-emerald)', marginBottom: '8px' }}>
          <Stethoscope size={20} />
          <span style={{ fontSize: '12px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px' }}>
            Add Clinic Profile
          </span>
        </div>
        <h2 style={{ fontSize: '24px', fontWeight: '900', marginBottom: '8px' }}>
          Add Your Practice to GrowClinic
        </h2>
        <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '20px' }}>
          Enter your real clinic or doctor details to manage GMB patient acquisition live.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Clinic / Doctor Practice Name *</label>
            <input 
              type="text" 
              required 
              className="input-control" 
              placeholder="e.g. LifeCare Dental & Cosmetic Center" 
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label>Specialty Category *</label>
              <select className="input-control" value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="Dental Clinic">Dental Clinic</option>
                <option value="Dermatologist & Skin">Dermatologist & Skin</option>
                <option value="Hospital & Multispecialty">Hospital & Emergency</option>
                <option value="IVF & Fertility Center">IVF & Fertility</option>
                <option value="Trichology & Hair Center">Trichology & Hair</option>
                <option value="Cosmetic Surgery Clinic">Cosmetic Surgery</option>
                <option value="General Physician & Clinic">General Physician</option>
              </select>
            </div>

            <div className="form-group">
              <label>Target City *</label>
              <input 
                type="text" 
                required 
                className="input-control" 
                placeholder="e.g. Bangalore / Delhi" 
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label>Locality / Area</label>
              <input 
                type="text" 
                className="input-control" 
                placeholder="e.g. Indiranagar" 
                value={locality}
                onChange={(e) => setLocality(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Phone Number</label>
              <input 
                type="text" 
                className="input-control" 
                placeholder="+91 98765 43210" 
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Website URL</label>
            <input 
              type="url" 
              className="input-control" 
              placeholder="https://yourclinic.com" 
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
            />
          </div>

          <button type="submit" className="btn-green btn-lg" style={{ width: '100%', marginTop: '12px' }}>
            <Plus size={18} />
            <span>Add Practice to GMB Suite</span>
          </button>
        </form>
      </div>
    </div>
  );
}
