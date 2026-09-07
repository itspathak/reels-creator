# 🎬 ReelForge AI

**AI-powered SaaS platform that lets any business owner create Instagram Reels automatically.**

Tell ReelForge AI about your business, upload a few photos, and AI writes the script, hooks, captions, hashtags, generates the voiceover, and renders a ready-to-post vertical **9:16** video.

---

## ✨ Features

- 🏗️ **Multi-step wizard** — business details → preferences → media upload → generate
- 🧠 **AI generation** (OpenAI) — hooks, concepts, scene-by-scene scripts, captions, CTA, hashtags
- 🎙️ **Voice generation** (ElevenLabs abstraction — demo mode by default, real TTS when key is added)
- 🎬 **Video rendering** (Creatomate abstraction — demo mode by default, real 1080×1920 rendering when enabled)
- 💾 **MySQL persistence** — users, reels, media, brand kits, subscriptions, usage
- 🔐 **JWT auth** with bcrypt password hashing, protected routes, file validation, centralized error handling
- 🎨 **Brand Kit** — save colors, logo, CTA; automatically applied to all future Reels
- 📊 **Usage tracking & subscription limits**
- 📱 **Fully responsive** premium SaaS UI (desktop / tablet / mobile)

---

## 🏗️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite + React Router + modern CSS |
| Backend | Node.js + Express (REST API) |
| Database | MySQL (`mysql2`) |
| Auth | JWT + `bcryptjs` |
| AI | OpenAI (GPT) via `services/aiService.js` |
| Voice | ElevenLabs via `services/voiceService.js` |
| Video | Creatomate via `services/videoService.js` |

---

## 🚀 Deployment (Vercel + Render)

### Architecture

| Piece | Host | Notes |
|---|---|---|
| Frontend (React/Vite) | **Vercel** | Static build, SPA rewrites |
| Backend (Node/Express) | **Render** (Web Service) | Runs ffmpeg rendering; `ffmpeg-static` bundled, no apt needed |
| MySQL | External (e.g. Clever Cloud / TiDB Cloud / Aiven free tier) | Env vars `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` |

### 1. Frontend → Vercel

When importing the repo, set:

- **Root Directory:** `reelforge-ai/frontend`
- **Framework:** Vite
- **Build:** `npm run build` · **Output:** `dist`
- **Env var:** `VITE_API_URL=https://reelforge-backend.onrender.com/api`

`frontend/vercel.json` already adds an SPA rewrite so `/dashboard`, `/login`, etc. resolve on refresh.

### 2. Backend → Render

A `render.yaml` blueprint is included at the repo root. In the Render dashboard choose
**New → Blueprint**, select the repo, and fill the sealed env vars:

- `DB_HOST`, `DB_USER`, `DB_PASSWORD` — your external MySQL host/credentials
- `JWT_SECRET` — a long random string

Defaults already set: `DB_NAME=reelforge`, `CLIENT_URL=https://reels-creator.vercel.app`, `VIDEO_PROVIDER=ffmpeg`.

`npm start` runs `scripts/init-db.js` first (creates tables idempotently), then boots the API.
`ffmpeg-static` + `@ffprobe-installer/ffprobe` are installed during `npm install` (no `apt-get` required),
and `backend/vendor/fonts/` ships Impact + Nirmala (bundled OTF/TTF) so captions render on Linux.

> Notes for Render free tier: uploaded images and rendered videos live on an ephemeral disk and are
> wiped on deploy/restart (a persistent disk is a paid add-on). Rendering a reel takes ~60s, so keep
> the browser tab open while it runs. Without Python/Pillow the reels fall back to gradient backgrounds;
> without `edge-tts` the narration is skipped (music still plays). None of these block registration.

### 3. Verify

- `https://<backend>/api/health` → `{ success: true, data: { db: 'ok' } }`
- Open the Vercel URL → create an account → create a Reel.

---

## 📁 Project Structure

