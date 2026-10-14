# Stratstack

A Valorant roster workspace with Supabase accounts, personal agent rankings, captain-managed teams, and map-specific composition optimization. The existing navy/coral dashboard and local Riot agent artwork are preserved.

## Run

Node.js 24:

```sh
npm ci
npm start
npm test
npm run check
```

The default backend is the connected StratStack Supabase project. Its URL and **publishable** key are in `supabase-config.mjs`; these identifiers are not secrets. Optional overrides are documented in `.env.example`. No service-role key is needed. Production sessions use Secure, HTTP-only cookies. Access tokens are verified by Supabase, and refresh tokens rotate through Supabase Auth.

## Player and captain workflow

1. Create an account, confirm the email, and sign in. If the confirmation email contains a code, the confirmation dialog accepts it. Otherwise follow its link and return to sign in.
2. Save personal 0–4 agent comfort ratings under **My agent rankings**.
3. Create a team in Settings. The creator is its captain.
4. Add all five players and any substitutes under **Team roster**. Teammates do not need accounts. Optionally copy your personal ratings into a player profile.
5. Enter each player's agent ratings under **Tier lists**.
6. Select five players and a map under **Compositions**. Generate the best three distinct compositions; save the best to the playbook.
7. Review **Patch & rules** to exclude agents, adjust balance weights, or relax four-role coverage. Rated-only mode disallows unrated picks.

Each captain owns an isolated workspace. There is no team-join flow in Supabase mode. Personal ratings are private to their account; copying them into a roster creates an independent snapshot. Saved lineups retain their selected map, patch, score breakdown, roster assignment, and model settings.

## Database

`supabase/schema.sql` is the reviewed source of the `captain_rosters` migration, already applied to project `masdbfkksqkpftinxgqn` via Supabase MCP. Do **not** apply it a second time to that project. A fresh project needs this schema and email/password Auth enabled. Configure Supabase Auth's Site URL to the final website URL for a smooth confirmation-link redirect. The application can also accept signup email codes without redirects. Default Supabase email delivery restrictions still apply; configure production SMTP in the Supabase dashboard when onboarding external users.

All five tables have row-level security and authenticated-role grants. Personal ratings require `auth.uid() = user_id`; teams require `auth.uid() = owner`; child records require ownership of their parent team. No authorization uses editable user metadata. A transactional live-database test verified cross-captain reads, updates, inserts, owner transfers and personal-ranking writes are blocked; its fixtures were rolled back. Supabase security advisors reported no notices after the migration.

The old SQLite/Turso implementation remains available only with `DATA_BACKEND=legacy` for compatibility. Legacy accounts are not migrated into Supabase. Do not set this option in the production Vercel project.

## Recommendation model

The exact dynamic-programming search considers every available agent once and assigns five distinct agents to five distinct players. It keeps the top three distinct agent sets for each player/role state and requires Duelist, Initiator, Controller and Sentinel coverage by default. It is no longer limited to imported team compositions.

The score averages the five assigned players' agent scores. At the default setting:

- 70% player comfort (0–4 mapped to 0–100)
- 15% editorial map suitability (unreviewed agent/map pairs default to 60)
- 6% editorial patch adjustment (neutral 50, with bounded adjustments)
- 9% agent appearance frequency in the selected map's professional sample

The comfort slider rescales the remaining weights in a 50:20:30 ratio. Empty professional datasets contribute zero evidence. Scores express model fit, **not** win probability or a claim of universally optimal play. Unrated assignments, missing evidence, pre-patch samples, unknown map suitability, and out-of-rotation maps produce explicit notices. Role coverage is a coarse model; ability combinations, lineups, opponent strategy and scrim results remain coaching inputs.

`game-data.mjs` contains the manually reviewed **13.08** snapshot (October 13, 2026), official Riot source links, 29 agents including Miks and Veto, recent balance notes and known rotation changes. It does not claim that every map's rotation status is verified. The numerical effects of buffs/nerfs are editorial estimates. Captains may override them for their team; no automatic patch ingestion or schedule is enabled.

`pro-data.json` retains the source-linked October 8–12, 2026 VLR snapshot (28 team-map observations). This is a limited, pre-13.08 sample. The Pro data screen supports imports with map, team, five unique agents, positive sample count, date, source URL, and optional `patch`. `scripts/refresh-pro-data.py` can refresh the snapshot manually. Review patch facts, agents, map scores and professional data before later-patch play.

## Vercel

Retains the existing `vercel.json`, `api/index.mjs` Node function and static `dist/` build. Framework preset: Other. Node: 24.x. Build: `npm run build`. Output: `dist`. The build copies the engine and versioned game inputs beside browser assets.

The checked-in publishable project configuration enables Supabase mode without adding secrets to Vercel. Existing TURSO variables are ignored in default mode. Deploy this branch through the repository's Vercel integration after review.

## Verification

`npm test` covers legacy adapters, the new Supabase API contract using a simulated service, login confirmation, refresh rotation, captain checks, personal rankings, saved lineups, exclusions, patch effects, and optimizer correctness against an independent exhaustive search. Browser QA exercises the actual UI with a simulated authenticated API. Live Supabase RLS was verified separately. Full email delivery and live Auth HTTP calls could not be exercised from the authoring workspace because its network policy blocks the project's `supabase.co` endpoint.
