import * as cheerio from 'cheerio';

const KEYWORDS = /bonus|wager|playthrough|play-through|rollover|deposit|match|\b\d+x\b/i;
const MAX_CHARS = 6000; // keeps LLM input small and cheap

/**
 * Pull only the bonus-relevant free text from a review page:
 * the "Quick Facts" table rows plus paragraphs/list items that mention bonus terms.
 * Deterministic HTML handling here; the LLM only does the interpretation step.
 */
export function extractBonusText(html) {
  const $ = cheerio.load(html);
  $('script, style, noscript, nav, header, footer, aside, form, iframe').remove();

  const root = $('main').length ? $('main') : $('body');
  const lines = [];

  root.find('tr').each((_, tr) => {
    const cells = $(tr).find('th, td').map((__, c) => $(c).text().trim()).get();
    const row = cells.filter(Boolean).join(': ');
    if (row && KEYWORDS.test(row)) lines.push(row);
  });

  root.find('p, li, h2, h3').each((_, el) => {
    const text = $(el).text().replace(/\s+/g, ' ').trim();
    if (text.length > 15 && text.length < 600 && KEYWORDS.test(text)) lines.push(text);
  });

  const unique = [...new Set(lines)];
  let out = '';
  for (const line of unique) {
    if (out.length + line.length > MAX_CHARS) break;
    out += `- ${line}\n`;
  }
  return out.trim();
}
