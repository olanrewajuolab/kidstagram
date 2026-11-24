# Kidstagram

A safe place for kids aged 5 to 16 to build projects like games and shows, and help their friends make theirs.
One codebase runs on the web, iPhone and Android (Expo + React Native), with Supabase as the backend.

## Safety model (v1)

| Rule | Where it's enforced |
| --- | --- |
| Parents create accounts; children can't sign up alone | `manage-child` edge function, `profiles` insert policy |
| Parental consent recorded before any child account exists | `parental_consents` table, checked in `manage-child` |
| Only nickname, avatar and birth month are stored for children | `profiles` schema |
| Private by default; only approved friends see shared projects | RLS on `projects`, `can_view_project()` |
| No direct messages and no search; friends connect by a code shared offline | No DM tables; `request_friend()` |
| Under-13 friendships need both parents' approval | `update_friendship_status()` trigger |
| Ages 5 to 8 can only post preset comments | `enforce_comment_rules()` trigger, text forced from `comment_presets` |
| Text filter for emails, phone numbers, links, social handles, addresses, personal questions, unkind words | `text_problem()` trigger (server) + `src/lib/moderation.ts` (client hints) |
| Report button on projects, steps and comments; reported items get flagged | `reports` table + `flag_reported_content()` |
| Parents can pause or delete a child account and all its data | Parent dashboard, `manage-child` delete |

The database rules are tested in `supabase/tests/rls_test.sql`.

### Before real children use it

- Replace the typed-name consent with a COPPA-approved **verifiable parental consent** method (card check, ID check or similar).
- Write a privacy policy and children's privacy notice; have a lawyer review them against COPPA and the UK Age Appropriate Design Code.
- Replace the starter word filter with a proper moderation service, and add image moderation when media uploads land.
- Set up a moderator account and a review routine for flagged content.

## Getting started

1. Install dependencies: `npm install`
2. Create a free project at [supabase.com](https://supabase.com).
3. Apply the database: in the Supabase SQL editor run `supabase/migrations/0001_init.sql`, or use the Supabase CLI with `supabase db push`.
4. Deploy the child-account function: `supabase functions deploy manage-child`.
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
supabase/functions/      Edge functions (manage-child)
supabase/tests/          Database safety tests
```

## Checks

```bash
npm run typecheck   # TypeScript
npm test            # unit tests for age bands and the text filter
npm run test:db     # database safety tests (needs a local Postgres: PGHOST/PGUSER)
```
