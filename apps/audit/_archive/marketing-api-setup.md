# Marketing Tab — connect GA4 + Meta (live columns)

After deploying, go to **Admin → Tracking** and fill these four fields, then open
**Admin → Marketing**. The columns fill in automatically (cached ~10 min).

## GA4 (fully accurate — matches your GA4 events)

You need a **GA4 Property ID** and a **service-account JSON**.

1. **Property ID:** GA4 → Admin → Property Settings → "PROPERTY ID" (a number like `123456789`). Paste into **GA4 Property ID**.
2. **Service account:**
   - Google Cloud Console → the project linked to your GA4 → APIs & Services → **Enable** the *Google Analytics Data API*.
   - IAM & Admin → Service Accounts → **Create service account** → done (no roles needed).
   - Open it → **Keys → Add key → JSON** → downloads a `.json` file.
   - GA4 → Admin → **Property Access Management** → add the service account's email (the `client_email` from the JSON, ends in `.iam.gserviceaccount.com`) as **Viewer**.
   - Open the downloaded `.json`, copy its **entire contents**, paste into **GA4 service-account JSON**.
3. Save. The GA4 column now shows live `page_view`, `audit_start`, `lead_captured`, `otp_sent`, `otp_verified`, etc., for the selected period.

## Meta (ad-attributed only — see note)

> ⚠️ Meta does **not** expose Events Manager pixel totals (the PageView/Lead
> counts you screenshotted) through any public API. Only **ad-attributed actions**
> are readable via the Marketing API. So the Meta column shows ads-driven events
> (mainly `landing_page_view` and `lead`), not your full pixel totals. If you
> don't run Meta ads yet, leave these blank — the column stays on "Connect".

1. **Ad Account ID:** Meta Ads Manager → top-left account picker → the `act_XXXXXXXXXX` id. Paste into **Meta Ad Account ID**.
2. **Access token (ads_read):** Meta Business Settings → Users → System Users → create a system user → **Generate token** for your app with the **`ads_read`** permission (use a long-lived/system-user token so it doesn't expire). Paste into **Meta Graph API token**.
3. Save.

## Notes
- Credentials are stored in your settings DB and only used server-side for read-only reporting. Rotate them anytime from the same screen.
- Results are cached ~10 minutes per period to stay within API limits.
- If a column shows **"error"**, hover it — the exact API message is in the tooltip (usually a permission/property-id/token issue).
