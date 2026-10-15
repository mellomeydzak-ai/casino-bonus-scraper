import robotsParser from 'robots-parser';
import { USER_AGENT, REQUEST_TIMEOUT_MS } from '../config.js';

const robotsCache = new Map();

async function get(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'text/html,text/plain' },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    redirect: 'follow',
  });
  return res;
}

/** Returns true only if robots.txt explicitly allows (or doesn't forbid) this URL for our UA. */
export async function isAllowedByRobots(url) {
  const { origin } = new URL(url);
  if (!robotsCache.has(origin)) {
    const robotsUrl = `${origin}/robots.txt`;
    const res = await get(robotsUrl);
    // A missing robots.txt (404) means "no restrictions"; any other failure means "don't crawl".
    const body = res.ok ? await res.text() : res.status === 404 ? '' : null;
    if (body === null) throw new Error(`Could not read ${robotsUrl} (HTTP ${res.status})`);
    robotsCache.set(origin, robotsParser(robotsUrl, body));
  }
  return robotsCache.get(origin).isAllowed(url, USER_AGENT) !== false;
}

/** Fetch a page's HTML. Treats blocks/challenges as errors instead of trying to get around them. */
export async function fetchPage(url) {
  if (!(await isAllowedByRobots(url))) {
    throw new Error(`robots.txt disallows ${url}; pick another source`);
  }
  const res = await get(url);
  if ([401, 403, 429, 503].includes(res.status)) {
    throw new Error(`Blocked or rate-limited (HTTP ${res.status}) at ${url}; not retrying around it`);
  }
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
  const html = await res.text();
  if (/cf-challenge|captcha|Attention Required/i.test(html.slice(0, 5000))) {
    throw new Error(`Challenge page returned at ${url}; switch source`);
  }
  return { html, finalUrl: res.url };
}
