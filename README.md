# Oh Snap Tips

Static site for ohsnaptips.com, hosted free on GitHub Pages and built by a GitHub Action on every push to `main`.

## Adding content

Content is plain Markdown with a short header, in two folders:

- `guides/` – step-by-step how-to guides with a video (YouTube Shorts too, see below)
- `classes/` – full-length sessions with a video and class notes

Header fields (between the `---` lines):

```
title: Name shown on the site
youtube: https://www.youtube.com/watch?v=VIDEO_ID
summary: One sentence for the cards and Google
date: 2026-11-07
length: 52 min          (classes only, optional)
format: short           (optional: a YouTube Short, see below)
draft: true             (optional: hides it from the site)
```

The body is Markdown: `##` headings, numbered steps (`1.`), bullets (`-`), `> ` for a tip box, `**bold**`, links and images.

**Shorties:** a YouTube Short is still a guide. Put it in `guides/` like any other, and either add `format: short` or paste a `youtube.com/shorts/...` link. It keeps its `/guide/` page (vertical video + written steps), search and sitemap entry, but appears in the "Shorties" section on the home page instead of "All guides".

To publish: ask Claude with the YouTube link, or add a `.md` file in the right folder on GitHub. The site rebuilds in about a minute.

## How it works

- `scripts/build.mjs` builds everything into `_site/` (no dependencies, Node 20)
- `public/` is copied as-is (styles, logo, images)
- `.github/workflows/pages.yml` deploys to GitHub Pages
- `site.config.json` holds the site name, URL and YouTube channel link
- DNS lives at Squarespace: four A records to GitHub (185.199.108–111.153) and `www` CNAME to `slightlybrandon-web.github.io`
