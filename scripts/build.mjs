// Builds the static site into ./_site from the markdown files in ./guides.
// No dependencies: runs on plain Node 18+.
import { readdirSync, readFileSync, writeFileSync, mkdirSync, rmSync, cpSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { page, esc, renderMarkdown, videoEmbed, thumb, fmtDate, guideCard, slugify, youtubeId, ytWatch } from './util.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, '_site');
const env = JSON.parse(readFileSync(join(root, 'site.config.json'), 'utf8'));
const origin = env.SITE_URL.replace(/\/$/, '');

const fail = (file, msg) => { console.error(`\nERROR in guides/${file}: ${msg}\n`); process.exit(1); };

function parse(file) {
  const raw = readFileSync(join(root, 'guides', file), 'utf8').replace(/\r/g, '');
  const m = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) fail(file, 'Missing the top section between --- lines (title, youtube, summary, date).');
  const meta = {};
  let key = null, block = false;
  const clean = (v) => {
    v = v.trim();
    if (/^".*"$/.test(v)) { try { return JSON.parse(v); } catch { return v.slice(1, -1); } }
    if (/^'.*'$/.test(v)) return v.slice(1, -1).replace(/''/g, "'");
    return v;
  };
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^([\w-]+):\s*(.*)$/);
    if (kv) {
      key = kv[1].toLowerCase();
      block = /^[>|][+-]?$/.test(kv[2].trim());
      meta[key] = block ? '' : kv[2];
    } else if (key && /^\s+\S/.test(line)) {
      // long values the editor wraps onto several lines
      meta[key] = (meta[key] ? meta[key] + ' ' : '') + line.trim();
    }
  }
  for (const k of Object.keys(meta)) meta[k] = clean(meta[k]);
  if (!meta.title) fail(file, 'Missing "title:".');
  const slug = slugify(file.replace(/\.md$/i, ''));
  if (!slug) fail(file, 'File name must contain letters or numbers.');
  const yt = meta.youtube ? youtubeId(meta.youtube) : '';
  if (meta.youtube && !yt) fail(file, `"youtube:" does not look like a YouTube link: ${meta.youtube}`);
  const date = meta.date || new Date().toISOString().slice(0, 10);
  if (isNaN(new Date(date))) fail(file, `"date:" must look like 2026-11-06, got: ${date}`);
  return {
    slug, title: meta.title, summary: (meta.summary || '').slice(0, 300), youtube_id: yt,
    created_at: new Date(date).toISOString(), draft: /^(true|yes)$/i.test(meta.draft || ''), body: m[2],
  };
}

const guides = readdirSync(join(root, 'guides'))
  .filter((f) => /\.md$/i.test(f) && !f.startsWith('_'))
  .map(parse);

const seen = new Set();
for (const g of guides) { if (seen.has(g.slug)) fail(g.slug + '.md', 'Another guide already uses this file name.'); seen.add(g.slug); }

const live = guides.filter((g) => !g.draft).sort((a, b) => b.created_at.localeCompare(a.created_at));

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
cpSync(join(root, 'public'), out, { recursive: true });
const write = (p, c) => { mkdirSync(dirname(join(out, p)), { recursive: true }); writeFileSync(join(out, p), c); };

// Home
const yt = env.YOUTUBE_CHANNEL_URL;
const latest = live.find((g) => g.youtube_id) || live[0];
const rest = live.filter((g) => g !== latest);

const hero = `<section class="hero"><div class="wrap hero-grid">
  <div class="hero-copy">
    <span class="kicker">How-to guides + video</span>
    <h1>Straight &amp; to the point.</h1>
    <p>Quick tech how-tos you can watch and follow along. Every guide comes with a video and clear, numbered steps.</p>
    <div class="hero-cta"><a class="btn" href="#guides">Browse guides</a><a class="btn btn-outline-light" href="${esc(yt)}" target="_blank" rel="noopener">Watch on YouTube</a></div>
  </div>
  <div class="hero-art"><img src="/img/hero.png" alt="A finger snap with a blue burst reading Oh Snap Tips" width="616" height="826"></div>
</div></section>`;

const featured = latest
  ? `<section class="wrap latest"><span class="kicker">Latest guide</span><div class="latest-grid">
      <div>${latest.youtube_id ? videoEmbed(latest.youtube_id, latest.title) : ''}</div>
      <div class="latest-copy"><h2><a href="/guide/${esc(latest.slug)}/">${esc(latest.title)}</a></h2>
      ${latest.summary ? `<p>${esc(latest.summary)}</p>` : ''}
      <a class="btn" href="/guide/${esc(latest.slug)}/">Read the guide</a></div>
    </div></section>`
  : `<section class="wrap latest"><h2 class="section-title">Guides are on the way</h2><p>New how-to guides and videos are coming soon.</p></section>`;

const grid = rest.length
  ? `<section id="guides" class="wrap"><h2 class="section-title">All guides</h2><div class="grid">${rest.map(guideCard).join('')}</div></section>`
  : '<div id="guides"></div>';

write('index.html', page({
  env, origin, path: '/', title: 'How-to guides and videos',
  description: 'Step-by-step how-to guides with video walkthroughs from Oh Snap Tips. Straight and to the point.',
  body: hero + featured + grid,
}));

// Guide pages
for (const g of live) {
  const more = live.filter((x) => x !== g).slice(0, 3);
  const ld = g.youtube_id
    ? `<script type="application/ld+json">${JSON.stringify({
        '@context': 'https://schema.org', '@type': 'VideoObject', name: g.title, description: g.summary || g.title,
        thumbnailUrl: thumb(g.youtube_id), uploadDate: g.created_at, embedUrl: `https://www.youtube.com/embed/${g.youtube_id}`,
      }).replace(/</g, '\\u003c')}</script>` : '';
  const body = `<article class="wrap prose"><p class="crumbs"><a href="/">&larr; All guides</a></p><h1>${esc(g.title)}</h1>
    <p class="meta">${fmtDate(g.created_at)}</p>${g.youtube_id ? videoEmbed(g.youtube_id, g.title) + `<p class="watch-yt"><a href="${ytWatch(g.youtube_id)}" target="_blank" rel="noopener">Watch on YouTube &#8599;</a></p>` : ''}${renderMarkdown(g.body)}</article>
    ${more.length ? `<section class="wrap"><h2 class="section-title">More guides</h2><div class="grid">${more.map(guideCard).join('')}</div></section>` : ''}`;
  write(`guide/${g.slug}/index.html`, page({
    env, origin, path: `/guide/${g.slug}/`, title: g.title, description: g.summary || `${g.title} – step-by-step guide.`,
    image: g.youtube_id ? thumb(g.youtube_id) : '', type: 'article', extraHead: ld, body,
  }));
}

// 404, sitemap
write('404.html', page({ env, origin, path: '/404.html', title: 'Page not found',
  body: '<div class="wrap prose"><h1>Page not found</h1><p><a href="/">Back to all guides</a></p></div>' }));
write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${origin}/</loc></url>${
  live.map((g) => `<url><loc>${esc(origin)}/guide/${esc(g.slug)}/</loc><lastmod>${g.created_at.slice(0, 10)}</lastmod></url>`).join('')}</urlset>`);
write('.nojekyll', '');

console.log(`Built ${live.length} guide(s)${guides.length - live.length ? `, skipped ${guides.length - live.length} draft(s)` : ''} → _site/`);
