// ─────────────────────────────────────────────────────────────
// GrowClinic Audit — Data layer (PostgreSQL via pg)
// Migrated from mysql2 (itself migrated from better-sqlite3). Same exported
// API, with these notes:
//  • The schema is NOT created here any more. Tables live in the `audit`
//    schema of the shared `growclinic` database and are created/changed only by
//    the platform migrate job (database/migrations/audit). init() verifies the
//    schema is present and throws otherwise (server.js retries with backoff).
//  • getSetting() stays SYNCHRONOUS — settings are cached in memory at
//    init() and updated on every setSetting(), so hot paths don't await.
//  • Fire-and-forget writers (trackChatActivity, logApiUsage,
//    recordLoginAttempt, deleteAdminSession) keep their signatures and
//    swallow errors with a console.warn — callers don't await them.
//  • Read functions used by admin routes (getChatStats, listChatSessions,
//    getUsageStats, validateAdminSession, …) are async — routes await them.
//  • Row shapes match what mysql2 (dateStrings: true) returned: timestamps as
//    'YYYY-MM-DD HH:MM:SS' (UTC) strings, DATE as 'YYYY-MM-DD', COUNT/SUM/BIGINT
//    as numbers, 0/1 flags as numbers (SMALLINT, not BOOLEAN — the CRM API and
//    webhooks expose them).
//  • SQL keeps `?` placeholders (converted to $1..$n by query()); camelCase
//    identifiers are double-quoted because PostgreSQL folds unquoted names.
//  • Call db.init() once before app.listen().
// ─────────────────────────────────────────────────────────────
const { Pool, types: pgTypes } = require('pg');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const dotenv = require('dotenv');
dotenv.config();

// DATA_DIR is still used for the .admin-password helper file (and the
// server keeps generated reports there). It is NOT used for the database.
const dataDir = process.env.DATA_DIR || __dirname;
try { if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true }); } catch (_e) {}

const DB_SCHEMA = process.env.DB_SCHEMA || 'audit';
if (!/^[a-z_][a-z0-9_]*$/.test(DB_SCHEMA)) throw new Error(`Invalid DB_SCHEMA: ${DB_SCHEMA}`);

// ── Result type parsing (keep the mysql2 dateStrings shapes) ──
const PG_INT8 = 20, PG_NUMERIC = 1700, PG_DATE = 1082, PG_TIMESTAMP = 1114, PG_TIMESTAMPTZ = 1184;

// '2026-09-17 11:12:20+00' / '2026-09-17 11:12:20.5+05:30' → '2026-09-17 11:12:20' (UTC)
function toUtcDateTimeString(v) {
    const m = /^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2})(\.\d+)?(?:([+-]\d{2})(?::?(\d{2}))?)?$/.exec(v);
    if (!m) return v;
    if (!m[4] || ((m[4] === '+00' || m[4] === '-00') && (!m[5] || m[5] === '00'))) return `${m[1]} ${m[2]}`;
    const d = new Date(`${m[1]}T${m[2]}${m[3] || ''}${m[4]}:${m[5] || '00'}`);
    return isNaN(d.getTime()) ? v : d.toISOString().slice(0, 19).replace('T', ' ');
}

const typeParsers = {
    getTypeParser(oid, format) {
        if (format !== 'binary') {
            if (oid === PG_INT8 || oid === PG_NUMERIC) return (v) => (v === null ? null : Number(v));
            if (oid === PG_DATE) return (v) => v;
            if (oid === PG_TIMESTAMP || oid === PG_TIMESTAMPTZ) return toUtcDateTimeString;
        }
        return pgTypes.getTypeParser(oid, format);
    }
};

// Pool size is deliberately small: four apps share one PostgreSQL server.
// See ARCHITECTURE.md → "Connection budget".
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: Number(process.env.DB_POOL_MAX) || 6,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
    application_name: 'growclinic-audit',
    options: `-c search_path=${DB_SCHEMA} -c timezone=UTC`,
    types: typeParsers
});
pool.on('error', (e) => console.warn('[db] idle client error:', e.message));

// `?` → `$n` (skipping quoted literals/identifiers). Cached per SQL string.
const sqlCache = new Map();
function toPg(sql) {
    const hit = sqlCache.get(sql);
    if (hit) return hit;
    let out = '', n = 0, inS = false, inD = false;
    for (let i = 0; i < sql.length; i++) {
        const c = sql[i];
        if (c === "'" && !inD) inS = !inS;
        else if (c === '"' && !inS) inD = !inD;
        if (c === '?' && !inS && !inD) { out += '$' + (++n); continue; }
        out += c;
    }
    if (sqlCache.size > 1000) sqlCache.clear();
    sqlCache.set(sql, out);
    return out;
}

function query(sql, params = []) {
    return pool.query(toPg(sql), params);
}

// ─────────────────────────────────────────────────────────────
// SCHEMA — verified, never created, at boot
// ─────────────────────────────────────────────────────────────
const REQUIRED_TABLES = [
    'leads', 'settings', 'chat_sessions', 'admin_sessions', 'admin_login_attempts',
    'admin_users', 'popup_leads', 'admin_logs', 'api_usage', 'lead_tasks', 'lead_events',
    'raw_events', 'automation_rules', 'automation_runs', 'failed_crm_events',
    'xp_ledger', 'checkins', 'notification_prefs'
];

async function assertSchema() {
    const { rows } = await query(
        `SELECT table_name FROM information_schema.tables
          WHERE table_schema = current_schema() AND table_name = ANY(?::text[])`,
        [REQUIRED_TABLES]);
    const present = new Set(rows.map(r => r.table_name));
    const missing = REQUIRED_TABLES.filter(t => !present.has(t));
    if (missing.length) {
        throw new Error(`schema "${DB_SCHEMA}" is not migrated (missing: ${missing.join(', ')}) — run the platform migrate job`);
    }
}

// ─────────────────────────────────────────────────────────────
// SETTINGS — in-memory cache so getSetting() stays synchronous
// ─────────────────────────────────────────────────────────────
const settingsCache = new Map();

async function loadSettings() {
    const { rows } = await query(`SELECT "keyName", "keyValue" FROM settings`);
    settingsCache.clear();
    for (const r of rows) settingsCache.set(r.keyName, r.keyValue);
}

function getSetting(keyName, fallbackEnv = '') {
    if (settingsCache.has(keyName)) return settingsCache.get(keyName);
    const envVal = process.env[keyName];
    if (envVal !== undefined && envVal !== '') return envVal;
    if (keyName === 'SMTP_USER') return 'no-reply@growclinic.io';
    if (keyName === 'SMTP_FROM') return 'GrowClinic <no-reply@growclinic.io>';
    return fallbackEnv;
}

function setSetting(keyName, keyValue) {
    if (!keyValue) return;
    settingsCache.set(keyName, keyValue);
    query(
        `INSERT INTO settings ("keyName", "keyValue") VALUES (?, ?)
         ON CONFLICT ("keyName") DO UPDATE SET "keyValue" = EXCLUDED."keyValue", "updatedAt" = CURRENT_TIMESTAMP`,
        [keyName, keyValue]
    ).catch(e => console.warn('[settings] write failed:', e.message));
}

function deleteSettings(names = []) {
    if (!names.length) return Promise.resolve();
    for (const n of names) settingsCache.delete(n);
    return query(`DELETE FROM settings WHERE "keyName" = ANY(?::text[])`, [names]);
}

// Sync settings from settings.json (highest priority) and .env (fallback)
// into the DB + cache on every startup. settings.json wins.
function syncSecretsFromFiles() {
    const secretsToImport = [
        'OPENAI_API_KEY',
        'GEMINI_API_KEY',
        'GOOGLE_API_KEY',
        'PERPLEXITY_API_KEY',
        'DATAFORSEO_LOGIN',
        'DATAFORSEO_PASSWORD',
        // GetGabs WhatsApp Business API — OTP + report delivery
        'GETGABS_API_KEY',
        'GETGABS_SENDER',
        'GETGABS_CAMPAIGN_ID',
        'GETGABS_OTP_TEMPLATE',
        'GETGABS_REPORT_TEMPLATE',
        'GETGABS_LANG',
        'GETGABS_OTP_COPY_BUTTON',
        'GETGABS_OTP_BUTTON_INDEX',
        'GETGABS_REPORT_BUTTON_INDEX',
        // SMTP — report delivery by email
        'SMTP_HOST',
        'SMTP_PORT',
        'SMTP_USER',
        'SMTP_PASS',
        'SMTP_FROM',
        'SMTP_SECURE',
        // Analytics / tracking IDs (managed in admin → Tracking)
        'GTM_ID',
        'GA4_ID',
        'META_PIXEL_ID',
        'META_CAPI_TOKEN',
        'GOOGLE_ADS_ID',
        'GOOGLE_ADS_LABEL',
        'CLARITY_ID',
        'GSC_VERIFICATION'
    ];
    let fileSettings = {};
    try {
        const settingsPath = path.join(__dirname, 'settings.json');
        if (fs.existsSync(settingsPath)) {
            fileSettings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
        }
    } catch (e) {
        console.warn('[db] Could not parse settings.json:', e.message);
    }
    for (const secret of secretsToImport) {
        const candidates = [fileSettings[secret], process.env[secret]];
        const value = candidates.find(v => v && !v.includes('YOUR_') && v.length > 5);
        if (value) setSetting(secret, value);
    }
}

// ─────────────────────────────────────────────────────────────
// LEADS
// ─────────────────────────────────────────────────────────────
async function insertLead(leadData = {}) {
    const r = await query(
        `INSERT INTO leads
            (name, "clinicName", "clinicType", city, website, phone,
             "googleTraffic", ads, "monthlyVolume", "primaryGoal", "auditScore", "reportUrl")
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         RETURNING id`,
        [
            leadData.name || '',
            leadData.clinicName || '',
            leadData.clinicType || '',
            leadData.city || '',
            leadData.website || leadData.websiteUrl || '',
            leadData.phone || '',
            leadData.googleTraffic || '',
            leadData.ads || '',
            leadData.monthlyVolume || '',
            leadData.primaryGoal || '',
            Number(leadData.auditScore || leadData.overallScore || 0) || 0,
            leadData.reportUrl || ''
        ]
    );
    return { insertId: r.rows[0]?.id, affectedRows: r.rowCount };
}

async function getAllLeads() {
    const { rows } = await query(`SELECT * FROM leads ORDER BY "createdAt" DESC`);
    return rows;
}

