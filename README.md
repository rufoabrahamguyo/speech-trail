# SpeakTrack

Practice out loud. Send a friend a link. Track the scores that actually move.

SpeakTrack is a speaking practice app. You save a session, share an assessment link, and a friend scores a fixed rubric without creating an account. Progress is the average of each category over time.

Video upload and AI speech analysis are not in this version.

## Run it locally

You need Python 3.12, Node 20 or newer, and MongoDB listening on port 27017. The API defaults to `mongodb://127.0.0.1:27017` and the database `speaktrack` (`MONGODB_URI` and `MONGODB_NAME`).

### API

```bash
cd backend
python3.12 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

### Web

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173. The dev server proxies `/api` to http://127.0.0.1:8000.

## How a review works

- Links use an unguessable token. You can turn a link off or let it expire.
- A guest can submit one review per name on a link. They cannot see other sessions, notes, or your email.
- If you open your own link while logged in, the app asks you to use self-assessment instead.
- Self-assessment scores are stored, and they stay out of the peer averages.

## Deploy

- Web: build with `npm run build` and host `frontend/dist`. On Vercel, set `VITE_API_URL` to the API origin with no trailing slash.
- API: from `backend`, run `gunicorn config.wsgi:application`. Set `DJANGO_SECRET_KEY`, `DJANGO_DEBUG=0`, `ALLOWED_HOSTS`, `CORS_ALLOWED_ORIGINS`, `MONGODB_URI`, and `MONGODB_NAME`.
