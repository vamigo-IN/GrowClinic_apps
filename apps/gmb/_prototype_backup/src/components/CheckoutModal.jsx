import React, { useState } from 'react';
import { X, Check, Lock, ShieldCheck, Sparkles, CreditCard, Stethoscope } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function CheckoutModal({ isOpen, onClose, plan }) {
  const [paymentMethod, setPaymentMethod] = useState('upi');
  const [upiId, setUpiId] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen || !plan) return null;

  const handlePayNow = (e) => {
    e.preventDefault();
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setIsSuccess(true);
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.5 } });
    }, 1500);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '520px' }}>
        <button 
          onClick={onClose}
          style={{ position: 'absolute', top: '20px', right: '20px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
        >
          <X size={24} />
        </button>

        {!isSuccess ? (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--gc-emerald)', marginBottom: '4px' }}>
              <Lock size={16} />
              <span style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase' }}>GrowClinic Secure Checkout • gmb.growclinic.io</span>
            </div>
            <h2 style={{ fontSize: '22px', fontWeight: '900', marginBottom: '4px' }}>Activate {plan.name}</h2>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '20px' }}>
              <span className="price-tag" style={{ fontSize: '32px', margin: 0 }}>₹{plan.priceMonthlyINR}</span>
              <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>/ month per practice</span>
            </div>

            <div style={{ background: 'var(--bg-card)', padding: '16px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', marginBottom: '20px' }}>
              <div style={{ fontSize: '13px', fontWeight: '700', marginBottom: '8px', color: 'var(--text-main)' }}>Plan Includes:</div>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', color: 'var(--text-muted)' }}>
                {plan.features.slice(0, 4).map((feat, idx) => (
                  <li key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Check size={14} color="var(--gc-emerald)" />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Payment Method Selector */}
            <form onSubmit={handlePayNow}>
              <div className="form-group">
                <label>Select Payment Method</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                  <button 
                    type="button"
                    className={`btn ${paymentMethod === 'upi' ? 'btn-green' : 'btn-outline'}`}
                    style={{ padding: '8px', fontSize: '12px' }}
                    onClick={() => setPaymentMethod('upi')}
                  >
                    ⚡ UPI / GPay
                  </button>
                  <button 
                    type="button"
                    className={`btn ${paymentMethod === 'card' ? 'btn-green' : 'btn-outline'}`}
                    style={{ padding: '8px', fontSize: '12px' }}
                    onClick={() => setPaymentMethod('card')}
                  >
                    💳 Credit / Debit
                  </button>
                  <button 
                    type="button"
                    className={`btn ${paymentMethod === 'net' ? 'btn-green' : 'btn-outline'}`}
                    style={{ padding: '8px', fontSize: '12px' }}
                    onClick={() => setPaymentMethod('net')}
                  >
                    🏛 Net Banking
                  </button>
                </div>
              </div>

              {paymentMethod === 'upi' && (
                <div className="form-group">
                  <label>Enter VPA / UPI ID</label>
                  <input 
                    type="text" 
                    required 
                    className="input-control" 
                    placeholder="doctor@upi / clinic@okaxis" 
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                  />
                </div>
              )}

              {(paymentMethod === 'card' || paymentMethod === 'net') && (
                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '14px 16px', fontSize: '13px', color: 'var(--text-muted)', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                  <Lock size={16} color="var(--gc-emerald)" style={{ marginTop: '2px', flexShrink: 0 }} />
                  <span>
                    {paymentMethod === 'card' ? 'Card' : 'Net banking'} payments are completed on Razorpay's secure checkout page. GrowClinic never sees or stores your card details.
                  </span>
                </div>
              )}

              <button type="submit" className="btn-green btn-lg" style={{ width: '100%', marginTop: '12px' }} disabled={isProcessing}>
                {isProcessing ? "Redirecting to Razorpay secure checkout..." : `Pay ₹${plan.priceMonthlyINR} & Scale Patient Acquisition`}
              </button>
              <p style={{ fontSize: '11px', color: 'var(--text-dim)', textAlign: 'center', marginTop: '10px' }}>
                Preview checkout — no payment is processed until Razorpay is connected.
              </p>
            </form>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div className="logo-icon" style={{ width: '60px', height: '60px', margin: '0 auto 16px', background: 'var(--gc-emerald)', borderRadius: '50%', color: '#fff', fontSize: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              ✓
            </div>
            <h2 style={{ fontSize: '24px', fontWeight: '900', marginBottom: '8px' }}>Subscription Preview Complete</h2>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '20px' }}>
              This is a preview of the <strong>{plan.name}</strong> checkout flow. No payment was taken — live billing activates once Razorpay is connected.
            </p>
            <button className="btn-green" onClick={onClose} style={{ width: '100%' }}>
              Start Patient Acquisition Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
