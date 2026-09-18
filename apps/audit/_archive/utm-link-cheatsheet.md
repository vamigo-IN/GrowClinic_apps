# GrowClinic Audit — UTM Link Cheat-Sheet (max attribution accuracy)

**Why this matters:** LinkedIn, Instagram, and Reddit open links inside in-app
browsers that usually **strip the referrer** — so without UTM tags those clicks
land as "Direct". Tagging the links you post is the only way to get reliable,
100% attribution. The audit also auto-detects sources by referrer as a fallback
(incl. AI engines), but **always prefer tagged links for anything you post.**

## Rules
1. Link **directly to `audit.growclinic.io`** (not via growclinic.io) so the
   attribution isn't lost in the redirect to the subdomain.
2. Keep `utm_source` exactly as shown below (the tool maps these to the right
   channel). Change only `utm_campaign` to name the specific post/campaign.
3. For **paid** ads add `utm_medium=cpc` (or rely on the platform's click-id —
   gclid/fbclid/li_fat_id/msclkid/ttclid are auto-detected as that platform's Ads).

## Ready-to-paste links (organic posts)

| Where you post | Link to use |
|---|---|
| **LinkedIn** (post)   | `https://audit.growclinic.io/?utm_source=linkedin&utm_medium=social&utm_campaign=post1` |
| **LinkedIn** (bio)    | `https://audit.growclinic.io/?utm_source=linkedin&utm_medium=social&utm_campaign=bio` |
| **Instagram** (bio / link sticker) | `https://audit.growclinic.io/?utm_source=instagram&utm_medium=social&utm_campaign=bio` |
| **Instagram** (story) | `https://audit.growclinic.io/?utm_source=instagram&utm_medium=social&utm_campaign=story1` |
| **Pinterest** (pin)   | `https://audit.growclinic.io/?utm_source=pinterest&utm_medium=social&utm_campaign=pin1` |
| **Reddit** (post/comment) | `https://audit.growclinic.io/?utm_source=reddit&utm_medium=social&utm_campaign=subreddit` |
| **YouTube** (description) | `https://audit.growclinic.io/?utm_source=youtube&utm_medium=social&utm_campaign=video1` |
| **WhatsApp / Telegram** broadcast | `https://audit.growclinic.io/?utm_source=whatsapp&utm_medium=social&utm_campaign=broadcast1` |
| **Email / newsletter** | `https://audit.growclinic.io/?utm_source=email&utm_medium=email&utm_campaign=jun26` |

## Paid ads (add the paid medium)

| Platform | Link to use → shows as |
|---|---|
| **LinkedIn Ads** | `...?utm_source=linkedin&utm_medium=cpc&utm_campaign=...` → **LinkedIn Ads** |
| **Meta/Instagram Ads** | (Meta auto-adds `fbclid`) → **Meta Ads**. Or `utm_source=instagram&utm_medium=cpc`. |
| **Google Ads** | (auto-adds `gclid`) → **Google Ads** (turn on auto-tagging). |
| **Pinterest Ads** | `...?utm_source=pinterest&utm_medium=cpc&utm_campaign=...` → **Pinterest Ads** |
| **Reddit Ads** | `...?utm_source=reddit&utm_medium=cpc&utm_campaign=...` → **Reddit Ads** |

## AI traffic (ChatGPT, Perplexity, Gemini, Claude, Copilot, etc.)
You usually **can't tag** these — when an AI cites your page, the visitor arrives
with the AI's referrer, which the tool already detects and labels **"AI (ChatGPT…)"**.
Nothing to do; just keep your robots.txt welcoming the AI crawlers (already done).
If you ever post your own link somewhere AI-related that you control, you can add
`utm_source=ai`.

## How it shows up
Each tagged visit appears in **Admin → Marketing** (and the Leads "Source" column)
as its own colour-coded channel — LinkedIn, Instagram, Pinterest, Reddit, AI, etc.
— with the full funnel (Visitors → Audit → Lead → OTP sent → Verified) per source.
