/* =============================================
   GrowClinic AI, Frontend Chat Controller
   ============================================= */

// Base path the app is served under ('' at root, or the subdirectory slug when
// reverse-proxied under growclinic.io). Injected by the server as window.GC_BASE.
const GC_BASE = (typeof window !== 'undefined' && window.GC_BASE) ? window.GC_BASE : '';
const api = (p) => GC_BASE + p;

const chatMessagesArea = document.getElementById('chat-messages');
const chatForm         = document.getElementById('chat-form');
const chatInput        = document.getElementById('chat-input');
const sendBtn          = document.getElementById('send-btn');
const resetBtn         = document.getElementById('reset-chat');
const resetBtnFooter   = document.getElementById('reset-chat-footer');

// HTML escape, used everywhere we innerHTML untrusted text
function escHtml(s) {
    if (s === null || s === undefined) return '';
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
// Sanitize URL, must be http/https and from a known-safe host pattern (Google photos for GMB)
function safeUrl(url, allowedHostPattern) {
    try {
        const u = new URL(url);
        if (!['http:', 'https:'].includes(u.protocol)) return '';
        if (allowedHostPattern && !allowedHostPattern.test(u.hostname)) return '';
        return u.href;
    } catch { return ''; }
}

// ─────────────────────────────────────────────────────────────
// PHONE INPUT, country code selector with flags
// ─────────────────────────────────────────────────────────────
const COUNTRIES = [
    { flag: '🇮🇳', name: 'India',        code: '+91',  digits: 10 },
    { flag: '🇦🇪', name: 'UAE',          code: '+971', digits: 9  },
    { flag: '🇸🇦', name: 'Saudi Arabia', code: '+966', digits: 9  },
    { flag: '🇶🇦', name: 'Qatar',        code: '+974', digits: 8  },
    { flag: '🇧🇭', name: 'Bahrain',      code: '+973', digits: 8  },
    { flag: '🇰🇼', name: 'Kuwait',       code: '+965', digits: 8  },
    { flag: '🇴🇲', name: 'Oman',         code: '+968', digits: 8  },
    { flag: '🇸🇬', name: 'Singapore',    code: '+65',  digits: 8  },
    { flag: '🇲🇾', name: 'Malaysia',     code: '+60',  digits: 10 },
    { flag: '🇬🇧', name: 'UK',           code: '+44',  digits: 10 },
    { flag: '🇺🇸', name: 'USA',          code: '+1',   digits: 10 },
    { flag: '🇨🇦', name: 'Canada',       code: '+1',   digits: 10 },
    { flag: '🇦🇺', name: 'Australia',    code: '+61',  digits: 9  },
    { flag: '🇳🇿', name: 'New Zealand',  code: '+64',  digits: 9  },
    { flag: '🇿🇦', name: 'South Africa', code: '+27',  digits: 9  },
    { flag: '🇳🇬', name: 'Nigeria',      code: '+234', digits: 10 },
    { flag: '🇰🇪', name: 'Kenya',        code: '+254', digits: 9  },
    { flag: '🇩🇪', name: 'Germany',      code: '+49',  digits: 11 },
    { flag: '🇫🇷', name: 'France',       code: '+33',  digits: 9  },
    { flag: '🇮🇹', name: 'Italy',        code: '+39',  digits: 10 },
    { flag: '🇳🇱', name: 'Netherlands',  code: '+31',  digits: 9  },
    { flag: '🇵🇰', name: 'Pakistan',     code: '+92',  digits: 10 },
    { flag: '🇧🇩', name: 'Bangladesh',   code: '+880', digits: 10 },
    { flag: '🇱🇰', name: 'Sri Lanka',    code: '+94',  digits: 9  },
    { flag: '🇳🇵', name: 'Nepal',        code: '+977', digits: 10 },
];

// Default country: auto-detect from the browser locale (launch markets:
// AE / US / UK / CA / IN). Falls back to India when the region is unknown.
function detectDefaultCountry() {
    try {
        const region = ((navigator.language || '').split('-')[1] || '').toUpperCase();
        const byRegion = { AE: 'UAE', US: 'USA', GB: 'UK', CA: 'Canada', IN: 'India', AU: 'Australia', SG: 'Singapore', SA: 'Saudi Arabia', QA: 'Qatar', BH: 'Bahrain', KW: 'Kuwait', OM: 'Oman', NZ: 'New Zealand', PK: 'Pakistan', BD: 'Bangladesh', LK: 'Sri Lanka', NP: 'Nepal', MY: 'Malaysia', ZA: 'South Africa', NG: 'Nigeria', KE: 'Kenya', DE: 'Germany', FR: 'France', IT: 'Italy', NL: 'Netherlands' };
        const name = byRegion[region];
        const hit = name && COUNTRIES.find(c => c.name === name);
        if (hit) return hit;
    } catch (e) {}
    return COUNTRIES[0];
}

let selectedCountryLocked = false;   // once the user manually picks, IP won't override
let verifyChannel = 'phone';         // 'phone' (India) | 'email' (rest of world)
function isIndiaMarket() { return selectedCountry && selectedCountry.name === 'India'; }

// Reflect the current selectedCountry into the picker UI (if the phone widget
// is on screen). Safe to call anytime.
function syncCountryPickerUI() {
    const flagEl = document.getElementById('selected-flag');
    const codeEl = document.getElementById('selected-code');
    const hintEl = document.getElementById('phone-hint');
    const numEl  = document.getElementById('phone-number-input');
    if (flagEl) flagEl.textContent = selectedCountry.flag;
    if (codeEl) codeEl.textContent = selectedCountry.code;
    if (hintEl) hintEl.textContent = `${selectedCountry.flag} ${selectedCountry.name} · ${selectedCountry.digits}-digit number required`;
    if (numEl) numEl.placeholder = `${selectedCountry.digits}-digit number`;
}

// navigator.language often has no region ("en"), so it wrongly defaults to
// India. Ask the server for the visitor's country by IP and upgrade the default.
const ISO_TO_COUNTRY = { AE:'UAE', US:'USA', GB:'UK', CA:'Canada', IN:'India', AU:'Australia', SG:'Singapore', SA:'Saudi Arabia', QA:'Qatar', BH:'Bahrain', KW:'Kuwait', OM:'Oman', NZ:'New Zealand', PK:'Pakistan', BD:'Bangladesh', LK:'Sri Lanka', NP:'Nepal', MY:'Malaysia', ZA:'South Africa', NG:'Nigeria', KE:'Kenya', DE:'Germany', FR:'France', IT:'Italy', NL:'Netherlands' };
async function applyIpCountry() {
    try {
        if (selectedCountryLocked) return;
        const r = await fetch(api('/api/geo')).then(x => x.json()).catch(() => null);
        const name = r && r.country && ISO_TO_COUNTRY[r.country];
        const hit = name && COUNTRIES.find(c => c.name === name);
        if (hit && !selectedCountryLocked) { selectedCountry = hit; syncCountryPickerUI(); }
    } catch (e) { /* graceful: keep locale/India default */ }
}
let selectedCountry = detectDefaultCountry();
let phoneInputVisible = false;
let otpEditMode = false;            // true when user tapped "Wrong number? Edit"

// Ask the backend to send a real OTP. Fire-and-forget, the UI proceeds
// regardless; backend degrades to simulated mode if not configured.
async function sendOtpRequest(countryCode, mobile) {
    try { if (typeof track === 'function') track('otp_sent'); } catch (e) {}
    try {
        await fetch(api('/api/otp/send'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ countryCode, mobile, sessionId })
        });
    } catch (e) {
        console.warn('[otp] send request failed:', e);
    }
}

function initPhoneInput() {
    const wrap       = document.getElementById('phone-input-wrap');
    const trigger    = document.getElementById('country-trigger');
    const dropdown   = document.getElementById('country-dropdown');
    const searchEl   = document.getElementById('country-search');
    const listEl     = document.getElementById('country-list');
    const numberEl   = document.getElementById('phone-number-input');
    const submitBtn  = document.getElementById('phone-submit-btn');
    const hintEl     = document.getElementById('phone-hint');

    if (!wrap) return;

    function renderCountryList(filter = '') {
        const filtered = COUNTRIES.filter(c =>
            c.name.toLowerCase().includes(filter.toLowerCase()) ||
            c.code.includes(filter)
        );
        listEl.innerHTML = filtered.map((c, i) => `
            <div class="country-item ${c === selectedCountry ? 'active' : ''}" data-idx="${COUNTRIES.indexOf(c)}">
                <span>${c.flag}</span>
                <span class="ci-name">${c.name}</span>
                <span class="ci-code">${c.code}</span>
            </div>
        `).join('');

        listEl.querySelectorAll('.country-item').forEach(el => {
            el.addEventListener('click', () => {
                selectedCountry = COUNTRIES[parseInt(el.dataset.idx)];
                selectedCountryLocked = true;   // manual pick wins over IP detection
                document.getElementById('selected-flag').textContent = selectedCountry.flag;
                document.getElementById('selected-code').textContent = selectedCountry.code;
                dropdown.classList.remove('open');
                numberEl.focus();
                numberEl.placeholder = `${selectedCountry.digits}-digit number`;
                updateHint();
            });
        });
    }

    function updateHint(error = '') {
        if (error) {
            hintEl.textContent = error;
            hintEl.style.color = '#ef4444';
        } else {
            hintEl.textContent = `${selectedCountry.flag} ${selectedCountry.name} · ${selectedCountry.digits}-digit number required`;
            hintEl.style.color = '';
        }
    }

    // Toggle dropdown
    trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.classList.toggle('open');
        if (dropdown.classList.contains('open')) {
            searchEl.value = '';
            renderCountryList();
            searchEl.focus();
        }
    });

    // Search filter
    searchEl.addEventListener('input', () => renderCountryList(searchEl.value));

    // Close dropdown on outside click
    document.addEventListener('click', () => dropdown.classList.remove('open'));
    dropdown.addEventListener('click', e => e.stopPropagation());

    // Only allow digits, strip a pasted country code, and HARD-CAP at the
    // country's digit count, the field can never hold an invalid length.
    function normalisePhone(val) {
        let raw = String(val).replace(/\D/g, '');
        const cc = selectedCountry.code.replace('+', '');
        // Pasted with country code? e.g. "919876543210" or "+91 98765..."
        if (raw.length > selectedCountry.digits && raw.startsWith(cc)) {
            raw = raw.slice(cc.length);
        }
        // Leading zero (common habit: 09876...)
        if (raw.length > selectedCountry.digits && raw.startsWith('0')) {
            raw = raw.replace(/^0+/, '');
        }
        return raw.slice(0, selectedCountry.digits);
    }
    numberEl.addEventListener('input', () => {
        numberEl.value = normalisePhone(numberEl.value);
        updateHint();
    });
    numberEl.addEventListener('paste', (e) => {
        e.preventDefault();
        const pasted = (e.clipboardData || window.clipboardData).getData('text');
        numberEl.value = normalisePhone(pasted);
        updateHint();
    });

    // Submit
    function submitPhone() {
        const raw    = numberEl.value.trim().replace(/\D/g, '');
        const digits = selectedCountry.digits;

        // India-specific: must start with 6-9
        if (selectedCountry.code === '+91' && !/^[6-9]/.test(raw)) {
            updateHint('Indian numbers must start with 6, 7, 8 or 9');
            numberEl.focus();
            return;
        }

        if (raw.length !== digits) {
            updateHint(`Please enter a valid ${digits}-digit number for ${selectedCountry.name}`);
            numberEl.focus();
            return;
        }

        const cc = selectedCountry.code.replace('+', '');
        const fullNumber = `${selectedCountry.code} ${raw}`;
        window.GC_PHONE = { countryCode: cc, mobile: raw, display: fullNumber };

        if (otpEditMode) {
            // User came back to correct the number, resend + reopen OTP,
            // without re-messaging the AI (it's already in verify state).
            otpEditMode = false;
            sendOtpRequest(cc, raw);
            hidePhoneInput();
            showOtpModal(fullNumber);
            return;
        }

        hidePhoneInput();
        // Deferred verification: offer "Send my code" / "Verify later". The
        // conversation only continues once they pick (number goes to the AI then).
        showChatVerifyChoice(fullNumber);
    }

    submitBtn.addEventListener('click', submitPhone);
    numberEl.addEventListener('keydown', e => { if (e.key === 'Enter') submitPhone(); });

    renderCountryList();
    updateHint();
}

function showPhoneInput() {
    const wrap    = document.getElementById('phone-input-wrap');
    const numEl   = document.getElementById('phone-number-input');
    if (!wrap || phoneInputVisible) return;
    verifyChannel = 'phone';   // ensure OTP modal verifies against the phone endpoint
    phoneInputVisible = true;

    // Hide regular input form
    chatForm.style.display = 'none';

    wrap.classList.remove('hidden');
    wrap.classList.add('phone-visible');
    setTimeout(() => numEl?.focus(), 100);

    // Sync the picker UI with the (possibly locale-detected) default country —
    // the HTML hardcodes 🇮🇳 +91, which is wrong for AE/US/UK/CA visitors.
    const flagEl = document.getElementById('selected-flag');
    const codeEl = document.getElementById('selected-code');
    if (flagEl) flagEl.textContent = selectedCountry.flag;
    if (codeEl) codeEl.textContent = selectedCountry.code;

    // Update hint
    const hintEl = document.getElementById('phone-hint');
    if (hintEl) {
        hintEl.textContent = `${selectedCountry.flag} ${selectedCountry.name} · ${selectedCountry.digits}-digit number required`;
        hintEl.style.color = '';
    }
    if (numEl) numEl.placeholder = `${selectedCountry.digits}-digit number`;
}

function hidePhoneInput() {
    const wrap = document.getElementById('phone-input-wrap');
    if (!wrap) return;
    phoneInputVisible = false;
    wrap.classList.add('hidden');
    wrap.classList.remove('phone-visible');
    chatForm.style.display = '';
    chatInput.disabled = true;
    chatInput.placeholder = 'Message GrowClinic AI...';
}

// ─────────────────────────────────────────────────────────────
// OTP POPUP, 4-box digit entry modal
// ─────────────────────────────────────────────────────────────
let otpVisible = false;
let otpSubmitting = false; // guard against double submission

