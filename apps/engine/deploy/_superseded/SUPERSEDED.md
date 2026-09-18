# Superseded — do not use

These files were Engine's standalone VPS kit: its own MySQL container, its own
Nginx binding host ports **80/443**, and its own Certbot loop.

They are replaced by the unified GrowClinic platform stack at the repository
root (`docker-compose.yml`), which provides:

- the shared PostgreSQL service (Engine uses schema `engine`),
- the central `reverse-proxy` (no 80/443 binding on the VPS — the existing VPS
  Nginx terminates TLS and forwards to the platform proxy),
- the controlled `migrate` job (`prisma migrate deploy`, never `db push` at boot),
- `apps/engine/Dockerfile` as the Engine image.

Running `docker compose up` in this folder on the production VPS would try to
bind ports 80/443 (already used by the VPS Nginx) and start a second, unmanaged
database. Kept only for reference/history.
