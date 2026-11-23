# NPay (NAEEM DATA SUB) — VTU & Digital Services Platform

Full-stack Nigerian VTU and digital bills platform built with React, Vite, Tailwind CSS, Express, MySQL (for cPanel shared hosting), and Firebase/Firestore.

## Project Structure

- `src/` — React 19 + TypeScript frontend (`App.tsx`, components, Firebase client integration)
- `public/` — Static public assets, service worker (`firebase-messaging-sw.js`), `robots.txt`, and `setup.php`
- `public_html/` — Ready-to-upload compiled production bundle (`index.html`, `assets/`, `.htaccess`, `setup.php`) synced automatically on `npm run build`
- `server/` — Backend database adapters (`mysql.ts`, `db.ts`, VTU & payment providers)
- `server.ts` — Express server entry point for local development and Node.js production hosting
- `api/` — Vercel serverless API entry point (`api/index.js` + `api/_routes/*`)
- `database/mysql_schema.sql` — 17-table MySQL 5.7+/8.0+/MariaDB schema

## Local Development

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy environment template and configure your variables:
   ```bash
   cp .env.example .env
   ```
3. Start development server on port `3000`:
   ```bash
   npm run dev
   ```

## cPanel Shared Hosting Deployment (`public_html`)

If you exported or downloaded the source repository directly from AI Studio without running a build yet, generate or download the compiled `public_html/assets/` folder first:

- **Option A — Automatic via GitHub Actions (Recommended after GitHub export):**
  Once pushed to GitHub, `.github/workflows/build-public-html.yml` automatically runs `npm run build`, commits the compiled `public_html/index.html` and `public_html/assets/` (including `assets/aistudio/`), and creates a downloadable **`cpanel-public_html`** ZIP artifact under the **Actions** tab.
- **Option B — Build Locally:**
  ```bash
  npm install --legacy-peer-deps
  npm run build
  ```
  Vite compiles the app and copies `index.html`, `assets/` (JS, CSS, and `aistudio/` media), `setup.php`, `robots.txt`, and `firebase-messaging-sw.js` directly into `public_html/`.

Then deploy to cPanel:
1. Upload the **contents inside `public_html/`** (`index.html`, `assets/`, `firebase-messaging-sw.js`, `robots.txt`, `.htaccess`, and `setup.php`) into your cPanel `public_html` directory.
2. Open `https://yourdomain.com/setup.php` in your browser.
3. Enter your cPanel MySQL database credentials (`localhost`, DB name, DB username, DB password) and Super Admin details, then click **Install System & Create All Database Tables**.
4. Delete `setup.php` once installation completes (using the one-click **Delete setup.php Now** button or cPanel File Manager).

## Node.js / Vercel Deployment

- **Build command:** `npm run build`
- **Start command (Node.js):** `npm start`
- **Vercel:** Configured via `vercel.json` and `api/index.js`. Set your environment variables from `.env.example` in the hosting dashboard (never commit `.env` or `server/persisted_db.json`).
