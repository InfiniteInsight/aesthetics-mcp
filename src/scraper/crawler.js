const LIST_URL = 'https://aesthetics.fandom.com/wiki/Aesthetics_Wiki';
const USER_AGENT = 'aesthetics-mcp/1.0 (personal research; https://github.com/user/aesthetics-mcp)';

async function fetchPage(url) {
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
  return res.text();
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function fetchAestheticLinks() {
  return fetchPage(LIST_URL);
}

export async function fetchAestheticPage(url, minDelay = 1000, maxDelay = 3000) {
  const delay = Math.floor(minDelay + Math.random() * (maxDelay - minDelay));
  await sleep(delay);
  return fetchPage(url);
}
