# Pomodoro

A small Pomodoro timer built with React, Vite, Express, and MongoDB. The timer runs in the browser; the API stores completed focus sessions and serves the recent history.

## Requirements

- Node.js 20.19+ or 22.12+
- npm
- MongoDB running locally, or a MongoDB Atlas connection string for history persistence

## Run locally

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env` and set `MONGODB_URI` to your local database or Atlas URI.
3. Start both apps with `npm run dev`.
4. Open `http://localhost:5173`.

The timer works without MongoDB, but session history will be unavailable until the database connects. Keep `.env` private; never commit it or send database credentials in chat.

## Checks

- `npm run build` creates the production client bundle.
- `npm test` runs the timer and API validation tests.
- `npm run lint` checks the client code.

The API health endpoint is `GET /api/health` on port `5001`. Session history uses `GET /api/sessions`, and completed focus sessions are recorded with `POST /api/sessions`.