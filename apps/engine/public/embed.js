/* GrowClinic Engine — embeddable lead connector.
 * Usage on any site (Webflow / WordPress / coded):
 *   <script src="https://engine.growclinic.io/embed.js" data-key="CLINIC_KEY" defer></script>
 *
 * Behaviour:
 *  - Auto-binds to any <form data-engine="lead"> on the page (recommended), OR
 *    if none present, to every <form> (opt-out with data-engine="ignore").
 *  - On submit, collects fields by name (name, phone, email, message, treatment)
 *    plus UTM params, POSTs JSON to the ingest endpoint, and lets the form's own
 *    success behaviour run. Non-blocking; never breaks the host page.
 */
(function () {
  var script = document.currentScript;
  if (!script) return;
  var KEY = script.getAttribute('data-key');
  if (!KEY) { console.warn('[GrowClinic] missing data-key on embed script'); return; }

  // Derive the engine origin from this script's own URL.
  var ENDPOINT = new URL(script.src).origin + '/api/ingest/lead';

  function utm() {
    var p = new URLSearchParams(window.location.search);
    var out = {};
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'].forEach(function (k) {
      if (p.get(k)) out[k] = p.get(k);
    });
    out.referrer = document.referrer || undefined;
    out.page = window.location.href;
    return out;
  }

  function field(form, names) {
    for (var i = 0; i < names.length; i++) {
      var el = form.querySelector('[name="' + names[i] + '"]');
      if (el && el.value) return el.value.trim();
    }
    return '';
  }

  function send(form) {
    var payload = {
      key: KEY,
      name: field(form, ['name', 'fullname', 'full_name', 'Name']),
      phone: field(form, ['phone', 'mobile', 'tel', 'Phone', 'number']),
      email: field(form, ['email', 'Email', 'email_address']),
      message: field(form, ['message', 'notes', 'comments', 'concern']),
      treatment: field(form, ['treatment', 'service', 'interest']),
      source: form.getAttribute('data-source') || (window.location.hostname + window.location.pathname),
      meta: utm()
    };
    // Fire-and-forget; keepalive lets it complete even as the page navigates.
    try {
      fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true
      }).catch(function () {});
    } catch (e) {}
  }

  function bind(form) {
    if (form.getAttribute('data-engine') === 'ignore') return;
    if (form.__gcBound) return;
    form.__gcBound = true;
    form.addEventListener('submit', function () { send(form); }, { capture: true });
  }

  function init() {
    var tagged = document.querySelectorAll('form[data-engine="lead"]');
    var forms = tagged.length ? tagged : document.querySelectorAll('form');
    forms.forEach(bind);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