// Duplicate detection: has this phone already completed an audit (has a report)?
// Matches on the last 10 digits so "+91 70..." and "9170..." both resolve.
async function findCompletedLeadByPhone(mobile) {
    const digits = String(mobile || '').replace(/\D/g, '');
    if (digits.length < 7) return null;
    const last10 = digits.slice(-10);
    try {
        const { rows } = await query(
            `SELECT name, "clinicName", "reportUrl", "createdAt" FROM leads
             WHERE "reportUrl" <> '' AND REPLACE(REPLACE(phone, ' ', ''), '+', '') LIKE ?
             ORDER BY "createdAt" DESC LIMIT 1`,
            [`%${last10}%`]
        );
        return rows[0] || null;
    } catch (e) {
        console.warn('[db] findCompletedLeadByPhone failed:', e.message);
        return null;
    }
}

// Dedupe at ingestion: find an existing captured lead by normalized phone.
// Accepts a raw phone or an already-normalized value; matches the indexed
// phoneE164 column so lookups stay fast.
async function findLeadByPhone(phone) {
    const e164 = normalizePhoneE164(phone);
    if (!e164) return null;
    try {
        const { rows } = await query(
            `SELECT "sessionId", "clinicName", "userName" FROM chat_sessions
             WHERE "phoneE164" = ? AND "leadCaptured" = 1 LIMIT 1`, [e164]);
        return rows[0] || null;
    } catch (e) {
        console.warn('[db] findLeadByPhone failed:', e.message);
        return null;
    }
}

// ─────────────────────────────────────────────────────────────
// CHAT SESSION TRACKING — fire-and-forget (callers don't await)
// ─────────────────────────────────────────────────────────────
const TRACKABLE = ['userMsgCount','aiMsgCount','clinicName','userName','city','phone',
                   'websiteUrl','leadCaptured','reportUrl','completed','transcript','source',
                   'channel','campaign','verified','otpSent','returningClient','reportViewed',
                   'email','country','specialty','crmStatus','crmRating','crmDealValue','crmNotes',
                   'phoneE164','gclid','fbclid','landingPage','referrer','adGroup','keyword'];

// Normalize a phone into indexed dedupe form: digits only, leading zeros
// stripped, bare 10-digit Indian mobiles get the '91' prefix. A number typed
// with '+' keeps its digits as-is (country code already present).
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

// Boolean-ish tracking flags are stored as SMALLINT 0/1.
const FLAG_FIELDS = new Set(['leadCaptured', 'completed', 'verified', 'otpSent', 'returningClient', 'reportViewed']);
function flagValue(k, v) {
    return FLAG_FIELDS.has(k) && typeof v === 'boolean' ? (v ? 1 : 0) : v;
}

function trackChatActivity(sessionId, fields = {}, ipHash = null, userAgent = null) {
    if (!sessionId) return;
    // Auto-maintain the normalized dedupe key whenever a phone is written,
    // so every caller (chat, prospects, webhooks) benefits without changes.
    fields = { ...fields };
    if (fields.phone !== undefined && fields.phone !== null && fields.phoneE164 == null) {
        fields.phoneE164 = normalizePhoneE164(fields.phone);
    }
    (async () => {
        await query(
            `INSERT INTO chat_sessions ("sessionId", "ipHash", "userAgent")
             VALUES (?, ?, ?)
             ON CONFLICT ("sessionId") DO UPDATE SET "lastActivityAt" = CURRENT_TIMESTAMP`,
            [sessionId, ipHash || null, userAgent ? userAgent.slice(0, 250) : null]
        );
        const updates = TRACKABLE.filter(k => fields[k] !== undefined && fields[k] !== null);
        if (updates.length) {
            const setSql = updates.map(k => `"${k}" = ?`).join(', ');
            await query(
                `UPDATE chat_sessions SET "lastActivityAt" = CURRENT_TIMESTAMP, ${setSql} WHERE "sessionId" = ?`,
                [...updates.map(k => flagValue(k, fields[k])), sessionId]
            );
        }
    })().catch(e => console.warn('[chat-track] db write failed:', e.message));
}

async function listChatSessions({ search = '', from = null, to = null, limit = 200, offset = 0, ownerId = null } = {}) {
    const where = [];
    const params = [];
    if (search) {
        // ILIKE keeps the case-insensitive matching the MySQL _ci collation gave.
        where.push(`("clinicName" ILIKE ? OR "userName" ILIKE ? OR phone ILIKE ? OR "sessionId" ILIKE ?)`);
        const s = `%${search}%`;
        params.push(s, s, s, s);
    }
    if (from) { where.push(`"startedAt" >= ?`); params.push(from); }
    if (to)   { where.push(`"startedAt" <= ?`); params.push(to); }
    if (ownerId !== null && ownerId !== undefined) { where.push(`"ownerId" = ?`); params.push(Number(ownerId)); }

    const whereSql = where.length ? 'WHERE ' + where.join(' AND ') : '';
    const { rows } = await query(
        `SELECT "sessionId", "startedAt", "lastActivityAt", completed, "userMsgCount", "aiMsgCount",
                "clinicName", "userName", city, phone, "websiteUrl", "leadCaptured", "reportUrl",
                source, channel, campaign, verified, "otpSent", "reportViewed",
                gclid, fbclid, "landingPage", referrer, "adGroup", keyword,
                "crmStatus", "crmNotes", "crmFollowUpAt", "crmRemarks", "crmTags", "lostReason",
                "crmUpdatedAt", "crmAiSummary",
                email, country, specialty, "crmRating", "crmDealValue", "ownerId", "assignedAt"
         FROM chat_sessions
         ${whereSql}
         ORDER BY "startedAt" DESC
         LIMIT ? OFFSET ?`,
        [...params, Number(limit), Number(offset)]
    );
    const { rows: [cnt] } = await query(`SELECT COUNT(*) AS total FROM chat_sessions ${whereSql}`, params);
    rows.total = Number(cnt.total) || rows.length;   // non-enumerable-ish: array with .total
    return rows;
}

// CRM-lite: update a lead's working status / notes / follow-up from the panel or API.
// Telecaller pipeline: new → phone_conversation → meeting_scheduled → meeting_done →
// decision_followup → (not_responding) → onboarded / not_interested.
// Legacy stage names are still accepted on write (mapped below).
const CRM_STATUSES = ['', 'new', 'phone_conversation', 'meeting_scheduled', 'meeting_done',
                      'decision_followup', 'not_responding', 'not_interested', 'onboarded'];
// Old pipeline → new telecaller stages (write-mapping; stored legacy values are
// read-mapped in the admin UI via normStage).
const LEGACY_STAGE_MAP = {
    called:     'phone_conversation',
    contacted:  'phone_conversation',
    qualified:  'meeting_scheduled',
    proposal:   'meeting_done',
    follow_up:  'decision_followup',
    won:        'onboarded',
    lost:       'not_interested'
};
const LOST_REASONS = ['price', 'no_response', 'competitor', 'not_a_fit', 'other'];
// Append a team remark ({by, at, text}) to the lead's remarks log.
async function addChatRemark(sessionId, by, text) {
    const t = String(text || '').trim().slice(0, 2000);
    if (!t) return { changes: 0 };
    const { rows: [row] } = await query(`SELECT "crmRemarks" FROM chat_sessions WHERE "sessionId" = ?`, [sessionId]);
    if (!row) return { changes: 0 };
    let arr = [];
    try { arr = JSON.parse(row.crmRemarks || '[]'); } catch (_e) {}
    if (!Array.isArray(arr)) arr = [];
    arr.push({ by: String(by || 'team').slice(0, 40), at: new Date().toISOString(), text: t });
    if (arr.length > 200) arr = arr.slice(-200);
    const r = await query(
        `UPDATE chat_sessions SET "crmRemarks" = ?, "crmUpdatedAt" = NOW() WHERE "sessionId" = ?`,
        [JSON.stringify(arr), sessionId]);
    return { changes: r.rowCount };
}

// Cache the on-demand AI summary ({at, summary, extraction, suggestedTags}).
// Deliberately does NOT touch crmUpdatedAt — generating a summary is a read,
// not lead activity, so it must not reset the stale-lead clock.
async function saveAiSummary(sessionId, obj) {
    const r = await query(
        `UPDATE chat_sessions SET "crmAiSummary" = ? WHERE "sessionId" = ?`,
        [JSON.stringify(obj || {}), sessionId]);
    return { changes: r.rowCount };
}

// Stale leads: captured, still open (not onboarded / not interested), and
// untouched for N+ days. Legacy stored 'won'/'lost' rows count as closed too.
// COALESCE means leads never worked fall back to their start time.
async function listStaleLeads(days = 5) {
    const d = Math.max(1, Math.round(Number(days) || 5));
    const { rows } = await query(
        `SELECT "sessionId", "clinicName", "userName", "crmStatus", "startedAt", "crmUpdatedAt"
           FROM chat_sessions
          WHERE "leadCaptured" = 1
            AND ("crmStatus" IS NULL OR "crmStatus" NOT IN ('onboarded','not_interested','won','lost'))
            AND COALESCE("crmUpdatedAt", "startedAt") < NOW() - (?::int * INTERVAL '1 day')
          ORDER BY COALESCE("crmUpdatedAt", "startedAt") ASC
          LIMIT 50`, [d]);
    return rows;
}

async function updateChatCrm(sessionId, { status, notes, followUpAt, rating, dealValue, lostReason, tags } = {}) {
    const sets = [], params = [];
    if (status !== undefined) {
        let s = String(status);
        if (LEGACY_STAGE_MAP[s]) s = LEGACY_STAGE_MAP[s];   // legacy stage name → new pipeline
        if (!CRM_STATUSES.includes(s)) throw new Error('Invalid status');
        sets.push('"crmStatus" = ?'); params.push(s || null);
    }
    if (lostReason !== undefined) {
        const lr = String(lostReason || '');
        if (lr && !LOST_REASONS.includes(lr)) throw new Error('Invalid lost reason');
        sets.push('"lostReason" = ?'); params.push(lr || null);
    }
    if (tags !== undefined) {
        const t = String(tags || '').trim();
        if (t.length > 255) throw new Error('Tags too long (max 255 chars)');
        sets.push('"crmTags" = ?'); params.push(t || null);
    }
    if (notes !== undefined) {
        sets.push('"crmNotes" = ?'); params.push(String(notes).slice(0, 5000) || null);
    }
    if (rating !== undefined) {
        if (!['', 'hot', 'warm', 'cold'].includes(String(rating))) throw new Error('Invalid rating');
        sets.push('"crmRating" = ?'); params.push(String(rating) || null);
    }
    if (dealValue !== undefined) {
        const n = dealValue === '' || dealValue === null ? null : Math.round(Number(dealValue));
        if (n !== null && (!Number.isFinite(n) || n < 0)) throw new Error('Invalid deal value');
        sets.push('"crmDealValue" = ?'); params.push(n);
    }
    if (followUpAt !== undefined) {
        if (!followUpAt) { sets.push('"crmFollowUpAt" = NULL'); }
        else {
            const d = new Date(followUpAt);
            if (isNaN(d.getTime())) throw new Error('Invalid followUpAt date');
            sets.push('"crmFollowUpAt" = ?');
            params.push(d.toISOString().slice(0, 19).replace('T', ' '));
        }
    }
    if (!sets.length) return { changes: 0 };
    sets.push('"crmUpdatedAt" = NOW()');
    const r = await query(
        `UPDATE chat_sessions SET ${sets.join(', ')} WHERE "sessionId" = ?`, [...params, sessionId]);
    return { changes: r.rowCount };
}

