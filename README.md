# Kidstagram

A safe place for kids aged 5 to 16 to build projects like games and shows, and help their friends make theirs.
One codebase runs on the web, iPhone and Android (Expo + React Native), with Supabase as the backend.

## Safety model (v1)

| Rule | Where it's enforced |
| --- | --- |
| Parents create accounts; children can't sign up alone | `claim_child()` links a brand-new child login to a consenting parent |
| Parental consent recorded before any child account exists | `parental_consents` table, checked in `claim_child()` |
| Only nickname, avatar and birth month are stored for children | `profiles` schema |
| Private by default; only approved friends see shared projects | RLS on `projects`, `can_view_project()` |
| No direct messages and no search; friends connect by a code shared offline | No DM tables; `request_friend()` |
| Under-13 friendships need both parents' approval | `update_friendship_status()` trigger |
| Ages 5 to 8 can only post preset comments | `enforce_comment_rules()` trigger, text forced from `comment_presets` |
| Text filter for emails, phone numbers, links, social handles, addresses, personal questions, unkind words | `text_problem()` trigger (server) + `src/lib/moderation.ts` (client hints) |
| Report button on projects, steps and comments; reported items get flagged | `reports` table + `flag_reported_content()` |
| Parents can pause or delete a child account and all its data | Parent dashboard, `delete_child()` |
| Words inside games and shows (speech, win messages) are filtered too | `text_problem()` over `projects.content` |
| Only the owner and invited helpers can change a game or show | `save_project_content()` |

The database rules are tested in `supabase/tests/rls_test.sql`.

### Before real children use it

- Replace the typed-name consent with a COPPA-approved **verifiable parental consent** method (card check, ID check or similar).
- Write a privacy policy and children's privacy notice; have a lawyer review them against COPPA and the UK Age Appropriate Design Code.
- Replace the starter word filter with a proper moderation service, and add image moderation when media uploads land.
- Set up a moderator account and a review routine for flagged content.

## What kids can make

- **Games (Game Builder):** kids learn to design a game by completing missions. They draw the level on a grid (blocks, start, finish flag, treasure, enemies), then write the rules with picture blocks ("When 🐱 touches 🏁 → You win!"). The game plays exactly by their rules. Each mission checks their game, unlocks a new tool, and asks them to test it by playing. Ages 5–8 get 6 missions; 9–12 add timers and moving enemies; 13–16 add lives and score targets. A game can be shared with friends once its missions are done. See `src/lib/builder.ts`.
- **Shows:** add scenes, pick a background, up to three characters per scene and what each one says. Press play and tap through it like a puppet show.
- Friends invited as helpers can change the game or show too. Everyone else who can see it can play it.

## Getting started

1. Install dependencies: `npm install`
2. Create a free project at [supabase.com](https://supabase.com).
3. Set up the database: open the SQL editor, paste all of `supabase/migrations/0001_init.sql`, and press Run.
4. In Authentication → Sign In / Providers → Email, turn off **Confirm email** (children's logins have no real email address).
5. Copy `.env.example` to `.env` and fill in your project URL and anon key (Project Settings → API).
6. Run it:
   - Web: `npm run web`
   - Phone: `npm start`, then scan the QR code with the Expo Go app.

## Project layout

```
src/app/                 Screens (Expo Router: every file is a route)
  welcome.tsx            Kid / grown-up choice
  parent/                Consent, dashboard, add child, child detail
  kid/                   Home, new project, project page, friends
src/lib/                 Supabase client, auth, API helpers, age bands, text filter, presets
src/components/          UI kit and theme
supabase/migrations/     Database schema and safety rules
supabase/tests/          Database safety tests
```

## Checks

```bash
npm run typecheck   # TypeScript
npm test            # unit tests for age bands and the text filter
npm run test:db     # database safety tests (needs a local Postgres: PGHOST/PGUSER)
```
