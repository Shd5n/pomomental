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

## GitHub Pages deployment

This repository contains the ready-to-publish static site. The workflow in .github/workflows/pages.yml deploys every push to main. In repository settings, open Pages and select GitHub Actions as the source.

## Configure sign-in after deployment

The application uses a Supabase project with a public URL and publishable key only. No administrative database secret belongs in this repository. After Pages provides the final address, add it to Supabase Authentication URL Configuration and to the Google Cloud OAuth client Authorized JavaScript origins. Keep the Supabase OAuth callback URL unchanged: https://ocdpuysymzqfagxmdyqe.supabase.co/auth/v1/callback

## Local preview

Serve this repository with any static web server and open focus.html. With Node.js, run: node scripts/serve-static.mjs

## Ownership and security

The administrator interface is conditional on the signed-in account database role. The database must independently enforce the same access policy.

Built and maintained by the PomoMental Team.