// Lead ownership: assign (or clear) the owning team member. Clearing the
// owner also clears assignedAt so 'Unassigned' views stay accurate.
async function setLeadOwner(sessionId, ownerId) {
    const r = ownerId === null || ownerId === undefined
        ? await query(
            `UPDATE chat_sessions SET "ownerId" = NULL, "assignedAt" = NULL WHERE "sessionId" = ?`,
            [sessionId])
        : await query(
            `UPDATE chat_sessions SET "ownerId" = ?, "assignedAt" = NOW() WHERE "sessionId" = ?`,
            [Number(ownerId), sessionId]);
    return { changes: r.rowCount };
}

// Store (or clear) the Google Calendar event id linked to a lead's meeting so
// later stage/time changes can update or delete the same event (two-way sync).
async function setGcalEventId(sessionId, eventId) {
    const r = await query(
        `UPDATE chat_sessions SET "gcalEventId" = ? WHERE "sessionId" = ?`,
        [eventId || null, sessionId]);
    return { changes: r.rowCount };
}

// Active team members a lead can be assigned to (safe fields only).
async function listAssignableUsers() {
    const { rows } = await query(
        `SELECT id, username, role FROM admin_users WHERE active = 1 ORDER BY username`);
    return rows;
}

// ─────────────────────────────────────────────────────────────
// LEAD TASKS — to-dos attached to a lead. views: 'due' = open tasks due by
// end of today (includes overdue), 'overdue' = open tasks already past due.
// Tasks are completed, never hard-deleted (audit trail).
// ─────────────────────────────────────────────────────────────
async function listTasks({ sessionId = null, view = '' } = {}) {
    const where = [], params = [];
    if (sessionId) { where.push('"sessionId" = ?'); params.push(sessionId); }
    if (view === 'due') {
        where.push('"doneAt" IS NULL');
        where.push(`"dueAt" IS NOT NULL AND "dueAt" <= (CURRENT_DATE + TIME '23:59:59')`);
    } else if (view === 'overdue') {
        where.push('"doneAt" IS NULL');
        where.push('"dueAt" IS NOT NULL AND "dueAt" < NOW()');
    }
    const w = where.length ? 'WHERE ' + where.join(' AND ') : '';
    const { rows } = await query(
        `SELECT id, "sessionId", title, "dueAt", "doneAt", "createdBy", "createdAt"
         FROM lead_tasks ${w}
         ORDER BY ("dueAt" IS NULL), "dueAt" ASC, id DESC
         LIMIT 500`, params);
    return rows;
}

async function createTask({ sessionId, title, dueAt = null, createdBy = 'team' } = {}) {
    const t = String(title || '').trim().slice(0, 255);
    if (!t) throw new Error('Task title required');
    let due = null;
    if (dueAt) {
        const d = new Date(dueAt);
        if (isNaN(d.getTime())) throw new Error('Invalid dueAt date');
        due = d.toISOString().slice(0, 19).replace('T', ' ');
    }
    const r = await query(
        `INSERT INTO lead_tasks ("sessionId", title, "dueAt", "createdBy") VALUES (?, ?, ?, ?) RETURNING id`,
        [String(sessionId || '').slice(0, 64) || null, t, due, String(createdBy || 'team').slice(0, 40)]);
    return { id: r.rows[0].id };
}

async function completeTask(id) {
    const r = await query(
        `UPDATE lead_tasks SET "doneAt" = NOW() WHERE id = ? AND "doneAt" IS NULL`, [Number(id)]);
    return { changes: r.rowCount };
}

// ─────────────────────────────────────────────────────────────
// LEAD TIMELINE — append-only event log per lead (Lead 360 view).
// addLeadEvent is fire-and-forget so it never blocks a request.
// ─────────────────────────────────────────────────────────────
function addLeadEvent(sessionId, type, detail, actor) {
    if (!sessionId) return;
    query(
        `INSERT INTO lead_events ("sessionId", type, detail, actor) VALUES (?, ?, ?, ?)`,
        [String(sessionId).slice(0, 64), String(type || 'update').slice(0, 32),
         String(detail || '').slice(0, 512), String(actor || 'system').slice(0, 40)]
    ).catch(e => console.warn('[lead-event] write failed:', e.message));
}

async function listLeadEvents(sessionId) {
    const { rows } = await query(
        `SELECT id, "sessionId", type, detail, actor, at
         FROM lead_events WHERE "sessionId" = ?
         ORDER BY id DESC LIMIT 100`, [sessionId]);
    return rows;
}

// Full marketing funnel (overall + by traffic source) for the admin overview.
// Mirrors the Meta/GA4 event funnel: visits → audit started → lead captured →
// OTP sent → verified → returning.
async function getLeadInsights({ from = null, to = null } = {}) {
    const where = [], params = [];
    if (from) { where.push('"startedAt" >= ?'); params.push(from); }
    if (to)   { where.push('"startedAt" < ?');  params.push(to); }
    const w = where.length ? 'WHERE ' + where.join(' AND ') : '';

    // A website-handoff lead carries source='growclinic-site' (channel may be
    // 'direct'), so the website source must take priority over the channel.
    const CHAN_EXPR = `CASE
        WHEN LOWER(source) IN ('growclinic-site','website') THEN 'growclinic-site'
        ELSE COALESCE(NULLIF(channel,''), NULLIF(source,''), 'direct')
    END`;

    const STAGES = `
        COUNT(*) AS visits,
        COUNT(*) FILTER (WHERE "userMsgCount" > 0) AS started,
        COUNT(*) FILTER (WHERE "leadCaptured" = 1) AS leads,
        COUNT(*) FILTER (WHERE "reportViewed" = 1) AS "reportViewed",
        COUNT(*) FILTER (WHERE "otpSent" = 1) AS "otpSent",
        COUNT(*) FILTER (WHERE verified = 1) AS verified,
        COUNT(*) FILTER (WHERE "returningClient" = 1) AS "returningN"`;

    const { rows: [tot] } = await query(`SELECT ${STAGES} FROM chat_sessions ${w}`, params);
    const { rows: byChannel } = await query(
        `SELECT ${CHAN_EXPR} AS channel, ${STAGES}
         FROM chat_sessions ${w}
         GROUP BY ${CHAN_EXPR}
         ORDER BY visits DESC
         LIMIT 12`, params
    );

    const num = (o) => ({
        visits:       Number(o.visits)       || 0,
        started:      Number(o.started)      || 0,
        leads:        Number(o.leads)        || 0,
        reportViewed: Number(o.reportViewed) || 0,
        otpSent:      Number(o.otpSent)      || 0,
        verified:     Number(o.verified)     || 0,
        returning:    Number(o.returningN)   || 0
    });

    return {
        funnel: num(tot),
        byChannel: byChannel.map(r => ({ channel: r.channel, ...num(r) }))
    };
}

async function getChatSession(sessionId) {
    const { rows } = await query(`SELECT * FROM chat_sessions WHERE "sessionId" = ?`, [sessionId]);
    return rows[0];
}

async function deleteChatSession(sessionId) {
    const r = await query(`DELETE FROM chat_sessions WHERE "sessionId" = ?`, [sessionId]);
    return { changes: r.rowCount };
}

// Chats + leads captured within an explicit datetime range (server time, UTC).
// from/to are 'YYYY-MM-DD HH:MM:SS' strings (to is exclusive). Null = open.
async function getChatCountsInRange(from = null, to = null) {
    const where = [], params = [];
    if (from) { where.push(`"startedAt" >= ?`); params.push(from); }
    if (to)   { where.push(`"startedAt" < ?`);  params.push(to); }
    const w = where.length ? 'WHERE ' + where.join(' AND ') : '';
    const { rows: [{ chats }] } = await query(`SELECT COUNT(*) AS chats FROM chat_sessions ${w}`, params);
    const { rows: [{ leads }] } = await query(
        `SELECT COUNT(*) AS leads FROM chat_sessions ${w}${w ? ' AND' : 'WHERE'} "leadCaptured" = 1`, params);
    return { chats, leads };
}

async function getChatStats() {
    const { rows: [{ n: total }] }     = await query(`SELECT COUNT(*) AS n FROM chat_sessions`);
    const { rows: [{ n: today }] }     = await query(`SELECT COUNT(*) AS n FROM chat_sessions WHERE "startedAt"::date = CURRENT_DATE`);
    const { rows: [{ n: completed }] } = await query(`SELECT COUNT(*) AS n FROM chat_sessions WHERE "leadCaptured" = 1`);
    const { rows: last7 } = await query(
        `SELECT to_char("startedAt", 'YYYY-MM-DD') AS day, COUNT(*) AS count
         FROM chat_sessions
         WHERE "startedAt" >= NOW() - INTERVAL '7 days'
         GROUP BY day ORDER BY day DESC`
    );
    return { total, today, completed, last7 };
}

// ─────────────────────────────────────────────────────────────
// ADMIN AUTH — scrypt password hashing + token sessions
// (hashing/verification are pure crypto — unchanged, synchronous)
// ─────────────────────────────────────────────────────────────
function hashPassword(plain) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(plain, salt, 64).toString('hex');
    return `scrypt$${salt}$${hash}`;
}

function verifyPassword(plain, stored) {
    if (!stored || !stored.startsWith('scrypt$')) return false;
    try {
        const [, salt, hash] = stored.split('$');
        const test = crypto.scryptSync(plain, salt, 64).toString('hex');
        const a = Buffer.from(hash, 'hex');
        const b = Buffer.from(test, 'hex');
        return a.length === b.length && crypto.timingSafeEqual(a, b);
    } catch {
        return false;
    }
}

// ─────────────────────────────────────────────────────────────
// TOTP (RFC 6238) — unchanged pure-crypto helpers
// ─────────────────────────────────────────────────────────────
function base32Encode(buf) {
    const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let bits = 0, value = 0, output = '';
    for (const byte of buf) {
        value = (value << 8) | byte;
        bits += 8;
        while (bits >= 5) {
            output += ALPHABET[(value >>> (bits - 5)) & 0x1f];
            bits -= 5;
        }
    }
    if (bits > 0) output += ALPHABET[(value << (5 - bits)) & 0x1f];
    return output;
}
function base32Decode(str) {
    const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    const clean = str.replace(/=/g, '').toUpperCase();
    let bits = 0, value = 0;
    const out = [];
    for (const ch of clean) {
        const idx = ALPHABET.indexOf(ch);
        if (idx === -1) continue;
        value = (value << 5) | idx;
        bits += 5;
        if (bits >= 8) {
            out.push((value >>> (bits - 8)) & 0xff);
            bits -= 8;
        }
    }
    return Buffer.from(out);
}

