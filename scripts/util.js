// Shared helpers: escaping, slugs, YouTube parsing, a small safe Markdown renderer, page layout.

export const esc = (s = '') =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export function slugify(s = '') {
  return String(s)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

const YT = /^[\w-]{11}$/;

// Accepts a full YouTube URL (watch, youtu.be, shorts, embed, live) or a bare 11-char ID.
export function youtubeId(input = '') {
  const s = String(input).trim();
  if (!s) return '';
  if (YT.test(s)) return s;
  try {
    const u = new URL(s);
    const host = u.hostname.replace(/^(www|m)\./, '');
    let id = '';
    if (host === 'youtu.be') id = u.pathname.slice(1).split('/')[0];
    else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
      if (u.pathname === '/watch') id = u.searchParams.get('v') || '';
      else id = (u.pathname.match(/^\/(?:embed|shorts|live|v)\/([\w-]{11})/) || [])[1] || '';
    }
    return YT.test(id) ? id : '';
  } catch {
    return '';
  }
}

export const thumb = (id) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;

export const videoEmbed = (id, title = 'Video') =>
  `<div class="video"><iframe src="https://www.youtube-nocookie.com/embed/${esc(id)}?rel=0" title="${esc(title)}" loading="lazy" allow="accelerometer; encrypted-media; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe></div>`;

const safeUrl = (u) => /^(https?:\/\/|\/)/i.test(u);

function inline(raw) {
  const tokens = [];
  let t = esc(raw).replace(/`([^`]+)`/g, (_, c) => {
    tokens.push(`<code>${c}</code>`);
    return `\u0000${tokens.length - 1}\u0000`;
  });
  t = t
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, text, url) =>
      safeUrl(url) ? `<a href="${url}" rel="noopener"${/^https?:/i.test(url) ? ' target="_blank"' : ''}>${text}</a>` : m)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[\s(])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>')
    .replace(/(^|[\s(])_([^_\s][^_]*)_(?=[\s).,!?:;]|$)/g, '$1<em>$2</em>')
    // editors escape punctuation with a backslash (\* \_ \#); show the plain character
    .replace(/\\([\\`*_{}\[\]()#+.!>-])/g, '$1');
  return t.replace(/\u0000(\d+)\u0000/g, (_, i) => tokens[+i]);
}

const RE = {
  heading: /^(#{1,3})\s+(.*)$/,
  image: /^!\[([^\]]*)\]\(([^)\s]+)\)\s*$/,
  ul: /^[-*]\s+(.*)$/,
  ol: /^\d+[.)]\s+(.*)$/,
  quote: /^>\s?(.*)$/,
};
const startsBlock = (l) => Object.values(RE).some((r) => r.test(l));

// Supports: ## headings, - bullets, 1. numbered steps, > tips, ![alt](url) images,
// **bold**, *italic*, `code`, [links](https://...). Everything else is escaped.
export function renderMarkdown(src = '') {
  const lines = String(src).replace(/\r/g, '').split('\n');
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }
    let m;
    if ((m = line.match(RE.heading))) {
      const lvl = Math.max(2, m[1].length);
      out.push(`<h${lvl}>${inline(m[2])}</h${lvl}>`); i++;
    } else if ((m = line.match(RE.image))) {
      if (safeUrl(m[2])) {
        out.push(`<figure><img loading="lazy" src="${esc(m[2])}" alt="${esc(m[1])}">${m[1] ? `<figcaption>${esc(m[1])}</figcaption>` : ''}</figure>`);
      }
      i++;
    } else if (RE.ul.test(line) || RE.ol.test(line)) {
      const ordered = RE.ol.test(line);
      const re = ordered ? RE.ol : RE.ul;
      const items = [];
      while (i < lines.length && re.test(lines[i])) { items.push(`<li>${inline(lines[i].match(re)[1])}</li>`); i++; }
      out.push(`<${ordered ? 'ol' : 'ul'}>${items.join('')}</${ordered ? 'ol' : 'ul'}>`);
    } else if (RE.quote.test(line)) {
      const q = [];
      while (i < lines.length && RE.quote.test(lines[i])) { q.push(lines[i].match(RE.quote)[1]); i++; }
      out.push(`<aside class="tip">${inline(q.join(' '))}</aside>`);
    } else {
      const p = [];
      while (i < lines.length && lines[i].trim() && !startsBlock(lines[i])) { p.push(lines[i]); i++; }
      if (!p.length) { p.push(line); i++; }
      out.push(`<p>${inline(p.join(' '))}</p>`);
    }
  }
  return out.join('\n');
}

export const fmtDate = (iso) =>
  new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });

export function guideCard(g) {
  const img = g.youtube_id
    ? `<img loading="lazy" src="${thumb(g.youtube_id)}" alt="">`
    : `<div class="noimg" aria-hidden="true">Tip</div>`;
  return `<a class="card" href="/guide/${esc(g.slug)}/">${img}<div class="card-body"><h3>${esc(g.title)}</h3><p>${esc(g.summary)}</p><span class="meta">${fmtDate(g.created_at)}${g.youtube_id ? ' · Video' : ''}</span></div></a>`;
}

export function page({ env, origin, title, description = '', path = '/', image = '', body, extraHead = '', type = 'website' }) {
  const site = env.SITE_NAME || 'Oh Snap Tips';
  const fullTitle = path === '/' ? `${site} – ${title}` : `${title} | ${site}`;
  const yt = env.YOUTUBE_CHANNEL_URL || '#';
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(fullTitle)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${esc(origin + path)}">
<meta property="og:type" content="${type}">
<meta property="og:site_name" content="${esc(site)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(origin + path)}">
${image ? `<meta property="og:image" content="${esc(image)}"><meta name="twitter:card" content="summary_large_image">` : ''}
<link rel="stylesheet" href="/style.css">
${extraHead}
</head>
<body>
<header class="site-header"><div class="wrap">
  <a class="logo" href="/">Oh Snap <span>Tips</span></a>
  <nav><a href="/#guides">Guides</a><a class="btn" href="${esc(yt)}" target="_blank" rel="noopener">Subscribe on YouTube</a></nav>
</div></header>
<main>${body}</main>
<footer class="site-footer"><div class="wrap"><p>© ${new Date().getFullYear()} ${esc(site)} · <a href="${esc(yt)}" target="_blank" rel="noopener">YouTube</a></p></div></footer>
</body>
</html>`;
}

export const html = (body, status = 200, cache = 'public, max-age=60, s-maxage=60') =>
  new Response(body, { status, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': cache } });

export const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
