# Casino Bonus Scraper

Pulls welcome-bonus terms for 3 online casinos from one public source ([CasinoTop10](https://www.casinotop10.net)), uses an LLM to turn the free-text terms into structured fields, writes them to JSON, and renders a phone-friendly table.

**Live page:** https://mellomeydzak-ai.github.io/casino-bonus-scraper/

| Field | JSON key |
|---|---|
| Welcome bonus | `welcome_bonus` |
| Wagering requirement (multiplier) | `wagering_multiplier` |
| Minimum deposit | `minimum_deposit` |
| Source URL | `source_url` |

## Install and run

Requires Node.js 20.12+ and an Anthropic **or** OpenAI API key.

```bash
git clone https://github.com/mellomeydzak-ai/casino-bonus-scraper.git
cd casino-bonus-scraper
npm install
cp .env.example .env        # then paste your API key into .env
npm run scrape              # the single command
```

Output goes to `data/casinos.json`, with a copy at `docs/casinos.json` for the page. To view the page locally, run `npm run serve` and open the printed URL.

## How it works

```
config.js          3 casino review URLs + polite crawl settings
lib/fetch.js       robots.txt check → fetch; stops (doesn't work around) on 401/403/429/503 or a challenge page
lib/extract.js     cheerio: keeps only bonus-related lines (Quick Facts table + paragraphs mentioning bonus/deposit/wagering)
lib/llm.js         LLM step: free text → {welcome_bonus, wagering_multiplier, minimum_deposit, evidence}
lib/validate.js    guardrails: types/ranges, and each value's quoted evidence must appear in the source text
scrape.js          orchestrates, writes JSON, exits non-zero if every casino fails
docs/index.html    static page: fetches casinos.json and renders a table (stacked cards on phones)
```

**Design choices**
- **Deterministic first, LLM second.** HTML parsing and trimming are plain code. The model gets about 6 KB of relevant text, not the whole page, which keeps calls cheap and reduces distraction.
- **No guessing.** The prompt tells the model to return `null` when a term isn't stated, and to quote its evidence. `validate.js` discards any value whose evidence isn't in the scraped text. The page shows "Not stated" instead of an invented number. Some US review pages don't state a wagering multiplier, and a blank is more honest than a plausible-looking "15x".
- **Polite scraping.** It identifies itself with a User-Agent string, honours robots.txt (re-checked every run), waits 3 seconds between requests, and never retries around blocks.
- **Partial failure is visible.** A failed casino still gets a row with its error message, so the page never silently drops data.

## Deploy (GitHub Pages)

1. Push the repo to GitHub, including the generated `docs/casinos.json`.
2. Go to **Settings → Pages → Build and deployment**, set **Source: Deploy from a branch** and **Branch: `main` / `/docs`**, then save.
3. The page goes live at `https://<username>.github.io/casino-bonus-scraper/` within a minute or two.

## Known limitations

- The source is a US affiliate site, so amounts are in USD, not EUR.
- The casino list is fixed in `config.js`. Discovering casinos from the site's listing pages would be the next step.
- The extraction is tuned to this site's review-page layout. A second source would need its own extractor, or a broader text selection.
