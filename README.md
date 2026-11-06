# Oh Snap Tips – GitHub Pages version with an admin form

Free site for ohsnaptips.com. Your domain stays at Squarespace, GitHub hosts the site, and `ohsnaptips.com/admin` is a form where you add guides, paste YouTube links and upload screenshots. Saving publishes the guide about a minute later.

## Adding a guide (everyday use)

1. Go to **ohsnaptips.com/admin** and sign in with your token (see step 6 below, first time only).
2. Click **New Guide**.
3. Fill in: **Title**, **YouTube link** (optional), **Short summary**, **Guide** (numbered list button for steps; image button uploads screenshots).
4. Click **Save**. It's live in about a minute.

Tick **Draft** to keep a guide hidden. To edit or delete a guide, open it from the list in the admin.

---

## One-time setup

### 1. Create the repo
On github.com create a new **public** repository (needed for free GitHub Pages), e.g. `ohsnaptips`. Upload everything in this folder (**Add file → Upload files**, including the hidden `.github` folder). Branch must be `main`.

### 2. Tell the admin which repo it belongs to
Edit `public/admin/config.yml` in GitHub (pencil icon) and change `repo: YOUR-GITHUB-USERNAME/ohsnaptips` to your real `username/repo`. Also set your channel link in `site.config.json` (`YOUTUBE_CHANNEL_URL`).

### 3. Turn on Pages
Repo → **Settings → Pages → Build and deployment → Source: GitHub Actions**. Open the **Actions** tab and confirm "Publish site" shows a green check.

### 4. Point ohsnaptips.com at GitHub (in Squarespace)
Squarespace → **Domains → ohsnaptips.com → DNS → DNS settings**.
1. **Remove** the default Squarespace records for the root domain (`@`) and `www`, and remove the **domain forwarding** to YouTube. Leave any MX/email records alone.
2. **Add four A records**, host `@`: `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
3. **Add a CNAME**, host `www`, pointing to `YOUR-USERNAME.github.io` (no repo name).

### 5. Tell GitHub the domain
Repo → **Settings → Pages → Custom domain** → `ohsnaptips.com` → Save. When the DNS check passes (minutes to a few hours), tick **Enforce HTTPS**.

### 6. Make your sign-in token (for /admin)
1. GitHub → your profile picture → **Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token**.
2. Name: `Oh Snap Tips admin`. Expiration: the longest you're comfortable with.
3. **Repository access → Only select repositories →** your `ohsnaptips` repo.
4. **Permissions → Repository permissions → Contents: Read and write.**
5. Generate, copy the token, go to `ohsnaptips.com/admin`, click **Sign in with token**, paste it.

The token is stored in that browser only. Treat it like a password, only sign in on your own devices, and make a new one when it expires. It can only touch this one repo.

---

## Notes
- Videos use YouTube's embedded player, so views still count on YouTube.
- Guides are plain text files in the `guides` folder; screenshots go to `public/uploads`. You can still edit them directly in GitHub if you prefer.
- If a guide has a problem the build can't read, the **Actions** tab shows a plain-English error and the old site stays up.
- Submit `https://ohsnaptips.com/sitemap.xml` in Google Search Console.
- Preview on your computer: `node scripts/build.mjs`, then open `_site/index.html`.
