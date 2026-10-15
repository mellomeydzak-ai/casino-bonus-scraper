// Guardrails on LLM output: types, sane ranges, and "the evidence must really be in the source text".
// Anything that fails becomes null with a warning, rather than a confident wrong value.

const norm = (s) => s.toLowerCase().replace(/\s+/g, ' ').trim();

// The prompt asks for ISO codes, but the model doesn't always comply, so enforce it in code:
// "$10" → "10 USD", "€1,000" → "1,000 EUR", "£5" → "5 GBP".
const CURRENCY = { $: 'USD', '€': 'EUR', '£': 'GBP' };
const toIsoCurrency = (s) =>
  s == null ? s : s.replace(/([$€£])\s?(\d[\d,]*(?:\.\d+)?)/g, (_, sym, amt) => `${amt} ${CURRENCY[sym]}`);

export function validate(result, sourceText, warnings) {
  const src = norm(sourceText);
  const ev = result.evidence || {};

  const checkEvidence = (field) => {
    if (result[field] == null) return;
    if (!ev[field] || !src.includes(norm(ev[field]))) {
      warnings.push(`${field}: evidence not found in source text, discarded value "${result[field]}"`);
      result[field] = null;
    }
  };

  let w = result.wagering_multiplier;
  if (typeof w === 'string') w = Number(w.replace(/[^\d.]/g, ''));
  if (w != null && (!Number.isFinite(w) || w < 0 || w > 200)) {
    warnings.push(`wagering_multiplier: out of range (${result.wagering_multiplier}), discarded`);
    w = null;
  }
  result.wagering_multiplier = w ?? null;

  ['welcome_bonus', 'wagering_multiplier', 'minimum_deposit'].forEach(checkEvidence);

  return {
    welcome_bonus: toIsoCurrency(result.welcome_bonus) ?? null,
    wagering_multiplier: result.wagering_multiplier ?? null,
    minimum_deposit: toIsoCurrency(result.minimum_deposit) ?? null,
  };
}