function initOtpModal() {
    const overlay   = document.getElementById('otp-overlay');
    const boxes     = Array.from(document.querySelectorAll('.otp-box'));
    const submitBtn = document.getElementById('otp-submit-btn');
    const errorEl   = document.getElementById('otp-error');
    const resendBtn = document.getElementById('otp-resend-btn');

    if (!overlay) return;

    boxes.forEach((box, i) => {
        box.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace') {
                if (box.value) {
                    box.value = '';
                } else if (i > 0) {
                    boxes[i - 1].focus();
                    boxes[i - 1].value = '';
                }
                e.preventDefault();
                clearOtpError();
            } else if (e.key === 'ArrowLeft' && i > 0) {
                boxes[i - 1].focus();
            } else if (e.key === 'ArrowRight' && i < boxes.length - 1) {
                boxes[i + 1].focus();
            } else if (e.key === 'Enter') {
                submitOtp();
            }
        });

        box.addEventListener('input', (e) => {
            const val = e.target.value.replace(/\D/g, '');
            box.value = val ? val[0] : '';
            clearOtpError();
            if (val && i < boxes.length - 1) {
                boxes[i + 1].focus();
            }

            const allFilled = boxes.every(b => b.value);
            if (submitBtn) submitBtn.disabled = !allFilled;

            // Auto-submit when all boxes filled
            if (allFilled) {
                setTimeout(submitOtp, 200);
            }
        });

        // Handle paste, fill all boxes at once
        box.addEventListener('paste', (e) => {
            e.preventDefault();
            const pasted = (e.clipboardData || window.clipboardData)
                .getData('text').replace(/\D/g, '').slice(0, boxes.length);
            pasted.split('').forEach((ch, j) => {
                if (boxes[j]) boxes[j].value = ch;
            });

            const allFilled = boxes.every(b => b.value);
            if (submitBtn) submitBtn.disabled = !allFilled;

            const next = Math.min(pasted.length, boxes.length - 1);
            boxes[next].focus();
            if (pasted.length === boxes.length) setTimeout(submitOtp, 200);
        });

        // Allow clicking any box directly
        box.addEventListener('click', () => {
            box.select();
            clearOtpError();
        });
    });

    function clearOtpError() {
        if (errorEl) { errorEl.textContent = ''; }
    }

    async function submitOtp() {
        if (otpSubmitting) return; // prevent double-fire from Enter + auto-submit
        const code = boxes.map(b => b.value).join('');
        if (code.length < boxes.length) {
            if (errorEl) errorEl.textContent = `Please enter all ${boxes.length} digits`;
            boxes.find(b => !b.value)?.focus();
            return;
        }
        otpSubmitting = true;
        boxes.forEach(b => b.classList.add('otp-verify'));

        // Verify against the backend (real code when AuthKey is configured,
        // any 4 digits when it isn't). Network errors don't hard-block.
        const phone = window.GC_PHONE || {};
        let ok = true, errMsg = 'Incorrect code. Try again.';
        let existingReport = null;
        try {
            const emailMode = verifyChannel === 'email' && window.GC_EMAIL;
            const res = await fetch(api(emailMode ? '/api/otp/email/verify' : '/api/otp/verify'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(emailMode
                    ? { email: window.GC_EMAIL, code, sessionId }
                    : { countryCode: phone.countryCode, mobile: phone.mobile, code, sessionId })
            });
            const data = await res.json();
            ok = !!data.ok;
            if (data.error) errMsg = data.error;
            existingReport = data.existingReport || null;
        } catch (e) {
            console.warn('[otp] verify network error, allowing through:', e);
            ok = true;
        }

        if (!ok) {
            otpSubmitting = false;
            boxes.forEach(b => { b.classList.remove('otp-verify'); b.value = ''; });
            if (errorEl) errorEl.textContent = errMsg;
            const submitBtn2 = document.getElementById('otp-submit-btn');
            if (submitBtn2) submitBtn2.disabled = true;
            boxes[0].focus();
            return;
        }

        try { if (typeof track === 'function') track('otp_verified'); } catch (e) {}

        // Duplicate client: this number already has a completed audit. Recognise
        // them and serve the existing report instead of running it all again.
        if (existingReport && existingReport.reportUrl) {
            closeOtpModal();
            const who = existingReport.name ? existingReport.name : 'there';
            const clinicBit = existingReport.clinic ? ` for ${existingReport.clinic}` : '';
            appendMessage(`Welcome back, ${who}! 👋 You've already completed an audit${clinicBit} on this number, so here's your existing report, no need to start over 👇`, 'ai');
            reportCTAShown = true;
            try { if (typeof track === 'function') track('returning_client'); } catch (e) {}
            setTimeout(() => showReportCTA(existingReport.reportUrl), 600);
            chatInput.disabled = true;
            sendBtn.disabled = true;
            chatInput.placeholder = 'You already have an audit, see the report above';
            return;
        }

        setTimeout(() => {
            closeOtpModal();
            sendSimulatedMessage(code);
        }, 400);
    }

    submitBtn.addEventListener('click', submitOtp);

    resendBtn.addEventListener('click', () => {
        boxes.forEach(b => { b.value = ''; b.classList.remove('otp-verify'); });
        clearOtpError();
        boxes[0].focus();
        resendBtn.textContent = 'Sent ✅';
        resendBtn.disabled = true;
        setTimeout(() => {
            resendBtn.textContent = 'Resend OTP';
            resendBtn.disabled = false;
        }, 5000);
        // Re-send the real OTP via backend (no chat message needed).
        if (verifyChannel === 'email' && window.GC_EMAIL) {
            sendEmailOtpRequest(window.GC_EMAIL);
        } else {
            const phone = window.GC_PHONE || {};
            if (phone.mobile) sendOtpRequest(phone.countryCode, phone.mobile);
        }
    });

    // "Wrong number? Edit it", close OTP, reopen phone input pre-filled.
    const editBtn = document.getElementById('otp-edit-btn');
    if (editBtn) editBtn.addEventListener('click', () => {
        otpEditMode = true;
        otpSubmitting = false;
        closeOtpModal();
        if (verifyChannel === 'email') {
            showEmailInput();
            const em = document.getElementById('email-input');
            if (em && window.GC_EMAIL) { em.value = window.GC_EMAIL; setTimeout(() => em.focus(), 120); }
            return;
        }
        showPhoneInput();
        const numEl = document.getElementById('phone-number-input');
        if (numEl && window.GC_PHONE) {
            numEl.value = window.GC_PHONE.mobile || '';
            setTimeout(() => numEl.focus(), 120);
        }
    });
}

function showOtpModal(phoneNumber = '') {
    const overlay  = document.getElementById('otp-overlay');
    const subtitle = document.getElementById('otp-subtitle');
    const boxes    = Array.from(document.querySelectorAll('.otp-box'));
    const errorEl  = document.getElementById('otp-error');

    if (!overlay || otpVisible) return;
    otpVisible = true;
    otpSubmitting = false; // ensure clean state

    boxes.forEach(b => { b.value = ''; b.classList.remove('otp-verify'); });
    if (errorEl) errorEl.textContent = '';
    const submitBtn = document.getElementById('otp-submit-btn');
    if (submitBtn) submitBtn.disabled = true;

    if (subtitle && phoneNumber) {
        subtitle.textContent = `We've sent a 6-digit OTP to ${phoneNumber}`;
    }

    overlay.classList.remove('hidden');
    overlay.classList.add('otp-open');
    
    document.activeElement?.blur();
    document.querySelector('.chat-container')?.setAttribute('inert', '');
    setTimeout(() => boxes[0]?.focus(), 300);
}

function closeOtpModal() {
    const overlay = document.getElementById('otp-overlay');
    if (!overlay) return;
    otpVisible = false;
    otpSubmitting = false; // reset guard for next time
    overlay.classList.add('hidden');
    overlay.classList.remove('otp-open');
    document.querySelector('.chat-container')?.removeAttribute('inert');
}

// The session id is the only key to a visitor's report URL (/api/report/<id>),
// so it must be unguessable: 80 bits from the CSPRNG, 20 hex chars (still matches
// the server's /^[a-z0-9]{6,32}$/ check).
const sessionId = Array.from(crypto.getRandomValues(new Uint8Array(10)), b => b.toString(16).padStart(2, '0')).join('');
try { window.GC_SESSION_ID = sessionId; } catch(e) {} // shared with the lead-magnet popup

// 6-step audit flow
const MAX_STAGES = 4;
let currentStage = 0;
let userMsgCount  = 0;
let userRole      = '';   // 'doctor' | 'owner' | 'hospital' | 'hod' | 'manager' | 'admin'
let reportCTAShown = false; // prevent duplicate CTA cards
let collectedClinicName = '';  // track clinic name for GMB lookup
let collectedCity = '';        // track city for GMB lookup
let collectedPincode = '';     // set when the user answered the city step with a pincode
let collectedWebsite = '';     // track website for GMB lookup (boosts match accuracy)
let gmbLookupDone = false;    // prevent duplicate GMB lookups
let gmbConfirmed = false;     // user has interacted with GMB card
let pendingAfterGMB = null;   // queued AI message to show only after GMB resolves
let websiteInputVisible = false; // track website input state

const ROLE_META = {
    doctor:   { label: 'Doctor',           emoji: '🩺', badge: 'Dr.' },
    owner:    { label: 'Clinic Owner',     emoji: '🏥', badge: 'Owner' },
    hospital: { label: 'Hospital Owner',   emoji: '🏨', badge: 'Hospital' },
    hod:      { label: 'HOD',              emoji: '📋', badge: 'HOD' },
    manager:  { label: 'Practice Manager', emoji: '🗂️', badge: 'Manager' },
    admin:    { label: 'Administrator',    emoji: '💼', badge: 'Admin' },
};

// The header badge shows the FACILITY TYPE (not the person's role), e.g. when a
// user says "Multispecialty Hospital" the chip reads "Hospital", not "Owner".
const TYPE_BADGES = [
    { re: /hospital/,                              emoji: '🏥', label: 'Hospital' },
    { re: /dental|dentist|teeth|tooth|smile/,      emoji: '🦷', label: 'Dental' },
    { re: /skin|derma|aesthetic|cosmetic|glow|medspa|beauty/, emoji: '💆', label: 'Aesthetics' },
    { re: /hair|trich/,                            emoji: '💇', label: 'Hair' },
    { re: /ivf|fertil/,                            emoji: '🍼', label: 'IVF & Fertility' },
    { re: /eye|vision|optic|ophthal/,              emoji: '👁️', label: 'Eye Care' },
    { re: /ortho|bone|spine|joint/,                emoji: '🦴', label: 'Orthopaedics' },
    { re: /cardio|heart/,                          emoji: '❤️', label: 'Cardiology' },
    { re: /child|paediat|pediatr|kids/,            emoji: '👶', label: 'Paediatrics' },
    { re: /physio/,                                emoji: '💪', label: 'Physiotherapy' },
    { re: /homeo|homoeo/,                          emoji: '🌿', label: 'Homeopathy' },
    { re: /ayur/,                                  emoji: '🌿', label: 'Ayurveda' },
    { re: /gyn|gynae|obstet|matern/,               emoji: '🤰', label: 'Gynaecology' },
    { re: /clinic/,                                emoji: '🏥', label: 'Clinic' }
];
let facilityTypeSet = false;

// Smart skip: read URL params so pre-filled data can skip basics
const urlParams    = new URLSearchParams(window.location.search);
const PREFILL_NAME      = urlParams.get('name')   || '';
const PREFILL_CLINIC    = urlParams.get('clinic') || '';
const PREFILL_CITY      = urlParams.get('city')   || '';
const HAS_PREFILL       = !!(PREFILL_NAME && PREFILL_CLINIC);
// SECURE handoff: the website form POSTs the PII to /api/intake (signed,
// server-to-server) and redirects here with only an opaque one-time token
// (?t=...). No name/phone/PII ever rides in the URL. Plain ?name=&phone=
// params are still read as a fallback for local testing only.
const HANDOFF_TOKEN     = urlParams.get('t') || urlParams.get('token') || '';

// Lead source label for the admin Leads table: a handoff token (or utm_source=
// growclinic-site) means the lead came from the GrowClinic website bridge;
// otherwise use the utm_source, falling back to "direct".
const LEAD_SOURCE = (HANDOFF_TOKEN || (urlParams.get('utm_source') || '').toLowerCase() === 'growclinic-site')
    ? 'growclinic-site'
    : ((urlParams.get('utm_source') || '').trim() || 'direct');

let intake = {
    name:      PREFILL_NAME,
    clinic:    PREFILL_CLINIC,
    specialty: urlParams.get('specialty') || urlParams.get('type') || '',
    city:      PREFILL_CITY,
    phone:     urlParams.get('phone') || urlParams.get('whatsapp') || '',
    website:   urlParams.get('website') || ''
};
function hasFullIntake() {
    return !!(intake.name && intake.clinic && intake.city && intake.phone);
}
let awaitingIntakePincode = false;

// Pull the prefilled data via the one-time token, scrub the URL, then start.
async function loadHandoffThenStart() {
    let d = null;
    try {
        d = await fetch(api('/api/handoff/' + encodeURIComponent(HANDOFF_TOKEN)),
            { headers: { 'Accept': 'application/json' } }).then(r => r.json());
    } catch (e) { console.warn('[intake] handoff fetch failed', e); }
    // Remove the token from the address bar no matter what (single-use anyway).
    try { history.replaceState(null, '', location.pathname); } catch (e) {}
    if (d && d.found) {
        intake = {
            name: d.name || '', clinic: d.clinic || '', specialty: d.specialty || '',
            city: d.city || '', phone: d.phone || '', website: d.website || ''
        };
        if (hasFullIntake()) { startIntakeHandoff(); return; }
    }
    console.warn('[intake] handoff token invalid or expired — falling back to normal chat');
}

// Normalise a WhatsApp number to { countryCode, mobile } — international-aware.
// Handles "+971 50 123 4567", "+1 (416) 555-0123", "07911 123456" (UK local),
// "9876543210" (bare local). Uses the COUNTRIES list to split country codes and
// falls back to the locale-detected default country for bare local numbers.
function parsePrefillPhone(raw) {
    const original = String(raw || '').trim();
    if (!original) return null;
    const hadPlus = original.startsWith('+');
    let digits = original.replace(/[^\d]/g, '');
    if (!digits) return null;

    // Country codes sorted longest-first so +971 wins over +9…
    const ccList = COUNTRIES
        .map(c => ({ cc: c.code.replace('+', ''), digits: c.digits }))
        .sort((a, b) => b.cc.length - a.cc.length);

    // Explicit "+CC…" or a long string that starts with a known country code
    if (hadPlus || digits.length > 11) {
        for (const { cc, digits: len } of ccList) {
            if (digits.startsWith(cc)) {
                let rest = digits.slice(cc.length).replace(/^0+/, '');
                if (rest.length >= 6 && rest.length <= 12) {
                    return { countryCode: '+' + cc, mobile: rest };
                }
            }
        }
    }

    // Bare local number → default (locale-detected) country
    const dflt = (typeof selectedCountry !== 'undefined' && selectedCountry) || { code: '+91', digits: 10 };
    let local = digits.replace(/^0+/, '');          // strip trunk zeros (UK "07911…")
    if (local.length >= 6 && local.length <= 12) {
        return { countryCode: dflt.code, mobile: local };
    }
    return null;
}

