# HABITAT — website v1

Static site, no build step. Same setup as christianneitzel.com: a GitHub repo published with GitHub Pages. All paths are relative, so it works both at `username.github.io/habitat-site/` and on a custom domain.

Preview locally with VS Code Live Server (or `python3 -m http.server` in this folder).

## Files

- `index.html` — German home page (primary, at `/`); `en/index.html` — English version at `/en/`. Legal pages: `impressum/`, `datenschutz/`, `en/legal-notice/`, `en/privacy/`. The old `/de/…`, `/legal-notice/` and `/privacy/` URLs are small redirect pages.
- Each home page holds the whole page, sections in order (01 Hero … 09 Footer), plus the three dialogs at the bottom (menu, project detail, request a call)
- `styles.css` — all styles, one file, numbered sections in page order. Tablet ≤ 1100px, mobile ≤ 760px
- `main.js` — dialogs, project reveal, plans toggle, FAQ, mobile bar section label
- `thank-you.html` — optional fallback page for the form
- `assets/img/` — logos (red, cream), hero image, Anna’s portrait

## Go live on GitHub Pages

1. Create a new repo on GitHub (e.g. `habitat-site`) and push this folder’s contents to `main`.
2. Repo → Settings → Pages → Source: “Deploy from a branch”, branch `main`, folder `/ (root)` → Save.
3. After a minute it’s live at `https://<username>.github.io/habitat-site/`.
4. Custom domain later: Settings → Pages → Custom domain, then point the domain’s DNS at GitHub (GitHub shows the records). Tick “Enforce HTTPS”.

## Fonts

Adobe Fonts kit `uzy3lzg`. In Adobe Fonts → Web Projects, add every domain the site runs on (`<username>.github.io`, the custom domain, and `localhost` for previews). Until then it falls back to Helvetica/Arial.

## Form (Formspree)

GitHub Pages can’t receive form submissions, so the form posts to Formspree, which emails them on.

1. Sign up at formspree.io (free plan) with the address that should receive requests (Anna’s).
2. Create a form → copy its endpoint, e.g. `https://formspree.io/f/xyzabcde`.
3. In `index.html`, replace `YOUR_FORM_ID` in the form’s `action` with that ID.
4. Send one test request from the live site and confirm it in the Formspree email.

Until the ID is filled in, the form pretends to send (same on localhost), so you can test the thank-you state. Spam: the hidden `_gotcha` field is Formspree’s honeypot.

## How it behaves

- The red frame is fixed on all four sides. Inside it, a fixed translucent (“milky”) top bar with blur.
- Desktop: top bar = logo · nav · DE tab; the current section’s nav link turns blue. The red “Request a call” tab sits on the left edge of the frame.
- Mobile: top bar = logo (replaced by the current section name after the hero) · menu square. “Request a call” is a full-width red bar along the bottom — it is the bottom edge of the frame.
- Every link to `#request-call` opens the form dialog; a shared link ending in `#request-call` opens it on load.
- Dialogs use the native `<dialog>`: Esc closes, focus stays inside, the page behind doesn’t scroll, focus returns afterwards. Arrow keys flip through projects.
- Projects: 4 shown, then 4 more per click. Without JavaScript all 14 show.

## Still to fill in (search for `TODO`, `YOUR_FORM_ID` and `[`)

- Formspree ID
- Project photos: replace `<span class="ph …">` with `<img>` (card 4:3; dialog: one landscape + two 3:4)
- Phone number (footer), Instagram and LinkedIn URLs
- Impressum and privacy pages, and the privacy link in the form
- `og:image` → absolute URL once the domain is set

## Images

- Originals live in `_originals/` (not uploaded to GitHub — see `.gitignore`).
- Web versions are WebP in two widths, e.g. `assets/img/projects/artisan/living-800.webp` and `living-1600.webp`. The page picks the right size per screen (`srcset`).
- To add a project’s photos: put the originals in `_originals/projects/<name>/`, then make the two sizes:
  `convert in.jpg -auto-orient -strip -resize 1600x1600\> -quality 78 out-1600.webp` (and `800x800` for `-800`).
- Each project: first image = card + main image in the dialog, then two side images.
