// ─────────────────────────────────────────────────────────────
// analytics.js — live GA4 + Meta data for the admin Marketing tab.
//
//  • GA4: Google Analytics Data API (runReport, eventName × eventCount).
//    Auth is a service-account JWT signed with built-in crypto — no SDK/npm dep.
//  • Meta: Graph API ad-account insights (`actions`). NOTE: Meta does NOT expose
//    total Events Manager pixel counts via a public API — only ad-attributed
//    actions — so the Meta column reflects ads-driven events, not totals.
//
//  Credentials come from settings (admin → Tracking):
//    GA4_PROPERTY_ID, GA4_SA_JSON, META_GRAPH_TOKEN, META_AD_ACCOUNT_ID
//
//  Everything degrades gracefully: missing creds → not configured; API error →
//  surfaced as a string; results cached 10 min per period; each call timed out.
// ─────────────────────────────────────────────────────────────
const crypto = require('crypto');
const db = require('./db');

const CACHE_TTL_MS = 10 * 60 * 1000;
const CALL_TIMEOUT_MS = 12000;
const cache = new Map();                 // period -> { exp, data }
let googleToken = { token: null, exp: 0 };

function b64url(input) {
    return Buffer.from(input).toString('base64')
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function fetchJson(url, opts = {}) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), CALL_TIMEOUT_MS);
    try {
        const res = await fetch(url, { ...opts, signal: ctrl.signal });
        return await res.json();
    } finally { clearTimeout(t); }
}

// periodBounds gives { from, to } as 'YYYY-MM-DD HH:MM:SS' (to is exclusive, or
// null for open). Convert to inclusive YYYY-MM-DD dates for GA4 + Meta.
function rangeDates(from, to) {
    const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const since = from ? from.slice(0, 10) : '2020-01-01';
    let until;
    if (to) { const d = new Date(to.replace(' ', 'T')); d.setSeconds(d.getSeconds() - 1); until = fmt(d); }
    else { until = fmt(new Date()); }
    return { since, until };
}

// ── GOOGLE: service-account JWT → OAuth access token (cached ~1h) ──
async function getGoogleToken(saJson) {
    if (googleToken.token && Date.now() < googleToken.exp - 60000) return googleToken.token;
    const sa = typeof saJson === 'string' ? JSON.parse(saJson) : saJson;
    if (!sa.client_email || !sa.private_key) throw new Error('service account JSON missing client_email/private_key');

    const now = Math.floor(Date.now() / 1000);
    const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
    const claim = b64url(JSON.stringify({
        iss: sa.client_email,
        scope: 'https://www.googleapis.com/auth/analytics.readonly',
        aud: 'https://oauth2.googleapis.com/token',
        iat: now, exp: now + 3600
    }));
    const signer = crypto.createSign('RSA-SHA256');
    signer.update(`${header}.${claim}`);
    const sig = b64url(signer.sign(sa.private_key));
    const jwt = `${header}.${claim}.${sig}`;

    const j = await fetchJson('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            assertion: jwt
        }).toString()
    });
    if (!j.access_token) throw new Error('Google auth: ' + (j.error_description || j.error || 'no token'));
    googleToken = { token: j.access_token, exp: Date.now() + (j.expires_in || 3600) * 1000 };
    return googleToken.token;
}

async function ga4Report({ propertyId, saJson, since, until }) {
    const token = await getGoogleToken(saJson);
    const j = await fetchJson(`https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`, {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            dateRanges: [{ startDate: since, endDate: until }],
            dimensions: [{ name: 'eventName' }],
            metrics: [{ name: 'eventCount' }],
            limit: 200
        })
    });
    if (j.error) throw new Error('GA4: ' + (j.error.message || 'error'));
    const out = {};
    for (const row of (j.rows || [])) {
        out[row.dimensionValues[0].value] = Number(row.metricValues[0].value) || 0;
    }
    return out;
}

async function metaActions({ token, adAccountId, since, until }) {
    const acct = String(adAccountId).startsWith('act_') ? adAccountId : 'act_' + adAccountId;
    const tr = encodeURIComponent(JSON.stringify({ since, until }));
    const url = `https://graph.facebook.com/v19.0/${acct}/insights?level=account&fields=actions&time_range=${tr}&access_token=${encodeURIComponent(token)}`;
    const j = await fetchJson(url);
    if (j.error) throw new Error('Meta: ' + (j.error.message || 'error'));
    const out = {};
    for (const row of (j.data || [])) {
        for (const a of (row.actions || [])) {
            out[a.action_type] = (out[a.action_type] || 0) + (Number(a.value) || 0);
        }
    }
    return out;
}

// Orchestrator: returns { ga, meta, gaConfigured, metaConfigured, gaError, metaError }
async function getExternals(period, bounds) {
    const key = 'mkt:' + period;
    const hit = cache.get(key);
    if (hit && Date.now() < hit.exp) return hit.data;

    const { since, until } = rangeDates(bounds.from, bounds.to);
    const out = { ga: null, meta: null, gaConfigured: false, metaConfigured: false, gaError: null, metaError: null };

    const gaProp = (db.getSetting('GA4_PROPERTY_ID') || '').replace(/\D/g, '');
    const gaSa = db.getSetting('GA4_SA_JSON') || '';
    if (gaProp && gaSa) {
        out.gaConfigured = true;
        try { out.ga = await ga4Report({ propertyId: gaProp, saJson: gaSa, since, until }); }
        catch (e) { out.gaError = e.message; }
    }

    const metaTok = db.getSetting('META_GRAPH_TOKEN') || '';
    const metaAcct = db.getSetting('META_AD_ACCOUNT_ID') || '';
    if (metaTok && metaAcct) {
        out.metaConfigured = true;
        try { out.meta = await metaActions({ token: metaTok, adAccountId: metaAcct, since, until }); }
        catch (e) { out.metaError = e.message; }
    }

    cache.set(key, { exp: Date.now() + CACHE_TTL_MS, data: out });
    return out;
}

module.exports = { getExternals, _rangeDates: rangeDates };