// "Very nice table" of the attributes the doctor just submitted on the form.
function renderIntakeSummary() {
    const rows = [
        ['👤 Name', intake.name],
        ['🏥 Clinic', intake.clinic],
        ['🩺 Specialty', intake.specialty || '—'],
        ['📍 City', intake.city],
        ['📱 WhatsApp', intake.phone],
        ['🌐 Website', intake.website || 'Not provided']
    ];
    const body = rows.map(([k, v]) => `
        <div style="display:flex;justify-content:space-between;gap:12px;padding:9px 14px;border-bottom:1px solid rgba(255,255,255,0.06)">
            <span style="color:#8b94a7;font-size:13px;white-space:nowrap">${k}</span>
            <span style="color:#f2f5fa;font-size:13px;font-weight:600;text-align:right;word-break:break-word">${escHtml(String(v))}</span>
        </div>`).join('');
    const row = document.createElement('div');
    row.className = 'message-row ai-row';
    row.innerHTML = `
        <div class="avatar ai-avatar"><img src="${api('/img/ai-avatar.png')}" alt="AI" style="width:100%;height:100%;border-radius:50%;object-fit:cover"></div>
        <div class="message-content">
            <div class="message-text" style="margin-bottom:8px">Got it — here's what you shared. Pulling your live data now 👇</div>
            <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.09);border-radius:14px;overflow:hidden;max-width:380px">
                <div style="padding:10px 14px;font-size:11px;font-weight:700;letter-spacing:.06em;color:#22c55e;border-bottom:1px solid rgba(255,255,255,0.09)">YOUR SUBMITTED DETAILS</div>
                ${body}
            </div>
        </div>`;
    chatMessagesArea.appendChild(row);
    scrollToBottom();
}

// One-tap OTP card (number already supplied on the form).
// The audit conversation is HELD until the user makes this choice. The first
// growth question only fires once they pick "Send my code" or "Verify later".
let _intakeAuditStarted = false;
function proceedIntakeAudit() {
    if (_intakeAuditStarted) return;
    _intakeAuditStarted = true;
    const primer = `INIT_CONVERSATION. Lead arrived from the website audit form. Known details — name: ${intake.name}; clinic: ${intake.clinic}; specialty: ${intake.specialty || 'unspecified'}; city: ${intake.city}; WhatsApp: ${intake.phone}; website: ${intake.website || 'none provided'}. ALL basic details are already known — do NOT ask again for name, clinic, city, specialty, phone, or website. Acknowledge warmly in one short message, then a [DELAY: 600], then ask only the first growth question as a separate message.`;
    const typingEl = createTypingIndicator();
    chatMessagesArea.appendChild(typingEl);
    scrollToBottom();
    fetchChatResponse(primer, typingEl);
}

function showSendCodeCTA() {
    const row = document.createElement('div');
    row.className = 'message-row ai-row';
    row.innerHTML = `
        <div class="avatar ai-avatar"><img src="${api('/img/ai-avatar.png')}" alt="AI" style="width:100%;height:100%;border-radius:50%;object-fit:cover"></div>
        <div class="message-content">
            <div class="message-text" style="margin-bottom:8px">To unlock your full report we'll verify your WhatsApp <b>${escHtml(intake.phone)}</b>. Verify now, or continue and verify at the end.</div>
            <div style="display:flex;gap:.5rem;flex-wrap:wrap">
                <button id="intake-send-otp" class="gmb-btn gmb-btn-yes" style="width:auto">📱 Send my code</button>
                <button id="intake-verify-later" class="gmb-btn" style="width:auto;background:rgba(255,255,255,0.06);color:var(--gc-text-secondary);border:1px solid rgba(255,255,255,0.16)">Verify later</button>
            </div>
        </div>`;
    chatMessagesArea.appendChild(row);
    scrollToBottom();
    const sendBtn = row.querySelector('#intake-send-otp');
    const laterBtn = row.querySelector('#intake-verify-later');
    const lockBoth = () => { sendBtn.disabled = true; laterBtn.disabled = true; laterBtn.style.opacity = '0.6'; };
    sendBtn.addEventListener('click', () => {
        const ph = window.GC_PHONE;
        if (!ph) { appendMessage('That number looks off — please type your WhatsApp number with the country code (e.g. +971…, +1…, +44…).', 'ai'); return; }
        lockBoth();
        sendBtn.textContent = 'Code sent ✓';
        sendOtpRequest(ph.countryCode, ph.mobile);
        showOtpModal(ph.countryCode + ' ' + ph.mobile);
        try { track('otp_sent', { via: 'intake' }); } catch (e) {}
        proceedIntakeAudit();   // release the held conversation
    });
    laterBtn.addEventListener('click', () => {
        lockBoth();
        laterBtn.textContent = 'Continuing…';
        try { track('verify_later', { via: 'intake' }); } catch (e) {}
        proceedIntakeAudit();   // release the held conversation
    });
}

// Chat-only arrivals: after the user types their WhatsApp number, offer the
// same "Send my code" / "Verify later" choice. The conversation HOLDS until
// they pick — only then is the number sent to the AI to continue to the gaps.
function showChatVerifyChoice(fullNumber) {
    const proceed = () => sendSimulatedMessage(fullNumber);

    // The AI already asked "…your number?" just above. Now that we HAVE the
    // number, that prompt is redundant — drop it so verification is one clear
    // message, not two overlapping ones.
    const aiRows = chatMessagesArea.querySelectorAll('.ai-row');
    const lastAI = aiRows[aiRows.length - 1];
    if (lastAI) {
        const t = (lastAI.textContent || '').toLowerCase();
        if (t.includes('your number') || t.includes('your whatsapp') ||
            t.includes('whatsapp number') || (t.includes('whatsapp') && t.includes('report'))) {
            lastAI.remove();
        }
    }

    const row = document.createElement('div');
    row.className = 'message-row ai-row';
    row.innerHTML = `
        <div class="avatar ai-avatar"><img src="${api('/img/ai-avatar.png')}" alt="AI" style="width:100%;height:100%;border-radius:50%;object-fit:cover"></div>
        <div class="message-content">
            <div class="message-text" style="margin-bottom:8px">Your full report is ready — I'll send it to <b>${escHtml(fullNumber)}</b> on WhatsApp. Verify it's your number now, or continue and verify at the end.</div>
            <div style="display:flex;gap:.5rem;flex-wrap:wrap">
                <button id="chat-send-otp" class="gmb-btn gmb-btn-yes" style="width:auto">📱 Send my code</button>
                <button id="chat-verify-later" class="gmb-btn" style="width:auto;background:rgba(255,255,255,0.06);color:var(--gc-text-secondary);border:1px solid rgba(255,255,255,0.16)">Verify later</button>
            </div>
        </div>`;
    chatMessagesArea.appendChild(row);
    scrollToBottom();
    const sendBtn = row.querySelector('#chat-send-otp');
    const laterBtn = row.querySelector('#chat-verify-later');
    let chosen = false;
    const lock = () => { sendBtn.disabled = true; laterBtn.disabled = true; laterBtn.style.opacity = '0.6'; };
    sendBtn.addEventListener('click', () => {
        if (chosen) return; chosen = true; lock();
        sendBtn.textContent = 'Code sent ✓';
        const ph = window.GC_PHONE;
        if (ph) { sendOtpRequest(ph.countryCode, ph.mobile); showOtpModal(ph.display || fullNumber); }
        try { track('otp_sent', { via: 'chat' }); } catch (e) {}
        proceed();
    });
    laterBtn.addEventListener('click', () => {
        if (chosen) return; chosen = true; lock();
        laterBtn.textContent = 'Continuing…';
        try { track('verify_later', { via: 'chat' }); } catch (e) {}
        proceed();
    });
}

// ── EMAIL VERIFICATION (non-India) ──────────────────────────────
// Ask the backend to email a 6-digit code. Fire-and-forget.
async function sendEmailOtpRequest(email) {
    try { if (typeof track === 'function') track('otp_sent', { via: 'email' }); } catch (e) {}
    try {
        await fetch(api('/api/otp/email/send'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, sessionId })
        });
    } catch (e) { console.warn('[otp-email] send request failed:', e); }
}

function hideEmailInput() {
    const wrap = document.getElementById('email-input-wrap');
    if (wrap) { wrap.classList.add('hidden'); wrap.classList.remove('phone-visible'); }
    phoneInputVisible = false;
}

function showEmailInput() {
    const wrap  = document.getElementById('email-input-wrap');
    const elIn  = document.getElementById('email-input');
    if (!wrap) { showPhoneInput(); return; }   // fallback if markup missing
    if (phoneInputVisible) return;
    verifyChannel = 'email';
    phoneInputVisible = true;
    if (chatForm) chatForm.style.display = 'none';
    hidePhoneInput2();                          // ensure phone widget hidden
    wrap.classList.remove('hidden');
    wrap.classList.add('phone-visible');
    setTimeout(() => elIn?.focus(), 100);

    if (!wrap.dataset.wired) {
        wrap.dataset.wired = '1';
        const submit = () => {
            const email = (elIn.value || '').trim().toLowerCase();
            if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
                const hint = document.getElementById('email-hint');
                if (hint) { hint.textContent = 'Please enter a valid email address'; hint.style.color = '#f59e0b'; }
                elIn.focus();
                return;
            }
            window.GC_EMAIL = email;
            verifyChannel = 'email';
            hideEmailInput();
            // Capture the email now so the report link is emailed even if they
            // pick "Verify later" or abandon the code.
            try {
                fetch(api('/api/otp/email/send'), {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, sessionId, captureOnly: true })
                });
            } catch (e) {}
            showChatVerifyChoiceEmail(email);
        };
        document.getElementById('email-submit-btn')?.addEventListener('click', submit);
        elIn.addEventListener('keydown', e => { if (e.key === 'Enter') submit(); });
    }
}
// small helper: hide the phone widget without touching chatForm state twice
function hidePhoneInput2() {
    const wrap = document.getElementById('phone-input-wrap');
    if (wrap) wrap.classList.add('hidden');
}

// Email equivalent of showChatVerifyChoice: after the user gives their email,
// offer "Send my code" / "Verify later". Either way the conversation continues;
// the report link is emailed regardless once ready.
function showChatVerifyChoiceEmail(email) {
    const proceed = () => sendSimulatedMessage(email);
    const aiRows = chatMessagesArea.querySelectorAll('.ai-row');
    const lastAI = aiRows[aiRows.length - 1];
    if (lastAI) {
        const t = (lastAI.textContent || '').toLowerCase();
        if (t.includes('your contact') || t.includes('your email') || t.includes('send your full report') || (t.includes('report') && t.includes('send'))) {
            lastAI.remove();
        }
    }
    const row = document.createElement('div');
    row.className = 'message-row ai-row';
    row.innerHTML = `
        <div class="avatar ai-avatar"><img src="${api('/img/ai-avatar.png')}" alt="AI" style="width:100%;height:100%;border-radius:50%;object-fit:cover"></div>
        <div class="message-content">
            <div class="message-text" style="margin-bottom:8px">Your full report is ready — I'll email it to <b>${escHtml(email)}</b>. Verify it's yours now, or continue and I'll send it at the end.</div>
            <div style="display:flex;gap:.5rem;flex-wrap:wrap">
                <button id="chat-send-otp-email" class="gmb-btn gmb-btn-yes" style="width:auto">✉️ Send my code</button>
                <button id="chat-verify-later-email" class="gmb-btn" style="width:auto;background:rgba(255,255,255,0.06);color:var(--gc-text-secondary);border:1px solid rgba(255,255,255,0.16)">Verify later</button>
            </div>
        </div>`;
    chatMessagesArea.appendChild(row);
    scrollToBottom();
    const sendBtn = row.querySelector('#chat-send-otp-email');
    const laterBtn = row.querySelector('#chat-verify-later-email');
    let chosen = false;
    const lock = () => { sendBtn.disabled = true; laterBtn.disabled = true; laterBtn.style.opacity = '0.6'; };
    sendBtn.addEventListener('click', () => {
        if (chosen) return; chosen = true; lock();
        sendBtn.textContent = 'Code sent ✓';
        verifyChannel = 'email';
        sendEmailOtpRequest(email);
        showOtpModal(email);
        proceed();
    });
    laterBtn.addEventListener('click', () => {
        if (chosen) return; chosen = true; lock();
        laterBtn.textContent = 'Continuing…';
        try { track('verify_later', { via: 'email' }); } catch (e) {}
        proceed();
    });
}

// Orchestrates the form → tool handoff: table, parallel GBP + PageSpeed, one-tap OTP.
async function startIntakeHandoff() {
    if (!chatMessagesArea) return;
    exitHeroMode();
    window._gcInitialised = true;   // suppress the normal first-message primer
    window._gcStarted = true;
    advanceStage(2);

    renderIntakeSummary();

    // seed tracking vars used by the GBP/website/report logic
    collectedClinicName = intake.clinic;
    collectedCity       = intake.city;
    collectedWebsite    = intake.website || '';
    window.GC_PHONE     = parsePrefillPhone(intake.phone);
    try { track('audit_start', { via: 'intake_form' }); } catch (e) {}

    // PARALLEL #1 — warm up PageSpeed if a website was provided
    if (intake.website) {
        fetch(api('/api/pagespeed-warm'), {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId, url: intake.website })
        }).catch(() => {});
    }

    // PARALLEL — Google Business Profile search (shows the confirm card); the
    // audit conversation itself is HELD until the verify choice below.
    triggerGMBLookup(intake.clinic, intake.city, intake.website || null).then(found => {
        if (!found) {
            awaitingIntakePincode = true;
            appendMessage("I couldn't find your clinic's Google profile automatically. Reply with your postal code (pincode / ZIP / postcode) and I'll try again 📍", 'ai');
        }
    });

    // Verify choice — the conversation pauses here. The first growth question
    // only fires once the user taps "Send my code" or "Verify later".
    showSendCodeCTA();
}

