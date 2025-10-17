# OrbitalEducation — No-Folder Static Frontend + Optional Backend

This repository contains a single-page frontend split into separate files (index.html, styles.css, script.js) and an optional Node.js backend (server.js) that demonstrates how to persist state server-side.

Features
- Sign up flows: Parent and District / School
- Plans: Basics (free) and Pro (licensed) — differences modeled in the UI and behavior
- District code generation
- Admin actions: Add accounts, manage staff/admins
- Help Desk (file and manage tickets)
- LocalStorage client-side demo fallback if API is not present
- Simple optional Express backend that saves state to a JSON file

Quick start (frontend only)
1. Deploy the frontend (index.html, styles.css, script.js) to Cloudflare Pages or any static host.
2. The app will try to call `/api/ping`. If you don't have a backend, it will fall back to localStorage automatically.

Run optional backend locally (Node.js)
1. Install dependencies:
   - Node.js 18+ recommended
   - Run: `npm install`
2. Start server:
   - `node server.js`
   - Server listens on port 8787 by default.
3. Open frontend in browser:
   - If serving index.html via file:// the API calls may be blocked by CORS. Best run a simple static server (e.g., `npx serve .` or put the files behind a local webserver) and ensure the frontend can reach `http://localhost:8787/api`.

Deploying
- Frontend:
  - Cloudflare Pages: create a new Pages site and point the build to the directory containing index.html (no build step required).
  - Or upload static files to any static host.
- Backend:
  - Cloudflare Workers: rewrite server.js into a Workers-compatible handler (or use a serverless platform).
  - Other options: Render, Railway, Fly.io.

Security & next steps (production)
- Replace demo localStorage with a proper database and authenticated API.
- Add password hashing (bcrypt), email verification, session tokens (JWT), and secure cookie handling.
- Use rate limiting and validation for all inputs.
- Add domain verification and licensing enforcement for Pro plan.

Included files
- index.html — main static frontend
- styles.css — styles
- script.js — frontend logic + fallback
- server.js — optional Express demo API (simple JSON file persistence)
- package.json — dependencies for the server
- .gitignore — ignore node_modules and data files

If you want I can:
- Convert server.js into a Cloudflare Worker script and provide a wrangler.toml configuration.
- Create a GitHub repo structure and push these files (I can prepare the commits).
- Add more API endpoints (e.g., change district code, update plans, implement ticket API approval endpoints).
