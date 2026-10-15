#!/usr/bin/env node
// Usage: npm run scrape   (writes data/casinos.json and docs/casinos.json)
import { mkdir, writeFile } from 'node:fs/promises';
import { CASINOS, SOURCE, REQUEST_DELAY_MS } from './config.js';
import { fetchPage } from './lib/fetch.js';
import { extractBonusText } from './lib/extract.js';
import { structureBonus } from './lib/llm.js';
import { validate } from './lib/validate.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function scrapeOne(casino) {
  const warnings = [];
  const { html, finalUrl } = await fetchPage(casino.url);
  const text = extractBonusText(html);
  if (!text) throw new Error('No bonus-related text found on page (layout may have changed)');

  const raw = await structureBonus(casino.name, text);
  const fields = validate(raw, text, warnings);

  return {
    casino: casino.name,
    ...fields,
    source_url: finalUrl,
    scraped_at: new Date().toISOString(),
    warnings,
  };
}

async function main() {
  const results = [];
  let failures = 0;

  for (const [i, casino] of CASINOS.entries()) {
    if (i > 0) await sleep(REQUEST_DELAY_MS);
    process.stdout.write(`→ ${casino.name} ... `);
    try {
      const row = await scrapeOne(casino);
      results.push(row);
      console.log(row.warnings.length ? `ok (${row.warnings.length} warning/s)` : 'ok');
      row.warnings.forEach((w) => console.log(`   ⚠ ${w}`));
    } catch (err) {
      failures++;
      console.log(`FAILED: ${err.message}`);
      results.push({ casino: casino.name, source_url: casino.url, error: err.message,
        welcome_bonus: null, wagering_multiplier: null, minimum_deposit: null,
        scraped_at: new Date().toISOString(), warnings: [] });
    }
  }

  const output = {
    source: SOURCE,
    generated_at: new Date().toISOString(),
    casinos: results,
  };

  const json = JSON.stringify(output, null, 2) + '\n';
  await mkdir('data', { recursive: true });
  await writeFile('data/casinos.json', json);
  await writeFile('docs/casinos.json', json); // copy served by GitHub Pages
  console.log(`\nWrote data/casinos.json and docs/casinos.json (${results.length - failures}/${results.length} ok)`);

  if (failures === results.length) process.exit(1); // non-zero exit so a scheduler can alert
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