// ─────────────────────────────────────────────────────────────
// ANALYTICS, attribution capture + event helper
// Channel is derived from UTM / gclid / fbclid / referrer and persisted, so
// every tracked event (and later the lead) carries where it came from.
// ─────────────────────────────────────────────────────────────
function gcDeriveChannel(p) {
    const src = (p.get('utm_source') || '').toLowerCase().trim();
    const med = (p.get('utm_medium')  || '').toLowerCase().trim();

    // 1) Paid clicks — ad-platform click IDs are unambiguous.
    if (p.get('gclid') || p.get('gbraid') || p.get('wbraid')) return 'google_ads';
    if (p.get('fbclid'))    return 'meta_ads';
    if (p.get('msclkid'))   return 'bing_ads';
    if (p.get('ttclid'))    return 'tiktok_ads';
    if (p.get('li_fat_id') || p.get('li_sugr')) return 'linkedin_ads';

    // 2) Explicit UTM source — the most reliable signal (you control your links).
    const SRC_MAP = {
        linkedin:'linkedin', li:'linkedin', 'linkedin.com':'linkedin', lnkd:'linkedin',
        instagram:'instagram', ig:'instagram', 'instagram.com':'instagram', insta:'instagram',
        facebook:'facebook', fb:'facebook', 'facebook.com':'facebook', meta:'facebook',
        pinterest:'pinterest', pin:'pinterest', 'pinterest.com':'pinterest', pinit:'pinterest',
        reddit:'reddit', 'reddit.com':'reddit',
        twitter:'twitter', x:'twitter', 'x.com':'twitter', 'twitter.com':'twitter',
        youtube:'youtube', yt:'youtube', 'youtube.com':'youtube',
        whatsapp:'whatsapp', wa:'whatsapp',
        telegram:'telegram', tg:'telegram',
        chatgpt:'ai', openai:'ai', 'chatgpt.com':'ai', perplexity:'ai', 'perplexity.ai':'ai',
        gemini:'ai', bard:'ai', claude:'ai', copilot:'ai', bingchat:'ai', ai:'ai', llm:'ai',
        google:'google_organic', bing:'search_organic',
        email:'email', newsletter:'email', mailer:'email',
        'growclinic-site':'growclinic-site', website:'growclinic-site'
    };
    if (src && SRC_MAP[src]) {
        const base = SRC_MAP[src];
        // A social source with a paid medium = that platform's ads.
        if (/cpc|ppc|paid|paidsocial|paid_social|^ads?$/.test(med) &&
            ['linkedin','meta','facebook','instagram','pinterest','reddit','twitter','tiktok'].includes(base)) {
            return (base === 'facebook' || base === 'instagram') ? 'meta_ads' : base + '_ads';
        }
        return base;
    }
    if (src) return src;   // any explicit source we don't specially map

    // 3) Referrer-based detection (when there's no UTM tag).
    let host = '';
    try { host = new URL(document.referrer).hostname.replace(/^www\./, '').toLowerCase(); } catch (e) {}
    if (!host) return 'direct';
    // Exact host or sub-domain match only (loose includes would let "t.co"
    // match "chatgpt.com", etc.).
    const has = (...d) => d.some(x => host === x || host.endsWith('.' + x));
    if (has('lnkd.in', 'linkedin.com'))                                   return 'linkedin';
    if (has('instagram.com', 'l.instagram.com'))                          return 'instagram';
    if (has('facebook.com', 'fb.com', 'fb.me'))                           return 'facebook';
    if (has('pinterest.com', 'pin.it') || host.startsWith('pinterest.'))  return 'pinterest';
    if (has('reddit.com', 'redd.it'))                                     return 'reddit';
    if (has('t.co', 'twitter.com', 'x.com'))                              return 'twitter';
    if (has('youtube.com', 'youtu.be'))                                   return 'youtube';
    if (has('whatsapp.com', 'wa.me'))                                     return 'whatsapp';
    if (has('t.me') || host.includes('telegram'))                         return 'telegram';
    // AI assistants / answer engines (people clicking citations & links).
    if (has('chatgpt.com', 'chat.openai.com', 'openai.com', 'perplexity.ai',
            'gemini.google.com', 'bard.google.com', 'claude.ai', 'copilot.microsoft.com',
            'you.com', 'poe.com', 'phind.com') || host.includes('anthropic')) return 'ai';
    if (has('google.') || host.startsWith('google.'))                     return 'google_organic';
    if (has('bing.com', 'duckduckgo.com', 'yahoo.com', 'ecosia.org', 'brave.com')) return 'search_organic';
    return 'referral';
}
function gcCaptureAttribution() {
    try {
        const saved = JSON.parse(localStorage.getItem('gc_attr') || 'null');
        if (saved && saved.landing) return saved;
        const p = urlParams;
        const attr = {
            utm_source: p.get('utm_source') || '', utm_medium: p.get('utm_medium') || '',
            utm_campaign: p.get('utm_campaign') || '', utm_content: p.get('utm_content') || '',
            utm_term: p.get('utm_term') || '', gclid: p.get('gclid') || '', fbclid: p.get('fbclid') || '',
            referrer: (document.referrer || '').slice(0, 300),
            landing: (location.pathname + location.search).slice(0, 300),
            channel: gcDeriveChannel(p)
        };
        localStorage.setItem('gc_attr', JSON.stringify(attr));
        return attr;
    } catch (e) { return { channel: 'direct' }; }
}
window.GC_ATTR = gcCaptureAttribution();
// Raw click IDs + landing context, captured fresh on THIS page load (GC_ATTR is
// cached in localStorage, so click IDs there can be stale). Sent with /api/visit
// and /api/chat; the server only writes them when present (first-touch wins).
window.GC_ATTR2 = (function () {
    try {
        const p = new URLSearchParams(location.search);
        return {
            gclid: (p.get('gclid') || '').slice(0, 128),
            fbclid: (p.get('fbclid') || '').slice(0, 128),
            landingPage: String(location.href).slice(0, 500),
            referrer: String(document.referrer || '').slice(0, 500)
        };
    } catch (e) { return {}; }
})();
function track(ev, params) {
    try { if (window.gcTrack) window.gcTrack(ev, Object.assign({ channel: window.GC_ATTR && window.GC_ATTR.channel }, params || {})); }
    catch (e) {}
}

// Configure marked.js
if (typeof marked !== 'undefined') {
    marked.setOptions({ breaks: true, gfm: true });
}

// ─────────────────────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────────────────────
function initChat() {
    injectProgressBar();
    initPhoneInput();
    initOtpModal();
    applyIpCountry();   // upgrade default country from IP (before the verify step)

    // Marketing funnel: record this page visit + its attribution (top of funnel).
    try {
        fetch(api('/api/visit'), {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sessionId, source: LEAD_SOURCE,
                channel:  (window.GC_ATTR && window.GC_ATTR.channel) || 'direct',
                campaign: (window.GC_ATTR && window.GC_ATTR.utm_campaign) || '',
                gclid:       (window.GC_ATTR2 && window.GC_ATTR2.gclid) || '',
                fbclid:      (window.GC_ATTR2 && window.GC_ATTR2.fbclid) || '',
                landingPage: (window.GC_ATTR2 && window.GC_ATTR2.landingPage) || '',
                referrer:    (window.GC_ATTR2 && window.GC_ATTR2.referrer) || ''
            })
        }).catch(() => {});
    } catch (e) {}

    chatForm.addEventListener('submit', handleSendMessage);

    resetBtn.addEventListener('click', () => {
        if (confirm('Start a new audit conversation?')) location.reload();
    });
    if (resetBtnFooter) {
        resetBtnFooter.addEventListener('click', () => {
            if (confirm('Start a new audit conversation?')) location.reload();
        });
    }

    // Hero state, input is enabled and centered, no AI greeting yet.
    chatInput.disabled = false;
    sendBtn.disabled = false;
    chatInput.placeholder = "Tell us about your clinic, name, city, what you treat…";
    setTimeout(() => chatInput.focus(), 200);

    // Wire hero suggestion chips, pre-fill input + auto-submit
    document.querySelectorAll('.hero-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            const text = chip.dataset.text || chip.textContent.trim();
            chatInput.value = text;
            chatInput.focus();
            // Trigger submit
            chatForm.dispatchEvent(new Event('submit', { cancelable: true }));
        });
    });

    // Background health check, show error inline if server is down,
    // but never block the hero from rendering.
    fetch(api('/api/health')).then(r => r.json()).then(health => {
        if (!health || !(health.hasGemini || health.hasOpenAIKey)) {
            console.warn('[init] No AI key configured, chat will fail when user sends.');
        }
    }).catch(() => {
        console.warn('[init] Server not reachable.');
    });

    // Arrived from the website audit form → auto-start the handoff.
    // Preferred: a secure one-time token (no PII in URL). Fallback: plain params.
    if (HANDOFF_TOKEN) {
        chatInput.placeholder = "Type your answer…";
        setTimeout(loadHandoffThenStart, 300);
    } else if (hasFullIntake()) {
        chatInput.placeholder = "Type your answer…";
        setTimeout(startIntakeHandoff, 400);
    }
}

// ─────────────────────────────────────────────────────────────
// PROGRESS BAR (Vertical Sidebar + Sticky Top Bar)
// ─────────────────────────────────────────────────────────────
const STAGE_LABELS = [
    { label: 'Clinic Details',  emoji: '🏥' },
    { label: 'Verification',    emoji: '✅' },
    { label: 'Audit Analysis',  emoji: '🔍' },
    { label: 'Report Ready',    emoji: '📄' },
];

function injectProgressBar() {
    const container = document.getElementById('sidebar-progress-container');
    if (container) {
        container.innerHTML = `
            <div class="progress-header">
                <span class="progress-step-text">Step 1 of ${MAX_STAGES}</span>
                <span class="progress-microcopy">Live Analysis 🟢</span>
            </div>
            <div class="vertical-track" style="--fill-pct: 5%">
                ${STAGE_LABELS.map((s, i) => `
                    <div class="progress-step-item ${i === 0 ? 'active' : ''}" id="step-item-${i}">
                        <span style="margin-right:6px;font-size:.85em">${s.emoji}</span>${s.label}
                    </div>
                `).join('')}
            </div>
        `;
    }

    // Mobile bottom strip: icon-only
    const mobileBar = document.getElementById('gc-mobile-progress');
    if (mobileBar) {
        mobileBar.innerHTML = STAGE_LABELS.map((s, i) => `
            <div class="gc-mobile-step ${i === 0 ? 'active' : ''}" id="mobile-step-${i}">
                <span class="gc-mobile-icon">${s.emoji}</span>
                <span class="gc-mobile-tooltip">${s.label}</span>
            </div>
        `).join('') +
        `<div class="gc-mobile-line"><div class="gc-mobile-fill" id="gc-mobile-fill" style="width:5%"></div></div>`;
    }
}

function advanceStage(toStage) {
    if (toStage <= currentStage) return;
    currentStage = toStage;

    const stepNum = Math.min(toStage + 1, MAX_STAGES);

    // ── Sidebar ──────────────────────────────────────────────
    const stepText = document.querySelector('.progress-step-text');
    if (stepText) stepText.textContent = `Step ${stepNum} of ${MAX_STAGES}`;

    const microCopy = document.querySelector('.progress-microcopy');
    if (microCopy) {
        if (toStage >= 3)      microCopy.textContent = 'Almost there 🔥';
        else if (toStage >= 2) microCopy.textContent = 'Running analysis ⚡';
        else if (toStage >= 1) microCopy.textContent = 'Verifying... 🔐';
        else                   microCopy.textContent = 'Live Analysis 🟢';
    }

    for (let i = 0; i < MAX_STAGES; i++) {
        const el = document.getElementById(`step-item-${i}`);
        if (!el) continue;
        el.className = 'progress-step-item';
        if (i < toStage)       el.classList.add('done');
        else if (i === toStage) el.classList.add('active');
    }

    const track = document.querySelector('.vertical-track');
    if (track) {
        const pct = Math.max(5, Math.min((toStage / (MAX_STAGES - 1)) * 100, 100));
        track.style.setProperty('--fill-pct', `${pct}%`);
    }

    // ── Top bar ───────────────────────────────────────────────
    const topBar  = document.getElementById('gc-top-bar');
    const barFill = topBar?.querySelector('.gc-bar-fill');
    const barStep = topBar?.querySelector('.gc-step-counter');
    const barCopy = topBar?.querySelector('.gc-microcopy');

    if (topBar) {
        // Show top bar from stage 1 (after verification starts)
        if (toStage >= 1) topBar.classList.remove('hidden');

        const pct = Math.max(4, Math.min((toStage / (MAX_STAGES - 1)) * 100, 100));
        if (barFill) barFill.style.width = pct + '%';
        if (barStep) barStep.textContent = `Step ${stepNum} of ${MAX_STAGES}`;

        if (barCopy) {
            if (toStage >= 3) {
                barCopy.textContent = 'Almost there 🔥';
                barCopy.classList.add('almost');
            } else if (toStage >= 2) {
                barCopy.textContent = 'Running analysis ⚡';
                barCopy.classList.remove('almost');
            } else {
                barCopy.textContent = 'Takes ~150 seconds';
                barCopy.classList.remove('almost');
            }
        }
    }

    // ── Mobile bottom bar ────────────────────────────────────
    const mobileBar = document.getElementById('gc-mobile-progress');
    if (mobileBar) {
        if (toStage >= 1) mobileBar.classList.remove('hidden');
        for (let i = 0; i < MAX_STAGES; i++) {
            const el = document.getElementById(`mobile-step-${i}`);
            if (!el) continue;
            el.className = 'gc-mobile-step';
            if (i < toStage)        el.classList.add('done');
            else if (i === toStage) el.classList.add('active');
        }
        const fill = document.getElementById('gc-mobile-fill');
        if (fill) {
            const pct = Math.max(5, Math.min((toStage / (MAX_STAGES - 1)) * 100, 100));
            fill.style.width = pct + '%';
        }
    }
}

// ─────────────────────────────────────────────────────────────
// GMB PROFILE CONFIRMATION CARD
// After clinic name + city are collected, searches Google Maps
// and shows a profile card with Yes / No / Not mine buttons
// ─────────────────────────────────────────────────────────────
async function triggerGMBLookup(clinicName, city, websiteUrl = null, pincode = null) {
    if (gmbLookupDone || !clinicName || !city) return false;
    gmbLookupDone = true;

    console.log('[GMB Lookup] Searching for:', clinicName, '|', city, '|', websiteUrl || '(no website)', '| PIN', pincode || '-');

    try {
        const res = await fetch(api('/api/gmb-lookup'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ clinicName, city, websiteUrl, pincode })
        });
        const data = await res.json();
        console.log('[GMB Lookup] Response:', data);

        if (data.found && data.results && data.results.length > 0) {
            showGMBConfirmationCard(data.results);
            return true;
        }

        // Not found, show a small "no profile" notice so the user knows
        if (data.reason === 'request_denied') {
            console.error('[GMB Lookup] Places API not enabled or billing not set up. Error:', data.error);
        }
        return false;
    } catch (e) {
        console.warn('[GMB Lookup] Failed:', e);
        return false;
    }
}