function generateTotpSecret() {
    return base32Encode(crypto.randomBytes(20));
}

function totpCode(secret, time = Math.floor(Date.now() / 1000), step = 30, digits = 6) {
    const counter = Math.floor(time / step);
    const buf = Buffer.alloc(8);
    buf.writeBigInt64BE(BigInt(counter));
    const hmac = crypto.createHmac('sha1', base32Decode(secret)).update(buf).digest();
    const offset = hmac[hmac.length - 1] & 0xf;
    const code = (
        ((hmac[offset] & 0x7f) << 24) |
        ((hmac[offset + 1] & 0xff) << 16) |
        ((hmac[offset + 2] & 0xff) << 8)  |
         (hmac[offset + 3] & 0xff)
    ) % (10 ** digits);
    return String(code).padStart(digits, '0');
}

function verifyTotp(secret, code, window = 2) {
    if (!secret || !code) return false;
    const trimmed = String(code).trim();
    if (trimmed.length !== 6 || !/^\d+$/.test(trimmed)) return false;
    const now = Math.floor(Date.now() / 1000);
    for (let w = -window; w <= window; w++) {
        if (totpCode(secret, now + w * 30) === trimmed) return true;
    }
    return false;
}

function getTotpUri(secret, label = 'GrowClinic Admin', issuer = 'GrowClinic') {
    return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(label)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
}

// Emergency recovery — set ADMIN_DISABLE_2FA=true in env to wipe TOTP on next boot.
async function maybeDisable2FA() {
    const flag = String(process.env.ADMIN_DISABLE_2FA || '').toLowerCase().trim();
    if (flag === 'true' || flag === '1' || flag === 'yes') {
        const hadSecret = !!getSetting('ADMIN_TOTP_SECRET');
        await deleteSettings(['ADMIN_TOTP_SECRET', 'ADMIN_TOTP_PENDING']);
        const line = '═'.repeat(64);
        if (hadSecret) {
            console.log(`\n${line}\n🔓  ADMIN_DISABLE_2FA=true detected — TOTP cleared.\n   You can now log in with just your password.\n   IMPORTANT: remove ADMIN_DISABLE_2FA from env vars and redeploy,\n   then re-enable 2FA in Admin → Security.\n${line}\n`);
        } else {
            console.log(`[admin] ADMIN_DISABLE_2FA=true but no TOTP was active. (No-op.)`);
        }
    }
}

function ensureAdminBootstrap() {
    const stored = getSetting('ADMIN_PASSWORD_HASH');
    const envPlain = process.env.ADMIN_INITIAL_PASSWORD;
    const line = '═'.repeat(64);

    if (envPlain && envPlain.length >= 8) {
        if (stored && stored.startsWith('scrypt$') && verifyPassword(envPlain, stored)) {
            console.log(`[admin] ADMIN_INITIAL_PASSWORD matches existing hash — login: username "admin", password from env.`);
            return;
        }
        setSetting('ADMIN_PASSWORD_HASH', hashPassword(envPlain));
        try {
            const pwFile = path.join(dataDir, '.admin-password');
            fs.writeFileSync(pwFile, `${envPlain}\n`, { mode: 0o600 });
            try { fs.chmodSync(pwFile, 0o600); } catch (_e) {}
        } catch (_e) { /* env value is the source of truth */ }
        console.log(`\n${line}\n🔐  ADMIN PASSWORD synced from ADMIN_INITIAL_PASSWORD env var.\n\n   Username: admin\n   Password: (the value of ADMIN_INITIAL_PASSWORD you set)\n   URL:      /admin\n${line}\n`);
        return;
    }

    if (stored && stored.startsWith('scrypt$')) return;

    const plain = crypto.randomBytes(12).toString('base64')
        .replace(/[+/=]/g, c => ({ '+': 'A', '/': 'B', '=': '' }[c] || ''))
        .slice(0, 16);
    setSetting('ADMIN_PASSWORD_HASH', hashPassword(plain));

    const pwFile = path.join(dataDir, '.admin-password');
    let fileWritten = false;
    try {
        fs.writeFileSync(pwFile, `${plain}\n`, { mode: 0o600 });
        try { fs.chmodSync(pwFile, 0o600); } catch (_e) {}
        fileWritten = true;
    } catch (e) {
        console.warn('[admin] could not write password file:', e.message);
    }

    if (fileWritten) {
        console.log(`\n${line}\n🔐  ADMIN PASSWORD GENERATED\n\n   Username: admin\n   Password: saved to ${pwFile} (0600 perms)\n${line}\n`);
    } else {
        console.log(`\n${line}\n🔐  ADMIN PASSWORD (file unavailable — shown ONCE in logs)\n\n   Username: admin\n   Password: ${plain}\n\n   ⚠ Save this NOW, or set ADMIN_INITIAL_PASSWORD in env and redeploy.\n${line}\n`);
    }
}

async function rotateAdminPassword(newPassword) {
    if (!newPassword || newPassword.length < 8) throw new Error('Password too short');
    setSetting('ADMIN_PASSWORD_HASH', hashPassword(newPassword));
    await query(`DELETE FROM admin_sessions`); // invalidate all sessions
}

async function createAdminSession(ipHash, userId = null, role = 'admin') {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = Date.now() + 8 * 60 * 60 * 1000; // 8h, epoch ms
    await query(
        `INSERT INTO admin_sessions (token, "expiresAt", "ipHash", "userId", role) VALUES (?, ?, ?, ?, ?)`,
        [token, expiresAt, ipHash || null, userId, role]
    );
    return { token, expiresAt: new Date(expiresAt).toISOString() };
}

// Returns false when invalid/expired, else { userId, role, username }
async function validateAdminSession(token) {
    if (!token) return false;
    const { rows } = await query(
        `SELECT s.token, s."expiresAt", s."userId", s.role, u.username, u.active
           FROM admin_sessions s
           LEFT JOIN admin_users u ON u.id = s."userId"
          WHERE s.token = ?`, [token]);
    const row = rows[0];
    if (!row) return false;
    if (Number(row.expiresAt) < Date.now()) {
        query(`DELETE FROM admin_sessions WHERE token = ?`, [token]).catch(() => {});
        return false;
    }
    // If the session is tied to a user that has since been disabled, reject it.
    if (row.userId && row.active === 0) {
        query(`DELETE FROM admin_sessions WHERE token = ?`, [token]).catch(() => {});
        return false;
    }
    return { userId: row.userId || null, role: row.role || 'admin', username: row.username || 'admin' };
}

function deleteAdminSession(token) {
    if (!token) return;
    query(`DELETE FROM admin_sessions WHERE token = ?`, [token])
        .catch(e => console.warn('[admin] session delete failed:', e.message));
}

function recordLoginAttempt(ipHash, success) {
    query(`INSERT INTO admin_login_attempts ("ipHash", success) VALUES (?, ?)`,
        [ipHash || 'unknown', success ? 1 : 0])
        .catch(e => console.warn('[admin] attempt log failed:', e.message));
}

async function recentFailedAttempts(ipHash, withinMinutes = 15) {
    const { rows: [{ n }] } = await query(
        `SELECT COUNT(*) AS n FROM admin_login_attempts
         WHERE "ipHash" = ? AND success = 0 AND "attemptedAt" >= NOW() - (?::int * INTERVAL '1 minute')`,
        [ipHash || 'unknown', Number(withinMinutes)]
    );
    return n;
}

function purgeExpiredAdminSessions() {
    query(`DELETE FROM admin_sessions WHERE "expiresAt" < ?`, [Date.now()])
        .catch(() => {});
}

// Auto-purge "empty visits": chat rows where the visitor never sent a message
// (page loaded, session pinged, nothing else), older than N hours. Keeps the
// admin Leads tab clean. Lead rows are never touched (leadCaptured guard).
// Configure with EMPTY_SESSION_TTL_HOURS (default 3; set 0 to disable).
async function purgeEmptyChatSessions(hours) {
    const h = Number(hours ?? process.env.EMPTY_SESSION_TTL_HOURS ?? 3);
    if (!h || h <= 0) return { changes: 0 };
    try {
        const r = await query(
            `DELETE FROM chat_sessions
             WHERE "userMsgCount" = 0 AND "aiMsgCount" = 0
               AND "leadCaptured" = 0 AND completed = 0
               AND "startedAt" < NOW() - (?::float8 * INTERVAL '1 hour')`, [h]);
        if (r.rowCount) console.log(`[cleanup] removed ${r.rowCount} empty visit sessions (>${h}h old)`);
        return { changes: r.rowCount };
    } catch (e) {
        console.warn('[cleanup] empty-session purge failed:', e.message);
        return { changes: 0, error: e.message };
    }
}

// ─────────────────────────────────────────────────────────────
// RAW EVENT STORE — verbatim inbound payloads for audit + replay
// ─────────────────────────────────────────────────────────────
// Fire-and-forget: ingestion must never fail because the audit write did.
function addRawEvent(channel, sessionId, payloadObj, status = 'ok') {
    let payload = '';
    try { payload = JSON.stringify(payloadObj ?? {}); } catch (_e) { payload = String(payloadObj); }
    if (payload.length > 64 * 1024) payload = payload.slice(0, 64 * 1024);
    query(
        `INSERT INTO raw_events (channel, "sessionId", payload, status) VALUES (?, ?, ?, ?)`,
        [String(channel || 'unknown').slice(0, 32), sessionId ? String(sessionId).slice(0, 64) : null,
         payload, String(status || 'ok').slice(0, 16)]
    ).catch(e => console.warn('[raw-events] write failed:', e.message));
}

async function listRawEvents({ channel = null, limit = 20 } = {}) {
    const where = [], params = [];
    if (channel) { where.push('channel = ?'); params.push(String(channel)); }
    const { rows } = await query(
        `SELECT id, channel, "sessionId", status, "receivedAt"
           FROM raw_events ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
          ORDER BY id DESC LIMIT ?`,
        [...params, Math.min(Number(limit) || 20, 200)]);
    return rows;
}

async function getRawEvent(id) {
    const { rows } = await query(
        `SELECT id, channel, "sessionId", payload, status, "receivedAt" FROM raw_events WHERE id = ?`,
        [Number(id)]);
    return rows[0] || null;
}

