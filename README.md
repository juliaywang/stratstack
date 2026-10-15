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

The exact dynamic-programming search considers every available agent once and assigns five distinct agents to five distinct players. It keeps the top three distinct agent sets for each player/role state and requires Duelist, Initiator, Controller and Sentinel coverage plus a dedicated entry pick. It is no longer limited to imported team compositions.

The score averages the five assigned players' agent scores. At the default setting:

- 50% player comfort (0–4 mapped to 0–100)
- 30% map-specific MetaBot ranked agent performance (sample-adjusted win-rate score)
- 5% Valking patch-specific Platinum+ all-map agent performance (sample counts unpublished)
- 5% editorial map suitability (unreviewed agent/map pairs default to 60)
- 5% editorial patch adjustment (neutral 50, with bounded adjustments)
- 5% agent appearance frequency in the selected map's professional sample

The comfort slider rescales the remaining weights in a 60:10:10:10:10 ratio (MetaBot map agents/Valking all-map agents/map/patch/pro popularity). Empty professional datasets contribute zero evidence. Scores express model fit, **not** win probability or a claim of universally optimal play. Unrated assignments, missing evidence, pre-patch samples, unknown map suitability, and out-of-rotation maps produce explicit notices. Role coverage is a coarse model; ability combinations, lineups, opponent strategy and scrim results remain coaching inputs.

`game-data.mjs` contains the manually reviewed **13.08** snapshot (October 13, 2026), official Riot source links, 29 agents including Miks and Veto, recent balance notes and known rotation changes. It does not claim that every map's rotation status is verified. The numerical effects of buffs/nerfs are editorial estimates. Captains may override them for their team; no automatic patch ingestion or schedule is enabled.

`pro-data.json` contains 2,294 source-linked team/map observations across all 13 supported maps. The bounded VLR sample covers different competitive events and dates (May 2025–October 2026), not a complete or uniformly recent professional dataset. Icebox and Corrode currently have particularly small historical samples. The builder’s **Only compositions observed in matches** option restricts recommendations to recorded five-agent sets, optimized for your players under the same constraints. Every composition displays exact five-agent observations separately from related lineups; individual agent popularity remains a distinct score input. Links go to the original VLR match and map panel, with team, event and date. Historical coverage is flagged. Pro data shows per-map sample counts and a map filter.

The scraper now splits numeric map panels and the interleaved aggregate panel separately, preventing the aggregate agent list from silently discarding the first map. It preserves previous records, deduplicates by VLR match ID/map/team, tolerates individual request failures, and atomically replaces the snapshot only after obtaining valid records. It uses three workers and bounded pagination. Run a normal refresh or target historical windows and verified matches:

```sh
python scripts/refresh-pro-data.py --pages 4 --max-matches 150
python scripts/refresh-pro-data.py --start-page 12 --pages 3 --max-matches 150
python scripts/refresh-pro-data.py --match-url https://www.vlr.gg/626547/all-gamers-vs-tbd-valorant-masters-santiago-2026-lr2
python -m unittest discover -s test -p 'test_*.py'
```

Refresh remains manual; deploy the refreshed snapshot to update the hosted dataset. Team imports support map, team, five unique agents, positive sample count, date, source URL, and optional patch. Duplicate source/team/map records do not increase optimizer evidence. New saved lineups preserve their evidence snapshot; older saves show evidence from the current dataset. Review patch facts and map scores before later-patch play.

## Vercel

Retains the existing `vercel.json`, `api/index.mjs` Node function and static `dist/` build. Framework preset: Other. Node: 24.x. Build: `npm run build`. Output: `dist`. The build copies the engine and versioned game inputs beside browser assets.

The checked-in publishable project configuration enables Supabase mode without adding secrets to Vercel. Existing TURSO variables are ignored in default mode. Deploy this branch through the repository's Vercel integration after review.

## Verification

`npm test` covers legacy adapters, the new Supabase API contract using a simulated service, login confirmation, refresh rotation, captain checks, personal rankings, saved lineups, exclusions, patch effects, and optimizer correctness against an independent exhaustive search. Browser QA exercises the actual UI with a simulated authenticated API. Live Supabase RLS was verified separately. Full email delivery and live Auth HTTP calls could not be exercised from the authoring workspace because its network policy blocks the project's `supabase.co` endpoint.

