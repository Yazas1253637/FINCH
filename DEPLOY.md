# Deploying Finch + installing on iPhone

Finch is a static Vite PWA. Any static host over **HTTPS** works (HTTPS is
required for the service worker / offline support and for "Add to Home Screen").

---

## 1. Build

```bash
npm run build
```

Outputs to `dist/` with root-absolute asset paths (`/assets/...`), so it serves
correctly from a domain root. `dist/` contains `index.html`, `manifest.webmanifest`,
`sw.js`, `assets/`, and `icons/`.

> Note: `npm run app:build` is the **Electron/macOS** build (uses a relative
> base + `app://` protocol). For web deploy always use `npm run build`.

---

## 2. Deploy — simplest path (Vercel CLI)

One-time:

```bash
npm i -g vercel        # install the CLI
vercel login           # sign in (GitHub/email)
```

From the project root:

```bash
vercel --prod
```

- Accept the defaults. `vercel.json` already sets the build command (`npm run build`),
  output dir (`dist`), the SPA fallback, and the correct `sw.js` / manifest headers.
- You get an HTTPS URL like `https://finch-xyz.vercel.app`.

**Redeploy after changes:** commit/save your changes, then run `vercel --prod` again.
That's the whole loop.

### Alternative — Netlify Drop (no CLI, drag-and-drop)

1. `npm run build`
2. Open <https://app.netlify.com/drop>
3. Drag the **`dist`** folder onto the page → instant HTTPS URL.

`netlify.toml` is included if you later connect the repo for auto-deploys
(redeploy = drag `dist` again, or `git push` once the repo is linked).

### Host config (already provided)

- **SPA fallback** so unknown paths return `index.html` instead of 404
  (`vercel.json` rewrites / `netlify.toml` redirect, status 200). Real files —
  `sw.js`, `manifest.webmanifest`, `/assets/*`, `/icons/*` — are served directly;
  the fallback only catches unmatched routes.
- **Content-Type** pinned for `sw.js` (`application/javascript`) and
  `manifest.webmanifest` (`application/manifest+json`), plus `Service-Worker-Allowed: /`
  so the worker controls the whole origin.

---

## 3. Install on iPhone ("Add to Home Screen")

**Must use Safari** — Chrome/Firefox on iOS cannot install PWAs to the home screen.

1. Open the deployed HTTPS URL in **Safari**.
2. Tap the **Share** button (square with an up-arrow, bottom center).
3. Scroll down → tap **Add to Home Screen**.
4. Confirm the name ("Finch") → tap **Add**.

You now get a Finch icon on the home screen that launches full-screen
(standalone, no Safari chrome), with iPhone safe-area insets handled and offline
support after the first load.

---

## 4. Data & persistence (important)

- Finch stores everything **locally on each device** (IndexedDB). There is **no
  server and no sync**: the iPhone install and the macOS app keep **separate**
  data sets.
- iOS may **evict PWA storage under disk pressure** or after long periods unused.
  Treat the phone copy as convenient, not permanent.
- **Backup / transfer between devices** = the JSON export. In Settings:
  **Export all data** (downloads a JSON file) and **Import from backup…** on the
  other device. This is the only way to move data between the Mac app and the
  iPhone, and your safety net against eviction or a cleared browser.