// Per-channel health rollup: last event + 24h volume/errors (Integrations tab).
async function rawEventStats() {
    const { rows } = await query(
        `SELECT channel,
                MAX("receivedAt") AS "lastAt",
                COUNT(*) FILTER (WHERE "receivedAt" >= NOW() - INTERVAL '24 hours') AS "count24h",
                COUNT(*) FILTER (WHERE status = 'error' AND "receivedAt" >= NOW() - INTERVAL '24 hours') AS "errors24h"
           FROM raw_events GROUP BY channel`);
    return rows;
}

// ─────────────────────────────────────────────────────────────
// Multi-user / RBAC
// Roles: 'admin' (full + user mgmt), 'manager' (dashboard/leads/usage/logs),
//        'caller' (leads + call queue only), 'consultant', 'auditor', 'support'
// ─────────────────────────────────────────────────────────────
const ROLES = ['admin', 'manager', 'caller', 'consultant', 'auditor', 'support', 'marketer'];

// Seed the first admin user from the existing single-password hash so the
// current admin login keeps working after the multi-user upgrade.
async function seedAdminUser() {
    try {
        const { rows: [{ n }] } = await query(`SELECT COUNT(*) AS n FROM admin_users`);
        const hash = getSetting('ADMIN_PASSWORD_HASH');
        if (n === 0) {
            if (!hash) return; // ensureAdminBootstrap runs first, so this should exist
            await query(
                `INSERT INTO admin_users (username, "passwordHash", role, active) VALUES (?, ?, 'admin', 1)`,
                ['admin', hash]
            );
            console.log('[db] Seeded initial "admin" user (role=admin) from existing password.');
            return;
        }
        // ADMIN_INITIAL_PASSWORD is the source of truth while it is set: keep the
        // seeded "admin" user row in sync with it. Without this, a user row seeded
        // from an earlier random password made the env password unusable (login
        // checks the user table first). Remove the env var after first login.
        const envPlain = process.env.ADMIN_INITIAL_PASSWORD;
        if (envPlain && envPlain.length >= 8 && hash) {
            const { rows: [admin] } = await query(
                `SELECT id, "passwordHash" FROM admin_users WHERE username = 'admin' LIMIT 1`);
            if (admin && !verifyPassword(envPlain, admin.passwordHash)) {
                await query(
                    `UPDATE admin_users SET "passwordHash" = ?, active = 1 WHERE id = ?`,
                    [hash, admin.id]);
                console.log('[db] "admin" user password synced from ADMIN_INITIAL_PASSWORD (env var is source of truth while set).');
            }
        }
    } catch (e) {
        console.warn('[db] seedAdminUser failed:', e.message);
    }
}

async function listUsers() {
    // NEVER select totpSecret/totpPending/inviteToken here — this list is sent
    // to the UI. Invites are exposed as the `pending` boolean only.
    const { rows } = await query(
        `SELECT id, username, role, email, active, "createdAt", "lastLoginAt", "totpEnabled",
                ("inviteToken" IS NOT NULL) AS pending
           FROM admin_users ORDER BY id ASC`);
    return rows.map(r => ({ ...r, totpEnabled: !!r.totpEnabled, pending: !!r.pending }));
}

// Usernames match case-insensitively (as under the MySQL _ci collation);
// uniqueness is enforced by the lower(username) unique index.
async function getUserByUsername(username) {
    if (!username) return null;
    const { rows } = await query(
        `SELECT id, username, "passwordHash", role, active, email,
                "totpSecret", "totpEnabled", "totpPending"
           FROM admin_users WHERE lower(username) = lower(?)`,
        [String(username).trim()]);
    return rows[0] || null;
}

async function getUserById(id) {
    const { rows } = await query(
        `SELECT id, username, "passwordHash", role, email, active, "createdAt", "lastLoginAt",
                "totpSecret", "totpEnabled", "totpPending", "inviteToken", "inviteExpires"
           FROM admin_users WHERE id = ?`, [id]);
    return rows[0] || null;
}

async function createUser(username, password, role, email = null) {
    username = String(username || '').trim();
    if (!/^[a-zA-Z0-9_.-]{3,64}$/.test(username)) throw new Error('Invalid username (3-64 chars, letters/numbers/._-)');
    if (!password || String(password).length < 8) throw new Error('Password must be at least 8 characters');
    if (!ROLES.includes(role)) throw new Error('Invalid role');
    const em = normalizeUserEmail(email);
    const existing = await getUserByUsername(username);
    if (existing) throw new Error('Username already exists');
    const r = await query(
        `INSERT INTO admin_users (username, "passwordHash", role, email, active) VALUES (?, ?, ?, ?, 1) RETURNING id`,
        [username, hashPassword(String(password)), role, em]);
    return { id: r.rows[0].id, username, role, email: em, active: 1 };
}

// ── Email invitations ────────────────────────────────────────
// Invited members get a row with an UNUSABLE random password and a one-time
// invite token (72h). They set their own password via /admin/invite/<token>.
const INVITE_TTL_MS = 72 * 60 * 60 * 1000;

async function createInvitedUser(username, email, role) {
    username = String(username || '').trim();
    if (!/^[a-zA-Z0-9_.-]{3,64}$/.test(username)) throw new Error('Invalid username (3-64 chars, letters/numbers/._-)');
    if (!ROLES.includes(role)) throw new Error('Invalid role');
    const em = normalizeUserEmail(email);
    if (!em) throw new Error('Email is required for an invite');
    const existing = await getUserByUsername(username);
    if (existing) throw new Error('Username already exists');
    const inviteToken = crypto.randomBytes(32).toString('hex');
    const inviteExpires = Date.now() + INVITE_TTL_MS;
    // Random 32-byte password hash = account unusable until the invite is accepted.
    const r = await query(
        `INSERT INTO admin_users (username, "passwordHash", role, email, active, "inviteToken", "inviteExpires")
         VALUES (?, ?, ?, ?, 1, ?, ?) RETURNING id`,
        [username, hashPassword(crypto.randomBytes(32).toString('hex')), role, em, inviteToken, inviteExpires]);
    return { id: r.rows[0].id, username, email: em, role, inviteToken };
}

// Valid (present + not expired) invite token → { id, username, role, email }.
async function getUserByInviteToken(token) {
    const t = String(token || '').trim();
    if (!/^[a-f0-9]{64}$/i.test(t)) return null;
    const { rows } = await query(
        `SELECT id, username, role, email, "inviteExpires" FROM admin_users
          WHERE "inviteToken" = lower(?) AND active = 1 LIMIT 1`, [t]);
    const u = rows[0];
    if (!u) return null;
    if (!u.inviteExpires || Number(u.inviteExpires) < Date.now()) return null;
    return { id: u.id, username: u.username, role: u.role, email: u.email };
}

// Member sets their own password: one UPDATE writes the hash and clears the
// token/expiry, then any (stray) sessions for that user are invalidated.
async function acceptInvite(id, password) {
    if (!password || String(password).length < 8) throw new Error('Password must be at least 8 characters');
    const r = await query(
        `UPDATE admin_users SET "passwordHash" = ?, "inviteToken" = NULL, "inviteExpires" = NULL
          WHERE id = ? AND "inviteToken" IS NOT NULL`,
        [hashPassword(String(password)), Number(id)]);
    await query(`DELETE FROM admin_sessions WHERE "userId" = ?`, [Number(id)]).catch(() => {});
    return { changes: r.rowCount };
}

// Rotate the invite token + expiry for a still-pending user (resend flow).
async function refreshInvite(id) {
    const inviteToken = crypto.randomBytes(32).toString('hex');
    const inviteExpires = Date.now() + INVITE_TTL_MS;
    const r = await query(
        `UPDATE admin_users SET "inviteToken" = ?, "inviteExpires" = ? WHERE id = ? AND "inviteToken" IS NOT NULL`,
        [inviteToken, inviteExpires, Number(id)]);
    if (!r.rowCount) throw new Error('User is not pending an invite');
    return { inviteToken, inviteExpires };
}

// Basic sanity check only — empty clears the address.
function normalizeUserEmail(email) {
    const em = String(email || '').trim().slice(0, 255);
    if (!em) return null;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) throw new Error('Invalid email address');
    return em;
}

async function setUserEmail(id, email) {
    const em = normalizeUserEmail(email);
    await query(`UPDATE admin_users SET email = ? WHERE id = ?`, [em, id]);
    return { email: em };
}

async function setUserRole(id, role) {
    if (!ROLES.includes(role)) throw new Error('Invalid role');
    await query(`UPDATE admin_users SET role = ? WHERE id = ?`, [role, id]);
}

async function setUserActive(id, active) {
    await query(`UPDATE admin_users SET active = ? WHERE id = ?`, [active ? 1 : 0, id]);
    if (!active) {
        // kill any live sessions for a disabled user
        await query(`DELETE FROM admin_sessions WHERE "userId" = ?`, [id]).catch(() => {});
    }
}

async function setUserPassword(id, password) {
    if (!password || String(password).length < 8) throw new Error('Password must be at least 8 characters');
    await query(`UPDATE admin_users SET "passwordHash" = ? WHERE id = ?`,
        [hashPassword(String(password)), id]);
    // Force re-login everywhere for this user
    await query(`DELETE FROM admin_sessions WHERE "userId" = ?`, [id]).catch(() => {});
}

// ── Per-user TOTP lifecycle ──────────────────────────────────
// setup → pending secret; activate (code verified by caller) → live;
// disable → everything cleared. Secrets are only ever returned once, at setup.
async function setUserTotpPending(id, secret) {
    await query(`UPDATE admin_users SET "totpPending" = ? WHERE id = ?`, [secret, id]);
}

async function activateUserTotp(id) {
    await query(
        `UPDATE admin_users SET "totpSecret" = "totpPending", "totpEnabled" = 1, "totpPending" = NULL
          WHERE id = ? AND "totpPending" IS NOT NULL`, [id]);
}

async function disableUserTotp(id) {
    await query(
        `UPDATE admin_users SET "totpSecret" = NULL, "totpEnabled" = 0, "totpPending" = NULL
          WHERE id = ?`, [id]);
}

async function deleteUser(id) {
    await query(`DELETE FROM admin_sessions WHERE "userId" = ?`, [id]).catch(() => {});
    await query(`DELETE FROM admin_users WHERE id = ?`, [id]);
}

async function touchUserLogin(id) {
    if (!id) return;
    query(`UPDATE admin_users SET "lastLoginAt" = NOW() WHERE id = ?`, [id]).catch(() => {});
}

async function countAdminsActive() {
    const { rows: [{ n }] } = await query(
        `SELECT COUNT(*) AS n FROM admin_users WHERE role = 'admin' AND active = 1`);
    return n;
}