```
reelforge-ai/
├── database/
│   └── schema.sql              # MySQL schema + seed templates
├── backend/
│   ├── .env.example
│   ├── package.json
│   ├── uploads/                # uploaded images/videos (gitignored)
│   └── src/
│       ├── server.js           # entry point
│       ├── app.js              # express app + middleware wiring
│       ├── db.js               # mysql connection pool
│       ├── config/
│       ├── controllers/
│       │   ├── authController.js
│       │   └── reelController.js
│       ├── routes/
│       │   ├── authRoutes.js
│       │   ├── reelRoutes.js
│       │   └── brandRoutes.js
│       ├── models/
│       │   ├── userModel.js
│       │   ├── reelModel.js
│       │   └── reelMediaModel.js
│       ├── services/
│       │   ├── aiService.js    # OpenAI (structured JSON, mock fallback)
│       │   ├── voiceService.js # ElevenLabs (mock fallback)
│       │   └── videoService.js # Creatomate (mock fallback)
│       ├── middleware/
│       │   ├── authMiddleware.js
│       │   ├── errorMiddleware.js
│       │   └── uploadMiddleware.js
│       └── utils/
└── frontend/
    ├── .env.example            # VITE_API_URL
    ├── index.html
    ├── vite.config.js
    └── src/
        ├── main.jsx
        ├── App.jsx             # routing + route guards
        ├── index.css           # design system / tokens
        ├── app.css             # dashboard & page styles
        ├── assets/
        ├── components/         # Logo, Modal, ReelCard, MediaUploader…
        ├── layouts/            # DashboardLayout (sidebar + topbar)
        ├── pages/              # 12 pages
        ├── routes/
        ├── services/api.js     # fetch wrapper (token, errors, upload)
        ├── hooks/
        ├── context/            # AuthContext, ToastContext
        └── utils/
```

---

## 🚀 Setup Instructions

### 1. Prerequisites

- **Node.js** 18+
- **MySQL** 5.7+ / 8.x (local or Docker)
- **npm**

### 2. Database

```bash
mysql -u root -p < database/schema.sql
```

This creates the `reelforge` database, all tables, and seeds the default templates.

### 3. Backend

```bash
cd backend
npm install
cp .env.example .env      # then edit .env with your credentials
npm run dev               # starts on http://localhost:3000
```

### 4. Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev               # starts on http://localhost:5173
```

Open **http://localhost:5173**, create an account, and create your first Reel. 🎉

### 5. `.env` reference (backend)

```ini
PORT=3000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=reelforge
JWT_SECRET=your_long_random_secret
JWT_EXPIRES_IN=7d
OPENAI_API_KEY=
ELEVENLABS_API_KEY=
CREATOMATE_API_KEY=
CLIENT_URL=http://localhost:5173
VIDEO_PROVIDER=demo        # "demo" or "creatomate"
```

---

## 🔌 API Documentation

All responses use this shape:

```json
{ "success": true, "message": "...", "data": {} }
```

Errors:

```json
{ "success": false, "message": "..." }
```

Authenticated endpoints require: `Authorization: Bearer <token>`

### Auth

| Method | Endpoint | Body | Description |
|---|---|---|---|
| POST | `/api/auth/register` | `{ name, email, password, confirmPassword }` | Create account (creates free subscription, 5 reels) |
| POST | `/api/auth/login` | `{ email, password }` | Returns JWT + user |
| GET | `/api/auth/me` | — | Current user + subscription |

### Reels

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/reels` | Create a reel draft with business details |
| PUT | `/api/reels/:id` | Update a draft reel&apos;s business details |
| GET | `/api/reels?status=` | List my reels (filter: `all`, `completed`, `processing`, `failed`) |
| GET | `/api/reels/:id` | Get reel + media + parsed scenes |
| POST | `/api/reels/:id/generate` | Start full generation (AI script → voice → video) |
| GET | `/api/reels/:id/status` | Poll generation status |
| POST | `/api/reels/:id/regenerate` | Re-run generation with same details |
| DELETE | `/api/reels/:id` | Delete reel + its files |
| POST | `/api/reels/:id/media` | Upload media (`multipart/form-data`, field `file`, optional `file_type`) |
| DELETE | `/api/reels/:id/media/:mediaId` | Remove a media file |

