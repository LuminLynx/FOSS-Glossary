# PWA Migration: Local Testing Checklist

Use this checklist to manually verify the PWA migration from `/pwa/` to `/docs/pwa/` before merging the pull request.

## 1. Fetch and Checkout the PR Branch

- [ ] Fetch PR branch: `git fetch origin copilot/move-pwa-directory-structure`
- [ ] Checkout branch: `git checkout copilot/move-pwa-directory-structure`

## 2. Verify Directory Structure

- [ ] Confirm `docs/pwa/` exists with all expected files:
  - `index.html`, `app.js`, `manifest.json`, `service-worker.js`, `README.md`, `styles/`, `assets/`
- [ ] Confirm `pwa/` directory is empty or deleted

## 3. Start Local HTTP Server

- [ ] Navigate to `docs/pwa/`
- [ ] Start a local server:
  - Python: `python -m http.server 8000`
  - Node.js: `npx http-server -p 8000`
- [ ] Open browser at `http://localhost:8000`

## 4. Path and File Reference Verification

- [ ] Confirm in `app.js` that `TERMS_API_URL` and fetch paths use `../terms.json` or `/pwa/terms.json` as appropriate
- [ ] Confirm in `service-worker.js` that logo and API paths use `../../assets/logo.png` and `../terms.json`
- [ ] Confirm in `index.html` that asset/logo references use `../../assets/`
- [ ] Confirm in `manifest.json` that icon paths use `../../assets/`

## 5. Functional Testing in Browser

- [ ] Page loads at `http://localhost:8000`
- [ ] All glossary terms (28+) display
- [ ] Search bar works
- [ ] Mark a term as favorite and refresh to check persistence
- [ ] Visit `http://localhost:8000/#code-hoarding` and verify deep linking/auto-expand
- [ ] Check browser console for errors relating to missing files or 404s (ignore `chrome-extension` errors)

## 6. Service Worker Verification

- [ ] Open DevTools → Application tab → Service Workers
- [ ] Confirm service worker is "activated and running"
- [ ] No errors related to pathing or file 404s

---

Once all boxes are checked, PWA migration is verified for local testing.
