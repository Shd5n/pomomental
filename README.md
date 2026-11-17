# PomoMental

PomoMental is a calm, bilingual study companion built around intentional Pomodoro sessions. It supports Arabic RTL and English LTR, a focus timer, ambient focus sounds, study rooms, personal progress, and a companion that helps make each session feel a little more human.

## Highlights

- Arabic and English interface with Arabic-Indic numerals in Arabic mode
- Custom focus, short-break, long-break, and cycle durations
- Topic-based study records with weekly and monthly progress views
- Calm color-noise and nature sounds only — no music
- Study rooms with friendly bilingual invitations, explicit 12-hour AM/PM times, and synchronized timers
- Chat during the waiting countdown and breaks, with history expiring when the room session ends
- A personal sound mixer for each participant; sounds never broadcast to the room
- A night journey to a castle for each study topic
- Boy, girl, engineer, doctor, and formal Saudi companions, with still portraits in rooms and chat
- 240 bundled university website icons, including Saudi institutions, displayed on companion outfits
- 60 prompts per language, shuffled without repeats; TED-inspired prompts link to their talks
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

The subsequent room updates are recorded in `.deployment/20261117091102_room_social_and_companions.sql` and `.deployment/20261117091146_expire_room_chat_automatically.sql`. Apply each once, in order, when configuring a new database from the base schema. They are already applied to the connected production project. Chat is inaccessible immediately when the session ends, deleted on the next room read, and also purged by a database job every minute even if everyone disconnects. Closing a room deletes its chat immediately. Study records remain intact.

## University assets and inspiration

The supplied university directory contains 245 entries. It provides website favicons rather than a verified set of full official logos. We bundled 240 usable icons locally, including replacements from institutional websites. Five unavailable or ambiguous images use an initials badge. The asset report is in `.deployment/university-emblem-report.json`. University trademarks belong to their respective institutions; inclusion does not imply affiliation or endorsement. Costume colors remain editable.

Motivational prompts are original study-focused paraphrases inspired by eight TED talks, plus original PomoMental prompts. They are not verbatim quotations or endorsements. Each inspired prompt links to its source in the interface.

## Local preview

Serve this repository with any static web server and open focus.html. With Node.js, run: node scripts/serve-static.mjs

## Ownership and security

The administrator interface requires both server authorization and the exact confirmed owner account. The database independently checks the stored owner ID and its verified email on every administrative request. Profile input and browser storage cannot assign administrative roles.

Built and maintained by the PomoMental Team.
