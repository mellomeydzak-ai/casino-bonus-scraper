// One public source (casinotop10.net), three casinos.
// robots.txt for this site only disallows /wp-admin/, /download/, /goto/, /terms/ and /cdn-cgi/,
// so these review pages are allowed. The scraper re-checks robots.txt on every run anyway.
export const SOURCE = {
  name: 'CasinoTop10',
  origin: 'https://www.casinotop10.net',
};

export const CASINOS = [
  { name: 'BetMGM Casino', url: 'https://www.casinotop10.net/betmgm-casino' },
  { name: 'Caesars Palace Online Casino', url: 'https://www.casinotop10.net/caesars-casino' },
  { name: 'Golden Nugget Casino', url: 'https://www.casinotop10.net/golden-nugget-casino' },
];

// Identify ourselves honestly; no browser spoofing.
export const USER_AGENT =
  'CasinoBonusScraper/1.0 (screening task; contact: see repo README)';

export const REQUEST_DELAY_MS = 3000; // polite gap between page requests
export const REQUEST_TIMEOUT_MS = 30000;