// ─────────────────────────────────────────────────────────────
// AUTOMATION RULES — trigger + conditions + actions. Rules can be
// disabled but never hard-deleted; every execution is logged.
// ─────────────────────────────────────────────────────────────
async function listRules() {
    const { rows } = await query(
        `SELECT id, name, "trigger_", conditions, actions, enabled, "createdBy", "createdAt"
         FROM automation_rules ORDER BY id DESC LIMIT 200`);
    return rows;
}

async function getRule(id) {
    const { rows } = await query(
        `SELECT id, name, "trigger_", conditions, actions, enabled, "createdBy", "createdAt"
         FROM automation_rules WHERE id = ?`, [Number(id)]);
    return rows[0] || null;
}

async function createRule({ name, trigger_, conditions, actions, enabled = 1, createdBy = 'admin' } = {}) {
    const r = await query(
        `INSERT INTO automation_rules (name, "trigger_", conditions, actions, enabled, "createdBy")
         VALUES (?, ?, ?, ?, ?, ?) RETURNING id`,
        [String(name || '').slice(0, 120), String(trigger_ || '').slice(0, 32),
         typeof conditions === 'string' ? conditions : JSON.stringify(conditions || {}),
         typeof actions === 'string' ? actions : JSON.stringify(actions || []),
         enabled ? 1 : 0, String(createdBy || 'admin').slice(0, 40)]);
    return { id: r.rows[0].id };
}

// Partial update — only the provided fields change (used for the enabled
// toggle and for full edits alike). No delete: disable instead.
async function updateRule(id, obj = {}) {
    const sets = [], params = [];
    if (obj.name !== undefined)      { sets.push('name = ?');        params.push(String(obj.name).slice(0, 120)); }
    if (obj.trigger_ !== undefined)  { sets.push('"trigger_" = ?');  params.push(String(obj.trigger_).slice(0, 32)); }
    if (obj.conditions !== undefined) {
        sets.push('conditions = ?');
        params.push(typeof obj.conditions === 'string' ? obj.conditions : JSON.stringify(obj.conditions || {}));
    }
    if (obj.actions !== undefined) {
        sets.push('actions = ?');
        params.push(typeof obj.actions === 'string' ? obj.actions : JSON.stringify(obj.actions || []));
    }
    if (obj.enabled !== undefined)   { sets.push('enabled = ?');     params.push(obj.enabled ? 1 : 0); }
    if (!sets.length) return { changes: 0 };
    const r = await query(
        `UPDATE automation_rules SET ${sets.join(', ')} WHERE id = ?`, [...params, Number(id)]);
    return { changes: r.rowCount };
}

// Fire-and-forget execution log so automations never block on logging.
function logRun(ruleId, sessionId, trigger, result, dryRun = 0) {
    query(
        `INSERT INTO automation_runs ("ruleId", "sessionId", "trigger_", result, "dryRun") VALUES (?, ?, ?, ?, ?)`,
        [Number(ruleId) || null, String(sessionId || '').slice(0, 64) || null,
         String(trigger || '').slice(0, 32), String(result || '').slice(0, 255), dryRun ? 1 : 0]
    ).catch(e => console.warn('[automation] run log failed:', e.message));
}

async function listRuns({ ruleId = null, limit = 50 } = {}) {
    const where = [], params = [];
    if (ruleId) { where.push('r."ruleId" = ?'); params.push(Number(ruleId)); }
    const w = where.length ? 'WHERE ' + where.join(' AND ') : '';
    const { rows } = await query(
        `SELECT r.id, r."ruleId", r."sessionId", r."trigger_", r.result, r."dryRun", r.at,
                a.name AS "ruleName"
         FROM automation_runs r
         LEFT JOIN automation_rules a ON a.id = r."ruleId"
         ${w} ORDER BY r.id DESC LIMIT ?`,
        [...params, Math.min(Math.max(Number(limit) || 50, 1), 200)]);
    return rows;
}

// ─────────────────────────────────────────────────────────────
// SOURCE QUALITY REPORT — per-channel lead volume vs outcomes
// ─────────────────────────────────────────────────────────────
async function sourceQualityStats() {
    const { rows } = await query(
        `SELECT COALESCE(NULLIF(channel,''), NULLIF(source,''), 'direct') AS src,
                COUNT(*) AS leads,
                COUNT(*) FILTER (WHERE verified = 1) AS verified,
                COUNT(*) FILTER (WHERE "crmStatus" IN ('meeting_scheduled','meeting_done','decision_followup','onboarded',
                                                       'qualified','proposal','follow_up','won')) AS qualified,
                COUNT(*) FILTER (WHERE "crmStatus" IN ('onboarded','won')) AS won,
                COALESCE(SUM(COALESCE("crmDealValue", 0)), 0) AS pipeline
         FROM chat_sessions
         WHERE "leadCaptured" = 1
         GROUP BY src
         ORDER BY leads DESC
         LIMIT 15`);
    return rows;
}

// ─────────────────────────────────────────────────────────────
// ADMIN ACTIVITY LOG — fire-and-forget writes, async reads
// ─────────────────────────────────────────────────────────────
function logAdminAction(action, detail = '', ipHash = null) {
    query(`INSERT INTO admin_logs (action, detail, "ipHash") VALUES (?, ?, ?)`,
        [String(action).slice(0, 64), String(detail || '').slice(0, 512), ipHash || null])
        .catch(e => console.warn('[admin-log] write failed:', e.message));
}

async function getAdminLogs(limit = 200) {
    const { rows } = await query(
        `SELECT id, action, detail, "ipHash", "createdAt"
         FROM admin_logs ORDER BY "createdAt" DESC, id DESC LIMIT ?`,
        [Number(limit)]
    );
    return rows;
}

async function countLeads() {
    const { rows: [{ n }] } = await query(`SELECT COUNT(*) AS n FROM leads`);
    return n;
}

async function insertPopupLead(d = {}) {
    const r = await query(
        `INSERT INTO popup_leads (name, phone, email, source, "sessionId", "utmSource", "utmCampaign", referrer, "ipHash")
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
        [ (d.name||'').slice(0,255), (d.phone||'').slice(0,64), (d.email||'').slice(0,255),
          (d.source||'entry_popup').slice(0,32), (d.sessionId||'').slice(0,64),
          (d.utmSource||'').slice(0,128), (d.utmCampaign||'').slice(0,128),
          (d.referrer||'').slice(0,512), d.ipHash||null ]
    );
    return { insertId: r.rows[0]?.id, affectedRows: r.rowCount };
}

async function getPopupLeads(limit = 300) {
    const { rows } = await query(
        `SELECT * FROM popup_leads ORDER BY "createdAt" DESC LIMIT ?`, [Number(limit)]);
    return rows;
}

async function countPopupLeads() {
    const { rows: [{ n }] } = await query(`SELECT COUNT(*) AS n FROM popup_leads`);
    return n;
}

async function getPopupLeadById(id) {
    const { rows: [row] } = await query(`SELECT * FROM popup_leads WHERE id = ?`, [Number(id)]);
    return row || null;
}

// Convert a popup_lead into a full CRM chat_session prospect (one-click "Promote").
// Creates the session with leadCaptured=1 so it immediately appears in the pipeline.
async function createChatSessionFromPopup({ sessionId, userName, phone, email, source, channel, campaign, referrer }) {
    await query(
        `INSERT INTO chat_sessions
             ("sessionId", "userName", phone, email, source, channel, campaign, referrer,
              "leadCaptured", completed, "startedAt", "lastActivityAt")
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 1, NOW(), NOW())`,
        [
            sessionId,
            (userName || '').slice(0, 255),
            (phone    || '').slice(0, 64),
            (email    || '').slice(0, 255),
            (source   || 'website').slice(0, 64),
            (channel  || '').slice(0, 64),
            (campaign || '').slice(0, 128),
            (referrer || '').slice(0, 512),
        ]
    );
}

async function markPopupLeadConverted(id) {
    await query(`UPDATE popup_leads SET converted = 1 WHERE id = ?`, [Number(id)]);
}

// Per-model token usage (for cost estimation)
async function getUsageByModel({ from = null, to = null, provider = null } = {}) {
    const where = ['1=1'];
    const params = [];
    if (from)     { where.push('"loggedAt" >= ?'); params.push(from); }
    if (to)       { where.push('"loggedAt" <= ?'); params.push(to); }
    if (provider) { where.push('provider = ?');    params.push(provider); }
    const { rows } = await query(
        `SELECT provider, model,
                COUNT(*) AS calls,
                SUM("promptTokens") AS "promptTokens",
                SUM("completionTokens") AS "completionTokens",
                SUM("totalTokens") AS "totalTokens"
         FROM api_usage WHERE ${where.join(' AND ')}
         GROUP BY provider, model
         ORDER BY "totalTokens" DESC NULLS LAST`, params);
    return rows;
}

// Provider health — success/failure over the last 24h + most recent errors
async function getProviderHealth() {
    const { rows: agg } = await query(
        `SELECT provider,
                COUNT(*) AS "calls24h",
                COUNT(*) FILTER (WHERE success = 0) AS "fails24h",
                MAX("loggedAt") AS "lastAt"
         FROM api_usage
         WHERE "loggedAt" >= NOW() - INTERVAL '24 hours'
         GROUP BY provider`);
    const { rows: errs } = await query(
        `SELECT provider, error, "loggedAt"
         FROM api_usage
         WHERE success = 0 AND error IS NOT NULL
         ORDER BY "loggedAt" DESC LIMIT 20`);
    const lastError = {};
    for (const e of errs) if (!lastError[e.provider]) lastError[e.provider] = { error: e.error, at: e.loggedAt };
    return agg.map(a => ({
        provider: a.provider,
        calls24h: Number(a.calls24h) || 0,
        fails24h: Number(a.fails24h) || 0,
        lastAt: a.lastAt,
        lastError: lastError[a.provider] || null
    }));
}

// ─────────────────────────────────────────────────────────────
// API USAGE TRACKING — fire-and-forget
// ─────────────────────────────────────────────────────────────
function logApiUsage(rec = {}) {
    query(
        `INSERT INTO api_usage
            (provider, model, operation, "sessionId", "promptTokens", "completionTokens", "totalTokens", requests, success, error)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            rec.provider || 'unknown',
            rec.model || null,
            rec.operation || null,
            rec.sessionId || null,
            rec.promptTokens || 0,
            rec.completionTokens || 0,
            rec.totalTokens || 0,
            rec.requests || 1,
            rec.success === false ? 0 : 1,
            rec.error || null
        ]
    ).catch(e => console.warn('[usage] could not log:', e.message));
}