### Additional meta sources

The **Meta sources** screen imports a reviewed subset of MetaBot.GG ranked statistics (31 compositions, all ranks/regions, map and patch unspecified) and ValoHub editorial recommendations (36 map-specific compositions, reviewed for patch 12.10 on May 28, 2026). The snapshot was checked October 15, 2026. It is not a live feed. Source counts and dates remain visible; ValoHub percentages are labeled estimates. Neither dataset is pooled into VLR professional observations or the optimizer's agent-popularity term.

Published agent sets are assigned to the selected five players and sorted by the existing team-fit model, respecting all filters and exclusions. Exact source matches also appear alongside generated lineup evidence. Global ranked statistics are explicitly not map-specific evidence. The accessible vstats and THESPIKE pages returned no composition rows; Strats.gg is linked as a strategy resource. These sites are not claimed as imported feeds.

To refresh, obtain reviewed text exports of the source pages, then run `python3 scripts/import-meta-sources.py --metabot-text /path/to/metabot.txt --valohub-text /path/to/valohub.txt --checked YYYY-MM-DD --output meta-data.mjs`. Review provider scope, update dates and methodology before committing; the ValoHub metadata must be revised if the source changes its patch or methodology. The importer refuses empty provider results and inconsistent ranked counts, retaining the previous snapshot on failure.

### Ranked agents drive the optimizer

`ranked-agent-data.mjs` contains 347 MetaBot map-agent rows across 12 maps, including every current rotation map, checked October 15, 2026. Rows retain the reported win rate, pick rate, sample size, source update and URL. Icebox was unavailable; Corrode lacks Miks. Missing rows use neutral 50, never inferred results. The public pages cover competitive play across all ranks, regions and platforms; their patch is unspecified.

The ranked score is `clamp(50 + 5 × (winRate − 50) × matches / (matches + 500), 0, 100)`. This is a documented heuristic with a 500-match neutral prior, not a win-probability prediction. Pick rates are shown as context, not used to double-weight popularity. Default overall weights are comfort 50 / MetaBot map agents 30 / Valking all-map agents 5 / editorial map 5 / patch 5 / VLR popularity 5. Source composition snapshots remain separate and do not force exact matches. ValoHub's older editorial estimates are not passed off as ranked agent results. vstats/THESPIKE have no imported usable tables, and Strats.gg remains a strategy resource.

Refresh reviewed map-page exports with `python3 scripts/import-agent-stats.py --input-dir /path/to/exports --checked YYYY-MM-DD --output ranked-agent-data.mjs` (files named `agents-Lotus.txt`, etc.). The importer reads only the overall table, excludes unknown IDs and attack/defense tables, and rejects incomplete or duplicate data. Inspect missing agents before committing. This remains a manual snapshot. Lineup details and Meta sources expose the inputs, and browser/server optimization use the same snapshot.

### Entry balance and Valking signal

Every generated lineup must include Jett, Raze, Neon or Waylay, plus Controller, Initiator and Sentinel coverage; the fifth slot is flexible. This is a conservative editorial entry classification, not a claim that other duelists cannot enter. The optimizer tracks entry coverage as an additional DP state so it can find the true best feasible lineups, rather than filtering only the top three afterward. Legacy `requireRoles:false` settings no longer disable balance. Observed-only lineups and source-comp roster fitting follow the same rule. Excluded/unrated entry pools produce no valid lineup instead of silently dropping entry coverage. Historical saved lineups remain snapshots.

`valking-agent-data.mjs` records 29 Platinum+ all-map agent rows from https://valking.gg/en/agents, patch 13.08, checked October 15, 2026. This separate 5% default signal uses `clamp(50 + 2.5 × (winRate − 50), 0, 100)`; sample counts are unpublished and are never invented or pooled with MetaBot. Refresh by reviewing that source table and preserving the scope, patch and date. U.GG returned 403, Blitz could not be fetched, and vstats returned no readable rows; none is represented as an active feed. Existing VLR, MetaBot and ValoHub snapshots remain available with their original attribution and limitations.
