// ─────────────────────────────────────────────────────────────
// messaging.js — outbound delivery
//
//   • WhatsApp  → GetGabs WhatsApp Business API (app.getgabs.com)
//       - OTP   : approved template, code in BODY (+ optional COPY_CODE button)
//       - Report: approved template, BODY vars: name, clinic, link
//   • Email     → SMTP via nodemailer (LAST-RESORT fallback; WhatsApp first)
//
// Config is read via db.getSetting() (which falls back to process.env).
// Everything degrades GRACEFULLY: if WhatsApp/SMTP isn't configured, the
// relevant send returns {skipped:true} instead of throwing, so the app keeps
// working before credentials are added.
// ─────────────────────────────────────────────────────────────
const db = require('./db');
const crypto = require('crypto');

const cfg = (k, fb = '') => {
    const v = db.getSetting(k);
    return (v && String(v).trim()) || fb;
};

// ── phone helper ─────────────────────────────────────────────
// "+91 98765 43210" → { countryCode:'91', mobile:'9876543210', e164:'919876543210' }
// Supported launch-market country codes, longest first so "+971…" isn't
// mis-read as "+97". Used to split a bare "+<cc><number>" string.
const KNOWN_CCS = ['971', '966', '880', '977', '91', '44', '61', '65', '1'];
function splitE164(digits) {
    for (const cc of KNOWN_CCS) {
        if (digits.startsWith(cc)) {
            const rest = digits.slice(cc.length);
            if (rest.length >= 6 && rest.length <= 12) return { cc, mobile: rest };
        }
    }
    return null;
}
function parsePhone(raw, defaultCC = null) {
    if (!raw) return null;
    let s = String(raw).trim();
    const dflt = defaultCC || (db.getSetting('DEFAULT_COUNTRY_CODE') || '91');
    let cc = null;
    const plus = s.match(/^\+(\d{1,3})[\s-]/);
    if (plus) { cc = plus[1]; s = s.slice(plus[0].length); }
    else if (s.startsWith('+')) {
        // "+971501234567" with no separator — split by known country codes
        const digits = s.slice(1).replace(/\D/g, '');
        const hit = splitE164(digits);
        if (hit) return { countryCode: hit.cc, mobile: hit.mobile, e164: `${hit.cc}${hit.mobile}` };
        s = s.slice(1);
    }
    const digits = s.replace(/\D/g, '');
    if (!digits) return null;
    if (!cc) {
        // No "+" at all: a long digit string may already include the country code
        const hit = digits.length > 10 ? splitE164(digits) : null;
        if (hit) return { countryCode: hit.cc, mobile: hit.mobile, e164: `${hit.cc}${hit.mobile}` };
        cc = dflt;
    }
    return { countryCode: cc, mobile: digits, e164: `${cc}${digits}` };
}

// Country code → ISO currency for ad-platform conversion values.
const CC_CURRENCY = { '91': 'INR', '971': 'AED', '44': 'GBP', '1': 'USD', '61': 'AUD', '65': 'SGD' };
function currencyForCountryCode(cc) {
    return CC_CURRENCY[String(cc || '').replace(/\D/g, '')] || 'USD';
}

// ── WhatsApp (GetGabs WABA) ──────────────────────────────────
const GABS_URL = 'https://app.getgabs.com/whatsappbusiness/send-templated-message';

function isWhatsAppConfigured() {
    return !!(cfg('GETGABS_API_KEY') && cfg('GETGABS_SENDER'));
}

