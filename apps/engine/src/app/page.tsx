export default function Home() {
  return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div style={{ maxWidth: 520, textAlign: 'center' }}>
        <div style={{ color: 'var(--gold)', fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', fontSize: '0.8rem' }}>
          GrowClinic
        </div>
        <h1 style={{ fontSize: '2rem', margin: '0.5rem 0 1rem' }}>Engine</h1>
        <p style={{ color: 'var(--muted)' }}>
          Multi-tenant CRM for clinics. Lead capture, patients, appointments — connectable to any website.
        </p>
        <p style={{ marginTop: '1.5rem' }}>
          <a href="/engine/login">Clinic sign in →</a>
        </p>
      </div>
    </main>
  );
}
