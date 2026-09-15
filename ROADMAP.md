# Roadmap

The product idea: a Reddit/Twitter-style community feed for sharing swings
and asking questions, plus a Snapchat-Maps-style way to find and connect with
golfers near you. This is the phase pipeline toward that, in priority order.
Each phase is a GitHub issue — check there for the live checklist and
discussion; this file is the map of how the phases fit together and why
they're ordered this way.

## ✅ Shipped

- **Foundation** — auth (JWT + bcrypt), Postgres, .NET + Next.js scaffold.
  ([#1](https://github.com/Michael-Gayvoronsky/GolfCoachPoC/issues/1), closed —
  rebuilt on a different stack than originally planned)
- **Media upload** — Cloudinary-backed image/video upload.
  ([#2](https://github.com/Michael-Gayvoronsky/GolfCoachPoC/issues/2), closed)
- **Posts & feed** — create/browse posts, trending tab, skill-level filter.
  ([#3](https://github.com/Michael-Gayvoronsky/GolfCoachPoC/issues/3), closed)
- **Social graph basics** — likes, comments, follows, user stats.
  (partially covers the original [#4](https://github.com/Michael-Gayvoronsky/GolfCoachPoC/issues/4)
  and [#5](https://github.com/Michael-Gayvoronsky/GolfCoachPoC/issues/5), both closed —
  real voting, threading, and profile pages are picked back up below since
  they were never finished)

## 🚧 In progress — current focus

- **Modern Community Feed** — the Reddit/Twitter half of the pitch. Text-only
  question/statement posts (not just photo/video), real up/downvote scoring,
  threaded comment replies, tags, and search, on a redesigned slick/modern
  feed UI.
  → [#22](https://github.com/Michael-Gayvoronsky/GolfCoachPoC/issues/22)

## 📋 Planned, in order

1. **Public profiles** — a real profile page (currently the "View Profile"
   link in post detail 404s, since this page was never built). Prerequisite
   for the map, since a pin needs somewhere to link to.
   → tracked as Phase 1 of [#21](https://github.com/Michael-Gayvoronsky/GolfCoachPoC/issues/21)
2. **Snap Map** — the Snapchat-Maps half of the pitch. Opt-in location
   sharing, a customizable cartoon avatar (DiceBear), and a map showing
   nearby golfers with handicap/age, linking into their profile.
   → [#21](https://github.com/Michael-Gayvoronsky/GolfCoachPoC/issues/21)
   (there's already uncommitted frontend scaffolding for this — map page,
   avatar customizer, profile pages — but the backend fields it depends on
   don't exist yet, so it isn't wired up end-to-end)
3. **Matchmaking & messaging** — the map lets you *see* nearby golfers; this
   is what lets you actually connect: invite/request to play, basic
   messaging to coordinate, availability/course-check-in signals,
   notifications.
   → [#23](https://github.com/Michael-Gayvoronsky/GolfCoachPoC/issues/23)
4. **Moderation & safety** — reporting, blocking, an admin review view.
   Deliberately sequenced alongside matchmaking rather than after it, since
   that's the phase that puts strangers in contact using real-world location.
   → [#6](https://github.com/Michael-Gayvoronsky/GolfCoachPoC/issues/6)
5. **Deployment & launch checklist** — hosting, secrets, real EF migrations
   instead of `EnsureCreated()`, production CORS, end-to-end verification.
   → [#7](https://github.com/Michael-Gayvoronsky/GolfCoachPoC/issues/7)

## Why this order

The map and matchmaking pieces are the most distinctive part of the product,
but they're also the most sensitive — real-world location plus age plus
arranging in-person meetups with strangers. Getting the feed genuinely good
first (and building public profiles as a real prerequisite, not an
afterthought) means the map phase lands on a foundation that already works,
instead of everything shipping half-finished at once.
