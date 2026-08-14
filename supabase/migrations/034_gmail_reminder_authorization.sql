create table if not exists public.gmail_oauth_states (
  state text primary key,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists public.gmail_sender_credentials (
  id boolean primary key default true check (id),
  email text not null,
  refresh_token text not null,
  connected_by uuid not null references public.profiles(id),
  connected_at timestamptz not null default now()
);

alter table public.gmail_oauth_states enable row level security;
alter table public.gmail_sender_credentials enable row level security;
