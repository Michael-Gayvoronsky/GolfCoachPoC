# GolfWithMe

A community app for golfers: share your swing, ask questions, get real
feedback, and find people near you to actually go play with. Think a
Reddit/Twitter-style feed crossed with a Snapchat-Maps-style way to find
golfers in your area.

## What's here today

- **Community feed** — post photos/videos of your swing, get likes and
  comments, browse a skill-level-filtered feed and a trending tab.
- **Auth** — email/password signup and login (JWT + bcrypt), no third-party
  auth provider.
- **Social graph** — follow other golfers, see their stats.
- **Media** — image/video upload via Cloudinary.

See [ROADMAP.md](ROADMAP.md) for what's in progress and what's planned next
— currently the focus is turning the feed into a proper Reddit/Twitter-style
experience (text posts, voting, threaded comments, tags, search).

## Stack

| | |
|---|---|
| Frontend | Next.js 15, React 18.3, TypeScript, Tailwind CSS, framer-motion |
| Backend | .NET 10 minimal API, Entity Framework Core, Npgsql |
| Database | PostgreSQL |
| Auth | JWT bearer tokens, bcrypt password hashing |
| Media | Cloudinary |

## Project layout

```
backend/    .NET minimal API — Program.cs (endpoints), Models.cs (entities + DTOs)
frontend/   Next.js App Router — app/ (routes), components/, lib/
```

## Running it locally

You need Postgres running locally, then start the backend and frontend as
two separate processes.

**1. Database** — make sure Postgres is running and reachable at the
connection string in `backend/appsettings.json` (`DatabaseUrl`, or set the
`DATABASE_URL` env var to override it). The backend creates the schema
automatically on first run via `Database.EnsureCreated()` — no separate
migration step needed for local dev.

**2. Backend**

```bash
cd backend
dotnet run
```

Runs on `http://localhost:5000`.

**3. Frontend**

```bash
cd frontend
npm install
npm run dev
```

Runs on `http://localhost:3000` and points at the API via
`NEXT_PUBLIC_API_URL` in `frontend/.env.local`.

## Contributing / project tracking

Work is tracked as [GitHub issues](https://github.com/Michael-Gayvoronsky/GolfCoachPoC/issues),
one per phase — see [ROADMAP.md](ROADMAP.md) for the current order and status
of each phase.
