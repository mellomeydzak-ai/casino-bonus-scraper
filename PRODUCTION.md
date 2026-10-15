# Taking this to production: 200 casinos, updated daily

**Where it runs.** A single Hetzner Cloud VPS (CX22: 2 vCPU, 4 GB RAM, EU region) running Docker Compose, with three containers: the Node scraper, PostgreSQL, and Caddy. A daily batch of 200 pages is light work, so a managed platform or Kubernetes would add cost and moving parts without adding much. The cost is predictable, I can SSH in to debug, and the setup moves to another provider easily if needed.

**Database and backups.** PostgreSQL 16. A `casinos` table holds the source URLs, and a `bonus_snapshots` table stores one row per casino per day: the structured fields, the raw extracted text, a text hash, and any validation warnings. This gives history ("when did the wagering change?") and an audit trail for disputed values. Backups run nightly with `pg_dump`, encrypted and pushed with restic to a Hetzner Storage Box (or Backblaze B2), keeping 7 daily, 4 weekly and 6 monthly copies. Weekly Hetzner server snapshots sit on top of that. I'd test a restore into a scratch container once a month, because an untested backup isn't a backup.

**Domain, DNS and HTTPS.** Register the domain at Cloudflare Registrar and use Cloudflare DNS (proxied), which also gives caching and DDoS protection. Caddy issues and renews Let's Encrypt certificates automatically, and Cloudflare runs in "Full (strict)" mode so traffic is encrypted end to end. After each run, the scraper generates the public page as static HTML plus JSON, served by Caddy and cached at the edge.

**Scheduling and knowing it failed.** A systemd timer (or host cron) starts the scraper at 05:00 UTC. A worker pool limits concurrency (about 4 at a time, with rate limits per domain), and each casino gets up to 2 retries for network errors. It never retries a 403 or a CAPTCHA, which instead get flagged to switch source. To save cost, the LLM only runs when a page's text hash has changed. Failures surface in three ways:
1. **Dead-man's switch:** the run pings Healthchecks.io on success. If no ping arrives by 06:00, I get an email or Slack alert, which also covers the box being down.
2. **Quality thresholds:** an alert fires if more than 5% of casinos fail, if a field suddenly goes null for many casinos (a sign of a layout change), or if a value moves sharply (e.g. wagering 35 → 3).
3. **Sentry** catches code exceptions.

**Rough monthly cost**
| Item | ~USD/month |
|---|---|
| Hetzner CX22 VPS | 5 |
| Storage Box / B2 backups + snapshots | 3–5 |
| Domain (~$10–15/yr) | 1 |
| Cloudflare, Healthchecks.io, Sentry (free tiers) | 0 |
| LLM (Haiku-class; ~200 × 2k tokens/day, less with change detection) | 5–15 |
| **Total** | **≈ $15–30** |