### Brand Kit & Usage

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/brand-kit` | Get current user's brand kit |
| POST/PUT | `/api/brand-kit` | Create / upsert brand kit |
| GET | `/api/usage` | Plan, reels used/remaining, reset date, activity history |

### Reel status lifecycle

`draft → generating → voice_generating → rendering → completed | failed`

---

## 🧠 How the AI Generation Pipeline Works

`POST /api/reels/:id/generate`:

1. Validates authenticated user & reel ownership
2. Checks subscription limit (5 reels on Free plan)
3. Reads business details + uploaded media
4. Calls `aiService.generateReelConcept()` → OpenAI returns **structured JSON only**:
   ```json
   {
     "hook": "...",
     "concept": "...",
     "scenes": [
       { "scene": 1, "duration": 3, "visual": "...", "text": "...", "voiceover": "..." }
     ],
     "voiceover": "...",
     "caption": "...",
     "cta": "...",
     "hashtags": ["...", "..."]
   }
   ```
5. Response is **validated before saving** (invalid JSON → clear error, never garbage in DB)
6. `voiceService.generateVoice()` → saves voice file (or demo stub)
7. `videoService.createReelVideo()` → renders 1080×1920 / 9:16 video (or demo stub)
8. Usage is logged, subscription counter incremented, status set to `completed`
9. Frontend polls `GET /api/reels/:id/status` and shows animated progress stages

> If **no `OPENAI_API_KEY`** is configured, the app auto-falls back to a smart **demo/mock generator** so the full flow still works end-to-end.

---

## 🔑 How to Obtain & Configure API Keys

### 1. OpenAI (AI scripts, hooks, captions, hashtags)

1. Go to https://platform.openai.com/signup and create an account.
2. Open **API keys** → https://platform.openai.com/api-keys
3. Click **Create new secret key**, copy it.
4. Add credit at **Billing** (GPT-4o-mini is very cheap — a few reels cost pennies).
5. Set it in `backend/.env`:
   ```ini
   OPENAI_API_KEY=sk-...
   ```
6. Restart the backend. Reels now use real AI generation.

### 2. ElevenLabs (voiceover / text-to-speech)

1. Create an account at https://elevenlabs.io
2. Go to **Profile → API Keys**, or https://elevenlabs.io/app/settings/api-keys
3. Copy your API key into `backend/.env`:
   ```ini
   ELEVENLABS_API_KEY=...
   ```
4. The app uses the `eleven_multilingual_v2` multilingual model (supports English, Hindi, Gujarati, Hinglish). Restart backend to enable real voice. Without a key, voiceover is simulated but scripts/captions still work.

### 3. Creatomate (real video rendering)

1. Create an account at https://creatomate.com
2. Open **Settings → API Keys** and copy your key.
3. In `backend/.env`:
   ```ini
   CREATOMATE_API_KEY=...
   VIDEO_PROVIDER=creatomate
   ```
4. Restart the backend. Generation now calls Creatomate to render an actual **1080×1920 9:16 video** with your photos, animated text, logo, voiceover, and CTA.

> ⚠️ Creatomate needs to *reach* your uploads to composite them into the video. For local development, your server must be reachable from the internet — either deploy the backend, or use a tunnel such as ngrok/cloudflared, and update the `http://localhost:3000` URLs in `videoService.js` to your public URL.

### Switching between demo and real video

| Mode | `VIDEO_PROVIDER` | Result |
|---|---|---|
| Local ffmpeg (default) | `ffmpeg` | Renders a real 1080×1920 MP4 on the server with bundled ffmpeg |
| Demo (no rendering) | `demo` | Mock video, no MP4 file |
| Real rendering API | `creatomate` | Uses Creatomate (needs API key) |

The UI automatically shows **"Video rendering is currently in demo mode"** whenever no video file is produced. The service abstraction (`createReelVideo`) makes swapping providers trivial without touching controllers or the frontend.

---

## 🛡️ Security Notes

- All AI/API keys live **only** in `backend/.env` — never exposed to the browser.
- Passwords hashed with **bcrypt** (10 rounds).
- **JWT** auth middleware protects every reel/brand/usage route.
- **Parameterized SQL** queries everywhere (`mysql2` prepared statements).
- **Multer** validates file types and caps uploads at **50 MB**.
- **CORS** restricted to `CLIENT_URL`.
- Centralized error handler normalizes all failures.

---

## 🧑‍💻 Frontend Pages

1. **Landing** — hero, how it works, business types, AI features, example reels, pricing, FAQ, final CTA
2. **Register** — validation, loading/error/success states
3. **Login** — JWT auth, forgot password link, create account
4. **Dashboard** — stat cards, "Create Your Next Reel" hero, recent reels
5. **Create Reel** — 4-step wizard (Business Details → Preferences → Media → Generate)
6. **Reel Generating** — animated 6-stage progress + status polling
7. **Reel Result** — 9:16 video preview, download/share/edit, script/hook/voiceover/caption/hashtags/CTA tabs, regenerate
8. **My Reels** — filterable grid, view/download/delete/regenerate
9. **Templates** — categorized templates with selection
10. **Brand Kit** — colors, logo, fonts, Instagram, CTA with live preview
11. **Usage** — plan, progress bar, activity history, upgrade CTA
12. **Settings** — profile, password, brand, notifications, subscription

---

## 📦 Current MVP Status

- ✅ Register / Login / Dashboard
- ✅ Create Reel wizard + media upload + validation
- ✅ AI script generation (OpenAI **or** fallback demo generator)
- ✅ Voice + video via **service abstractions** with demo fallbacks
- ✅ My Reels, Reel result, brand kit, usage, settings, templates
- ✅ MySQL persistence + usage limits

**Next steps:** payment checkout for plans, Google OAuth, real Creatomate webhook callback handling, background job queue, multi-voice selection.

---

## 📄 License

For demonstration / MVP purposes. ReelForge AI is a fictional product built as a full-stack portfolio project.