async function getUsageStats({ from = null, to = null, groupBy = 'day', provider = null } = {}) {
    const where = ['1=1'];
    const params = [];
    if (from)     { where.push('"loggedAt" >= ?'); params.push(from); }
    if (to)       { where.push('"loggedAt" <= ?'); params.push(to); }
    if (provider) { where.push('provider = ?');    params.push(provider); }

    const { rows: totals } = await query(
        `SELECT provider,
                COUNT(*) AS calls,
                SUM("promptTokens") AS "promptTokens",
                SUM("completionTokens") AS "completionTokens",
                SUM("totalTokens") AS "totalTokens",
                SUM(success) AS "successCalls"
         FROM api_usage WHERE ${where.join(' AND ')}
         GROUP BY provider
         ORDER BY "totalTokens" DESC NULLS LAST`, params);

    // Same bucket labels as MySQL DATE_FORMAT('%Y-%m' / '%x-W%v') / DATE().
    const fmt = groupBy === 'month' ? `to_char("loggedAt", 'YYYY-MM')`
              : groupBy === 'week'  ? `to_char("loggedAt", 'IYYY-"W"IW')`
              :                       `to_char("loggedAt", 'YYYY-MM-DD')`;

    const { rows: series } = await query(
        `SELECT ${fmt} AS bucket, provider,
                COUNT(*) AS calls,
                SUM("totalTokens") AS "totalTokens"
         FROM api_usage WHERE ${where.join(' AND ')}
         GROUP BY bucket, provider
         ORDER BY bucket DESC`, params);

    const { rows: [today] } = await query(
        `SELECT COUNT(*) AS calls, SUM("totalTokens") AS "totalTokens"
         FROM api_usage WHERE "loggedAt"::date = CURRENT_DATE`);

    return { totals, series, today, groupBy };
}

// ─────────────────────────────────────────────────────────────
// API KEY MANAGEMENT (admin-facing)
// ─────────────────────────────────────────────────────────────
const MANAGED_KEYS = ['OPENAI_API_KEY', 'GEMINI_API_KEY', 'GOOGLE_API_KEY', 'PERPLEXITY_API_KEY', 'GETGABS_API_KEY'];

function maskKey(value) {
    if (!value) return null;
    if (value.length <= 12) return value[0] + '*'.repeat(value.length - 1);
    return value.slice(0, 6) + '…' + value.slice(-4);
}

function listApiKeys() {
    return MANAGED_KEYS.map(name => {
        const value = getSetting(name);
        const set = !!(value && !value.includes('YOUR_') && value.length > 10);
        return { name, set, masked: set ? maskKey(value) : null };
    });
}

function setApiKey(name, value) {
    if (!MANAGED_KEYS.includes(name)) throw new Error('Unknown key name');
    if (!value || value.length < 10) throw new Error('Key looks invalid (too short)');
    setSetting(name, value.trim());
}

async function deleteApiKey(name) {
    if (!MANAGED_KEYS.includes(name)) throw new Error('Unknown key name');
    await deleteSettings([name]);
}

// ─────────────────────────────────────────────────────────────
// INIT — call once before app.listen()
// ─────────────────────────────────────────────────────────────
let housekeepingStarted = false;
async function init() {
    await assertSchema();
    await loadSettings();
    syncSecretsFromFiles();
    await maybeDisable2FA();
    ensureAdminBootstrap();
    await seedAdminUser();
    if (!housekeepingStarted) {
        housekeepingStarted = true;
        purgeExpiredAdminSessions();
        setInterval(purgeExpiredAdminSessions, 60 * 60 * 1000).unref?.();
        purgeEmptyChatSessions();
        setInterval(() => purgeEmptyChatSessions(), 60 * 60 * 1000).unref?.();
    }
    const { rows: [who] } = await query(`SELECT current_database() AS db, current_schema() AS schema`);
    console.log(`[db] PostgreSQL ready — ${who.db}.${who.schema}`);
}

// ── failed CRM events queue ──
async function enqueueCrmEvent(event, sessionId, target, payload, lastError = null) {
    const payloadStr = typeof payload === 'object' ? JSON.stringify(payload) : String(payload);
    const nextRetryAt = new Date(Date.now() + 5 * 60 * 1000); // retry in 5 minutes first
    await query(
        `INSERT INTO failed_crm_events (event, "sessionId", target, payload, "nextRetryAt", "lastError")
         VALUES (?, ?, ?, ?, ?, ?)`,
        [event, sessionId, target, payloadStr, nextRetryAt, lastError ? String(lastError).slice(0, 512) : null]
    );
}

async function listFailedCrmEvents(limit = 100) {
    const { rows } = await query(
        `SELECT id, event, "sessionId", target, payload, attempts, "nextRetryAt", "lastError", "createdAt"
         FROM failed_crm_events
         ORDER BY "createdAt" DESC
         LIMIT ?`,
        [Number(limit)]
    );
    return rows;
}

async function deleteFailedCrmEvent(id) {
    await query(`DELETE FROM failed_crm_events WHERE id = ?`, [id]);
}

async function incrementCrmEventAttempt(id, nextRetryAt, lastError = null) {
    await query(
        `UPDATE failed_crm_events
         SET attempts = attempts + 1, "nextRetryAt" = ?, "lastError" = ?
         WHERE id = ?`,
        [nextRetryAt, lastError ? String(lastError).slice(0, 512) : null, id]
    );
}

// ─────────────────────────────────────────────────────────────
// EMPLOYEE WORKSPACE (Phase 1) — XP engine, check-ins, stats
// ─────────────────────────────────────────────────────────────
const XP_EVENTS = {
    checkin_morning: 5,
    checkin_evening: 5,
    task_complete: 10,
    task_before_deadline: 5,
    weekly_review: 20,
    sop: 30,
    founder_recognition: 100,
    lead_onboarded: 40,
    fast_first_touch: 15
};

// Level ladder — cumulative XP thresholds.
const WS_LEVELS = [
    { level: 1, name: 'Rookie',   min: 0 },
    { level: 2, name: 'Bronze',   min: 100 },
    { level: 3, name: 'Silver',   min: 300 },
    { level: 4, name: 'Gold',     min: 700 },
    { level: 5, name: 'Platinum', min: 1500 },
    { level: 6, name: 'Legend',   min: 3000 }
];
function levelFor(xp) {
    let cur = WS_LEVELS[0];
    for (const l of WS_LEVELS) if (xp >= l.min) cur = l;
    const next = WS_LEVELS.find(l => l.min > xp) || null;
    const span = next ? next.min - cur.min : 1;
    const into = xp - cur.min;
    return {
        level: cur.level, name: cur.name, xp,
        nextName: next ? next.name : null,
        nextAt: next ? next.min : null,
        progressPct: next ? Math.min(100, Math.round((into / span) * 100)) : 100
    };
}

// Award XP. refId makes an event idempotent (e.g. one morning check-in/day).
async function awardXp(userId, event, refId = null, pointsOverride = null) {
    if (!userId) return { ok: false };
    const points = pointsOverride != null ? pointsOverride : (XP_EVENTS[event] || 0);
    if (!points) return { ok: false };
    if (refId) {
        const { rows: dupe } = await query(
            `SELECT id FROM xp_ledger WHERE "userId"=? AND event=? AND "refId"=? LIMIT 1`,
            [userId, event, refId]);
        if (dupe.length) return { ok: true, duplicate: true, points: 0 };
    }
    await query(
        `INSERT INTO xp_ledger ("userId", event, points, "refId") VALUES (?,?,?,?)`,
        [userId, event, points, refId]);
    return { ok: true, points };
}

async function getUserXp(userId) {
    const { rows } = await query(
        `SELECT COALESCE(SUM(points),0) AS xp FROM xp_ledger WHERE "userId"=?`, [userId]);
    return Number(rows[0]?.xp || 0);
}

function ymd(d) { return new Date(d).toISOString().slice(0, 10); }

// Consecutive-day check-in streak (today or yesterday can anchor it).
async function getCheckinStreak(userId) {
    const { rows } = await query(
        `SELECT DISTINCT "checkinDate" FROM checkins WHERE "userId"=? ORDER BY "checkinDate" DESC LIMIT 90`,
        [userId]);
    if (!rows.length) return 0;
    const set = new Set(rows.map(r => ymd(r.checkinDate)));
    const d = new Date();
    if (!set.has(ymd(d))) d.setDate(d.getDate() - 1);
    let streak = 0;
    while (set.has(ymd(d))) { streak++; d.setDate(d.getDate() - 1); }
    return streak;
}

async function getTodayCheckins(userId) {
    const { rows } = await query(
        `SELECT "checkinType", payload, "createdAt" FROM checkins WHERE "userId"=? AND "checkinDate"=CURRENT_DATE`,
        [userId]);
    const out = { morning: null, evening: null };
    for (const r of rows) {
        let payload = null;
        try { payload = r.payload ? JSON.parse(r.payload) : null; } catch { payload = null; }
        out[r.checkinType] = { payload, at: r.createdAt };
    }
    return out;
}

async function saveCheckin(userId, type, payload) {
    const t = type === 'evening' ? 'evening' : 'morning';
    await query(
        `INSERT INTO checkins ("userId", "checkinDate", "checkinType", payload) VALUES (?, CURRENT_DATE, ?, ?)
         ON CONFLICT ("userId", "checkinDate", "checkinType")
         DO UPDATE SET payload = EXCLUDED.payload, "createdAt" = NOW()`,
        [userId, t, JSON.stringify(payload || {})]);
    const today = ymd(new Date());
    await awardXp(userId, t === 'morning' ? 'checkin_morning' : 'checkin_evening', `${today}:${t}`);
    return { ok: true };
}

// Attendance % over the last N days (a morning check-in = present; weekdays only).
async function getAttendancePct(userId, days = 30) {
    const { rows } = await query(
        `SELECT COUNT(DISTINCT "checkinDate") AS present FROM checkins
          WHERE "userId"=? AND "checkinType"='morning' AND "checkinDate" >= (CURRENT_DATE - ?::int)`,
        [userId, days]);
    let expected = 0; const base = new Date();
    for (let i = 0; i < days; i++) { const d = new Date(base); d.setDate(base.getDate() - i); const w = d.getDay(); if (w >= 1 && w <= 5) expected++; }
    const present = Number(rows[0]?.present || 0);
    return expected ? Math.min(100, Math.round((present / expected) * 100)) : 0;
}

function _leadBrief(r) {
    return {
        sessionId: r.sessionId,
        name: r.clinicName || r.userName || 'Lead',
        phone: r.phone || '', city: r.city || '',
        status: r.crmStatus || '', dealValue: Number(r.crmDealValue) || 0,
        followUpAt: r.crmFollowUpAt || null
    };
}

