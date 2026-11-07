// Builds the static site into ./_site from the markdown files in ./guides.
// No dependencies: runs on plain Node 18+.
import { readdirSync, readFileSync, writeFileSync, mkdirSync, rmSync, cpSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { page, esc, renderMarkdown, videoEmbed, thumb, fmtDate, guideCard, classCard, slugify, youtubeId, ytWatch } from './util.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, '_site');
const env = JSON.parse(readFileSync(join(root, 'site.config.json'), 'utf8'));
const origin = env.SITE_URL.replace(/\/$/, '');

const fail = (file, msg, dir = 'guides') => { console.error(`\nERROR in ${dir}/${file}: ${msg}\n`); process.exit(1); };

function parse(file, dir = 'guides') {
  const fail2 = (f, m) => fail(f, m, dir);
  const raw = readFileSync(join(root, dir, file), 'utf8').replace(/\r/g, '');
  const m = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) fail2(file, 'Missing the top section between --- lines (title, youtube, summary, date).');
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
  if (!meta.title) fail2(file, 'Missing "title:".');
  const slug = slugify(file.replace(/\.md$/i, ''));
  if (!slug) fail2(file, 'File name must contain letters or numbers.');
  const yt = meta.youtube ? youtubeId(meta.youtube) : '';
  if (meta.youtube && !yt) fail2(file, `"youtube:" does not look like a YouTube link: ${meta.youtube}`);
  const date = meta.date || new Date().toISOString().slice(0, 10);
  if (isNaN(new Date(date))) fail2(file, `"date:" must look like 2026-11-06, got: ${date}`);
  return {
    slug, title: meta.title, length: (meta.length || '').slice(0, 20), summary: (meta.summary || '').slice(0, 300), youtube_id: yt,
    created_at: new Date(date).toISOString(), draft: /^(true|yes)$/i.test(meta.draft || ''), body: m[2],
  };
}

const guides = readdirSync(join(root, 'guides'))
  .filter((f) => /\.md$/i.test(f) && !f.startsWith('_'))
  .map((f) => parse(f));

const classes = existsSync(join(root, 'classes'))
  ? readdirSync(join(root, 'classes')).filter((f) => /\.md$/i.test(f) && !f.startsWith('_')).map((f) => parse(f, 'classes'))
  : [];
const liveClasses = classes.filter((c) => !c.draft).sort((a, b) => b.created_at.localeCompare(a.created_at));
env.HAS_CLASSES = liveClasses.length > 0;

