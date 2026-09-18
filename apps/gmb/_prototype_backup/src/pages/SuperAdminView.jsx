import React, { useMemo, useState } from 'react';
import {
  Activity, AlertTriangle, Building2, CheckCircle2, ChevronRight,
  CreditCard, ExternalLink, FileClock, Landmark, Search, ShieldCheck,
  Users, Home, LayoutDashboard, Lock
} from 'lucide-react';

const ORGANIZATIONS = [
  { name: 'Apex Dental Care', locations: 2, plan: 'GrowClinic PRO', status: 'Active', google: 'Connected', reviews: 18, owner: 'Dr. Anish Kapoor' },
  { name: 'SkinDay Dermatology', locations: 1, plan: 'Single Clinic AI', status: 'Active', google: 'Connected', reviews: 6, owner: 'Dr. Sneha Malhotra' },
  { name: 'Pulse Heart Institute', locations: 4, plan: 'Hospital & Network', status: 'Review required', google: 'Reconnect needed', reviews: 11, owner: 'Dr. Ramesh Sharma' },
  { name: 'MediCare Women’s Hospital', locations: 3, plan: 'Hospital & Network', status: 'Trial', google: 'Connected', reviews: 4, owner: 'Dr. Kavita Mehra' },
];

const ACTIVITY = [
  { time: '2 min ago', title: 'Sensitive review flagged', detail: 'Pulse Heart Institute · Manual review required', type: 'warning' },
  { time: '18 min ago', title: 'Google connection refreshed', detail: 'Apex Dental Care · 2 locations synced', type: 'good' },
  { time: '1 hr ago', title: 'New clinic admin verified', detail: 'MediCare Women’s Hospital · WhatsApp OTP', type: 'good' },
  { time: '3 hrs ago', title: 'Payment renewal due', detail: 'SkinDay Dermatology · Due in 3 days', type: 'neutral' },
];

const Status = ({ children, tone = 'good' }) => {
  const styles = {
    good: { background: 'rgba(16,185,129,.12)', color: 'var(--gc-emerald)', borderColor: 'rgba(16,185,129,.28)' },
    warning: { background: 'rgba(251,188,4,.12)', color: 'var(--gc-amber)', borderColor: 'rgba(251,188,4,.28)' },
    neutral: { background: 'rgba(59,130,246,.12)', color: 'var(--gc-blue)', borderColor: 'rgba(59,130,246,.28)' },
  };
  return <span style={{ ...styles[tone], border: '1px solid', borderRadius: 99, padding: '4px 9px', fontSize: 11, fontWeight: 800 }}>{children}</span>;
};

