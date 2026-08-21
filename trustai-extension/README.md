# TrustAI — Right-Click Verify (browser extension)

A Chrome/Edge (Manifest V3) extension that adds **"Check with TrustAI"** to
the right-click menu on images, links, and PDF pages, and sends the file
straight to your TrustAI backend (`POST /api/verify/image` or
`/api/verify/document`).

## What it adds

| Right-click on...              | Menu item                         | Sent to               |
|---------------------------------|------------------------------------|------------------------|
| an image                        | Check image with TrustAI           | `/api/verify/image`    |
| a link (to a pdf/doc/image/etc) | Check with TrustAI                 | auto-detected by extension |
| a PDF you're viewing in the tab | Check this PDF with TrustAI        | `/api/verify/document` |

There's also a toolbar popup with a **"Check a file…"** button, for
checking a file straight from your computer without needing it on a page.

Clicking a menu item opens a new tab that shows a spinner, then the same
risk score / bucket / signals breakdown the web app shows, styled to match.

## Install (unpacked, for development)

1. Make sure your backend is running: from `trustai-backend/`,
   `uvicorn app.main:app --reload --port 8000`.
2. Open `chrome://extensions` (or `edge://extensions`).
3. Turn on **Developer mode** (top right).
4. Click **Load unpacked** and select this `trustai-extension/` folder.
5. Click the TrustAI icon in the toolbar → **Backend settings**, and confirm
   the API base URL matches your backend (defaults to
   `http://localhost:8000`).

That's it — right-click any image or document link on any site and choose
**Check with TrustAI**.

## How it talks to the backend

All the file downloading and uploading happens in `background.js`, which
runs as an extension page (not a content script). Extension pages with
`host_permissions` are exempt from the page's CORS restrictions, so this
works against `localhost:8000` out of the box — you don't need to add
anything to the backend's `cors_origins` for the extension itself (that
setting is only for the web app at `trustai-frontend/`).

If a right-clicked file's own server refuses the download (e.g. it blocks
hotlinking), the result tab will show an error explaining that instead of
a risk score.

## Pointing it at a deployed backend later

Open the popup → **Backend settings** → paste your deployed backend's URL
(e.g. `https://api.yourtrustai.app`) → Save. No rebuild needed.

## Files

```
manifest.json     Extension manifest (permissions, context menus registered in background.js)
background.js     Service worker: creates the context menus, downloads the
                   right-clicked file, uploads it to the backend, stores the result
shared.js         Constants + helpers shared by background/popup/options/result
popup.html/js     Toolbar popup — manual "check a file" flow + link to settings
options.html/js   Backend API base URL setting (chrome.storage.sync)
result.html/css/js  The tab that opens on each check — loading/error/result states
icons/            Toolbar + extension icons
```