const plain = (x) => `${x.title} ${x.summary} ${x.body}`.replace(/[#>*_`\[\]()!\\-]/g, ' ').replace(/https?:\/\/\S+/g, ' ').replace(/\s+/g, ' ').toLowerCase().slice(0, 1500);
for (const x of [...guides, ...classes]) x.search = plain(x);

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
    <p>Quick tech how-tos you can watch and follow along, plus full-length classes. Every guide comes with a video and clear, numbered steps.</p>
    <div class="hero-cta"><a class="btn" href="#guides">Browse guides</a>${liveClasses.length ? '<a class="btn btn-outline-light" href="#classes">Browse classes</a>' : `<a class="btn btn-outline-light" href="${esc(yt)}" target="_blank" rel="noopener">Watch on YouTube</a>`}</div>
  </div>
  <div class="hero-art"><img src="/img/hero.png" alt="A finger snap with blue snap lines: the Oh Snap Tips logo" width="1040" height="1040"></div>
</div></section>`;

const searchBar = `<section class="wrap search-wrap"><label class="search" for="q"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg><input id="q" type="search" placeholder="Search guides and classes" autocomplete="off" aria-label="Search guides and classes"></label><p id="nores" class="nores" hidden>Nothing found. Try a different word, like "Facebook", "Command" or "Google".</p></section>
<script>
document.addEventListener('DOMContentLoaded',function(){var q=document.getElementById('q');if(!q)return;var cards=[].slice.call(document.querySelectorAll('.card[data-s]'));var nores=document.getElementById('nores');var latest=document.querySelector('.latest');var secs=[].slice.call(document.querySelectorAll('#guides,#classes'));
function run(){var v=q.value.trim().toLowerCase();var words=v.split(/\\s+/).filter(Boolean);var shown=0;cards.forEach(function(c){var s=c.getAttribute('data-s');var ok=words.every(function(w){return s.indexOf(w)>-1});c.style.display=ok?'':'none';if(ok)shown++;});
secs.forEach(function(sec){var any=[].slice.call(sec.querySelectorAll('.card[data-s]')).some(function(c){return c.style.display!=='none'});sec.style.display=any?'':'none';});
if(latest)latest.style.display=v?'none':'';nores.hidden=!(v&&!shown);}
q.addEventListener('input',run);});
</script>`;

const featured = latest
  ? `<section class="wrap latest"><span class="kicker">Latest guide</span><div class="latest-grid">
      <div>${latest.youtube_id ? videoEmbed(latest.youtube_id, latest.title) : ''}</div>
      <div class="latest-copy"><h2><a href="/guide/${esc(latest.slug)}/">${esc(latest.title)}</a></h2>
      ${latest.summary ? `<p>${esc(latest.summary)}</p>` : ''}
      <a class="btn" href="/guide/${esc(latest.slug)}/">Read the guide</a></div>
    </div></section>`
  : `<section class="wrap latest"><h2 class="section-title">Guides are on the way</h2><p>New how-to guides and videos are coming soon.</p></section>`;

const classSection = liveClasses.length
  ? `<section id="classes" class="wrap"><h2 class="section-title">Classes</h2><p class="section-sub">Full-length sessions. Watch the whole class and jump to the part you need.</p><div class="grid">${liveClasses.map(classCard).join('')}</div></section>`
  : '';

const grid = rest.length
  ? `<section id="guides" class="wrap"><h2 class="section-title">All guides</h2><div class="grid">${rest.map(guideCard).join('')}</div></section>`
  : '<div id="guides"></div>';

write('index.html', page({
  env, origin, path: '/', title: 'How-to guides and videos',
  description: 'Step-by-step how-to guides with video walkthroughs from Oh Snap Tips. Straight and to the point.',
  body: hero + searchBar + featured + classSection + grid,
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

// Class pages
for (const c of liveClasses) {
  const more = liveClasses.filter((x) => x !== c).slice(0, 3);
  const ld = c.youtube_id
    ? `<script type="application/ld+json">${JSON.stringify({
        '@context': 'https://schema.org', '@type': 'VideoObject', name: c.title, description: c.summary || c.title,
        thumbnailUrl: thumb(c.youtube_id), uploadDate: c.created_at, embedUrl: `https://www.youtube.com/embed/${c.youtube_id}`,
      }).replace(/</g, '\\u003c')}</script>` : '';
  const body = `<article class="wrap prose"><p class="crumbs"><a href="/#classes">&larr; All classes</a></p>
    <span class="badge">Class${c.length ? ' · ' + esc(c.length) : ''}</span><h1>${esc(c.title)}</h1>
    <p class="meta">${fmtDate(c.created_at)}</p>${c.youtube_id ? videoEmbed(c.youtube_id, c.title) + `<p class="watch-yt"><a href="${ytWatch(c.youtube_id)}" target="_blank" rel="noopener">Watch on YouTube &#8599;</a></p>` : ''}${renderMarkdown(c.body)}</article>
    ${more.length ? `<section class="wrap"><h2 class="section-title">More classes</h2><div class="grid">${more.map(classCard).join('')}</div></section>` : ''}`;
  write(`class/${c.slug}/index.html`, page({
    env, origin, path: `/class/${c.slug}/`, title: c.title, description: c.summary || `${c.title} – full class.`,
    image: c.youtube_id ? thumb(c.youtube_id) : '', type: 'article', extraHead: ld, body,
  }));
}

// 404, sitemap
write('404.html', page({ env, origin, path: '/404.html', title: 'Page not found',
  body: '<div class="wrap prose"><h1>Page not found</h1><p><a href="/">Back to all guides</a></p></div>' }));
write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${origin}/</loc></url>${
  live.map((g) => `<url><loc>${esc(origin)}/guide/${esc(g.slug)}/</loc><lastmod>${g.created_at.slice(0, 10)}</lastmod></url>`).join('')}${
  liveClasses.map((c) => `<url><loc>${esc(origin)}/class/${esc(c.slug)}/</loc><lastmod>${c.created_at.slice(0, 10)}</lastmod></url>`).join('')}</urlset>`);
write('.nojekyll', '');

console.log(`Built ${live.length} guide(s), ${liveClasses.length} class(es)${guides.length - live.length ? `, skipped ${guides.length - live.length} draft(s)` : ''} → _site/`);
