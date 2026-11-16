# PomoMental

PomoMental is a calm, bilingual study companion built around intentional Pomodoro sessions. It supports Arabic RTL and English LTR, a focus timer, ambient focus sounds, study rooms, personal progress, and a companion that helps make each session feel a little more human.

## Highlights

- Arabic and English interface with Arabic-Indic numerals in Arabic mode
- Custom focus, short-break, long-break, and cycle durations
- Topic-based study records with weekly and monthly progress views
- Calm color-noise and nature sounds only — no music
- Study rooms with focused invitations, synchronized timers, and break-only chat
- A night journey to a castle for each study topic
- Companion customization and university-inspired outfits
- Owner-only administration, enforced by the connected database
- A first-sign-in profile with a chosen name and a current or target university
- A redesigned study board with university details and no emoji ranks
- Leader-selected waiting countdowns and a shared, finite room schedule

## GitHub Pages deployment

This repository contains the ready-to-publish static site. The workflow in .github/workflows/pages.yml deploys every push to main. In repository settings, open Pages and select GitHub Actions as the source.

## Configure sign-in after deployment

The application uses a Supabase project with a public URL and publishable key only. No administrative database secret belongs in this repository.

In Supabase Authentication > URL Configuration, use the site URL `https://shd5n.github.io/pomomental/focus.html` and allow these exact redirect URLs:

- `https://shd5n.github.io/pomomental/focus.html?auth=callback`
- `https://shd5n.github.io/pomomental/focus.html?auth=recovery`

The Google Cloud OAuth client must keep this authorized redirect URI: `https://ocdpuysymzqfagxmdyqe.supabase.co/auth/v1/callback`. Google redirects to Supabase; Supabase returns the visitor to PomoMental. If JavaScript origins are configured, use `https://shd5n.github.io` (no path).

Apply `.deployment/0003_account_and_rooms.sql` once in the connected project's SQL Editor before enabling the new waiting-room flow. The migration preserves study records and can be safely rerun. It adds profile onboarding, university rankings, a leader-selected waiting period, and a database owner check against the assigned account's confirmed email. Waiting rooms remain unavailable until the database reports that the migration is active.

## Local preview

Serve this repository with any static web server and open focus.html. With Node.js, run: node scripts/serve-static.mjs

## Ownership and security

The administrator interface requires both server authorization and the exact confirmed owner account. The database independently checks the stored owner ID and its verified email on every administrative request. Profile input and browser storage cannot assign administrative roles.

Built and maintained by the PomoMental Team.