// POST a template message to GetGabs. `template` is the {name,language,components}
// object. Returns {ok,...}; treats a 2xx with no "error" as success.
async function gabsSendTemplate(to, template, label) {
    const apiKey = cfg('GETGABS_API_KEY');
    const sender = cfg('GETGABS_SENDER');
    if (!apiKey || !sender) return { ok: false, skipped: true, reason: 'not_configured' };

    const payload = {
        api_key: apiKey,
        sender,
        campaign_id: cfg('GETGABS_CAMPAIGN_ID') || undefined,
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'template',
        template
    };
    try {
        const controller = new AbortController();
        const t = setTimeout(() => controller.abort(), 12000);
        const res = await fetch(GABS_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            signal: controller.signal
        });
        clearTimeout(t);
        const body = await res.text().catch(() => '');
        // Success = HTTP 2xx with no explicit error object. (Don't match loose
        // substrings like "fail"/"invalid" — GetGabs success bodies contain
        // benign fields such as "failed":0 / "invalidCount":0.)
        let parsed = null; try { parsed = JSON.parse(body); } catch (_e) {}
        const hasError = !!(parsed && (parsed.error || parsed.errors))
            || /"error"\s*:\s*[\{"]|"status"\s*:\s*"(error|fail(ed)?)"/i.test(body);
        const ok = res.ok && !hasError;
        if (!ok) console.warn(`[gabs:${label}] HTTP ${res.status}: ${body.slice(0, 350)}`);
        return { ok, status: res.status, body };
    } catch (e) {
        console.warn(`[gabs:${label}] request failed:`, e.message);
        return { ok: false, status: 0, body: e.message };
    }
}

// OTP template: the code goes in the BODY (var {{1}}). WhatsApp AUTHENTICATION
// templates (incl. "Copy code"/autofill) require the button sent as type URL
// with the code — NOT COPY_CODE. Set GETGABS_OTP_COPY_BUTTON=true to include it.
async function sendWhatsAppOtp({ countryCode, mobile, otp }) {
    const name = cfg('GETGABS_OTP_TEMPLATE');
    if (!name) return { ok: false, skipped: true, reason: 'no_template' };
    const lang = cfg('GETGABS_LANG', 'en_US');
    const components = [
        { type: 'BODY', parameters: [{ type: 'text', text: String(otp) }] }
    ];
    if (cfg('GETGABS_OTP_COPY_BUTTON') === 'true') {
        components.push({
            type: 'BUTTON', sub_type: 'URL', index: cfg('GETGABS_OTP_BUTTON_INDEX', '0'),
            parameters: [{ type: 'text', text: String(otp) }]
        });
    }
    return gabsSendTemplate(`${countryCode}${mobile}`, { name, language: { code: lang }, components }, 'otp');
}

// Report template (final_audit_report): BODY → {{1}} name, {{2}} clinic, plus a
// "View Report" URL button whose base URL in the template is .../api/report/{{1}}
// and whose variable is the session id (the last path segment of reportUrl).
// This matches the approved template's structure exactly.
async function sendWhatsAppReport({ countryCode, mobile, name = '', clinic = '', reportUrl = '', sessionId = '' }) {
    const tpl = cfg('GETGABS_REPORT_TEMPLATE');
    if (!tpl) return { ok: false, skipped: true, reason: 'no_template' };
    if (!mobile) return { ok: false, skipped: true, reason: 'no_mobile' };
    const lang = cfg('GETGABS_LANG', 'en_US');

    const urlVar = sessionId
        || (reportUrl.split('/api/report/')[1] || '').split(/[?#]/)[0]
        || reportUrl;

    const components = [
        { type: 'BODY', parameters: [
            { type: 'text', text: name || 'there' },
            { type: 'text', text: clinic || 'your clinic' }
        ] },
        { type: 'BUTTON', sub_type: 'URL', index: cfg('GETGABS_REPORT_BUTTON_INDEX', '0'),
          parameters: [{ type: 'text', text: urlVar }] }
    ];

    return gabsSendTemplate(`${countryCode}${mobile}`, { name: tpl, language: { code: lang }, components }, 'report');
}

// ── Email (SMTP via nodemailer) ──────────────────────────────
function isEmailConfigured() {
    return !!(cfg('SMTP_HOST') && cfg('SMTP_USER') && cfg('SMTP_PASS'));
}

// Every system email is sent FROM the single no-reply identity — never from an
// individual user's mailbox. SMTP_USER stays the SMTP login (auth) only; the
// visible sender is always no-reply@growclinic.io unless an admin explicitly
// overrides SMTP_FROM with another same-domain address.
const SYSTEM_FROM = 'GrowClinic <no-reply@growclinic.io>';
function systemFrom() {
    const f = (cfg('SMTP_FROM') || '').trim();
    return f || SYSTEM_FROM;
}

let _transporter = null;
// Drop the cached transporter so freshly saved SMTP settings take effect
// immediately (called by the admin panel after an SMTP_* key is updated).
function resetTransporter() { _transporter = null; }
function getTransporter() {
    if (_transporter) return _transporter;
    let nodemailer;
    try { nodemailer = require('nodemailer'); }
    catch (e) { console.warn('[email] nodemailer not installed — run npm install.'); return null; }
    const port = Number(cfg('SMTP_PORT', '465'));
    _transporter = nodemailer.createTransport({
        host: cfg('SMTP_HOST'),
        port,
        secure: cfg('SMTP_SECURE', port === 465 ? 'true' : 'false') === 'true',
        auth: { user: cfg('SMTP_USER'), pass: cfg('SMTP_PASS') }
    });
    return _transporter;
}

async function sendReportEmail({ email, name = '', clinic = '', reportUrl = '' }) {
    if (!isEmailConfigured()) return { ok: false, skipped: true, reason: 'not_configured' };
    if (!email) return { ok: false, skipped: true, reason: 'no_email' };
    const tx = getTransporter();
    if (!tx) return { ok: false, skipped: true, reason: 'no_transport' };
    const from = systemFrom();
    const safeClinic = clinic || 'your clinic';
    const html = `
        <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#0f172a">
          <h2 style="color:#1d4ed8;margin:0 0 12px">Your GrowClinic audit report is ready</h2>
          <p>Hi ${escapeHtml(name) || 'there'},</p>
          <p>We've finished the digital growth audit for <strong>${escapeHtml(safeClinic)}</strong>.
          It covers your Google visibility, website performance, ads gaps, social presence and a 90-day plan.</p>
          <p style="margin:24px 0">
            <a href="${escapeAttr(reportUrl)}" style="background:#1d4ed8;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:700;display:inline-block">View your full report →</a>
          </p>
          <p style="font-size:13px;color:#64748b">Or paste this link into your browser:<br>${escapeHtml(reportUrl)}</p>
          <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0">
          <p style="font-size:12px;color:#94a3b8">GrowClinic — Healthcare Digital Marketing · growclinic.io</p>
        </div>`;
    try {
        await tx.sendMail({
            from, to: email,
            subject: `Your GrowClinic audit report for ${safeClinic}`,
            html,
            text: `Hi ${name || 'there'}, your GrowClinic audit report for ${safeClinic} is ready: ${reportUrl}`
        });
        return { ok: true };
    } catch (e) {
        console.warn('[email] send failed:', e.message);
        return { ok: false, error: e.message };
    }
}

// Email verification code — reuses the same no-reply SMTP sender. Used for
// non-India leads where WhatsApp OTP isn't reliable.
async function sendEmailOtp({ email, otp }) {
    if (!isEmailConfigured()) return { ok: false, skipped: true, reason: 'not_configured' };
    if (!email) return { ok: false, skipped: true, reason: 'no_email' };
    const tx = getTransporter();
    if (!tx) return { ok: false, skipped: true, reason: 'no_transport' };
    const from = systemFrom();
    const code = String(otp);
    const html = `
        <div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;color:#0f172a;text-align:center">
          <h2 style="color:#1d4ed8;margin:0 0 6px">Verify your email</h2>
          <p style="color:#475569;font-size:14px;margin:0 0 18px">Enter this code to unlock your GrowClinic audit report.</p>
          <div style="font-size:34px;font-weight:800;letter-spacing:10px;background:#f1f5f9;border-radius:12px;padding:16px 0;color:#0f172a">${escapeHtml(code)}</div>
          <p style="font-size:12px;color:#94a3b8;margin:16px 0 0">This code expires in 10 minutes. If you didn't request it, ignore this email.</p>
          <p style="font-size:12px;color:#94a3b8">GrowClinic — Healthcare Digital Marketing · growclinic.io</p>
        </div>`;
    try {
        await tx.sendMail({
            from, to: email,
            subject: `${code} is your GrowClinic verification code`,
            html,
            text: `Your GrowClinic verification code is ${code}. It expires in 10 minutes.`
        });
        return { ok: true };
    } catch (e) {
        console.warn('[email-otp] send failed:', e.message);
        return { ok: false, error: e.message };
    }
}

function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function escapeAttr(s) {
    return escapeHtml(s).replace(/"/g, '&quot;');
}

// ── Calendar invite (SMTP + .ics attachment) ─────────────────
// Emails a follow-up as a real calendar invite (METHOD:REQUEST) so it lands
// in the recipient's calendar. Degrades gracefully when SMTP/email is missing.
const icsEscape = s => String(s == null ? '' : s)
    .replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
const icsUtc = d => d.toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z';

// Prefilled Google Calendar "create event" link (same event as the .ics —
// the ICS covers Apple/Outlook, this covers Google Calendar users).
function googleCalUrl({ title, startAt, durationMin = 30, description = '' }) {
    const start = new Date(startAt);
    if (isNaN(start.getTime())) return null;
    const end = new Date(start.getTime() + Math.max(5, Number(durationMin) || 30) * 60000);
    return 'https://calendar.google.com/calendar/render?action=TEMPLATE'
        + '&text=' + encodeURIComponent(String(title || 'Follow up').slice(0, 200))
        + '&dates=' + icsUtc(start) + '/' + icsUtc(end)
        + '&details=' + encodeURIComponent(String(description || '').slice(0, 1500));
}

async function sendCalendarInvite({ email, title, startAt, durationMin = 30, description = '', uid = null }) {
    if (!isEmailConfigured()) return { ok: false, skipped: true, reason: 'not_configured' };
    if (!email) return { ok: false, skipped: true, reason: 'no_email' };
    const start = new Date(startAt);
    if (isNaN(start.getTime())) return { ok: false, skipped: true, reason: 'bad_start' };
    const end = new Date(start.getTime() + Math.max(5, Number(durationMin) || 30) * 60000);
    const tx = getTransporter();
    if (!tx) return { ok: false, skipped: true, reason: 'no_transport' };
    const from = systemFrom();
    const safeTitle = String(title || 'Follow up').slice(0, 200);
    const ics = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//GrowClinic//CRM//EN',
        'METHOD:REQUEST',
        'BEGIN:VEVENT',
        `UID:${icsEscape(uid || (crypto.randomBytes(8).toString('hex') + '@growclinic'))}`,
        `DTSTAMP:${icsUtc(new Date())}`,
        `DTSTART:${icsUtc(start)}`,
        `DTEND:${icsUtc(end)}`,
        `SUMMARY:${icsEscape(safeTitle)}`,
        `DESCRIPTION:${icsEscape(description)}`,
        `ATTENDEE;ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE:mailto:${email}`,
        'STATUS:CONFIRMED',
        'END:VEVENT',
        'END:VCALENDAR'
    ].join('\r\n');
    const gcal = googleCalUrl({ title: safeTitle, startAt: start, durationMin, description });
    const html = `
        <div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;color:#0f172a">
          <h2 style="color:#1d4ed8;margin:0 0 12px;font-size:18px">${escapeHtml(safeTitle)}</h2>
          <p style="font-size:14px;margin:0 0 8px"><strong>${escapeHtml(start.toLocaleString())}</strong></p>
          ${description ? `<p style="font-size:13px;color:#475569;white-space:pre-line">${escapeHtml(description)}</p>` : ''}
          ${gcal ? `<p style="margin:22px 0">
            <a href="${escapeAttr(gcal)}" style="background:#1d4ed8;color:#fff;text-decoration:none;padding:12px 26px;border-radius:8px;font-weight:700;display:inline-block">Open in Google Calendar</a>
          </p>` : ''}
          <p style="font-size:12px;color:#94a3b8">The attached invite (.ics) works with Apple Calendar and Outlook.</p>
        </div>`;
    try {
        await tx.sendMail({
            from, to: email,
            subject: safeTitle,
            text: `${safeTitle}\n${start.toLocaleString()}\n\n${description || ''}${gcal ? `\n\nOpen in Google Calendar: ${gcal}` : ''}`.trim(),
            html,
            icalEvent: { method: 'REQUEST', filename: 'invite.ics', content: ics },
            attachments: [{ filename: 'invite.ics', content: ics, contentType: 'text/calendar; method=REQUEST; charset=utf-8' }]
        });
        return { ok: true };
    } catch (e) {
        console.warn('[email] calendar invite failed:', e.message);
        return { ok: false, error: e.message };
    }
}

// ── SMTP self-test (Integrations → System Email card) ────────
// Sends a short real email so the admin can verify credentials end-to-end.
async function sendTestEmail({ to }) {
    if (!isEmailConfigured()) return { ok: false, error: 'SMTP not configured — set SMTP_HOST, SMTP_USER and SMTP_PASS first' };
    if (!to) return { ok: false, error: 'No recipient — set NOTIFY_EMAIL or SMTP_USER' };
    const tx = getTransporter();
    if (!tx) return { ok: false, error: 'nodemailer is not installed on the server' };
    const from = systemFrom();
    try {
        await tx.sendMail({
            from, to,
            subject: '[GrowClinic] SMTP test — system email is working',
            text: 'This is a test message from your GrowClinic admin panel. If you can read this, lead alerts, calendar invites and error alerts will be delivered.',
            html: `<div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;color:#0f172a">
              <h2 style="color:#1d4ed8;margin:0 0 12px;font-size:18px">SMTP test successful</h2>
              <p style="font-size:14px">This is a test message from your GrowClinic admin panel. If you can read this, lead alerts, follow-up calendar invites and error alerts will be delivered.</p>
              <p style="font-size:12px;color:#94a3b8">GrowClinic — system email</p>
            </div>`
        });
        return { ok: true };
    } catch (e) {
        return { ok: false, error: e.message };
    }
}

// ── Generic system email ─────────────────────────────────────
// One defensive sender for internal notifications (stale digests, daily
// digest, sign-in alerts, error alerts). NEVER throws; degrades gracefully
// when SMTP is unset. html is optional — text-only mails are fine.
async function sendSystemEmail({ email, subject = '', html = null, text = '' }) {
    try {
        if (!email || !isEmailConfigured()) return { ok: false, skipped: true, reason: 'not_configured' };
        const tx = getTransporter();
        if (!tx) return { ok: false, skipped: true, reason: 'no_transport' };
        const from = systemFrom();
        const mail = {
            from, to: email,
            subject: String(subject || '[GrowClinic] Notification').slice(0, 200),
            text: String(text || '').slice(0, 8000)
        };
        if (html) mail.html = html;
        await tx.sendMail(mail);
        return { ok: true };
    } catch (e) {
        try { console.warn('[email] system email failed:', e.message); } catch (_e) { /* never throw */ }
        return { ok: false, error: e && e.message };
    }
}

// ── Server-error alert (throttled by the caller) ─────────────
// Thin wrapper over sendSystemEmail: called from crash handlers, so it must
// NEVER throw and never assume anything is configured.
async function sendErrorAlertEmail({ email, subject = '[GrowClinic] Server error', text = '' }) {
    return sendSystemEmail({ email, subject, text: String(text).slice(0, 4000) });
}

// ── New-lead alert email (Integrations → Email Alerts) ───────
// Plain notification with the essentials + a link to the admin panel.
async function sendLeadAlertEmail({ email, lead = {}, subject = '', adminUrl = '' }) {
    if (!isEmailConfigured()) return { ok: false, skipped: true, reason: 'not_configured' };
    if (!email) return { ok: false, skipped: true, reason: 'no_email' };
    const tx = getTransporter();
    if (!tx) return { ok: false, skipped: true, reason: 'no_transport' };
    const from = systemFrom();
    const subj = subject || `New lead: ${lead.clinic || lead.name || 'Unknown'}`;
    const link = adminUrl || '/admin';
    const row = (k, v) => v ? `<tr><td style="padding:4px 12px 4px 0;color:#64748b;font-size:13px">${escapeHtml(k)}</td><td style="padding:4px 0;font-size:13px;font-weight:600">${escapeHtml(v)}</td></tr>` : '';
    const html = `
        <div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;color:#0f172a">
          <h2 style="color:#1d4ed8;margin:0 0 12px;font-size:18px">${escapeHtml(subj)}</h2>
          <table style="border-collapse:collapse">
            ${row('Clinic', lead.clinic)}
            ${row('Name', lead.name)}
            ${row('Phone', lead.phone)}
            ${row('City', lead.city)}
            ${row('Source', lead.channel || lead.source)}
          </table>
          <p style="margin:20px 0">
            <a href="${escapeAttr(link)}" style="background:#1d4ed8;color:#fff;text-decoration:none;padding:10px 22px;border-radius:8px;font-weight:700;display:inline-block">Open in CRM →</a>
          </p>
          <p style="font-size:12px;color:#94a3b8">GrowClinic CRM — automatic lead alert</p>
        </div>`;
    try {
        await tx.sendMail({
            from, to: email,
            subject: subj,
            html,
            text: `${subj}\n${['Clinic: ' + (lead.clinic || '—'), 'Name: ' + (lead.name || '—'), 'Phone: ' + (lead.phone || '—'), 'City: ' + (lead.city || '—'), 'Source: ' + (lead.channel || lead.source || '—')].join('\n')}\n${link}`
        });
        return { ok: true };
    } catch (e) {
        console.warn('[email] lead alert failed:', e.message);
        return { ok: false, error: e.message };
    }
}

// ── Team invite email (admin → new member sets own password) ─
// Branded, simple: who invited you, your role, one big button, 72h expiry.
async function sendInviteEmail({ email, username = '', role = '', link = '', invitedBy = '' }) {
    if (!isEmailConfigured()) return { ok: false, skipped: true, reason: 'not_configured' };
    if (!email || !link) return { ok: false, skipped: true, reason: 'no_email' };
    const tx = getTransporter();
    if (!tx) return { ok: false, skipped: true, reason: 'no_transport' };
    const from = systemFrom();
    const roleLabel = String(role || 'team member');
    const html = `
        <div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;color:#0f172a">
          <h2 style="color:#1d4ed8;margin:0 0 12px;font-size:18px">You've been invited to GrowClinic CRM as ${escapeHtml(roleLabel)}</h2>
          <p style="font-size:14px">Hi ${escapeHtml(username) || 'there'},</p>
          <p style="font-size:14px">${invitedBy ? escapeHtml(invitedBy) + ' has invited you' : 'You have been invited'} to the GrowClinic CRM team
          as <strong>${escapeHtml(roleLabel)}</strong>. Set your password to activate your account.</p>
          <p style="margin:24px 0">
            <a href="${escapeAttr(link)}" style="background:#1d4ed8;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:700;display:inline-block">Set your password</a>
          </p>
          <p style="font-size:13px;color:#64748b">Or paste this link into your browser:<br>${escapeHtml(link)}</p>
          <p style="font-size:12px;color:#94a3b8">This link expires in 72 hours. If you weren't expecting this invite, you can ignore this email.</p>
          <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0">
          <p style="font-size:12px;color:#94a3b8">GrowClinic CRM — team invitation</p>
        </div>`;
    try {
        await tx.sendMail({
            from, to: email,
            subject: `You've been invited to GrowClinic CRM as ${roleLabel}`,
            html,
            text: `Hi ${username || 'there'},\n\nYou've been invited to GrowClinic CRM as ${roleLabel}${invitedBy ? ` by ${invitedBy}` : ''}.\nSet your password here (link expires in 72 hours):\n${link}`
        });
        return { ok: true };
    } catch (e) {
        console.warn('[email] invite send failed:', e.message);
        return { ok: false, error: e.message };
    }
}

// ── Lead-assigned notification (to the owning team member) ───
async function sendAssignmentEmail({ email, username = '', lead = {}, adminUrl = '/admin' }) {
    if (!isEmailConfigured()) return { ok: false, skipped: true, reason: 'not_configured' };
    if (!email) return { ok: false, skipped: true, reason: 'no_email' };
    const tx = getTransporter();
    if (!tx) return { ok: false, skipped: true, reason: 'no_transport' };
    const from = systemFrom();
    const who = lead.clinic || lead.name || 'a lead';
    const subj = `New lead assigned to you: ${who}${lead.city ? ` (${lead.city})` : ''}`;
    const row = (k, v) => v ? `<tr><td style="padding:4px 12px 4px 0;color:#64748b;font-size:13px">${escapeHtml(k)}</td><td style="padding:4px 0;font-size:13px;font-weight:600">${escapeHtml(v)}</td></tr>` : '';
    const html = `
        <div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;color:#0f172a">
          <h2 style="color:#1d4ed8;margin:0 0 12px;font-size:18px">${escapeHtml(subj)}</h2>
          <p style="font-size:14px;margin:0 0 10px">Hi ${escapeHtml(username) || 'there'}, a lead was just assigned to you.</p>
          <table style="border-collapse:collapse">
            ${row('Clinic', lead.clinic)}
            ${row('Name', lead.name)}
            ${row('City', lead.city)}
            ${row('Phone', lead.phone)}
            ${row('Source', lead.channel || lead.source)}
          </table>
          <p style="margin:20px 0">
            <a href="${escapeAttr(adminUrl)}" style="background:#1d4ed8;color:#fff;text-decoration:none;padding:10px 22px;border-radius:8px;font-weight:700;display:inline-block">Open in CRM</a>
          </p>
          <p style="font-size:12px;color:#94a3b8">GrowClinic CRM — lead assignment</p>
        </div>`;
    try {
        await tx.sendMail({
            from, to: email,
            subject: subj,
            html,
            text: `${subj}\n${['Clinic: ' + (lead.clinic || '—'), 'Name: ' + (lead.name || '—'), 'City: ' + (lead.city || '—'), 'Phone: ' + (lead.phone || '—'), 'Source: ' + (lead.channel || lead.source || '—')].join('\n')}\n${adminUrl}`
        });
        return { ok: true };
    } catch (e) {
        console.warn('[email] assignment alert failed:', e.message);
        return { ok: false, error: e.message };
    }
}

// ── Morning digest (Integrations → Email Alerts, DAILY_DIGEST) ─
// stats: { date, leadsToday, leadsYesterday, verified, dueToday, byStage:{stage:n}, topSource }
async function sendDigestEmail({ email, stats = {} }) {
    const s = stats || {};
    const row = (k, v) => `<tr><td style="padding:5px 14px 5px 0;color:#64748b;font-size:13px;border-bottom:1px solid #f1f5f9">${escapeHtml(k)}</td><td style="padding:5px 0;font-size:13px;font-weight:700;border-bottom:1px solid #f1f5f9">${escapeHtml(String(v))}</td></tr>`;
    const stageRows = Object.entries(s.byStage || {})
        .map(([k, v]) => row('Stage: ' + k.replace(/_/g, ' '), v)).join('');
    const html = `
        <div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;color:#0f172a">
          <h2 style="color:#1d4ed8;margin:0 0 12px;font-size:18px">GrowClinic morning digest — ${escapeHtml(String(s.date || ''))}</h2>
          <table style="border-collapse:collapse;width:100%">
            ${row('Leads today', s.leadsToday ?? 0)}
            ${row('Leads yesterday', s.leadsYesterday ?? 0)}
            ${row('Verified (2 days)', s.verified ?? 0)}
            ${row('Follow-ups due today', s.dueToday ?? 0)}
            ${row('Top source', s.topSource || '—')}
            ${stageRows}
          </table>
          <p style="font-size:12px;color:#94a3b8;margin-top:18px">GrowClinic CRM — daily digest (turn off with DAILY_DIGEST in Integrations → Email Alerts)</p>
        </div>`;
    const text = [
        `GrowClinic morning digest — ${s.date || ''}`,
        `Leads today: ${s.leadsToday ?? 0}`,
        `Leads yesterday: ${s.leadsYesterday ?? 0}`,
        `Verified (2 days): ${s.verified ?? 0}`,
        `Follow-ups due today: ${s.dueToday ?? 0}`,
        `Top source: ${s.topSource || '—'}`,
        ...Object.entries(s.byStage || {}).map(([k, v]) => `Stage ${k}: ${v}`)
    ].join('\n');
    return sendSystemEmail({ email, subject: `[GrowClinic] Morning digest — ${s.date || ''}`, html, text });
}

// ── Meta Conversions API (server-side, accurate) ─────────────
// Sends a server-side "Lead" event to Meta with the SAME event_id the browser
// Pixel uses, so Meta de-duplicates and you don't double-count. Hashed phone =
// advanced matching. Needs META_PIXEL_ID + META_CAPI_TOKEN.
function isCapiConfigured() {
    return !!(cfg('META_PIXEL_ID') && cfg('META_CAPI_TOKEN'));
}
const sha256 = v => crypto.createHash('sha256').update(String(v).trim().toLowerCase()).digest('hex');

async function sendMetaCapiLead({ eventId, phone, ip, ua, fbp, fbc, value = 1, currency = null, sourceUrl = '' }) {
    const pixel = cfg('META_PIXEL_ID');
    const token = cfg('META_CAPI_TOKEN');
    if (!pixel || !token) return { ok: false, skipped: true, reason: 'not_configured' };

    const user_data = {};
    const pp = parsePhone(phone);
    if (pp) user_data.ph = [sha256(pp.e164)];
    // Currency: explicit > derived from the lead's phone country > USD.
    const cur = currency || (pp ? currencyForCountryCode(pp.countryCode) : 'USD');
    if (ip) user_data.client_ip_address = ip;
    if (ua) user_data.client_user_agent = ua;
    if (fbp) user_data.fbp = fbp;
    if (fbc) user_data.fbc = fbc;

    const payload = {
        data: [{
            event_name: 'Lead',
            event_time: Math.floor(Date.now() / 1000),
            event_id: eventId || undefined,
            action_source: 'website',
            event_source_url: sourceUrl || undefined,
            user_data,
            custom_data: { currency: cur, value }
        }]
    };
    const ver = cfg('WA_API_VERSION', 'v21.0');
    const url = `https://graph.facebook.com/${ver}/${pixel}/events?access_token=${encodeURIComponent(token)}`;
    try {
        const controller = new AbortController();
        const t = setTimeout(() => controller.abort(), 10000);
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            signal: controller.signal
        });
        clearTimeout(t);
        const body = await res.text().catch(() => '');
        const ok = res.ok && !/"error"/.test(body);
        if (!ok) console.warn(`[capi] HTTP ${res.status}: ${body.slice(0, 300)}`);
        return { ok, status: res.status, body };
    } catch (e) {
        console.warn('[capi] request failed:', e.message);
        return { ok: false, status: 0, body: e.message };
    }
}

// ── System broadcast — send one message to all team members ──
// Called from POST /admin/notifications/broadcast (admin only).
// Returns { sent, skipped, errors } — never throws.
async function sendBroadcastEmail({ subject = '', body = '', sentBy = 'System', recipients = [] }) {
    if (!isEmailConfigured()) return { sent: 0, skipped: recipients.length, errors: ['SMTP not configured'] };
    const tx = getTransporter();
    if (!tx) return { sent: 0, skipped: recipients.length, errors: ['nodemailer not available'] };

    const from = systemFrom();
    const escapedSubject = String(subject || 'Team Update from GrowClinic').slice(0, 200);
    const bodyHtml = String(body || '').replace(/\n/g, '<br>');

    const html = `
        <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#0f172a">
            <div style="background:linear-gradient(135deg,#3b82f6,#6d28d9);padding:24px 28px;border-radius:12px 12px 0 0">
                <div style="color:#fff;font-size:20px;font-weight:800;letter-spacing:-.02em">GrowClinic</div>
                <div style="color:rgba(255,255,255,.75);font-size:13px;margin-top:2px">Team Notification</div>
            </div>
            <div style="background:#fff;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px;padding:28px">
                <div style="font-size:18px;font-weight:700;margin-bottom:16px;color:#0f172a">${escapeHtml(escapedSubject)}</div>
                <div style="font-size:14px;line-height:1.75;color:#334155">${bodyHtml}</div>
                <hr style="margin:24px 0;border:none;border-top:1px solid #f1f5f9">
                <div style="font-size:12px;color:#94a3b8">
                    Sent by <strong>${escapeHtml(sentBy)}</strong> via GrowClinic Admin ·
                    <a href="https://audit.growclinic.io/admin" style="color:#3b82f6;text-decoration:none">Open admin →</a>
                </div>
            </div>
        </div>`;

    let sent = 0, skipped = 0;
    const errors = [];
    for (const r of recipients) {
        try {
            await tx.sendMail({ from, to: r.email, subject: escapedSubject, html, text: body });
            sent++;
        } catch (e) {
            skipped++;
            errors.push(`${r.email}: ${e.message}`);
            console.warn('[broadcast] failed to send to', r.email, e.message);
        }
    }
    return { sent, skipped, errors };
}

function escapeHtml(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

module.exports = {
    parsePhone,
    currencyForCountryCode,
    isWhatsAppConfigured,
    sendWhatsAppOtp,
    sendWhatsAppReport,
    isEmailConfigured,
    resetTransporter,
    googleCalUrl,
    sendReportEmail,
    sendEmailOtp,
    sendCalendarInvite,
    sendLeadAlertEmail,
    sendTestEmail,
    sendSystemEmail,
    sendErrorAlertEmail,
    sendInviteEmail,
    sendAssignmentEmail,
    sendDigestEmail,
    isCapiConfigured,
    sendMetaCapiLead,
    sendBroadcastEmail,
};
