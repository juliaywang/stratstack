# Stratstack

A persistent Valorant team workspace built with Node.js 24, SQLite, and browser-native JavaScript. Install dependencies with `npm ci`.

The UI is adapted from the supplied `Esports Team Tier List App.zip`: navy navigation, coral accents, light dashboard, agent comfort rows, professional-signal cards, and the Lotus composition panel. Its agent/map assets and styles are integrated into the existing browser-native frontend; the uploaded Figma deployment scripts are not used. Overview metrics are computed from stored roster preferences and source-linked records. Fonts are served locally.

```sh
npm ci
npm start
# http://localhost:3000
npm run check
npm test
```

Accounts use salted scrypt passwords and HTTP-only sessions. Captains create teams, manage starter/sub profiles, edit ratings, and import observed professional compositions. Teammates join through the team's join code and edit their own ratings. All authenticated team members can save recommended lineups. Multiple teams per user are supported. A captain-created roster profile is separate from a joined account; create profiles for unregistered players only.

The demo roster is temporary; registered accounts, team membership, agent preferences, imported records, and saved lineups persist in `data/app.sqlite`. Back up that directory. `DATA_DIR` and `PORT` are optional environment variables. Production requires an HTTPS reverse proxy and `NODE_ENV=production` to enable Secure cookies. This local version has no password recovery or email verification.

The engine considers all 120 player assignments for each five-agent composition, maximizes comfort (0–4 per player), and ranks the resulting fits using comfort weighting plus the composition's share of snapshot and imported samples for the selected map. Unrated agents score zero. Scores are not win probabilities. Substitutes can be selected in any five-player lineup.

A source-linked VLR snapshot contains 28 team-map observations from October 8–12, 2026. This is a limited sample, not the full professional meta. Run `python scripts/refresh-pro-data.py` with network access, validate its output, and restart the server to refresh the snapshot. No automatic professional feed is connected. Illustrative templates are explicitly labeled and receive zero evidence credit. Import real observations under Pro insights as a JSON array:

```json
[{"team":"Team name","map":"Ascent","agents":["Jett","Sova","KAY/O","Omen","Killjoy"],"sample":1,"date":"2026-10-01","source":"https://www.vlr.gg/your-match-id"}]
```

Agent tier uploads are objects such as `{"Jett":4,"Omen":3}`. Values run from 0 (unrated) through 4 (signature). Imports replace that player's ratings. Pro record imports append observations; avoid duplicate imports. Agent thumbnails are sourced from VLR and belong to Riot Games. Supported agents and maps live in `engine.mjs` and should be maintained as the game changes.

## Vercel deployment

The repository includes `vercel.json`, a static build in `dist/`, and a Node API function at `api/index.mjs`. Connect the repository with the project root set to the repository root, Framework Preset **Other**, and Node.js **24.x**. The repository sets the build command (`npm run build`) and output directory (`dist`). Remove any conflicting Vercel dashboard overrides. Pushes to `main` trigger deployment when Git integration is enabled.

Without a database, the deployed app opens in clearly labeled demo mode: map recommendations, agent ratings, and the professional snapshot are available, but sign-in and team saves are disabled. Vercel's local filesystem is not persistent; the app never writes account data there.

To enable persistent accounts and shared teams, connect a Turso/libSQL database and set these in **Vercel → Project Settings → Environment Variables** for Production (and Preview if needed):

- `TURSO_DATABASE_URL`: the database's `libsql://...` URL.
- `TURSO_AUTH_TOKEN`: its database authentication token, stored as a sensitive environment variable.

Redeploy after setting the variables. Tables are created on the first API request. No credentials belong in Git or browser code. Local `npm start` continues to use `data/app.sqlite` unless a Turso URL is configured. Existing local accounts are not copied automatically into a new remote database.

Validation covers both SQLite and the libSQL adapter, plus the Vercel API's demo-mode behavior and static build output. The live Vercel URL could not be fetched from the author's environment because its outbound network policy blocks that domain.
