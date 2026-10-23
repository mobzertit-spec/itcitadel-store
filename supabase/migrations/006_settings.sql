-- Small key/value settings read by the Edge Functions with the service role (e.g. the owner's Telegram chat id).
-- No policies: visitors and signed-in users cannot read or write it at all.
create table public.settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);
alter table public.settings enable row level security;
revoke all on public.settings from anon, authenticated;
