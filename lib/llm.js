// LLM step: turn free-text bonus terms into structured fields.
// Supports Anthropic (default) or OpenAI via plain fetch, so there is no SDK dependency.

const PROMPT = `You extract online-casino welcome-bonus terms from review-page text.
Return ONLY a JSON object with exactly these keys:
{
  "welcome_bonus": string|null,          // short form, e.g. "100% up to 1,000 USD"; include free spins/extras if part of the offer
  "wagering_multiplier": number|null,    // the playthrough multiplier, e.g. 35 for "35x"; numbers only
  "minimum_deposit": string|null,        // amount + ISO currency, e.g. "10 USD"
  "evidence": { "welcome_bonus": string|null, "wagering_multiplier": string|null, "minimum_deposit": string|null }
}
Rules:
- Use only the text provided. Never use outside knowledge or guess.
- If a value is not stated in the text, return null for it (and null evidence).
- "evidence" is the exact short phrase from the text that supports each value.
- Convert "$" to "USD", "€" to "EUR", "£" to "GBP".
- Prefer the current headline welcome offer over older offers mentioned in news/updates sections.`;

function parseJson(text) {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error(`LLM did not return JSON: ${text.slice(0, 200)}`);
  return JSON.parse(match[0]);
}

async function callAnthropic(content) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.LLM_MODEL || 'claude-haiku-5-5',
      max_tokens: 600,
      system: PROMPT,
      messages: [{ role: 'user', content }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic API ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.content.map((b) => b.text || '').join('');
}

async function callOpenAI(content) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.LLM_MODEL || 'gpt-4o-mini',
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: PROMPT },
        { role: 'user', content },
      ],
    }),
  });
  if (!res.ok) throw new Error(`OpenAI API ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.choices[0].message.content;
}

export async function structureBonus(casinoName, bonusText) {
  const content = `Casino: ${casinoName}\n\nText from the review page:\n${bonusText}`;
  if (process.env.ANTHROPIC_API_KEY) return parseJson(await callAnthropic(content));
  if (process.env.OPENAI_API_KEY) return parseJson(await callOpenAI(content));
  throw new Error('Set ANTHROPIC_API_KEY or OPENAI_API_KEY (see .env.example)');
}