// Workspace stats from the leads this user OWNS — real work, not vanity metrics.
async function getWorkspaceStats(userId) {
    const { rows: owned } = await query(
        `SELECT "sessionId", "clinicName", "userName", phone, city, "crmStatus", "crmFollowUpAt",
                "crmDealValue", "assignedAt", verified, "startedAt"
           FROM chat_sessions WHERE "ownerId"=?`, [userId]);
    const now = Date.now();
    const parse = s => (s ? new Date(String(s).replace(' ', 'T')).getTime() : 0);
    const startOfWeek = (() => { const d = new Date(); const off = (d.getDay() + 6) % 7; d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - off); return d.getTime(); })();
    const CLOSED = ['onboarded', 'not_interested', 'not_responding'];
    const todayStr = ymd(new Date());
    let assignedThisWeek = 0, onboardedThisWeek = 0, overdue = 0, dueToday = 0, active = 0, pipelineValue = 0, onboardedTotal = 0;
    const todayTasks = [], upcoming = [];
    for (const r of owned) {
        const st = String(r.crmStatus || '');
        const closed = CLOSED.includes(st);
        if (!closed) { active++; pipelineValue += Number(r.crmDealValue) || 0; }
        if (st === 'onboarded') onboardedTotal++;
        if (parse(r.assignedAt) >= startOfWeek) assignedThisWeek++;
        if (st === 'onboarded' && parse(r.assignedAt) >= startOfWeek) onboardedThisWeek++;
        const fu = parse(r.crmFollowUpAt);
        if (fu && !closed) {
            const fuDay = ymd(fu);
            if (fu < now) { overdue++; todayTasks.push({ ..._leadBrief(r), when: 'overdue' }); }
            else if (fuDay === todayStr) { dueToday++; todayTasks.push({ ..._leadBrief(r), when: 'today' }); }
            else if (fu < now + 7 * 86400000) { upcoming.push({ ..._leadBrief(r), when: fuDay }); }
        }
    }
    return {
        ownedTotal: owned.length, active, pipelineValue,
        assignedThisWeek, onboardedThisWeek, onboardedTotal, overdue, dueToday,
        todayTasks: todayTasks.slice(0, 15),
        upcoming: upcoming.sort((a, b) => (a.when < b.when ? -1 : 1)).slice(0, 15)
    };
}

async function getWorkspaceProfile(userId) {
    const { rows } = await query(
        `SELECT id, username, role, email, "createdAt", "lastLoginAt",
                "displayName", "avatarUrl", designation, department,
                linkedin, phone, location,
                to_char("joinDate", 'YYYY-MM-DD') AS "joinDate"
           FROM admin_users WHERE id=?`, [userId]);
    const u = rows[0];
    if (!u) return null;
    const xp = await getUserXp(userId);
    return {
        id: u.id, username: u.username, role: u.role, email: u.email || null,
        displayName: u.displayName || u.username,
        avatarUrl: u.avatarUrl || null,
        designation: u.designation || '',
        department: u.department || '',
        linkedin: u.linkedin || '',
        phone: u.phone || '',
        location: u.location || '',
        joinDate: u.joinDate || '',
        memberSince: u.createdAt, lastLoginAt: u.lastLoginAt,
        xp, level: levelFor(xp), streak: await getCheckinStreak(userId)
    };
}

async function updateWorkspaceProfile(userId, fields = {}) {
    const cols = [], vals = [];
    for (const k of ['displayName', 'designation', 'department', 'avatarUrl', 'linkedin', 'phone', 'location', 'joinDate']) {
        if (fields[k] !== undefined) { cols.push(`"${k}"=?`); vals.push(String(fields[k] || '').slice(0, 512) || null); }
    }
    if (!cols.length) return { ok: false };
    vals.push(userId);
    await query(`UPDATE admin_users SET ${cols.join(', ')} WHERE id=?`, vals);
    return { ok: true };
}

// ── Notification preferences ─────────────────────────────────
// Central registry of every notification type the system can send. To add a
// new one later (e.g. project-management alerts) just append an entry here —
// no schema change needed. `adminOnly` types are only offered to admins in the
// matrix. `defaultOn` seeds the checkbox when a user has no saved pref yet.
const NOTIF_TYPES = [
    { key: 'new_lead',      label: 'New lead alert',        desc: 'A new lead or website submission arrives.',        category: 'Leads',    defaultOn: true,  adminOnly: false },
    { key: 'lead_assigned', label: 'Lead assigned to me',   desc: 'A lead is assigned to this user.',                 category: 'Leads',    defaultOn: true,  adminOnly: false },
    { key: 'daily_digest',  label: 'Daily digest',          desc: 'Morning summary of pipeline activity.',            category: 'Digests',  defaultOn: false, adminOnly: false },
    { key: 'stale_digest',  label: 'Stale-lead digest',     desc: 'Batched reminder of leads going stale.',           category: 'Digests',  defaultOn: false, adminOnly: false },
    { key: 'signin_alert',  label: 'Sign-in alerts',        desc: 'Someone signs in to the admin panel.',             category: 'Security', defaultOn: false, adminOnly: true  },
    { key: 'error_alert',   label: 'Server error alerts',   desc: 'The server logs a crash or fatal error.',          category: 'Security', defaultOn: false, adminOnly: true  }
];
const NOTIF_KEYS = new Set(NOTIF_TYPES.map(t => t.key));

// Full matrix for the admin UI: every active user + which types they receive.
async function getNotifPrefsMatrix() {
    const { rows: users } = await query(
        `SELECT id, username, "displayName", role, email, active
           FROM admin_users ORDER BY id ASC`);
    const { rows: prefs } = await query(`SELECT "userId", "notifKey", enabled FROM notification_prefs`);
    const map = new Map(); // userId -> { notifKey: bool }
    for (const p of prefs) {
        if (!map.has(p.userId)) map.set(p.userId, {});
        map.get(p.userId)[p.notifKey] = !!p.enabled;
    }
    const rows = users.map(u => {
        const saved = map.get(u.id) || {};
        const prefsOut = {};
        for (const t of NOTIF_TYPES) {
            // Saved value wins; otherwise fall back to the type's default.
            prefsOut[t.key] = (t.key in saved) ? saved[t.key] : t.defaultOn;
        }
        return {
            id: u.id, username: u.username,
            displayName: u.displayName || u.username,
            role: u.role, email: u.email || '', active: !!u.active,
            prefs: prefsOut
        };
    });
    return { types: NOTIF_TYPES, users: rows };
}

// Persist a batch of toggles: [{ userId, notifKey, enabled }, …].
async function setNotifPrefs(entries = []) {
    let saved = 0;
    for (const e of entries) {
        const uid = Number(e.userId);
        const key = String(e.notifKey || '');
        if (!uid || !NOTIF_KEYS.has(key)) continue;
        const on = e.enabled ? 1 : 0;
        await query(
            `INSERT INTO notification_prefs ("userId", "notifKey", enabled) VALUES (?, ?, ?)
             ON CONFLICT ("userId", "notifKey") DO UPDATE SET enabled = EXCLUDED.enabled`, [uid, key, on]);
        saved++;
    }
    return { ok: true, saved };
}

// Resolve who should receive a given notification: active users with the pref
// enabled AND a real email set. Honours per-type defaults for users who have
// never saved a preference. Returns a de-duped array of email addresses.
async function getNotifRecipients(notifKey) {
    if (!NOTIF_KEYS.has(notifKey)) return [];
    const type = NOTIF_TYPES.find(t => t.key === notifKey);
    const { rows } = await query(
        `SELECT u.email AS email, np.enabled AS enabled
           FROM admin_users u
           LEFT JOIN notification_prefs np
             ON np."userId" = u.id AND np."notifKey" = ?
          WHERE u.active = 1 AND u.email IS NOT NULL AND u.email <> ''`, [notifKey]);
    const out = new Set();
    for (const r of rows) {
        const on = (r.enabled === null || r.enabled === undefined)
            ? !!(type && type.defaultOn)   // no saved pref → use default
            : !!r.enabled;
        if (on && r.email) out.add(String(r.email).trim().toLowerCase());
    }
    return [...out];
}

module.exports = {
    init,
    insertLead,
    getAllLeads,
    findCompletedLeadByPhone,
    findLeadByPhone,
    normalizePhoneE164,
    getSetting,
    setSetting,
    deleteSettings,
    // chat tracking
    trackChatActivity,
    listChatSessions,
    getChatSession,
    deleteChatSession,
    updateChatCrm,
    addChatRemark,
    saveAiSummary,
    listStaleLeads,
    setLeadOwner,
    setGcalEventId,
    listAssignableUsers,
    // CRM tasks + lead timeline
    listTasks,
    createTask,
    completeTask,
    addLeadEvent,
    listLeadEvents,
    // automation rules + source quality report
    listRules,
    getRule,
    createRule,
    updateRule,
    logRun,
    listRuns,
    sourceQualityStats,
    // raw inbound-event store (audit + replay)
    addRawEvent,
    listRawEvents,
    getRawEvent,
    rawEventStats,
    purgeEmptyChatSessions,
    getChatStats,
    getChatCountsInRange,
    getLeadInsights,
    // admin auth
    verifyPassword,
    rotateAdminPassword,
    createAdminSession,
    validateAdminSession,
    deleteAdminSession,
    recordLoginAttempt,
    recentFailedAttempts,
    // multi-user / RBAC
    ROLES,
    listUsers,
    getUserByUsername,
    getUserById,
    createUser,
    createInvitedUser,
    getUserByInviteToken,
    acceptInvite,
    refreshInvite,
    setUserRole,
    setUserActive,
    setUserEmail,
    setUserPassword,
    setUserTotpPending,
    activateUserTotp,
    disableUserTotp,
    deleteUser,
    touchUserLogin,
    countAdminsActive,
    // admin activity log + cost helpers
    logAdminAction,
    getAdminLogs,
    countLeads,
    insertPopupLead,
    getPopupLeads,
    countPopupLeads,
    getPopupLeadById,
    createChatSessionFromPopup,
    markPopupLeadConverted,
    getUsageByModel,
    getProviderHealth,
    // usage + keys
    logApiUsage,
    getUsageStats,
    listApiKeys,
    setApiKey,
    deleteApiKey,
    MANAGED_KEYS,
    // 2FA
    generateTotpSecret,
    verifyTotp,
    getTotpUri,
    // failed CRM queue
    enqueueCrmEvent,
    listFailedCrmEvents,
    deleteFailedCrmEvent,
    incrementCrmEventAttempt,
    // Employee Workspace (Phase 1)
    XP_EVENTS,
    awardXp,
    getUserXp,
    levelFor,
    getCheckinStreak,
    getTodayCheckins,
    saveCheckin,
    getAttendancePct,
    getWorkspaceStats,
    getWorkspaceProfile,
    updateWorkspaceProfile,
    NOTIF_TYPES,
    getNotifPrefsMatrix,
    setNotifPrefs,
    getNotifRecipients,
    query,
    pool
};
