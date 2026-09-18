# Deploying GrowClinic to Railway

A 10-minute guide. Reproduce the same steps on Render or Fly.io if you'd rather.

## Prerequisites

- A GitHub account
- A [Railway](https://railway.app/) account (free tier covers a small clinic chatbot)
- Your three API keys: **OpenAI**, **Gemini**, **Google Cloud (Places + PageSpeed)**

## 1. Push the code to GitHub

From your project folder:

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main

# Create an empty repo on github.com first, then:
git remote add origin https://github.com/<your-username>/growclinic-audit-tool.git
git push -u origin main
```

`.gitignore` already excludes `node_modules`, `*.sqlite`, `reports/`, `.env`, and `settings.json`, so secrets never leave your machine.

## 2. Create a Railway project

1. Go to https://railway.app/new
2. Pick **Deploy from GitHub repo**
3. Authorise Railway and select your repo
4. Railway auto-detects Node + uses `nixpacks.toml` to install Python + GCC for `better-sqlite3`
5. First build takes ~2 minutes. It will fail on first boot because env vars aren't set yet — that's fine.

## 3. Add a persistent volume (CRITICAL)

Without this, your SQLite database and saved reports will be wiped on every redeploy.

1. In your Railway service → **Settings** → **Volumes**
2. Click **+ New Volume**
3. Mount path: `/data`
4. Click **Create**

## 4. Set environment variables

In **Variables** tab, add:

| Variable | Value |
|---|---|
| `OPENAI_API_KEY` | `sk-proj-...` |
| `GEMINI_API_KEY` | `AIza...` |
| `GOOGLE_API_KEY` | `AIza...` |
| `DATA_DIR` | `/data` |
| `NODE_ENV` | `production` |
| `WEBHOOK_URL` | (optional) Slack/Make.com URL |

**Don't set `PORT`** — Railway injects it automatically.

## 5. Redeploy

Click **Deploy** (or push another commit). The new build will:
- Install dependencies with native compile support
- Mount `/data` as a persistent volume
- Boot `node server.js`
- Health-check `GET /api/health` — must return 200 within 30s

When it's green, click the auto-generated URL or set up a custom domain in **Settings → Networking**.

## 6. First-run admin password

On the very first boot, the server generates an admin password and prints it to the Railway **Deploy Logs**. Look for a banner like:

```
═══════════════════════════════════════════════════════
🔐  ADMIN PASSWORD GENERATED — SAVE IT NOW (shown only once):

      <16-character password>

   Username: admin
   URL:      http://localhost:3000/admin
═══════════════════════════════════════════════════════
```

**Copy it immediately.** It's hashed in the DB and shown only once. If you miss it, see "Resetting the admin password" below.

## 7. Log in to the admin dashboard

Visit `https://<your-railway-url>/admin`, log in with `admin` + the password above. Then:

1. **🔐 Security** tab → **Enable 2FA** → scan the QR with Google Authenticator/Authy → enter the 6-digit code → Activate. Save the 2FA codes.
2. **🔑 API Keys** tab → confirm OpenAI, Gemini, Google all show as "SET". If any are blank, paste them in here.
3. **💬 Chats** tab → live counter, search, view transcripts, delete.
4. **📊 API Usage** tab → token consumption per provider, day/week/month buckets.

## Resetting the admin password

If you forget it:

1. Connect to your Railway service shell (or use Railway CLI: `railway shell`)
2. `sqlite3 /data/growclinic.sqlite "DELETE FROM settings WHERE keyName='ADMIN_PASSWORD_HASH'"`
3. Restart the service. A new password will print to the deploy logs.

## Custom domain

In Railway → Settings → Networking → **Generate Domain** for a free `*.up.railway.app` URL, or **Add Custom Domain** to use your own. Add the CNAME record they show you.

Once you have the production URL, go to:
- https://platform.openai.com/api-keys → restrict the OpenAI key to that domain
- https://console.cloud.google.com/apis/credentials → restrict the Google + Gemini keys to HTTP referrer `https://yourdomain.com/*`

## Troubleshooting

| Symptom | Fix |
|---|---|
| Build fails with "python: not found" | `nixpacks.toml` is in the repo? It pins python3 + gcc. |
| Server boots but admin login says "Invalid password" | Copy the password from deploy logs (no trailing spaces). |
| Chat works but reports vanish after redeploy | Volume not mounted. Check `/data` exists in Settings → Volumes. |
| Chat shows "Gemini API key missing" | Either `GEMINI_API_KEY` env var wasn't set, or you removed it via the admin UI. Re-add it. |
| `REQUEST_DENIED` in GMB lookup | Places API not enabled on your Google Cloud project, or billing not set up. |

## Updating the deployed app

Just `git push`. Railway watches your repo's `main` branch and auto-redeploys on every push.

```bash
git add .
git commit -m "your change"
git push
```

Build, run health check, swap the live container — usually under 2 minutes with zero downtime.

---

## Alternative: Deploy to Hostinger (VPS path)

Hostinger's shared/Premium hosting can't run `better-sqlite3` (native module). You need a **VPS** plan or **Cloud Hosting** with full SSH + Node.js access.

### 1. Pick a Hostinger plan

- **VPS 1** (~$5/mo) — minimum: 4 GB RAM, 50 GB SSD, 1 vCPU. Plenty for this app.
- **Cloud Startup** — also works if it has Node.js + SSH.

Buy the plan and wait for the activation email with SSH credentials.

### 2. Connect via SSH

```bash
ssh root@<your-vps-ip>
# Or use Hostinger's Browser Terminal in hPanel → VPS → SSH Access
```

### 3. Install Node 20 + git + build tools

```bash
# Ubuntu/Debian VPS
apt update && apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs git python3 build-essential
node -v   # should print v20.x
```

### 4. Clone and install the app

```bash
cd /opt
git clone https://github.com/<your-username>/growclinic-audit-tool.git
cd growclinic-audit-tool
npm install --omit=dev
```

### 5. Create the data directory

```bash
mkdir -p /var/lib/growclinic
chown -R $USER /var/lib/growclinic
```

### 6. Create `.env`

```bash
nano .env
```

Paste:

```env
OPENAI_API_KEY=sk-proj-...
GEMINI_API_KEY=AIza...
GOOGLE_API_KEY=AIza...
NODE_ENV=production
DATA_DIR=/var/lib/growclinic
PORT=3000
```

Save (Ctrl+O, Enter, Ctrl+X).

### 7. Run with PM2 (process manager)

```bash
npm install -g pm2
pm2 start server.js --name growclinic
pm2 save
pm2 startup    # follow the printed command to enable autostart on reboot
```

`pm2 logs growclinic` shows live output (look for the admin password banner on first start — copy it once).

### 8. Open the firewall + reverse proxy

The app runs on port 3000 internally. To expose it on port 80/443 with HTTPS, install nginx + certbot:

```bash
apt install -y nginx certbot python3-certbot-nginx
```

Edit `/etc/nginx/sites-available/growclinic`:

```nginx
server {
    listen 80;
    server_name your-temp-domain.hostingersite.com;

    client_max_body_size 1m;
    proxy_read_timeout 60s;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable + reload:

```bash
ln -s /etc/nginx/sites-available/growclinic /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

### 9. Get a free Hostinger temporary subdomain

Hostinger gives you a free temporary subdomain like `your-app.hostingersite.com` automatically when you buy a VPS. Find it in:

- **hPanel** → **VPS** → your server → **Network** → look for **Hostname** or **Temporary URL**
- Point its DNS A record at your VPS IP (`hPanel → Domains → DNS Zone Editor`)

Or if you have a real domain, point its A record at the VPS IP.

### 10. Add HTTPS

Once DNS resolves to your VPS:

```bash
certbot --nginx -d your-temp-domain.hostingersite.com
```

Certbot auto-edits the nginx config to redirect HTTP → HTTPS. The cert renews itself.

### 11. Visit

- Chat: `https://your-temp-domain.hostingersite.com`
- Admin: `https://your-temp-domain.hostingersite.com/admin`

### Updating the Hostinger app

Push to git, then SSH in and:

```bash
cd /opt/growclinic-audit-tool
git pull
npm install --omit=dev
pm2 restart growclinic
```

PM2 keeps the old process alive until the new one is healthy.

---

## Auto-deploy: GitHub → Hostinger (recommended)

The repo includes `.github/workflows/deploy.yml`. It deploys to your Hostinger VPS on every push to `main` — no manual SSH needed.

### One-time setup (10 minutes)

**1. On your Mac — generate an SSH key dedicated to deploys:**

```bash
ssh-keygen -t ed25519 -f ~/.ssh/growclinic_deploy -N "" -C "growclinic-github-actions"
```

This creates two files:
- `~/.ssh/growclinic_deploy` — the **private** key (goes to GitHub)
- `~/.ssh/growclinic_deploy.pub` — the **public** key (goes to Hostinger)

**2. On your Hostinger VPS — install the public key:**

```bash
# SSH in once manually
ssh root@<your-vps-ip>

# Add the deploy key to authorized_keys
mkdir -p ~/.ssh && chmod 700 ~/.ssh
echo "<paste-the-contents-of-growclinic_deploy.pub-here>" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

Get the contents of the `.pub` file with `cat ~/.ssh/growclinic_deploy.pub` on your Mac.

**3. Test the key works (from your Mac):**

```bash
ssh -i ~/.ssh/growclinic_deploy root@<your-vps-ip> "echo deploy-key works"
```

If that prints `deploy-key works`, the key is good.

**4. On GitHub — add the secrets:**

Go to your repo → **Settings → Secrets and variables → Actions → New repository secret**. Add these:

| Name | Value |
|---|---|
| `HOSTINGER_HOST` | Your VPS IP, e.g. `123.45.67.89` |
| `HOSTINGER_USER` | `root` (or whatever Linux user owns `/opt/growclinic-audit-tool`) |
| `HOSTINGER_SSH_KEY` | **Paste the contents of `~/.ssh/growclinic_deploy`** (the private key, including the `-----BEGIN…` and `-----END…` lines) |
| `HOSTINGER_PORT` | `22` (only set if you use a non-standard SSH port) |
| `HOSTINGER_APP_DIR` | `/opt/growclinic-audit-tool` (only set if you cloned to a different path) |
| `HOSTINGER_APP_PORT` | `3000` (only set if your app listens on a different port) |

**5. On Hostinger — clone the repo if you haven't already:**

```bash
ssh root@<your-vps-ip>
cd /opt
git clone https://github.com/<your-user>/<your-repo>.git growclinic-audit-tool
cd growclinic-audit-tool
npm install --omit=dev
nano .env   # set OPENAI_API_KEY, GEMINI_API_KEY, GOOGLE_API_KEY, NODE_ENV=production, DATA_DIR=/var/lib/growclinic, PUBLIC_ORIGIN=https://your-domain
pm2 start server.js --name growclinic
pm2 save
pm2 startup
```

Then `cat /var/lib/growclinic/.admin-password` to grab the auto-generated admin password (saved to file with 0600 perms — never logged).

**6. Trigger your first auto-deploy:**

```bash
# On your Mac — make any small change
git commit --allow-empty -m "Trigger first auto-deploy"
git push origin main
```

Open the **Actions** tab in your GitHub repo. You'll see the workflow run live: SSH connection → git pull → npm install → pm2 reload → health check on `/api/health`. Should be green in under 90 seconds.

### After setup

Every `git push origin main` from now on auto-deploys to Hostinger. To deploy manually without a code change, go to **Actions → Deploy to Hostinger → Run workflow**.

If a deploy fails, the Actions log shows exactly which step broke. Common issues:

| Error in workflow log | Fix |
|---|---|
| `Permission denied (publickey)` | Public key not in `~/.ssh/authorized_keys` on VPS, or wrong `HOSTINGER_USER` |
| `Host key verification failed` | First-time SSH from Actions runner — add `StrictHostKeyChecking=no` (already handled by appleboy/ssh-action) |
| `npm install` fails | Likely missing build tools — `apt install -y python3 build-essential` on VPS |
| Health check fails | Check `pm2 logs growclinic` on VPS for the actual error |

---