function showGMBConfirmationCard(results) {
    // Store the ranked queue; we reveal ONE best match at a time and only step
    // to the next candidate if the user says "Not my clinic".
    window._gmbResults = results;
    window._gmbIndex = 0;

    const row = document.createElement('div');
    row.className = 'message-row ai-row';
    row.innerHTML = `
        <div class="avatar ai-avatar"><img src="${api('/img/ai-avatar.png')}" alt="AI" style="width:100%;height:100%;border-radius:50%;object-fit:cover"></div>
        <div class="message-content">
            <div class="message-text" id="gmb-prompt" style="margin-bottom:8px">🗺️ Found this on Google Maps — is this your clinic?</div>
            <div class="gmb-confirm-card" id="gmb-confirm-card"></div>
        </div>
    `;
    chatMessagesArea.appendChild(row);

    paintGMBCard();

    // Block chat input while waiting for confirmation, flow shouldn't proceed.
    chatInput.disabled = true;
    sendBtn.disabled = true;
    chatInput.placeholder = "👆 Confirm your Google profile above";
}

// Paint the current best-match candidate into the confirmation card.
function paintGMBCard() {
    const results = window._gmbResults || [];
    const idx     = window._gmbIndex || 0;
    const r       = results[idx];
    const card    = document.getElementById('gmb-confirm-card');
    if (!r || !card) return;

    const safeName     = escHtml(r.name || '');
    const safeAddress  = escHtml(r.address || '');
    const safePhoto    = safeUrl(r.photoUrl || '', /\.googleapis\.com$/);
    const ratingNum    = Number(r.rating) || 0;
    const totalReviews = Number(r.totalReviews) || 0;
    const typesHtml    = (r.types || [])
        .map(t => `<span class="gmb-type-tag">${escHtml(String(t).replace(/_/g, ' '))}</span>`)
        .join('');
    const remaining = results.length - idx - 1;

    card.innerHTML = `
        <div class="gmb-card-inner">
            ${safePhoto ? `<div class="gmb-card-photo"><img src="${safePhoto}" alt="${safeName}" onerror="this.parentElement.style.display='none'"></div>` : ''}
            <div class="gmb-card-info">
                <div class="gmb-card-name">${safeName}</div>
                <div class="gmb-card-address">${safeAddress}</div>
                ${ratingNum ? `
                    <div class="gmb-card-rating">
                        <span class="gmb-stars">${'★'.repeat(Math.round(ratingNum))}${'☆'.repeat(5 - Math.round(ratingNum))}</span>
                        <span class="gmb-rating-num">${ratingNum}</span>
                        <span class="gmb-review-count">(${totalReviews} reviews)</span>
                    </div>
                ` : '<div class="gmb-card-rating"><span class="gmb-no-rating">No reviews yet</span></div>'}
                ${typesHtml ? `<div class="gmb-card-types">${typesHtml}</div>` : ''}
            </div>
        </div>
        <div class="gmb-card-actions" id="gmb-card-actions">
            <button class="gmb-btn gmb-btn-yes" onclick="confirmGMBProfile(true)">✅ Yes, that's us</button>
            <button class="gmb-btn gmb-btn-no" onclick="gmbTryNext()">${remaining > 0 ? '❌ Not us — show next' : '❌ Not my clinic'}</button>
        </div>
    `;
    scrollToBottom();
}

// User rejected the current match → reveal the next best candidate, or fall
// back to the "not found" path once the queue is exhausted.
function gmbTryNext() {
    const results = window._gmbResults || [];
    window._gmbIndex = (window._gmbIndex || 0) + 1;
    if (window._gmbIndex < results.length) {
        const prompt = document.getElementById('gmb-prompt');
        if (prompt) prompt.textContent = '🗺️ How about this one — is this your clinic?';
        paintGMBCard();
    } else {
        confirmGMBProfile(false);
    }
}

function confirmGMBProfile(isConfirmed) {
    const card = document.getElementById('gmb-confirm-card');
    const actions = document.getElementById('gmb-card-actions');
    const altResults = document.getElementById('gmb-alt-results');
    if (!card) return;

    // Disable buttons
    if (actions) {
        actions.innerHTML = isConfirmed
            ? '<div class="gmb-confirmed">✅ Profile confirmed, fetching review insights...</div>'
            : '<div class="gmb-confirmed">👋 No worries, we\'ll find you during the audit</div>';
    }
    if (altResults) altResults.remove();

    // Add visual state
    card.classList.add(isConfirmed ? 'gmb-confirmed-state' : 'gmb-dismissed-state');

    gmbConfirmed = true;

    // Remove the "Searching Google Maps..." typing indicator if still up
    pendingCityTypingEl?.remove();
    pendingCityTypingEl = null;

    // Re-enable chat input
    chatInput.disabled = false;
    sendBtn.disabled = false;
    chatInput.placeholder = 'Message GrowClinic AI...';

    // Build a single combined message that gives the AI BOTH the city and the GMB result.
    // (This is what we buffered when the user typed the city.)
    const cityPart = pendingCityMessage ? `City: ${pendingCityMessage}. ` : '';
    pendingCityMessage = null;

    // If the user already gave a pincode, tell the AI explicitly so it never re-asks.
    const pinDirective = collectedPincode
        ? ` (Pincode ${collectedPincode} already provided, do NOT ask for a pincode; continue to the next step.)`
        : '';

    let combinedMsg;
    if (isConfirmed) {
        const top = window._gmbResults?.[window._gmbIndex || 0];
        const ratingPart = top?.rating ? ` rated ${top.rating}★ with ${top.totalReviews} reviews` : '';
        // Include the Google category so the AI can infer the specialty from GMB
        // (e.g. "dentist", "homeopath") and never re-ask "what type of clinic?"
        const catPart = (top?.types && top.types.length) ? ` Category: ${top.types.join(', ')}.` : '';
        combinedMsg = `${cityPart}Confirmed Google profile: ${top?.name || 'my clinic'}${ratingPart}.${catPart}`;
    } else {
        combinedMsg = `${cityPart}Google profile not confirmed (user rejected the card).${pinDirective}`;
    }

    // Send the combined message to the AI (it will skip pincode if confirmed)
    setLoadingState(true);
    const typingEl = createTypingIndicator();
    chatMessagesArea.appendChild(typingEl);
    scrollToBottom();
    fetchChatResponse(combinedMsg, typingEl);
}

function showAlternateGMBResults() {
    const results = window._gmbResults;
    if (!results || results.length <= 1) return;

    const altContainer = document.getElementById('gmb-alt-results');
    if (!altContainer) return;

    let html = '';
    results.slice(1).forEach((r, idx) => {
        const safeName    = escHtml(r.name || '');
        const safeAddress = escHtml(r.address || '');
        const ratingNum   = Number(r.rating) || 0;
        const totalRevs   = Number(r.totalReviews) || 0;
        const realIdx     = idx + 1; // numeric, safe to interpolate
        html += `
            <div class="gmb-alt-card" onclick="selectAlternateGMB(${realIdx})">
                <div class="gmb-alt-name">${safeName}</div>
                <div class="gmb-alt-address">${safeAddress}</div>
                ${ratingNum ? `<span class="gmb-alt-rating">★ ${ratingNum} (${totalRevs})</span>` : ''}
            </div>
        `;
    });
    html += `<button class="gmb-btn gmb-btn-no" style="margin-top:8px;width:100%" onclick="confirmGMBProfile(false)">None of these are mine</button>`;

    altContainer.innerHTML = html;
}

function selectAlternateGMB(index) {
    const results = window._gmbResults;
    if (!results || !results[index]) return;

    const selected = results[index];
    const card = document.getElementById('gmb-confirm-card');
    const actions = document.getElementById('gmb-card-actions');
    const altResults = document.getElementById('gmb-alt-results');

    if (actions) actions.innerHTML = '<div class="gmb-confirmed">✅ Profile confirmed</div>';
    if (altResults) altResults.remove();
    if (card) card.classList.add('gmb-confirmed-state');

    const confirmMsg = `Confirmed: that's my clinic, ${selected.name}${selected.rating ? `, rated ${selected.rating}★ with ${selected.totalReviews} reviews` : ''}`;
    sendSimulatedMessage(confirmMsg);
}

// ─────────────────────────────────────────────────────────────
// WEBSITE INPUT, styled URL entry with auto-detect preview
// ─────────────────────────────────────────────────────────────
function showWebsiteInput() {
    if (websiteInputVisible) return;
    websiteInputVisible = true;

    const overlay = document.getElementById('website-overlay');
    if (!overlay) return;

    overlay.classList.remove('hidden');
    document.querySelector('.chat-main')?.setAttribute('inert', '');

    const urlInput = document.getElementById('wi-url-input');
    const scanBtn = document.getElementById('wi-scan-btn');
    const submitBtn = document.getElementById('wi-submit-btn');
    const skipBtn = document.getElementById('wi-skip-btn');
    const previewEl = document.getElementById('wi-preview');

    urlInput.value = '';
    scanBtn.disabled = true;
    submitBtn.style.display = 'none';
    skipBtn.style.display = 'block';
    previewEl.style.display = 'none';

    let previewFetched = false;
    let currentUrl = '';

    // Remove old listeners to avoid duplicates if called multiple times
    const newUrlInput = urlInput.cloneNode(true);
    urlInput.parentNode.replaceChild(newUrlInput, urlInput);
    const newScanBtn = scanBtn.cloneNode(true);
    scanBtn.parentNode.replaceChild(newScanBtn, scanBtn);
    const newSubmitBtn = submitBtn.cloneNode(true);
    submitBtn.parentNode.replaceChild(newSubmitBtn, submitBtn);
    const newSkipBtn = skipBtn.cloneNode(true);
    skipBtn.parentNode.replaceChild(newSkipBtn, skipBtn);

    // Get the fresh references
    const activeUrlInput = document.getElementById('wi-url-input');
    const activeScanBtn = document.getElementById('wi-scan-btn');
    const activeSubmitBtn = document.getElementById('wi-submit-btn');
    const activeSkipBtn = document.getElementById('wi-skip-btn');

    // Enable scan button when input has content
    activeUrlInput.addEventListener('input', () => {
        if (/^https?:\/\//i.test(activeUrlInput.value)) {
            activeUrlInput.value = activeUrlInput.value.replace(/^https?:\/\//i, '');
        }
        const val = activeUrlInput.value.trim();
        activeScanBtn.disabled = val.length < 3;
        activeSubmitBtn.style.display = 'none'; // hide until rescanned
        previewFetched = false;
        if (previewEl) previewEl.style.display = 'none';
        activeSkipBtn.style.display = 'block';
    });

    // Auto-scan on Enter key
    activeUrlInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && activeUrlInput.value.trim().length >= 3) {
            e.preventDefault();
            fetchWebsitePreview();
        }
    });

    activeScanBtn.addEventListener('click', fetchWebsitePreview);

    async function fetchWebsitePreview() {
        let val = activeUrlInput.value.trim();
        if (val.length < 3) return;

        if (!/^https?:\/\//i.test(val)) val = 'https://' + val;
        currentUrl = val;

        activeScanBtn.disabled = true;
        activeScanBtn.innerHTML = 'Scanning...';

        try {
            const res = await fetch(api('/api/website-preview'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: val })
            });
            const data = await res.json();

            if (data.found && previewEl) {
                const safeFavicon = safeUrl(data.favicon || '', /./);
                const safeTitle   = escHtml(data.title || data.domain || '');
                const safeDomain  = escHtml(data.domain || '');
                const safeDesc    = data.description ? escHtml(String(data.description).substring(0, 100)) + (data.description.length > 100 ? '…' : '') : '';

                previewEl.style.display = 'flex';
                previewEl.innerHTML = `
                    <div class="wi-preview-left">
                        <img class="wi-favicon" src="${safeFavicon}" alt="" style="width:32px;height:32px;border-radius:4px;object-fit:contain" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22%233B82F6%22><circle cx=%2212%22 cy=%2212%22 r=%2210%22/><text x=%2212%22 y=%2216%22 text-anchor=%22middle%22 fill=%22white%22 font-size=%2212%22>W</text></svg>'">
                    </div>
                    <div class="wi-preview-right" style="flex:1;min-width:0;">
                        <div class="wi-preview-title" style="font-weight:600;font-size:14px;color:#0F172A;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${safeTitle}</div>
                        <div class="wi-preview-domain" style="font-size:12px;color:#3B82F6;">${safeDomain}</div>
                        ${safeDesc ? `<div class="wi-preview-desc" style="font-size:12px;color:#64748B;margin-top:4px;">${safeDesc}</div>` : ''}
                    </div>
                    <div class="wi-preview-badge" style="background:#10B981;color:white;font-size:12px;padding:4px 8px;border-radius:6px;font-weight:600;">✅ Found</div>
                `;
                previewFetched = true;
                activeSubmitBtn.style.display = 'block';
                activeSkipBtn.style.display = 'none';
            } else if (!data.found && previewEl) {
                previewEl.style.display = 'flex';
                const errMsg = data.reason === 'invalid_domain'
                    ? (data.message || 'Domain needs a valid extension like .com, .in, .org')
                    : "We couldn't reach this site. Check the URL and try again.";
                previewEl.innerHTML = `
                    <div class="wi-preview-left"><span style="font-size:24px">⚠️</span></div>
                    <div class="wi-preview-right">
                        <div class="wi-preview-title" style="font-weight:600;font-size:14px;color:#DC2626">Invalid URL</div>
                        <div class="wi-preview-desc" style="font-size:12px;color:#64748B;">${escHtml(errMsg)}</div>
                    </div>
                `;
                previewFetched = false;
                activeSubmitBtn.style.display = 'none';
            }
        } catch (e) {
            if (previewEl) {
                previewEl.style.display = 'flex';
                previewEl.innerHTML = `
                    <div class="wi-preview-left"><span style="font-size:24px">⚠️</span></div>
                    <div class="wi-preview-right">
                        <div class="wi-preview-title" style="font-weight:600;font-size:14px;color:#DC2626">Couldn't reach this site</div>
                        <div class="wi-preview-desc" style="font-size:12px;color:#64748B;">Check the URL or your internet connection.</div>
                    </div>
                `;
            }
            activeSubmitBtn.style.display = 'none';
        }

        activeScanBtn.innerHTML = `Scan`;
        activeScanBtn.disabled = false;
    }

    activeSubmitBtn.addEventListener('click', () => {
        let val = activeUrlInput.value.trim();
        if (val.length < 3) return;
        if (!/^https?:\/\//i.test(val)) val = 'https://' + val;
        collectedWebsite = val;
        closeWebsiteInput();
        sendSimulatedMessage(val);
    });

    activeSkipBtn.addEventListener('click', () => {
        closeWebsiteInput();
        sendSimulatedMessage('No website');
    });

    setTimeout(() => activeUrlInput.focus(), 100);
}

function closeWebsiteInput() {
    websiteInputVisible = false;
    const overlay = document.getElementById('website-overlay');
    if (overlay) overlay.classList.add('hidden');
    document.querySelector('.chat-main')?.removeAttribute('inert');
}