export default function SuperAdminView({ setCurrentView, showToast }) {
  const [query, setQuery] = useState('');
  const [activeNav, setActiveNav] = useState('Overview');
  const filteredOrganizations = useMemo(() => ORGANIZATIONS.filter((org) =>
    `${org.name} ${org.owner} ${org.plan}`.toLowerCase().includes(query.toLowerCase())
  ), [query]);
  const nav = ['Overview', 'Organizations', 'Users & roles', 'Google connections', 'Subscriptions', 'Compliance', 'Audit logs'];

  return (
    <div style={{ background: '#050507', color: 'rgba(255, 255, 255, 0.96)', fontFamily: 'Inter, sans-serif', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ padding: '14px 28px', borderBottom: '1px solid rgba(255,255,255,0.10)', background: 'rgba(255,255,255,0.04)', display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div className="logo-icon" style={{ background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', width: 36, height: 36, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ShieldCheck size={20} color="#fff" />
          </div>
          <div>
            <div style={{ fontWeight: 900, fontSize: 16, color: '#fff' }}>Gmb Platform Control Center</div>
            <div style={{ color: 'rgba(255,255,255,0.64)', fontSize: 12 }}>Internal Super Admin Workspace • gmb.growclinic.io</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button className="btn btn-outline btn-sm" onClick={() => setCurrentView('app')}>
            <LayoutDashboard size={14} />
            <span>Clinic Dashboard</span>
          </button>
          <button className="btn btn-outline btn-sm" onClick={() => setCurrentView('landing')}>
            <Home size={14} />
            <span>Landing Page</span>
          </button>
          <Status tone="warning">Demo Environment</Status>
        </div>
      </div>

      {/* Guardrail Notice Banner */}
      <div style={{ background: 'rgba(239, 68, 68, 0.08)', borderBottom: '1px solid rgba(239, 68, 68, 0.25)', padding: '10px 28px', fontSize: '13px', color: 'rgba(255,255,255,0.9)', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Lock size={15} color="#ef4444" />
        <span><strong>Super Admin Security Policy:</strong> Internal platform operators can manage billing and compliance, but <strong>cannot directly edit or publish</strong> Google Business Profile data for any clinic practice.</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '230px minmax(0, 1fr)', maxWidth: 1440, margin: '0 auto' }}>
        <aside style={{ borderRight: '1px solid rgba(255,255,255,0.10)', minHeight: 'calc(100vh - 120px)', padding: '22px 14px' }}>
          <div style={{ color: 'rgba(255,255,255,0.64)', fontSize: 11, fontWeight: 800, letterSpacing: '.08em', padding: '0 10px 10px' }}>PLATFORM</div>
          {nav.map((item) => (
            <button 
              key={item} 
              onClick={() => { setActiveNav(item); showToast?.(`${item} workspace selected`); }} 
              style={{ width: '100%', textAlign: 'left', border: 0, cursor: 'pointer', padding: '11px 10px', borderRadius: 9, color: activeNav === item ? '#fff' : 'rgba(255,255,255,0.64)', background: activeNav === item ? 'linear-gradient(135deg,#4f46e5,#7c3aed)' : 'transparent', fontWeight: 700, marginBottom: 4 }}
            >
              {item}
            </button>
          ))}
          <div style={{ margin: '22px 10px 0', padding: 13, border: '1px solid rgba(255,255,255,0.10)', borderRadius: 12, fontSize: 12, color: 'rgba(255,255,255,0.64)', lineHeight: 1.5 }}>
            <ShieldCheck size={15} color="#10b981" style={{ verticalAlign: 'middle', marginRight: 6 }} />
            Support access is logged, time-bound, and disabled by default.
          </div>
        </aside>

        <main style={{ padding: '28px', minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 25, flexWrap: 'wrap' }}>
            <div>
              <div className="badge" style={{ marginBottom: 9 }}><ShieldCheck size={13} /> Platform operations</div>
              <h1 style={{ fontSize: 28, color: '#fff' }}>Platform Control Dashboard</h1>
              <p style={{ color: 'rgba(255,255,255,0.64)', marginTop: 6 }}>Monitor access, platform health, subscriptions, and compliance exceptions.</p>
            </div>
            <button className="btn-outline btn-sm" onClick={() => showToast?.('Demo audit report prepared')}><FileClock size={15} /> Export platform audit</button>
          </div>

          <section style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(150px,1fr))', gap: 14, marginBottom: 24 }}>
            {[
              ['24', 'Active organizations', Building2, 'good'], ['81', 'Verified users', Users, 'neutral'], ['3', 'Needs attention', AlertTriangle, 'warning'], ['₹1.18L', 'MRR (demo)', Landmark, 'good'],
            ].map(([value, label, Icon, tone]) => (
              <div key={label} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 15, padding: 17 }}>
                <Icon size={19} color={tone === 'warning' ? '#fbbc04' : tone === 'neutral' ? '#3b82f6' : '#10b981'} />
                <div style={{ fontSize: 25, fontWeight: 900, marginTop: 13, color: '#fff' }}>{value}</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.64)', marginTop: 2 }}>{label}</div>
              </div>
            ))}
          </section>

          <section style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.45fr) minmax(280px,.85fr)', gap: 18 }}>
            <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 15, padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '18px 20px', borderBottom: '1px solid rgba(255,255,255,0.10)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <div>
                  <h2 style={{ fontSize: 17, color: '#fff' }}>Organizations</h2>
                  <p style={{ color: 'rgba(255,255,255,0.64)', fontSize: 12, marginTop: 3 }}>Only Super Admin can suspend, change ownership, or view support access.</p>
                </div>
                <div style={{ position: 'relative' }}>
                  <Search size={14} style={{ position: 'absolute', left: 10, top: 10, color: 'rgba(255,255,255,0.64)' }} />
                  <input aria-label="Search organizations" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search clinics" className="input-control" style={{ padding: '7px 10px 7px 30px', width: 180, fontSize: 12, background: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.15)', color: '#fff' }} />
                </div>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 620, fontSize: 13 }}>
                  <thead>
                    <tr style={{ color: 'rgba(255,255,255,0.64)', textAlign: 'left', fontSize: 11, letterSpacing: '.04em' }}>
                      <th style={{ padding: '12px 20px', fontWeight: 800 }}>ORGANIZATION</th>
                      <th style={{ padding: '12px 20px', fontWeight: 800 }}>PLAN</th>
                      <th style={{ padding: '12px 20px', fontWeight: 800 }}>GOOGLE</th>
                      <th style={{ padding: '12px 20px', fontWeight: 800 }}>OPEN REVIEWS</th>
                      <th aria-label="Actions" />
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrganizations.map((org) => (
                      <tr key={org.name} style={{ borderTop: '1px solid rgba(255,255,255,0.10)' }}>
                        <td style={{ padding: '15px 20px' }}>
                          <div style={{ fontWeight: 800, color: '#fff' }}>{org.name}</div>
                          <div style={{ color: 'rgba(255,255,255,0.64)', fontSize: 11 }}>{org.owner} · {org.locations} location{org.locations > 1 ? 's' : ''}</div>
                        </td>
                        <td style={{ padding: '15px 20px' }}><Status tone={org.status === 'Review required' ? 'warning' : 'neutral'}>{org.plan}</Status></td>
                        <td style={{ padding: '15px 20px', color: org.google === 'Connected' ? '#10b981' : '#fbbc04', fontWeight: 700 }}>{org.google}</td>
                        <td style={{ padding: '15px 20px', fontWeight: 800, color: '#fff' }}>{org.reviews}</td>
                        <td style={{ padding: '15px 20px' }}>
                          <button onClick={() => showToast?.(`Viewing ${org.name} demo workspace`)} style={{ border: 0, cursor: 'pointer', background: 'transparent', color: '#3b82f6' }}>
                            <ChevronRight size={18} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div style={{ display: 'grid', gap: 18, alignContent: 'start' }}>
              <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 15, padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <Activity size={17} color="#3b82f6" />
                  <h2 style={{ fontSize: 17, color: '#fff' }}>Live activity</h2>
                </div>
                {ACTIVITY.map((entry) => (
                  <div key={entry.title} style={{ display: 'flex', gap: 10, padding: '11px 0', borderTop: '1px solid rgba(255,255,255,0.10)' }}>
                    <div style={{ marginTop: 3 }}>
                      {entry.type === 'warning' ? <AlertTriangle size={15} color="#fbbc04" /> : entry.type === 'good' ? <CheckCircle2 size={15} color="#10b981" /> : <CreditCard size={15} color="#3b82f6" />}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: '#fff' }}>{entry.title}</div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.64)' }}>{entry.detail}</div>
                      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{entry.time}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(251,188,4,0.32)', borderRadius: 15, padding: 20 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <AlertTriangle size={18} color="#fbbc04" />
                  <div style={{ fontWeight: 900, fontSize: 14, color: '#fff' }}>Compliance queue</div>
                </div>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.64)', margin: '10px 0 14px' }}>3 sensitive-review flags require clinic-admin approval. No automated reply will be sent.</p>
                <button className="btn-outline btn-sm" onClick={() => showToast?.('Compliance queue opened (demo)')}>
                  <ExternalLink size={14} /> Review queue
                </button>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
