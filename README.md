## QR Message Server (Go + React + Postgres)

Guests scan a QR code, land on a polished React form, and their note gets stored in Postgres through the Go API. A separate monitor frontend shows the live feed, while the JSON API (`/admin`) stays available for automation.

### Prerequisites
- Go 1.21+
- Docker + Docker Compose
- Node.js 18+ (needed for the React build)
- Optional: [ngrok](https://ngrok.com/) (or Cloudflare Tunnel) to expose the site
- Optional: `npx qrcode-terminal` or any QR generator

### 1. Start PostgreSQL with Docker
```bash
docker compose up -d
```
- Host: `localhost`
- Port: `5432`
- User/Pass: `postgres / postgres`
- DB: `appdb`

### 2. Configure environment for Go
```bash
cp .env.example .env
export $(cat .env | xargs)
```
Set `ADMIN_USERNAME` and `ADMIN_PASSWORD` to something only you know—admin APIs require HTTP Basic auth with those credentials.

### 3. Install frontend dependencies
```bash
cd frontend
npm install
```

- **Local dev:** run `npm run dev` and visit `http://localhost:5173`. Vite proxies `/message` + `/admin` to the Go API at `http://localhost:3000`.
- **Production build (served by Go):** run `npm run build`. The Go server serves the static files from `frontend/dist`.

### 4. Run the Go server
```bash
go run main.go
```
Endpoints:
- `/` – React guest form (built assets must exist in `frontend/dist`)
- `/message` – POST endpoint for text notes (`{ "text": string }`)
- `/voice-message` – `multipart/form-data` upload for 60s audio clips (fields: `audio`, `duration`, optional `note`)
- `/admin` – JSON feed of the latest 200 text messages
- `/voice-messages` – JSON metadata for voice notes (plus `/voice-messages/:id/audio` for streaming)

Messages are capped at 500 characters and stored in the `messages` table automatically (created on boot if missing).

All admin routes (`/admin`, `/voice-messages*`) prompt for the Basic Auth credentials above. Leave those env vars blank only if you intentionally want them public (not recommended).

### One-step dev startup
```bash
./scripts/dev.sh
```
- Starts Postgres via Docker, loads `ADMIN_*` from `.env` for Go, installs frontend deps if missing, runs Go on `:3000` + Vite on `:5173`.
- Set `VITE_ADMIN_USERNAME`/`VITE_ADMIN_PASSWORD` in `frontend/.env` to match Go so `/admin-view` loads data in dev.

### 5. Voice message flow
- Guests tap “Start recording” to capture up to **60 seconds** (browser MediaRecorder API).
- Audio uploads as WebM/Opus via `/voice-message` and is stored straight in Postgres (`voice_messages` table). No S3 or external storage.
- Use the monitor app (below) or raw `/admin`/`/voice-messages` endpoints to review text entries and playable audio clips. Audio files serve from `/voice-messages/:id/audio`.

Because blobs live in Postgres, keep an eye on disk usage if you expect hundreds of long recordings. Each minute of Opus audio is roughly 500–700 KB.

### 6. Expose it to guests (example with ngrok)
```bash
ngrok http 3000
```
ngrok prints a public URL like `https://abcd-1234.ngrok-free.app`. Keep ngrok, Docker Postgres, and the Go server running the whole time you want to accept notes.

### 7. Turn the public URL into a QR code
```bash
npx qrcode-terminal "https://abcd-1234.ngrok-free.app"
```
Print/display that QR for guests. Share the monitor app (or the raw `/admin` JSON behind a password) only with people who should monitor submissions.

### Monitor frontend (live feed)
```
cd monitor
npm install
npm run dev    # or npm run build && npm run preview
```
Environment variables for the monitor (`monitor/.env`):
```
VITE_API_BASE=http://localhost:3000
VITE_ADMIN_USERNAME=admin
VITE_ADMIN_PASSWORD=change-me
```
Visit the dev server URL (default `http://localhost:5173`) to see text messages and voice notes. Basic Auth headers are added automatically if the `VITE_ADMIN_*` values are set.

### Operability tips
- Restart Postgres and the Go server after reboots.
- Swap ngrok with Cloudflare Tunnel if you want a custom domain.
- Add auth/rate limiting around `/admin` if the QR is public.
- Back up messages and voice blobs from Postgres if you need them permanently.