// ── STAGE DETECTION ───────────────────────────────────────────
// Advances based on what section the AI has moved into
function detectStageFromReply(reply) {
    const r = reply.toLowerCase();

    // ── Stage 0: Clinic & Basic Details (role → name → clinic → website → specialty → city → pincode)

    // VERIFICATION: AI asks for the WhatsApp / phone number. In the deferred
    // flow this happens at the END of the audit (stage 2-3), so it is NOT gated
    // on stage. Guard against re-firing and against bare "whatsapp" mentions
    // (e.g. WhatsApp automation findings) by matching number-asking phrases only.
    if (!phoneInputVisible && !otpVisible && !window.GC_PHONE && !window.GC_EMAIL && (
        r.includes("what's your number") || r.includes('your number') ||
        r.includes('whatsapp number') || r.includes('mobile number') ||
        r.includes('phone number') || r.includes('report on whatsapp') ||
        r.includes('send the full report') || r.includes('send your full report') ||
        r.includes('your full report') || r.includes('best contact') ||
        r.includes('where should i send') || r.includes('send the report') ||
        r.includes('your email') || r.includes('best email')
    )) {
        if (currentStage < 1) advanceStage(1);
        // India → WhatsApp OTP; rest of world → email verification (WhatsApp
        // adoption is unreliable outside India, esp. the US).
        if (isIndiaMarket()) showPhoneInput(); else showEmailInput();
    }

    // OTP modal triggers (independent of stage)
    if (!otpVisible && (
        r.includes('sending a 6-digit') || r.includes('sent a 6-digit') ||
        r.includes('6-digit otp') || r.includes('6-digit code') || r.includes('otp to verify') ||
        r.includes('sending a 4-digit') || r.includes('sent a 4-digit') || r.includes('4-digit')
    )) {
        hidePhoneInput();
        const lastUserMsg = document.querySelector('.user-row:last-of-type .message-text');
        showOtpModal(lastUserMsg?.textContent?.trim() || '');
    }

    if (otpVisible && r.includes('verified') && r.includes('✅')) {
        closeOtpModal();
    }

    // 1 → 2 AUDIT ANALYSIS: AI asks any audit-flow question (Google/ads/volume), collapsed into one stage
    if (currentStage < 2 && (
        r.includes('patients from google') || r.includes('new patients from google') ||
        r.includes('getting new patients') || r.includes('google my business') ||
        r.includes('gmb profile') || r.includes('google business') ||
        r.includes('running paid ads') || r.includes('paid ads') ||
        r.includes('google ads') || r.includes('monthly budget') ||
        r.includes('patients per month') || r.includes('new patients per month') ||
        r.includes('biggest gap')
    )) advanceStage(2);

    // 2 → 3 REPORT: LEAD_CAPTURED fires this via advanceStage(MAX_STAGES - 1).
    // Also trigger on "running your audit" / completion signals.
    if (currentStage < 3 && (
        r.includes('running your audit') || r.includes('checking google footprint') ||
        r.includes('scanning') || r.includes('found gaps costing') ||
        r.includes('audit complete')
    )) advanceStage(3);

    // ── Website input trigger: AI asks for website URL.
    // Guard: never trigger while the AI is still asking for name/role/clinic name,     // phrases like "scan ... live" in the welcome message used to false-trigger it.
    const askingSomethingElse = r.includes('your name') || r.includes('your role') ||
        r.includes('clinic called') || r.includes('hospital called') || r.includes('know your role');
    if (!websiteInputVisible && !askingSomethingElse && (
        r.includes('got a website') || r.includes('drop the url') ||
        r.includes('your website') || r.includes('clinic website') ||
        r.includes("scan it live") || r.includes("live scan") ||
        r.includes("website url")
    )) {
        // No popup — the user types their website right in the chat. Flag that
        // the next message is the website (so we validate it) and switch the
        // chatbox into URL mode (no autocaps/autocorrect, URL keyboard, hint).
        window._awaitingWebsite = true;
        setWebsiteInputMode(true);
    }

    // ── GMB lookup trigger: as soon as we have BOTH clinic name and city, fire it.
    // Don't gate on a specific AI keyword, that was missing pincode-less flows.
    if (!gmbLookupDone && collectedClinicName && collectedCity) {
        triggerGMBLookup(collectedClinicName, collectedCity, collectedWebsite || null);
    }
}

