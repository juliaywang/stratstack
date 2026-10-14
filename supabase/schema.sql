-- Applied through the Supabase migration API; captain-owned workspaces.
create table public.ss_preferences (
 user_id uuid primary key references auth.users(id) on delete cascade,
 tiers jsonb not null default '{}' check (jsonb_typeof(tiers) = 'object' and pg_column_size(tiers)<20000)
);
create table public.ss_teams (
 id uuid primary key default gen_random_uuid(),
 owner uuid not null references auth.users(id) on delete cascade,
 name text not null check (length(btrim(name)) between 1 and 60),
 settings jsonb not null default '{}' check (jsonb_typeof(settings) = 'object' and pg_column_size(settings)<20000),
 created_at timestamptz not null default now()
);
create index ss_teams_owner_idx on public.ss_teams(owner);
create table public.ss_roster (
 id uuid primary key default gen_random_uuid(),
 team_id uuid not null references public.ss_teams(id) on delete cascade,
 name text not null check (length(btrim(name)) between 1 and 60),
 status text not null default 'Starter' check (status in ('Starter','Sub')),
 tiers jsonb not null default '{}' check (jsonb_typeof(tiers) = 'object' and pg_column_size(tiers)<20000),
 created_at timestamptz not null default now()
);
create index ss_roster_team_idx on public.ss_roster(team_id);
create table public.ss_observations (
 id uuid primary key default gen_random_uuid(),
 team_id uuid not null references public.ss_teams(id) on delete cascade,
 body jsonb not null check (jsonb_typeof(body) = 'object' and pg_column_size(body)<30000),
 created_at timestamptz not null default now()
);
create index ss_observations_team_idx on public.ss_observations(team_id);
create table public.ss_lineups (
 id uuid primary key default gen_random_uuid(),
 team_id uuid not null references public.ss_teams(id) on delete cascade,
 body jsonb not null check (jsonb_typeof(body) = 'object' and pg_column_size(body)<50000),
 created_at timestamptz not null default now()
);
create index ss_lineups_team_idx on public.ss_lineups(team_id);

alter table public.ss_preferences enable row level security;
alter table public.ss_teams enable row level security;
alter table public.ss_roster enable row level security;
alter table public.ss_observations enable row level security;
alter table public.ss_lineups enable row level security;

create policy own_preferences on public.ss_preferences for all to authenticated
 using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()));
create policy captain_teams on public.ss_teams for all to authenticated
 using (owner=(select auth.uid())) with check (owner=(select auth.uid()));
create policy captain_roster on public.ss_roster for all to authenticated
 using (team_id in (select id from public.ss_teams where owner=(select auth.uid())))
 with check (team_id in (select id from public.ss_teams where owner=(select auth.uid())));
create policy captain_observations on public.ss_observations for all to authenticated
 using (team_id in (select id from public.ss_teams where owner=(select auth.uid())))
 with check (team_id in (select id from public.ss_teams where owner=(select auth.uid())));
create policy captain_lineups on public.ss_lineups for all to authenticated
 using (team_id in (select id from public.ss_teams where owner=(select auth.uid())))
 with check (team_id in (select id from public.ss_teams where owner=(select auth.uid())));

revoke all on public.ss_preferences,public.ss_teams,public.ss_roster,public.ss_observations,public.ss_lineups from anon;
grant select,insert,update,delete on public.ss_preferences,public.ss_teams,public.ss_roster,public.ss_observations,public.ss_lineups to authenticated;
