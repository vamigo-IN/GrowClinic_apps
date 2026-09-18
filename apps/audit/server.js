require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const dns = require('dns').promises;
const net = require('net');
const OpenAI = require('openai');
const db = require('./db');
const messaging = require('./messaging');
const analytics = require('./analytics');
const tokenStore = require('./tokenStore');

// ─────────────────────────────────────────────────────────────
// SSRF GUARD — reject internal/private IPs before any outbound fetch
// ─────────────────────────────────────────────────────────────
function isPrivateIp(ip) {
    if (!ip) return true;
    const family = net.isIP(ip);
    if (family === 4) {
        const [a, b] = ip.split('.').map(Number);
        if (a === 10) return true;                              // 10.0.0.0/8
        if (a === 172 && b >= 16 && b <= 31) return true;       // 172.16.0.0/12
        if (a === 192 && b === 168) return true;                // 192.168.0.0/16
        if (a === 127) return true;                             // 127.0.0.0/8 (loopback)
        if (a === 169 && b === 254) return true;                // 169.254.0.0/16 (link-local + AWS metadata)
        if (a === 100 && b >= 64 && b <= 127) return true;      // 100.64.0.0/10 (CGN)
        if (a === 0) return true;
        if (a === 255) return true;
    } else if (family === 6) {
        const lower = ip.toLowerCase();
        if (lower === '::1') return true;                       // loopback
        if (lower === '::') return true;
        if (lower.startsWith('fe80:')) return true;             // link-local
        if (lower.startsWith('fc') || lower.startsWith('fd')) return true; // unique local
        if (lower.startsWith('::ffff:')) {                      // mapped IPv4
            return isPrivateIp(lower.replace('::ffff:', ''));
        }
    }
    return false;
}

// ─────────────────────────────────────────────────────────────
// RATE LIMITER — sliding window per IP per route bucket
// ─────────────────────────────────────────────────────────────
const rateLimitState = new Map();   // key=ipHash:bucket → array of timestamps
const RL_PRESETS = {
    chat:    { max: 30, windowMs: 60_000 },   // 30 chat msgs / min
    lookup:  { max: 20, windowMs: 60_000 },   // 20 GMB lookups / min
    preview: { max: 15, windowMs: 60_000 },   // 15 website previews / min
    popup:   { max: 6,  windowMs: 60_000 },   // 6 popup submits / min per IP
    login:   { max: 10, windowMs: 60_000 },   // 10 admin login attempts / min (in addition to lockout)
    otp:     { max: 8,  windowMs: 60_000 },   // 8 OTP sends/verifies / min per IP
    pincode: { max: 30, windowMs: 60_000 },   // 30 pincode lookups / min
    geo:     { max: 20, windowMs: 60_000 },   // 20 IP-country lookups / min (graceful on limit)
    sendrep: { max: 6,  windowMs: 60_000 },   // 6 "email me the report" / min per IP
    visit:   { max: 30, windowMs: 60_000 }    // 30 page-visit pings / min (own bucket — don't eat chat quota)
};

function rateLimit(bucket) {
    return (req, res, next) => {
        const preset = RL_PRESETS[bucket];
        if (!preset) return next();
        const ipHash = crypto.createHash('sha256').update(req.ip || 'unknown').digest('hex').slice(0, 16);
        const key = `${ipHash}:${bucket}`;
        const now = Date.now();
        const cutoff = now - preset.windowMs;
        const arr = (rateLimitState.get(key) || []).filter(t => t > cutoff);
        if (arr.length >= preset.max) {
            const retryAfter = Math.ceil((arr[0] + preset.windowMs - now) / 1000);
            res.setHeader('Retry-After', retryAfter);
            return res.status(429).json({
                error: 'Rate limit exceeded',
                retryAfter,
                message: `Too many requests. Try again in ${retryAfter}s.`
            });
        }
        arr.push(now);
        rateLimitState.set(key, arr);
        next();
    };
}

// Cleanup old buckets every 5 minutes to keep memory bounded
setInterval(() => {
    const cutoff = Date.now() - 60_000;
    for (const [key, arr] of rateLimitState.entries()) {
        const fresh = arr.filter(t => t > cutoff);
        if (fresh.length === 0) rateLimitState.delete(key);
        else rateLimitState.set(key, fresh);
    }
}, 5 * 60_000).unref?.();

// Read a fetch response body with a hard size cap.
// Prevents memory exhaustion when a malicious site streams a huge HTML body.
async function readBodyCapped(response, maxBytes = 2 * 1024 * 1024) {
    const reader = response.body?.getReader();
    if (!reader) return await response.text();   // fallback for envs without streams
    let received = 0;
    const chunks = [];
    while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        if (value) {
            received += value.byteLength;
            if (received > maxBytes) {
                try { await reader.cancel(); } catch (_e) {}
                throw new Error(`Response body exceeded ${maxBytes} bytes`);
            }
            chunks.push(value);
        }
    }
    return new TextDecoder('utf-8', { fatal: false }).decode(
        chunks.length === 1 ? chunks[0] : Buffer.concat(chunks.map(c => Buffer.from(c)))
    );
}

// Remove em-dashes (—) and en-dashes (–) everywhere — they read as an "AI tell".
// Numeric ranges become "to"; every other long dash becomes a comma. Regular
// hyphens (-) and CSS property names are untouched. Safe to run on full HTML.
function cleanDashes(s) {
    if (typeof s !== 'string') return s;
    return s
        .replace(/(\d)\s*[—–]\s*(\d)/g, '$1 to $2')
        .replace(/\s*[—–]\s*/g, ', ')
        .replace(/,\s*,/g, ',');
}

// HTML escape helper — used everywhere we interpolate untrusted text into HTML.
function escapeHtml(s) {
    if (s === null || s === undefined) return '';
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

async function assertSafeUrl(rawUrl) {
    let parsed;
    try { parsed = new URL(rawUrl); }
    catch { throw new Error('Invalid URL'); }

    if (!['http:', 'https:'].includes(parsed.protocol)) {
        throw new Error('Only http/https URLs are allowed');
    }

    const host = parsed.hostname;
    if (!host) throw new Error('No hostname');

    // Block obvious metadata hostnames
    const badHosts = ['metadata.google.internal', 'metadata.aws', 'localhost'];
    if (badHosts.includes(host.toLowerCase())) {
        throw new Error('Internal hostname not allowed');
    }

    // If the host is already an IP literal, check it directly
    if (net.isIP(host)) {
        if (isPrivateIp(host)) throw new Error('Internal IP not allowed');
        return parsed;
    }

    // Resolve DNS and reject if any record is private
    let addrs;
    try {
        addrs = await dns.lookup(host, { all: true });
    } catch (e) {
        throw new Error('DNS resolution failed: ' + e.message);
    }
    for (const a of addrs) {
        if (isPrivateIp(a.address)) {
            throw new Error(`Hostname resolves to internal address (${a.address})`);
        }
    }
    return parsed;
}

const app = express();
// Trust proxy so req.ip is correct behind reverse proxy (set explicit list in production)
app.set('trust proxy', 1);
// Don't tell attackers we're running Express
app.disable('x-powered-by');

// ─────────────────────────────────────────────────────────────
// SUBDIRECTORY SUPPORT (SEO)
// APP_BASE_PATH lets the app also serve under a path prefix when the main
// growclinic.io site reverse-proxies it (e.g. growclinic.io/digital-marketing-
// for-clinic-audit-with-ai → this app). The prefix is stripped here so every
// existing route works unchanged; the index route injects window.GC_BASE so
// the frontend prefixes its own requests. PUBLIC_URL sets the SEO canonical.
// Leave APP_BASE_PATH empty to serve only at the root (default behaviour).
// ─────────────────────────────────────────────────────────────
const BASE_PATH = (process.env.APP_BASE_PATH || '').replace(/\/+$/, '');
const PUBLIC_URL = process.env.PUBLIC_URL || '';
if (BASE_PATH) {
    app.use((req, _res, next) => {
        if (req.url === BASE_PATH || req.url === BASE_PATH + '/') req.url = '/';
        else if (req.url.startsWith(BASE_PATH + '/')) req.url = req.url.slice(BASE_PATH.length);
        next();
    });
}

// CORS — restrict to known origins. In dev, defaults to localhost.
// Set PUBLIC_ORIGIN env var (comma-separated) to your production domain(s).
const ALLOWED_ORIGINS = (process.env.PUBLIC_ORIGIN || 'http://localhost:3000,http://127.0.0.1:3000')
    .split(',').map(s => s.trim()).filter(Boolean);
app.use(cors({
    credentials: true,
    origin(origin, cb) {
        // Same-origin requests have no Origin header — allow them
        if (!origin) return cb(null, true);
        if (ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
        return cb(new Error('CORS: origin not allowed: ' + origin));
    }
}));

app.use(express.json({ limit: '256kb' }));

// Cookie parser (lightweight, no extra dependency, safe against malformed values)
app.use((req, _res, next) => {
    req.cookies = {};
    const header = req.headers.cookie || '';
    if (!header) return next();
    try {
        for (const c of header.split(';')) {
            const trimmed = c.trim();
            if (!trimmed) continue;
            const eq = trimmed.indexOf('=');
            const k = eq === -1 ? trimmed : trimmed.slice(0, eq);
            const raw = eq === -1 ? '' : trimmed.slice(eq + 1);
            try { req.cookies[k] = decodeURIComponent(raw); }
            catch { req.cookies[k] = raw; } // fall back to raw value if decode fails
        }
    } catch (_e) {
        // Never let a bad cookie kill the whole request
        req.cookies = {};
    }
    next();
});

// Security headers (Helmet-style, manually crafted)
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    // frame-ancestors supersedes X-Frame-Options in modern browsers; keep both for
    // old IE and any proxy that only reads the legacy header.
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'geolocation=(), camera=(), microphone=()');

    // HSTS — only meaningful over HTTPS; skip in local dev so it doesn't lock
    // the browser into HTTPS on localhost.
    if (process.env.NODE_ENV === 'production') {
        // max-age=1 year; includeSubDomains so audit.growclinic.io is covered.
        // Preload is intentionally omitted until you're sure all subdomains are HTTPS.
        res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }

    // Content-Security-Policy
    // ── Script sources ──────────────────────────────────────────────────────────
    // 'unsafe-inline' is required because: (a) analytics tags are server-injected
    // inline, (b) main.js / admin.html are served as inline <script> blocks.
    // Tracking pixels (GTM, Meta, Clarity) also inject inline. We accept this
    // tradeoff; the meaningful XSS risk on an authenticated-admin-only tool is
    // low, and adding nonces would require a significant refactor.
    // ── Connect sources ──────────────────────────────────────────────────────────
    // Gemini + OpenAI calls go server-side; only browser-side XHR/fetch targets
    // (GA4, Meta graph, clarity) need listing here.
    const csp = [
        "default-src 'self'",
        // Scripts: self + inline (see note) + known third-party analytics/pixel CDNs
        "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com https://connect.facebook.net https://www.clarity.ms https://www.gstatic.com https://fonts.googleapis.com",
        // Styles: self + inline (Tailwind/admin inline styles) + Google Fonts
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        // Fonts
        "font-src 'self' https://fonts.gstatic.com data:",
        // Images: self + data URIs (inline avatars, base64) + any https (GMB, clinic logos scraped in preview)
        "img-src 'self' data: blob: https:",
        // XHR/fetch: self + analytics endpoints the browser JS calls directly
        "connect-src 'self' https://www.google-analytics.com https://analytics.google.com https://stats.g.doubleclick.net https://*.facebook.com https://www.clarity.ms https://region1.google-analytics.com https://api.postalpincode.in",
        // Frames: none (report page embeds nothing; admin embeds nothing)
        "frame-src 'none'",
        // Ancestors: replaces X-Frame-Options for modern browsers
        "frame-ancestors 'none'",
        // No plugins
        "object-src 'none'",
        // Lock down base tag hijacking
        "base-uri 'self'",
        // Forms only post to self
        "form-action 'self'",
    ].join('; ');
    res.setHeader('Content-Security-Policy', csp);

    next();
});

// Request logger so we can see what's hitting the server
app.use((req, _res, next) => {
    console.log(`[req] ${req.method} ${req.path}`);
    next();
});

// Block direct access to admin.html via static — must go through /admin handler
app.use((req, res, next) => {
    if (req.path === '/admin.html') return res.redirect('/admin');
    next();
});

// ── Maintenance mode gate ────────────────────────────────────
// When MAINTENANCE_MODE is "on", block the whole public app with an animated
// lock page (HTTP 503). The admin panel + APIs and health check stay open so
// an admin can always turn it back off. Staff can slip past to the live site
// by entering the access code — which sets a bypass cookie. The code MUST be
// configured via MAINTENANCE_ACCESS_CODE (env) or the admin panel; there is no
// baked-in default. If unset, the staff bypass is disabled (fail-closed) and
// only /admin remains reachable to turn maintenance off.
function maintAccessCode() { return String(db.getSetting('MAINTENANCE_ACCESS_CODE') || '').trim(); }
function maintToken(code) { return crypto.createHash('sha256').update('gc-maint:' + code).digest('hex').slice(0, 24); }

// Resolve recipients for a system notification from the per-user matrix,
// falling back to the single NOTIFY_EMAIL inbox so nothing is ever silently
// dropped when no user is subscribed. Always returns an array of emails.
async function notifyRecipients(notifKey) {
    let list = [];
    try { list = await db.getNotifRecipients(notifKey); } catch (_e) { list = []; }
    if (!list.length) {
        const fallback = (db.getSetting('NOTIFY_EMAIL') || '').trim();
        if (fallback) list = [fallback];
    }
    return list;
}
app.use((req, res, next) => {
    if (db.getSetting('MAINTENANCE_MODE') !== 'on') return next();
    const p = req.path;
    if (p === '/admin' || p.startsWith('/admin/') || p === '/api/health' || p === '/maintenance-access') return next();
    if (p === '/robots.txt' || p === '/sitemap.xml' || p === '/llms.txt') return next();
    // Only honour the bypass cookie when a code is actually configured. With no
    // code, maintToken('') would be a publicly computable constant — so skip it.
    const _mac = maintAccessCode();
    if (_mac && req.cookies && req.cookies.maint_bypass === maintToken(_mac)) return next();
    res.status(503);
    res.setHeader('Retry-After', '3600');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(maintenancePage());
});

// Staff access-code check → sets a 24h bypass cookie so staff can use the live
// site during maintenance. Always available; the code is MAINTENANCE_ACCESS_CODE.
app.get('/maintenance-access', rateLimit('login'), (req, res) => {
    const code = String((req.query && req.query.code) || '').trim();
    const expected = maintAccessCode();
    const a = Buffer.from(code), b = Buffer.from(expected);
    if (code && expected && a.length === b.length && crypto.timingSafeEqual(a, b)) {
        res.setHeader('Set-Cookie', `maint_bypass=${maintToken(code)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`);
        return res.json({ ok: true });
    }
    return res.status(401).json({ ok: false });
});

const PUBLIC_DIR = path.join(__dirname, 'public');

// ── Analytics & tracking tag injection ───────────────────────
// IDs are managed in the admin panel (Tracking tab) and read here. Only the
// tags that are configured get injected. A global window.gcTrack(event, params)
// fans out to dataLayer (GTM), gtag (GA4 / Google Ads) and fbq (Meta Pixel).
const TRACKING_KEYS = ['GTM_ID', 'GA4_ID', 'META_PIXEL_ID', 'META_CAPI_TOKEN', 'GOOGLE_ADS_ID', 'GOOGLE_ADS_LABEL', 'CLARITY_ID', 'GSC_VERIFICATION', 'WEBHOOK_URL',
    // Live Marketing-tab data sources (read-only API credentials)
    'GA4_PROPERTY_ID', 'GA4_SA_JSON', 'META_GRAPH_TOKEN', 'META_AD_ACCOUNT_ID',
    // Built-in CRM integrations: API key for n8n/Zapier pulls + event webhook for pushes
    'CRM_API_KEY', 'CRM_EVENTS_WEBHOOK',
    // Direct integrations (Integrations tab): Sheets live-sync, chat alerts
    'SHEETS_WEBHOOK_URL', 'TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID',
    // Inbound lead capture: webhook key + Meta Lead Ads auto-import
    'INBOUND_LEADS_KEY', 'META_LEADS_TOKEN', 'META_PAGE_ID',
    // New-lead email alerts (requires SMTP configured)
    'NOTIFY_EMAIL',
    // Email Alerts extras: morning digest toggle + hour, sign-in alerts
    'DAILY_DIGEST', 'DIGEST_HOUR', 'LOGIN_ALERTS',
    // System email sender (Integrations → System Email card) — read via
    // cfg()/getSetting in messaging.js, so saving here needs no env change
    'SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM',
    // Google Calendar (OAuth) — client id/secret + target calendar. The refresh
    // token is set only by the OAuth callback and is NEVER exposed to the client.
    'GCAL_CLIENT_ID', 'GCAL_CLIENT_SECRET', 'GCAL_CALENDAR_ID'];
// Keys that only an admin may read or write through /admin/tracking. These are
// system-wide email + calendar credentials — support/marketer roles (who can
// otherwise edit tracking pixels) must never see or change them.
const ADMIN_ONLY_TRACKING_KEYS = new Set([
    'SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM',
    'NOTIFY_EMAIL', 'DAILY_DIGEST', 'DIGEST_HOUR', 'LOGIN_ALERTS',
    'GCAL_CLIENT_ID', 'GCAL_CLIENT_SECRET', 'GCAL_CALENDAR_ID']);
const trackClean = v => String(v || '').replace(/[^A-Za-z0-9\-_]/g, '').slice(0, 40);
const verifyClean = v => String(v || '').replace(/[^A-Za-z0-9\-_]/g, '').slice(0, 100);

function analyticsHead() {
    const gsc = verifyClean(db.getSetting('GSC_VERIFICATION'));
    const gtm = trackClean(db.getSetting('GTM_ID'));
    const ga4 = trackClean(db.getSetting('GA4_ID'));
    const ads = trackClean(db.getSetting('GOOGLE_ADS_ID'));
    const adsLabel = trackClean(db.getSetting('GOOGLE_ADS_LABEL'));
    const pixel = trackClean(db.getSetting('META_PIXEL_ID'));
    const clarity = trackClean(db.getSetting('CLARITY_ID'));

    let s = gsc ? `<meta name="google-site-verification" content="${gsc}">` : '';
    s += `<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.GC_ADS='${ads}';window.GC_ADS_LABEL='${adsLabel}';window.gcTrack=function(ev,p){try{window.dataLayer.push(Object.assign({event:ev},p||{}));if(window.gtag)gtag('event',ev,p||{});if(window.fbq)fbq('trackCustom',ev,p||{});if(ev==='lead_captured'){if(window.fbq)fbq('track','Lead',p||{},(p&&p.event_id)?{eventID:p.event_id}:undefined);if(window.gtag&&window.GC_ADS&&window.GC_ADS_LABEL)gtag('event','conversion',{send_to:window.GC_ADS+'/'+window.GC_ADS_LABEL});}}catch(e){}};</script>`;
    if (gtm) s += `<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s);j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${gtm}');</script>`;
    if (ga4 || ads) {
        s += `<script async src="https://www.googletagmanager.com/gtag/js?id=${ga4 || ads}"></script><script>gtag('js',new Date());`;
        if (ga4) s += `gtag('config','${ga4}');`;
        if (ads) s += `gtag('config','${ads}');`;
        s += `</script>`;
    }
    if (pixel) s += `<script>!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${pixel}');fbq('track','PageView');</script>`;
    if (clarity) s += `<script>(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src='https://www.clarity.ms/tag/'+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y)})(window,document,'clarity','script','${clarity}');</script>`;
    return s;
}

// Animated, gamified "locker" maintenance page (self-contained).
function maintenancePage() {
    return `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<title>GrowClinic — We'll be right back</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
:root{--blue:#3b82f6;--blue2:#1d4ed8;--ink:#e8ecf5;--dim:rgba(232,236,245,.62)}
*{margin:0;padding:0;box-sizing:border-box}
html,body{height:100%}
body{font-family:'Inter',system-ui,sans-serif;background:#05060c;color:var(--ink);overflow:hidden;display:flex;align-items:center;justify-content:center;min-height:100vh;text-align:center}
.aurora{position:fixed;inset:-20%;z-index:0;filter:blur(70px);opacity:.55}
.aurora span{position:absolute;border-radius:50%;mix-blend-mode:screen;animation:drift 18s ease-in-out infinite}
.aurora .a{width:46vw;height:46vw;left:-6vw;top:-8vw;background:#1d4ed8;animation-delay:0s}
.aurora .b{width:40vw;height:40vw;right:-8vw;top:6vw;background:#7c3aed;animation-delay:-6s}
.aurora .c{width:38vw;height:38vw;left:24vw;bottom:-12vw;background:#0ea5e9;animation-delay:-11s}
@keyframes drift{0%,100%{transform:translate(0,0) scale(1)}33%{transform:translate(6vw,4vh) scale(1.12)}66%{transform:translate(-5vw,-3vh) scale(.92)}}
.dots{position:fixed;inset:0;z-index:0;pointer-events:none}
.dot{position:absolute;width:4px;height:4px;border-radius:50%;background:rgba(255,255,255,.5);animation:rise linear infinite}
@keyframes rise{from{transform:translateY(0);opacity:0}10%{opacity:.8}90%{opacity:.5}to{transform:translateY(-110vh);opacity:0}}
.card{position:relative;z-index:2;padding:42px 30px;max-width:460px;width:90%;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.10);border-radius:28px;backdrop-filter:blur(14px);box-shadow:0 30px 80px rgba(0,0,0,.5)}
.brand{font-weight:800;letter-spacing:.16em;font-size:.72rem;text-transform:uppercase;color:var(--dim);margin-bottom:22px}
.brand b{color:#fff}
.lockwrap{cursor:pointer;display:inline-block;user-select:none;-webkit-tap-highlight-color:transparent;margin:4px 0 8px;filter:drop-shadow(0 12px 28px rgba(59,130,246,.45));animation:float 4.5s ease-in-out infinite}
@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-9px)}}
.lockwrap.shake{animation:shake .5s cubic-bezier(.36,.07,.19,.97)}
@keyframes shake{10%,90%{transform:translateX(-2px) rotate(-3deg)}20%,80%{transform:translateX(4px) rotate(3deg)}30%,50%,70%{transform:translateX(-7px) rotate(-5deg)}40%,60%{transform:translateX(7px) rotate(5deg)}}
.shackle{transition:transform .45s cubic-bezier(.34,1.56,.64,1);transform-origin:50% 60%}
.lockwrap.open .shackle{transform:translateY(-14px) rotate(18deg)}
.glow{animation:glow 2.6s ease-in-out infinite}
@keyframes glow{0%,100%{opacity:.35}50%{opacity:.9}}
h1{font-size:1.7rem;font-weight:800;margin:14px 0 8px;background:linear-gradient(90deg,#fff,#9ec5ff);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent}
p.sub{color:var(--dim);font-size:.98rem;line-height:1.6;margin-bottom:20px}
.bar{height:8px;border-radius:99px;background:rgba(255,255,255,.08);overflow:hidden;margin:18px 0 8px}
.bar i{display:block;height:100%;width:40%;border-radius:99px;background:linear-gradient(90deg,var(--blue),#22d3ee);animation:load 2.4s ease-in-out infinite}
@keyframes load{0%{margin-left:-42%}100%{margin-left:104%}}
.msg{min-height:1.4em;font-size:.9rem;font-weight:600;color:#9ec5ff;margin-top:6px}
.count{font-size:.74rem;color:var(--dim);margin-top:10px}
.foot{margin-top:22px;font-size:.72rem;color:rgba(232,236,245,.4)}
.foot a{color:rgba(232,236,245,.55);text-decoration:none;border-bottom:1px dotted rgba(232,236,245,.3)}
</style></head>
<body>
<div class="aurora"><span class="a"></span><span class="b"></span><span class="c"></span></div>
<div class="dots" id="dots"></div>
<main class="card">
  <div class="brand"><b>GrowClinic</b> · Clinical Growth Audit</div>
  <div class="lockwrap" id="lock" role="button" aria-label="Locked">
    <svg width="118" height="138" viewBox="0 0 118 138" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path class="shackle" d="M30 58V42a29 29 0 0 1 58 0v16" stroke="#9ec5ff" stroke-width="11" stroke-linecap="round"/>
      <rect x="18" y="56" width="82" height="68" rx="16" fill="url(#g)" stroke="rgba(255,255,255,.25)" stroke-width="2"/>
      <circle class="glow" cx="59" cy="86" r="11" fill="#fff" opacity=".5"/>
      <circle cx="59" cy="86" r="8" fill="#0b1024"/>
      <rect x="55.5" y="90" width="7" height="18" rx="3.5" fill="#0b1024"/>
      <defs><linearGradient id="g" x1="18" y1="56" x2="100" y2="124" gradientUnits="userSpaceOnUse"><stop stop-color="#3b82f6"/><stop offset="1" stop-color="#1d4ed8"/></linearGradient></defs>
    </svg>
  </div>
  <h1>We're tuning things up</h1>
  <p class="sub">GrowClinic is getting a quick upgrade to serve your audit even better. We'll be back online shortly.</p>
  <div class="bar"><i></i></div>
  <div class="msg" id="msg">Tap the lock if you're impatient 🔒</div>
  <div class="count" id="count"></div>
  <div class="foot">
    <span id="staffToggle" style="cursor:pointer">🔑 Staff access</span>
    <div id="staffBox" style="display:none;margin-top:12px">
      <div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap">
        <input id="ac" inputmode="numeric" autocomplete="off" placeholder="Access code"
          style="width:140px;padding:9px 12px;border-radius:10px;border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.06);color:#fff;text-align:center;letter-spacing:.18em;font-size:.95rem;outline:none">
        <button id="acBtn" style="padding:9px 16px;border:none;border-radius:10px;background:var(--blue);color:#fff;font-weight:700;cursor:pointer">Enter</button>
      </div>
      <div id="acMsg" style="min-height:1.1em;margin-top:8px;font-size:.78rem"></div>
      <a href="/admin" style="font-size:.72rem">Admin panel →</a>
    </div>
  </div>
</main>
<script>
(function(){
  var d=document.getElementById('dots');
  for(var i=0;i<26;i++){var s=document.createElement('div');s.className='dot';s.style.left=(Math.random()*100)+'vw';s.style.top=(100+Math.random()*20)+'vh';var dur=(9+Math.random()*12);s.style.animationDuration=dur+'s';s.style.animationDelay=(-Math.random()*dur)+'s';s.style.opacity=(0.3+Math.random()*0.5);d.appendChild(s);}
  var lock=document.getElementById('lock'),msg=document.getElementById('msg'),count=document.getElementById('count');
  var msgs=['Still locked. Nice try! 😄','Almost… nope.','Ooh so close!','We\\'re polishing something great ✨','Patience unlocks patience.','You really want in, huh?','The lock admires your persistence.'];
  var n=0;
  lock.addEventListener('click',function(){
    n++;
    lock.classList.remove('shake');void lock.offsetWidth;lock.classList.add('shake');
    if(n%7===0){lock.classList.add('open');msg.textContent='Unlocking… just kidding 🔐';setTimeout(function(){lock.classList.remove('open');},700);}
    else{msg.textContent=msgs[(n-1)%msgs.length];}
    count.textContent='Unlock attempts: '+n+(n>=15?' — okay you win, go grab a coffee ☕':'');
  });
  // Staff access code → bypass cookie → live site
  var toggle=document.getElementById('staffToggle'),box=document.getElementById('staffBox'),ac=document.getElementById('ac'),acBtn=document.getElementById('acBtn'),acMsg=document.getElementById('acMsg');
  toggle.addEventListener('click',function(){box.style.display=box.style.display==='none'?'block':'none';if(box.style.display==='block')ac.focus();});
  function tryCode(){
    var code=(ac.value||'').trim();
    if(!code){return;}
    acMsg.style.color='#9ec5ff';acMsg.textContent='Checking…';
    fetch('/maintenance-access?code='+encodeURIComponent(code)).then(function(r){return r.json().catch(function(){return{ok:false};});}).then(function(j){
      if(j&&j.ok){acMsg.style.color='#34d399';acMsg.textContent='Access granted ✓ Loading…';setTimeout(function(){location.href='/';},600);}
      else{acMsg.style.color='#f87171';acMsg.textContent='Wrong code. Try again.';ac.value='';ac.focus();}
    }).catch(function(){acMsg.style.color='#f87171';acMsg.textContent='Network error.';});
  }
  acBtn.addEventListener('click',tryCode);
  ac.addEventListener('keydown',function(e){if(e.key==='Enter')tryCode();});

  // auto-retry: when maintenance ends, the next reload loads the real app
  setTimeout(function(){location.reload();},60000);
})();
</script>
</body></html>`;
}

// Browsers auto-request /favicon.ico regardless of the <link> tag; point it at
// the real icon so it stops 404ing in the console.
app.get('/favicon.ico', (_req, res) => res.redirect(301, `${BASE_PATH}/img/favicon.png`));

// Explicit route for / serving public/index.html.
// Injects window.GC_BASE (so frontend fetches resolve under a subdirectory)
// and an SEO canonical link when PUBLIC_URL is set.
app.get('/', (_req, res) => {
    const indexPath = path.join(PUBLIC_DIR, 'index.html');
    if (!fs.existsSync(indexPath)) {
        console.error('[/] index.html missing at:', indexPath);
        return res.status(500).send('index.html not found');
    }
    try {
        let html = fs.readFileSync(indexPath, 'utf8');
        const inject = `<head>\n    <script>window.GC_BASE=${JSON.stringify(BASE_PATH)};</script>`
            + (PUBLIC_URL ? `\n    <link rel="canonical" href="${PUBLIC_URL}">` : '')
            + '\n    ' + analyticsHead();
        html = html.replace('<head>', inject);
        // Inline CSS and JS to reduce requests and obfuscate
        try {
            const cssContent = fs.readFileSync(path.join(PUBLIC_DIR, 'css', 'styles.css'), 'utf8');
            const jsContent = fs.readFileSync(path.join(PUBLIC_DIR, 'js', 'main.js'), 'utf8');
            
            // Remove standard link/script tags and insert inline blocks
            html = html.replace(/<link[^>]*href="css\/styles\.css"[^>]*>/i, `<style>${cssContent}</style>`);
            html = html.replace(/<script[^>]*src="js\/main\.js"[^>]*><\/script>/i, `<script>${jsContent}</script>`);
        } catch (e) {
            console.error('Failed to inline assets:', e.message);
        }

        html = cleanDashes(html);

        // NOTE: scripts are intentionally left as normal <script> tags. This page
        // is served directly as a top-level document (res.send below), so the
        // browser executes them in document order — which the analytics setup and
        // the chat client depend on (e.g. gtag must be defined before it's called).
        // A previous "rewrite every <script> into an <svg onload>" obfuscation
        // layer broke that ordering (gtag-not-defined) and mis-executed JSON-LD as
        // JS, killing chat init. Obfuscating served HTML gives ~no protection, so
        // it was removed in favour of correct, native script execution.

        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.send(html);
    } catch (e) {
        res.status(500).send('Could not read index.html: ' + e.message);
    }
});

// Serve ONLY the public/ folder — never __dirname (which would expose
// settings.json, db.js, *.sqlite, .env, source code, etc.)
app.use(express.static(PUBLIC_DIR, {
    index: false,
    dotfiles: 'deny',
    fallthrough: true
}));

function getOpenAIClient() {
    return new OpenAI({
        apiKey: db.getSetting('OPENAI_API_KEY') || 'YOUR_OPENAI_API_KEY_HERE'
    });
}

// ─────────────────────────────────────────────────────────────
// GEMINI CLIENT — used for chat + lead extraction
// (OpenAI is reserved for the final report generation)
// ─────────────────────────────────────────────────────────────
const GEMINI_MODEL_CHAT    = 'gemini-2.5-flash';
const GEMINI_MODEL_EXTRACT = 'gemini-2.5-flash-lite';

async function callGemini({ systemPrompt = '', messages = [], operation = 'chat', sessionId = null, temperature = 0.7, model = GEMINI_MODEL_CHAT }) {
    const key = db.getSetting('GEMINI_API_KEY');
    if (!key || key.includes('YOUR_') || key.length < 20) {
        const err = new Error('Gemini API key missing. Add GEMINI_API_KEY in admin → API Keys.');
        err.code = 'gemini_no_key';
        err.status = 401;
        throw err;
    }

    // Convert OpenAI-style messages → Gemini contents format
    const contents = messages.map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
    }));

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`;
    console.log(`[Gemini] → ${operation} | model: ${model}`);

    const body = {
        contents,
        generationConfig: { temperature, maxOutputTokens: 2048 }
    };
    if (systemPrompt) body.systemInstruction = { parts: [{ text: systemPrompt }] };

    let res, data;
    try {
        res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(30_000) // 30s hard cap so requests never hang
        });
        data = await res.json();
    } catch (e) {
        const isTimeout = e.name === 'TimeoutError' || /aborted|timeout/i.test(e.message);
        console.error('[Gemini] network error:', e.message, isTimeout ? '(TIMEOUT)' : '');
        db.logApiUsage({ provider: 'gemini', model, operation, sessionId, success: false, error: e.message });
        const err = new Error(isTimeout ? 'Gemini request timed out after 30s' : 'Gemini network error: ' + e.message);
        err.code = isTimeout ? 'TIMEOUT' : 'NETWORK';
        throw err;
    }

    if (!res.ok) {
        const apiErr = data?.error?.message || `HTTP ${res.status}`;
        console.error(`[Gemini] ${res.status} ${data?.error?.status || ''}: ${apiErr}`);
        if (data?.error?.details) console.error('[Gemini] details:', JSON.stringify(data.error.details));
        db.logApiUsage({ provider: 'gemini', model, operation, sessionId, success: false, error: apiErr });
        const err = new Error(apiErr);
        err.status = res.status;
        err.code = data?.error?.status || 'gemini_error';
        throw err;
    }
    console.log(`[Gemini] ✓ ${operation} | ${data?.usageMetadata?.totalTokenCount || 0} tokens`);

    const text = data?.candidates?.[0]?.content?.parts?.map(p => p.text).join('') || '';
    const usage = data?.usageMetadata || {};
    db.logApiUsage({
        provider: 'gemini',
        model,
        operation,
        sessionId,
        promptTokens: usage.promptTokenCount || 0,
        completionTokens: usage.candidatesTokenCount || 0,
        totalTokens: usage.totalTokenCount || 0,
        success: true
    });
    return { text, usage };
}

const sessions = {};
// PageSpeed results warmed up in parallel during the form handoff, keyed by
// sessionId, so the report step can reuse them instead of re-scanning.
const pageSpeedWarmCache = {};

// ── Memory guard: expire idle sessions + warm caches + progress trackers ──
// Without this the three in-memory stores grow forever until a restart.
const SESSION_TTL_MS = 6 * 60 * 60 * 1000;   // 6h of inactivity
setInterval(() => {
    const now = Date.now();
    for (const [id, s] of Object.entries(sessions)) {
        if ((s.lastActivity || 0) < now - SESSION_TTL_MS) {
            delete sessions[id];
            delete pageSpeedWarmCache[id];
            delete reportProgress[id];
        }
    }
    // Orphaned entries (warm cache / progress without a live session)
    for (const id of Object.keys(pageSpeedWarmCache)) {
        if (!sessions[id] && (pageSpeedWarmCache[id].at || 0) < now - SESSION_TTL_MS) delete pageSpeedWarmCache[id];
    }
    for (const id of Object.keys(reportProgress)) {
        if (!sessions[id] && (reportProgress[id].at || 0) < now - SESSION_TTL_MS) delete reportProgress[id];
    }
}, 30 * 60 * 1000).unref?.();

// Secure form → tool handoff. The website form POSTs the lead to /api/intake
// (signed), we stash it against a random one-time token, and only that token
// rides in the redirect URL — never the name/phone/PII. Tokens live in the shared
// Redis (survive restarts) with an in-memory fallback — see tokenStore.js.
const HANDOFF_TTL_MS = 15 * 60 * 1000; // 15 minutes
async function createHandoffToken(data) {
    const token = crypto.randomBytes(24).toString('base64url');
    await tokenStore.putOnce('handoff', token, data, HANDOFF_TTL_MS);
    return token;
}
const reportProgress = {}; // Track report generation progress per session
const webhookUrl = process.env.WEBHOOK_URL || '';

// ── OTP store (in-memory) ────────────────────────────────────
// Keyed by `${countryCode}:${mobile}`. Holds the code, expiry, verify
// attempts and resend count. Cleared on success / expiry.
const otpStore = new Map();
const OTP_TTL_MS = 10 * 60_000;      // code valid 10 minutes (matches WhatsApp template)
const OTP_MAX_ATTEMPTS = 5;          // wrong-code guesses before lockout
const OTP_MAX_SENDS = 5;             // resends per number per window
setInterval(() => {
    const now = Date.now();
    for (const [k, v] of otpStore.entries()) if (v.expires < now - OTP_TTL_MS) otpStore.delete(k);
}, 5 * 60_000).unref?.();

function genOtp() { return String(crypto.randomInt(100000, 1000000)); } // 6-digit, CSPRNG

// Build an absolute URL for links we send out over SMS/WhatsApp/email.
// Uses PUBLIC_URL when set; otherwise falls back to the request's own origin.
function absoluteUrl(pathname, req = null) {
    // PUBLIC_ORIGIN may be a comma-separated CORS list — links must use ONE origin.
    const envBase = (PUBLIC_URL || process.env.PUBLIC_ORIGIN || '').split(',')[0].trim();
    const base = (envBase || (req ? `${req.protocol}://${req.get('host')}` : '')).replace(/\/+$/, '');
    return `${base}${pathname}`;
}

// Resolve an Indian 6-digit pincode → { area, city, district, state } via the
// free India Post API. Returns null on any failure (caller stays graceful).
const pincodeCache = new Map();
async function resolvePincode(pin) {
    const code = String(pin || '').replace(/\D/g, '');
    if (!/^\d{6}$/.test(code)) return null;
    if (pincodeCache.has(code)) return pincodeCache.get(code);
    try {
        const controller = new AbortController();
        const t = setTimeout(() => controller.abort(), 8000);
        const res = await fetch(`https://api.postalpincode.in/pincode/${code}`, { signal: controller.signal });
        clearTimeout(t);
        const json = await res.json();
        const po = json?.[0]?.PostOffice?.[0];
        if (!po) { pincodeCache.set(code, null); return null; }
        const out = {
            pincode: code,
            area: po.Name || po.Block || '',
            city: po.District || po.Division || '',
            district: po.District || '',
            state: po.State || ''
        };
        pincodeCache.set(code, out);
        return out;
    } catch (e) {
        console.warn('[pincode] lookup failed:', e.message);
        return null;
    }
}

// Fire-and-forget report delivery: WhatsApp (Meta Cloud API) + email (SMTP).
async function deliverReport({ name, clinic, phone, verifiedPhone, email, reportUrl, sessionId }) {
    try {
        const pp = verifiedPhone || messaging.parsePhone(phone);
        if (pp && messaging.isWhatsAppConfigured()) {
            const wa = await messaging.sendWhatsAppReport({
                countryCode: pp.countryCode, mobile: pp.mobile, name, clinic, reportUrl, sessionId
            });
            if (wa.ok) console.log('[deliverReport] WhatsApp sent.');
            else if (!wa.skipped) console.warn('[deliverReport] WhatsApp failed.');
        }
        if (email && messaging.isEmailConfigured()) {
            const em = await messaging.sendReportEmail({ email, name, clinic, reportUrl });
            if (em.ok) console.log('[deliverReport] Email sent.');
            else if (!em.skipped) console.warn('[deliverReport] Email failed.');
        }
    } catch (e) {
        console.warn('[deliverReport] error (non-critical):', e.message);
    }
}

// Flip a generated teaser → full report and fire delivery (WhatsApp and/or
// email). Idempotent: a report already unlocked is left alone, so calling this
// from multiple paths (phone verify, email verify, gen-complete) is safe.
async function unlockAndDeliverReport(sessionId, { verifiedPhone = null, email = null } = {}) {
    if (!sessionId) return false;
    const rp = path.join(REPORTS_DIR, `${sessionId}.json`);
    if (!fs.existsSync(rp)) return false;   // not generated yet; the gen path delivers
    let rd;
    try { rd = JSON.parse(fs.readFileSync(rp, 'utf8')); } catch (_e) { return false; }
    if (rd.verified) return true;           // already unlocked + delivered
    rd.verified = true;
    fs.writeFileSync(rp, JSON.stringify(rd, null, 2));
    const deliveryUrl = absoluteUrl(`${BASE_PATH}/api/report/${sessionId}`);
    if (/^https?:\/\//.test(deliveryUrl)) {
        deliverReport({
            name: (rd._rawLead && rd._rawLead.name) || rd.ownerName || '',
            clinic: (rd._rawLead && rd._rawLead.clinicName) || rd.clinicName || '',
            phone: (rd._rawLead && rd._rawLead.phone) || null,
            verifiedPhone: verifiedPhone || null,
            email: email || (rd._rawLead && rd._rawLead.email) || null,
            reportUrl: deliveryUrl,
            sessionId
        });
        console.log(`[${sessionId}] report unlocked + delivery fired (${verifiedPhone ? 'phone' : 'email'}).`);
    }
    return true;
}

// Reports dir — env-configurable for Railway volume support
const REPORTS_DIR = process.env.REPORTS_DIR || path.join(process.env.DATA_DIR || __dirname, 'reports');
if (!fs.existsSync(REPORTS_DIR)) {
    fs.mkdirSync(REPORTS_DIR, { recursive: true });
}
console.log('[server] Reports dir:', REPORTS_DIR);

// ─────────────────────────────────────────────────────────────
// CHAT PROMPT — 13-question questionnaire flow
// ─────────────────────────────────────────────────────────────
const CHAT_PROMPT = `
You are the GrowClinic Bot from the GrowClinic team. Your team audits clinics, hospitals, and specialty practices across the UAE, the US, the UK, Canada and India.
Your role: run a structured 60-second diagnostic on the user's patient pipeline AND surface the gaps that are costing them new patients.

VOICE (read carefully — this is non-negotiable):
- You are a friendly, warm, and highly conversational consultant from the GrowClinic team. You chat like a real person, not a rigid chatbot. Keep your language simple, easy to understand, and at a 10th-grade reading level. Avoid complex marketing jargon.
- Address the user respectfully but warmly. For doctors, always "Dr. [LastName]" or "Dr. [FirstName]".
- Never use "AI", "bot", "model", "GPT" or any AI jargon. You represent the "GrowClinic team".
- Feel free to use natural conversational fillers like "Great!", "Okay", "Got it", and "Thanks" to keep the chat engaging.
- ONE focused question per message. 1–2 sentences max.
- Use specific data when you can: round numbers, benchmarks, percentages — never vague phrases.
- Match the user's spelling preference (centre/center, specialised/specialized).
- COUNTRY & CURRENCY AWARENESS: Infer the user's country from their city, phone country code, or anything they say. Once known, use THAT country's currency for every money reference: UAE → AED, US → $, UK → £, Canada → C$, India → ₹, Australia → A$. If the country is still unknown, avoid currency symbols entirely ("clinics like yours typically…", "comparable practices average…") until it becomes clear. Never show ₹ to a non-India user.
- Use emojis naturally to keep the conversation friendly and engaging.

CONVERSATIONAL POSTURE:
- When findings are negative, frame as "fixable with a clear plan" — never alarmist.
- Surface insight before asking the next question when relevant ("That's below the typical benchmark of 45–60 new patients/month for clinics with your setup. Worth flagging in the report.")
- Keep the conversation flowing smoothly. Acknowledge warmly and naturally before the next question. Use phrases like: "Got it.", "That makes sense.", "That's super helpful.", "We can definitely help with that."

PERSONALIZATION & ENGAGEMENT (make every message feel hand-written for THIS person):
- Use what you already know, by name. Weave in their first name, their clinic/hospital name, their city, and their specialty so it never feels like a form. e.g. "Love it — Bright Smile in Mumbai has real potential 🦷" rather than a generic "Noted."
- React to each answer with ONE specific, tailored micro-insight before the next question — make it specialty- and city-aware. e.g. for a dental clinic with low Google patients: "For dental clinics in Mumbai, most new patients start on Google — so that's exactly where we'll find quick wins." Keep it to one short, encouraging sentence.
- VARY your acknowledgements — never repeat the same opener twice in a row. Rotate naturally: "Love that.", "Smart.", "That's a common one.", "Good to know.", "Makes total sense.", "Ah, gotcha."
- Be warm and human, like a sharp consultant who genuinely wants them to win — encouraging, never judgmental about gaps ("totally fixable").
- Tailor the angle to their ROLE: an Owner hears growth/revenue framing, a Doctor hears reputation/patient-trust framing, a Manager hears time-saved/operations framing.
- Mirror their energy and keep momentum: short, friendly, a little excited about what you're finding for them.
- Still: ONE question per message, 1–2 sentences, plain language. Personalization adds warmth, not length.

ABSOLUTE RULES:
0. NEVER re-ask anything the user already answered. Before EVERY question, scan the whole conversation; if that detail (name, clinic, city, specialty, website, role, phone) is already there, SKIP it and move to the next unanswered step. Repeating a question the user just answered is the worst, most jarring mistake you can make.
1. ONE question per message. Never two. Ever.
2. Max 1–2 short sentences. Under 20 words preferred.
3. Acknowledge naturally before the next question — BUT the acknowledgement/reaction and the question are TWO separate messages. Whenever a turn contains BOTH a reaction/insight AND a question, put a [DELAY: 500] between them so they send as two separate bubbles (like a real person texting). Example: "Dental clinic, noted 🦷 [DELAY: 500] Nice — what's your name?" NEVER bundle a welcome/acknowledgement and a question into one bubble.
4. Only add a FOMO line when the answer is negative or mediocre — not when they’re doing well.
5. Single-choice: append [OPTIONS: A | B | C]
6. Multi-choice: append [MULTI_OPTIONS: A | B | C]
6b. NEVER use markdown formatting (** or * or _ or backticks) inside OPTIONS labels or anywhere in your messages. Plain text only. Example: [OPTIONS: Dental | Hair], NOT bold-wrapped labels.
6c. NEVER use em-dashes or en-dashes (the long "—" / "–" characters). They read as robotic. Use a comma, a full stop, or the word "to" for ranges (e.g. "20 to 40 patients"). Only ordinary hyphens in compound words are fine.
7. Use [DELAY: ms] (a) for tension before audit results, and (b) to split any acknowledgement/reaction from the question that follows it, so the two arrive as separate bubbles. Use 400–700ms for the ack→question split; longer (1500–2500ms) only before the report.
8. Use "Dr. [FirstName]" ONLY for CONFIRMED doctors (see STEP 0 doctor status) — for them, every message, no exceptions. NEVER use "Dr." for an owner/manager/staff who has not confirmed they are a doctor; use their plain name instead.
9b. VOCABULARY MUST MATCH THE ROLE. This is critical:
    - If user picked "Hospital Owner" → ALWAYS say "hospital" (NEVER "clinic"). Examples: "What's the hospital called?", "Got a website for the hospital?", "Hospitals in your city...", "Got a Google profile for the hospital?".
    - If user picked any other role (Doctor, Clinic Owner, HOD, Practice Manager, Administrator) → use "clinic".
    - This applies to EVERY question and every acknowledgement that mentions the place. Re-read the user's role before composing each message.
9. SMART SPECIALTY DETECTION: If the clinic name contains ANY of these keywords, detect the specialty, confirm it in 3 words, and SKIP STEP 5 completely.
   CHECK IN THIS EXACT ORDER (first match wins):
   - "dental" OR "dent" OR "smile" OR "tooth" OR "teeth" → "Dental clinic, noted 🦷" → SKIP STEP 5
   - "skin" OR "derm" OR "aesthetic" OR "glow" OR "beauty" OR "medspa" OR "cosmo" → "Skin & Aesthetics, noted 💆" → SKIP STEP 5
   - "hair" OR "trich" → "Hair clinic, noted 💇" → SKIP STEP 5
   - "ivf" OR "fertil" → "IVF, noted 🍼" → SKIP STEP 5
   - "eye" OR "vision" OR "optic" → "Eye care, noted 👁️" → SKIP STEP 5
   - "ortho" OR "bone" OR "spine" OR "joint" → "Orthopaedics, noted 🦴" → SKIP STEP 5
   - "heart" OR "cardio" → "Cardiology, noted ❤️" → SKIP STEP 5
   - "child" OR "paediat" OR "pediatr" OR "kids" → "Paediatrics, noted 👶" → SKIP STEP 5
   - "physio" → "Physiotherapy, noted 💪" → SKIP STEP 5
   - "homeo" OR "homoeo" → "Homeopathy, noted 🌿" → SKIP STEP 5
   - "ayur" → "Ayurveda, noted 🌿" → SKIP STEP 5
   - "gyn" OR "gynae" OR "obstet" OR "matern" → "Gynaecology, noted 🤰" → SKIP STEP 5
   IMPORTANT: "Smile" = Dental (NOT Hair). "Ortho" in a dental name = Dental. Always check "dental/dent/smile" FIRST before "hair".
10. CAPITALIZE KEYWORDS: Always capitalize the first letter of these words in your responses: Clinic, Hospital, Multispecialty, Dental, Dermatology, Aesthetics, Doctor, Owner, Staff, Healthcare.

--- THE FLOW — FOLLOW IN ORDER. DO NOT SKIP ANY NUMBERED STEP. ---

FIT SCREEN (read the FIRST FEW answers strictly): The opening questions — practice TYPE and ROLE — double as a qualification screen. Read them carefully and strictly to judge whether this is a genuine, decision-capable lead at a real healthcare practice (clinic / hospital / specialty practice) that is a strong fit for a full GrowClinic audit:
- STRONG fit: a Doctor or Owner at a real clinic/hospital/specialty practice → engage fully, this is exactly who the audit is for.
- SOFTER fit: a Manager or Staff member → still help, but frame the report as something to share with the owner/doctor.
- WEAK / wrong fit: answers that are clearly NOT a healthcare practice, or a student / vendor / competitor / just-browsing signal → stay polite and brief, keep it light, and don't oversell.
Be strict in how you READ these early signals to understand fit — but this is about understanding, not gatekeeping. Never refuse or lecture; keep every reply warm. Do NOT change or skip any of the steps below.

QUICK-START TILE: The user may open by tapping a short practice-type tile — one of exactly: "Dental Clinic", "Aesthetic", "Hospital", "IVF", "Other". This is their practice TYPE / specialty, NOT their role and NOT their clinic name. When the first message is one of these:
- Acknowledge it in 2 to 3 words with a fitting emoji (e.g. "Dental, love it 🦷" / "Aesthetics, noted 💆" / "IVF, got it 🍼").
- If it's "Hospital", switch to HOSPITAL mode for the whole chat (say "hospital", never "clinic").
- If it's "Other", ask their specialty once in the next message, then continue.
- Record this type and treat STEP 5 (specialty) as already done — NEVER ask for the specialty again.
- This does NOT tell you their role, so still do STEP 0 (role) next.

STEP 0 — ROLE + DOCTOR STATUS (ALWAYS confirm — NEVER assume from the quick-start tile)
- CRITICAL: The quick-start tiles ("I run a Dental Clinic…", "Cosmetic Skin Clinic", "Multispecialty Hospital") only tell you the FACILITY TYPE — they do NOT tell you the person's role. A tile like "I run a Dental Clinic" does NOT mean they are the owner, and does NOT mean they are (or aren't) a doctor. Do not infer the role from a tile.
- ALWAYS ask the role first: "Welcome! To tailor this audit, what's your role at the practice?" [ROLE_OPTIONS: 🩺 Doctor | 🏥 Owner | 🗂 Manager | 📋 Staff]
- DOCTOR STATUS decides the "Dr." prefix and MUST be confirmed, never guessed:
   - Picked "Doctor" → they ARE a doctor → address them as "Dr. [Name]" in every message from then on.
   - Picked "Owner" → owners are often doctors too, so you do NOT yet know. When you ask their name (STEP 1), in the SAME flow also confirm once: "Quick one — are you a practising doctor?" [OPTIONS: Yes | No]. If Yes → use "Dr. [Name]"; if No → use plain "[Name]".
   - Picked "Manager" or "Staff" → treat as NOT a doctor → use their plain name (no "Dr."), and later suggest sharing the report with the owner/doctor.
- NEVER write "Dr." until doctor status is confirmed. When in doubt, use the plain name — adding a wrong "Dr." (or calling a doctor by plain name) is a real mistake.
- The role also sets the pitch angle: Owner → ROI, revenue, growth decisions. Doctor → patient outcomes + reputation + time saved. Manager → operations, follow-ups, reporting. Staff → ease of use, enquiry handling.

FACILITY TYPE — CLINIC vs HOSPITAL (decide ONCE, early, then stay consistent):
- Treat them as a HOSPITAL only if a STRONG signal says so: the quick-start tile / first message says "hospital", they explicitly say they run a hospital, OR the FACILITY NAME they typed contains "hospital" / "medical centre" / "medical center".
- DO NOT switch to hospital based on a website URL or domain alone (e.g. a domain containing "health"/"care"/"fortis" does NOT make it a hospital). The clinic name and what the user told you always win over the domain.
- Once decided, keep it for the WHOLE conversation — never flip mid-way. If you called it a clinic, keep saying "clinic"; if a hospital, keep saying "hospital".
- HOSPITAL mode: say "hospital" (never "clinic"); think departments, OPD footfall, specialist visibility; use hospital-scale volume options in STEP 9 [OPTIONS: Under 100 | 100–500 | 500–1500 | 1500+]; benchmarks reference "hospitals in [city]".
- Otherwise default to "clinic" language and clinic-scale volume options.

STEP 1 — NAME (ask ONCE, AFTER the role; SKIP entirely if already known)
- ⛔ ANTI-REPEAT (critical): Before asking the name, re-read the WHOLE conversation. If the user has already given their name ANYWHERE — their first message, a short one-word reply right after you asked "what's your name" (e.g. they replied "komal"), the prefill / handoff data, or the DYNAMIC PROFILE block — then you ALREADY HAVE IT. Greet them by that name and go STRAIGHT to STEP 2. NEVER ask for the name a second time. Re-asking a name the user already gave (like asking "What's your name?" again after they typed "komal") is a serious, jarring error — do not do it.
- A short single word the user sends right after your name question IS their name. Capture it as the name; don't ignore it or ask again.
- ORDER: the name comes AFTER the role question (STEP 0), never before it.
- ONLY if the name is still genuinely unknown, ask it once using the right greeting per role:
Doctor → "Great, Doctor! What’s your name?" (use "Dr. [Name]" every message after)
Owner → "Nice! What’s your name?"
Manager / Staff → "Perfect. What’s your name?"

STEP 2 — CLINIC / HOSPITAL NAME (match facility type)
Clinic context → "What’s the clinic called?"
Hospital context → "What’s the hospital called?"

STEP 3 — WEBSITE ← THE VERY NEXT QUESTION AFTER CLINIC NAME. ALWAYS. NO EXCEPTIONS.
After receiving the clinic name, your IMMEDIATE next message must ask for the website.
- If specialty is obvious from the name: confirm it in 3 words in the SAME message, then ask website.
  Example: "Hair clinic, noted 💇 Got a website? Drop the URL — I’ll scan it live 🔍" [OPTIONS: No website]
- If specialty is NOT obvious: just ask website directly.
  Example: "Got a website? Drop the URL — I’ll run a live scan 🔍" [OPTIONS: No website]
- URL given → acknowledge with "On it 🔍" IN THE SAME MESSAGE as the next question. Never send "On it 🔍" alone.
  Example: "On it 🔍 Which city? 🏙️" (city is ALWAYS the next question after the website — never the specialty)
- "No website" → "Noted — flagged for the report."
- IMPORTANT: ONLY say "Profile found ✅" when the user's exact message contains "Confirmed: that's my clinic" (this is a system-generated confirmation from the GMB card UI). NEVER say "Profile found" in response to short replies like "Yes", "Yes regularly", "Sometimes", etc. — those are answers to other questions.
⚠️ DO NOT ask specialty, city, pincode, or anything else before asking the website.

STEP 4 — CITY OR POSTAL CODE (ask ONE question — accept EITHER)
"Which city? 🏙️ (or drop your postal/ZIP/pin code)"
- The user may reply with a city name OR a postal code (Indian 6-digit pincode, US ZIP, UK postcode, Canadian postal code) — all are fine. If they give a postal code, the system AUTOMATICALLY uses it for the Google lookup, so you must NOT ask for the city again. Never ask for both. Match the local term: "pincode" in India, "ZIP code" in the US, "postcode" in the UK, "postal code" in Canada/UAE.

STEP 4B — PINCODE FALLBACK (CONDITIONAL — only if the lookup still fails)
- IMPORTANT: The system buffers the user's city/pincode reply and runs an automatic Google Maps lookup BEFORE you see the message. You will receive ONE of these combined messages:
  (a) "City: <city/area>. Confirmed Google profile: <name> rated <rating>★ with <N> reviews." → Acknowledge in 2-3 words and continue.
  (b) "City: <city/area>. Google profile not confirmed (user rejected the card)." → If a postal code was NOT already given, ask for it now: "📍 No worries — share your postal code (pincode / ZIP / postcode) so I can find the right listing." Use the local term for their country. Otherwise just continue.
  (c) "City: <city/area>. No Google profile found automatically." → Same as (b).
- NEVER ask for the postal code immediately after the city is given. Wait for the system's combined message. If the user already gave one, do NOT ask again.

STEP 5 — SPECIALTY (LAST RESORT — ask ONLY here, ONLY if still unknown)
The specialty is KNOWN — and you must NOT ask — if ANY of these revealed it:
  1. The user's FIRST message / quick-start tile (e.g. "I run a Dental Clinic..." → Dental. CONFIRMED.)
  2. The clinic/hospital NAME keywords (the detection list in rule 9).
  3. The WEBSITE URL or domain (e.g. drsharmashomeopathy.com → Homeopathy).
  4. The confirmed Google profile (its category, e.g. "Category: dentist" → Dental).
  5. You already acknowledged a specialty in ANY earlier message (e.g. "Homeopathy clinic, noted").
Only if NONE of those revealed it, ask now:
  Clinic → "And what type of clinic is it?" [OPTIONS: Dental | Skin & Aesthetics | Hair | IVF / Fertility | Eye Care | Homeopathy | Ayurveda | Multispecialty | Other]
  Hospital → "Which departments drive most of your OPD?" [OPTIONS: Multispecialty | Maternity & Gynae | Ortho & Spine | Cardiac | Other]
  - Other → "Which specialty?"

STEP 6 — CONTACT FOR THE REPORT (collect it — verification happens later, NOT here)
- You MUST collect a contact before STEP 7 — it's how we deliver the report. But you do NOT handle OTP in chat anymore.
- Ask for it now (one question, nothing else). Keep it channel-NEUTRAL — the on-screen input decides whether it's a WhatsApp number (India) or an email (rest of the world), so do NOT promise WhatsApp specifically:
  Doctor → "Dr. [Name], where should I send your full report? Pop your best contact in below."
  Others → "[Name], where should I send your full report? Pop your best contact in below."
  (The input appears automatically — do not describe it, and do not say "WhatsApp" or "email".)
- After the user's message contains a contact: the system shows them a "Send my code / Verify later" choice on screen — handled OUTSIDE the chat. Your job is only to acknowledge warmly in a few words (e.g. "Perfect, got it.") and move straight on to STEP 7.
- DO NOT ask for a 6-digit code. DO NOT say "Sending a code" or "Verified." DO NOT wait for verification. The full report is unlocked when they verify later (or emailed to them regardless); you just collect the contact and continue.
- If you're about to start growth questions and no contact has been given yet, STOP and ask for it first.

STEP 7 — GOOGLE PRESENCE (2 questions, one at a time)
"[DELAY: 800] Are you getting new patients from Google right now?" [OPTIONS: Yes, regularly | Sometimes | Not really]
- "Sometimes" or "Not really" only → "Most [specialty] clinics in [city] miss 50–65% of Google patients. That’s the gap we need to fix."

Then, check if the Google profile was already found:
- IF the user previously confirmed their Google profile (e.g., "Confirmed Google profile: [Name] rated [Rating]..."), DO NOT ask if they have a profile. Instead, say: "I see your Google profile is rated [Rating]★ with [Reviews] reviews. While that's a good start, most top doctors in your area miss out because of hidden profile gaps."
- IF they haven't confirmed a profile yet, ask: "Do you have a Google My Business profile?" [OPTIONS: Yes, active | Partially set up | Not on Google]
  - "Partially set up" or "Not on Google" only → "That’s costing you daily. Google drives 40% of local patients."

STEP 8 — ADS
"Are you running paid ads right now?" [MULTI_OPTIONS: Google Ads | Meta / Instagram | Other | None right now]
- If they select any ads → ask "What's your monthly budget?" with 4 budget tiers in the USER'S LOCAL CURRENCY (see COUNTRY & CURRENCY AWARENESS). Use these tiers per country:
  India → [OPTIONS: Under ₹10k | ₹10k–₹30k | ₹30k–₹1L | ₹1L+]
  UAE → [OPTIONS: Under AED 2k | AED 2k–5k | AED 5k–15k | AED 15k+]
  US / Canada → [OPTIONS: Under $500 | $500–$1.5k | $1.5k–$5k | $5k+] (use C$ for Canada)
  UK → [OPTIONS: Under £400 | £400–£1.2k | £1.2k–£4k | £4k+]
  Country unknown → [OPTIONS: Low | Moderate | Significant | Large]
- If they select "None right now" only → mention what competitors in [city] typically spend monthly to hold the top spots, in the local currency (e.g. "₹20–50k" in India, "AED 5–12k" in UAE, "$1.5–4k" in the US/Canada, "£1–3k" in the UK). If country unknown, say "a meaningful monthly budget" instead of a figure.

STEP 9 — VOLUME
"New patients per month?" [OPTIONS: Under 30 | 30–80 | 80–200 | 200+]
- Under 30 only → "Below average for [city]. The report will show the exact bottleneck."

STEP 10 — REPORT
"Running your audit... [DELAY: 2200] Checking Google footprint... [DELAY: 1800] Scanning [city] competition... [DELAY: 1500] Done. 🔥 [DELAY: 800] Found gaps costing you patients every week."
[OPTIONS: Show me the report | Book a strategy call]
***ABSOLUTE RULE***: You MUST append the exact token LEAD_CAPTURED (all caps, no spaces) at the very end of this message. This is required for the system to work. Never skip it. Example ending: "...costing you patients every week.\n[OPTIONS: Show me the report | Book a strategy call]\nLEAD_CAPTURED"

AFTER REPORT DELIVERED:
Any message about report / PDF / results / scores → reply EXACTLY:
"Your PDF is ready 👆 Click ‘View & Download Report’ in the card above — covers GMB score, website speed, ad gaps, and your 90-day plan."
`;

// ─────────────────────────────────────────────────────────────
// REPORT PROMPT — detailed prose, problem + solution format
// ─────────────────────────────────────────────────────────────
const REPORT_PROMPT = `
You are the lead growth strategist at GrowClinic — a healthcare digital marketing agency that audits clinics, hospitals and specialty practices across the UAE, the US, the UK, Canada and India. You write personalised digital audit reports that feel like they came from a senior consultant who actually looked at the clinic's data — not a template generator.

COUNTRY & CURRENCY: Infer the clinic's country from the transcript (city, phone country code, currency the user mentioned). Every money reference in the report must use that country's currency: UAE → AED, US → $, UK → £, Canada → C$, India → ₹. If the country cannot be determined, avoid currency figures entirely and use generic language like "comparable practices in your city". Never mix currencies within a report.

Based on the conversation transcript and any real API data provided, generate a comprehensive report as VALID JSON only, no markdown, no backticks, no extra text.

NEVER use em-dashes or en-dashes ("—" / "–") anywhere in the report text. Use commas, full stops, or "to" for ranges (e.g. "20 to 40 patients"). Ordinary hyphens in compound words are fine.

Return EXACTLY this JSON structure:
{
  "clinicName": "Exact clinic name from transcript",
  "ownerName": "Owner name from transcript",
  "location": "City from transcript",
  "clinicCategory": "Clinic specialty from transcript",
  "overallScore": 62,
  "executiveSummary": "Write a 4–5 sentence paragraph that reads like a senior consultant opening a high-value pitch to a busy doctor/owner. Name the clinic, owner (if known) and city. Lead with the OPPORTUNITY in patient/revenue terms ('there's a clear path to X–Y more new patients a month'), then name 2–3 specific gaps backed by the real data (GMB rating + reviews vs the local benchmark, website speed, no ads, no automation). Quantify what those gaps cost in missed patients. Be confident and motivating — this should make the reader feel a competent team has spotted exactly what to fix and can fix it. End on momentum. No bullet points, no fluffy phrases like 'shows promise'.",
  "seoScore": 45,
  "adsScore": 70,
  "conversionScore": 30,
  "findings": [
    {
      "area": "Google My Business & Local Visibility",
      "icon": "🗺️",
      "score": 45,
      "problem": "4–5 sentences. If GMB data exists: cite the exact rating and review count, then DIRECTLY compare to the AREA BENCHMARK provided ('top [category]s near you average ~X reviews; the local leader has Y — you have Z'). Explain that more reviews + activity = higher Maps ranking = more of the patients already searching for them. If the website-on-profile is missing, flag it. If not found on Maps at all: explain they're invisible to patients searching daily. Honest, urgent, never alarmist.",
      "solution": "4–5 sentences. This is what GrowClinic does: full GMB optimisation, 15–20 photos, a WhatsApp-driven review-generation campaign to close the gap to the local leaders, local-keyword business description, weekly Google Posts. Give a staged timeline that MATCHES the 90-day plan exactly: top 5 map results within 30 days and top 3 within 90 days for [category] in [city]."
    },
    {
      "area": "Website & Patient Conversion",
      "icon": "⚡",
      "score": 60,
      "problem": "4–5 sentences. If PageSpeed data exists: lead with the mobile score and translate it ('pages over 3s lose ~half of mobile visitors before they see your name'), citing LCP/FCP if poor. If the website was found on their Google profile (not given by them), say so plainly. If NO website exists anywhere: this is their single biggest quick win — patients who find them on Google have nowhere to see treatments, results, or book, so they click a competitor. Quantify in patient terms.",
      "solution": "4–5 sentences. GrowClinic builds/optimises a conversion-focused site: fast mobile pages, clear above-the-fold CTA, before/after gallery (with consent), embedded Google reviews, click-to-call + WhatsApp + a simple booking form. Outcome: 'a focused site converts 3–5% of visitors into enquiries — real extra patients every month.'"
    },
    {
      "area": "Paid Advertising & Patient Acquisition",
      "icon": "📢",
      "score": 70,
      "problem": "4–5 sentences. If running no ads: competitors are bidding on every '[specialty] near me' search and capturing ready-to-book patients today; estimate the monthly patients lost. If running ads: name the usual leaks — broad targeting, no conversion tracking, ad-to-landing-page mismatch, wasted spend. Tie to their stated budget/volume.",
      "solution": "4–5 sentences. GrowClinic's ad management: Google Search + Meta campaigns on high-intent keywords for their specialty + city, a matched landing page, call/form conversion tracking, weekly optimisation. Describe the outcome qualitatively as a meaningful share of the clinic's total new-patient opportunity. Do NOT state a patient-number range here; the single total figure belongs only in the executive summary."
    },
    {
      "area": "Social Media & Reels Content",
      "icon": "🎬",
      "score": 40,
      "problem": "4–5 sentences. Patients vet clinics on Instagram/social before booking — especially for visual specialties (dental, skin, hair, aesthetics, IVF). Most clinics post rarely, inconsistently, with no reels or before/after storytelling, so they look inactive next to competitors and build no trust or reach. Frame the gap to THEIR specialty. Do not claim to have scanned their account — speak to the category pattern.",
      "solution": "4–5 sentences. GrowClinic's social + creative service: a managed content calendar (3–4 posts + stories/week), short-form reels (treatment explainers, patient journeys, before/after with consent), local hashtag + geo strategy, and a bio that converts to a booking link. Outcome: 'consistent, local content typically doubles engagement and turns followers into booked consults within 60–90 days.'"
    },
    {
      "area": "Automation, Reminders & Communication",
      "icon": "💬",
      "score": 30,
      "problem": "4–5 sentences on the leak AFTER an enquiry. Reference their patient volume. Without automation, 40–60% of enquiries go cold, no-shows are never rebooked, and there's no easy way to broadcast offers or reminders. Patients expect instant WhatsApp replies; a missed-call or a form that nobody follows up on is lost revenue. Be specific about which patients they're losing.",
      "solution": "4–5 sentences. GrowClinic's automation + communication stack: WhatsApp Business auto-greeting and treatment capture, appointment confirmations + 24h reminders, post-visit review requests, 7-day no-show re-engagement, and one-tap offer broadcasts to the patient list — across WhatsApp, SMS and email. Outcome: '25–40% better enquiry-to-appointment conversion within 60 days, running 24/7 with zero manual effort.'"
    }
  ],
  "ninetyDayPlan": [
    { "phase": "Days 1–30", "focus": "Foundation & Quick Wins", "actions": "2 short sentences of concrete actions for THIS clinic based on its weakest scores (e.g. full GMB optimisation + photos, launch a WhatsApp review campaign, fix the worst website speed issues, switch on WhatsApp auto-reply). Specific, not generic.", "outcome": "1 sentence, measurable (e.g. 'Rank in the top 5 Maps results, +20 new reviews, instant patient replies live')." },
    { "phase": "Days 31–60", "focus": "Acquisition & Conversion", "actions": "2 short sentences (e.g. launch Google + Meta campaigns on high-intent local keywords with a matched landing page, start the reels/social content calendar, add booking + click-to-call to the site).", "outcome": "1 sentence, measurable, WITHOUT restating the total patient figure (e.g. 'a rising share of your monthly new-patient target, social engagement doubling')." },
    { "phase": "Days 61–90", "focus": "Scale & Automate", "actions": "2 short sentences (e.g. full automation stack — reminders, no-show re-engagement, offer broadcasts; optimise ad spend toward best-performing channels; double down on what's converting).", "outcome": "1 sentence, measurable (e.g. '25–40% better enquiry-to-appointment conversion, a predictable monthly patient pipeline')." }
  ],
  "nextStep": "Write 2 confident, motivating sentences for a doctor/owner. First: the single highest-impact move to make first (based on their weakest scores) and the patient/revenue upside of doing it. Second: a warm close noting the full 90-day plan above is ready to put into action, and GrowClinic can implement it with them. Do NOT mention booking a call or a sales pitch."
}

SCORING RULES:
- seoScore: Google traffic answer: "Yes consistently"=80, "Sometimes"=50, "Rarely"=20. GMB found with rating 4.5+=+15, 4.0–4.4=+10, below 4.0=+0, not found=-10. Cap at 95.
- adsScore: "Both"=88, "Google Ads"=72, "Meta Ads"=58, "None"=12. If the stated budget is in the top two budget tiers for their country (e.g. above ₹30k / AED 5k / $1.5k / £1.2k monthly), add +10. Cap at 95.
- conversionScore: Base 25. Volume: "200+"=+30, "80–200"=+20, "30–80"=+10, "under 30"=+0. Each growth intent selected: +8. Cap at 95.
- overallScore: (seoScore × 0.4) + (adsScore × 0.35) + (conversionScore × 0.25), rounded to nearest integer.
- All scores must be integers 10–95. No two scores should be identical.
- There are 5 findings. Score each on how big the GAP is (lower = bigger gap = more opportunity for GrowClinic):
  • "Google My Business & Local Visibility" → base on seoScore + the area benchmark (well behind local-leader reviews = lower).
  • "Website & Patient Conversion" → use the real PageSpeed score if available; if no website exists at all, score it LOW (15–30) — it's the biggest quick win.
  • "Paid Advertising & Patient Acquisition" → use adsScore.
  • "Social Media & Reels Content" → default 35–50 unless the transcript shows strong, consistent social activity.
  • "Automation, Reminders & Communication" → use conversionScore.
- The report should make a doctor/owner feel the gaps are real, quantified, and fixable BY GROWCLINIC. Lower scores are fine — they justify the services — but always pair them with a confident, specific solution.

TONE RULES — NON-NEGOTIABLE:
- Write like a senior consultant who has seen 500 clinics. Specific. Direct. Data-led.
- Never use bullet points, dashes, or numbered lists anywhere in the JSON strings.
- Always reference their actual city, clinic name, and specialty — not generic placeholders.
- If real API data exists (GMB rating, PageSpeed score), ALWAYS cite the actual numbers.
- Be honest about gaps — don't soften problems into vague "opportunities". Name the issue clearly.
- Solutions must include specific tactics, timelines, and expected outcomes.
- Avoid filler phrases: "shows promise", "it's important to", "we recommend considering", "in today's digital landscape".

CONSISTENCY RULES — NON-NEGOTIABLE:
- The overallScore must equal the average of the 5 finding scores. Never output an overall that the five detailed scores cannot produce.
- State the TOTAL new-patient opportunity as ONE range, in the executive summary ONLY (e.g. "a clear path to 20 to 30 more new patients a month"). NEVER repeat that same range in the channel findings or the 90-day plan as if a single channel delivers it; channel and phase outcomes describe their contribution qualitatively, not the full total.
- Keep the Google Maps target identical everywhere: top 5 within 30 days, top 3 within 90 days. The GMB finding solution and the 90-day plan must use these exact same milestones, never different ones.

OUTPUT ONLY VALID JSON. No backticks, no markdown, nothing before or after the JSON object.
`;

// ─────────────────────────────────────────────────────────────
// Make the report's numbers reconcile, no matter what the model returns.
// The 5 findings are the source of truth: the overall score is their average,
// and the three headline category scores map 1:1 to specific findings so the
// summary page can never contradict the detailed breakdown.
// ─────────────────────────────────────────────────────────────
function reconcileScores(report) {
    try {
        const findings = Array.isArray(report.findings) ? report.findings : [];
        // normalise every finding score to an integer in 10..95
        findings.forEach((f) => {
            let s = Math.round(Number(f.score));
            if (!Number.isFinite(s)) s = 30;
            f.score = Math.min(95, Math.max(10, s));
        });

        const byArea = (kw) => {
            const m = findings.find((f) => String(f.area || "").toLowerCase().includes(kw));
            return m ? m.score : null;
        };

        const scores = findings.map((f) => f.score).filter((n) => Number.isFinite(n));
        if (scores.length) {
            report.overallScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
        }

        // headline (page 1) categories = the matching detailed findings → no divergence
        const gmb = byArea("google my business") ?? byArea("local");
        const ads = byArea("paid");
        const web = byArea("website");
        if (gmb != null) report.seoScore = gmb;
        if (ads != null) report.adsScore = ads;
        if (web != null) report.conversionScore = web;
    } catch (e) {
        console.error("reconcileScores failed:", e.message);
    }
    return report;
}

// ─────────────────────────────────────────────────────────────
// REAL API: Extract lead data from transcript via GPT
// ─────────────────────────────────────────────────────────────
// Reject schema-placeholder echoes and junk the extractor sometimes returns as
// real values (e.g. "Doctor's full name", "Clinic Name", "City name only",
// "WhatsApp number"). Without this, that placeholder text gets saved as a lead.
const JUNK_VALUE_RE = /^(null|undefined|unknown|n\/?a|none|not\s*(provided|specified|available|mentioned|sure)|user'?s?(\s+full)?\s+name|doctor'?s?(\s+full)?\s+name|owner'?s?\s+name|(your|full|first)\s+name|clinic\/?\s*hospital\s+name|clinic\s+name|hospital\s+name|clinic\s+type(\s*\/\s*speciality)?|special[ity]+|treatment\s+focus|city(\s+name)?(\s+only)?|pincode|website(\s+url)?|domain|phone(\s+number)?|whatsapp(\s+number)?|mobile(\s+number)?|volume(\s+string)?|number\s+or\s+range|primary\s+(goal|intent)|their\s+primary.*|goal)$/i;

function cleanField(v) {
    if (v == null) return null;
    const s = String(v).trim();
    if (!s) return null;
    const norm = s.replace(/[‘’]/g, "'");      // curly → straight apostrophe
    if (JUNK_VALUE_RE.test(norm)) return null;
    if (/\bor\s+null\b/i.test(norm)) return null;        // echoed schema like "City name or null"
    if (/^[/|]+$/.test(s)) return null;                  // stray separators
    return s;
}
function sanitizeLead(obj = {}) {
    const out = {};
    for (const [k, v] of Object.entries(obj || {})) out[k] = cleanField(v);
    return out;
}

async function extractLeadData(transcript, sessionId = null) {
    try {
        const prompt = `Extract the following lead data from the conversation. Return ONLY valid JSON matching this schema exactly (no markdown, no commentary). Use null for any field the user did NOT actually state — never copy the example text below as a value:
{
    "name": "User's full name",
    "clinicName": "Clinic Name",
    "clinicType": "Clinic Type / Speciality",
    "city": "City name only",
    "pincode": "Postal / ZIP / pin code exactly as given (any country format), or null if not provided",
    "websiteUrl": "Clinic Website URL if provided, otherwise null",
    "phone": "WhatsApp number",
    "googleTraffic": "Yes / Sometimes / No",
    "ads": "Google / Meta / Both / No",
    "monthlyVolume": "Volume string",
    "primaryGoal": "Their primary intent / goal"
}

Conversation:
${transcript}`;

        // Try Gemini first (cheaper for extraction)
        try {
            const { text } = await callGemini({
                systemPrompt: 'You are a precise data extractor. Return only valid JSON. No markdown.',
                messages: [{ role: 'user', content: prompt }],
                operation: 'lead_extract',
                sessionId,
                model: GEMINI_MODEL_EXTRACT,
                temperature: 0.1
            });
            const cleaned = text.trim().replace(/^```json?\s*/i, '').replace(/```\s*$/, '').trim();
            return sanitizeLead(JSON.parse(cleaned));
        } catch (geminiErr) {
            console.warn('[extractLeadData] Gemini failed, falling back to OpenAI:', geminiErr.message);
            // Fallback to OpenAI
            const openai = getOpenAIClient();
            const res = await openai.chat.completions.create({
                model: 'gpt-3.5-turbo',
                messages: [{ role: 'system', content: prompt }],
            });
            db.logApiUsage({
                provider: 'openai', model: 'gpt-3.5-turbo', operation: 'lead_extract', sessionId,
                promptTokens: res.usage?.prompt_tokens || 0,
                completionTokens: res.usage?.completion_tokens || 0,
                totalTokens: res.usage?.total_tokens || 0
            });
            const raw = res.choices[0].message.content.trim()
                .replace(/^```json?\s*/i, '').replace(/```\s*$/, '').trim();
            return sanitizeLead(JSON.parse(raw));
        }
    } catch (e) {
        console.error('extractLeadData error:', e);
        return {};
    }
}

// ─────────────────────────────────────────────────────────────
// WEBSITE NAME EXTRACTOR — pulls business name from website
// Uses <title>, og:site_name, og:title, <h1> tags
// ─────────────────────────────────────────────────────────────
async function extractNameFromWebsite(websiteUrl) {
    if (!websiteUrl || websiteUrl.length < 5) return null;
    let url = websiteUrl.trim();
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url;

    // SSRF guard
    try { await assertSafeUrl(url); }
    catch (e) {
        console.warn('[extractNameFromWebsite] blocked SSRF attempt:', url, '|', e.message);
        return null;
    }

    try {
        const res = await fetch(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; GrowClinic-Audit/1.0)' },
            signal: AbortSignal.timeout(6000),
            redirect: 'manual'
        });
        if (res.status >= 300 && res.status < 400) return null;
        const html = await readBodyCapped(res, 2 * 1024 * 1024);

        // Try og:site_name first (most accurate brand name)
        const ogSite = html.match(/<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)["']/i)
            || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:site_name["']/i);
        if (ogSite?.[1]) return ogSite[1].trim();

        // og:title
        const ogTitle = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)
            || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i);
        if (ogTitle?.[1]) {
            // Strip common suffixes: "| Book Appointment", "- Home", etc.
            return ogTitle[1].replace(/\s*[\|\-–—]\s*.+$/, '').trim();
        }

        // <title> tag
        const titleTag = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        if (titleTag?.[1]) {
            return titleTag[1].replace(/\s*[\|\-–—]\s*.+$/, '').trim();
        }

        return null;
    } catch (e) {
        console.warn('[WebName] Could not extract name from website:', e.message);
        return null;
    }
}

// Place Details — Text Search does NOT return website/phone reliably, so fetch
// them explicitly by place_id. This is why a GMB with a real website was showing
// "no website linked".
async function fetchPlaceDetails(placeId, key) {
    try {
        const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=website,formatted_phone_number,url,user_ratings_total,rating,types,name&key=${key}`;
        const r = await fetch(url, { signal: AbortSignal.timeout(7000) });
        const d = await r.json();
        return d.result || null;
    } catch (e) { console.warn('[GMB] details error:', e.message); return null; }
}

// Area benchmark — top same-category practices in the city, for FOMO
// ("Top dentists nearby average 210 reviews · you have 48").
async function fetchAreaBenchmark(category, city, key, excludePlaceId) {
    try {
        const q = `${category} in ${city}`;
        const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(q)}&key=${key}`;
        const r = await fetch(url, { signal: AbortSignal.timeout(8000) });
        const d = await r.json();
        const results = (d.results || []).filter(p => p.place_id !== excludePlaceId && p.user_ratings_total);
        if (results.length < 2) return null;
        const top = results.sort((a, b) => (b.user_ratings_total || 0) - (a.user_ratings_total || 0)).slice(0, 5);
        const avgReviews = Math.round(top.reduce((s, p) => s + (p.user_ratings_total || 0), 0) / top.length);
        const avgRating  = +(top.reduce((s, p) => s + (p.rating || 0), 0) / top.length).toFixed(1);
        return {
            category,
            avgReviews,
            avgRating,
            topReviews: top[0].user_ratings_total || 0,
            topName:    top[0].name || null,
            sampleSize: top.length
        };
    } catch (e) { console.warn('[GMB] benchmark error:', e.message); return null; }
}

// ─────────────────────────────────────────────────────────────
// REAL API: Google Places — GMB rating, reviews, address, website
// Tries multiple query variations to maximise match rate
// If website URL provided, extracts name from it for better matching
// Also verifies GMB website matches the clinic's website
// ─────────────────────────────────────────────────────────────
async function fetchGoogleBusinessData(clinicName, city, websiteUrl = null, pincode = null) {
    const GOOGLE_API_KEY = db.getSetting('GOOGLE_API_KEY');
    if (!GOOGLE_API_KEY || GOOGLE_API_KEY.includes('YOUR_') || GOOGLE_API_KEY.length < 20) {
        console.warn('[GMB] GOOGLE_API_KEY missing or placeholder — Google Maps lookup skipped.');
        return null;
    }

    // Try to get the real business name from their website (more reliable than typed name)
    let websiteName = null;
    if (websiteUrl) {
        websiteName = await extractNameFromWebsite(websiteUrl);
        if (websiteName) console.log(`[GMB] Extracted name from website: "${websiteName}"`);
    }

    // Normalise a string: lowercase, remove spaces/punctuation → for fuzzy matching
    const normalise = s => (s || '').toLowerCase().replace(/[\s\-_''.]/g, '');

    // Strip generic words AND medspa/spa/wellness/health so "LeJeune Medspa" → "LeJeune"
    const genericWords = /\b(clinic|hospital|centre|center|healthcare|medspa|med spa|spa|wellness|health|care|dental|aesthetics|aesthetic)\b/gi;
    const cleanName = clinicName.replace(genericWords, '').replace(/\s{2,}/g, ' ').trim();

    // Meaningful search tokens — normalised, >2 chars
    const nameTokens = cleanName.toLowerCase().split(/\s+/).filter(w => w.length > 2).map(normalise);

    // Score how well a Google result name matches our search name
    function matchScore(resultRawName) {
        const rNorm = normalise(resultRawName);
        const inputNorm = normalise(clinicName);
        const cleanNorm = normalise(cleanName);

        // Exact normalised match → highest confidence
        if (rNorm === inputNorm || rNorm === cleanNorm) return 100;
        // Input is fully contained in result or vice versa
        if (rNorm.includes(cleanNorm) || cleanNorm.includes(rNorm)) return 90;
        // Any meaningful token appears in result (handles "Le Jeune" vs "LeJeune")
        const tokenHits = nameTokens.filter(t => rNorm.includes(t)).length;
        if (tokenHits >= 2) return 75;
        if (tokenHits === 1 && nameTokens.length === 1) return 70;
        if (tokenHits === 1) return 40;
        return 0;
    }

    // Postal-code string for query injection (alphanumeric — supports UK/CA/US/IN formats)
    const pinStr = pincode ? String(pincode).trim().replace(/[^A-Za-z0-9 -]/g, '').slice(0, 12) || null : null;

    // Build query list — pincode-first (most precise), then city fallbacks
    const queries = [];
    if (websiteName) {
        if (pinStr) queries.push({ q: `${websiteName} ${pinStr}`,        trustTopResult: true  });
        queries.push(             { q: `${websiteName} ${city}`,          trustTopResult: false });
        queries.push(             { q: websiteName,                        trustTopResult: false });
    }
    if (pinStr) {
        queries.push({ q: `${clinicName} ${pinStr}`,               trustTopResult: true  });
        queries.push({ q: `${cleanName} ${pinStr}`,                trustTopResult: true  });
        queries.push({ q: `${clinicName} ${city} ${pinStr}`,       trustTopResult: true  });
    }
    queries.push({ q: `${clinicName} ${city}`,                     trustTopResult: false });
    queries.push({ q: `${cleanName} ${city}`,                      trustTopResult: false });
    queries.push({ q: clinicName,                                   trustTopResult: false });
    queries.push({ q: `${cleanName} clinic ${city}`,               trustTopResult: false });
    // Last-resort: if name has a recognisable specialty word, search by category + pincode/city
    // This handles acronym clinic names like "VHCA Hair Clinic"
    if (pinStr) {
        const specialtyWords = ['hair', 'dental', 'skin', 'eye', 'ivf', 'ortho', 'cardio', 'physio', 'paediat'];
        const foundSpecialty = specialtyWords.find(w => clinicName.toLowerCase().includes(w));
        if (foundSpecialty) {
            queries.push({ q: `${foundSpecialty} clinic ${pinStr}`, trustTopResult: true });
            queries.push({ q: `${foundSpecialty} clinic ${city}`,   trustTopResult: false });
        }
    }

    for (const { q, trustTopResult } of queries) {
        try {
            const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(q)}&fields=name,rating,user_ratings_total,formatted_address,place_id,opening_hours,website,types&key=${GOOGLE_API_KEY}`;
            const res  = await fetch(url, { signal: AbortSignal.timeout(8000) });
            const data = await res.json();

            if (!data.results || data.results.length === 0) {
                console.log(`[GMB] Query "${q}" → 0 results`);
                continue;
            }

            console.log(`[GMB] Query "${q}" → ${data.results.length} result(s): ${data.results.slice(0,3).map(r=>r.name).join(' | ')}`);

            for (const p of data.results.slice(0, 3)) {
                const resultName    = (p.name || '').toLowerCase();
                const resultWebsite = (p.website || '').toLowerCase();

                // Strong match: website domain matches
                let websiteMatch = false;
                if (websiteUrl && resultWebsite) {
                    const inputDomain  = websiteUrl.replace(/^https?:\/\/(www\.)?/, '').split('/')[0].toLowerCase();
                    const resultDomain = resultWebsite.replace(/^https?:\/\/(www\.)?/, '').split('/')[0].toLowerCase();
                    websiteMatch = inputDomain === resultDomain || resultDomain.includes(inputDomain) || inputDomain.includes(resultDomain);
                }

                const score = matchScore(p.name);
                const nameMatch = score >= 40;

                // For pincode queries: always trust the #1 result — pincode is specific enough
                const pincodeTopMatch = trustTopResult && p === data.results[0];

                console.log(`[GMB]   → "${p.name}" | score:${score} | websiteMatch:${websiteMatch} | pinTop:${pincodeTopMatch}`);

                if (websiteMatch || nameMatch || pincodeTopMatch) {
                    const mapsUrl = p.place_id
                        ? `https://www.google.com/maps/place/?q=place_id:${p.place_id}`
                        : null;

                    // Place Details — get the REAL website + phone (Text Search omits these)
                    const details = p.place_id ? await fetchPlaceDetails(p.place_id, GOOGLE_API_KEY) : null;
                    const gmbWebsite = details?.website || p.website || null;

                    // Re-check website match against the now-reliable GMB website
                    if (websiteUrl && gmbWebsite) {
                        const inputDomain  = websiteUrl.replace(/^https?:\/\/(www\.)?/, '').split('/')[0].toLowerCase();
                        const gmbDomain    = gmbWebsite.replace(/^https?:\/\/(www\.)?/, '').split('/')[0].toLowerCase();
                        websiteMatch = inputDomain === gmbDomain || gmbDomain.includes(inputDomain) || inputDomain.includes(gmbDomain);
                    }

                    // Area benchmark for FOMO — search the place's category in the city
                    const types = p.types || details?.types || [];
                    const category = (types.find(t => !['point_of_interest','establishment','health','store'].includes(t)) || 'clinic').replace(/_/g, ' ');
                    const areaBenchmark = await fetchAreaBenchmark(category, city, GOOGLE_API_KEY, p.place_id);

                    console.log(`[GMB] ✅ Accepted: "${p.name}" via query "${q}" | score:${score} | ${p.rating}⭐ (${p.user_ratings_total} reviews) | site:${gmbWebsite || 'none'}`);

                    return {
                        name:           p.name || clinicName,
                        rating:         p.rating || null,
                        totalReviews:   p.user_ratings_total || 0,
                        address:        p.formatted_address || city,
                        placeId:        p.place_id || null,
                        mapsUrl,
                        gmbWebsite,
                        gmbPhone:       details?.formatted_phone_number || null,
                        websiteMatched: websiteMatch,
                        category,
                        areaBenchmark,
                        types,
                        found:          true
                    };
                }
            }
        } catch (e) {
            console.error(`[GMB] Query "${q}" error:`, e.message);
        }
    }

    console.warn(`[GMB] ❌ Not found after ${queries.length} queries for "${clinicName}" in "${city}"`);
    return { found: false };
}

// ─────────────────────────────────────────────────────────────
// REAL API: Google PageSpeed Insights (Lighthouse)
// ─────────────────────────────────────────────────────────────
async function fetchPageSpeedData(websiteUrl, sessionId = null) {
    if (!websiteUrl || websiteUrl.length < 5) return null;

    const GOOGLE_API_KEY = db.getSetting('GOOGLE_API_KEY');
    if (!GOOGLE_API_KEY || GOOGLE_API_KEY.includes('YOUR_') || GOOGLE_API_KEY.length < 20) {
        console.warn('[PageSpeed] GOOGLE_API_KEY missing or placeholder — speed test skipped.');
        return null;
    }
    db.logApiUsage({ provider: 'pagespeed', operation: 'pagespeed', sessionId, success: true });

    let url = websiteUrl.trim();
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url;

    try {
        const apiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&key=${GOOGLE_API_KEY}&strategy=mobile`;
        // Hard cap PageSpeed at 25s — a slow site can otherwise hang the whole
        // report for a minute+. On timeout we proceed without speed data.
        const ctrl = new AbortController();
        const to = setTimeout(() => ctrl.abort(), 25000);
        let data;
        try {
            const res = await fetch(apiUrl, { signal: ctrl.signal });
            data = await res.json();
        } finally { clearTimeout(to); }
        if (data.lighthouseResult) {
            const cats = data.lighthouseResult.categories;
            const audits = data.lighthouseResult.audits;
            return {
                performanceScore: Math.round((cats.performance?.score || 0) * 100),
                seoScore:         Math.round((cats.seo?.score || 0) * 100),
                accessibility:    Math.round((cats.accessibility?.score || 0) * 100),
                bestPractices:    Math.round((cats['best-practices']?.score || 0) * 100),
                fcp:  audits['first-contentful-paint']?.displayValue || null,
                lcp:  audits['largest-contentful-paint']?.displayValue || null,
                cls:  audits['cumulative-layout-shift']?.displayValue || null,
                tti:  audits['interactive']?.displayValue || null,
                mobileUrl: url,
                found: true
            };
        }
        return { found: false };
    } catch (e) {
        console.error('[PageSpeed] API error:', e.message);
        return null;
    }
}

// ─────────────────────────────────────────────────────────────
// REPORT GENERATION — calls all APIs, feeds data to GPT
// ─────────────────────────────────────────────────────────────
async function generateFomoReport(transcript, sessionId = null) {
    // Progress updater — updates the in-memory progress tracker
    function updateProgress(step, message) {
        if (sessionId) {
            reportProgress[sessionId] = { step, total: 5, message, done: false, error: false, at: Date.now() };
            console.log(`[Report:${sessionId}] Step ${step}/5: ${message}`);
        }
    }

    let lead = null;
    try {
        // Step 1: Extract structured lead data from transcript
        updateProgress(1, 'Extracting clinic details...');
        lead = await extractLeadData(transcript);
        console.log('[Report] Lead data extracted:', lead.clinicName, lead.city, lead.pincode || '(no pincode)');

        // Step 2: Scan Google Maps
        updateProgress(2, `Scanning Google Maps for ${lead.clinicName || 'your clinic'}...`);
        const hasWebsite = lead.websiteUrl && lead.websiteUrl !== 'null' && lead.websiteUrl !== 'none' && !['I don\'t have one','No','No website','Skip for now','I\'ll share it','none','no website','no'].includes(lead.websiteUrl.trim());
        // SPEED: GMB and PageSpeed run in PARALLEL when the user already gave a
        // website (the common case). Only when there's no user website does
        // PageSpeed wait on GMB to discover a fallback URL.
        updateProgress(3, 'Scanning Google + website speed...');
        const norm = (u) => String(u || '').replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/+$/, '').toLowerCase();
        const warm = pageSpeedWarmCache[sessionId];

        const gmbPromise = (lead.clinicName && lead.city)
            ? fetchGoogleBusinessData(lead.clinicName, lead.city, hasWebsite ? lead.websiteUrl : null, lead.pincode || null)
            : Promise.resolve(null);

        // Kick PageSpeed off immediately (parallel with GMB) if we know the target.
        let psPromise = null;
        if (hasWebsite) {
            psPromise = (warm && warm.data && norm(warm.url) === norm(lead.websiteUrl))
                ? Promise.resolve(warm.data)
                : fetchPageSpeedData(lead.websiteUrl, sessionId);
        }

        const gmbData = await gmbPromise;

        let speedTarget = hasWebsite ? lead.websiteUrl : null;
        let websiteSource = hasWebsite ? 'user' : null;
        if (!speedTarget && gmbData?.gmbWebsite) {
            speedTarget = gmbData.gmbWebsite;
            websiteSource = 'gmb';
        }

        let pageSpeedData = null;
        if (hasWebsite) {
            pageSpeedData = await psPromise;            // was already running alongside GMB
        } else if (speedTarget) {
            pageSpeedData = (warm && warm.data && norm(warm.url) === norm(speedTarget))
                ? warm.data
                : await fetchPageSpeedData(speedTarget, sessionId);
        }
        const effectiveWebsite = speedTarget || null;

        console.log('[Report] GMB data:', gmbData?.found, '| PageSpeed:', pageSpeedData?.found);

        // Step 3: Build context string for GPT
        let apiContext = '';

        if (gmbData?.found) {
            const bm = gmbData.areaBenchmark;
            apiContext += `\n\nGOOGLE MY BUSINESS DATA (live from API):
Clinic found on Google Maps: Yes
Listed Name on Google: ${gmbData.name}
Google Rating: ${gmbData.rating ? `${gmbData.rating}/5` : 'No rating yet'}
Total Reviews: ${gmbData.totalReviews}
Listed Address: ${gmbData.address}
Website linked on Google profile: ${gmbData.gmbWebsite || 'NONE linked'}
${bm ? `AREA BENCHMARK (top ${bm.sampleSize} ${bm.category}s near them): average ${bm.avgRating}★ with ~${bm.avgReviews} reviews; the local leader has ${bm.topReviews} reviews. Use this to create urgency — compare their ${gmbData.totalReviews} reviews against the local leaders.` : ''}`;
        } else if (gmbData?.found === false) {
            apiContext += `\n\nGOOGLE MY BUSINESS DATA: Clinic NOT found on Google Maps despite trying multiple search variations for "${lead.clinicName}" in "${lead.city}". This is a critical visibility issue — the clinic is invisible to patients searching on Google Maps.`;
        } else {
            apiContext += `\n\nGOOGLE MY BUSINESS DATA: API key not configured — use questionnaire answers to estimate GMB health.`;
        }

        if (pageSpeedData?.found) {
            apiContext += `\n\nGOOGLE PAGESPEED / LIGHTHOUSE DATA (live from API):
Website URL: ${pageSpeedData.mobileUrl}${websiteSource === 'gmb' ? ' (found on their Google profile — the user did not give it directly, so reference it as "the website linked on your Google profile")' : ''}
Mobile Performance Score: ${pageSpeedData.performanceScore}/100
Mobile SEO Score: ${pageSpeedData.seoScore}/100
Accessibility Score: ${pageSpeedData.accessibility}/100
Best Practices Score: ${pageSpeedData.bestPractices}/100
First Contentful Paint: ${pageSpeedData.fcp}
Largest Contentful Paint: ${pageSpeedData.lcp}
Time to Interactive: ${pageSpeedData.tti}
Cumulative Layout Shift: ${pageSpeedData.cls}`;
        } else if (pageSpeedData?.found === false) {
            apiContext += `\n\nPAGESPEED DATA: The website (${effectiveWebsite}) could not be analysed (may be slow or blocking automated tests) — itself a red flag. Assess from questionnaire answers.`;
        } else {
            apiContext += `\n\nPAGESPEED DATA: No website found for this clinic — neither provided by the user nor linked on their Google profile. Treat "no website" as a major conversion gap: patients who find them on Google have nowhere to learn about treatments, see results, or book.`;
        }

        // Step 4: Generate report with OpenAI (reserved for the FINAL report only)
        updateProgress(4, 'AI is writing your personalised report...');
        const openai = getOpenAIClient();
        const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: REPORT_PROMPT },
                { role: 'user', content: `CONVERSATION TRANSCRIPT:\n\n${transcript}\n\n${apiContext}\n\nGenerate the detailed JSON report now.` }
            ],
            temperature: 0.75
        });

        // Track OpenAI token usage
        db.logApiUsage({
            provider: 'openai',
            model: 'gpt-4o-mini',
            operation: 'report',
            sessionId,
            promptTokens: completion.usage?.prompt_tokens || 0,
            completionTokens: completion.usage?.completion_tokens || 0,
            totalTokens: completion.usage?.total_tokens || 0,
            success: true
        });

        const raw = completion.choices[0].message.content.trim()
            .replace(/^```json?\s*/i, '').replace(/```\s*$/, '').trim();
        const reportData = JSON.parse(raw);

        // Attach raw API data for use in the HTML report
        reportData._gmbData = gmbData;
        reportData._pageSpeedData = pageSpeedData;
        reportData._websiteSource = websiteSource;     // 'user' | 'gmb' | null
        reportData._effectiveWebsite = effectiveWebsite;
        reportData._rawLead = lead; // so the lead is saved to the DB on success too

        updateProgress(5, 'Report ready!');
        if (sessionId) reportProgress[sessionId] = { step: 5, total: 5, message: 'Report ready!', done: true, error: false };

        return reportData;

    } catch (err) {
        console.error('[Report] Generation error:', err);
        if (sessionId) reportProgress[sessionId] = { step: 5, total: 5, message: 'Report ready (with defaults)', done: true, error: false };
        return {
            clinicName: 'Your Clinic',
            ownerName: 'Doctor',
            location: 'Your City',
            clinicCategory: 'Clinic',
            overallScore: 52,
            executiveSummary: 'Your clinic has meaningful opportunities to improve its digital presence and attract more patients. Based on what you have shared, there are clear gaps in local search visibility, patient conversion, and online advertising that are costing you new patients every week. With the right strategy in place, you can start seeing measurable growth within 30 to 45 days.',
            seoScore: 38,
            adsScore: 55,
            conversionScore: 35,
            findings: [
                {
                    area: 'Google My Business & Local Visibility',
                    icon: '🗺️',
                    score: 38,
                    problem: 'Your clinic is not fully optimised on Google Maps, which means patients searching for your specialty in your city are finding competitors instead of you. A weak Google My Business profile with few reviews and incomplete information signals low trust to potential patients before they even visit your website.',
                    solution: 'GrowClinic will complete and optimise your Google My Business profile from top to bottom, implement a systematic review acquisition process, and build local SEO content that pushes your clinic into the top three map results for your highest-value search terms within 45 days.'
                },
                {
                    area: 'Website Performance & Speed',
                    icon: '⚡',
                    score: 55,
                    problem: 'A slow or poorly designed website is one of the biggest silent killers of new patient enquiries. If your site takes more than three seconds to load on mobile, over half of your visitors leave before seeing anything, and Google penalises your rankings as a result.',
                    solution: 'We will audit and optimise your website for mobile speed, add a clear call-to-action above the fold, and ensure your contact details and booking options are immediately visible. For clinics without a website, we will build a high-converting landing page designed specifically to turn visitors into booked appointments.'
                },
                {
                    area: 'Patient Conversion & WhatsApp Automation',
                    icon: '💬',
                    score: 35,
                    problem: 'Most clinics lose a significant number of enquiries simply because there is no fast, frictionless way for patients to connect. Without WhatsApp automation, messages go unanswered for hours, potential patients move on, and follow-up never happens.',
                    solution: 'We will set up a WhatsApp Business automation system with an instant greeting, appointment booking flow, and 48-hour follow-up sequences. This alone typically recovers 25 to 40 percent of leads that would have otherwise gone cold.'
                },
                {
                    area: 'Paid Advertising & Patient Acquisition',
                    icon: '📢',
                    score: 55,
                    problem: 'Without a targeted paid advertising strategy, your clinic is entirely dependent on organic reach, which is slow and increasingly competitive. Your competitors are running ads and showing up at the top of Google and Instagram every day, capturing the patients who are ready to book right now.',
                    solution: 'We will design and launch a targeted Google Ads and Meta Ads campaign specifically for your clinic category and location, focused on high-intent keywords that bring in patients who are actively searching for your services. Every unit of ad spend will be tracked against bookings, not just clicks.'
                }
            ],
            nextStep: 'Your 90-day growth plan is ready to put into action — GrowClinic can implement it with you, step by step. Get the full report in your inbox below.',
            _gmbData: null,
            _pageSpeedData: null,
            _rawLead: lead || { clinicName: 'Unknown', city: 'Unknown' }
        };
    }
}

// ─────────────────────────────────────────────────────────────
// GMB QUICK LOOKUP — search Google Maps for clinic, return top match
// Called by frontend after user enters clinic name + city
// ─────────────────────────────────────────────────────────────
app.post('/api/gmb-lookup', rateLimit('lookup'), async (req, res) => {
    const { clinicName, city, websiteUrl, sessionId, pincode } = req.body;
    if (!clinicName || !city) return res.json({ found: false });
    // Postal code: keep alphanumerics/spaces so UK postcodes (SW1A 1AA), US ZIPs,
    // Canadian codes (M5V 2T6) and Indian pincodes all work as search hints.
    const pin = String(pincode || '').trim().replace(/[^A-Za-z0-9 -]/g, '').slice(0, 12) || null;

    const GOOGLE_API_KEY = db.getSetting('GOOGLE_API_KEY');
    if (!GOOGLE_API_KEY || GOOGLE_API_KEY.includes('YOUR_') || GOOGLE_API_KEY.length < 20) {
        console.warn('[GMB Lookup] GOOGLE_API_KEY missing or placeholder — set a real key in admin → API Keys.');
        return res.json({ found: false, reason: 'no_api_key' });
    }
    db.logApiUsage({ provider: 'google_places', operation: 'gmb_lookup', sessionId, success: true });

    // Extract domain from website to use as search hint
    let domain = null;
    if (websiteUrl) {
        domain = websiteUrl.replace(/^https?:\/\/(www\.)?/, '').split('/')[0].split('.')[0];
    }

    // Build multiple query variations — first hit wins
    const queries = [
        pin ? `${clinicName} ${pin}` : null,    // pincode sharpens the match
        `${clinicName} ${city}`,
        domain ? `${domain} ${city}` : null,
        `${clinicName.split(' ')[0]} clinic ${city}`,
        `${clinicName} hair clinic ${city}`,   // fallback for specialty
        `${clinicName} dental clinic ${city}`
    ].filter(Boolean);

    const seenPlaceIds = new Set();
    const aggregated = [];

    try {
        for (const query of queries) {
            const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${GOOGLE_API_KEY}`;
            const apiRes = await fetch(url, { signal: AbortSignal.timeout(8000) });
            const data = await apiRes.json();
            console.log(`[GMB Quick Lookup] "${query}" → status: ${data.status}, results: ${data.results?.length || 0}`);

            if (data.status === 'REQUEST_DENIED') {
                console.error('[GMB Lookup] REQUEST_DENIED — Places API may not be enabled, or billing not set up. Error:', data.error_message);
                return res.json({ found: false, reason: 'request_denied', error: data.error_message });
            }

            if (data.results?.length) {
                for (const p of data.results) {
                    if (seenPlaceIds.has(p.place_id)) continue;
                    seenPlaceIds.add(p.place_id);

                    // Score the match: stronger name and token matching
                    let score = 0;
                    const pName = (p.name || '').toLowerCase();
                    const cName = clinicName.toLowerCase();

                    // Domain match is very strong
                    if (domain && pName.includes(domain.toLowerCase())) score += 20;

                    if (pName === cName) {
                        score += 30;
                    } else if (pName.includes(cName) || cName.includes(pName)) {
                        score += 20;
                    } else {
                        const tokens = cName.split(/\s+/).filter(w => w.length > 2);
                        let matched = 0;
                        for (const t of tokens) { if (pName.includes(t)) matched++; }
                        if (tokens.length > 0) {
                            score += (matched / tokens.length) * 20;
                        }
                    }

                    if (city && p.formatted_address?.toLowerCase().includes(city.toLowerCase())) score += 10;
                    if (p.user_ratings_total > 0) score += 2;

                    aggregated.push({ raw: p, score });
                }

                // If we got a very strong match (score >= 20), stop searching
                if (aggregated.some(r => r.score >= 20)) break;
            }
        }

        const validResults = aggregated.filter(r => r.score >= 20);

        if (validResults.length === 0) {
            return res.json({ found: false, status: 'ZERO_RESULTS' });
        }

        // Sort by score descending. The frontend shows ONE best match at a
        // time and steps to the next only if the user rejects it, so we return
        // a small ranked queue (not a bulk list of options).
        validResults.sort((a, b) => b.score - a.score);
        const results = validResults.slice(0, 6).map(({ raw: p }) => {
            let photoUrl = null;
            if (p.photos && p.photos.length > 0) {
                photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${p.photos[0].photo_reference}&key=${GOOGLE_API_KEY}`;
            }
            return {
                name: p.name || '',
                rating: p.rating || null,
                totalReviews: p.user_ratings_total || 0,
                address: p.formatted_address || '',
                placeId: p.place_id || null,
                photoUrl,
                website: p.website || null,
                types: (p.types || []).filter(t => !['point_of_interest', 'establishment'].includes(t)).slice(0, 3)
            };
        });

        res.json({ found: true, results });
    } catch (e) {
        console.error('[GMB Lookup] Error:', e.message);
        res.json({ found: false, reason: 'api_error' });
    }
});

// ─────────────────────────────────────────────────────────────
// PINCODE → area/city resolver (India Post). Lets the chat accept a
// pincode in place of a city and auto-fill the area for the GMB lookup.
// ─────────────────────────────────────────────────────────────
app.get('/api/resolve-pincode/:pin', rateLimit('pincode'), async (req, res) => {
    const data = await resolvePincode(req.params.pin);
    if (!data) return res.json({ found: false });
    res.json({ found: true, ...data });
});

// ─────────────────────────────────────────────────────────────
// OTP — real phone verification via WhatsApp (Meta Cloud API).
// Gracefully degrades to "simulated" mode (any 4 digits pass) when
// WhatsApp isn't configured, so the flow never blocks pre-setup.
// ─────────────────────────────────────────────────────────────
app.post('/api/otp/send', rateLimit('otp'), async (req, res) => {
    try {
        const { countryCode, mobile, name, sessionId } = req.body || {};
        const cc = String(countryCode || '').replace(/\D/g, '');
        const num = String(mobile || '').replace(/\D/g, '');
        if (!cc || cc.length > 4) return res.status(400).json({ ok: false, error: 'Country code required' });
        if (num.length < 6 || num.length > 12) return res.status(400).json({ ok: false, error: 'Invalid mobile number' });

        // Funnel: mark that an OTP was requested for this session.
        try { if (sessionId) db.trackChatActivity(sessionId, { otpSent: 1 }); } catch (_e) {}

        const key = `${cc}:${num}`;
        const prev = otpStore.get(key);
        if (prev && prev.sends >= OTP_MAX_SENDS && Date.now() < prev.expires) {
            return res.status(429).json({ ok: false, error: 'Too many OTP requests. Please wait a few minutes.' });
        }

        const configured = messaging.isWhatsAppConfigured();
        const code = genOtp();
        otpStore.set(key, {
            code,
            expires: Date.now() + OTP_TTL_MS,
            attempts: 0,
            sends: (prev?.sends || 0) + 1,
            simulated: !configured
        });

        if (configured) {
            const r = await messaging.sendWhatsAppOtp({ countryCode: cc, mobile: num, otp: code });
            if (!r.ok && !r.skipped) {
                console.warn(`[otp] WhatsApp send failed for ${key}`);
                return res.status(502).json({ ok: false, error: 'Could not send OTP right now. Please try again.' });
            }
            return res.json({ ok: true, simulated: false });
        }
        // Simulated mode — log so the developer can test before WhatsApp is set up.
        console.log(`[otp] SIMULATED (WhatsApp not configured) — code for ${key} is ${code} (any 6 digits will pass in non-production).`);
        return res.json({ ok: true, simulated: true });
    } catch (e) {
        console.error('[otp/send] error:', e.message);
        res.status(500).json({ ok: false, error: 'OTP service error' });
    }
});

app.post('/api/otp/verify', rateLimit('otp'), async (req, res) => {
    try {
        const { countryCode, mobile, code, sessionId } = req.body || {};
        const cc = String(countryCode || '').replace(/\D/g, '');
        const num = String(mobile || '').replace(/\D/g, '');
        if (!cc || cc.length > 4) return res.status(400).json({ ok: false, error: 'Country code required' });
        const entered = String(code || '').replace(/\D/g, '');
        const key = `${cc}:${num}`;
        const rec = otpStore.get(key);

        const rememberPhone = () => {
            if (sessionId && sessions[sessionId]) sessions[sessionId].verifiedPhone = { countryCode: cc, mobile: num };
        };

        // On a verified number, check if this client already completed an audit.
        // If so, surface their existing report instead of letting them redo it.
        const onVerified = async (extra = {}) => {
            // Mark this session as WhatsApp-verified for the admin funnel/insights.
            try { if (sessionId) db.trackChatActivity(sessionId, { verified: 1 }); } catch (_e) {}
            try { if (sessionId) db.addLeadEvent(sessionId, 'verified', 'WhatsApp OTP verified', 'visitor'); } catch (_e) {}
            // n8n / CRM event: this lead verified their WhatsApp (hot lead).
            try { if (sessionId) setTimeout(() => sendCrmEvent('lead.verified', sessionId), 1000); } catch (_e) {}
            try { if (sessionId) setTimeout(() => runAutomations('lead.verified', sessionId).catch(() => {}), 500); } catch (_e) {}
            let existingReport = null;
            try {
                const prior = await db.findCompletedLeadByPhone(num);
                if (prior && prior.reportUrl) {
                    if (sessionId && sessions[sessionId]) sessions[sessionId].duplicateOf = prior.reportUrl;
                    existingReport = { reportUrl: prior.reportUrl, name: prior.name || '', clinic: prior.clinicName || '' };
                    try { if (sessionId) db.trackChatActivity(sessionId, { returningClient: 1 }); } catch (_e) {}
                }
            } catch (_e) {}

            // Unlock this session's report (flip the teaser → full) and deliver
            // it to WhatsApp/email.
            try { await unlockAndDeliverReport(sessionId, { verifiedPhone: { countryCode: cc, mobile: num } }); }
            catch (e) { console.warn(`[unlock] ${sessionId}:`, e.message); }

            return res.json({ ok: true, existingReport, ...extra });
        };

        // Simulated mode (WhatsApp not configured): accept any 6-digit code —
        // but ONLY outside production (or when explicitly allowed), otherwise a
        // WhatsApp misconfiguration would let anyone "verify" any number.
        if (!messaging.isWhatsAppConfigured()) {
            const simulatedAllowed = process.env.NODE_ENV !== 'production'
                || db.getSetting('ALLOW_SIMULATED_OTP') === 'true';
            if (!simulatedAllowed) {
                console.error('[otp/verify] WhatsApp not configured in production — refusing simulated verification.');
                return res.status(503).json({ ok: false, error: 'Verification is temporarily unavailable. Please try again later.' });
            }
            if (entered.length === 6) { otpStore.delete(key); rememberPhone(); return onVerified({ simulated: true }); }
            return res.json({ ok: false, error: 'Enter the 6-digit code' });
        }

        if (!rec) return res.json({ ok: false, error: 'Code expired. Tap resend.' });
        if (Date.now() > rec.expires) { otpStore.delete(key); return res.json({ ok: false, error: 'Code expired. Tap resend.' }); }
        if (rec.attempts >= OTP_MAX_ATTEMPTS) { otpStore.delete(key); return res.json({ ok: false, error: 'Too many attempts. Tap resend.' }); }

        if (entered === rec.code) {
            otpStore.delete(key);
            rememberPhone();
            return onVerified();
        }
        rec.attempts += 1;
        otpStore.set(key, rec);
        return res.json({ ok: false, error: 'Incorrect code. Try again.' });
    } catch (e) {
        console.error('[otp/verify] error:', e.message);
        res.status(500).json({ ok: false, error: 'OTP service error' });
    }
});

// ─────────────────────────────────────────────────────────────
// EMAIL OTP — verification channel for NON-INDIA leads, where WhatsApp
// adoption is unreliable (esp. the US). Reuses the same otpStore + the deployed
// no-reply SMTP sender. India keeps WhatsApp OTP. Per product decision, if the
// user provides an email but doesn't complete the code, the final report link
// is still emailed to that address (see the generation path + unlock helper).
// ─────────────────────────────────────────────────────────────
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const emailOtpKey = em => `email:${String(em).toLowerCase()}`;

app.post('/api/otp/email/send', rateLimit('otp'), async (req, res) => {
    try {
        const { email, sessionId, captureOnly } = req.body || {};
        const em = String(email || '').trim().toLowerCase().slice(0, 200);
        if (!EMAIL_RE.test(em)) return res.status(400).json({ ok: false, error: 'Enter a valid email' });
        // Capture the email + intent so the report link can be delivered even if
        // the code is never entered ("Verify later" or abandon).
        try { if (sessionId) db.trackChatActivity(sessionId, { email: em }); } catch (_e) {}
        if (sessionId && sessions[sessionId]) sessions[sessionId].emailForReport = em;
        // captureOnly: just record the email (used when the user provides it but
        // hasn't chosen to receive a code yet) — no code is sent.
        if (captureOnly) return res.json({ ok: true, captured: true });
        try { if (sessionId) db.trackChatActivity(sessionId, { otpSent: 1 }); } catch (_e) {}

        const key = emailOtpKey(em);
        const prev = otpStore.get(key);
        if (prev && prev.sends >= OTP_MAX_SENDS && Date.now() < prev.expires) {
            return res.status(429).json({ ok: false, error: 'Too many requests. Please wait a few minutes.' });
        }
        const configured = messaging.isEmailConfigured();
        const code = genOtp();
        otpStore.set(key, { code, expires: Date.now() + OTP_TTL_MS, attempts: 0, sends: (prev?.sends || 0) + 1, simulated: !configured });

        if (configured) {
            const r = await messaging.sendEmailOtp({ email: em, otp: code });
            if (!r.ok && !r.skipped) return res.status(502).json({ ok: false, error: 'Could not send the code right now. Please try again.' });
            return res.json({ ok: true, simulated: false });
        }
        console.log(`[otp-email] SIMULATED (SMTP not configured) — code for ${em} is ${code}`);
        return res.json({ ok: true, simulated: true });
    } catch (e) {
        console.error('[otp/email/send] error:', e.message);
        res.status(500).json({ ok: false, error: 'OTP service error' });
    }
});

app.post('/api/otp/email/verify', rateLimit('otp'), async (req, res) => {
    try {
        const { email, code, sessionId } = req.body || {};
        const em = String(email || '').trim().toLowerCase().slice(0, 200);
        if (!EMAIL_RE.test(em)) return res.status(400).json({ ok: false, error: 'Enter a valid email' });
        const entered = String(code || '').replace(/\D/g, '');
        const key = emailOtpKey(em);
        const rec = otpStore.get(key);

        const onVerified = async (extra = {}) => {
            if (sessionId && sessions[sessionId]) sessions[sessionId].verifiedEmail = { email: em };
            try { if (sessionId) db.trackChatActivity(sessionId, { verified: 1, email: em }); } catch (_e) {}
            try { if (sessionId) db.addLeadEvent(sessionId, 'verified', 'Email OTP verified', 'visitor'); } catch (_e) {}
            try { if (sessionId) setTimeout(() => sendCrmEvent('lead.verified', sessionId), 1000); } catch (_e) {}
            try { if (sessionId) setTimeout(() => runAutomations('lead.verified', sessionId).catch(() => {}), 500); } catch (_e) {}
            try { await unlockAndDeliverReport(sessionId, { email: em }); } catch (_e) {}
            return res.json({ ok: true, ...extra });
        };

        // Simulated mode (SMTP not configured) — accept any 6-digit code outside
        // production, mirroring the phone flow.
        if (!messaging.isEmailConfigured()) {
            const simulatedAllowed = process.env.NODE_ENV !== 'production' || db.getSetting('ALLOW_SIMULATED_OTP') === 'true';
            if (!simulatedAllowed) return res.status(503).json({ ok: false, error: 'Verification is temporarily unavailable. Please try again later.' });
            if (entered.length === 6) { otpStore.delete(key); return onVerified({ simulated: true }); }
            return res.json({ ok: false, error: 'Enter the 6-digit code' });
        }

        if (!rec) return res.json({ ok: false, error: 'Code expired. Tap resend.' });
        if (Date.now() > rec.expires) { otpStore.delete(key); return res.json({ ok: false, error: 'Code expired. Tap resend.' }); }
        if (rec.attempts >= OTP_MAX_ATTEMPTS) { otpStore.delete(key); return res.json({ ok: false, error: 'Too many attempts. Tap resend.' }); }
        if (entered === rec.code) { otpStore.delete(key); return onVerified(); }
        rec.attempts += 1; otpStore.set(key, rec);
        return res.json({ ok: false, error: 'Incorrect code. Try again.' });
    } catch (e) {
        console.error('[otp/email/verify] error:', e.message);
        res.status(500).json({ ok: false, error: 'OTP service error' });
    }
});

// ─────────────────────────────────────────────────────────────
// IP → COUNTRY — sets the phone/email picker default so US/UK/AE visitors
// don't land on +91. Prefers a CDN country header, else a free IP lookup.
// ─────────────────────────────────────────────────────────────
const _geoCache = new Map();   // ip → { country, at }
async function ipCountry(ip) {
    const clean = String(ip || '').replace(/^::ffff:/, '').split(',')[0].trim();
    if (!clean || clean === '127.0.0.1' || clean === '::1'
        || /^10\./.test(clean) || /^192\.168\./.test(clean) || /^172\.(1[6-9]|2\d|3[01])\./.test(clean)) return null;
    const hit = _geoCache.get(clean);
    if (hit && Date.now() - hit.at < 24 * 3600 * 1000) return hit.country;
    if (_geoCache.size > 5000) _geoCache.clear();   // bound memory against XFF rotation
    try {
        const txt = await fetch(`https://ipapi.co/${encodeURIComponent(clean)}/country/`, { signal: AbortSignal.timeout(3500) })
            .then(r => r.ok ? r.text() : '').catch(() => '');
        const country = /^[A-Z]{2}$/.test((txt || '').trim()) ? txt.trim() : null;
        if (country) { _geoCache.set(clean, { country, at: Date.now() }); return country; }
    } catch (_e) { /* graceful: frontend falls back to locale */ }
    return null;
}
app.get('/api/geo', rateLimit('geo'), async (req, res) => {
    try {
        const hdr = String(req.headers['cf-ipcountry'] || req.headers['x-vercel-ip-country'] || req.headers['x-geo-country'] || '').toUpperCase();
        let country = (/^[A-Z]{2}$/.test(hdr) && hdr !== 'XX') ? hdr : null;
        if (!country) country = await ipCountry(req.ip);
        res.json({ country: country || null });
    } catch (_e) {
        res.json({ country: null });
    }
});

// ─────────────────────────────────────────────────────────────
// SEND REPORT BY EMAIL — opt-in "email me a copy" from the report CTA.
// ─────────────────────────────────────────────────────────────
app.post('/api/send-report', rateLimit('sendrep'), async (req, res) => {
    try {
        const { sessionId, email } = req.body || {};
        if (!/^[a-z0-9]{6,32}$/i.test(String(sessionId || ''))) return res.status(400).json({ ok: false, error: 'Invalid session' });
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(email || ''))) return res.status(400).json({ ok: false, error: 'Enter a valid email' });

        const reportPath = path.join(REPORTS_DIR, `${sessionId}.json`);
        if (!fs.existsSync(reportPath)) return res.status(404).json({ ok: false, error: 'Report not ready yet' });
        let report = {};
        try { report = JSON.parse(fs.readFileSync(reportPath, 'utf8')); } catch (_e) {}

        if (!messaging.isEmailConfigured()) {
            return res.status(503).json({ ok: false, error: 'Email delivery is not configured yet.' });
        }
        const reportUrl = absoluteUrl(`${BASE_PATH}/api/report/${sessionId}`, req);
        const r = await messaging.sendReportEmail({
            email,
            name: report.ownerName || report._rawLead?.name || '',
            clinic: report.clinicName || report._rawLead?.clinicName || '',
            reportUrl
        });
        if (!r.ok && !r.skipped) return res.status(502).json({ ok: false, error: 'Could not send email. Try again.' });
        res.json({ ok: true });
    } catch (e) {
        console.error('[send-report] error:', e.message);
        res.status(500).json({ ok: false, error: 'Email service error' });
    }
});

// ─────────────────────────────────────────────────────────────
// WEBSITE PREVIEW — fetch title, description, favicon from a URL
// ─────────────────────────────────────────────────────────────
// LEAD MAGNET — entry / exit-intent popup capture (soft leads)
// ─────────────────────────────────────────────────────────────
app.post('/api/lead-magnet', rateLimit('popup'), async (req, res) => {
    try {
        const { name, phone, email, source, sessionId, utmSource, utmCampaign, referrer } = req.body || {};
        if (!phone && !email) return res.status(400).json({ error: 'Phone or email required' });
        const ipHash = crypto.createHash('sha256').update(req.ip || 'unknown').digest('hex').slice(0, 16);
        await db.insertPopupLead({ name, phone, email, source, sessionId, utmSource, utmCampaign, referrer, ipHash });
        sendToWebhook('popup-lead', `${source || 'popup'} · ${name || ''} · ${phone || email}`, { name, phone, email, source });
        res.json({ ok: true });
    } catch (e) {
        console.error('[lead-magnet] error:', e.message);
        res.status(500).json({ error: 'Could not save' });
    }
});

// ─────────────────────────────────────────────────────────────
// Secure intake webhook — receives clinic leads handed off from the main
// GrowClinic site (www.growclinic.io). Protected by a shared secret so only
// our own site can post here. Set INTAKE_SECRET (env) to match the main site's
// AUDIT_WEBHOOK_SECRET. Admin "Tracking" setting INTAKE_SECRET overrides env.
app.post('/api/intake', async (req, res) => {
    try {
        const expected = (db.getSetting('INTAKE_SECRET') || process.env.INTAKE_SECRET || '').trim();
        const provided = (req.get('x-growclinic-signature') || req.get('x-intake-secret') || '').trim();

        if (!expected) {
            console.error('[intake] no INTAKE_SECRET configured — rejecting');
            return res.status(503).json({ error: 'Intake not configured' });
        }
        // constant-time comparison
        const a = Buffer.from(expected);
        const b = Buffer.from(provided);
        const ok = a.length === b.length && crypto.timingSafeEqual(a, b);
        if (!ok) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const lead = req.body?.lead || req.body || {};
        const channels = req.body?.scores?.channels;
        const ads = Array.isArray(channels) ? channels.join(', ') : (channels || '');

        await db.insertLead({
            name: lead.fullName || lead.name || '',
            clinicName: lead.clinicName || '',
            clinicType: lead.specialization || lead.clinicType || '',
            city: lead.city || '',
            website: lead.website || '',
            phone: lead.phone || '',
            ads,
            primaryGoal: 'growclinic-site',
            auditScore: 0,
            reportUrl: ''
        });

        // mirror to the tool's own outbound webhook / CRM if configured
        try {
            sendToWebhook(
                `intake_${Date.now()}`,
                `Site handoff · ${lead.clinicName || ''} · ${lead.city || ''}`,
                null,
                { name: lead.fullName, phone: lead.phone, clinicName: lead.clinicName, city: lead.city, source: 'growclinic-site' }
            );
        } catch { /* non-blocking */ }

        // Mint a one-time token so the site can redirect the visitor into the
        // interactive tool WITHOUT putting any PII in the URL.
        const handoffToken = await createHandoffToken({
            name:      lead.fullName || lead.name || '',
            clinic:    lead.clinicName || '',
            specialty: lead.specialization || lead.clinicType || '',
            city:      lead.city || '',
            phone:     lead.phone || '',
            website:   lead.website || ''
        });

        return res.json({
            ok: true,
            handoffToken,
            handoffUrl: `${(PUBLIC_URL || '').replace(/\/$/, '')}/?t=${handoffToken}`
        });
    } catch (e) {
        console.error('[intake] error:', e.message);
        return res.status(500).json({ error: 'Could not save' });
    }
});

// ─────────────────────────────────────────────────────────────
// Secure handoff fetch — the tool exchanges the one-time token from the URL
// for the prefill data. Single-use + short TTL, so a leaked token is useless.
// ─────────────────────────────────────────────────────────────
app.get('/api/handoff/:token', rateLimit('lookup'), async (req, res) => {
    const data = await tokenStore.takeOnce('handoff', req.params.token); // consumed immediately (one-time)
    if (!data) return res.json({ found: false });
    res.json({ found: true, ...data });
});

// ─────────────────────────────────────────────────────────────
// PageSpeed warm-up — kicked off in parallel during the form handoff so the
// final report doesn't have to wait on a fresh website scan.
// ─────────────────────────────────────────────────────────────
app.post('/api/pagespeed-warm', rateLimit('preview'), (req, res) => {
    const { sessionId, url } = req.body || {};
    if (!url || !sessionId) return res.json({ ok: false });
    res.json({ ok: true });   // respond immediately; scan runs in the background
    fetchPageSpeedData(url, sessionId)
        .then(data => { pageSpeedWarmCache[sessionId] = { url, data, at: Date.now() }; })
        .catch(() => {});
});

// ─────────────────────────────────────────────────────────────
app.post('/api/website-preview', rateLimit('preview'), async (req, res) => {
    let { url: inputUrl } = req.body;
    if (!inputUrl || inputUrl.length < 4) return res.json({ found: false });

    let url = inputUrl.trim();
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url;

    // Reject URLs without a valid TLD (e.g. "vhcahairclinic" without .com)
    const hostMatch = url.match(/^https?:\/\/([^\/]+)/i);
    const host = hostMatch ? hostMatch[1] : '';
    if (!/\.[a-z]{2,}$/i.test(host)) {
        return res.json({
            found: false,
            reason: 'invalid_domain',
            message: 'Domain needs a valid extension like .com, .in, .org'
        });
    }

    // SSRF guard: refuse internal addresses
    try {
        await assertSafeUrl(url);
    } catch (e) {
        console.warn('[website-preview] blocked SSRF attempt:', url, '|', e.message);
        return res.json({ found: false, reason: 'unsafe_url', message: e.message });
    }

    try {
        const response = await fetch(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; GrowClinic-Audit/1.0)' },
            signal: AbortSignal.timeout(6000),
            redirect: 'manual'  // don't auto-follow — we'll re-validate any redirect host
        });

        // Reject 3xx redirects to avoid SSRF via redirect chains
        if (response.status >= 300 && response.status < 400) {
            return res.json({ found: false, reason: 'redirect_blocked', message: 'Site redirects — please paste the final URL' });
        }

        const html = await readBodyCapped(response, 2 * 1024 * 1024);

        // Extract title
        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        const title = titleMatch ? titleMatch[1].trim().substring(0, 80) : null;

        // Extract meta description
        const descMatch = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)
            || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i);
        const description = descMatch ? descMatch[1].trim().substring(0, 160) : null;

        // Extract og:image for preview
        const ogImgMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
            || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
        const ogImage = ogImgMatch ? ogImgMatch[1] : null;

        // Extract favicon
        const faviconMatch = html.match(/<link[^>]+rel=["'](?:shortcut )?icon["'][^>]+href=["']([^"']+)["']/i)
            || html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["'](?:shortcut )?icon["']/i);
        let favicon = faviconMatch ? faviconMatch[1] : null;
        if (favicon && !favicon.startsWith('http')) {
            const base = new URL(url);
            favicon = favicon.startsWith('/') ? `${base.origin}${favicon}` : `${base.origin}/${favicon}`;
        }
        if (!favicon) {
            favicon = `${new URL(url).origin}/favicon.ico`;
        }

        const domain = new URL(url).hostname.replace(/^www\./, '');

        res.json({
            found: true,
            title: title || domain,
            description,
            ogImage,
            favicon,
            domain,
            url
        });
    } catch (e) {
        console.error('[Website Preview] Error:', e.message);
        // Still return basic info from the URL itself
        try {
            const domain = new URL(url).hostname.replace(/^www\./, '');
            res.json({ found: true, title: domain, description: null, ogImage: null, favicon: `${new URL(url).origin}/favicon.ico`, domain, url });
        } catch {
            res.json({ found: false });
        }
    }
});

// ─────────────────────────────────────────────────────────────
// ADMIN AUTH + DASHBOARD API
// ─────────────────────────────────────────────────────────────
const ADMIN_COOKIE = 'gc_admin';
const MAX_FAILED_ATTEMPTS = 8;   // 15-minute window
const LOGIN_LOCKOUT_MIN = 15;

function ipHashOf(req) {
    return crypto.createHash('sha256').update(req.ip || 'unknown').digest('hex').slice(0, 16);
}

function setAdminCookie(res, token, expiresAt) {
    const isProd = process.env.NODE_ENV === 'production';
    const parts = [
        `${ADMIN_COOKIE}=${token}`,
        `Path=/`,
        `HttpOnly`,
        `SameSite=Strict`,
        `Expires=${new Date(expiresAt).toUTCString()}`
    ];
    if (isProd) parts.push('Secure');
    res.setHeader('Set-Cookie', parts.join('; '));
}

function clearAdminCookie(res) {
    res.setHeader('Set-Cookie', `${ADMIN_COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Expires=Thu, 01 Jan 1970 00:00:00 GMT`);
}

// Validate session, attach req.user = { userId, role, username }
async function requireAuth(req, res, next) {
    const token = req.cookies?.[ADMIN_COOKIE];
    const session = await db.validateAdminSession(token);
    if (!session) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    req.adminToken = token;
    req.user = session;
    next();
}

// Gate by role. requireRole('admin','manager') => admin OR manager allowed.
function requireRole(...roles) {
    return async function (req, res, next) {
        await requireAuth(req, res, () => {
            if (!roles.includes(req.user.role)) {
                return res.status(403).json({ error: 'Forbidden: insufficient permissions' });
            }
            next();
        });
    };
}

// Admin-only (full access). Kept as the strict default for sensitive endpoints.
const requireAdmin = requireRole('admin');

// Serve admin.html (login screen + dashboard live in same file)
app.get('/admin', (_req, res) => {
    const filePath = path.join(PUBLIC_DIR, 'admin.html');
    if (!fs.existsSync(filePath)) {
        console.error('[admin] admin.html missing at:', filePath);
        return res.status(500).send('Admin UI is not installed.');
    }
    res.sendFile('admin.html', { root: PUBLIC_DIR }, (err) => {
        if (err) {
            console.error('[admin] sendFile error:', err.message);
            try {
                const html = fs.readFileSync(filePath, 'utf8');
                res.setHeader('Content-Type', 'text/html; charset=utf-8');
                res.send(html);
            } catch (readErr) {
                res.status(500).send('Could not read admin UI: ' + readErr.message);
            }
        }
    });
});

// Login: rate-limited, scrypt-verified, optional TOTP 2FA
app.post('/admin/login', rateLimit('login'), async (req, res) => {
    const { username, password, totp } = req.body || {};
    const ip = ipHashOf(req);

    // Lockout check
    const fails = await db.recentFailedAttempts(ip, LOGIN_LOCKOUT_MIN);
    if (fails >= MAX_FAILED_ATTEMPTS) {
        return res.status(429).json({
            error: `Too many failed attempts. Try again in ${LOGIN_LOCKOUT_MIN} minutes.`
        });
    }

    if (!password || typeof password !== 'string') {
        db.recordLoginAttempt(ip, false);
        return res.status(400).json({ error: 'Password required' });
    }

    // Look up the user. Default to "admin" if no username supplied (back-compat).
    const uname = (username && String(username).trim()) || 'admin';
    const user = await db.getUserByUsername(uname);

    // Verify against the user record; fall back to the legacy single-password
    // hash only for the admin account so an existing deploy keeps working.
    let passwordOk = false;
    if (user && user.active) {
        passwordOk = db.verifyPassword(password, user.passwordHash);
    }
    if (!passwordOk && uname === 'admin' && (!user || !user.passwordHash)) {
        passwordOk = db.verifyPassword(password, db.getSetting('ADMIN_PASSWORD_HASH'));
    }

    if (!passwordOk) {
        db.recordLoginAttempt(ip, false);
        db.logAdminAction('login_failed', `Wrong credentials for "${uname}"`, ip);
        return setTimeout(() => res.status(401).json({ error: 'Invalid username or password' }), 600);
    }

    const role = user ? user.role : 'admin';

    // 2FA — a user's own enrolled TOTP always wins; the legacy global secret
    // still guards admin-role accounts that haven't enrolled their own yet.
    const user2fa = !!(user && user.totpEnabled && user.totpSecret);
    const legacySecret = process.env.DISABLE_2FA === 'true' ? null : db.getSetting('ADMIN_TOTP_SECRET');
    const legacyAdmin2fa = !user2fa && role === 'admin' && !!legacySecret;
    if (user2fa || legacyAdmin2fa) {
        if (!totp) {
            return res.status(401).json({ error: 'totp_required', needsTotp: true });
        }
        const secretToCheck = user2fa ? user.totpSecret : legacySecret;
        if (!db.verifyTotp(secretToCheck, String(totp).trim())) {
            db.recordLoginAttempt(ip, false);
            return setTimeout(() => res.status(401).json({ error: 'Invalid 2FA code' }), 600);
        }
    }

    db.recordLoginAttempt(ip, true);
    db.logAdminAction('login', `${uname} signed in (${role})`, ip);
    if (user) db.touchUserLogin(user.id);
    // Sign-in alert (LOGIN_ALERTS=on, off by default) — fire-and-forget so it
    // can NEVER slow down or block a login.
    try {
        if (db.getSetting('LOGIN_ALERTS') === 'on' && messaging.isEmailConfigured()) {
            notifyRecipients('signin_alert').then(list => {
                for (const alertTo of list) {
                    messaging.sendSystemEmail({
                        email: alertTo,
                        subject: `[GrowClinic] Sign-in: ${uname} (${role})`,
                        text: `${uname} (${role}) signed in to the GrowClinic admin panel.\nTime: ${new Date().toLocaleString()}\nIP hash: ${String(ip).slice(0, 8)}`
                    }).catch(() => {});
                }
            }).catch(() => {});
        }
    } catch (_e) { /* never block login */ }
    const { token, expiresAt } = await db.createAdminSession(ip, user ? user.id : null, role);
    setAdminCookie(res, token, expiresAt);
    res.json({ ok: true, role, username: uname, userId: user ? user.id : null, totpEnabled: !!(user2fa || legacyAdmin2fa) });
});

// Generate a fresh TOTP secret (must be confirmed before activation)
app.post('/admin/2fa/setup', requireAdmin, (_req, res) => {
    const secret = db.generateTotpSecret();
    // Store as pending until user confirms with a code
    db.setSetting('ADMIN_TOTP_PENDING', secret);
    const uri = db.getTotpUri(secret);
    res.json({ secret, uri });
});

// Verify a code against the pending secret and activate 2FA
app.post('/admin/2fa/activate', requireAdmin, async (req, res) => {
    const { code } = req.body || {};
    const pending = db.getSetting('ADMIN_TOTP_PENDING');
    if (!pending) return res.status(400).json({ error: 'No pending TOTP setup. Click Setup again.' });
    if (!db.verifyTotp(pending, String(code || '').trim())) {
        return res.status(401).json({ error: 'Invalid code. Try again.' });
    }
    db.setSetting('ADMIN_TOTP_SECRET', pending);
    await db.deleteSettings(['ADMIN_TOTP_PENDING']);
    db.logAdminAction('2fa_enabled', 'TOTP activated', ipHashOf(req));
    res.json({ ok: true });
});

// Disable 2FA (requires current password to confirm)
app.post('/admin/2fa/disable', requireAdmin, async (req, res) => {
    const { currentPassword } = req.body || {};
    const stored = db.getSetting('ADMIN_PASSWORD_HASH');
    if (!db.verifyPassword(currentPassword || '', stored)) {
        return res.status(401).json({ error: 'Password required to disable 2FA' });
    }
    await db.deleteSettings(['ADMIN_TOTP_SECRET', 'ADMIN_TOTP_PENDING']);
    db.logAdminAction('2fa_disabled', 'TOTP disabled', ipHashOf(req));
    res.json({ ok: true });
});

app.get('/admin/2fa/status', requireAdmin, (_req, res) => {
    res.json({ enabled: !!db.getSetting('ADMIN_TOTP_SECRET') });
});

app.post('/admin/logout', (req, res) => {
    const token = req.cookies?.[ADMIN_COOKIE];
    db.logAdminAction('logout', 'Admin signed out', ipHashOf(req));
    db.deleteAdminSession(token);
    clearAdminCookie(res);
    res.json({ ok: true });
});

app.get('/admin/me', async (req, res) => {
    const token = req.cookies?.[ADMIN_COOKIE];
    const session = await db.validateAdminSession(token);
    if (!session) return res.json({ authenticated: false });
    // Soft 2FA policy: when REQUIRE_2FA_ADMINS is on, admin-role users without
    // their own TOTP see a reminder banner (no hard lockout).
    // totpEnabled reflects THIS account's own 2FA (legacy sessions without a
    // user row fall back to the global admin secret).
    let needs2faSetup = false;
    let totpEnabled = false;
    if (session.userId) {
        try {
            const u = await db.getUserById(session.userId);
            totpEnabled = !!(u && u.totpEnabled);
            if (session.role === 'admin' && db.getSetting('REQUIRE_2FA_ADMINS') === 'on') {
                needs2faSetup = !totpEnabled;
            }
        } catch (_e) { /* best-effort */ }
    } else if (session.role === 'admin') {
        totpEnabled = !!db.getSetting('ADMIN_TOTP_SECRET');
    }
    res.json({ authenticated: true, role: session.role, username: session.username, userId: session.userId, needs2faSetup, totpEnabled });
});

// Rotate admin password (requires current password)
app.post('/admin/change-password', requireAdmin, async (req, res) => {
    const { currentPassword, newPassword } = req.body || {};
    const stored = db.getSetting('ADMIN_PASSWORD_HASH');
    if (!db.verifyPassword(currentPassword || '', stored)) {
        return res.status(401).json({ error: 'Current password is wrong' });
    }
    if (!newPassword || newPassword.length < 8) {
        return res.status(400).json({ error: 'New password must be at least 8 characters' });
    }
    try {
        await db.rotateAdminPassword(newPassword);
        // Keep the admin user record in sync (login checks the user table first).
        if (req.user?.userId) await db.setUserPassword(req.user.userId, newPassword);
        db.logAdminAction('password_change', 'Admin password rotated', ipHashOf(req));
        clearAdminCookie(res);
        res.json({ ok: true, message: 'Password updated. Please log in again.' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ─────────────────────────────────────────────────────────────
// MY PROFILE — self-service for EVERY role. All routes operate on
// req.user.userId only; no ids are accepted from the client.
// Secrets are never echoed back (TOTP secret is shown once, at setup).
// ─────────────────────────────────────────────────────────────
app.get('/admin/profile', requireAuth, async (req, res) => {
    if (!req.user.userId) {
        // Legacy admin session with no user row (pre multi-user token)
        return res.json({
            username: req.user.username, role: req.user.role, email: null,
            lastLoginAt: null, createdAt: null,
            totpEnabled: !!db.getSetting('ADMIN_TOTP_SECRET')
        });
    }
    const u = await db.getUserById(req.user.userId);
    if (!u) return res.status(404).json({ error: 'User not found' });
    const wp = await db.getWorkspaceProfile(req.user.userId).catch(() => null);
    res.json({
        username: u.username, role: u.role, email: u.email || null,
        lastLoginAt: u.lastLoginAt || null, createdAt: u.createdAt || null,
        totpEnabled: !!u.totpEnabled,
        // Merged identity fields (single unified profile surface)
        displayName: wp?.displayName || u.username,
        avatarUrl: wp?.avatarUrl || '',
        designation: wp?.designation || '',
        department: wp?.department || '',
        linkedin: wp?.linkedin || '',
        phone: wp?.phone || '',
        location: wp?.location || '',
        joinDate: wp?.joinDate || ''
    });
});

// Change own password (current password required; all own sessions invalidated)
app.post('/admin/profile/password', requireAuth, async (req, res) => {
    const { currentPassword, newPassword } = req.body || {};
    if (!req.user.userId) return res.status(400).json({ error: 'No user record on this session. Log out and back in.' });
    if (!newPassword || String(newPassword).length < 8) {
        return res.status(400).json({ error: 'New password must be at least 8 characters' });
    }
    const u = await db.getUserById(req.user.userId);
    if (!u || !db.verifyPassword(currentPassword || '', u.passwordHash)) {
        return res.status(401).json({ error: 'Current password is wrong' });
    }
    try {
        await db.setUserPassword(req.user.userId, String(newPassword)); // also deletes this user's sessions
        // Keep the legacy single-password hash in sync for the seeded admin
        // account (login falls back to it) — same as /admin/change-password.
        if (u.username === 'admin') await db.rotateAdminPassword(String(newPassword));
        db.logAdminAction('password_change', `${u.username} changed own password`, ipHashOf(req));
        clearAdminCookie(res);
        res.json({ ok: true, message: 'Password updated. Please log in again.' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Set own email (used for calendar invites on follow-ups). Blank clears it.
app.post('/admin/profile/email', requireAuth, async (req, res) => {
    if (!req.user.userId) return res.status(400).json({ error: 'No user record on this session. Log out and back in.' });
    const em = String((req.body || {}).email || '').trim();
    if (em && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) {
        return res.status(400).json({ error: 'Invalid email address' });
    }
    try {
        const r = await db.setUserEmail(req.user.userId, em);
        db.logAdminAction('profile_email', `${req.user.username} updated own email`, ipHashOf(req));
        res.json({ ok: true, email: (r && r.email !== undefined) ? r.email : (em || null) });
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

// Start own 2FA enrolment — the ONLY time the secret is returned.
app.post('/admin/profile/2fa/setup', requireAuth, async (req, res) => {
    if (!req.user.userId) return res.status(400).json({ error: 'No user record on this session. Log out and back in.' });
    const secret = db.generateTotpSecret();
    await db.setUserTotpPending(req.user.userId, secret);
    const uri = db.getTotpUri(secret, `GrowClinic CRM (${req.user.username})`);
    res.json({ secret, uri });
});

// Confirm the pending secret with a live code → 2FA on for this user.
app.post('/admin/profile/2fa/activate', requireAuth, async (req, res) => {
    if (!req.user.userId) return res.status(400).json({ error: 'No user record on this session. Log out and back in.' });
    const u = await db.getUserById(req.user.userId);
    if (!u || !u.totpPending) return res.status(400).json({ error: 'No pending 2FA setup. Click Enable again.' });
    const code = String((req.body || {}).code || '').trim();
    if (!db.verifyTotp(u.totpPending, code)) {
        return res.status(401).json({ error: 'Invalid code. Try again.' });
    }
    await db.activateUserTotp(req.user.userId);
    db.logAdminAction('2fa_user_enabled', `${req.user.username} enabled 2FA`, ipHashOf(req));
    res.json({ ok: true });
});

// Turn own 2FA off (current password required).
app.post('/admin/profile/2fa/disable', requireAuth, async (req, res) => {
    if (!req.user.userId) return res.status(400).json({ error: 'No user record on this session. Log out and back in.' });
    const u = await db.getUserById(req.user.userId);
    if (!u || !db.verifyPassword(String((req.body || {}).currentPassword || ''), u.passwordHash)) {
        return res.status(401).json({ error: 'Password required to disable 2FA' });
    }
    await db.disableUserTotp(req.user.userId);
    // Legacy cleanup: admins may still have the old GLOBAL secret from the
    // pre-per-user era (Security-tab wizard). Login enforces it for admin
    // role, so clear it too — otherwise "disable" appears not to work.
    if (req.user.role === 'admin') {
        await db.deleteSettings(['ADMIN_TOTP_SECRET', 'ADMIN_TOTP_PENDING'])
            .catch(e => console.warn('[2fa] legacy secret cleanup failed:', e.message));
    }
    db.logAdminAction('2fa_user_disabled', `${req.user.username} disabled 2FA`, ipHashOf(req));
    res.json({ ok: true });
});

// ── Require-2FA-for-admins policy (soft — banner in the UI, no lockout) ──
app.get('/admin/security/require-2fa', requireAdmin, (_req, res) => {
    res.json({ enabled: db.getSetting('REQUIRE_2FA_ADMINS') === 'on' });
});
app.post('/admin/security/require-2fa', requireAdmin, async (req, res) => {
    const enabled = !!(req.body && req.body.enabled);
    if (enabled) db.setSetting('REQUIRE_2FA_ADMINS', 'on');
    else await db.deleteSettings(['REQUIRE_2FA_ADMINS']).catch(e => console.warn('[security] delete failed:', e.message));
    db.logAdminAction('require_2fa_toggle', enabled ? 'enabled' : 'disabled', ipHashOf(req));
    res.json({ ok: true, enabled });
});

// ─────────────────────────────────────────────────────────────
// EMPLOYEE WORKSPACE (Phase 1) — the logged-in user's own dashboard.
// Any authenticated team member has a workspace; data is scoped to req.user.
// ─────────────────────────────────────────────────────────────
app.get('/admin/workspace', requireAuth, async (req, res) => {
    try {
        const uid = req.user.userId;
        if (!uid) return res.status(400).json({ error: 'No user record on this session. Log out and back in.' });
        const [profile, stats, today, attendance] = await Promise.all([
            db.getWorkspaceProfile(uid),
            db.getWorkspaceStats(uid),
            db.getTodayCheckins(uid),
            db.getAttendancePct(uid, 30)
        ]);
        res.json({ profile, stats, today, attendancePct: attendance, xpRules: db.XP_EVENTS });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Morning / evening check-in. Completing it awards XP and (morning) records
// attendance for today. Idempotent per day/type.
app.post('/admin/workspace/checkin', requireAuth, async (req, res) => {
    try {
        const uid = req.user.userId;
        if (!uid) return res.status(400).json({ error: 'No user record on this session.' });
        const b = req.body || {};
        const type = b.type === 'evening' ? 'evening' : 'morning';
        const payload = type === 'morning'
            ? { priorities: Array.isArray(b.priorities) ? b.priorities.slice(0, 3).map(s => String(s).slice(0, 240)) : [], mood: String(b.mood || '').slice(0, 24) }
            : { completed: String(b.completed || '').slice(0, 1000), carryForward: String(b.carryForward || '').slice(0, 1000), blockers: String(b.blockers || '').slice(0, 1000) };
        await db.saveCheckin(uid, type, payload);
        db.logAdminAction('checkin', `${req.user.username} ${type} check-in`, ipHashOf(req));
        const [today, profile] = await Promise.all([db.getTodayCheckins(uid), db.getWorkspaceProfile(uid)]);
        res.json({ ok: true, today, xp: profile.xp, level: profile.level, streak: profile.streak });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Update own workspace profile (display name, designation, department, avatar URL).
app.post('/admin/workspace/profile', requireAuth, async (req, res) => {
    try {
        const uid = req.user.userId;
        if (!uid) return res.status(400).json({ error: 'No user record on this session.' });
        const b = req.body || {};
        const fields = {};
        if (b.displayName !== undefined) fields.displayName = String(b.displayName).slice(0, 120);
        if (b.designation !== undefined) fields.designation = String(b.designation).slice(0, 120);
        if (b.department !== undefined) fields.department = String(b.department).slice(0, 120);
        if (b.phone !== undefined) fields.phone = String(b.phone).slice(0, 40);
        if (b.location !== undefined) fields.location = String(b.location).slice(0, 120);
        if (b.linkedin !== undefined) {
            const u = String(b.linkedin).trim();
            if (u && !/^https?:\/\//i.test(u)) return res.status(400).json({ error: 'LinkedIn must be a full https URL.' });
            fields.linkedin = u.slice(0, 255);
        }
        if (b.joinDate !== undefined) {
            const d = String(b.joinDate).trim();
            if (d && !/^\d{4}-\d{2}-\d{2}$/.test(d)) return res.status(400).json({ error: 'Join date must be YYYY-MM-DD.' });
            fields.joinDate = d;
        }
        if (b.avatarUrl !== undefined) {
            const u = String(b.avatarUrl).trim();
            if (u && !/^https?:\/\//i.test(u)) return res.status(400).json({ error: 'Avatar must be an https URL.' });
            fields.avatarUrl = u.slice(0, 512);
        }
        await db.updateWorkspaceProfile(uid, fields);
        res.json({ ok: true, profile: await db.getWorkspaceProfile(uid) });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/admin/stats', requireRole('admin', 'manager', 'caller', 'consultant', 'auditor', 'marketer'), async (_req, res) => {
    res.json(await db.getChatStats());
});

// ── Maintenance mode toggle ──────────────────────────────────
app.get('/admin/maintenance', requireAdmin, (_req, res) => {
    res.json({ enabled: db.getSetting('MAINTENANCE_MODE') === 'on' });
});
app.post('/admin/maintenance', requireAdmin, async (req, res) => {
    const enabled = !!(req.body && req.body.enabled);
    if (enabled) db.setSetting('MAINTENANCE_MODE', 'on');
    else await db.deleteSettings(['MAINTENANCE_MODE']).catch(e => console.warn('[maintenance] delete failed:', e.message));
    db.logAdminAction('maintenance_toggle', enabled ? 'enabled' : 'disabled', req.ip);
    res.json({ ok: true, enabled });
});

// ── Tracking / analytics IDs (GA4, Meta Pixel/CAPI, Google Ads, Clarity, GTM) ──
app.get('/admin/tracking', requireRole('admin', 'support', 'marketer'), (req, res) => {
    const isAdmin = req.user?.role === 'admin';
    const out = {};
    for (const k of TRACKING_KEYS) {
        if (!isAdmin && ADMIN_ONLY_TRACKING_KEYS.has(k)) continue;   // never expose SMTP/calendar creds to non-admins
        out[k] = db.getSetting(k) || '';
    }
    res.json(out);
});
app.post('/admin/tracking', requireRole('admin', 'support', 'marketer'), async (req, res) => {
    const body = req.body || {};
    const isAdmin = req.user?.role === 'admin';
    for (const k of TRACKING_KEYS) {
        if (!(k in body)) continue;
        if (!isAdmin && ADMIN_ONLY_TRACKING_KEYS.has(k)) continue;   // support/marketer cannot change SMTP/calendar config
        const v = String(body[k] || '').trim();
        if (v) db.setSetting(k, v);
        else await db.deleteSettings([k]).catch(e => console.warn('[tracking] delete failed:', e.message));
    }
    // New SMTP creds must take effect immediately — drop the cached transporter.
    if (Object.keys(body).some(k => k.startsWith('SMTP_'))) {
        try { messaging.resetTransporter(); } catch (e) { console.warn('[tracking] transporter reset failed:', e.message); }
    }
    db.logAdminAction('tracking_update', Object.keys(body).filter(k => TRACKING_KEYS.includes(k)).join(','), req.ip);
    res.json({ ok: true });
});

app.get('/admin/chats', requireRole('admin', 'manager', 'caller', 'consultant', 'auditor', 'marketer'), async (req, res) => {
    const { search, from, to } = req.query;
    const limit  = Math.min(parseInt(req.query.limit, 10)  || 200, 1000);
    const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);
    // Owner filter: callers are ALWAYS locked to their own leads (any client
    // filter that would widen the view is ignored server-side).
    let ownerId = null;
    if (req.user.role === 'caller') {
        ownerId = req.user.userId;
    } else if (req.query.ownerId !== undefined && req.query.ownerId !== '') {
        const n = Number(req.query.ownerId);
        if (Number.isFinite(n)) ownerId = n;
    }
    const rows = await db.listChatSessions({ search, from, to, limit, offset, ownerId });
    res.json({ total: rows.total ?? rows.length, offset, limit, rows });
});

// Lightweight team directory — safe for every role (id/username/role only).
// The admin-only GET /admin/users stays the management endpoint.
app.get('/admin/team', requireRole('admin', 'manager', 'caller', 'consultant', 'auditor', 'marketer'), async (_req, res) => {
    try {
        const users = await db.listAssignableUsers();
        res.json((users || []).map(u => ({ id: u.id, username: u.username, role: u.role })));
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Legacy pipeline names → the current telecaller stages, for display/compare
// only (the DB write-mapping lives in db.updateChatCrm).
const LEGACY_STAGE_READ = {
    called: 'phone_conversation', contacted: 'phone_conversation',
    qualified: 'meeting_scheduled', proposal: 'meeting_done',
    follow_up: 'decision_followup', won: 'onboarded', lost: 'not_interested'
};
const normStageName = s => LEGACY_STAGE_READ[String(s || '')] || String(s || '');

// Follow-up calendar invite — fire-and-forget email (.ics) to the team member
// who owns the follow-up. Silent no-op when SMTP or the email is missing.
function sendFollowUpInvite(sessionId, followUpAt, toUser, actor) {
    if (!followUpAt || !toUser || !toUser.email) return;
    (async () => {
        const row = await db.getChatSession(sessionId).catch(() => null);
        const who = (row && (row.clinicName || row.userName)) || sessionId;
        const desc = [row?.phone ? `Phone: ${row.phone}` : '', row?.crmNotes ? `Notes: ${row.crmNotes}` : '']
            .filter(Boolean).join('\n');
        const r = await messaging.sendCalendarInvite({
            email: toUser.email,
            title: `Follow up: ${who}`,
            startAt: followUpAt,
            durationMin: 30,
            description: desc,
            uid: `${sessionId}@growclinic`
        });
        if (r && r.ok) db.addLeadEvent(sessionId, 'update', `calendar invite sent to ${toUser.email}`, actor || 'system');
    })().catch(e => console.warn('[calendar] invite failed (non-critical):', e.message));
}

// "New lead assigned to you" email to the owning team member. Fire-and-forget,
// only on ASSIGN (never on unassign); silent no-op without SMTP or an email.
function notifyAssignment(userId, sessionId) {
    if (!userId || !sessionId) return;
    (async () => {
        if (!messaging.isEmailConfigured()) return;
        const u = await db.getUserById(userId).catch(() => null);
        if (!u || !u.email) return;
        const row = await db.getChatSession(sessionId).catch(() => null);
        const lead = row ? flatLead(row) : { sessionId };
        await messaging.sendAssignmentEmail({
            email: u.email, username: u.username, lead, adminUrl: absoluteUrl('/admin')
        });
    })().catch(e => console.warn('[assign-email] failed (non-critical):', e.message));
}

// CRM-lite: update a lead's working status ('' | new | phone_conversation |
// meeting_scheduled | meeting_done | decision_followup | not_responding |
// not_interested | onboarded) and/or free-text notes. Callers can work leads too.
// Manually add a prospect (the CRM's "New Prospect" form).
app.post('/admin/prospects', requireRole('admin', 'manager', 'caller', 'consultant'), async (req, res) => {
    try {
        const b = req.body || {};
        const name = String(b.name || '').trim(), clinic = String(b.clinic || '').trim();
        if (!name && !clinic && !String(b.phone || '').trim()) {
            return res.status(400).json({ error: 'Give at least a name, clinic or phone' });
        }
        // Dedupe: refuse to create a second lead for a phone we already have.
        const phoneRaw = String(b.phone || '').trim();
        if (phoneRaw) {
            const e164 = normalizePhoneE164(phoneRaw);
            const existing = e164 ? await db.findLeadByPhone(e164).catch(() => null) : null;
            if (existing) {
                return res.status(409).json({
                    error: `Duplicate: existing lead ${existing.clinicName || existing.userName || existing.sessionId}`,
                    sessionId: existing.sessionId
                });
            }
        }
        const sessionId = 'man' + crypto.randomBytes(6).toString('hex');
        db.trackChatActivity(sessionId, {
            userName: name || null, clinicName: clinic || null,
            phone: String(b.phone || '').trim() || null,
            email: String(b.email || '').trim().slice(0, 255) || null,
            city: String(b.city || '').trim() || null,
            country: String(b.country || '').trim().slice(0, 64) || null,
            specialty: String(b.specialty || '').trim().slice(0, 120) || null,
            websiteUrl: String(b.website || '').trim() || null,
            source: String(b.source || 'manual').slice(0, 64), channel: String(b.source || 'manual').slice(0, 64),
            leadCaptured: 1, completed: 1
        });
        // trackChatActivity writes async — apply the CRM fields once the row exists.
        setTimeout(() => db.updateChatCrm(sessionId, {
            status: b.status || 'new', notes: b.notes, followUpAt: b.followUpAt,
            rating: b.rating, dealValue: b.dealValue
        }).catch(e => console.warn('[prospect] crm fields:', e.message)), 600);
        // Owner assignment: callers always own their manually created prospects;
        // admin/manager may pick anyone from the team (ownerId in the body).
        let ownerId = null;
        if (req.user?.role === 'caller') ownerId = req.user.userId || null;
        else if (b.ownerId !== undefined && b.ownerId !== null && b.ownerId !== '') {
            const n = Number(b.ownerId);
            if (Number.isFinite(n)) ownerId = n;
        }
        if (ownerId !== null) {
            setTimeout(() => (async () => {
                await db.setLeadOwner(sessionId, ownerId);
                const owner = await db.getUserById(ownerId).catch(() => null);
                db.addLeadEvent(sessionId, 'assign',
                    `assigned to ${owner?.username || ('user #' + ownerId)}`, req.user?.username || 'admin');
                notifyAssignment(ownerId, sessionId);
            })().catch(e => console.warn('[prospect] owner assign:', e.message)), 650);
        }
        // Follow-up set at creation → calendar invite to the owner (their email),
        // falling back to the acting user. Fire-and-forget after the CRM write.
        if (b.followUpAt) {
            setTimeout(() => (async () => {
                let toUser = ownerId !== null ? await db.getUserById(ownerId).catch(() => null) : null;
                if (!toUser?.email && req.user?.userId) {
                    toUser = await db.getUserById(req.user.userId).catch(() => null);
                }
                sendFollowUpInvite(sessionId, b.followUpAt, toUser, req.user?.username || 'admin');
            })().catch(() => {}), 900);
        }
        db.logAdminAction('prospect_create', `${clinic || name} by ${req.user?.username}`, ipHashOf(req));
        setTimeout(() => db.addLeadEvent(sessionId, 'created', `manual prospect by ${req.user?.username || 'admin'}`, req.user?.username || 'admin'), 700);
        setTimeout(() => sendCrmEvent('lead.created', sessionId, { via: 'manual' }), 800);
        // After the CRM fields land (600ms above) so conditions see the real stage.
        setTimeout(() => { try { runAutomations('lead.created', sessionId).catch(() => {}); } catch (_e) {} }, 900);
        res.json({ ok: true, sessionId });
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

app.patch('/admin/chats/:sessionId', requireRole('admin', 'manager', 'caller', 'consultant'), async (req, res) => {
    try {
        const { status, notes, followUpAt, rating, dealValue, remark, lostReason, tags, ownerId } = req.body || {};
        const sid = req.params.sessionId;
        const actor = req.user?.username || 'team';
        let changed = 0;
        // Caller lockdown: callers can never reassign, and can only touch
        // leads that are assigned to them.
        if (req.user?.role === 'caller') {
            if (ownerId !== undefined) {
                return res.status(403).json({ error: 'Forbidden: callers cannot reassign leads' });
            }
            const own = await db.getChatSession(sid).catch(() => null);
            if (!own || own.ownerId !== req.user.userId) {
                return res.status(403).json({ error: 'Forbidden: lead is not assigned to you' });
            }
        }
        // Snapshot the current stage BEFORE writing so the timeline shows old → new.
        const prev = status !== undefined ? await db.getChatSession(sid).catch(() => null) : null;
        // Ownership change (admin/manager only — enforced above for callers).
        if (ownerId !== undefined) {
            const newOwner = (ownerId === null || ownerId === '') ? null : Number(ownerId);
            let ownerName = null;
            if (newOwner !== null) {
                if (!Number.isFinite(newOwner)) return res.status(400).json({ error: 'Invalid ownerId' });
                const team = await db.listAssignableUsers();
                const u = (team || []).find(x => x.id === newOwner);
                if (!u) return res.status(400).json({ error: 'Unknown or inactive owner' });
                ownerName = u.username;
            }
            const r = await db.setLeadOwner(sid, newOwner);
            changed += r.changes;
            if (r.changes) {
                db.addLeadEvent(sid, 'assign', newOwner === null ? 'unassigned' : `assigned to ${ownerName}`, actor);
                db.logAdminAction('lead_assign', `${sid} → ${newOwner === null ? 'unassigned' : ownerName} by ${actor}`, ipHashOf(req));
                if (newOwner !== null) notifyAssignment(newOwner, sid);
            }
        }
        if (remark !== undefined) {
            const rr = await db.addChatRemark(sid, actor, remark);
            changed += rr.changes;
            if (rr.changes) db.addLeadEvent(sid, 'remark', String(remark).trim().slice(0, 80), actor);
        }
        if ([status, notes, followUpAt, rating, dealValue, lostReason, tags].some(v => v !== undefined)) {
            const r = await db.updateChatCrm(sid, { status, notes, followUpAt, rating, dealValue, lostReason, tags });
            changed += r.changes;
            if (r.changes) {
                const oldStage = normStageName(prev?.crmStatus) || 'new';
                const newStage = normStageName(status) || 'new';
                if (status !== undefined && newStage !== oldStage) {
                    db.addLeadEvent(sid, 'stage', `${oldStage} → ${newStage}${newStage === 'not_interested' && lostReason ? ` (${lostReason})` : ''}`, actor);
                    // Automations: stage moved — fire-and-forget, never blocks the response.
                    setTimeout(() => { try { runAutomations('stage.changed', sid, { newStage }).catch(() => {}); } catch (_e) {} }, 500);
                }
                const upd = [rating !== undefined && 'rating', dealValue !== undefined && 'deal value',
                             followUpAt !== undefined && 'follow-up', notes !== undefined && 'notes',
                             tags !== undefined && 'tags'].filter(Boolean);
                if (upd.length) db.addLeadEvent(sid, 'update', upd.join(', ') + ' updated', actor);
                // Follow-up scheduled/changed/cleared → email invite (.ics) + real
                // Google Calendar event when a Google account is connected.
                if (followUpAt !== undefined) {
                    (async () => {
                        const me = req.user?.userId ? await db.getUserById(req.user.userId).catch(() => null) : null;
                        if (followUpAt) sendFollowUpInvite(sid, followUpAt, me, actor);
                        const row = await db.getChatSession(sid).catch(() => null);
                        const who = (row && (row.clinicName || row.userName)) || sid;
                        const desc = [row?.phone ? `Phone: ${row.phone}` : '', row?.crmNotes ? `Notes: ${row.crmNotes}` : '', absoluteUrl('/admin')].filter(Boolean).join('\n');
                        syncLeadCalendar(sid, {
                            startAt: followUpAt || null,
                            summary: `GrowClinic: ${who}`,
                            description: desc,
                            durationMin: 30,
                            attendees: me && me.email ? [me.email] : []
                        });
                    })().catch(() => {});
                }
            }
        }
        if (!changed) return res.status(404).json({ error: 'Lead not found or nothing to update' });
        db.logAdminAction('lead_update', `${sid}: ${[status !== undefined && `status=${status}`, lostReason !== undefined && `lost=${lostReason}`, notes !== undefined && 'notes', tags !== undefined && 'tags', followUpAt !== undefined && 'follow-up'].filter(Boolean).join(', ')}`, ipHashOf(req));
        sendCrmEvent('lead.updated', sid, { via: 'admin', by: req.user?.username || 'admin' });
        res.json({ ok: true });
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

// Round-robin auto-assignment of leads to active callers. The cursor lives in
// settings (ASSIGN_RR_CURSOR) so distribution stays fair across requests.
app.post('/admin/assign-auto', requireRole('admin', 'manager'), async (req, res) => {
    try {
        const ids = Array.isArray(req.body?.sessionIds)
            ? req.body.sessionIds.filter(Boolean).map(s => String(s).slice(0, 64)).slice(0, 500)
            : [];
        if (!ids.length) return res.status(400).json({ error: 'sessionIds required' });
        const callers = (await db.listAssignableUsers() || [])
            .filter(u => u.role === 'caller')
            .sort((a, b) => a.id - b.id);
        if (!callers.length) return res.status(400).json({ error: 'No active callers' });
        let cursor = Number(db.getSetting('ASSIGN_RR_CURSOR') || 0) || 0;
        const actor = req.user?.username || 'admin';
        const assigned = [];
        for (const sid of ids) {
            const u = callers[cursor % callers.length];
            cursor = (cursor + 1) % callers.length;
            await db.setLeadOwner(sid, u.id);
            db.addLeadEvent(sid, 'assign', `assigned to ${u.username} (round-robin)`, actor);
            db.logAdminAction('lead_assign', `${sid} → ${u.username} (auto by ${actor})`, ipHashOf(req));
            notifyAssignment(u.id, sid);
            assigned.push({ sessionId: sid, ownerId: u.id, username: u.username });
        }
        db.setSetting('ASSIGN_RR_CURSOR', String(cursor));
        res.json({ assigned });
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

// ── LEAD TASKS — to-dos with due dates (SLA views: due / overdue) ──
app.get('/admin/tasks', requireRole('admin', 'manager', 'caller', 'consultant', 'auditor'), async (req, res) => {
    try {
        const { sessionId, view } = req.query;
        const rows = await db.listTasks({
            sessionId: sessionId || null,
            view: view === 'due' || view === 'overdue' ? view : ''
        });
        res.json(rows);
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

app.post('/admin/tasks', requireRole('admin', 'manager', 'caller', 'consultant'), async (req, res) => {
    try {
        const { sessionId, title, dueAt } = req.body || {};
        const r = await db.createTask({ sessionId, title, dueAt, createdBy: req.user?.username || 'team' });
        db.logAdminAction('task_create', `#${r.id} ${String(title || '').slice(0, 80)}${sessionId ? ` (${sessionId})` : ''}`, ipHashOf(req));
        res.status(201).json({ ok: true, id: r.id });
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

app.patch('/admin/tasks/:id', requireRole('admin', 'manager', 'caller', 'consultant'), async (req, res) => {
    try {
        if (!(req.body && req.body.done === true)) return res.status(400).json({ error: 'Only {done:true} is supported' });
        const r = await db.completeTask(req.params.id);
        if (!r.changes) return res.status(404).json({ error: 'Task not found or already done' });
        db.logAdminAction('task_complete', `#${req.params.id} by ${req.user?.username || 'team'}`, ipHashOf(req));
        res.json({ ok: true });
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

app.get('/admin/chats/:sessionId', requireRole('admin', 'manager', 'caller', 'consultant', 'auditor', 'marketer'), async (req, res) => {
    if (!/^[a-z0-9]{6,32}$/i.test(req.params.sessionId)) return res.status(400).json({ error: 'Invalid session ID' });
    const row = await db.getChatSession(req.params.sessionId);
    if (!row) return res.status(404).json({ error: 'Not found' });
    // Callers may only open leads assigned to them.
    if (req.user.role === 'caller' && row.ownerId !== req.user.userId) {
        return res.status(403).json({ error: 'Forbidden: lead is not assigned to you' });
    }
    res.json(row);
});

// Lead 360 timeline — newest-first event log for one lead.
app.get('/admin/chats/:sessionId/events', requireRole('admin', 'manager', 'caller', 'consultant', 'auditor', 'marketer'), async (req, res) => {
    if (!/^[a-z0-9]{6,32}$/i.test(req.params.sessionId)) return res.status(400).json({ error: 'Invalid session ID' });
    try {
        res.json(await db.listLeadEvents(req.params.sessionId));
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

// ── AI SUMMARY + EXTRACTION (on demand, cached) ─────────────
// Summarizes the audit conversation for a sales caller. Cached in
// chat_sessions.crmAiSummary; pass { force: true } to regenerate.
// AI never changes lead data — it only displays and suggests.
app.post('/admin/chats/:sessionId/summarize', requireRole('admin', 'manager', 'caller', 'consultant'), async (req, res) => {
    if (!/^[a-z0-9]{6,32}$/i.test(req.params.sessionId)) return res.status(400).json({ error: 'Invalid session ID' });
    try {
        const sessionId = req.params.sessionId;
        const row = await db.getChatSession(sessionId);
        if (!row) return res.status(404).json({ error: 'Not found' });
        // Callers may only summarize leads assigned to them (same rule as GET).
        if (req.user.role === 'caller' && row.ownerId !== req.user.userId) {
            return res.status(403).json({ error: 'Forbidden: lead is not assigned to you' });
        }

        // Serve the cached summary unless the client explicitly forces a refresh.
        if (row.crmAiSummary && req.body?.force !== true) {
            try { return res.json({ cached: true, ...JSON.parse(row.crmAiSummary) }); }
            catch (_e) { /* corrupt cache → fall through and regenerate */ }
        }

        const transcript = String(row.transcript || '').trim();
        if (!transcript) return res.status(400).json({ error: 'No conversation to summarize' });

        const userPrompt =
`Analyze this clinic marketing audit conversation and return ONLY a JSON object with exactly these keys:
{"summary":"3-4 sentence plain-English summary of this audit conversation for a sales caller","clinicType":str|null,"city":str|null,"serviceInterest":str|null,"budgetSignals":str|null,"decisionMaker":str|null,"painPoints":[str],"objections":[str],"suggestedTags":[str max 4 lowercase]}

Rules:
- Use null (or an empty array) for anything not clearly mentioned. Never invent facts.
- suggestedTags: at most 4 short lowercase tags a CRM would use.

Conversation transcript:
${transcript.slice(0, 15000)}`;

        let text;
        try {
            ({ text } = await callGemini({
                systemPrompt: 'You are a precise CRM analyst. Return ONLY valid JSON.',
                messages: [{ role: 'user', content: userPrompt }],
                operation: 'crm_summary',
                sessionId,
                temperature: 0.2,
                model: GEMINI_MODEL_EXTRACT
            }));
        } catch (e) {
            return res.status(502).json({ error: 'AI summary failed: ' + e.message });
        }

        let parsed;
        try {
            parsed = JSON.parse(String(text || '').replace(/```json/gi, '').replace(/```/g, '').trim());
        } catch (_e) {
            return res.status(502).json({ error: 'AI returned invalid JSON — try again' });
        }

        const strOrNull = v => (v === null || v === undefined || v === '') ? null : String(v).slice(0, 300);
        const obj = {
            at: new Date().toISOString(),
            summary: String(parsed.summary || '').slice(0, 2000),
            extraction: {
                clinicType:      strOrNull(parsed.clinicType),
                city:            strOrNull(parsed.city),
                serviceInterest: strOrNull(parsed.serviceInterest),
                budgetSignals:   strOrNull(parsed.budgetSignals),
                decisionMaker:   strOrNull(parsed.decisionMaker),
                painPoints: Array.isArray(parsed.painPoints) ? parsed.painPoints.slice(0, 8).map(s => String(s).slice(0, 200)) : [],
                objections: Array.isArray(parsed.objections) ? parsed.objections.slice(0, 8).map(s => String(s).slice(0, 200)) : []
            },
            suggestedTags: (Array.isArray(parsed.suggestedTags) ? parsed.suggestedTags : [])
                .map(t => String(t).toLowerCase().trim().slice(0, 32)).filter(Boolean).slice(0, 4)
        };
        await db.saveAiSummary(sessionId, obj);
        db.addLeadEvent(sessionId, 'update', 'AI summary generated', req.user?.username || 'admin');
        res.json(obj);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.delete('/admin/chats/:sessionId', requireAdmin, async (req, res) => {
    if (!/^[a-z0-9]{6,32}$/i.test(req.params.sessionId)) return res.status(400).json({ error: 'Invalid session ID' });
    const result = await db.deleteChatSession(req.params.sessionId);
    db.logAdminAction('chat_delete', req.params.sessionId, ipHashOf(req));
    // Best-effort: also remove the saved report file
    try {
        const reportPath = path.join(REPORTS_DIR, `${req.params.sessionId}.json`);
        if (fs.existsSync(reportPath)) fs.unlinkSync(reportPath);
    } catch (e) {
        console.warn('[admin] could not remove report file:', e.message);
    }
    res.json({ ok: true, deleted: result.changes });
});

// ── API KEY MANAGEMENT ─────────────────────────────────────
app.get('/admin/api-keys', requireRole('admin', 'support'), (_req, res) => {
    res.json(db.listApiKeys());
});

app.post('/admin/api-keys', requireRole('admin', 'support'), (req, res) => {
    const { name, value } = req.body || {};
    try {
        db.setApiKey(name, value);
        db.logAdminAction('key_set', name, ipHashOf(req));
        res.json({ ok: true });
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

app.delete('/admin/api-keys/:name', requireRole('admin', 'support'), async (req, res) => {
    try {
        await db.deleteApiKey(req.params.name);
        db.logAdminAction('key_delete', req.params.name, ipHashOf(req));
        res.json({ ok: true });
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

// ── USAGE STATS + COST ESTIMATION ───────────────────────────
// USD per 1M tokens (verified June 2026). Update here if providers change pricing.
const MODEL_PRICING = {
    'gemini-2.5-flash':      { in: 0.30, out: 2.50 },
    'gemini-2.5-flash-lite': { in: 0.10, out: 0.40 },
    'gpt-4o-mini':           { in: 0.15, out: 0.60 },
    'gpt-3.5-turbo':         { in: 0.50, out: 1.50 }
};
const USD_INR = Number(process.env.USD_INR_RATE) || 100;
// All-in run-cost factor: raw model tokens are only part of the cost of
// operating the service. Reported figures apply this blended factor.
const COST_FACTOR = Number(process.env.COST_FACTOR) || 3;
// WhatsApp Business API — Meta per-message rates for India (Jan 2026)
const WHATSAPP_PRICING_INR = { authentication: 0.115, utility: 0.115, marketing: 0.8631, service: 0 };

function estimateCostUSD(model, promptTokens, completionTokens) {
    const p = MODEL_PRICING[model];
    if (!p) return null; // unknown/free providers (Places, PageSpeed)
    return (((promptTokens || 0) * p.in + (completionTokens || 0) * p.out) / 1_000_000) * COST_FACTOR;
}

// Sum estimated USD cost over a set of by-model rows
function sumCostUSD(byModelRows) {
    let usd = 0;
    for (const r of byModelRows) {
        const c = estimateCostUSD(r.model, r.promptTokens, r.completionTokens);
        if (c != null) usd += c;
    }
    return usd;
}

// ── BUSINESS OVERVIEW (investor view) ───────────────────────
app.get('/admin/overview', requireRole('admin', 'manager', 'consultant', 'auditor', 'marketer'), async (_req, res) => {
    const todayStart = new Date().toISOString().slice(0, 10) + ' 00:00:00';
    const [chatStats, leadsTotal, allTime, today, health, insights] = await Promise.all([
        db.getChatStats(),
        db.countLeads(),
        db.getUsageByModel({}),                  // all-time
        db.getUsageByModel({ from: todayStart }),
        db.getProviderHealth(),
        db.getLeadInsights()
    ]);

    const costAllUSD = sumCostUSD(allTime);
    const costTodayUSD = sumCostUSD(today);
    const conversion = chatStats.total > 0 ? +((chatStats.completed / chatStats.total) * 100).toFixed(1) : 0;
    const costPerLeadINR = leadsTotal > 0 ? +((costAllUSD * USD_INR) / leadsTotal).toFixed(2) : null;

    res.json({
        leadsTotal,
        chats: chatStats,
        conversionPct: conversion,
        cost: {
            allTimeUSD: +costAllUSD.toFixed(4),
            allTimeINR: +(costAllUSD * USD_INR).toFixed(2),
            todayUSD: +costTodayUSD.toFixed(4),
            todayINR: +(costTodayUSD * USD_INR).toFixed(2),
            perLeadINR: costPerLeadINR,
            usdInrRate: USD_INR
        },
        health,
        insights,
        // Monetisation — wired for Razorpay integration later
        revenue: { enabled: false, provider: 'razorpay', totalINR: 0, paidReports: 0 }
    });
});

// ── DASHBOARD PERIOD STATS (today / yesterday / week / month / all) ──
function periodBounds(period) {
    const now = new Date();
    const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
    const fmt = (dt) => dt
        ? `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')} ` +
          `${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}:${String(dt.getSeconds()).padStart(2, '0')}`
        : null;
    let from = null, to = null;
    if (period === 'today') {
        from = startOfDay(now);
    } else if (period === 'yesterday') {
        const y = new Date(now); y.setDate(y.getDate() - 1);
        from = startOfDay(y); to = startOfDay(now);
    } else if (period === 'week') {            // this week, Monday-start
        const d = startOfDay(now); const dow = (d.getDay() + 6) % 7;
        d.setDate(d.getDate() - dow); from = d;
    } else if (period === 'month') {           // this calendar month
        from = new Date(now.getFullYear(), now.getMonth(), 1);
    }
    return { from: fmt(from), to: fmt(to) };
}

app.get('/admin/dashboard', requireRole('admin', 'manager', 'consultant', 'auditor', 'marketer'), async (req, res) => {
    const period = ['today', 'yesterday', 'week', 'month', 'all'].includes(req.query.period)
        ? req.query.period : 'all';
    const { from, to } = periodBounds(period);
    const [counts, usage] = await Promise.all([
        db.getChatCountsInRange(from, to),
        db.getUsageByModel({ from, to })
    ]);
    const costUSD = sumCostUSD(usage);
    const conversion = counts.chats > 0 ? +((counts.leads / counts.chats) * 100).toFixed(1) : 0;
    const perLeadINR = counts.leads > 0 ? +((costUSD * USD_INR) / counts.leads).toFixed(2) : null;
    res.json({
        period,
        chats: counts.chats,
        leads: counts.leads,
        conversionPct: conversion,
        cost: {
            usd: +costUSD.toFixed(4),
            inr: +(costUSD * USD_INR).toFixed(2),
            perLeadINR
        }
    });
});

// ── MARKETING — event funnel (own audit data) for a period, + by source. ──
// Meta/GA4 columns are filled client-side (placeholders until their APIs are
// wired). period: today | yesterday | week | month | all.
app.get('/admin/marketing', requireRole('admin', 'manager', 'consultant', 'auditor', 'marketer'), async (req, res) => {
    const period = ['today', 'yesterday', 'week', 'month', 'all'].includes(req.query.period)
        ? req.query.period : 'all';
    const bounds = periodBounds(period);
    const [insights, externals] = await Promise.all([
        db.getLeadInsights(bounds),
        analytics.getExternals(period, bounds).catch(e => ({ gaError: e.message, metaError: e.message }))
    ]);
    res.json({ period, ...insights, external: externals });
});

app.get('/admin/usage', requireRole('admin'), async (req, res) => {
    const groupBy = ['day', 'week', 'month'].includes(req.query.groupBy) ? req.query.groupBy : 'day';
    const { from, to } = req.query;
    const provider = ['gemini', 'openai', 'google_places', 'pagespeed'].includes(req.query.provider)
        ? req.query.provider : null;
    const range = { from: from || null, to: to || null, provider };

    const [stats, byModel, leadsTotal] = await Promise.all([
        db.getUsageStats({ ...range, groupBy }),
        db.getUsageByModel(range),
        db.countLeads()
    ]);

    // Cost per model + grand total
    let grandUSD = 0;
    const costs = byModel.map(r => {
        const usd = estimateCostUSD(r.model, r.promptTokens, r.completionTokens);
        if (usd != null) grandUSD += usd;
        return {
            provider: r.provider,
            model: r.model || '—',
            calls: r.calls,
            promptTokens: Number(r.promptTokens) || 0,
            completionTokens: Number(r.completionTokens) || 0,
            totalTokens: Number(r.totalTokens) || 0,
            costUSD: usd != null ? +usd.toFixed(4) : null,
            costINR: usd != null ? +(usd * USD_INR).toFixed(2) : null
        };
    });

    res.json({
        ...stats,
        costs,
        grandTotal: { usd: +grandUSD.toFixed(4), inr: +(grandUSD * USD_INR).toFixed(2), usdInrRate: USD_INR },
        leadsTotal,
        whatsappPricingINR: WHATSAPP_PRICING_INR,
        // Projection: cost per lead IF WhatsApp OTP (auth) + report delivery (utility) were enabled
        whatsappPerLeadINR: +(WHATSAPP_PRICING_INR.authentication + WHATSAPP_PRICING_INR.utility).toFixed(3)
    });
});

// ── POPUP / SOFT LEADS ──────────────────────────────────────
app.get('/admin/popup-leads', requireRole('admin', 'manager', 'caller', 'consultant', 'auditor', 'marketer'), async (req, res) => {
    const limit = Math.min(parseInt(req.query.limit, 10) || 300, 1000);
    res.json(await db.getPopupLeads(limit));
});

// Promote a popup/soft lead into the main CRM pipeline.
// Creates a chat_session with leadCaptured=1 so it appears immediately on the kanban board.
app.post('/admin/popup-leads/:id/promote', requireRole('admin', 'manager', 'caller'), async (req, res) => {
    try {
        const lead = await db.getPopupLeadById(req.params.id);
        if (!lead) return res.status(404).json({ error: 'Popup lead not found' });
        if (lead.converted) return res.status(409).json({ error: 'Already promoted to CRM' });

        const sessionId = crypto.randomBytes(8).toString('hex').slice(0, 16);
        await db.createChatSessionFromPopup({
            sessionId,
            userName:  lead.name,
            phone:     lead.phone,
            email:     lead.email,
            source:    lead.source,
            channel:   lead.utmSource,
            campaign:  lead.utmCampaign,
            referrer:  lead.referrer,
        });
        await db.markPopupLeadConverted(lead.id);

        const ipHash = crypto.createHash('sha256').update(req.ip || 'unknown').digest('hex').slice(0, 16);
        db.logAdminAction('promote_website_lead',
            `${lead.source} · ${lead.name || ''} · ${lead.phone || lead.email || '?'} → ${sessionId}`,
            ipHash);

        res.json({ ok: true, sessionId });
    } catch (e) {
        console.error('[promote-popup-lead]', e.message);
        res.status(500).json({ error: 'Failed to promote lead: ' + e.message });
    }
});

// ── NOTIFICATION PREFERENCES MATRIX (admin) ─────────────────
// Central control of which user receives which system notification. Every
// email is always sent FROM the no-reply system identity; this only governs
// the recipient list.
app.get('/admin/notifications/prefs', requireAdmin, async (_req, res) => {
    try {
        res.json(await db.getNotifPrefsMatrix());
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/admin/notifications/prefs', requireAdmin, async (req, res) => {
    try {
        const entries = Array.isArray(req.body?.entries) ? req.body.entries : [];
        if (!entries.length) return res.status(400).json({ error: 'No changes supplied.' });
        const r = await db.setNotifPrefs(entries);
        const ipHash = crypto.createHash('sha256').update(req.ip || 'unknown').digest('hex').slice(0, 16);
        db.logAdminAction('notif_prefs_update', `${r.saved} preference row(s) updated`, ipHash);
        res.json({ ok: true, ...r });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ── SYSTEM BROADCAST NOTIFICATION ───────────────────────────
// Admin sends one message to all active team members who have an email address.
// Uses the system SMTP (configured in admin → API Keys / settings) — no per-user setup.
app.post('/admin/notifications/broadcast', requireAdmin, async (req, res) => {
    try {
        const { subject, body } = req.body || {};
        if (!subject || !body) return res.status(400).json({ error: 'subject and body are required' });

        // Get all active users that have an email address
        const allUsers = await db.listUsers();
        const recipients = allUsers.filter(u => u.active && u.email);

        if (!recipients.length) {
            return res.status(400).json({ error: 'No active team members have email addresses set. Ask each member to add their email in Profile.' });
        }

        const sentBy = req.user?.username || 'Admin';
        const result = await messaging.sendBroadcastEmail({ subject, body, sentBy, recipients });

        const ipHash = crypto.createHash('sha256').update(req.ip || 'unknown').digest('hex').slice(0, 16);
        db.logAdminAction('broadcast_notification',
            `"${String(subject).slice(0, 60)}" → ${result.sent} sent, ${result.skipped} skipped`,
            ipHash);

        res.json({ ok: true, ...result, total: recipients.length });
    } catch (e) {
        console.error('[broadcast]', e.message);
        res.status(500).json({ error: e.message });
    }
});

// ── ADMIN ACTIVITY LOG ──────────────────────────────────────
app.get('/admin/logs', requireRole('admin', 'manager', 'support', 'auditor', 'marketer'), async (req, res) => {
    const limit = Math.min(parseInt(req.query.limit, 10) || 200, 1000);
    res.json(await db.getAdminLogs(limit));
});

// ── USER MANAGEMENT (admin only) ────────────────────────────
app.get('/admin/users', requireRole('admin', 'support'), async (_req, res) => {
    res.json(await db.listUsers());
});

app.post('/admin/users', requireAdmin, async (req, res) => {
    const { username, password, role, email } = req.body || {};
    try {
        const u = await db.createUser(username, password, role, email);
        db.logAdminAction('user_create', `${u.username} (${u.role})`, ipHashOf(req));
        res.json({ ok: true, user: u });
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

app.patch('/admin/users/:id', requireRole('admin', 'support'), async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (!id) return res.status(400).json({ error: 'Invalid id' });
    const { role, active, password, email } = req.body || {};
    try {
        const target = await db.getUserById(id);
        if (!target) return res.status(404).json({ error: 'User not found' });

        // Guard: support cannot modify admins, and support cannot change anyone's role
        if (req.user.role === 'support') {
            if (target.role === 'admin') {
                return res.status(403).json({ error: 'Forbidden: support cannot modify admin accounts' });
            }
            if (role && role !== target.role) {
                return res.status(403).json({ error: 'Forbidden: support cannot change user roles' });
            }
        }

        // Guard: don't let the last active admin be demoted or disabled.
        const isSelf = req.user.userId === id;
        const demoting = role && role !== 'admin' && target.role === 'admin';
        const disabling = active === false && target.role === 'admin' && target.active;
        if ((demoting || disabling)) {
            const admins = await db.countAdminsActive();
            if (admins <= 1) return res.status(400).json({ error: 'Cannot remove the last active admin' });
        }
        if (isSelf && disabling) return res.status(400).json({ error: 'You cannot disable your own account' });

        if (role) await db.setUserRole(id, role);
        if (typeof active === 'boolean') await db.setUserActive(id, active);
        if (password) await db.setUserPassword(id, password);
        if (email !== undefined) await db.setUserEmail(id, email);

        const changes = [role && `role=${role}`, typeof active === 'boolean' && `active=${active}`, password && 'password-reset',
            email !== undefined && 'email']
            .filter(Boolean).join(', ');
        db.logAdminAction('user_update', `${target.username}: ${changes}`, ipHashOf(req));
        res.json({ ok: true });
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

app.delete('/admin/users/:id', requireAdmin, async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (!id) return res.status(400).json({ error: 'Invalid id' });
    try {
        const target = await db.getUserById(id);
        if (!target) return res.status(404).json({ error: 'User not found' });
        if (req.user.userId === id) return res.status(400).json({ error: 'You cannot delete your own account' });
        if (target.role === 'admin') {
            const admins = await db.countAdminsActive();
            if (admins <= 1) return res.status(400).json({ error: 'Cannot delete the last active admin' });
        }
        await db.deleteUser(id);
        db.logAdminAction('user_delete', target.username, ipHashOf(req));
        res.json({ ok: true });
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

// ── EMAIL INVITATIONS — the member sets their own password ───
// POST /admin/users/invite: create a pending user + email them the set-password
// link. If the email itself fails, the account is still created and the link is
// returned so the admin can share it manually. Tokens are NEVER logged.
app.post('/admin/users/invite', requireAdmin, async (req, res) => {
    const { username, email, role } = req.body || {};
    try {
        const uname = String(username || '').trim();
        if (!/^[a-zA-Z0-9_.-]{3,64}$/.test(uname)) {
            return res.status(400).json({ error: 'Invalid username (3-64 chars, letters/numbers/._-)' });
        }
        const em = String(email || '').trim();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) {
            return res.status(400).json({ error: 'A valid email address is required' });
        }
        if (!db.ROLES.includes(role)) return res.status(400).json({ error: 'Invalid role' });
        if (!messaging.isEmailConfigured()) {
            return res.status(400).json({ error: 'Configure System Email first (Integrations)' });
        }
        const u = await db.createInvitedUser(uname, em, role);
        const link = absoluteUrl('/admin/invite/' + u.inviteToken, req);
        const sent = await messaging.sendInviteEmail({
            email: u.email, username: u.username, role: u.role, link,
            invitedBy: req.user?.username || 'admin'
        }).catch(e => ({ ok: false, error: e.message }));
        const emailSent = !!(sent && sent.ok);
        db.logAdminAction('user_invite',
            `${u.username} (${u.role}) → ${u.email}${emailSent ? '' : ' (email failed — link shown to admin)'}`,
            ipHashOf(req));
        const user = { id: u.id, username: u.username, email: u.email, role: u.role, pending: true };
        if (emailSent) return res.json({ ok: true, emailSent: true, user });
        return res.json({ ok: true, emailSent: false, link, user });
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

// Resend (rotates the token + 72h expiry). Only valid while still pending.
app.post('/admin/users/:id/resend-invite', requireAdmin, async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (!id) return res.status(400).json({ error: 'Invalid id' });
    try {
        const target = await db.getUserById(id);
        if (!target) return res.status(404).json({ error: 'User not found' });
        if (!target.inviteToken) return res.status(400).json({ error: 'User is not pending an invite' });
        if (!target.email) return res.status(400).json({ error: 'User has no email address' });
        if (!messaging.isEmailConfigured()) {
            return res.status(400).json({ error: 'Configure System Email first (Integrations)' });
        }
        const { inviteToken } = await db.refreshInvite(id);
        const link = absoluteUrl('/admin/invite/' + inviteToken, req);
        const sent = await messaging.sendInviteEmail({
            email: target.email, username: target.username, role: target.role, link,
            invitedBy: req.user?.username || 'admin'
        }).catch(e => ({ ok: false, error: e.message }));
        const emailSent = !!(sent && sent.ok);
        db.logAdminAction('user_invite_resend',
            `${target.username} → ${target.email}${emailSent ? '' : ' (email failed — link shown to admin)'}`,
            ipHashOf(req));
        if (emailSent) return res.json({ ok: true, emailSent: true, email: target.email });
        return res.json({ ok: true, emailSent: false, link });
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

// Standalone set-password page (shadcn-light, matches the login card). PUBLIC:
// the invite token in the URL IS the credential. Never echoes the token in text.
function invitePageHtml(inner) {
    return `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<title>GrowClinic CRM — Team invite</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;background:hsl(0 0% 98%);color:hsl(240 10% 3.9%);min-height:100vh;display:flex;align-items:center;justify-content:center;padding:1rem}
.card{width:100%;max-width:380px;background:#fff;border:1px solid hsl(240 5.9% 90%);border-radius:16px;padding:2rem;box-shadow:0 10px 40px -12px rgba(0,0,0,.12);text-align:center}
.gc{width:56px;height:56px;border-radius:12px;margin:0 auto 1.1rem;background:hsl(240 10% 3.9%);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:1.05rem;letter-spacing:.02em}
h1{font-size:1.25rem;font-weight:800;letter-spacing:-.02em}
.sub{font-size:.85rem;color:hsl(240 3.8% 46.1%);margin:.35rem 0 1.4rem}
.field{text-align:left;margin-bottom:.95rem}
.field label{display:block;font-size:.78rem;font-weight:600;color:hsl(240 5.3% 26.1%);margin-bottom:.35rem}
.input{width:100%;padding:.8rem .95rem;border-radius:10px;border:1.5px solid hsl(240 5.9% 90%);background:#fff;font:inherit;font-size:.95rem;color:inherit;outline:none;transition:border-color .15s,box-shadow .15s}
.input:focus{border-color:hsl(240 10% 3.9%);box-shadow:0 0 0 3px rgba(9,9,11,.1)}
.btn{width:100%;padding:.85rem 1.2rem;border-radius:10px;border:none;background:hsl(240 10% 3.9%);color:#fff;font:inherit;font-size:.95rem;font-weight:700;cursor:pointer;margin-top:.25rem}
.btn:hover{background:hsl(240 6% 14%)}
.btn:disabled{opacity:.5;cursor:not-allowed}
.err{display:none;margin-top:.85rem;padding:.6rem .9rem;background:#fee2e2;border:1px solid #fecaca;color:#991b1b;border-radius:10px;font-size:.83rem;text-align:left}
.err.show{display:block}
.ok{margin-top:.85rem;padding:.6rem .9rem;background:#d1fae5;border:1px solid #a7f3d0;color:#047857;border-radius:10px;font-size:.83rem;display:none}
.ok.show{display:block}
.foot{margin-top:1.4rem;font-size:.72rem;color:hsl(240 3.8% 46.1%)}
</style></head>
<body><main class="card">${inner}<div class="foot">GrowClinic CRM</div></main></body></html>`;
}

const inviteExpiredHtml = () => invitePageHtml(`
    <div class="gc">GC</div>
    <h1>Invite link expired</h1>
    <div class="sub">This invite link is invalid or has expired.<br>Ask your admin to resend the invitation.</div>`);

app.get('/admin/invite/:token', async (req, res) => {
    try {
        const u = await db.getUserByInviteToken(req.params.token);
        if (!u) return res.status(410).send(inviteExpiredHtml());
        const roleLabel = { admin: 'Admin', manager: 'Manager', caller: 'Caller' }[u.role] || u.role;
        res.send(invitePageHtml(`
    <div class="gc">GC</div>
    <h1>Welcome ${escapeHtml(u.username)}</h1>
    <div class="sub">You've been invited to GrowClinic CRM as <b>${escapeHtml(roleLabel)}</b>.<br>Set a password to activate your account.</div>
    <form id="f">
        <div class="field"><label for="pw">Password (min 8 characters)</label>
            <input class="input" type="password" id="pw" autocomplete="new-password" required minlength="8"></div>
        <div class="field"><label for="pw2">Confirm password</label>
            <input class="input" type="password" id="pw2" autocomplete="new-password" required minlength="8"></div>
        <button class="btn" id="go" type="submit">Set password &amp; activate</button>
        <div class="err" id="err"></div>
        <div class="ok" id="okmsg">Account activated. Taking you to the sign-in page&hellip;</div>
    </form>
    <script>
    (function(){
        var f=document.getElementById('f'),err=document.getElementById('err'),okm=document.getElementById('okmsg'),go=document.getElementById('go');
        function fail(m){err.textContent=m;err.classList.add('show');go.disabled=false;go.textContent='Set password & activate';}
        f.addEventListener('submit',async function(ev){
            ev.preventDefault();err.classList.remove('show');
            var p=document.getElementById('pw').value,p2=document.getElementById('pw2').value;
            if(p.length<8)return fail('Password must be at least 8 characters.');
            if(p!==p2)return fail('Passwords do not match.');
            go.disabled=true;go.textContent='Activating\\u2026';
            try{
                var r=await fetch(location.pathname,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:p})});
                var d=await r.json().catch(function(){return{}});
                if(r.ok&&d.ok){okm.classList.add('show');setTimeout(function(){location.href='/admin';},1200);}
                else fail(d.error||'Could not set the password. Try again.');
            }catch(e){fail('Network error. Try again.');}
        });
    })();
    </script>`));
    } catch (e) {
        console.warn('[invite] page failed:', e.message);
        res.status(410).send(inviteExpiredHtml());
    }
});

// Accept the invite: token + password → account live. Same rate bucket as login.
app.post('/admin/invite/:token', rateLimit('login'), async (req, res) => {
    try {
        const u = await db.getUserByInviteToken(req.params.token);
        if (!u) return res.status(410).json({ error: 'Invite link expired — ask your admin to resend it.' });
        const password = String((req.body || {}).password || '');
        if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
        await db.acceptInvite(u.id, password);
        db.logAdminAction('invite_accepted', `${u.username} activated their account via invite`, ipHashOf(req));
        res.json({ ok: true });
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

// ─────────────────────────────────────────────────────────────
// BUILT-IN CRM — flat lead shape + event webhooks + API for n8n
// ─────────────────────────────────────────────────────────────
// TRANSPARENT LEAD SCORE (0–100) — every point has a visible reason so the
// team can see WHY a lead is hot. Mirrored client-side as computeLeadScoreUI
// in admin.html (keep the two in sync). Band: >=70 hot · >=40 warm · else cold,
// but a manual crmRating always overrides the band (never the score).
const QUALITY_CHANNELS = ['google_ads', 'google_ads_lead_form', 'meta_lead_ad', 'referral'];
function computeLeadScore(r) {
    const reasons = [];
    const add = (label, points) => reasons.push({ label, points });
    if (r.verified) add('WhatsApp verified', 30);
    if (r.phone) add('Phone present', 10);
    if (r.websiteUrl) add('Website provided', 5);
    if (r.reportViewed) add('Report viewed', 10);
    if (r.otpSent && !r.verified) add('OTP requested', 5);
    const um = Number(r.userMsgCount) || 0;
    if (um >= 6) add('Engaged chat (6+ messages)', 10);
    if (um >= 10) add('Deeply engaged chat (10+ messages)', 5);
    if (Number(r.crmDealValue) > 0) add('Deal value set', 5);
    if (QUALITY_CHANNELS.includes(String(r.channel || ''))) add('Quality source', 5);
    const t = r.startedAt ? new Date(r.startedAt).getTime() : NaN;
    if (Number.isFinite(t) && (Date.now() - t) <= 48 * 3600 * 1000) add('Fresh (started <48h ago)', 10);
    if (['meeting_scheduled', 'meeting_done', 'decision_followup', 'qualified', 'proposal'].includes(String(r.crmStatus || ''))) add('Progressed in pipeline', 10);
    const score = Math.min(100, reasons.reduce((s, x) => s + x.points, 0));
    let band = score >= 70 ? 'hot' : score >= 40 ? 'warm' : 'cold';
    if (r.crmRating) {
        band = r.crmRating;
        add('Manual rating override', 0);
    }
    return { score, band, reasons };
}

// One canonical flat lead object used by the exports, the CRM API and events.
// intent/intentSource kept for backward compatibility: intent = band,
// intentSource = 'manual' (team rating) or 'score' (computed).
function flatLead(r, req = null) {
    const sc = computeLeadScore(r);
    return {
        intent:     sc.band,
        intentSource: r.crmRating ? 'manual' : 'score',
        score:        sc.score,
        band:         sc.band,
        scoreReasons: sc.reasons,
        sessionId:  r.sessionId,
        startedAt:  r.startedAt,
        name:       r.userName   || null,
        clinic:     r.clinicName || null,
        city:       r.city       || null,
        phone:      r.phone      || null,
        website:    r.websiteUrl || null,
        source:     r.source     || null,
        channel:    r.channel    || null,
        campaign:   r.campaign   || null,
        gclid:       r.gclid       || null,
        landingPage: r.landingPage || null,
        referrer:    r.referrer    || null,
        adGroup:     r.adGroup     || null,
        keyword:     r.keyword     || null,
        messages:   (r.userMsgCount || 0) + (r.aiMsgCount || 0),
        status:     r.verified ? 'verified' : r.leadCaptured ? 'completed'
                    : ((r.userMsgCount || 0) > 2 ? 'in_progress' : 'abandoned'),
        email:      r.email      || null,
        country:    r.country    || null,
        specialty:  r.specialty  || null,
        crmStatus:    r.crmStatus     || null,
        crmRating:    r.crmRating    || null,
        crmDealValue: r.crmDealValue ?? null,
        crmNotes:     r.crmNotes      || null,
        crmFollowUpAt: r.crmFollowUpAt || null,
        tags:         r.crmTags   || null,
        lostReason:   r.lostReason || null,
        owner:        r.ownerId ?? null,
        assignedAt:   r.assignedAt || null,
        remarks:      (() => { try { return JSON.parse(r.crmRemarks || '[]'); } catch (_e) { return []; } })(),
        reportUrl:  r.reportUrl ? absoluteUrl(r.reportUrl, req) : null
    };
}

// CRM events fan out to EVERY configured integration (Integrations tab):
//   • CRM_EVENTS_WEBHOOK  → n8n / Zapier / Make (full event envelope)
//   • SHEETS_WEBHOOK_URL  → Google Apps Script web app (flat row)
//   • TELEGRAM / SLACK    → human alerts on lead.created / lead.verified
// Fires lead.created / lead.verified / lead.updated. Fire-and-forget.
function postJson(url, body, label, event) {
    return fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(10_000)
    }).then(r => {
        if (!r.ok) console.warn(`[crm-event] ${event} → ${label} HTTP ${r.status}`);
        else console.log(`[crm-event] ${event} → ${label} ok`);
        return r.ok;
    }).catch(e => { console.warn(`[crm-event] ${event} → ${label} failed:`, e.message); return false; });
}

function leadAlertText(event, lead) {
    const head = event === 'lead.verified' ? '🔥 VERIFIED lead' : '🆕 New lead';
    return `${head}: ${lead.clinic || lead.name || 'Unknown'}`
        + (lead.name && lead.clinic ? ` (${lead.name})` : '')
        + (lead.city ? ` · ${lead.city}` : '')
        + (lead.phone ? `\n📱 ${lead.phone}` : '')
        + (lead.channel ? `\n📣 ${lead.channel}` : '')
        + (lead.reportUrl ? `\n📄 ${lead.reportUrl}` : '');
}

async function sendCrmEvent(event, sessionId, extra = {}) {
    try {
        const row = await db.getChatSession(sessionId).catch(() => null);
        const lead = row ? flatLead(row) : { sessionId };
        const payload = { event, at: new Date().toISOString(), lead, ...extra };
        const jobs = [];

        const hook = (db.getSetting('CRM_EVENTS_WEBHOOK') || '').trim();
        if (hook) {
            jobs.push(postJson(hook, payload, 'events-webhook', event).then(ok => {
                if (!ok) db.enqueueCrmEvent(event, sessionId, 'webhook', payload, 'HTTP Error or Timeout');
            }));
        }

        const sheets = (db.getSetting('SHEETS_WEBHOOK_URL') || '').trim();
        if (sheets) {
            const sheetsPayload = { event, at: payload.at, ...lead };
            jobs.push(postJson(sheets, sheetsPayload, 'sheets', event).then(ok => {
                if (!ok) db.enqueueCrmEvent(event, sessionId, 'sheets', sheetsPayload, 'HTTP Error or Timeout');
            }));
        }

        // Human alerts only for the two moments that matter (not every edit).
        if (event === 'lead.created' || event === 'lead.verified') {
            const tgToken = (db.getSetting('TELEGRAM_BOT_TOKEN') || '').trim();
            const tgChat  = (db.getSetting('TELEGRAM_CHAT_ID') || '').trim();
            if (tgToken && tgChat) {
                const tgPayload = { chat_id: tgChat, text: leadAlertText(event, lead) };
                jobs.push(postJson(`https://api.telegram.org/bot${tgToken}/sendMessage`,
                    tgPayload, 'telegram', event).then(ok => {
                        if (!ok) db.enqueueCrmEvent(event, sessionId, 'telegram', tgPayload, 'HTTP Error or Timeout');
                    }));
            }
            // Email alert (Notifications matrix, falls back to NOTIFY_EMAIL).
            if (messaging.isEmailConfigured()) {
                const who = lead.clinic || lead.name || 'Unknown';
                const subject = event === 'lead.verified' ? `Verified lead: ${who}` : `New lead: ${who}`;
                const recips = await notifyRecipients('new_lead');
                for (const to of recips) {
                    jobs.push(messaging.sendLeadAlertEmail({
                        email: to, lead, subject,
                        adminUrl: absoluteUrl('/admin')
                    }).catch(e => console.warn('[crm-event] email alert failed:', e.message)));
                }
            }
        }
        await Promise.allSettled(jobs);
    } catch (e) {
        console.warn(`[crm-event] ${event} failed (non-critical):`, e.message);
    }
}

// ─────────────────────────────────────────────────────────────
// AUTOMATION RULES ENGINE — pragmatic workflows: trigger → conditions →
// actions. LOOP PREVENTION: actions never emit CRM events or triggers —
// assign/tag/task write via db functions directly (not the PATCH route) and
// notifications call postJson directly (not sendCrmEvent). Actions are all
// reversible (assign, tag, task, notify) — never deletes or stage writes.
// ─────────────────────────────────────────────────────────────
const AUTOMATION_TRIGGERS = ['lead.created', 'lead.verified', 'stage.changed'];
const AUTOMATION_ACTIONS  = ['assign_rr', 'add_tag', 'create_task', 'notify_telegram', 'webhook'];

function parseJsonSafe(s, fallback) {
    try { const v = JSON.parse(s); return v == null ? fallback : v; } catch (_e) { return fallback; }
}

// null / missing / empty list = match everything; otherwise case-insensitive
// membership test against the lead's value.
function condListMatch(list, value) {
    if (!Array.isArray(list) || !list.length) return true;
    const v = String(value || '').trim().toLowerCase();
    return list.some(x => String(x || '').trim().toLowerCase() === v);
}

// Does this rule's conditions object match the lead row (+ trigger context)?
function automationConditionsMatch(rule, row, ctx = {}) {
    const c = parseJsonSafe(rule.conditions, {}) || {};
    const band = row.crmRating || computeLeadScore(row).band;
    const stage = ctx.newStage || row.crmStatus || 'new';
    return condListMatch(c.channel, row.channel || row.source)
        && condListMatch(c.band, band)
        && condListMatch(c.country, row.country)
        && condListMatch(c.stage, stage);
}

// Execute one action for a lead. Returns a short human-readable summary.
async function runAutomationAction(action, rule, trigger, row) {
    const sessionId = row.sessionId;
    const value = String(action.value || '').trim();
    switch (action.type) {
        case 'assign_rr': {
            // Same round-robin as /admin/assign-auto — active callers, shared cursor.
            const callers = (await db.listAssignableUsers() || [])
                .filter(u => u.role === 'caller')
                .sort((a, b) => a.id - b.id);
            if (!callers.length) return 'assign skipped (no active callers)';
            let cursor = Number(db.getSetting('ASSIGN_RR_CURSOR') || 0) || 0;
            const u = callers[cursor % callers.length];
            db.setSetting('ASSIGN_RR_CURSOR', String((cursor + 1) % callers.length));
            await db.setLeadOwner(sessionId, u.id);
            db.addLeadEvent(sessionId, 'assign', `assigned to ${u.username} (automation: ${rule.name})`, 'automation');
            notifyAssignment(u.id, sessionId);
            return `assigned to ${u.username}`;
        }
        case 'add_tag': {
            if (!value) return 'tag skipped (no value)';
            const existing = String(row.crmTags || '').split(',').map(t => t.trim()).filter(Boolean);
            if (existing.some(t => t.toLowerCase() === value.toLowerCase())) return `tag '${value}' already set`;
            const merged = [...existing, value].join(',').slice(0, 255);
            await db.updateChatCrm(sessionId, { tags: merged });
            db.addLeadEvent(sessionId, 'update', `tag '${value}' added (automation: ${rule.name})`, 'automation');
            return `tagged ${value}`;
        }
        case 'create_task': {
            const due = new Date(Date.now() + 24 * 3600 * 1000);
            due.setHours(10, 0, 0, 0);   // tomorrow 10:00 local
            const r = await db.createTask({
                sessionId, title: value || 'Follow up',
                dueAt: due.toISOString(), createdBy: 'automation'
            });
            db.addLeadEvent(sessionId, 'update', `task '${value || 'Follow up'}' created (automation: ${rule.name})`, 'automation');
            return `task #${r.id} created`;
        }
        case 'notify_telegram': {
            const tgToken = (db.getSetting('TELEGRAM_BOT_TOKEN') || '').trim();
            const tgChat  = (db.getSetting('TELEGRAM_CHAT_ID') || '').trim();
            if (!tgToken || !tgChat) return 'telegram skipped (not configured)';
            const lead = flatLead(row);
            const text = `Automation: ${rule.name} (${trigger})\n`
                + `${lead.clinic || lead.name || sessionId}`
                + (lead.phone ? ` · ${lead.phone}` : '')
                + (lead.channel ? ` · ${lead.channel}` : '');
            const ok = await postJson(`https://api.telegram.org/bot${tgToken}/sendMessage`,
                { chat_id: tgChat, text }, 'automation-telegram', trigger);
            return ok ? 'telegram sent' : 'telegram failed';
        }
        case 'webhook': {
            if (!/^https?:\/\//i.test(value)) return 'webhook skipped (invalid URL)';
            const ok = await postJson(value,
                { rule: rule.name, trigger, lead: flatLead(row) }, 'automation-webhook', trigger);
            return ok ? 'webhook sent' : 'webhook failed';
        }
        default:
            return `unknown action '${action.type}'`;
    }
}

// Run every enabled rule for this trigger against one lead. Fire-and-forget:
// callers wrap this in setTimeout so it never blocks a response, and every
// rule execution is try/caught + logged individually.
async function runAutomations(trigger, sessionId, ctx = {}) {
    try {
        if (!sessionId || !AUTOMATION_TRIGGERS.includes(trigger)) return;
        const rules = ((await db.listRules()) || []).filter(r => r.enabled && r.trigger_ === trigger);
        if (!rules.length) return;
        const row = await db.getChatSession(sessionId).catch(() => null);
        if (!row) return;
        for (const rule of rules) {
            try {
                if (!automationConditionsMatch(rule, row, ctx)) continue;
                const actions = (parseJsonSafe(rule.actions, []) || [])
                    .filter(a => a && AUTOMATION_ACTIONS.includes(a.type));
                if (!actions.length) continue;
                const parts = [];
                for (const a of actions) {
                    try { parts.push(await runAutomationAction(a, rule, trigger, row)); }
                    catch (e) { parts.push(`${a.type} error: ${e.message}`); }
                }
                db.logRun(rule.id, sessionId, trigger, parts.join('; ').slice(0, 255), 0);
                console.log(`[automation] rule '${rule.name}' (${trigger}) → ${parts.join('; ')}`);
            } catch (e) {
                db.logRun(rule.id, sessionId, trigger, ('error: ' + e.message).slice(0, 255), 0);
                console.warn(`[automation] rule #${rule.id} failed:`, e.message);
            }
        }
    } catch (e) {
        console.warn('[automation] run failed (non-critical):', e.message);
    }
}

// ── Automation admin API (admin only). Rules can be disabled, never deleted. ──
app.get('/admin/automations', requireAdmin, async (_req, res) => {
    try {
        const [rules, runs] = await Promise.all([db.listRules(), db.listRuns({ limit: 20 })]);
        res.json({ rules, runs, triggers: AUTOMATION_TRIGGERS, actionTypes: AUTOMATION_ACTIONS });
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

function validateAutomationRule(b = {}) {
    const name = String(b.name || '').trim().slice(0, 120);
    if (!name) return { error: 'Rule name required' };
    if (!AUTOMATION_TRIGGERS.includes(b.trigger_)) {
        return { error: `Invalid trigger — use one of: ${AUTOMATION_TRIGGERS.join(', ')}` };
    }
    if (!Array.isArray(b.actions) || !b.actions.length) return { error: 'At least one action required' };
    const actions = [];
    for (const a of b.actions) {
        if (!a || !AUTOMATION_ACTIONS.includes(a.type)) {
            return { error: `Invalid action type — use one of: ${AUTOMATION_ACTIONS.join(', ')}` };
        }
        const value = a.value == null ? null : String(a.value).trim().slice(0, 512) || null;
        if (a.type === 'webhook' && !/^https?:\/\//i.test(value || '')) {
            return { error: 'Webhook action needs a valid http(s) URL' };
        }
        actions.push({ type: a.type, value });
    }
    const c = (b.conditions && typeof b.conditions === 'object') ? b.conditions : {};
    const list = v => Array.isArray(v) && v.length ? v.map(x => String(x).trim().slice(0, 64)).filter(Boolean) : null;
    const conditions = { channel: list(c.channel), band: list(c.band), country: list(c.country), stage: list(c.stage) };
    return { name, trigger_: b.trigger_, conditions, actions };
}

app.post('/admin/automations', requireAdmin, async (req, res) => {
    try {
        const v = validateAutomationRule(req.body || {});
        if (v.error) return res.status(400).json({ error: v.error });
        const r = await db.createRule({ ...v, enabled: 1, createdBy: req.user?.username || 'admin' });
        db.logAdminAction('automation_create', `#${r.id} ${v.name} (${v.trigger_}) by ${req.user?.username}`, ipHashOf(req));
        res.json({ ok: true, id: r.id });
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

app.patch('/admin/automations/:id', requireAdmin, async (req, res) => {
    try {
        const id = Number(req.params.id);
        const b = req.body || {};
        const existing = await db.getRule(id);
        if (!existing) return res.status(404).json({ error: 'Rule not found' });
        let patch;
        // Enabled-only toggle — the common case from the UI switch.
        if (Object.keys(b).length === 1 && b.enabled !== undefined) {
            patch = { enabled: b.enabled ? 1 : 0 };
        } else {
            const v = validateAutomationRule(b);
            if (v.error) return res.status(400).json({ error: v.error });
            patch = { ...v, enabled: b.enabled !== undefined ? (b.enabled ? 1 : 0) : undefined };
        }
        await db.updateRule(id, patch);
        db.logAdminAction('automation_update',
            `#${id} ${patch.enabled !== undefined && Object.keys(patch).length === 1
                ? (patch.enabled ? 'enabled' : 'disabled') : 'updated'} by ${req.user?.username}`, ipHashOf(req));
        res.json({ ok: true });
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

// Dry-run: evaluate conditions against a real lead and report which actions
// WOULD run. Executes nothing; logged with dryRun=1.
app.post('/admin/automations/:id/test', requireAdmin, async (req, res) => {
    try {
        const rule = await db.getRule(Number(req.params.id));
        if (!rule) return res.status(404).json({ error: 'Rule not found' });
        const sessionId = String(req.body?.sessionId || '').trim().slice(0, 64);
        if (!sessionId) return res.status(400).json({ error: 'sessionId required' });
        const row = await db.getChatSession(sessionId).catch(() => null);
        if (!row) return res.status(404).json({ error: 'Lead not found' });
        const match = automationConditionsMatch(rule, row, {});
        const actions = match
            ? (parseJsonSafe(rule.actions, []) || []).filter(a => a && AUTOMATION_ACTIONS.includes(a.type))
            : [];
        const summary = match
            ? (actions.length ? 'would run: ' + actions.map(a => a.type + (a.value ? `(${a.value})` : '')).join('; ') : 'matched, no valid actions')
            : 'conditions did not match';
        db.logRun(rule.id, sessionId, rule.trigger_, ('DRY: ' + summary).slice(0, 255), 1);
        db.logAdminAction('automation_test', `#${rule.id} on ${sessionId} by ${req.user?.username}`, ipHashOf(req));
        res.json({ ok: true, match, actions, summary });
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

// ─────────────────────────────────────────────────────────────
// SOURCE QUALITY REPORT — which channels send leads that actually convert.
// ─────────────────────────────────────────────────────────────
app.get('/admin/reports/sources', requireRole('admin', 'manager', 'consultant', 'auditor', 'marketer'), async (_req, res) => {
    try {
        const rows = await db.sourceQualityStats();
        const pct = (a, b) => b > 0 ? (Number(a) / Number(b) * 100).toFixed(1) : '0.0';
        res.json((rows || []).map(r => ({
            src: r.src,
            leads: Number(r.leads) || 0,
            verified: Number(r.verified) || 0,
            qualified: Number(r.qualified) || 0,
            won: Number(r.won) || 0,
            pipeline: Number(r.pipeline) || 0,
            verifiedRate: pct(r.verified, r.leads),
            qualifiedRate: pct(r.qualified, r.leads),
            winRate: pct(r.won, r.leads)
        })));
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

// ─────────────────────────────────────────────────────────────
// INBOUND LEADS — pull/receive leads FROM external channels into the CRM.
// Every ingested lead appears in the Leads tab + CRM board and fires the
// normal lead.created fan-out (Sheets/Telegram/Slack/n8n).
// ─────────────────────────────────────────────────────────────
// Same normalization as db.trackChatActivity applies to phoneE164 — kept local
// so ingestion routes can dedupe before creating anything.
function normalizePhoneE164(raw) {
    const s = String(raw || '').trim();
    if (!s) return null;
    let d = s.replace(/\D/g, '');
    if (!d) return null;
    if (s.startsWith('+')) return d.slice(0, 20);
    d = d.replace(/^0+/, '');
    if (d.length === 10 && /^[6-9]/.test(d)) d = '91' + d;
    return d ? d.slice(0, 20) : null;
}

async function ingestExternalLead(channel, f = {}) {
    // Dedupe at ingestion: an existing captured lead with the same phone gets a
    // system remark + timeline entry instead of a duplicate row.
    if (f.phone) {
        const e164 = normalizePhoneE164(f.phone);
        const existing = e164 ? await db.findLeadByPhone(e164).catch(() => null) : null;
        if (existing) {
            await db.addChatRemark(existing.sessionId, 'system', `Duplicate ${channel} lead received — merged`)
                .catch(e => console.warn('[inbound] dedupe remark failed:', e.message));
            db.addLeadEvent(existing.sessionId, 'update', `duplicate from ${channel} suppressed`, 'system');
            console.log(`[inbound] duplicate ${channel} lead suppressed → merged into ${existing.sessionId}`);
            return { sessionId: existing.sessionId, duplicate: true };
        }
    }
    const sessionId = 'ext' + crypto.randomBytes(6).toString('hex');
    db.trackChatActivity(sessionId, {
        userName: f.name || null, clinicName: f.clinic || null, city: f.city || null,
        phone: f.phone || null, websiteUrl: f.website || null,
        email: f.email || null, specialty: f.specialty || null,
        source: channel, channel, campaign: f.campaign || null,
        gclid: f.gclid || null, adGroup: f.adGroup || null, keyword: f.keyword || null,
        leadCaptured: 1, completed: 1
    });
    try {
        await db.insertLead({
            name: f.name || '', clinicName: f.clinic || '', clinicType: f.specialty || '',
            city: f.city || '', website: f.website || '', phone: f.phone || '',
            ads: '', primaryGoal: channel, auditScore: 0, reportUrl: ''
        });
    } catch (_e) { /* row in chat_sessions is the source of truth for the CRM */ }
    console.log(`[inbound] lead ingested from ${channel}: ${f.name || f.phone || f.email || '?'}`);
    setTimeout(() => db.addLeadEvent(sessionId, 'created', channel, 'system'), 700);
    setTimeout(() => sendCrmEvent('lead.created', sessionId, { channel }), 800);
    setTimeout(() => { try { runAutomations('lead.created', sessionId).catch(() => {}); } catch (_e) {} }, 500);
    return { sessionId, duplicate: false };
}

// Short URL channel (google-ads / sheets-in / generic) → the CRM channel label.
function inboundChannelName(ch) {
    return ch === 'google-ads' ? 'google_ads_lead_form' : ch === 'sheets-in' ? 'google_sheets' : ch;
}

// Payload → normalized lead fields, per channel. Shared by the live inbound
// webhook AND the admin raw-event Replay, so both always map identically.
function mapInboundLeadFields(ch, body = {}) {
    let f = {};
    if (ch === 'google-ads' && Array.isArray(body.user_column_data)) {
        for (const c of body.user_column_data) {
            const id = String(c.column_id || '').toUpperCase();
            const v = c.string_value || '';
            if (id.includes('FULL_NAME') || id === 'FIRST_NAME') f.name = (f.name ? f.name + ' ' : '') + v;
            else if (id.includes('LAST_NAME')) f.name = (f.name ? f.name + ' ' : '') + v;
            else if (id.includes('PHONE')) f.phone = v;
            else if (id.includes('EMAIL')) f.email = v;
            else if (id.includes('POSTAL')) f.pincode = v;
            else if (id.includes('CITY')) f.city = v;
            else if (id.includes('COMPANY') || id.includes('BUSINESS')) f.clinic = v;
            else if (id.includes('SPECIALT') || id.includes('SPECIALIZ')) f.specialty = v;
        }
        f.campaign = body.campaign_id ? String(body.campaign_id) : null;
        // Ad-level attribution from the webhook envelope (Google sends gcl_id).
        const gclid = body.gclid || body.gcl_id;
        if (gclid) f.gclid = String(gclid).slice(0, 128);
        const adGroup = body.adgroup_id || body.ad_group;
        if (adGroup) f.adGroup = String(adGroup).slice(0, 128);
        if (body.keyword) f.keyword = String(body.keyword).slice(0, 128);
    } else if (Array.isArray(body.field_data)) {
        // Meta Lead Ads shape ({field_data: [{name, values}]}) — used by Replay.
        for (const fd of body.field_data) {
            const n = String(fd.name || '').toLowerCase();
            const v = (fd.values || [])[0] || '';
            if (n.includes('name')) f.name = v;
            else if (n.includes('phone')) f.phone = v;
            else if (n.includes('email')) f.email = v;
            else if (n.includes('city')) f.city = v;
            else if (n.includes('clinic') || n.includes('company') || n.includes('business')) f.clinic = v;
            else if (n.includes('specialt') || n.includes('specializ')) f.specialty = v;
        }
        if (body._campaign) f.campaign = String(body._campaign).slice(0, 128);
    } else {
        f = {
            name:   body.name || body.fullName || body.full_name || body.Name || '',
            phone:  body.phone || body.mobile || body.whatsapp || body.Phone || '',
            email:  body.email || body.Email || '',
            clinic: body.clinic || body.clinicName || body.company || body.Clinic || '',
            city:   body.city || body.City || '',
            website: body.website || body.Website || '',
            specialty: body.specialty || body.specialization || body.clinicType || '',
            campaign: body.campaign || null
        };
    }
    return f;
}

// Generic inbound webhook. URL shape:
//   POST /api/integrations/inbound/<channel>?key=<INBOUND_LEADS_KEY>
// Channels:
//   google-ads → paste this URL into Google Ads → Lead form asset → Webhook
//                (Google's payload with user_column_data is auto-mapped)
//   sheets-in  → Apps Script onFormSubmit posts new Sheet rows here
//   generic    → any JSON with name/phone/email/clinic/city/website fields
app.post('/api/integrations/inbound/:channel', rateLimit('popup'), async (req, res) => {
    try {
        const expected = (db.getSetting('INBOUND_LEADS_KEY') || '').trim();
        if (!expected || expected.length < 12) {
            return res.status(503).json({ error: 'Inbound not configured — set INBOUND_LEADS_KEY (12+ chars) in admin → Integrations' });
        }
        const provided = String(req.query.key || req.get('x-inbound-key') || '').trim();
        const a = Buffer.from(expected), b = Buffer.from(provided);
        if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
            return res.status(401).json({ error: 'Invalid key' });
        }
        const ch = String(req.params.channel || 'generic').toLowerCase().slice(0, 32);
        const body = req.body || {};
        // Google sends a test payload when you click "Send test data"
        if (ch === 'google-ads' && (body.google_test_lead || body.is_test === true)) {
            console.log('[inbound] Google Ads test lead received ✓');
        }
        const f = mapInboundLeadFields(ch, body);
        if (!f.name && !f.phone && !f.email) {
            db.addRawEvent(ch, null, body, 'error');   // keep the payload for inspection/replay
            return res.status(400).json({ error: 'No recognisable lead fields in payload' });
        }
        const r = await ingestExternalLead(inboundChannelName(ch), f);
        db.addRawEvent(ch, r.sessionId, body, r.duplicate ? 'duplicate' : 'ok');
        res.json({ ok: true, sessionId: r.sessionId, duplicate: r.duplicate || undefined });
    } catch (e) {
        console.error('[inbound] error:', e.message);
        res.status(500).json({ error: 'Could not ingest lead' });
    }
});

// Meta (FB/IG) Lead Ads auto-import: polls the Page's lead forms every 5 min
// with a System User token. New submissions become CRM leads automatically.
// Reading leadgen_forms / leads requires a PAGE access token, not a User or
// System-User token. Passing a user token yields "(#200) Requires
// pages_manage_ads permission to manage the object". Given a token that CAN see
// the page, ask Graph for that page's own access token and use it downstream.
// Falls back to the original token when a page token can't be derived (e.g. the
// admin already pasted a page token).
async function metaPageToken(userToken, pageId) {
    try {
        const j = await fetch(`https://graph.facebook.com/v21.0/${encodeURIComponent(pageId)}?fields=access_token&access_token=${encodeURIComponent(userToken)}`,
            { signal: AbortSignal.timeout(10_000) }).then(r => r.json());
        if (j && j.access_token) return j.access_token;
    } catch (_e) { /* fall through to the original token */ }
    return userToken;
}

async function pollMetaLeads() {
    const token = (db.getSetting('META_LEADS_TOKEN') || '').trim();
    const page  = (db.getSetting('META_PAGE_ID') || '').trim();
    if (!token || !page) return;
    db.setSetting('META_LEADS_LAST_RUN', new Date().toISOString());
    try {
        const since = Number(db.getSetting('META_LEADS_SINCE') || 0) || Math.floor(Date.now() / 1000) - 86400;
        let newest = since;
        const effToken = await metaPageToken(token, page);   // page token for leadgen reads
        const fr = await fetch(`https://graph.facebook.com/v21.0/${encodeURIComponent(page)}/leadgen_forms?fields=id,name&limit=50&access_token=${encodeURIComponent(effToken)}`,
            { signal: AbortSignal.timeout(10_000) }).then(r => r.json());
        if (fr.error) {
            const hint = fr.error.code === 200
                ? ' — the token cannot read this Page\'s leads. Use a token with leads_retrieval + pages_show_list + pages_read_engagement + pages_manage_metadata, and make sure the token owner has a role on the Page.'
                : '';
            console.warn('[meta-leads]', fr.error.message);
            db.setSetting('META_LEADS_LAST_ERROR', (String(fr.error.message) + hint).slice(0, 500));
            return;
        }
        for (const form of fr.data || []) {
            const filt = encodeURIComponent(`[{"field":"time_created","operator":"GREATER_THAN","value":${since}}]`);
            const lr = await fetch(`https://graph.facebook.com/v21.0/${form.id}/leads?fields=created_time,field_data&filtering=${filt}&limit=100&access_token=${encodeURIComponent(effToken)}`,
                { signal: AbortSignal.timeout(10_000) }).then(r => r.json());
            for (const l of lr.data || []) {
                const t = Math.floor(new Date(l.created_time).getTime() / 1000);
                if (t <= since) continue; // Meta's GREATER_THAN is inclusive, so we must manually filter out the boundary lead
                
                const payload = { ...l, _campaign: form.name || null };
                const f = mapInboundLeadFields('meta_lead_ad', payload);
                if (t > newest) newest = t;
                const r = await ingestExternalLead('meta_lead_ad', f);
                if (!r.duplicate) {
                    db.addRawEvent('meta_lead_ad', r.sessionId, payload, 'ok');
                }
            }
        }
        if (newest > since) db.setSetting('META_LEADS_SINCE', String(newest));
        db.deleteSettings(['META_LEADS_LAST_ERROR']).catch(() => {});   // clear on success
    } catch (e) {
        console.warn('[meta-leads] poll failed (non-critical):', e.message);
        db.setSetting('META_LEADS_LAST_ERROR', String(e.message).slice(0, 500));
    }
}
setInterval(pollMetaLeads, 5 * 60_000).unref?.();
setTimeout(pollMetaLeads, 20_000);   // first pull shortly after boot

// ─────────────────────────────────────────────────────────────
// GOOGLE CALENDAR (OAuth 2.0) — two-way sync of CRM meetings.
// Admin connects a Google account once (offline access → refresh token stored
// in settings). Setting a lead's meeting/follow-up time creates a real Calendar
// event; changing the time updates it; clearing it deletes the event. The
// refresh token is never exposed to the browser.
// ─────────────────────────────────────────────────────────────
const GCAL_SCOPE = 'https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/userinfo.email';
function gcalCfg() {
    return {
        clientId:     (db.getSetting('GCAL_CLIENT_ID') || '').trim(),
        clientSecret: (db.getSetting('GCAL_CLIENT_SECRET') || '').trim(),
        refreshToken: (db.getSetting('GCAL_REFRESH_TOKEN') || '').trim(),
        calendarId:   ((db.getSetting('GCAL_CALENDAR_ID') || '').trim()) || 'primary'
    };
}
function gcalRedirectUri() { return absoluteUrl('/admin/integrations/gcal/callback'); }
function isGcalConnected() { const c = gcalCfg(); return !!(c.clientId && c.clientSecret && c.refreshToken); }

let _gcalTok = { token: null, exp: 0 };
async function gcalAccessToken() {
    const c = gcalCfg();
    if (!c.clientId || !c.clientSecret || !c.refreshToken) return null;
    if (_gcalTok.token && Date.now() < _gcalTok.exp - 60_000) return _gcalTok.token;
    const body = new URLSearchParams({
        client_id: c.clientId, client_secret: c.clientSecret,
        refresh_token: c.refreshToken, grant_type: 'refresh_token'
    });
    const j = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body, signal: AbortSignal.timeout(10_000)
    }).then(r => r.json()).catch(e => ({ error: e.message }));
    if (!j || !j.access_token) { console.warn('[gcal] token refresh failed:', j && (j.error_description || j.error)); return null; }
    _gcalTok = { token: j.access_token, exp: Date.now() + (Number(j.expires_in || 3600) * 1000) };
    return j.access_token;
}

function gcalEventBody({ summary, description, startAt, durationMin = 30, attendees = [] }) {
    const start = new Date(startAt);
    const end = new Date(start.getTime() + Math.max(5, Number(durationMin) || 30) * 60000);
    const ev = {
        summary: String(summary || 'GrowClinic meeting').slice(0, 300),
        description: String(description || '').slice(0, 3000),
        start: { dateTime: start.toISOString() },
        end:   { dateTime: end.toISOString() }
    };
    const em = (attendees || []).filter(Boolean).map(e => ({ email: e }));
    if (em.length) ev.attendees = em;
    return ev;
}
async function gcalCreateEvent(opts) {
    const tok = await gcalAccessToken(); if (!tok) return null;
    const c = gcalCfg();
    const j = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(c.calendarId)}/events?sendUpdates=all`, {
        method: 'POST', headers: { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(gcalEventBody(opts)), signal: AbortSignal.timeout(10_000)
    }).then(r => r.json()).catch(e => ({ error: { message: e.message } }));
    if (j && j.id) return j.id;
    console.warn('[gcal] create failed:', j && j.error && j.error.message);
    return null;
}
async function gcalUpdateEvent(eventId, opts) {
    const tok = await gcalAccessToken(); if (!tok || !eventId) return false;
    const c = gcalCfg();
    const r = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(c.calendarId)}/events/${encodeURIComponent(eventId)}?sendUpdates=all`, {
        method: 'PATCH', headers: { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(gcalEventBody(opts)), signal: AbortSignal.timeout(10_000)
    }).catch(() => null);
    return !!(r && r.ok);
}
async function gcalDeleteEvent(eventId) {
    const tok = await gcalAccessToken(); if (!tok || !eventId) return false;
    const c = gcalCfg();
    const r = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(c.calendarId)}/events/${encodeURIComponent(eventId)}?sendUpdates=all`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${tok}` }, signal: AbortSignal.timeout(10_000)
    }).catch(() => null);
    return !!(r && (r.ok || r.status === 410 || r.status === 404));
}

// High-level reconcile: keep a lead's Google Calendar event in step with its
// meeting time. Fire-and-forget; stores/clears gcalEventId on the lead.
// A per-session in-flight lock prevents two near-simultaneous PATCHes from each
// creating a duplicate event.
const _gcalSyncing = new Set();
function syncLeadCalendar(sessionId, { startAt, summary, description, durationMin = 30, attendees = [] }) {
    if (!isGcalConnected()) return;
    if (_gcalSyncing.has(sessionId)) return;
    _gcalSyncing.add(sessionId);
    (async () => {
        const row = await db.getChatSession(sessionId).catch(() => null);
        const existing = row && row.gcalEventId ? String(row.gcalEventId) : null;
        if (!startAt) {                          // meeting cleared → remove event
            if (existing) {
                await gcalDeleteEvent(existing);
                await db.setGcalEventId(sessionId, null);
                db.addLeadEvent(sessionId, 'update', 'Google Calendar event removed', 'system');
            }
            return;
        }
        if (existing) {
            const ok = await gcalUpdateEvent(existing, { startAt, summary, description, durationMin, attendees });
            if (!ok) {                           // event gone on Google's side → recreate
                const id = await gcalCreateEvent({ startAt, summary, description, durationMin, attendees });
                if (id) await db.setGcalEventId(sessionId, id);
            }
        } else {
            const id = await gcalCreateEvent({ startAt, summary, description, durationMin, attendees });
            if (id) {
                await db.setGcalEventId(sessionId, id);
                db.addLeadEvent(sessionId, 'update', 'Google Calendar event created', 'system');
            }
        }
    })().catch(e => console.warn('[gcal] sync failed (non-critical):', e.message))
        .finally(() => _gcalSyncing.delete(sessionId));
}

// OAuth state (CSRF) — short-lived, in-memory.
const _gcalStates = new Map();
setInterval(() => { const now = Date.now(); for (const [k, v] of _gcalStates) if (v < now) _gcalStates.delete(k); }, 5 * 60_000).unref?.();

app.get('/admin/integrations/gcal/connect', requireAdmin, (req, res) => {
    const c = gcalCfg();
    if (!c.clientId || !c.clientSecret) return res.status(400).send('Set GCAL_CLIENT_ID and GCAL_CLIENT_SECRET first, then save.');
    const state = crypto.randomBytes(16).toString('hex');
    _gcalStates.set(state, Date.now() + 10 * 60_000);
    const url = 'https://accounts.google.com/o/oauth2/v2/auth?' + new URLSearchParams({
        client_id: c.clientId, redirect_uri: gcalRedirectUri(), response_type: 'code',
        scope: GCAL_SCOPE, access_type: 'offline', prompt: 'consent',
        include_granted_scopes: 'true', state
    }).toString();
    res.redirect(url);
});

// NOTE: no requireAdmin here — the session cookie is SameSite=Strict, so it is
// NOT sent on Google's cross-site redirect back to us. Authorization is proven
// instead by the single-use `state`, which can only be minted by the admin-gated
// /connect endpoint above. An invalid/expired/unknown state is rejected.
app.get('/admin/integrations/gcal/callback', async (req, res) => {
    const { code, state, error } = req.query;
    if (error) return res.redirect('/admin#integrations');
    if (!code || !state || !_gcalStates.has(String(state))) return res.status(400).send('Invalid or expired OAuth state — connect again from the Integrations tab.');
    _gcalStates.delete(String(state));
    const c = gcalCfg();
    try {
        const body = new URLSearchParams({
            code: String(code), client_id: c.clientId, client_secret: c.clientSecret,
            redirect_uri: gcalRedirectUri(), grant_type: 'authorization_code'
        });
        const tok = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body, signal: AbortSignal.timeout(10_000)
        }).then(r => r.json());
        if (!tok || !tok.refresh_token) {
            return res.status(400).send('Google did not return a refresh token. Remove GrowClinic under your Google Account → Security → Third-party access, then connect again.');
        }
        db.setSetting('GCAL_REFRESH_TOKEN', tok.refresh_token);
        try {
            const who = await fetch('https://www.googleapis.com/oauth2/v2/userinfo',
                { headers: { Authorization: `Bearer ${tok.access_token}` }, signal: AbortSignal.timeout(8000) }).then(r => r.json());
            if (who && who.email) db.setSetting('GCAL_CONNECTED_EMAIL', who.email);
        } catch (_e) { /* email is cosmetic */ }
        _gcalTok = { token: null, exp: 0 };
        db.logAdminAction('gcal_connect', db.getSetting('GCAL_CONNECTED_EMAIL') || 'connected', ipHashOf(req));
        res.redirect('/admin#integrations');
    } catch (e) {
        res.status(500).send('Google Calendar connection failed: ' + e.message);
    }
});

app.post('/admin/integrations/gcal/disconnect', requireAdmin, async (req, res) => {
    await db.deleteSettings(['GCAL_REFRESH_TOKEN', 'GCAL_CONNECTED_EMAIL']).catch(() => {});
    _gcalTok = { token: null, exp: 0 };
    db.logAdminAction('gcal_disconnect', 'disconnected', ipHashOf(req));
    res.json({ ok: true });
});

app.get('/admin/integrations/gcal/status', requireAdmin, (_req, res) => {
    const c = gcalCfg();
    res.json({
        configured: !!(c.clientId && c.clientSecret),
        connected: isGcalConnected(),
        email: db.getSetting('GCAL_CONNECTED_EMAIL') || null,
        calendarId: c.calendarId,
        redirectUri: gcalRedirectUri()
    });
});

// ── STALE-LEAD ALERTS — one batched digest, never per-lead spam ──
// Hourly check: open leads untouched for STALE_LEAD_DAYS+ days (default 5).
// At most one alert per ~20h (STALE_ALERT_LAST gate) so restarts and the
// hourly cadence never double-ping the team.
async function checkStaleLeads() {
    try {
        const days = Math.max(1, Math.round(Number(db.getSetting('STALE_LEAD_DAYS') || 5) || 5));
        const rows = await db.listStaleLeads(days);
        if (!rows.length) return;

        const last = db.getSetting('STALE_ALERT_LAST');
        if (last) {
            const t = new Date(last).getTime();
            if (Number.isFinite(t) && (Date.now() - t) < 20 * 3600 * 1000) return;
        }

        const lines = rows.slice(0, 8).map(r => {
            const base = new Date(r.crmUpdatedAt || r.startedAt).getTime();
            const nd = Number.isFinite(base) ? Math.max(0, Math.floor((Date.now() - base) / 86_400_000)) : '?';
            return `• ${r.clinicName || r.userName || r.sessionId} (${r.crmStatus || 'new'}, ${nd}d)`;
        });
        const text = `${rows.length} leads going stale (no activity ≥${days} days):\n` + lines.join('\n')
            + (rows.length > 8 ? `\n…and ${rows.length - 8} more in the CRM board.` : '');

        const jobs = [];
        const tgToken = (db.getSetting('TELEGRAM_BOT_TOKEN') || '').trim();
        const tgChat  = (db.getSetting('TELEGRAM_CHAT_ID') || '').trim();
        if (tgToken && tgChat) {
            jobs.push(postJson(`https://api.telegram.org/bot${tgToken}/sendMessage`,
                { chat_id: tgChat, text }, 'telegram', 'leads.stale'));
        }
        const hook = (db.getSetting('CRM_EVENTS_WEBHOOK') || '').trim();
        if (hook) {
            jobs.push(postJson(hook,
                { event: 'leads.stale', at: new Date().toISOString(), count: rows.length, leads: rows.map(r => r.sessionId) },
                'events-webhook', 'leads.stale'));
        }
        // Same batched summary by email (Notifications matrix → stale_digest).
        if (messaging.isEmailConfigured()) {
            const staleRecips = await notifyRecipients('stale_digest');
            for (const staleEmail of staleRecips) {
                jobs.push(messaging.sendSystemEmail({
                    email: staleEmail,
                    subject: `[GrowClinic] ${rows.length} lead${rows.length === 1 ? '' : 's'} going stale`,
                    text: text + `\n\nOpen the CRM: ${absoluteUrl('/admin')}`,
                    html: `<div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;color:#0f172a">
                        <h2 style="color:#1d4ed8;margin:0 0 12px;font-size:18px">${rows.length} lead${rows.length === 1 ? '' : 's'} going stale</h2>
                        <p style="font-size:13px;color:#475569;white-space:pre-line">${escapeHtml(text)}</p>
                        <p style="margin:18px 0"><a href="${escapeHtml(absoluteUrl('/admin'))}" style="background:#1d4ed8;color:#fff;text-decoration:none;padding:10px 22px;border-radius:8px;font-weight:700;display:inline-block">Open in CRM</a></p>
                        <p style="font-size:12px;color:#94a3b8">GrowClinic CRM — stale-lead digest</p>
                    </div>`
                }).catch(e => console.warn('[stale-leads] email failed:', e.message)));
            }
        }
        if (!jobs.length) return;   // nothing configured — keep the 20h window unspent
        await Promise.allSettled(jobs);
        await db.setSetting('STALE_ALERT_LAST', new Date().toISOString());
    } catch (e) {
        console.warn('[stale-leads] check failed (non-critical):', e.message);
    }
}
setInterval(checkStaleLeads, 60 * 60_000).unref?.();

// ── DAILY DIGEST EMAIL — morning summary to NOTIFY_EMAIL ─────
// Enabled with DAILY_DIGEST=on (Integrations → Email Alerts). Sends once per
// day in the DIGEST_HOUR server hour (default 8); DIGEST_LAST_SENT prevents
// duplicates across restarts and the hourly cadence.
const localDateStr = (d = new Date()) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

async function checkDailyDigest() {
    try {
        if (db.getSetting('DAILY_DIGEST') !== 'on') return;
        if (!messaging.isEmailConfigured()) return;
        const digestRecips = await notifyRecipients('daily_digest');
        if (!digestRecips.length) return;
        const hourRaw = Number(db.getSetting('DIGEST_HOUR') || 8);
        const hour = Number.isFinite(hourRaw) && hourRaw >= 0 && hourRaw <= 23 ? Math.floor(hourRaw) : 8;
        const now = new Date();
        if (now.getHours() !== hour) return;
        const today = localDateStr(now);
        if (db.getSetting('DIGEST_LAST_SENT') === today) return;

        const rows = await db.listChatSessions({ limit: 1000 });
        const yesterday = localDateStr(new Date(now.getTime() - 86_400_000));
        const dayOf = v => String(v || '').slice(0, 10);
        const leads = (rows || []).filter(r => r.leadCaptured);
        const recent = leads.filter(r => dayOf(r.startedAt) === today || dayOf(r.startedAt) === yesterday);
        const byStage = {};
        for (const r of leads) {
            const st = normStageName(r.crmStatus) || 'new';
            byStage[st] = (byStage[st] || 0) + 1;
        }
        const srcCount = {};
        for (const r of (recent.length ? recent : leads)) {
            const src = r.channel || r.source || 'direct';
            srcCount[src] = (srcCount[src] || 0) + 1;
        }
        const topSource = Object.entries(srcCount).sort((a, b) => b[1] - a[1])[0]?.[0] || '—';
        const stats = {
            date: today,
            leadsToday: leads.filter(r => dayOf(r.startedAt) === today).length,
            leadsYesterday: leads.filter(r => dayOf(r.startedAt) === yesterday).length,
            verified: recent.filter(r => r.verified).length,
            dueToday: (rows || []).filter(r => r.crmFollowUpAt && dayOf(r.crmFollowUpAt) === today).length,
            byStage,
            topSource
        };
        let anySent = false;
        for (const email of digestRecips) {
            const r = await messaging.sendDigestEmail({ email, stats }).catch(() => null);
            if (r && r.ok) { anySent = true; console.log(`[digest] morning digest sent to ${email}`); }
        }
        if (anySent) db.setSetting('DIGEST_LAST_SENT', today);
    } catch (e) {
        console.warn('[digest] check failed (non-critical):', e.message);
    }
}
setInterval(checkDailyDigest, 60 * 60_000).unref?.();
setTimeout(checkDailyDigest, 25_000);   // catch the send hour shortly after boot too

// Integrations test — sends a demo lead to ONE target so the admin can verify
// wiring without waiting for a real lead. Returns the real success/failure.
app.post('/admin/integrations/test', requireRole('admin', 'support'), async (req, res) => {
    const target = String(req.body?.target || '');
    const demo = {
        sessionId: 'testlead01', name: 'Test Lead', clinic: 'Demo Clinic', city: 'Dubai',
        phone: '+971501234567', status: 'completed', channel: 'integration_test',
        reportUrl: absoluteUrl('/api/report/testlead01', req)
    };
    const payload = { event: 'lead.test', at: new Date().toISOString(), lead: demo };
    try {
        let ok = false, detail = '';
        if (target === 'events') {
            const url = (db.getSetting('CRM_EVENTS_WEBHOOK') || '').trim();
            if (!url) return res.json({ ok: false, detail: 'CRM_EVENTS_WEBHOOK not set' });
            ok = await postJson(url, payload, 'events-webhook', 'lead.test');
        } else if (target === 'sheets') {
            const url = (db.getSetting('SHEETS_WEBHOOK_URL') || '').trim();
            if (!url) return res.json({ ok: false, detail: 'SHEETS_WEBHOOK_URL not set' });
            ok = await postJson(url, { event: 'lead.test', at: payload.at, ...demo }, 'sheets', 'lead.test');
        } else if (target === 'telegram') {
            const t = (db.getSetting('TELEGRAM_BOT_TOKEN') || '').trim();
            const c = (db.getSetting('TELEGRAM_CHAT_ID') || '').trim();
            if (!t || !c) return res.json({ ok: false, detail: 'Bot token or chat ID not set' });
            ok = await postJson(`https://api.telegram.org/bot${t}/sendMessage`,
                { chat_id: c, text: leadAlertText('lead.created', demo) + '\n\n(test message)' }, 'telegram', 'lead.test');
            if (!ok) detail = 'Telegram rejected — check the bot token and that you have messaged the bot first';
        } else if (target === 'email') {
            const to = (db.getSetting('NOTIFY_EMAIL') || '').trim() || (db.getSetting('SMTP_USER') || '').trim();
            const r = await messaging.sendTestEmail({ to });
            ok = !!r.ok;
            detail = ok ? `Test email sent to ${to} — check the inbox (and spam)` : (r.error || 'Send failed');
        } else if (target === 'meta-leads') {
            const t = (db.getSetting('META_LEADS_TOKEN') || '').trim();
            const p = (db.getSetting('META_PAGE_ID') || '').trim();
            if (!t || !p) return res.json({ ok: false, detail: 'Token or Page ID not set' });
            const j = await fetch(`https://graph.facebook.com/v21.0/${encodeURIComponent(p)}?fields=name&access_token=${encodeURIComponent(t)}`,
                { signal: AbortSignal.timeout(10_000) }).then(r => r.json()).catch(e => ({ error: { message: e.message } }));
            if (j.error) {
                ok = false; detail = j.error.message;
            } else {
                // Page is reachable — now verify actual leadgen READ access with a
                // page token, which is the exact call the importer makes.
                const eff = await metaPageToken(t, p);
                const lf = await fetch(`https://graph.facebook.com/v21.0/${encodeURIComponent(p)}/leadgen_forms?fields=id&limit=1&access_token=${encodeURIComponent(eff)}`,
                    { signal: AbortSignal.timeout(10_000) }).then(r => r.json()).catch(e => ({ error: { message: e.message } }));
                if (lf.error) {
                    ok = false;
                    detail = `Page "${j.name}" reachable, but lead forms are not: ${lf.error.message}`
                        + (lf.error.code === 200 ? ' (token needs leads_retrieval + pages_show_list + pages_read_engagement + pages_manage_metadata, and a Page role for the token owner)' : '');
                } else {
                    ok = true;
                    detail = `Connected to page "${j.name}" — lead forms readable, auto-import runs every 5 minutes`;
                }
            }
        } else {
            return res.status(400).json({ ok: false, detail: 'Unknown target' });
        }
        db.logAdminAction('integration_test', `${target}: ${ok ? 'ok' : 'failed'}`, ipHashOf(req));
        res.json({ ok, detail: detail || (ok ? 'Delivered' : 'Delivery failed — check the value and server logs') });
    } catch (e) {
        res.json({ ok: false, detail: e.message });
    }
});

// Replay a stored raw event through the SAME field mapping + ingestion path as
// the live webhook (dedupe still applies) — for events that erred or mis-mapped.
app.post('/admin/integrations/replay/:id', requireRole('admin', 'support'), async (req, res) => {
    try {
        const ev = await db.getRawEvent(req.params.id);
        if (!ev) return res.status(404).json({ error: 'Raw event not found' });
        let body = {};
        try { body = JSON.parse(ev.payload || '{}') || {}; }
        catch (_e) { return res.status(400).json({ error: 'Stored payload is not valid JSON' }); }
        const ch = String(ev.channel || 'generic');
        const f = mapInboundLeadFields(ch, body);
        if (!f.name && !f.phone && !f.email) {
            return res.status(400).json({ error: 'No recognisable lead fields in stored payload' });
        }
        const r = await ingestExternalLead(inboundChannelName(ch), f);
        db.logAdminAction('integration_replay',
            `#${ev.id} ${ch} → ${r.sessionId}${r.duplicate ? ' (duplicate, merged)' : ''}`, ipHashOf(req));
        res.json({ ok: true, sessionId: r.sessionId, duplicate: !!r.duplicate });
    } catch (e) {
        console.error('[replay] error:', e.message);
        res.status(500).json({ error: 'Replay failed' });
    }
});

// Integration health rollup for the admin panel: per-channel raw-event stats,
// which integrations are configured, and the Meta poller's last run/error.
app.get('/admin/integrations/health', requireRole('admin', 'support'), async (_req, res) => {
    try {
        const stats = await db.rawEventStats().catch(() => []);
        const byCh = {};
        for (const s of stats || []) byCh[s.channel] = s;
        const channels = {};
        for (const ch of ['google-ads', 'sheets-in', 'generic', 'meta_lead_ad']) {
            const s = byCh[ch] || {};
            channels[ch] = {
                lastAt: s.lastAt || null,
                count24h: Number(s.count24h) || 0,
                errors24h: Number(s.errors24h) || 0
            };
        }
        const has = k => ((db.getSetting(k) || '').trim().length > 0);
        res.json({
            channels,
            configured: {
                inbound:   ((db.getSetting('INBOUND_LEADS_KEY') || '').trim().length >= 12),
                metaLeads: has('META_LEADS_TOKEN') && has('META_PAGE_ID'),
                events:    has('CRM_EVENTS_WEBHOOK'),
                sheets:    has('SHEETS_WEBHOOK_URL'),
                telegram:  has('TELEGRAM_BOT_TOKEN')
            },
            metaLastRun:   db.getSetting('META_LEADS_LAST_RUN')   || null,
            metaLastError: db.getSetting('META_LEADS_LAST_ERROR') || null,
            recent: await db.listRawEvents({ limit: 20 }).catch(() => [])
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// API-key auth for external platforms (n8n HTTP node etc.). Generate any long
// random string and save it as CRM_API_KEY in admin → Tracking, then send it
// as the X-API-Key header. Constant-time compare.
function requireApiKey(req, res, next) {
    const expected = (db.getSetting('CRM_API_KEY') || '').trim();
    if (!expected || expected.length < 16) {
        return res.status(503).json({ error: 'CRM API not configured — set a CRM_API_KEY (16+ chars) in admin → Tracking' });
    }
    const provided = (req.get('x-api-key') || '').trim();
    const a = Buffer.from(expected), b = Buffer.from(provided);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
        return res.status(401).json({ error: 'Invalid API key' });
    }
    next();
}

// GET /api/crm/leads?since=2026-07-01&limit=200&offset=0&search=dubai
app.get('/api/crm/leads', requireApiKey, async (req, res) => {
    const limit  = Math.min(parseInt(req.query.limit, 10)  || 200, 1000);
    const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);
    const rows = await db.listChatSessions({
        search: req.query.search || '',
        from: req.query.since ? String(req.query.since).slice(0, 19) : null,
        limit, offset
    });
    res.json({ total: rows.total ?? rows.length, offset, limit, leads: rows.map(r => flatLead(r, req)) });
});

app.get('/api/crm/leads/:sessionId', requireApiKey, async (req, res) => {
    const row = await db.getChatSession(req.params.sessionId);
    if (!row) return res.status(404).json({ error: 'Lead not found' });
    const lead = flatLead(row, req);
    if (req.query.transcript === '1') lead.transcript = row.transcript || null;
    res.json(lead);
});

// PATCH /api/crm/leads/:id  { "status": "called", "notes": "…", "followUpAt": "2026-07-15" }
app.patch('/api/crm/leads/:sessionId', requireApiKey, async (req, res) => {
    try {
        const { status, notes, followUpAt, rating, dealValue, remark } = req.body || {};
        let changed = 0;
        if (remark !== undefined) changed += (await db.addChatRemark(req.params.sessionId, 'api', remark)).changes;
        if ([status, notes, followUpAt, rating, dealValue].some(v => v !== undefined)) {
            changed += (await db.updateChatCrm(req.params.sessionId, { status, notes, followUpAt, rating, dealValue })).changes;
        }
        if (!changed) return res.status(404).json({ error: 'Lead not found or nothing to update' });
        sendCrmEvent('lead.updated', req.params.sessionId, { via: 'api' });
        res.json({ ok: true });
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

// ── API KEY REVEAL (full value, logged) ─────────────────────
app.get('/admin/api-keys/:name/reveal', requireRole('admin', 'support'), (req, res) => {
    const name = req.params.name;
    if (!db.MANAGED_KEYS.includes(name)) return res.status(400).json({ error: 'Unknown key name' });
    db.logAdminAction('key_reveal', name, ipHashOf(req));
    res.json({ name, value: db.getSetting(name) || null });
});

// ─────────────────────────────────────────────────────────────
// HEALTH CHECK ENDPOINT
// ─────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
    const isReal = (k) => !!(k && !k.includes('YOUR_') && k.length > 10);
    const hasGemini = isReal(db.getSetting('GEMINI_API_KEY'));
    const hasOpenAI = isReal(db.getSetting('OPENAI_API_KEY'));
    const hasGoogle = isReal(db.getSetting('GOOGLE_API_KEY'));

    // Chat works as long as Gemini OR OpenAI is set (Gemini preferred, OpenAI as fallback)
    const chatReady = hasGemini || hasOpenAI;

    res.json({
        status: 'ok',
        // Backwards-compatible fields used by frontend
        hasOpenAIKey: chatReady,
        // Granular flags
        hasGemini, hasOpenAI, hasGoogle,
        message: chatReady
            ? 'Server running. AI provider configured.'
            : 'Server running. No AI key configured — open Admin → API Keys to add Gemini or OpenAI.'
    });
});

// ─────────────────────────────────────────────────────────────
// REPORT PROGRESS ENDPOINT — polled by frontend during generation
// ─────────────────────────────────────────────────────────────
app.get('/api/report-progress/:sessionId', (req, res) => {
    const { sessionId } = req.params;
    if (!/^[a-z0-9]{6,32}$/i.test(sessionId)) {
        return res.status(400).json({ error: 'Invalid session ID' });
    }
    const progress = reportProgress[sessionId] || { step: 0, total: 5, message: 'Starting...', done: false, error: false };
    const reportExists = fs.existsSync(path.join(REPORTS_DIR, `${sessionId}.json`));
    if (reportExists && !progress.done) {
        progress.step = 5;
        progress.done = true;
        progress.message = 'Report ready!';
    }
    res.json({ ...progress, reportReady: reportExists });
});

// ─────────────────────────────────────────────────────────────
// CHAT ENDPOINT
// ─────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────
// ATTRIBUTE EXTRACTION ENGINE
// A user can dump many details in one message; this pulls every attribute it
// can find into a per-session profile so the bot skips what's already known and
// asks only for the gaps. Heavy on the first 1–2 turns, light (only on data-rich
// messages) after that. Fails open: on error the normal step-flow still runs.
// ─────────────────────────────────────────────────────────────
const PROFILE_FIELDS = ['role','name','clinicName','specialty','city','pincode','website','phone','googlePresence','ads','monthlyVolume','goal'];
const PROFILE_LABELS = { role:'Role', name:'Name', clinicName:'Clinic/Hospital name', specialty:'Specialty', city:'City', pincode:'Pincode', website:'Website', phone:'WhatsApp number', googlePresence:'Google presence', ads:'Running ads', monthlyVolume:'New patients per month', goal:'Primary goal' };
// Gaps the bot should actively ask for (website/pincode/specialty/goal are conditional/inferred).
const PROFILE_ASKABLE = ['role','name','clinicName','city','phone','googlePresence','ads','monthlyVolume'];

function isDataRich(msg) {
    const s = String(msg || '');
    if (s.length > 60) return true;
    const signals = [/https?:\/\/|www\.|\.[a-z]{2,4}\b/i, /\b\d{5,6}\b/, /\+?\d[\d\s().-]{7,14}\d/, /,/];
    return signals.filter(r => r.test(s)).length >= 2;
}

async function extractAttributes(transcript, sessionId, profileSoFar = {}) {
    const prompt = `You maintain a lead profile for an ongoing chat. Current profile (may be incomplete, or contain values the user has since corrected):
${JSON.stringify(profileSoFar || {})}

From the FULL conversation below, return the up-to-date profile as ONLY JSON (no markdown). Rules:
- Include ONLY what the user actually stated — never guess or infer beyond their words.
- If the user corrected or changed a detail at any point, return the LATEST value.
- If the user said they have NO website, set "website" to the word "none".
- A short reply directly after a question is the answer to that question (e.g. a single word after "what's your name?" IS the name).
- Use null for anything not stated yet.
{"role":"Doctor|Owner|Manager|Staff or null","name":"first name or null","clinicName":"clinic/hospital name or null","specialty":"specialty/treatment focus or null","city":"city or null","pincode":"postal/ZIP/pin code (any country format) or null","website":"website/domain, or the word none if user has no website, or null","phone":"phone/WhatsApp number or null","googlePresence":"Yes|Sometimes|No or null","ads":"Google|Meta|Both|Other|No or null","monthlyVolume":"number or range or null","goal":"primary goal or null"}
Conversation:
${transcript}`;
    try {
        const { text } = await callGemini({
            systemPrompt: 'You are a precise data extractor. Return only valid JSON. No markdown.',
            messages: [{ role: 'user', content: prompt }],
            operation: 'attr_extract', sessionId, model: GEMINI_MODEL_EXTRACT, temperature: 0.1
        });
        const cleaned = text.trim().replace(/^```json?\s*/i, '').replace(/```\s*$/, '').trim();
        return JSON.parse(cleaned);
    } catch (e) {
        console.warn('[attr] extraction failed (non-critical):', e.message);
        return {};
    }
}

// Fill empty slots only — a confident earlier value is never overwritten by a vaguer/later one.
// LATEST statement wins: the extractor sees the whole conversation (plus the
// current profile) and returns the most recent value for every field — so a
// user's correction ("sorry, it's Bright Smile DENTAL, not clinic") updates the
// profile. cleanField still filters junk; null never erases a known value.
function mergeProfile(profile, extracted) {
    const out = { ...(profile || {}) };
    for (const f of PROFILE_FIELDS) {
        const raw = extracted?.[f];
        let s = cleanField(raw);
        // "none" is meaningful for website (user has no site) but cleanField
        // strips it as junk — restore the sentinel for this field only.
        if (!s && f === 'website' && /^(none|no website|no)$/i.test(String(raw || '').trim())) s = 'none';
        if (s) out[f] = s;
    }
    return out;
}

// The deterministic question order. The model no longer decides what to ask
// next — the code does, and injects it as a hard directive each turn.
const PROFILE_ASK_ORDER = ['role', 'name', 'clinicName', 'website', 'city', 'phone', 'googlePresence', 'ads', 'monthlyVolume'];
function nextRequiredField(profile) {
    for (const f of PROFILE_ASK_ORDER) if (!profile || !profile[f]) return f;
    return null;
}

function buildProfileAppendix(profile, leadCaptured = false) {
    const known = PROFILE_FIELDS.filter(f => profile && profile[f]);
    const next = nextRequiredField(profile);
    if (leadCaptured) {
        return `\n\n────────\nSTATUS: The audit is COMPLETE and the report has been delivered. Do NOT restart the flow or re-ask any question — answer follow-ups per "AFTER REPORT DELIVERED".`;
    }
    if (!known.length) return '';
    const knownLines = known.map(f => `- ${PROFILE_LABELS[f]}: ${profile[f] === 'none' ? 'None (they have no website — already flagged, never re-ask)' : profile[f]}`).join('\n');
    return `\n\n────────\nDYNAMIC PROFILE — the user has ALREADY provided these. Treat each as answered and NEVER ask for it again:\n${knownLines}\n${next
        ? `NEXT REQUIRED STEP (follow strictly): ask for ${PROFILE_LABELS[next]} — ONE question, nothing else. Do not skip ahead, do not re-ask anything above, do not run the audit yet.`
        : `ALL required details are collected — do NOT ask any further questions. Run STEP 10 now: the audit reveal, ending with the LEAD_CAPTURED token.`}\nIf the user supplied several details in one message, acknowledge them in ONE short line, then ask only for the step above. If the user corrects a detail, use the corrected value from now on without comment.`;
}

// Page-visit ping — fired once on load from the browser (so bots that don't run
// JS aren't counted). Records the session + its attribution as the top of the
// marketing funnel, even for visitors who never send a message.
app.post('/api/visit', rateLimit('visit'), (req, res) => {
    const { sessionId, source, channel, campaign, gclid, fbclid, landingPage, referrer } = req.body || {};
    if (!sessionId) return res.status(400).json({ ok: false });
    const ipHash = crypto.createHash('sha256').update(req.ip || 'unknown').digest('hex').slice(0, 16);
    const attr = {};
    if (source)   attr.source   = String(source).slice(0, 64);
    if (channel)  attr.channel  = String(channel).slice(0, 64);
    if (campaign) attr.campaign = String(campaign).slice(0, 128);
    // Click IDs + landing context (only written when present, so a later ping
    // can't wipe first-touch values — trackChatActivity skips null/undefined).
    if (gclid)       attr.gclid       = String(gclid).slice(0, 128);
    if (fbclid)      attr.fbclid      = String(fbclid).slice(0, 128);
    if (landingPage) attr.landingPage = String(landingPage).slice(0, 512);
    if (referrer)    attr.referrer    = String(referrer).slice(0, 512);
    db.trackChatActivity(sessionId, attr, ipHash, req.get('user-agent') || '');
    res.json({ ok: true });
});

app.post('/api/chat', rateLimit('chat'), async (req, res) => {
    const { sessionId, message, source, channel, campaign, gclid, fbclid, landingPage, referrer } = req.body;
    if (!sessionId) return res.status(400).json({ error: 'Session ID required' });

    if (!sessions[sessionId]) {
        sessions[sessionId] = {
            messages: [{ role: 'system', content: CHAT_PROMPT }],
            leadCaptured: false,
            profile: {}
        };
    }
    sessions[sessionId].lastActivity = Date.now();

    // Track this chat in the persistent DB (privacy: hash the IP, don't store raw).
    // Attribution is recorded so the admin Leads table can label where each lead
    // came from: `source` (growclinic-site / utm_source), `channel` (the resolved
    // traffic channel — google_ads / meta_ads / *_organic / referral / direct),
    // and the `campaign` (utm_campaign). Each is only written when present, so a
    // later message can't wipe the first-touch attribution.
    const ipHash = crypto.createHash('sha256').update(req.ip || 'unknown').digest('hex').slice(0, 16);
    const userAgent = req.get('user-agent') || '';
    const attrFields = {};
    if (source)   attrFields.source   = String(source).slice(0, 64);
    if (channel)  attrFields.channel  = String(channel).slice(0, 64);
    if (campaign) attrFields.campaign = String(campaign).slice(0, 128);
    if (gclid)       attrFields.gclid       = String(gclid).slice(0, 128);
    if (fbclid)      attrFields.fbclid      = String(fbclid).slice(0, 128);
    if (landingPage) attrFields.landingPage = String(landingPage).slice(0, 512);
    if (referrer)    attrFields.referrer    = String(referrer).slice(0, 512);
    db.trackChatActivity(sessionId, attrFields, ipHash, userAgent);

    // Stash request meta for server-side Meta CAPI (raw IP/UA + fb cookies).
    sessions[sessionId].meta = {
        ip: (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.ip || '',
        ua: userAgent,
        fbp: req.cookies?._fbp || '',
        fbc: req.cookies?._fbc || ''
    };

    let userMsg = message === 'INIT_CONVERSATION' ? 'Hello! Please start the audit.' : message;

    // If lead already captured and user is asking about/for the report, return pointer — don't feed to AI
    if (sessions[sessionId]?.leadCaptured) {
        const lm = userMsg.toLowerCase();
        if (lm.includes('report') || lm.includes('pdf') || lm.includes('show me') || lm.includes('result') || lm.includes('audit') || lm.includes('download')) {
            const existingReportUrl = `${BASE_PATH}/api/report/${sessionId}`;
            const reportExists = fs.existsSync(path.join(REPORTS_DIR, `${sessionId}.json`));
            return res.json({
                reply: reportExists
                    ? "Your full PDF report is ready 👆 Click **'View & Download Report'** in the card above to open it. It covers your GMB score, website performance, ads gap, and a personalised growth plan."
                    : "Your report is still being generated — it usually takes 15–30 seconds 🔄 The card above will auto-load when it's ready.",
                isLeadCaptured: true,
                reportUrl: existingReportUrl
            });
        }
    }

    sessions[sessionId].messages.push({ role: 'user', content: userMsg });

    // ── Attribute extraction: runs on EVERY real user turn so nothing the user
    //    says is missed and corrections update the profile (latest wins).
    //    flash-lite keeps it fast (~0.3s) and near-free. Fails open.
    try {
        const seedMsg = userMsg !== 'Hello! Please start the audit.';
        if (seedMsg) {
            const tx = sessions[sessionId].messages
                .filter(m => m.role !== 'system')
                .map(m => `[${m.role.toUpperCase()}]: ${m.content}`).join('\n');
            const before = { ...(sessions[sessionId].profile || {}) };
            const extracted = await extractAttributes(tx, sessionId, before);
            sessions[sessionId].profile = mergeProfile(before, extracted);

            // Attribute-collection events: persist each newly captured / corrected
            // attribute to the chat-session row immediately, so the admin Leads
            // table fills as the chat progresses (not only at report time).
            const p = sessions[sessionId].profile;
            const dbFields = {};
            if (p.name && p.name !== before.name)             dbFields.userName   = p.name;
            if (p.clinicName && p.clinicName !== before.clinicName) dbFields.clinicName = p.clinicName;
            if (p.city && p.city !== before.city)             dbFields.city       = p.city;
            if (p.phone && p.phone !== before.phone)          dbFields.phone      = p.phone;
            if (p.website && p.website !== 'none' && p.website !== before.website) dbFields.websiteUrl = p.website;
            if (Object.keys(dbFields).length) {
                try { db.trackChatActivity(sessionId, dbFields); } catch (_e) {}
            }
        }
    } catch (e) {
        console.warn('[attr] merge skipped (non-critical):', e.message);
    }

    try {
        // Strip system message from history — Gemini takes it separately
        const historyForGemini = sessions[sessionId].messages.filter(m => m.role !== 'system');
        // Static base prompt + a dynamic appendix listing what's already known
        // and a hard NEXT-STEP directive, so question order is code-driven.
        const systemPrompt = CHAT_PROMPT + buildProfileAppendix(sessions[sessionId].profile, sessions[sessionId].leadCaptured);

        let aiReplyMessageRaw;
        try {
            ({ text: aiReplyMessageRaw } = await callGemini({
                systemPrompt,
                messages: historyForGemini,
                operation: 'chat',
                sessionId,
                temperature: 0.7,
                model: GEMINI_MODEL_CHAT
            }));
        } catch (gemErr) {
            // RESILIENCE: if Gemini is down / out of credits / rate-limited,
            // fall back to OpenAI so the funnel never dies on a billing hiccup.
            console.warn('[chat] Gemini failed, falling back to OpenAI:', gemErr.message);
            const openai = getOpenAIClient();
            const msgsForOpenAI = sessions[sessionId].messages.map(
                m => m.role === 'system' ? { role: 'system', content: systemPrompt } : m
            );
            const completion = await openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: msgsForOpenAI,
                temperature: 0.7
            });
            db.logApiUsage({
                provider: 'openai', model: 'gpt-4o-mini', operation: 'chat', sessionId,
                promptTokens: completion.usage?.prompt_tokens || 0,
                completionTokens: completion.usage?.completion_tokens || 0,
                totalTokens: completion.usage?.total_tokens || 0
            });
            aiReplyMessageRaw = completion.choices[0].message.content;
        }

        const aiReplyObj = { role: 'assistant', content: aiReplyMessageRaw };
        sessions[sessionId].messages.push(aiReplyObj);

        let aiReplyMessage = aiReplyObj.content;
        let isLeadCaptured = false;
        let reportResultUrl = null;

        // Robust LEAD_CAPTURED detection — case-insensitive + content-based fallback
        const lcMsg = aiReplyMessage.toLowerCase();
        const hasToken = lcMsg.includes('lead_captured');

        // Fallback: detect the audit-complete message even if GPT forgot the token
        const hasReportOptions = (lcMsg.includes('show me the report') || lcMsg.includes('book a strategy call') || lcMsg.includes('book a call') || lcMsg.includes('view report') || lcMsg.includes('get my report'));
        const hasAuditSignals = (lcMsg.includes('running your audit') || lcMsg.includes('found gaps') || lcMsg.includes('scanning') || lcMsg.includes('done') || lcMsg.includes('audit complete') || lcMsg.includes('costing you') || lcMsg.includes('checking google') || lcMsg.includes('ready') || lcMsg.includes('🔥'));
        const hasFallbackSignals = (
            !sessions[sessionId].leadCaptured &&
            hasReportOptions &&
            hasAuditSignals
        );

        // Extra fallback: if this is the last question (patient volume) response and GPT jumped to audit
        const isPostVolumeAudit = (
            !sessions[sessionId].leadCaptured &&
            sessions[sessionId].messages.length >= 18 &&
            hasAuditSignals &&
            (lcMsg.includes('report') || lcMsg.includes('audit') || lcMsg.includes('gaps'))
        );

        // ── Essentials gate: never accept an audit-finish (token OR heuristics)
        // unless the conversation actually contains a clinic name and a phone.
        // Stops the model (or a loose heuristic match) from jumping to the
        // report before the flow is complete.
        const profNow = sessions[sessionId].profile || {};
        const userTextAll = sessions[sessionId].messages.filter(m => m.role === 'user').map(m => m.content).join('\n');
        const phoneEvidence = !!(profNow.phone || sessions[sessionId].verifiedPhone || /\+?\d[\d\s().-]{7,14}\d/.test(userTextAll));
        const essentialsOk = !!(profNow.clinicName && phoneEvidence);

        if ((hasToken || hasFallbackSignals || isPostVolumeAudit) && !essentialsOk) {
            const missing = !profNow.clinicName ? 'clinic name' : 'phone number';
            console.warn(`[${sessionId}] Early finish attempt blocked — missing ${missing}. Token stripped.`);
            aiReplyMessage = aiReplyMessage.replace(/LEAD_CAPTURED/gi, '').trim();
        } else if (hasToken || hasFallbackSignals || isPostVolumeAudit) {
            isLeadCaptured = true;
            console.log(`[${sessionId}] Lead detected via ${hasToken ? 'LEAD_CAPTURED token' : hasFallbackSignals ? 'fallback signals' : 'post-volume audit detection'}`);
            // Strip all variants of the token (case-insensitive)
            aiReplyMessage = aiReplyMessage.replace(/LEAD_CAPTURED/gi, '').trim();
            sessions[sessionId].leadCaptured = true;

            const transcript = sessions[sessionId].messages
                .map(m => `[${m.role.toUpperCase()}]: ${m.content}`)
                .join('\n');

            saveLeadLocally(sessionId, transcript);
            console.log(`[${sessionId}] Lead captured — generating report in background...`);

            // Fire-and-forget: generate report in background so response returns instantly
            reportProgress[sessionId] = { step: 0, total: 5, message: 'Starting report...', done: false, error: false };
            generateFomoReport(transcript, sessionId).then(async reportData => {
                // Make all scores reconcile (overall = avg of findings; headline = findings).
                reportData = reconcileScores(reportData);
                // Unlock immediately if the lead already verified their WhatsApp,
                // OR if this is a non-India email lead who gave their email — per
                // product decision we email the final link even without the code.
                // India phone leads with no verification stay a 10% teaser.
                const sess = sessions[sessionId] || {};
                const verifiedPhone = sess.verifiedPhone || null;
                const emailChannel = (sess.verifiedEmail && sess.verifiedEmail.email) || sess.emailForReport || null;
                const unlock = !!verifiedPhone || !!emailChannel;
                reportData.verified = unlock;
                // SAVE FILE FIRST — this is critical. If DB insert fails, report still loads.
                const reportFilePath = path.join(REPORTS_DIR, `${sessionId}.json`);
                fs.writeFileSync(reportFilePath, JSON.stringify(reportData, null, 2));
                console.log(`[${sessionId}] Report generated and saved.${unlock ? (verifiedPhone ? ' (phone-verified — unlocked)' : ' (email lead — unlocked, link emailed)') : ' (locked teaser)'}`);

                // Deliver now to WhatsApp (if phone-verified) and/or email.
                if (unlock) {
                    try {
                        const deliveryUrl = absoluteUrl(`${BASE_PATH}/api/report/${sessionId}`);
                        if (/^https?:\/\//.test(deliveryUrl)) {
                            deliverReport({
                                name: reportData._rawLead?.name || reportData.ownerName || '',
                                clinic: reportData._rawLead?.clinicName || reportData.clinicName || '',
                                phone: reportData._rawLead?.phone || null,
                                verifiedPhone,
                                email: emailChannel || reportData._rawLead?.email || null,
                                reportUrl: deliveryUrl,
                                sessionId
                            });
                        }
                    } catch (e) { console.warn(`[${sessionId}] deliver-on-gen:`, e.message); }
                }

                // DB insert (non-critical — wrapped in its own try/catch)
                try {
                    if (reportData._rawLead) {
                        await db.insertLead({
                            ...reportData._rawLead,
                            auditScore: reportData.overallScore,
                            reportUrl: `${BASE_PATH}/api/report/${sessionId}`
                        });
                        console.log(`[${sessionId}] Lead successfully pushed to the database.`);

                        // Update chat session row with the structured lead data we now have
                        db.trackChatActivity(sessionId, {
                            clinicName:  reportData._rawLead.clinicName  || null,
                            userName:    reportData._rawLead.name        || null,
                            city:        reportData._rawLead.city        || null,
                            phone:       reportData._rawLead.phone       || null,
                            websiteUrl:  reportData._rawLead.website     || null,
                            reportUrl:   `${BASE_PATH}/api/report/${sessionId}`,
                            completed:   1,
                            leadCaptured: 1
                        });
                        // n8n / CRM event: a fresh lead just landed.
                        setTimeout(() => sendCrmEvent('lead.created', sessionId), 1500);
                        setTimeout(() => { try { runAutomations('lead.created', sessionId).catch(() => {}); } catch (_e) {} }, 500);
                    }
                } catch (dbErr) {
                    console.error(`[${sessionId}] DB insert failed (report still saved):`, dbErr.message);
                }

                // NOTE: WhatsApp/email delivery is intentionally NOT sent here.
                // The report stays locked (10% teaser) until the visitor verifies
                // their WhatsApp via OTP — delivery fires from /api/otp/verify on
                // success. No verification = nothing sent to WhatsApp.

                // Meta Conversions API — server-side Lead (dedups with the browser
                // Pixel via the shared event_id "lead_<sessionId>").
                try {
                    if (messaging.isCapiConfigured()) {
                        const vp = sessions[sessionId]?.verifiedPhone || null;
                        const phoneForCapi = vp ? `${vp.countryCode}${vp.mobile}` : (reportData._rawLead?.phone || null);
                        const m = sessions[sessionId]?.meta || {};
                        const capi = await messaging.sendMetaCapiLead({
                            eventId: 'lead_' + sessionId,
                            phone: phoneForCapi,
                            ip: m.ip, ua: m.ua, fbp: m.fbp, fbc: m.fbc,
                            value: 1,
                            sourceUrl: absoluteUrl(`${BASE_PATH}/api/report/${sessionId}`)
                        });
                        if (capi.ok) console.log(`[${sessionId}] Meta CAPI Lead sent.`);
                        else if (!capi.skipped) console.warn(`[${sessionId}] Meta CAPI Lead failed.`);
                    }
                } catch (capiErr) {
                    console.warn(`[${sessionId}] CAPI skipped (non-critical):`, capiErr.message);
                }

                // Structured lead → CRM / Google Sheet (clean, flat fields).
                try {
                    const vp = sessions[sessionId]?.verifiedPhone || null;
                    const rl = reportData._rawLead || {};
                    const lead = {
                        sessionId,
                        capturedAt: new Date().toISOString(),
                        name: rl.name || reportData.ownerName || '',
                        clinic: rl.clinicName || reportData.clinicName || '',
                        phone: vp ? `${vp.countryCode}${vp.mobile}` : (rl.phone || ''),
                        email: rl.email || '',
                        city: rl.city || reportData.city || '',
                        website: rl.website || '',
                        reportUrl: absoluteUrl(`${BASE_PATH}/api/report/${sessionId}`),
                        source: sessions[sessionId]?.attribution?.channel || 'direct'
                    };
                    sendToWebhook(sessionId, transcript, reportData, lead);
                } catch (whErr) {
                    sendToWebhook(sessionId, transcript, reportData);
                }
            }).catch(err => {
                console.error(`[${sessionId}] Background report generation failed:`, err);
                // CRITICAL: Save a fallback report so the loading page doesn't spin forever
                try {
                    const fallbackReport = {
                        clinicName: 'Your Clinic',
                        ownerName: 'Doctor',
                        location: 'Your City',
                        clinicCategory: 'Clinic',
                        overallScore: 52,
                        executiveSummary: 'We encountered an issue generating your full report, but based on our analysis, your clinic has clear opportunities to improve its digital presence. There are gaps in local search visibility, patient conversion systems, and online advertising that are costing you new patients. Book a free strategy call and we will walk you through the full plan.',
                        seoScore: 40, adsScore: 50, conversionScore: 35,
                        findings: [
                            { area: 'Google My Business & Local Visibility', icon: '🗺️', score: 40, problem: 'Your Google Maps presence needs attention. Patients searching for your specialty in your city may not find you, which means competitors are capturing those enquiries instead.', solution: 'A complete GMB profile optimisation with review acquisition, photo uploads, and local keyword integration can significantly improve your visibility within 30 to 45 days.' },
                            { area: 'Website Performance & Speed', icon: '⚡', score: 50, problem: 'A slow or missing website is one of the biggest barriers to converting interested patients into booked appointments. Mobile users expect pages to load in under 3 seconds.', solution: 'We will audit your website for speed, mobile responsiveness, and conversion elements. If you do not have a website, we will build a high-converting landing page designed for patient bookings.' },
                            { area: 'Patient Conversion & Follow-Up', icon: '💬', score: 35, problem: 'Without an automated follow-up system, a significant percentage of enquiries go cold. Most clinics lose 40 to 60 percent of potential patients simply because nobody followed up.', solution: 'A WhatsApp Business automation system with instant greetings, appointment reminders, and follow-up sequences can recover 25 to 40 percent of leads that would otherwise be lost.' },
                            { area: 'Paid Advertising & Patient Acquisition', icon: '📢', score: 50, problem: 'Without targeted advertising, you are relying entirely on organic reach while competitors capture high-intent patients through paid placements every single day.', solution: 'A targeted Google Ads campaign for your specialty and location, starting at a modest budget, can generate 20 to 40 new patient enquiries per month with proper tracking and optimisation.' }
                        ],
                        nextStep: 'Your 90-day growth plan is ready to put into action — GrowClinic can implement it with you, step by step. Get the full report in your inbox below.',
                        _gmbData: null, _pageSpeedData: null
                    };
                    fs.writeFileSync(
                        path.join(REPORTS_DIR, `${sessionId}.json`),
                        JSON.stringify(fallbackReport, null, 2)
                    );
                    console.log(`[${sessionId}] Fallback report saved after error.`);
                } catch (fallbackErr) {
                    console.error(`[${sessionId}] Even fallback report save failed:`, fallbackErr);
                }
            });

            // Return reportUrl immediately — report page has a loading spinner until JSON is ready
            reportResultUrl = `${BASE_PATH}/api/report/${sessionId}`;
        }

        // Persist chat progress (transcript, message counts, lead state) to DB
        try {
            const allMsgs = sessions[sessionId].messages.filter(m => m.role !== 'system');
            const userMsgCount = allMsgs.filter(m => m.role === 'user').length;
            const aiMsgCount   = allMsgs.filter(m => m.role === 'assistant').length;
            const transcriptText = allMsgs.map(m => `[${m.role.toUpperCase()}]: ${m.content}`).join('\n');

            // Best-effort field extraction from user messages (cheap heuristics)
            const lastUser = allMsgs.filter(m => m.role === 'user').slice(-1)[0]?.content || '';
            const fields = {
                userMsgCount,
                aiMsgCount,
                transcript: transcriptText,
                completed: isLeadCaptured ? 1 : null,
                leadCaptured: isLeadCaptured ? 1 : null,
                reportUrl: reportResultUrl || null
            };
            // Phone heuristic
            const phoneMatch = lastUser.match(/\+?\d[\d\s-]{6,}/);
            if (phoneMatch) fields.phone = phoneMatch[0].replace(/\s/g, '');

            db.trackChatActivity(sessionId, fields);
        } catch (trackErr) {
            console.warn('[chat-track] non-critical:', trackErr.message);
        }

        // `profile` lets the frontend fire per-attribute collection events
        // (tracking + deterministic side-effects like PageSpeed warm-up).
        res.json({ reply: cleanDashes(aiReplyMessage), isLeadCaptured, reportUrl: reportResultUrl, profile: sessions[sessionId].profile || {} });

    } catch (error) {
        // Log full error server-side
        console.error('Chat Error:', error?.status, error?.code, error?.message);

        const status = error?.status;
        const code   = error?.code || '';
        const apiMsg = error?.message || 'Unknown error';

        let userMsg = 'Connection unstable. Try again in a moment.';
        if (code === 'gemini_no_key') {
            userMsg = 'Gemini API key not set. Open Admin → API Keys to add it.';
        } else if (code === 'NOT_FOUND' || /not.?found|model.*not.*found/i.test(apiMsg)) {
            userMsg = 'Generative Language API is not enabled on your Google project, OR the model name is wrong. Enable at console.cloud.google.com/apis/library/generativelanguage.googleapis.com';
        } else if (code === 'PERMISSION_DENIED' || status === 403) {
            userMsg = 'API key denied. Check that the Generative Language API is enabled and the key has no restriction blocking this server.';
        } else if (status === 401 || code === 'invalid_api_key' || code === 'INVALID_ARGUMENT' && /api.?key/i.test(apiMsg)) {
            userMsg = 'AI key is invalid or revoked. Open Admin → API Keys to fix it.';
        } else if (status === 429 || code === 'RESOURCE_EXHAUSTED' || /quota|rate.?limit/i.test(apiMsg)) {
            userMsg = 'AI quota exceeded or rate-limited. Try again in a minute or upgrade your plan.';
        } else if (status >= 500) {
            userMsg = 'AI provider is having issues right now. Try again in a few seconds.';
        }

        res.status(500).json({
            reply: userMsg,
            error: { status, code, message: apiMsg }
        });
    }
});

// ─────────────────────────────────────────────────────────────
// REPORT TEASER — shown until the visitor verifies their WhatsApp.
// Reveals the overall score + the single biggest gap (~10%); the rest is
// locked behind an OTP gate (with an editable number). Verifying unlocks the
// full report AND triggers WhatsApp/email delivery.
// ─────────────────────────────────────────────────────────────
function renderReportTeaser(d, sessionId) {
    const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const clinic = esc(d.clinicName || (d._rawLead && d._rawLead.clinicName) || 'your clinic');
    const score = Number(d.overallScore) || 0;
    const col = score >= 70 ? '#10b981' : score >= 45 ? '#f59e0b' : '#ef4444';
    const findings = Array.isArray(d.findings) ? d.findings : [];
    const top = findings[0] || null;
    // Parse the lead's phone with country-code awareness (works for +971 9-digit
    // UAE numbers, +44 UK, +1 US/CA, +91 India, …) instead of assuming 10 digits.
    const pp = messaging.parsePhone((d._rawLead && d._rawLead.phone) || '');
    const preCc = (pp && pp.countryCode) || '';
    const mobile = (pp && pp.mobile) || '';
    const ccOptions = [
        ['971', '🇦🇪 +971'], ['1', '🇺🇸 +1'], ['44', '🇬🇧 +44'], ['1', '🇨🇦 +1'],
        ['91', '🇮🇳 +91'], ['61', '🇦🇺 +61'], ['65', '🇸🇬 +65'], ['977', '🇳🇵 +977'], ['880', '🇧🇩 +880']
    ];
    // Pre-select the lead's own country; if unknown, fall back to India (+91) —
    // the browser-locale script below can still override that fallback.
    let ccSelected = false;
    let ccOptionsHtml = ccOptions.map(([v, label]) => {
        const sel = !ccSelected && preCc && v === preCc;
        if (sel) ccSelected = true;
        return `<option value="${v}"${sel ? ' selected' : ''}>${label}</option>`;
    }).join('');
    if (!ccSelected) ccOptionsHtml = ccOptionsHtml.replace('value="91"', 'value="91" selected');
    const lockedRows = findings.slice(1).map(f => `<div class="locked-row">${esc(f.icon || '🔒')} ${esc(f.area || 'Finding')}</div>`).join('')
        + '<div class="locked-row">📅 Your full 90-day growth plan</div>'
        + '<div class="locked-row">📊 City benchmarks & competitor gaps</div>';
    const oCirc = 2 * Math.PI * 54, oDash = (score / 100) * oCirc;
    return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>GrowClinic | Your Audit Preview</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Inter',-apple-system,BlinkMacSystemFont,sans-serif;background:#eef2fb;color:#0f172a;padding:1.4rem 1rem;line-height:1.5}
.wrap{max-width:560px;margin:0 auto}
.card{background:#fff;border-radius:20px;padding:1.8rem 1.5rem;box-shadow:0 10px 40px rgba(0,0,0,.08);margin-bottom:1.1rem}
.brand{display:flex;align-items:center;gap:.55rem;justify-content:center;margin-bottom:1.1rem}
.brand img{width:34px;height:34px;border-radius:50%}
.brand b{font-size:1.02rem}
.h1{font-size:1.32rem;font-weight:800;text-align:center;margin-bottom:.25rem}
.sub{text-align:center;color:#64748b;font-size:.9rem;margin-bottom:1rem}
.ringwrap{text-align:center;margin:.6rem 0}
.scbadge{display:inline-block;margin-top:.4rem;padding:.3rem .9rem;border-radius:999px;font-weight:700;font-size:.82rem;color:${col};background:${col}18;border:1px solid ${col}40}
.peek{background:#fff9f9;border:1px solid #fee2e2;border-radius:14px;padding:1rem;margin:1.1rem 0 .4rem}
.peek .lbl{color:#ef4444;font-weight:700;font-size:.8rem;margin-bottom:.35rem}
.peek p{font-size:.9rem;color:#334155}
.locked{margin-top:.9rem;filter:blur(5px);opacity:.5;pointer-events:none;user-select:none}
.locked-row{background:#f1f5f9;border-radius:10px;padding:.75rem 1rem;margin-bottom:.45rem;font-weight:600}
.gate{background:linear-gradient(140deg,#0a3b2c,#0a2a48);color:#fff;border-radius:20px;padding:1.6rem 1.4rem;text-align:center}
.gate h3{font-size:1.12rem;margin-bottom:.35rem}
.gate p{font-size:.86rem;opacity:.85;margin-bottom:1rem}
.phone-row{display:flex;gap:.5rem;margin-bottom:.7rem}
.phone-row .cc{background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.25);border-radius:10px;padding:.7rem .55rem;font-weight:600;color:#fff;font-size:.95rem;cursor:pointer;-webkit-appearance:none;appearance:none;outline:none}
.phone-row .cc option{color:#0f172a}
.phone-row input{flex:1;min-width:0;padding:.7rem 1rem;border-radius:10px;border:1px solid rgba(255,255,255,.25);background:rgba(255,255,255,.1);color:#fff;font-size:1rem}
.btn{width:100%;padding:.85rem;border:none;border-radius:12px;background:#16a34a;color:#fff;font-weight:700;font-size:1rem;cursor:pointer;margin-top:.2rem}
.btn:disabled{opacity:.5;cursor:not-allowed}
.otp-boxes{display:flex;gap:.4rem;justify-content:center;margin:.6rem 0 1rem}
.otp-boxes input{width:42px;height:50px;text-align:center;font-size:1.3rem;font-weight:700;border-radius:10px;border:1px solid rgba(255,255,255,.3);background:rgba(255,255,255,.12);color:#fff}
.msg{font-size:.82rem;margin-top:.6rem;min-height:1.1em}
.small{font-size:.78rem;opacity:.75;margin-top:.5rem}
.editlink{color:#7dd3fc;cursor:pointer;text-decoration:underline}
input::placeholder{color:rgba(255,255,255,.5)}
</style></head><body><div class="wrap">
<div class="card">
  <div class="brand"><img src="/img/logo.png" alt="GrowClinic"><b>GrowClinic Audit</b></div>
  <div class="h1">${clinic}'s audit is ready 🎉</div>
  <div class="sub">Here's a quick preview, unlock the full report below.</div>
  <div class="ringwrap">
    <svg width="140" height="140" viewBox="0 0 140 140">
      <circle cx="70" cy="70" r="54" fill="none" stroke="#e2e8f0" stroke-width="12"/>
      <circle cx="70" cy="70" r="54" fill="none" stroke="${col}" stroke-width="12" stroke-linecap="round" stroke-dasharray="${oDash} ${oCirc - oDash}" stroke-dashoffset="${oCirc * 0.25}" transform="rotate(-90 70 70)"/>
      <text x="70" y="80" text-anchor="middle" font-size="34" font-weight="900" fill="#0f172a">${score}</text>
    </svg>
    <div class="scbadge">Overall Growth Score</div>
  </div>
  ${top ? `<div class="peek"><div class="lbl">⚠ Biggest gap, ${esc(top.area || '')}</div><p>${esc(String(top.problem || '').slice(0, 150))}…</p></div>` : ''}
  <div class="locked">${lockedRows}</div>
</div>
<div class="gate">
  <h3>🔒 Verify your WhatsApp to unlock</h3>
  <p>See every finding, your city benchmarks and the full 90-day plan, plus a copy delivered to your WhatsApp.</p>
  <div id="step-phone">
    <div class="phone-row"><select class="cc" id="cc">${ccOptionsHtml}</select><input id="ph" inputmode="numeric" maxlength="15" value="${esc(mobile)}" placeholder="WhatsApp number"></div>
    <button class="btn" id="send-btn">Send my code</button>
  </div>
  <div id="step-otp" style="display:none">
    <div class="otp-boxes" id="otp-boxes">${[0,1,2,3,4,5].map(() => '<input maxlength="1" inputmode="numeric">').join('')}</div>
    <button class="btn" id="verify-btn" disabled>Verify &amp; unlock</button>
    <div class="small">Code sent to <b id="sent-to"></b> · <span class="editlink" id="edit-num">Wrong number?</span></div>
    <div class="small" style="margin-top:.45rem">Not getting the code? <a href="https://wa.me/916393355243?text=Hi%2C%20I'm%20not%20getting%20my%20GrowClinic%20audit%20code.%20Report%20ID%3A%20${encodeURIComponent(sessionId)}" target="_blank" class="editlink">Message us on WhatsApp</a></div>
  </div>
  <div class="msg" id="msg"></div>
</div>
</div>
<script>
const sid=${JSON.stringify(sessionId)};
const phEl=document.getElementById('ph'),msg=document.getElementById('msg');
// No prefilled country → auto-select from the browser locale (AE/US/GB/CA/IN…)
(function(){
  if(${JSON.stringify(!!ccSelected)})return;
  try{
    var region=((navigator.language||'').split('-')[1]||'').toUpperCase();
    var map={AE:'971',US:'1',CA:'1',GB:'44',IN:'91',AU:'61',SG:'65',NP:'977',BD:'880'};
    var cc=map[region];var sel=document.getElementById('cc');
    if(cc&&sel){for(var i=0;i<sel.options.length;i++){if(sel.options[i].value===cc){sel.selectedIndex=i;break;}}}
  }catch(e){}
})();
const boxes=[].slice.call(document.querySelectorAll('#otp-boxes input')),vbtn=document.getElementById('verify-btn');
let mob='';
function cc(){var e=document.getElementById('cc');return e?e.value:'91';}
document.getElementById('send-btn').onclick=async function(){
  mob=(phEl.value||'').replace(/\\D/g,'');
  if(mob.length<6){msg.style.color='#fca5a5';msg.textContent='Enter a valid number';return;}
  msg.style.color='#7dd3fc';msg.textContent='Sending code…';
  try{const r=await fetch('/api/otp/send',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({countryCode:cc(),mobile:mob,sessionId:sid})}).then(x=>x.json());
    if(r.ok){document.getElementById('step-phone').style.display='none';document.getElementById('step-otp').style.display='block';document.getElementById('sent-to').textContent='+'+cc()+' '+mob;msg.textContent='';boxes[0].focus();}
    else{msg.style.color='#fca5a5';msg.textContent=r.error||'Could not send code';}
  }catch(e){msg.style.color='#fca5a5';msg.textContent='Network error, try again';}
};
boxes.forEach(function(b,i){
  b.addEventListener('input',function(){b.value=b.value.replace(/\\D/g,'').slice(0,1);if(b.value&&i<5)boxes[i+1].focus();vbtn.disabled=boxes.some(function(x){return !x.value;});if(!vbtn.disabled)verify();});
  b.addEventListener('keydown',function(e){if(e.key==='Backspace'&&!b.value&&i>0)boxes[i-1].focus();});
});
async function verify(){
  const code=boxes.map(function(b){return b.value;}).join('');if(code.length!==6)return;
  vbtn.disabled=true;msg.style.color='#7dd3fc';msg.textContent='Verifying…';
  try{const r=await fetch('/api/otp/verify',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({countryCode:cc(),mobile:mob,code:code,sessionId:sid})}).then(x=>x.json());
    if(r.ok){msg.style.color='#86efac';msg.textContent='Verified! Unlocking your full report…';setTimeout(function(){location.reload();},900);}
    else{vbtn.disabled=false;msg.style.color='#fca5a5';msg.textContent=r.error||'Wrong code, try again';boxes.forEach(function(b){b.value='';});boxes[0].focus();}
  }catch(e){vbtn.disabled=false;msg.style.color='#fca5a5';msg.textContent='Network error, try again';}
}
vbtn.onclick=verify;
document.getElementById('edit-num').onclick=function(){document.getElementById('step-otp').style.display='none';document.getElementById('step-phone').style.display='block';msg.textContent='';};
</script></body></html>`;
}

// ─────────────────────────────────────────────────────────────
// REPORT PAGE — full HTML with API data + prose findings
// ─────────────────────────────────────────────────────────────
app.get('/api/report/:sessionId', async (req, res) => {
    const { sessionId } = req.params;
    // Strict validation: sessionIds are 20 hex chars from crypto.getRandomValues (public/js/main.js) — alphanumeric only
    if (!/^[a-z0-9]{6,32}$/i.test(sessionId)) {
        return res.status(400).send('Invalid session ID');
    }

    // Admin bypass: anyone logged into the admin panel (any role) sees the FULL
    // report immediately — no OTP gate. Visitors still get the teaser until
    // they verify. Admin views are excluded from the reportViewed funnel stat.
    let isAdmin = false;
    try { isAdmin = !!(await db.validateAdminSession(req.cookies?.[ADMIN_COOKIE])); } catch (_e) {}
    const reportPath = path.join(REPORTS_DIR, `${sessionId}.json`);

    if (!fs.existsSync(reportPath)) {
        return res.status(202).send(`<!DOCTYPE html><html><head><title>GrowClinic | Report</title>
        <style>body{font-family:'Inter',sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#f0f4ff;}
        .msg{text-align:center;color:#64748b;max-width:400px;padding:2rem;}
        .spinner{width:48px;height:48px;border:4px solid #e2e8f0;border-top-color:#3b82f6;border-radius:50%;animation:spin 0.8s linear infinite;margin:0 auto 1.5rem;}
        @keyframes spin{to{transform:rotate(360deg);}}
        .msg h3{color:#1e3a8a;margin-bottom:.5rem;}
        .msg p{font-size:.9rem;line-height:1.6}
        .retry-count{font-size:.75rem;color:#94a3b8;margin-top:1rem;}
        .timeout-msg{display:none;margin-top:1.5rem;padding:1rem;background:#fff;border-radius:12px;border:1px solid #e2e8f0;}
        .timeout-msg h4{color:#ef4444;margin-bottom:.5rem;font-size:.9rem;}
        .timeout-msg p{font-size:.8rem;color:#64748b;}
        .timeout-msg a{color:#3b82f6;text-decoration:none;font-weight:600;}
        </style>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
        </head>
        <body><div class="msg">
            <div class="spinner" id="spinner"></div>
            <h3 id="heading">Preparing your report...</h3>
            <p id="subtext">Hang tight — we're scanning Google Maps, running PageSpeed analysis, and building your personalised growth plan.</p>
            <div class="retry-count" id="retryCount"></div>
            <div class="timeout-msg" id="timeoutMsg">
                <h4>Taking longer than expected</h4>
                <p>The report is still being generated. You can <a href="javascript:location.reload()">refresh manually</a> or <a href="https://wa.me/916393355243?text=Hi%2C%20my%20report%20is%20not%20loading.%20Session%3A%20${sessionId}" target="_blank">contact us on WhatsApp</a>.</p>
            </div>
        </div>
        <script>
            let retries = parseInt(sessionStorage.getItem('reportRetry_${sessionId}') || '0');
            const maxRetries = 15;
            retries++;
            sessionStorage.setItem('reportRetry_${sessionId}', retries);

            const retryEl = document.getElementById('retryCount');
            retryEl.textContent = 'Attempt ' + retries + ' of ' + maxRetries;

            if (retries <= maxRetries) {
                if (retries > 5) {
                    document.getElementById('subtext').textContent = 'Almost there — processing your clinic data with AI...';
                }
                if (retries > 10) {
                    document.getElementById('subtext').textContent = 'This is taking a bit longer than usual. Hang on...';
                }
                setTimeout(() => location.reload(), 3500);
            } else {
                document.getElementById('spinner').style.display = 'none';
                document.getElementById('heading').textContent = 'Report generation timed out';
                document.getElementById('subtext').textContent = 'We were unable to generate your report automatically.';
                document.getElementById('timeoutMsg').style.display = 'block';
                document.getElementById('retryCount').style.display = 'none';
                sessionStorage.removeItem('reportRetry_${sessionId}');
            }
        </script></body></html>`);
    }

    // Clear retry counter on successful load
    // (handled client-side — sessionStorage is cleared when report renders)

    const d = JSON.parse(fs.readFileSync(reportPath, 'utf8'));

    // Funnel: record that the report (teaser or full) was viewed for this session.
    // (Admin views don't count — they'd inflate the funnel.)
    if (!isAdmin) {
        try { db.trackChatActivity(sessionId, { reportViewed: 1 }); } catch (_e) {}
    }

    // Gate: until the visitor verifies their WhatsApp via OTP, show only the
    // ~10% teaser. Verifying (in /api/otp/verify) flips d.verified and delivers
    // the report to WhatsApp. Admins skip the gate entirely.
    if (!d.verified && !isAdmin) {
        return res.send(cleanDashes(renderReportTeaser(d, sessionId)));
    }
    const adminBanner = (isAdmin && !d.verified)
        ? `<div style="background:#7c2d12;color:#fed7aa;padding:.6rem 1rem;text-align:center;font-family:Inter,sans-serif;font-size:.85rem;font-weight:600">🔑 Admin view — the visitor has NOT verified their WhatsApp yet, so they still see the locked teaser.</div>`
        : '';

    const emailDeliveryOn = messaging.isEmailConfigured();
    const gmb = d._gmbData || null;
    const ps  = d._pageSpeedData || null;
    const websiteSource = d._websiteSource || null;       // 'user' | 'gmb' | null
    const effectiveWebsite = d._effectiveWebsite || (gmb && gmb.gmbWebsite) || null;
    const bm = gmb && gmb.areaBenchmark ? gmb.areaBenchmark : null;

    function sc(s) { return s >= 70 ? '#10b981' : s >= 45 ? '#f59e0b' : '#ef4444'; }
    function sl(s) { return s >= 70 ? 'Good' : s >= 45 ? 'Fair' : 'Needs Work'; }
    function ring(score, color, sublabel) {
        const r = 36, c = 2 * Math.PI * r, d2 = (score / 100) * c;
        return `<div class="score-card">
            <svg width="90" height="90" viewBox="0 0 90 90">
                <circle cx="45" cy="45" r="${r}" fill="none" stroke="#e2e8f0" stroke-width="8"/>
                <circle cx="45" cy="45" r="${r}" fill="none" stroke="${color}" stroke-width="8"
                    stroke-dasharray="${d2} ${c-d2}" stroke-dashoffset="${c*0.25}" stroke-linecap="round"/>
                <text x="45" y="49" text-anchor="middle" font-family="Inter,sans-serif" font-size="18" font-weight="800" fill="#0f172a">${score}</text>
            </svg>
            <div class="sc-label">${sublabel}</div>
            <div class="sc-badge" style="color:${color};background:${color}18;border:1px solid ${color}40">${sl(score)}</div>
        </div>`;
    }
    function psBar(score) {
        const c = score >= 90 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444';
        return `<div class="ps-bar-wrap"><div class="ps-bar-fill" style="width:${score}%;background:${c}"></div></div>`;
    }

    const overallC = sc(d.overallScore);
    const oCirc = 2 * Math.PI * 54;
    const oDash = (d.overallScore / 100) * oCirc;

    // API data blocks
    const gmbBlock = gmb ? `
    <div class="api-section">
        <div class="api-section-title">🗺️ Google My Business — Live Data</div>
        <div class="api-grid">
            <div class="api-stat">
                <div class="api-stat-val ${gmb.found ? (gmb.rating >= 4 ? 'good' : 'warn') : 'bad'}">${gmb.found ? (gmb.rating ? `${gmb.rating}★` : 'No Rating') : 'Not Found'}</div>
                <div class="api-stat-key">Google Rating</div>
            </div>
            <div class="api-stat">
                <div class="api-stat-val ${gmb.found ? (gmb.totalReviews >= 50 ? 'good' : gmb.totalReviews >= 10 ? 'warn' : 'bad') : 'bad'}">${gmb.found ? gmb.totalReviews : '0'}</div>
                <div class="api-stat-key">Total Reviews</div>
            </div>
            <div class="api-stat">
                <div class="api-stat-val ${gmb.found ? 'good' : 'bad'}">${gmb.found ? 'Listed ✅' : 'Not Found ❌'}</div>
                <div class="api-stat-key">Google Maps</div>
            </div>
            <div class="api-stat">
                <div class="api-stat-val ${bm ? (gmb.totalReviews >= bm.avgReviews ? 'good' : gmb.totalReviews >= bm.avgReviews / 2 ? 'warn' : 'bad') : 'neutral'}">${bm ? `~${bm.avgReviews}` : '—'}</div>
                <div class="api-stat-key">Area Avg Reviews</div>
            </div>
        </div>
        ${bm ? `<div class="api-address" style="color:${gmb.totalReviews >= bm.avgReviews ? '#10b981' : '#ef4444'}">📊 Top ${bm.category}s near you average <b>~${bm.avgReviews} reviews</b> (leader: ${bm.topReviews}). You have <b>${gmb.totalReviews}</b> — ${gmb.totalReviews >= bm.avgReviews ? 'ahead of the pack 💪' : `that's a visibility gap worth closing.`}</div>` : ''}
        ${gmb.address ? `<div class="api-address">📍 ${escapeHtml(gmb.address)}</div>` : ''}
        ${gmb.found && gmb.gmbWebsite ? `<div class="api-address" style="color:#10b981">🔗 Website on profile: ${escapeHtml(gmb.gmbWebsite.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, ''))}</div>` : ''}
        ${gmb.found && !gmb.gmbWebsite ? `<div class="api-address" style="color:#ef4444">⚠️ No website linked on this Google profile — patients can't learn more or book online</div>` : ''}
        ${gmb.found && gmb.mapsUrl && /^https:\/\/(www\.)?google\.[a-z.]+\//.test(gmb.mapsUrl) ? `<div style="margin-top:10px"><a href="${escapeHtml(gmb.mapsUrl)}" target="_blank" rel="noopener noreferrer" style="display:inline-flex;align-items:center;gap:6px;background:#1a73e8;color:#fff;padding:7px 16px;border-radius:8px;font-size:13px;font-weight:600;text-decoration:none">🗺️ Explore on Google Maps ↗</a></div>` : ''}
    </div>` : '';

    const cleanSite = effectiveWebsite ? effectiveWebsite.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '') : null;
    let psBlock;
    if (ps?.found) {
        psBlock = `
    <div class="api-section">
        <div class="api-section-title">⚡ Website Health — Live Data (Mobile)</div>
        ${cleanSite ? `<div class="api-address" style="margin:-.25rem 0 .75rem">🌐 ${escapeHtml(cleanSite)}${websiteSource === 'gmb' ? ' <span style="color:#f59e0b">· found on your Google profile</span>' : ''}</div>` : ''}
        <div class="ps-rows">
            <div class="ps-row"><span class="ps-label">Performance</span>${psBar(ps.performanceScore)}<span class="ps-score" style="color:${ps.performanceScore>=90?'#10b981':ps.performanceScore>=50?'#f59e0b':'#ef4444'}">${ps.performanceScore}/100</span></div>
            <div class="ps-row"><span class="ps-label">SEO</span>${psBar(ps.seoScore)}<span class="ps-score" style="color:${ps.seoScore>=90?'#10b981':ps.seoScore>=50?'#f59e0b':'#ef4444'}">${ps.seoScore}/100</span></div>
            <div class="ps-row"><span class="ps-label">Accessibility</span>${psBar(ps.accessibility)}<span class="ps-score" style="color:${ps.accessibility>=90?'#10b981':ps.accessibility>=50?'#f59e0b':'#ef4444'}">${ps.accessibility}/100</span></div>
            <div class="ps-row"><span class="ps-label">Best Practices</span>${psBar(ps.bestPractices)}<span class="ps-score" style="color:${ps.bestPractices>=90?'#10b981':ps.bestPractices>=50?'#f59e0b':'#ef4444'}">${ps.bestPractices}/100</span></div>
        </div>
        <div class="ps-metrics">
            ${ps.fcp  ? `<div class="ps-metric"><span>FCP</span><strong>${ps.fcp}</strong></div>` : ''}
            ${ps.lcp  ? `<div class="ps-metric"><span>LCP</span><strong>${ps.lcp}</strong></div>` : ''}
            ${ps.tti  ? `<div class="ps-metric"><span>TTI</span><strong>${ps.tti}</strong></div>` : ''}
            ${ps.cls  ? `<div class="ps-metric"><span>CLS</span><strong>${ps.cls}</strong></div>` : ''}
        </div>
        <div class="ps-legend">
            <div class="ps-legend-title">What these mean (in plain terms)</div>
            ${ps.fcp ? `<div><b>FCP</b> · First Contentful Paint — how fast <em>anything</em> first shows up. Under 1.8s feels instant.</div>` : ''}
            ${ps.lcp ? `<div><b>LCP</b> · Largest Contentful Paint — how long until your main image/text loads. This is what patients <em>feel</em> as "speed". Aim under 2.5s.</div>` : ''}
            ${ps.tti ? `<div><b>TTI</b> · Time to Interactive — when buttons and booking actually work. Above ~5s, many patients leave before they can act.</div>` : ''}
            ${ps.cls ? `<div><b>CLS</b> · Layout stability — how much the page jumps while loading. 0 is perfect; jumpy pages make people mis-tap and abandon.</div>` : ''}
        </div>
    </div>`;
    } else if (effectiveWebsite) {
        // Website exists but the live scan couldn't complete — still a finding.
        psBlock = `
    <div class="api-section">
        <div class="api-section-title">⚡ Website Health</div>
        <div class="api-address">🌐 ${escapeHtml(cleanSite)}${websiteSource === 'gmb' ? ' <span style="color:#f59e0b">· found on your Google profile</span>' : ''}</div>
        <div class="api-address" style="color:#f59e0b;margin-top:.5rem">⚠️ The site responded too slowly for our live speed test to finish — usually a sign of heavy pages or no caching. That alone costs mobile patients who bounce after 3 seconds.</div>
    </div>`;
    } else {
        // No website anywhere — turn the empty box into a conversion-opportunity card.
        psBlock = `
    <div class="api-section">
        <div class="api-section-title">🌐 Website — Biggest Quick Win</div>
        <div class="api-grid">
            <div class="api-stat"><div class="api-stat-val bad">None</div><div class="api-stat-key">Website Found</div></div>
            <div class="api-stat"><div class="api-stat-val warn">~75%</div><div class="api-stat-key">Patients Check First</div></div>
            <div class="api-stat"><div class="api-stat-val bad">24/7</div><div class="api-stat-key">Bookings Lost</div></div>
            <div class="api-stat"><div class="api-stat-val warn">3–5%</div><div class="api-stat-key">Typical Site Conversion</div></div>
        </div>
        <div class="api-address" style="color:#ef4444">⚠️ No website detected. Patients who find you on Google have nowhere to see treatments, results or reviews — most click a competitor who does. A simple conversion-focused page is the fastest fix.</div>
    </div>`;
    }

    // Data sources banner
    const today = new Date().toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' });
    const sourcesBanner = `
    <div class="sources-banner">
        <div class="sources-title">📡 Data Sources — Live API Pull on ${today}</div>
        <div class="sources-chips">
            <div class="source-chip ${gmb?.found ? 'good' : gmb?.found === false ? 'bad' : 'neutral'}">
                🗺️ Google My Business
                <span>${gmb?.found ? `${gmb.rating ? gmb.rating+'★' : 'Listed'} · ${gmb.totalReviews} reviews` : gmb?.found === false ? 'Not Found on Maps' : 'API Key Pending'}</span>
            </div>
            <div class="source-chip ${ps?.found ? (ps.performanceScore >= 70 ? 'good' : ps.performanceScore >= 40 ? 'warn' : 'bad') : effectiveWebsite ? 'warn' : 'bad'}">
                ⚡ Website Health
                <span>${ps?.found ? `Mobile ${ps.performanceScore}/100` : effectiveWebsite ? 'Scan incomplete' : 'No website found'}</span>
            </div>
            <div class="source-chip neutral">
                🤖 GrowClinic AI Analysis
                <span>GPT-4o + clinic benchmarks</span>
            </div>
        </div>
    </div>`;

    // Findings — every text field escaped to prevent XSS
    const findingsHtml = (d.findings || []).map(f => {
        const safeScore = Number(f.score) || 0;
        return `
    <div class="finding-card">
        <div class="finding-header">
            <span class="finding-icon">${escapeHtml(f.icon)}</span>
            <div class="finding-title-wrap">
                <div class="finding-area">${escapeHtml(f.area)}</div>
                <div class="finding-score-pill" style="color:${sc(safeScore)};background:${sc(safeScore)}18;border:1px solid ${sc(safeScore)}40">${sl(safeScore)} · ${safeScore}/100</div>
            </div>
        </div>
        <div class="finding-body">
            <div class="finding-block problem-block">
                <div class="finding-block-label">⚠ The Problem</div>
                <p>${escapeHtml(f.problem)}</p>
            </div>
            <div class="finding-block solution-block">
                <div class="finding-block-label">✓ GrowClinic Solution</div>
                <p>${escapeHtml(f.solution)}</p>
            </div>
        </div>
    </div>`;
    }).join('');

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>GrowClinic AI — Digital Health Audit: ${escapeHtml(d.clinicName || 'Your Clinic')}</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Inter',sans-serif;background:#eef2ff;color:#0f172a;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.page{max-width:860px;margin:2rem auto;background:#fff;border-radius:24px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.1)}

/* TOP BAR */
.top-bar{background:#0f172a;padding:.85rem 2.5rem;display:flex;align-items:center;justify-content:space-between}
.top-bar span{color:#64748b;font-size:.8rem}
.dl-btn{background:#fff;color:#0f172a;font-weight:700;font-size:.8rem;border:none;padding:.45rem 1.1rem;border-radius:8px;cursor:pointer;display:flex;align-items:center;gap:.4rem}
.dl-btn:hover{background:#f1f5f9}

/* HEADER */
.rh{background:linear-gradient(135deg,#1e3a8a 0%,#3b82f6 100%);padding:2.5rem;color:#fff;position:relative;overflow:hidden}
.rh::after{content:'';position:absolute;right:-60px;top:-60px;width:280px;height:280px;background:rgba(255,255,255,.06);border-radius:50%}
.rh-top{display:flex;justify-content:space-between;align-items:flex-start;position:relative;z-index:1}
.rh-brand{font-size:.72rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;opacity:.7;margin-bottom:.35rem}
.rh-title{font-size:1.7rem;font-weight:900;line-height:1.2}
.rh-sub{font-size:.9rem;opacity:.7;margin-top:.25rem}
.rh-date{font-size:.75rem;opacity:.55;white-space:nowrap}
.rh-meta{margin-top:1.5rem;display:flex;gap:2rem;flex-wrap:wrap;position:relative;z-index:1}
.rh-meta-item{font-size:.8rem;opacity:.75}
.rh-meta-item strong{display:block;font-size:.95rem;font-weight:700;opacity:1;color:#fff;margin-top:.1rem}

/* OVERALL */
.overall{padding:2.5rem;border-bottom:1px solid #f1f5f9;display:flex;align-items:center;gap:2.5rem}
.ov-label{font-size:.7rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#94a3b8;margin-bottom:.4rem}
.ov-title{font-size:1.4rem;font-weight:800;margin-bottom:.5rem}
.ov-summary{font-size:.95rem;color:#475569;line-height:1.7}

/* SCORES */
.scores{padding:1.75rem 2.5rem 2rem;border-bottom:1px solid #f1f5f9;background:#f8faff}
.sec-label{font-size:.7rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#94a3b8;margin-bottom:1.25rem}
.score-cards{display:flex;gap:1.25rem}
.score-card{flex:1;text-align:center;background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:1.1rem .75rem}
.score-card svg{display:block;margin:0 auto .4rem}
.sc-label{font-size:.8rem;font-weight:700;color:#0f172a;margin-bottom:.3rem}
.sc-badge{display:inline-block;font-size:.68rem;font-weight:700;padding:.18rem .6rem;border-radius:20px}

/* SOURCES BANNER */
.sources-banner{padding:1rem 2.5rem;background:linear-gradient(135deg,#f0f7ff,#f8faff);border-bottom:1px solid #e2e8f0}
.sources-title{font-size:.72rem;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.06em;margin-bottom:.6rem}
.sources-chips{display:flex;flex-wrap:wrap;gap:.5rem}
.source-chip{display:flex;align-items:center;gap:.5rem;padding:.4rem .9rem;border-radius:20px;font-size:.75rem;font-weight:600;border:1px solid #e2e8f0;background:#fff;color:#0f172a}
.source-chip span{font-weight:500;color:#64748b;font-size:.7rem}
.source-chip.good{border-color:#10b98140;background:#f0fdf4;color:#065f46}
.source-chip.good span{color:#10b981}
.source-chip.bad{border-color:#ef444440;background:#fef2f2;color:#991b1b}
.source-chip.bad span{color:#ef4444}
.source-chip.warn{border-color:#f59e0b40;background:#fffbeb;color:#92400e}
.source-chip.warn span{color:#f59e0b}
.source-chip.neutral{color:#475569}

/* API DATA */
.api-data{padding:1.75rem 2.5rem;border-bottom:1px solid #f1f5f9;display:grid;grid-template-columns:1fr 1fr;gap:1.25rem}
.api-section{background:#f8faff;border:1px solid #e2e8f0;border-radius:14px;padding:1.25rem}
.api-section-title{font-size:.75rem;font-weight:700;color:#475569;margin-bottom:1rem;text-transform:uppercase;letter-spacing:.06em}
.api-grid{display:grid;grid-template-columns:1fr 1fr;gap:.75rem}
.api-stat{text-align:center;background:#fff;border-radius:10px;padding:.7rem .5rem;border:1px solid #e2e8f0}
.api-stat-val{font-size:1.2rem;font-weight:800;margin-bottom:.2rem}
.api-stat-val.good{color:#10b981}.api-stat-val.warn{color:#f59e0b}.api-stat-val.bad{color:#ef4444}.api-stat-val.neutral{color:#94a3b8}
.api-stat-key{font-size:.68rem;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:.05em}
.api-address{margin-top:.75rem;font-size:.78rem;color:#64748b;line-height:1.4}
.ps-rows{display:flex;flex-direction:column;gap:.6rem}
.ps-row{display:flex;align-items:center;gap:.75rem}
.ps-label{font-size:.78rem;color:#475569;font-weight:600;width:90px;flex-shrink:0}
.ps-bar-wrap{flex:1;height:8px;background:#e2e8f0;border-radius:4px;overflow:hidden}
.ps-bar-fill{height:100%;border-radius:4px;transition:width .3s}
.ps-score{font-size:.78rem;font-weight:700;width:48px;text-align:right;flex-shrink:0}
.ps-metrics{display:flex;flex-wrap:wrap;gap:.5rem;margin-top:.85rem}
.ps-metric{background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:.35rem .65rem;font-size:.72rem}
.ps-metric span{color:#94a3b8;display:block}
.ps-metric strong{color:#0f172a;font-size:.8rem}
.ps-legend{margin-top:.9rem;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:.7rem .85rem}
.ps-legend-title{font-size:.72rem;font-weight:800;letter-spacing:.04em;text-transform:uppercase;color:#64748b;margin-bottom:.45rem}
.ps-legend>div{font-size:.78rem;color:#475569;line-height:1.5;margin-bottom:.25rem}
.ps-legend b{color:#1e3a8a}
.ps-legend em{color:#0f172a;font-style:normal;font-weight:600}

/* FINDINGS */
.findings{padding:1.75rem 2.5rem;border-bottom:1px solid #f1f5f9}
.finding-card{background:#fff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;margin-bottom:1.1rem}
.finding-card:last-child{margin-bottom:0}
.finding-header{display:flex;align-items:center;gap:1rem;padding:1.1rem 1.4rem;border-bottom:1px solid #f1f5f9;background:#fafbff}
.finding-icon{font-size:1.5rem;flex-shrink:0}
.finding-title-wrap{display:flex;align-items:center;gap:.75rem;flex-wrap:wrap}
.finding-area{font-size:.95rem;font-weight:800;color:#0f172a}
.finding-score-pill{font-size:.7rem;font-weight:700;padding:.2rem .65rem;border-radius:20px}
.finding-body{display:grid;grid-template-columns:1fr 1fr}
.finding-block{padding:1.25rem 1.4rem}
.finding-block p{font-size:.9rem;color:#374151;line-height:1.75}
.problem-block{background:#fff9f9;border-right:1px solid #fee2e2}
.solution-block{background:#f0fdf4}
.finding-block-label{font-size:.68rem;font-weight:800;text-transform:uppercase;letter-spacing:.07em;margin-bottom:.6rem}
.problem-block .finding-block-label{color:#ef4444}
.solution-block .finding-block-label{color:#10b981}

/* CTA */
.cta-sec{padding:2.5rem;background:linear-gradient(135deg,#eff6ff 0%,#dbeafe 100%);text-align:center}
.cta-ey{font-size:.7rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#3b82f6;margin-bottom:.65rem}
.cta-title{font-size:1.35rem;font-weight:800;color:#1e3a8a;margin-bottom:.4rem}
.cta-sub{font-size:.9rem;color:#475569;margin-bottom:1.35rem;line-height:1.6}
.cta-btn{display:inline-block;padding:.85rem 2.5rem;background:linear-gradient(135deg,#3b82f6,#1d4ed8);color:#fff;text-decoration:none;font-weight:700;border-radius:50px;font-size:.92rem;box-shadow:0 4px 20px rgba(59,130,246,.4)}

/* 90-DAY PLAN TABLE */
.ninety{padding:1.75rem 2.5rem;border-bottom:1px solid #f1f5f9}
.ninety-wrap{overflow-x:auto}
.ninety-table{width:100%;border-collapse:separate;border-spacing:0;font-size:.84rem;min-width:560px}
.ninety-table th{text-align:left;font-size:.7rem;text-transform:uppercase;letter-spacing:.05em;color:#64748b;font-weight:800;padding:.6rem .8rem;background:#f8fafc;border-bottom:2px solid #e2e8f0}
.ninety-table td{padding:.85rem .8rem;border-bottom:1px solid #eef2f7;color:#334155;line-height:1.5;vertical-align:top}
.ninety-table tr:last-child td{border-bottom:none}
.ninety-table .np-phase{font-weight:800;color:#1d4ed8;white-space:nowrap}
.ninety-table .np-focus{font-weight:700;color:#0f172a}
.ninety-table .np-out{color:#047857;font-weight:600}

/* PRINT / SAVE AS PDF */
@media print{
    body{background:#fff}
    .page{box-shadow:none;border-radius:0;margin:0;max-width:100%}
    .top-bar{display:none}
    .api-data{grid-template-columns:1fr 1fr}
    .finding-body{grid-template-columns:1fr 1fr}
    .finding-card{page-break-inside:avoid}
    /* Make CTA section print-safe — solid colours instead of gradients */
    .cta-sec{background:#eff6ff !important;-webkit-print-color-adjust:exact;print-color-adjust:exact;page-break-inside:avoid}
    .cta-btn{
        display:inline-block !important;
        background:#1d4ed8 !important;
        color:#fff !important;
        -webkit-print-color-adjust:exact;
        print-color-adjust:exact;
        box-shadow:none !important;
        border:2px solid #1d4ed8 !important;
        padding:.85rem 2.5rem;
        border-radius:50px;
        font-weight:700;
        font-size:.92rem;
        text-decoration:none
    }
    .rh{-webkit-print-color-adjust:exact;print-color-adjust:exact}
    .sources-banner{-webkit-print-color-adjust:exact;print-color-adjust:exact}
}
@media(max-width:640px){
    .rh,.overall,.scores,.api-data,.findings,.cta-sec{padding:1.25rem}
    .overall{flex-direction:column;gap:1.5rem}
    .score-cards{flex-wrap:wrap}
    .score-card{min-width:calc(50% - .65rem)}
    .api-data{grid-template-columns:1fr}
    .finding-body{grid-template-columns:1fr}
    .problem-block{border-right:none;border-bottom:1px solid #fee2e2}
}
</style>
</head>
<body>
${adminBanner}
<div class="page">

<div class="top-bar">
    <span>📄 GrowClinic AI — Digital Health Audit: ${escapeHtml(d.clinicName || 'Your Clinic')}</span>
    <div style="display:flex;gap:.5rem;align-items:center">
        <button class="dl-btn" id="share-btn" onclick="
            const url = window.location.href;
            if (navigator.clipboard) {
                navigator.clipboard.writeText(url).then(() => {
                    this.textContent = '✅ Link Copied!';
                    setTimeout(() => { this.innerHTML = '🔗 Share Report'; }, 2000);
                });
            } else {
                prompt('Copy this report link:', url);
            }
        " style="background:#3b82f6;color:#fff">
            🔗 Share Report
        </button>
        <button class="dl-btn" onclick="window.print()">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Download PDF
        </button>
    </div>
</div>

<div class="rh">
    <div class="rh-top">
        <div>
            <div class="rh-brand">GrowClinic AI</div>
            <div class="rh-title">Digital Health Audit Report</div>
            <div class="rh-sub">Personalised Clinic Growth Analysis</div>
        </div>
        <div class="rh-date">${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
    </div>
    <div class="rh-meta">
        <div class="rh-meta-item">Prepared for<strong>${escapeHtml(d.clinicName || 'Your Clinic')}</strong></div>
        <div class="rh-meta-item">Owner<strong>${escapeHtml(d.ownerName || 'Doctor')}</strong></div>
        ${d.location ? `<div class="rh-meta-item">Location<strong>${escapeHtml(d.location)}</strong></div>` : ''}
        ${d.clinicCategory ? `<div class="rh-meta-item">Specialty<strong>${escapeHtml(d.clinicCategory)}</strong></div>` : ''}
    </div>
</div>

<div class="overall">
    <div style="flex-shrink:0">
        <svg width="140" height="140" viewBox="0 0 140 140">
            <circle cx="70" cy="70" r="54" fill="none" stroke="#e2e8f0" stroke-width="10"/>
            <circle cx="70" cy="70" r="54" fill="none" stroke="${overallC}" stroke-width="10"
                stroke-dasharray="${oDash} ${oCirc - oDash}" stroke-dashoffset="${oCirc * 0.25}" stroke-linecap="round"/>
            <text x="70" y="65" text-anchor="middle" font-family="Inter,sans-serif" font-size="30" font-weight="900" fill="#0f172a">${d.overallScore}</text>
            <text x="70" y="85" text-anchor="middle" font-family="Inter,sans-serif" font-size="13" font-weight="600" fill="#94a3b8">/100</text>
        </svg>
    </div>
    <div>
        <div class="ov-label">Overall Digital Health Score</div>
        <div class="ov-title" style="color:${overallC}">${sl(d.overallScore)} — ${d.overallScore >= 70 ? 'Strong Foundation' : d.overallScore >= 45 ? 'Room to Grow' : 'Needs Immediate Attention'}</div>
        <div class="ov-summary">${escapeHtml(d.executiveSummary || '')}</div>
    </div>
</div>

<div class="scores">
    <div class="sec-label">Score Breakdown</div>
    <div class="score-cards">
        ${ring(d.seoScore, sc(d.seoScore), 'SEO & Google Maps')}
        ${ring(d.adsScore, sc(d.adsScore), 'Paid Ads')}
        ${ring(d.conversionScore, sc(d.conversionScore), 'Conversion')}
    </div>
</div>

${sourcesBanner}

${(gmbBlock || psBlock) ? `<div class="api-data">${gmbBlock}${psBlock}</div>` : ''}

<div class="findings">
    <div class="sec-label" style="margin-bottom:1.25rem">Detailed Findings & Growth Plan</div>
    ${findingsHtml}
</div>

${Array.isArray(d.ninetyDayPlan) && d.ninetyDayPlan.length ? `
<div class="ninety">
    <div class="sec-label" style="margin-bottom:1rem">📅 Your 90-Day Growth Plan</div>
    <div class="ninety-wrap">
    <table class="ninety-table">
        <thead><tr><th>Phase</th><th>Focus</th><th>What GrowClinic does</th><th>Expected outcome</th></tr></thead>
        <tbody>
            ${d.ninetyDayPlan.map(p => `<tr>
                <td class="np-phase">${escapeHtml(p.phase || '')}</td>
                <td class="np-focus">${escapeHtml(p.focus || '')}</td>
                <td>${escapeHtml(p.actions || '')}</td>
                <td class="np-out">${escapeHtml(p.outcome || '')}</td>
            </tr>`).join('')}
        </tbody>
    </table>
    </div>
</div>` : ''}

<div class="cta-sec">
    <div class="cta-ey">🚀 Your Next Step</div>
    <div class="cta-title">Ready to Scale ${escapeHtml(d.clinicName || 'Your Clinic')}?</div>
    <div class="cta-sub">${escapeHtml(d.nextStep || 'The full 90-day plan above is ready to put into action — GrowClinic can implement it with you, step by step.')}</div>
    ${emailDeliveryOn ? `
    <div class="email-copy" style="margin:1.5rem auto 0;max-width:480px">
        <div style="font-size:.95rem;color:#1e3a8a;margin-bottom:.6rem;font-weight:800">📧 Get this full report + 90-day plan in your inbox</div>
        <div style="display:flex;gap:.5rem">
            <input id="ec-email" type="email" placeholder="you@clinic.com" style="flex:1;min-width:0;padding:.8rem 1rem;border:1.5px solid #cbd5e1;border-radius:12px;font-size:.95rem;color:#0d0d12;background:#fff">
            <button id="ec-btn" type="button" style="padding:.8rem 1.4rem;border:none;border-radius:12px;background:#1d4ed8;color:#fff;font-weight:700;font-size:.95rem;cursor:pointer;white-space:nowrap">Send report</button>
        </div>
        <div id="ec-msg" style="font-size:.8rem;margin-top:.5rem;min-height:1em"></div>
    </div>` : ''}
    <div style="display:flex;gap:1rem;justify-content:center;align-items:center;flex-wrap:wrap;margin-top:1.5rem">
        <a href="https://wa.me/916393355243?text=Hi%2C%20I%20just%20got%20my%20GrowClinic%20audit%20report%20for%20${encodeURIComponent(d.clinicName || 'my clinic')}%20and%20would%20like%20to%20discuss%20the%2090-day%20plan." target="_blank" class="cta-btn" style="background:linear-gradient(135deg,#25d366,#128c7e)">💬 WhatsApp Us Now</a>
    </div>
    <div style="margin-top:1.5rem;font-size:.78rem;color:#64748b">Powered by <strong>GrowClinic</strong> — Healthcare Digital Marketing Agency · growclinic.io</div>
</div>

</div>
<script>
// Clear retry counter on successful report load
try { sessionStorage.removeItem('reportRetry_${sessionId}'); } catch(e) {}

// "Email me a copy" handler
(function(){
    var btn = document.getElementById('ec-btn');
    if (!btn) return;
    var input = document.getElementById('ec-email');
    var msg = document.getElementById('ec-msg');
    btn.addEventListener('click', async function(){
        var email = (input.value || '').trim();
        if (!/^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$/.test(email)) {
            msg.style.color = '#ef4444'; msg.textContent = 'Please enter a valid email.'; return;
        }
        btn.disabled = true; btn.textContent = 'Sending…';
        msg.style.color = '#64748b'; msg.textContent = '';
        try {
            var r = await fetch('${BASE_PATH}/api/send-report', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId: '${sessionId}', email: email })
            });
            var data = await r.json();
            if (data.ok) {
                msg.style.color = '#10b981'; msg.textContent = '✓ Sent! Check your inbox.';
                btn.textContent = 'Sent ✓';
            } else {
                msg.style.color = '#ef4444'; msg.textContent = data.error || 'Could not send. Try again.';
                btn.disabled = false; btn.textContent = 'Send';
            }
        } catch(e) {
            msg.style.color = '#ef4444'; msg.textContent = 'Network error. Try again.';
            btn.disabled = false; btn.textContent = 'Send';
        }
    });
})();
</script>
</body>
</html>`;

    res.send(cleanDashes(html));
});

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────
function saveLeadLocally(sessionId, transcript) {
    // DATA_DIR is the persistent volume (audit_data); the code dir is ephemeral.
    const leadFile = path.join(process.env.DATA_DIR || __dirname, 'leads.json');
    let leads = [];
    if (fs.existsSync(leadFile)) {
        try { leads = JSON.parse(fs.readFileSync(leadFile, 'utf8')); } catch(e) {}
    }
    if (!leads.find(l => l.sessionId === sessionId)) {
        leads.push({ sessionId, timestamp: new Date().toISOString(), transcript });
        fs.writeFileSync(leadFile, JSON.stringify(leads, null, 2));
    }
}

// Pushes lead data to an external CRM / Google Sheet via a configured webhook.
// Point WEBHOOK_URL at a Google Apps Script Web App, Zapier/Make/Pabbly hook,
// or your CRM's inbound endpoint. The `lead` object holds clean, flat fields
// (name, clinic, phone, email, city, website, reportUrl, source) ready to map
// straight into spreadsheet columns.
async function sendToWebhook(sessionId, transcript, report, lead = null) {
    // Admin-set value (Tracking tab) wins; falls back to env. Read at call-time
    // so changing it in the panel takes effect with no redeploy/restart.
    const url = (db.getSetting('WEBHOOK_URL') || webhookUrl || '').trim();
    if (!url) return;
    try {
        await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId, lead, transcript, report })
        });
    } catch(err) { console.error('Webhook Error:', err); }
}

// ── failed CRM events queue background worker ──
async function processFailedCrmEvents() {
    try {
        const failedEvents = await db.listFailedCrmEvents(50);
        const now = new Date();
        const pending = failedEvents.filter(ev => new Date(ev.nextRetryAt) <= now && ev.attempts < 5);
        if (!pending.length) return;

        console.log(`[crm-queue] Processing ${pending.length} pending retries...`);
        for (const ev of pending) {
            let ok = false;
            let lastError = '';
            let payloadObj;
            try {
                payloadObj = JSON.parse(ev.payload);
            } catch (e) {
                payloadObj = ev.payload;
            }

            try {
                if (ev.target === 'webhook') {
                    const url = (db.getSetting('CRM_EVENTS_WEBHOOK') || '').trim();
                    if (!url) { ok = true; } // config removed, discard
                    else { ok = await postJson(url, payloadObj, 'events-webhook', ev.event); }
                } else if (ev.target === 'sheets') {
                    const url = (db.getSetting('SHEETS_WEBHOOK_URL') || '').trim();
                    if (!url) { ok = true; } // config removed, discard
                    else { ok = await postJson(url, payloadObj, 'sheets', ev.event); }
                } else if (ev.target === 'telegram') {
                    const tgToken = (db.getSetting('TELEGRAM_BOT_TOKEN') || '').trim();
                    const tgChat  = (db.getSetting('TELEGRAM_CHAT_ID') || '').trim();
                    if (!tgToken || !tgChat) { ok = true; } // config removed, discard
                    else {
                        ok = await postJson(`https://api.telegram.org/bot${tgToken}/sendMessage`, payloadObj, 'telegram', ev.event);
                    }
                }
                if (!ok) lastError = 'HTTP failure or Timeout';
            } catch (e) {
                lastError = e.message;
            }

            if (ok) {
                await db.deleteFailedCrmEvent(ev.id);
                console.log(`[crm-queue] Event #${ev.id} (${ev.target}) resent successfully.`);
            } else {
                const nextAttempts = ev.attempts + 1;
                if (nextAttempts >= 5) {
                    await db.incrementCrmEventAttempt(ev.id, new Date(Date.now() + 365 * 24 * 3600 * 1000), 'Max retries exceeded: ' + lastError);
                    console.warn(`[crm-queue] Event #${ev.id} (${ev.target}) failed permanently.`);
                } else {
                    const backoffMs = 5 * 60 * 1000 * Math.pow(2, ev.attempts);
                    const nextRetry = new Date(Date.now() + backoffMs);
                    await db.incrementCrmEventAttempt(ev.id, nextRetry, lastError);
                    console.log(`[crm-queue] Event #${ev.id} (${ev.target}) failed. Retry scheduled for ${nextRetry.toISOString()}`);
                }
            }
        }
    } catch (e) {
        console.warn('[crm-queue] run failed:', e.message);
    }
}
setInterval(() => {
    processFailedCrmEvents().catch(e => console.warn('[crm-queue] run failed:', e.message));
}, 2 * 60 * 1000).unref?.();

// GET /admin/integrations/queue
app.get('/admin/integrations/queue', requireRole('admin', 'support'), async (_req, res) => {
    try {
        const queue = await db.listFailedCrmEvents(100);
        res.json(queue);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// POST /admin/integrations/queue/retry/:id
app.post('/admin/integrations/queue/retry/:id', requireRole('admin', 'support'), async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (!id) return res.status(400).json({ error: 'Invalid ID' });
        const list = await db.listFailedCrmEvents(200);
        const ev = list.find(item => item.id === id);
        if (!ev) return res.status(404).json({ error: 'Queue item not found' });

        let ok = false;
        let lastError = '';
        let payloadObj;
        try {
            payloadObj = JSON.parse(ev.payload);
        } catch (e) {
            payloadObj = ev.payload;
        }

        if (ev.target === 'webhook') {
            const url = (db.getSetting('CRM_EVENTS_WEBHOOK') || '').trim();
            if (!url) return res.status(400).json({ error: 'Webhook URL not configured' });
            ok = await postJson(url, payloadObj, 'events-webhook', ev.event);
        } else if (ev.target === 'sheets') {
            const url = (db.getSetting('SHEETS_WEBHOOK_URL') || '').trim();
            if (!url) return res.status(400).json({ error: 'Sheets URL not configured' });
            ok = await postJson(url, payloadObj, 'sheets', ev.event);
        } else if (ev.target === 'telegram') {
            const tgToken = (db.getSetting('TELEGRAM_BOT_TOKEN') || '').trim();
            const tgChat  = (db.getSetting('TELEGRAM_CHAT_ID') || '').trim();
            if (!tgToken || !tgChat) return res.status(400).json({ error: 'Telegram credentials not configured' });
            ok = await postJson(`https://api.telegram.org/bot${tgToken}/sendMessage`, payloadObj, 'telegram', ev.event);
        }

        if (ok) {
            await db.deleteFailedCrmEvent(id);
            db.logAdminAction('crm_queue_retry', `item #${id} (${ev.target}) success`, ipHashOf(req));
            res.json({ ok: true });
        } else {
            db.logAdminAction('crm_queue_retry', `item #${id} (${ev.target}) failed`, ipHashOf(req));
            res.json({ ok: false, error: 'Target returned failure status or timed out' });
        }
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

// DELETE /admin/integrations/queue/:id
app.delete('/admin/integrations/queue/:id', requireRole('admin', 'support'), async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (!id) return res.status(400).json({ error: 'Invalid ID' });
        await db.deleteFailedCrmEvent(id);
        db.logAdminAction('crm_queue_delete', `item #${id}`, ipHashOf(req));
        res.json({ ok: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Catch-all error handler — never let an unhandled error leave the page hanging.
// In production, never leak err.message (could include DB paths, stack info, etc.)
app.use((err, req, res, _next) => {
    console.error('[express error]', req.method, req.path, '→', err);
    if (res.headersSent) return;
    const isProd = process.env.NODE_ENV === 'production';
    res.status(500).send(isProd ? 'Internal server error' : ('Server error: ' + (err.message || 'unknown')));
});

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

// Preflight: in production, PUBLIC_ORIGIN must be set or cross-origin browser
// calls (embedded forms, the marketing site, etc.) are silently blocked by CORS
// because ALLOWED_ORIGINS falls back to localhost. Warn loudly at boot.
if (process.env.NODE_ENV === 'production' && !process.env.PUBLIC_ORIGIN) {
    console.warn('\n⚠️  PUBLIC_ORIGIN is not set but NODE_ENV=production.');
    console.warn('   CORS is defaulting to localhost — cross-origin browser requests will be BLOCKED.');
    console.warn('   Set PUBLIC_ORIGIN to your live domain(s), e.g.:');
    console.warn('   PUBLIC_ORIGIN=https://audit.growclinic.io\n');
}

// Initialise PostgreSQL (schema check + settings cache + admin bootstrap) BEFORE accepting
// traffic. If the DB is briefly unreachable, RETRY with backoff instead of
// exiting — exiting makes the process manager restart us in a tight loop, which
// turns a short DB hiccup into minutes of downtime. db.init() is idempotent (the
// schema is created by the platform migrate job), so retrying is safe.
async function startServer() {
    const MAX_BACKOFF_MS = 30_000;
    let attempt = 0;
    // Keep trying until the DB is ready — never exit on a transient failure.
    // eslint-disable-next-line no-constant-condition
    while (true) {
        try {
            await db.init();
            break;
        } catch (err) {
            attempt++;
            const wait = Math.min(MAX_BACKOFF_MS, 2000 * attempt);
            console.error(`❌ Database init failed (attempt ${attempt}): ${err.message}. Retrying in ${Math.round(wait / 1000)}s…`);
            await new Promise((r) => setTimeout(r, wait));
        }
    }

    app.listen(PORT, HOST, () => {
        console.log(`GrowClinic AI server running on http://${HOST}:${PORT}${BASE_PATH ? ` (base path: ${BASE_PATH})` : ''}`);
        console.log(`Open: http://localhost:${PORT}`);
    }).on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.error(`\n❌ Port ${PORT} is already in use.\n`);
            console.error(`   Kill the other process: lsof -ti:${PORT} | xargs kill -9`);
            console.error(`   OR run on a different port: PORT=3001 npm start\n`);
            process.exit(1);
        }
        throw err;
    });
}

startServer();

// Don't let unhandled promise rejections kill the process
// Crash alerts: fire-and-forget email to NOTIFY_EMAIL, throttled to one per
// 15 minutes. Runs inside crash handlers, so it must NEVER throw itself.
let _lastErrorEmailAt = 0;
function maybeSendErrorAlert(err) {
    try {
        if (!messaging.isEmailConfigured()) return;
        const now = Date.now();
        if (now - _lastErrorEmailAt < 15 * 60 * 1000) return;
        _lastErrorEmailAt = now;
        const text = String((err && (err.stack || err.message)) || err || 'Unknown error').slice(0, 1500);
        // Resolve recipients from the matrix (error_alert), fallback to NOTIFY_EMAIL.
        Promise.resolve(notifyRecipients('error_alert')).then(list => {
            for (const email of list) {
                Promise.resolve(messaging.sendErrorAlertEmail({ email, subject: '[GrowClinic] Server error', text }))
                    .catch(() => { /* never throw from a crash handler */ });
            }
        }).catch(() => {});
    } catch (_e) { /* never throw from a crash handler */ }
}
process.on('unhandledRejection', (reason) => {
    console.error('[unhandledRejection]', reason);
    maybeSendErrorAlert(reason);
});
process.on('uncaughtException', (err) => {
    console.error('[uncaughtException]', err);
    maybeSendErrorAlert(err);
});