// ─────────────────────────────────────────────────────────────
// OPTIONS PARSER, converts [OPTIONS: A | B], [MULTI_OPTIONS: A | B], [ROLE_OPTIONS: A | B]
// ─────────────────────────────────────────────────────────────
// Strip markdown the AI sometimes wraps around option labels (**bold**, *em*, `code`)
// so chips display AND send clean text, never raw asterisks in the user bubble.
function stripMd(s) {
    return String(s).replace(/\*\*|__|[*_`]/g, '').trim();
}

function parseOptions(text) {
    let match = text.match(/\[ROLE_OPTIONS:\s*([^\]]+)\]/i);
    if (match) {
        const options = match[1].split('|').map(o => stripMd(o)).filter(Boolean);
        const cleanText = text.replace(/\[ROLE_OPTIONS:[^\]]+\]/i, '').trim();
        return { cleanText, options, isMulti: false, isRole: true };
    }

    let isMulti = false;
    match = text.match(/\[OPTIONS:\s*([^\]]+)\]/i);
    if (!match) {
        match = text.match(/\[MULTI_OPTIONS:\s*([^\]]+)\]/i);
        if (match) isMulti = true;
    }

    if (!match) return { cleanText: text, options: [], isMulti: false, isRole: false };

    const options = match[1]
        .split('|')
        .map(o => stripMd(o))
        .filter(Boolean);

    const cleanText = text.replace(/\[(MULTI_)?OPTIONS:[^\]]+\]/i, '').trim();
    return { cleanText, options, isMulti, isRole: false };
}

// ─────────────────────────────────────────────────────────────
// ROLE CARDS, special 2-col grid layout for role selection
// ─────────────────────────────────────────────────────────────
function renderRoleCards(options, containerEl) {
    if (!options.length) return;

    const grid = document.createElement('div');
    grid.className = 'role-cards-grid';

    options.forEach((opt, idx) => {
        // Split emoji from label (emoji is first char(s) before space)
        const parts = opt.match(/^([\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{1F300}-\u{1FAFF}🩺🦷💆🏥🏨📋🗂💼]+)\s*(.+)$/u);
        const emoji = parts ? parts[1] : '👤';
        const label = parts ? parts[2] : opt;

        const card = document.createElement('button');
        card.className = 'role-card';
        card.style.animationDelay = `${idx * 60}ms`;
        card.innerHTML = `
            <span class="role-card-emoji">${emoji}</span>
            <span class="role-card-label">${label.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')}</span>
        `;
        card.addEventListener('click', () => {
            if (grid.classList.contains('locked')) return;
            grid.classList.add('locked');
            grid.querySelectorAll('.role-card').forEach(c => {
                c.disabled = true;
                c.classList.add('used');
            });
            card.classList.add('selected');
            sendSimulatedMessage(opt);
        });
        grid.appendChild(card);
    });

    containerEl.appendChild(grid);
    chatInput.disabled = true;
}

function renderOptionPills(options, isMulti, containerEl) {
    if (!options.length) return;

    const wrap = document.createElement('div');
    wrap.className = 'option-pills';

    if (isMulti) {
        wrap.classList.add('multi-select-wrap');
        const selectedOptions = new Set();
        
        options.forEach(opt => {
            const label = document.createElement('label');
            label.className = 'option-pill multi-pill';
            label.style.display = 'flex';
            label.style.alignItems = 'center';
            label.style.gap = '8px';
            label.style.cursor = 'pointer';
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.style.cursor = 'pointer';
            checkbox.style.width = '16px';
            checkbox.style.height = '16px';
            
            const span = document.createElement('span');
            span.innerHTML = opt.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
            
            label.appendChild(checkbox);
            label.appendChild(span);

            checkbox.addEventListener('change', (e) => {
                if (chatInput.disabled && wrap.classList.contains('locked')) {
                    e.preventDefault();
                    checkbox.checked = !checkbox.checked; // revert
                    return;
                }
                
                if (checkbox.checked) {
                    selectedOptions.add(opt);
                    label.classList.add('selected');
                } else {
                    selectedOptions.delete(opt);
                    label.classList.remove('selected');
                }
            });
            wrap.appendChild(label);
        });
        
        const submitBtn = document.createElement('button');
        submitBtn.className = 'submit-chips-btn';
        submitBtn.textContent = 'Continue →';
        submitBtn.addEventListener('click', () => {
             if ((chatInput.disabled && wrap.classList.contains('locked')) || selectedOptions.size === 0) return;
             wrap.classList.add('locked');
             wrap.querySelectorAll('.option-pill, .submit-chips-btn').forEach(p => {
                 p.classList.add('used');
                 p.disabled = true;
             });
             sendSimulatedMessage(Array.from(selectedOptions).join(', '));
        });
        wrap.appendChild(submitBtn);

    } else {
        options.forEach(opt => {
            const btn = document.createElement('button');
            btn.className = 'option-pill';
            btn.innerHTML = opt.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
            btn.addEventListener('click', () => {
                if (chatInput.disabled && wrap.classList.contains('locked')) return;
                wrap.classList.add('locked');
                wrap.querySelectorAll('.option-pill').forEach(p => {
                    p.disabled = true;
                    p.classList.add('used');
                });
                btn.classList.add('selected');
                sendSimulatedMessage(opt);
            });
            wrap.appendChild(btn);
        });
    }

    containerEl.appendChild(wrap);
    chatInput.disabled = true; // disable text input to enforce options
    chatInput.placeholder = "Select an option above...";
    scrollToBottom();
}

function detectRoleFromMessage(text) {
    const t = text.toLowerCase();
    if (t.includes("i'm a doctor") || t === "doctor" || t === "🩺 doctor" || t.includes("i am a doctor") || (t.includes('doctor') && !t.includes('hospital'))) {
        userRole = 'doctor';
    } else if (t.includes('hospital owner') || t.includes('🏨') || (t.includes('hospital') && !t.includes('hod'))) {
        userRole = 'hospital';
    } else if (t.includes('clinic owner') || t.includes('🏥') || t.includes('owner')) {
        userRole = 'owner';
    } else if (t.includes('hod') || t.includes('head of department') || t.includes('📋')) {
        userRole = 'hod';
    } else if (t.includes('practice manager') || t.includes('🗂️') || t.includes('manager')) {
        userRole = 'manager';
    } else if (t.includes('administrator') || t.includes('💼') || t.includes('admin')) {
        userRole = 'admin';
    }

    // Header chip shows the FACILITY TYPE (Hospital / Dental / Aesthetics / …),
    // not the person's role. Set once; a specific type never downgrades to "Clinic".
    const hit = TYPE_BADGES.find(b => b.re.test(t));
    if (hit && (!facilityTypeSet || hit.label !== 'Clinic')) {
        if (!(facilityTypeSet && hit.label === 'Clinic')) {
            let badge = document.getElementById('role-badge');
            if (!badge) {
                badge = document.createElement('span');
                badge.id = 'role-badge';
                badge.className = 'role-badge';
                const subEl = document.querySelector('.header-subtitle');
                if (subEl) subEl.after(badge); else document.querySelector('.header-title')?.after(badge);
            }
            badge.textContent = `${hit.emoji} ${hit.label}`;
            if (hit.label !== 'Clinic') facilityTypeSet = true;
        }
    }
}

function trackUserData(text) {
    // Track user messages to collect clinic name and city for GMB lookup
    // userMsgCount already incremented by this point
    // Msg 1: role, Msg 2: name, Msg 3: clinic name, then flow varies
    // We detect based on context: if AI just asked for clinic name, the response IS the clinic name
    // If AI just asked for city, response is the city

    // Check what the last AI message asked for
    const aiMsgs = document.querySelectorAll('.ai-row .message-text');
    if (aiMsgs.length === 0) return;
    const lastAI = aiMsgs[aiMsgs.length - 1]?.textContent?.toLowerCase() || '';

    if (!collectedClinicName && (
        lastAI.includes("what's the clinic called") || lastAI.includes("what's the hospital called") ||
        lastAI.includes("clinic name") || lastAI.includes("hospital name") ||
        lastAI.includes("clinic called") || lastAI.includes("hospital called")
    )) {
        collectedClinicName = text.trim();
        console.log('[Track] Clinic name:', collectedClinicName);
    }

    if (!collectedCity && (
        lastAI.includes('which city') || lastAI.includes('what city') ||
        lastAI.includes('city or pincode') || lastAI.includes('pincode') || lastAI.includes('pin code')
    )) {
        collectedCity = text.trim();
        console.log('[Track] City/PIN:', collectedCity);
        showLiveFinding({
            stat: 'Analyzing…',
            label: 'your local patient demand',
            caption: `Reviewing Google & website signals for ${collectedClinicName || 'your clinic'} in ${collectedCity}.`
        });
    }
}

// Show a single inline finding in the sidebar Live Findings panel
function showLiveFinding({ stat, label, caption }) {
    const panel = document.getElementById('live-findings');
    const body  = document.getElementById('live-findings-body');
    if (!panel || !body) return;
    body.innerHTML = `
        <span class="lf-stat">${escHtml(stat)}</span>
        <span style="font-size:0.78rem;color:var(--gc-text-tertiary);">${escHtml(label)}</span>
        <div class="lf-caption">${escHtml(caption)}</div>
    `;
    panel.classList.remove('hidden');
}

// Buffer for city message: when user gives city, we run GMB lookup BEFORE sending to AI
let pendingCityMessage = null; // raw user city message
let pendingCityTypingEl = null;

async function sendSimulatedMessage(text) {
    if (!window._gcStarted) { window._gcStarted = true; try { if (typeof track === 'function') track('audit_start'); } catch (e) {} }
    // A chip/option answer (e.g. the "No website" tile) IS the website-step
    // answer, so clear the flag — otherwise the NEXT typed reply (the city)
    // would be wrongly validated as a website.
    window._awaitingWebsite = false;
    setWebsiteInputMode(false);
    // Always exit hero mode if a programmatic message lands (role-card click etc.)
    exitHeroMode();
    detectRoleFromMessage(text);

    trackUserData(text);
    appendMessage(text, 'user');
    chatInput.value = '';

    setLoadingState(true);
    const delay = Math.floor(Math.random() * 160) + 90;
    setTimeout(() => {
        const typingEl = createTypingIndicator();
        chatMessagesArea.appendChild(typingEl);
        scrollToBottom();
        fetchChatResponse(text, typingEl);
    }, delay);
}

// ─────────────────────────────────────────────────────────────
// MESSAGE HANDLING
// ─────────────────────────────────────────────────────────────
// Loose website validation → 'none' (skip), 'valid', or 'invalid'.
function looksLikeWebsite(s) {
    s = String(s || '').trim().toLowerCase();
    if (/^(no\b|no website|skip|none|nope|n\/a|i don'?t have|dont have|don'?t have)/.test(s)) return 'none';
    const cleaned = s.replace(/^https?:\/\//, '').replace(/^www\./, '').trim();
    if (/^[a-z0-9][a-z0-9-]*(\.[a-z0-9-]{2,})+([\/?#].*)?$/i.test(cleaned)) return 'valid';
    return 'invalid';
}

// Make the chatbox feel like a URL field while we're collecting the website.
function setWebsiteInputMode(on) {
    if (!chatInput) return;
    if (on) {
        chatInput.type = 'url';
        chatInput.setAttribute('inputmode', 'url');
        chatInput.setAttribute('autocapitalize', 'off');
        chatInput.setAttribute('autocorrect', 'off');
        chatInput.setAttribute('spellcheck', 'false');
        chatInput.placeholder = '🌐 yourclinic.com  —  or type “No website”';
    } else {
        chatInput.type = 'text';
        chatInput.removeAttribute('inputmode');
        chatInput.removeAttribute('autocapitalize');
        chatInput.removeAttribute('autocorrect');
        chatInput.removeAttribute('spellcheck');
        chatInput.placeholder = 'Message GrowClinic AI...';
    }
}

// Append a small "checking your site" card, then fill it with the live
// title/favicon/domain we fetched (or a graceful fallback), then continue the
// audit. Gives the user visual proof we read their actual website.
async function verifyWebsiteThenContinue(rawUrl) {
    let url = rawUrl.trim();
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
    const domain = url.replace(/^https?:\/\/(www\.)?/i, '').split('/')[0];

    const row = document.createElement('div');
    row.className = 'message-row ai-row';
    row.innerHTML = `
        <div class="avatar ai-avatar"><img src="${api('/img/ai-avatar.png')}" alt="AI" style="width:100%;height:100%;border-radius:50%;object-fit:cover"></div>
        <div class="message-content">
            <div class="message-text" style="margin-bottom:8px">🔎 Checking your website…</div>
            <div class="gmb-confirm-card website-verify-card">
                <div class="gmb-card-inner">
                    <div class="gmb-card-info">
                        <div class="gmb-card-name">${escHtml(domain)}</div>
                        <div class="gmb-card-address" style="opacity:.7">Scanning the live page…</div>
                    </div>
                </div>
            </div>
        </div>`;
    chatMessagesArea.appendChild(row);
    scrollToBottom();
    const card = row.querySelector('.website-verify-card');

    let data = null;
    try {
        const res = await fetch(api('/api/website-preview'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url })
        });
        data = await res.json();
    } catch (e) { /* network hiccup → graceful fallback below */ }

    if (data && data.found && card) {
        const safeFavicon = safeUrl(data.favicon || '', /./);
        const safeTitle   = escHtml(data.title || data.domain || domain);
        const safeDomain  = escHtml(data.domain || domain);
        const safeDesc    = data.description
            ? escHtml(String(data.description).substring(0, 90)) + (data.description.length > 90 ? '…' : '')
            : '';
        card.innerHTML = `
            <div class="gmb-card-inner">
                <div class="gmb-card-photo" style="width:46px;height:46px;display:flex;align-items:center;justify-content:center;background:#fff;border-radius:10px;flex:none">
                    ${safeFavicon ? `<img src="${safeFavicon}" alt="" style="width:30px;height:30px;object-fit:contain" onerror="this.parentElement.textContent='🌐'">` : '🌐'}
                </div>
                <div class="gmb-card-info">
                    <div class="gmb-card-name">${safeTitle}</div>
                    <div class="gmb-card-address" style="color:#34d399">${safeDomain}</div>
                    ${safeDesc ? `<div class="gmb-card-types" style="opacity:.75;font-size:12px">${safeDesc}</div>` : ''}
                </div>
                <div style="margin-left:auto;align-self:flex-start;background:#10B981;color:#fff;font-size:11px;padding:3px 8px;border-radius:8px;font-weight:700;white-space:nowrap">✅ LIVE</div>
            </div>`;
    } else if (card) {
        card.innerHTML = `
            <div class="gmb-card-inner">
                <div class="gmb-card-photo" style="width:46px;height:46px;display:flex;align-items:center;justify-content:center;border-radius:10px;flex:none">🌐</div>
                <div class="gmb-card-info">
                    <div class="gmb-card-name">${escHtml(domain)}</div>
                    <div class="gmb-card-address" style="opacity:.7">Saved — we'll analyse it during the audit</div>
                </div>
            </div>`;
    }
    scrollToBottom();

    // Continue the audit: hand the website to the AI.
    collectedWebsite = url;
    setLoadingState(true);
    const typingEl = createTypingIndicator();
    chatMessagesArea.appendChild(typingEl);
    scrollToBottom();
    fetchChatResponse(rawUrl, typingEl);
}

async function handleSendMessage(e) {
    e.preventDefault();
    const text = chatInput.value.trim();
    if (!text) return;

    // Website step: the user types their site in the chat (no popup). Validate
    // it's a real URL before sending; accept "No website" / skip too.
    if (window._awaitingWebsite) {
        const v = looksLikeWebsite(text);
        if (v === 'invalid') {
            appendMessage(text, 'user');
            chatInput.value = '';
            appendMessage("Hmm, that doesn't look like a valid website. Type it like clinicname.com — or reply \"No website\".", 'ai');
            return;
        }
        window._awaitingWebsite = false;
        setWebsiteInputMode(false);
        if (v === 'valid') {
            // Show the user's message, then verify the live site in a tile
            // (title + favicon + domain) before continuing the audit.
            appendMessage(text, 'user');
            chatInput.value = '';
            verifyWebsiteThenContinue(text.trim());
            return;
        }
        // v === 'none' → falls through to the normal send ("No website" etc.)
    }

    // Intake handoff: a Google profile wasn't found, we asked for a postal code.
    // Accept ANY country's format: Indian 6-digit pincode, US ZIP (5 or 5+4),
    // UK postcode (SW1A 1AA), Canadian (M5V 2T6), etc.
    if (awaitingIntakePincode) {
        const pin = text.trim().replace(/[^A-Za-z0-9 -]/g, '').slice(0, 12);
        appendMessage(text, 'user');
        chatInput.value = '';
        if (pin.replace(/[^A-Za-z0-9]/g, '').length >= 3) {
            awaitingIntakePincode = false;
            collectedPincode = pin;
            gmbLookupDone = false; // allow a fresh lookup
            appendMessage('Thanks! Searching again with your postal code 🔍', 'ai');
            triggerGMBLookup(collectedClinicName, collectedCity, collectedWebsite || null, pin).then(found => {
                if (!found) appendMessage("Still couldn't pin it down — no worries, we'll work from the details you shared.", 'ai');
            });
        } else {
            appendMessage('That doesn\'t look like a postal code — please re-enter it 📍', 'ai');
        }
        return;
    }

    // Analytics: first user message = audit started (fire once).
    if (!window._gcStarted) { window._gcStarted = true; try { if (typeof track === 'function') track('audit_start'); } catch (e2) {} }

    // Exit hero mode on the FIRST user message, the chat layout takes over,
    // input docks to the bottom, messages area becomes scrollable.
    exitHeroMode();

    detectRoleFromMessage(text);
    
    const aiMsgs = document.querySelectorAll('.ai-row .message-text');
    const lastAI = aiMsgs[aiMsgs.length - 1]?.textContent?.toLowerCase() || '';
    const isCityResponse = !collectedCity && (
        lastAI.includes('which city') || lastAI.includes('what city') ||
        lastAI.includes('city or pincode') || lastAI.includes('pincode') || lastAI.includes('pin code')
    );

    trackUserData(text);
    appendMessage(text, 'user');
    chatInput.value = '';

    if (isCityResponse && collectedClinicName && !gmbLookupDone) {
        pendingCityMessage = text;
        pendingCityTypingEl = createTypingIndicator();
        chatMessagesArea.appendChild(pendingCityTypingEl);
        scrollToBottom();
        chatInput.disabled = true;
        sendBtn.disabled = true;
        chatInput.placeholder = '🔍 Searching Google Maps for your profile...';

        // If they answered with a 6-digit pincode, resolve it to an area/city
        // first, then use that for the Google lookup.
        let lookupCity = collectedCity;
        let lookupPincode = null;
        const pinMatch = text.match(/\b(\d{6})\b/);
        if (pinMatch) {
            lookupPincode = pinMatch[1];
            collectedPincode = pinMatch[1];
            chatInput.placeholder = '📍 Looking up your area...';
            try {
                const pr = await fetch(api(`/api/resolve-pincode/${lookupPincode}`)).then(r => r.json());
                if (pr && pr.found) {
                    const resolved = pr.city || pr.district || '';
                    if (resolved) {
                        lookupCity = resolved;
                        collectedCity = resolved; // replace the raw pincode we stored
                        const areaPart = pr.area && pr.area !== resolved ? `${pr.area}, ` : '';
                        pendingCityMessage = `${areaPart}${resolved}${pr.state ? ', ' + pr.state : ''} (PIN ${lookupPincode})`;
                    }
                }
            } catch (err) { console.warn('[pincode] resolve failed:', err); }
            chatInput.placeholder = '🔍 Searching Google Maps for your profile...';
        } else {
            // International postal codes — UK postcode (SW1A 1AA), Canadian
            // (M5V 2T6) or a ZIP-only reply (10001 / 10001-1234). No resolver
            // needed; passed straight to Google as a precise search hint.
            const t = text.trim();
            const ukPc = t.match(/\b([A-Za-z]{1,2}\d[A-Za-z\d]?\s*\d[A-Za-z]{2})\b/);
            const caPc = t.match(/\b([A-Za-z]\d[A-Za-z]\s*\d[A-Za-z]\d)\b/);
            const zipOnly = /^\d{5}(-\d{4})?$/.test(t) ? t : null;
            const intlPin = (caPc && caPc[1]) || (ukPc && ukPc[1]) || zipOnly;
            if (intlPin) {
                lookupPincode = intlPin;
                collectedPincode = intlPin;
            }
        }

        try {
            const found = await triggerGMBLookup(collectedClinicName, lookupCity, collectedWebsite || null, lookupPincode);
            if (!found) {
                pendingCityTypingEl?.remove();
                pendingCityTypingEl = null;
                const cityMsg = pendingCityMessage;
                pendingCityMessage = null;
                const pinDir = collectedPincode ? ` (Pincode ${collectedPincode} already provided, do NOT ask for a pincode; continue to the next step.)` : '';
                const combinedMsg = `City: ${cityMsg}. No Google profile found automatically.${pinDir}`;
                setLoadingState(true);
                const newTyping = createTypingIndicator();
                chatMessagesArea.appendChild(newTyping);
                scrollToBottom();
                fetchChatResponse(combinedMsg, newTyping);
            }
        } catch (e) {
            console.warn('[GMB intercept] error:', e);
            pendingCityTypingEl?.remove();
            pendingCityTypingEl = null;
            const cityMsg = pendingCityMessage;
            pendingCityMessage = null;
            setLoadingState(true);
            const newTyping = createTypingIndicator();
            chatMessagesArea.appendChild(newTyping);
            scrollToBottom();
            fetchChatResponse(cityMsg, newTyping);
        }
        return;
    }

    setLoadingState(true);

    // First-time INIT_CONVERSATION primer, kicks off the role question
    // *after* we've already shown the user's first message, so the AI can
    // reply with the role picker right above the chat history.
    if (!window._gcInitialised) {
        window._gcInitialised = true;
        const primer = HAS_PREFILL
            ? `INIT_CONVERSATION. My name is ${PREFILL_NAME}, my clinic is ${PREFILL_CLINIC}${PREFILL_CITY ? `, located in ${PREFILL_CITY}` : ''}. The user has just opened the chat and said: "${text}". Skip basic detail questions and go directly to growth questions. Send the warm welcome/acknowledgement as its own message, then a [DELAY: 600], then the next single question, two separate bubbles, never combined.`
            : `INIT_CONVERSATION. The user has just opened the chat and said: "${text}". First send a short warm welcome/acknowledgement as ONE message, then a [DELAY: 600], then start the audit flow at PHASE 1 (role question) as a SEPARATE message. The greeting and the first question must be two separate bubbles, never bundled together.`;
        const delay = Math.floor(Math.random() * 120) + 70;
        setTimeout(async () => {
            const typingEl = createTypingIndicator();
            chatMessagesArea.appendChild(typingEl);
            scrollToBottom();
            await fetchChatResponse(primer, typingEl);
        }, delay);
        if (HAS_PREFILL) advanceStage(2);
        return;
    }

    const delay = Math.floor(Math.random() * 160) + 90;
    setTimeout(async () => {
        const typingEl = createTypingIndicator();
        chatMessagesArea.appendChild(typingEl);
        scrollToBottom();
        await fetchChatResponse(text, typingEl);
    }, delay);
}

// Toggle off the centered hero layout once the conversation actually begins
function exitHeroMode() {
    const main = document.getElementById('chat-main');
    if (main && main.classList.contains('hero-mode')) {
        main.classList.remove('hero-mode');
        // Soft-fade the hero block out, then remove it from DOM after the animation
        const hero = document.getElementById('chat-hero');
        if (hero) setTimeout(() => hero.remove(), 500);
    }
}

// ── Attribute-collection events ──────────────────────────────
// The backend returns the extracted profile with every chat reply. Each newly
// captured attribute fires ONE `attr_collected` tracking event and triggers
// its deterministic side-effect (instead of relying on chat heuristics).
window._gcProfile = window._gcProfile || {};
function handleProfileUpdate(profile) {
    if (!profile || typeof profile !== 'object') return;
    const prev = window._gcProfile;
    for (const [field, value] of Object.entries(profile)) {
        if (!value || prev[field] === value) continue;
        try { if (typeof track === 'function') track('attr_collected', { field, first: !prev[field] }); } catch (e) {}
        // Deterministic side-effects per attribute:
        if (field === 'website' && value !== 'none' && !window._gcPsWarmed) {
            window._gcPsWarmed = true;   // warm PageSpeed the moment a website is known
            fetch(api('/api/pagespeed-warm'), {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId, url: value })
            }).catch(() => {});
        }
        if (field === 'clinicName' && !collectedClinicName) collectedClinicName = value;
        if (field === 'city' && !collectedCity) collectedCity = value;
        if (field === 'pincode' && !collectedPincode) collectedPincode = value;
    }
    window._gcProfile = { ...prev, ...Object.fromEntries(Object.entries(profile).filter(([, v]) => !!v)) };
}

async function fetchChatResponse(message, indicatorToRemove = null) {
    try {
        const response = await fetch(api('/api/chat'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sessionId, message, source: LEAD_SOURCE,
                // Resolved traffic channel (google_ads / meta_ads / *_organic /
                // referral / direct) + campaign, captured at landing in GC_ATTR.
                channel:  (window.GC_ATTR && window.GC_ATTR.channel) || 'direct',
                campaign: (window.GC_ATTR && window.GC_ATTR.utm_campaign) || '',
                // Raw click IDs + landing context (first-touch, server-capped)
                gclid:       (window.GC_ATTR2 && window.GC_ATTR2.gclid) || '',
                fbclid:      (window.GC_ATTR2 && window.GC_ATTR2.fbclid) || '',
                landingPage: (window.GC_ATTR2 && window.GC_ATTR2.landingPage) || '',
                referrer:    (window.GC_ATTR2 && window.GC_ATTR2.referrer) || ''
            })
        });

        if (indicatorToRemove) indicatorToRemove.remove();

        // Even on 5xx, server now returns a useful JSON body, parse it first
        const data = await response.json().catch(() => null);
        if (!response.ok) {
            const realMsg = data?.reply || `Server error ${response.status}`;
            const errInfo = data?.error ? ` (${data.error.code || data.error.status || ''})` : '';
            const err = new Error(realMsg + errInfo);
            err.serverData = data;
            throw err;
        }

        // Per-attribute collection events + side-effects (tracking, PageSpeed warm-up)
        handleProfileUpdate(data.profile);

        // Parse [OPTIONS: ...] / [ROLE_OPTIONS: ...] out of the reply before rendering
        const { cleanText, options, isMulti, isRole } = parseOptions(data.reply);

        // Regex to parse Tension Delays: [DELAY: 2500]
        const delayRegex = /\[DELAY:\s*(\d+)\]/g;
        const parts = cleanText.split(delayRegex);
        
        let msgRow = null;

            for (let i = 0; i < parts.length; i += 2) {
                const chunkText = parts[i].trim();
                if (chunkText) {
                    msgRow = appendMessage(chunkText, 'ai');
                    scrollToBottom();
                }
                
                // If there's a subsequent delay token explicitly parsed
                if (i + 1 < parts.length) {
                    const ms = Math.min(parseInt(parts[i+1], 10) || 450, 650);
                    
                    // Add typing indicator dynamically
                    const typingRow = document.createElement('div');
                    typingRow.className = 'message-row ai-row';
                    typingRow.innerHTML = `
                        <div class="avatar ai-avatar"><img src="${api('/img/ai-avatar.png')}" alt="AI" style="width:100%;height:100%;border-radius:50%;object-fit:cover"></div>
                        <div class="message-content">
                            <div class="message-text typing-indicator">
                                <div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>
                            </div>
                        </div>
                    `;
                    chatMessagesArea.appendChild(typingRow);
                    scrollToBottom();
                    await new Promise(resolve => setTimeout(resolve, ms));
                    typingRow.remove();
                }
            }

        // Run stage detection BEFORE rendering options (so website input can suppress pills)
        detectStageFromReply(cleanText);

        // Render role cards or option pills below the message
        // But skip option pills if the website input card was just shown (it has its own skip button)
        const websiteInputJustShown = websiteInputVisible;

        // Always filter out "Show me the report" / "Book a strategy call" pills.
        // The report progress card transforms into a CTA card with these actions when the
        // report is actually ready, so AI-generated duplicates are redundant and confusing.
        let filteredOptions = options;
        if (options.length) {
            filteredOptions = options.filter(opt => {
                const o = opt.toLowerCase();
                return !(
                    o.includes('show me the report') ||
                    o.includes('show report') ||
                    o.includes('view report') ||
                    o.includes('open report') ||
                    o.includes('book a strategy') ||
                    o.includes('book a call') ||
                    o.includes('strategy call')
                );
            });
        }

        if (filteredOptions.length && msgRow && !websiteInputJustShown) {
            if (isRole) {
                renderRoleCards(filteredOptions, msgRow);
            } else {
                renderOptionPills(filteredOptions, isMulti, msgRow);
            }
        } else if (!websiteInputJustShown) {
             chatInput.disabled = false;
             chatInput.placeholder = "Message GrowClinic AI...";
             chatInput.focus();
        }

        // Show report CTA card, first time or if previous attempt failed
        if (data.reportUrl && !reportCTAShown) {
            if (data.isLeadCaptured) advanceStage(MAX_STAGES - 1); // step 6, report ready
            try {
                const CUR = { '+91': 'INR', '+971': 'AED', '+44': 'GBP', '+1': 'USD', '+61': 'AUD', '+65': 'SGD' };
                const cur = (typeof selectedCountry !== 'undefined' && CUR[selectedCountry.code]) || 'USD';
                if (typeof track === 'function') track('lead_captured', { value: 1, currency: cur, event_id: 'lead_' + sessionId });
            } catch (e) {}
            reportCTAShown = true;
            setTimeout(() => showReportCTA(data.reportUrl), 800);
        }
        // Safety net: if user clicks "Show me the report" and CTA was never shown
        // (e.g. LEAD_CAPTURED was missed on first pass), show it now
        if (data.reportUrl && data.isLeadCaptured && reportCTAShown) {
            // CTA already shown, just make sure it's visible (scroll to it)
            const existingCTA = document.querySelector('.report-cta-row');
            if (existingCTA) {
                existingCTA.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }

    } catch (error) {
        console.error('[Chat Error]', error, error.serverData);

        if (indicatorToRemove) indicatorToRemove.remove();

        // Visitor-facing error copy ONLY. This is a public lead tool used by
        // clinic owners — never expose server/config internals (API keys,
        // settings.json, terminal, "node server.js"). Keep it calm and
        // reassuring, and always invite a retry. Real diagnostics go to the
        // server logs + /api/health for the team, not to the visitor.
        let specificMsg = "⚠️ <strong>Sorry, I couldn't send that just now.</strong> Please try again in a moment.";
        try {
            const healthRes = await fetch(api('/api/health'));
            if (!healthRes.ok) {
                specificMsg = "⚠️ <strong>We're briefly unavailable.</strong> Please try again in a few moments — your details are safe.";
            }
        } catch {
            specificMsg = "⚠️ <strong>Connection lost.</strong> Please check your internet connection and try again.";
        }

        appendMessage(specificMsg, 'system');
        // Re-enable the input so the visitor can retry immediately (never leave
        // it stuck disabled after an error — that looks like a dead chat).
        try {
            chatInput.disabled = false;
            chatInput.placeholder = 'Message GrowClinic AI...';
            chatInput.focus();
        } catch (_e) {}
    } finally {
        setLoadingState(false);
        scrollToBottom();
    }
}

// ─────────────────────────────────────────────────────────────
// REPORT PROGRESS + CTA, live loading card → transforms to CTA
// ─────────────────────────────────────────────────────────────
const PROGRESS_STEPS = [
    { icon: '📋', label: 'Extracting clinic details' },
    { icon: '🗺️', label: 'Scanning Google Maps' },
    { icon: '⚡', label: 'Running website speed test' },
    { icon: '🤖', label: 'AI writing your report' },
    { icon: '📄', label: 'Finalising report' },
];

function showReportCTA(reportUrl) {
    // Build a centered modal overlay (instead of inline chat card)
    const overlay = document.createElement('div');
    overlay.className = 'report-overlay';
    overlay.id = 'report-overlay';
    overlay.innerHTML = `
        <div class="report-modal" id="report-modal">
            <div class="rm-orb">
                <div class="rm-orb-ring rm-orb-ring-1"></div>
                <div class="rm-orb-ring rm-orb-ring-2"></div>
                <div class="rm-orb-ring rm-orb-ring-3"></div>
                <div class="rm-orb-core">📊</div>
            </div>
            <div class="rm-title" id="rm-title">Generating Your Audit Report</div>
            <div class="rm-subtitle" id="rp-status-text">Starting analysis engine…</div>

            <div class="rm-bar-wrap">
                <div class="rm-bar-fill" id="rp-bar-fill" style="width: 5%"></div>
            </div>
            <div id="rp-pct" style="text-align:center;font-size:1.05rem;font-weight:800;color:#22c55e;margin-top:.6rem;letter-spacing:.01em">5%</div>

            <div style="margin-top:1.5rem;padding-top:1.25rem;border-top:1px solid rgba(255,255,255,0.08)">
                <div style="text-align:center;font-size:0.7rem;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:rgba(255,255,255,0.42);margin-bottom:.75rem">Powered by enterprise-grade AI</div>
                <div style="display:flex;align-items:center;justify-content:center;gap:.65rem;flex-wrap:wrap;font-size:0.95rem;font-weight:800;color:#eef2f8">
                    <span>OpenAI</span><span style="opacity:.3">•</span><span>Google Gemini</span><span style="opacity:.3">•</span><span>Google Cloud</span>
                </div>
                <div style="display:flex;align-items:center;justify-content:center;gap:.55rem;flex-wrap:wrap;font-size:0.78rem;color:rgba(255,255,255,0.55);margin-top:.55rem">
                    <span>🗺️ Live Google data</span><span style="opacity:.3">•</span><span>⚡ PageSpeed</span><span style="opacity:.3">•</span><span>📊 Real city benchmarks</span>
                </div>
            </div>

            <div class="rm-footer">⏱ Cross-checking your live data against clinic benchmarks…</div>
        </div>
    `;
    document.body.appendChild(overlay);

    // Force reflow so the entrance animation plays
    requestAnimationFrame(() => overlay.classList.add('open'));

    chatInput.disabled = true;
    sendBtn.disabled = true;
    chatInput.placeholder = 'Generating report, please wait...';

    // Start polling for progress
    let pollCount = 0;
    const maxPolls = 60; // 60 × 1.5s = 90 seconds max
    const pollInterval = setInterval(async () => {
        pollCount++;
        try {
            const res = await fetch(api(`/api/report-progress/${sessionId}`));
            const progress = await res.json();

            // Update progress bar + live completion percentage (real loader)
            const pct = Math.max(5, Math.min((progress.step / progress.total) * 100, 100));
            const barFill = document.getElementById('rp-bar-fill');
            if (barFill) barFill.style.width = pct + '%';
            const pctEl = document.getElementById('rp-pct');
            if (pctEl) pctEl.textContent = Math.round(pct) + '%';

            // Update status text
            const statusText = document.getElementById('rp-status-text');
            if (statusText) statusText.textContent = progress.message || 'Analysing your clinic…';

            scrollToBottom();

            // Report is ready, transform into CTA card
            if (progress.reportReady || progress.done) {
                clearInterval(pollInterval);
                setTimeout(() => transformToCTA(reportUrl), 600);
            }

        } catch (err) {
            console.warn('[Progress Poll] Error:', err);
        }

        // Timeout, show CTA anyway (report page has its own loading)
        if (pollCount >= maxPolls) {
            clearInterval(pollInterval);
            transformToCTA(reportUrl);
        }
    }, 1500);
}

function transformToCTA(reportUrl) {
    const modal = document.getElementById('report-modal');
    if (!modal) return;

    // Replace modal content with success state
    modal.classList.add('rm-success');
    modal.innerHTML = `
        <div class="rm-checkmark">
            <svg viewBox="0 0 52 52">
                <circle class="rm-check-circle" cx="26" cy="26" r="24" fill="none"/>
                <path class="rm-check-path" fill="none" d="M14 27 l8 8 16-16"/>
            </svg>
        </div>
        <div class="rm-title">Your Audit Report Is Ready</div>
        <div class="rm-subtitle">A personalised growth plan with GMB, speed, ads & 90-day roadmap.</div>
        <div class="rm-cta-actions">
            <a href="${reportUrl}" target="_blank" class="rm-cta-btn primary" onclick="try{track('report_view')}catch(e){}">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                </svg>
                See My Report
            </a>
        </div>
        <button class="rm-close-btn" id="rm-close-btn">Close</button>
    `;

    document.getElementById('rm-close-btn')?.addEventListener('click', () => {
        const overlay = document.getElementById('report-overlay');
        if (overlay) {
            overlay.classList.remove('open');
            setTimeout(() => overlay.remove(), 300);
        }
        chatInput.placeholder = 'Audit complete, open your report ☝️';
        if (resetBtnFooter) resetBtnFooter.style.display = 'flex';
    });

    chatInput.disabled = true;
    sendBtn.disabled = true;
    chatInput.placeholder = 'Audit complete, open your report ☝️';
    if (resetBtnFooter) resetBtnFooter.style.display = 'flex';
}

// ─────────────────────────────────────────────────────────────
// MESSAGE RENDERING, returns the row element
// ─────────────────────────────────────────────────────────────
function appendMessage(text, role) {
    if (role === 'system') {
        const row = document.createElement('div');
        row.className = 'message-row system-message';
        row.innerHTML = `<div class="message-text">${text}</div>`;
        chatMessagesArea.appendChild(row);
        scrollToBottom();
        return row;
    }

    const isUser = role === 'user';
    const row = document.createElement('div');
    row.className = `message-row ${isUser ? 'user-row' : 'ai-row'}`;

    const avatar = document.createElement('div');
    avatar.className = `avatar ${isUser ? 'user-avatar' : 'ai-avatar'}`;
    avatar.innerHTML = isUser
        ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>`
        : `<img src="${api('/img/ai-avatar.png')}" alt="AI" style="width:100%;height:100%;border-radius:50%;object-fit:cover">`;

    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';

    const textDiv = document.createElement('div');
    textDiv.className = 'message-text';

    if (!isUser && typeof marked !== 'undefined') {
        textDiv.innerHTML = marked.parse(text);
    } else if (isUser) {
        // User bubbles are plain text, never show raw markdown asterisks
        textDiv.innerHTML = stripMd(text);
    } else {
        textDiv.innerHTML = text; // allow safe HTML (links, bold etc.)
    }

    contentDiv.appendChild(textDiv);
    row.appendChild(avatar);
    row.appendChild(contentDiv);
    chatMessagesArea.appendChild(row);
    scrollToBottom();
    return contentDiv; // return content div for pill injection
}

function createTypingIndicator() {
    const row = document.createElement('div');
    row.className = 'message-row ai-row';
    row.id = 'typing-indicator';
    row.innerHTML = `
        <div class="avatar ai-avatar">
            <img src="${api('/img/ai-avatar.png')}" alt="AI" style="width:100%;height:100%;border-radius:50%;object-fit:cover">
        </div>
        <div class="message-content">
            <div class="message-text typing-indicator">
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
            </div>
        </div>
    `;
    return row;
}

// ─────────────────────────────────────────────────────────────
// UTILITIES
// ─────────────────────────────────────────────────────────────
function scrollToBottom() {
    chatMessagesArea.scrollTop = chatMessagesArea.scrollHeight;
}

function setLoadingState(isLoading) {
    chatInput.disabled = isLoading;
    sendBtn.disabled = isLoading;
    if (!isLoading) chatInput.focus();
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') chatInput.value = '';
});

// ─────────────────────────────────────────────────────────────
// BOOT
// ─────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', initChat);
