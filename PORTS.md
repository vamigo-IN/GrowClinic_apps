# Port report — GrowClinic platform

> **Rule:** a host port is only bound after it has been verified free on *that*
> host, at *that* time, with `sudo ss -lntup` (and `sudo lsof -i :PORT` where
> useful). A port that was free yesterday, or on another machine, proves nothing.
> If a port is taken, **do not stop the process that owns it** — pick another
> verified port.
>
> `./scripts/check-ports.sh [PORT…]` performs this check (ss → lsof → netstat
> fallback) and also refuses the known production ports below.

## Host port vs container port

`127.0.0.1:18080:80` means *host* loopback port 18080 → *container* port 80.
All four application containers listen on container port **3000**. That is not
a conflict: each container has its own network namespace, and none of them
publishes a host port. Only the reverse proxy publishes one.

| Service        | Container port | Published on host |
|----------------|----------------|-------------------|
| reverse-proxy  | 80             | `PROXY_HTTP_BIND` (default `127.0.0.1:18080`) |
| growclinic     | 3000           | no (`expose` only) |
| audit          | 3000           | no |
| gmb            | 3000           | no |
| engine         | 3000           | no |
| postgres       | 5432           | no (optional `127.0.0.1:15432` via `compose.dbtools.yml`) |
| redis          | 6379           | no (optional `127.0.0.1:16379` via `compose.dbtools.yml`) |
| migrate        | —              | no (one-shot job) |

## Current production ports (Hostinger VPS)

Observed with `sudo ss -tulpn` on the production VPS. **Never used by this stack.**

| Port  | Notes |
|-------|-------|
| 22    | SSH |
| 80    | existing VPS Nginx (HTTP) |
| 443   | existing VPS Nginx (HTTPS) |
| 3000  | existing service |
| 3001  | existing service |
| 3050  | existing service |
| 5001  | existing service |
| 5050  | existing service |
| 5432  | existing PostgreSQL |
| 5433  | existing PostgreSQL |
| 5678  | existing service (n8n default) |
| 6379  | existing Redis |
| 8087  | existing service |
| 8090  | existing service |
| 8091  | existing service |
| 65529 | existing service |

The platform binds **no** port 80/443 on the VPS (TLS stays with the existing
Nginx), and neither PostgreSQL nor Redis is published there.

## Local development target

| Host binding        | Purpose | Required | Verified on the dev machine (2026-09-17) |
|---------------------|---------|----------|------------------------------------------|
| `127.0.0.1:18080`   | reverse proxy HTTP | yes | free ✅ |
| `127.0.0.1:18443`   | reverse proxy HTTPS (`compose.local-https.yml`, mkcert) | optional | free ✅ |
| `127.0.0.1:15432`   | PostgreSQL for GUI tools (`compose.dbtools.yml`) | optional | free ✅ |
| `127.0.0.1:16379`   | Redis for GUI tools (`compose.dbtools.yml`) | optional | free ✅ |

All local bindings are loopback-only, so nothing is reachable from the LAN.

## Production

**Must be dynamically verified immediately before deployment. Never hardcode
the assumption that a port is free** — including 18080.

```bash
sudo ss -lntup
./scripts/check-ports.sh 18080          # or the candidate you intend to use
sudo lsof -i :18080                     # optional second opinion
```

1. If `18080` is free → `PROXY_HTTP_BIND=127.0.0.1:18080` in `.env`.
2. If it is taken → choose another high port (e.g. 18180, 28080), verify it the
   same way, set `PROXY_HTTP_BIND=127.0.0.1:<port>`, and use that port in the VPS
   Nginx `proxy_pass` (see ARCHITECTURE.md → Production deployment model).
3. Record the chosen port and the `ss` output in the deployment log.

Binding to `127.0.0.1` (not `0.0.0.0`) means only the VPS itself — i.e. the
existing Nginx — can reach the platform proxy; the port is never exposed to
the Internet even if the VPS firewall is open.
