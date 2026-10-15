# Taking this to production: 200 casinos, updated daily

**Where it runs.** I'd use one Hetzner Cloud VPS (CX22: 2 vCPU, 4 GB RAM, EU region) running Docker Compose with three containers: the Node scraper, PostgreSQL and Caddy. Scraping 200 pages once a day is a small job, so Kubernetes or a managed platform would add cost and complexity for no real benefit. A VPS has a fixed price, I can SSH in to debug, and Docker makes it easy to move to another provider.

**Database and backups.** PostgreSQL. One table lists the casinos and their source URLs. A second table stores one row per casino per day with the bonus fields, the raw scraped text and any validation warnings, so I keep a history of every change and can show where each value came from. Every night `pg_dump` makes a backup, and restic encrypts it and sends it off the server to a Hetzner Storage Box. I'd keep 7 daily, 4 weekly and 6 monthly copies, and test a restore once a month.

**Domain, DNS and HTTPS.** I'd buy the domain through Cloudflare and use Cloudflare DNS, which adds caching and DDoS protection for free. Caddy gets and renews Let's Encrypt certificates automatically, and Cloudflare's "Full (strict)" mode keeps traffic encrypted end to end.

**Scheduling and knowing it failed.** A cron job (or systemd timer) runs the scraper every day at 05:00 UTC, about 4 pages at a time. It retries network errors but never works around a block. When a run succeeds, it pings Healthchecks.io. If no ping arrives by 06:00, I get an email. That also catches the server being down. I'd also get an alert if more than 5% of casinos fail, or if a field suddenly goes empty across many casinos, which usually means the site layout changed.

**Monthly cost (rough).** VPS about $5, backups about $4, domain about $1, LLM calls about $5–15. Cloudflare and Healthchecks.io are free. Total: about **$15–25 a month**.
