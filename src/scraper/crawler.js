const API_URL = 'https://aesthetics.fandom.com/api.php';

async function apiGet(params) {
  const url = `${API_URL}?${new URLSearchParams({ format: 'json', ...params })}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
  const data = await res.json();
  if (data.error) throw new Error(data.error.info);
  return data;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function fetchAestheticLinks() {
  const pages = [];
  let cmcontinue;
  do {
    const params = {
      action: 'query',
      list: 'categorymembers',
      cmtitle: 'Category:Aesthetics_Wiki_Articles',
      cmlimit: '500',
      cmtype: 'page',
    };
    if (cmcontinue) params.cmcontinue = cmcontinue;
    const data = await apiGet(params);
    for (const p of data.query.categorymembers) {
      pages.push({
        name: p.title,
        url: `https://aesthetics.fandom.com/wiki/${encodeURIComponent(p.title.replace(/ /g, '_'))}`,
      });
    }
    cmcontinue = data.continue?.cmcontinue;
  } while (cmcontinue);
  return pages;
}

export async function fetchAestheticPage(url, minDelay = 1000, maxDelay = 3000) {
  const delay = Math.floor(minDelay + Math.random() * (maxDelay - minDelay));
  await sleep(delay);
  const title = decodeURIComponent(url.replace('https://aesthetics.fandom.com/wiki/', '')).replace(/_/g, ' ');
  const data = await apiGet({ action: 'parse', page: title, prop: 'text' });
  return `<h1 class="page-header__title">${data.parse.title}</h1>${data.parse.text['*']}`;
}
