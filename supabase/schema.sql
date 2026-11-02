-- SYMBIO database schema with Row Level Security.
-- Run once in Supabase Dashboard → SQL Editor (or `supabase db push` with the CLI).
-- Safe to re-run: uses IF NOT EXISTS / OR REPLACE where possible.

-- ---------- Companies and membership ----------
create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  industry text not null check (char_length(industry) between 2 and 120),
  city_id text not null,
  roles text[] not null check (roles <@ array['generator','consumer']::text[] and cardinality(roles) > 0),
  description text not null default '' check (char_length(description) <= 1000),
  phone text not null default '',
  founded_year int,
  verification_status text not null default 'unverified' check (verification_status in ('unverified','pending','verified','rejected')),
  gstin text check (gstin is null or gstin ~ '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$'),
  created_at timestamptz not null default now()
);

create table if not exists public.memberships (
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'owner' check (role in ('owner','member')),
  primary key (company_id, user_id)
);

-- Helper used by policies: is the current user a member of this company?
create or replace function public.is_member(company uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.memberships m where m.company_id = company and m.user_id = auth.uid());
$$;

-- ---------- Marketplace ----------
create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  material_id text not null,
  title text not null check (char_length(title) <= 120),
  description text not null default '' check (char_length(description) <= 1000),
  quantity_kg numeric(14,3) not null check (quantity_kg > 0 and quantity_kg <= 10000000),
  unit text not null check (unit in ('kg','tonne')),
  price_per_kg numeric(12,2) not null check (price_per_kg >= 0),
  city_id text not null,
  quality text not null check (quality in ('A','B','C')),
  moisture_pct numeric(5,1) not null check (moisture_pct between 0 and 100),
  contamination text not null check (contamination in ('none','low','moderate','high')),
  availability text not null check (availability in ('immediate','weekly','monthly','one_time')),
  image_path text,               -- object path in the `listing-images` storage bucket
  status text not null default 'active' check (status in ('active','closed')),
  created_at timestamptz not null default now()
);

create table if not exists public.requirements (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  material_id text not null,
  quantity_kg numeric(14,3) not null check (quantity_kg > 0),
  max_budget_per_kg numeric(12,2) not null check (max_budget_per_kg >= 0),
  city_id text not null,
  max_distance_km int not null check (max_distance_km between 1 and 3000),
  min_quality text not null check (min_quality in ('A','B','C')),
  max_contamination text not null check (max_contamination in ('none','low','moderate','high')),
  max_moisture_pct numeric(5,1),
  delivery text not null check (delivery in ('pickup','delivery','either')),
  notes text not null default '' check (char_length(notes) <= 1000),
  status text not null default 'open' check (status in ('open','closed')),
  created_at timestamptz not null default now()
);

-- ---------- Deals, offers, messages, payments ----------
create table if not exists public.deals (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id),
  requirement_id uuid references public.requirements(id),
  buyer_id uuid not null references public.companies(id),
  seller_id uuid not null references public.companies(id),
  status text not null default 'requested' check (status in ('requested','negotiating','accepted','rejected','in_transit','completed','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (buyer_id <> seller_id)
);

create table if not exists public.offers (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references public.deals(id) on delete cascade,
  by_company_id uuid not null references public.companies(id),
  quantity_kg numeric(14,3) not null check (quantity_kg > 0),
  price_per_kg numeric(12,2) not null check (price_per_kg >= 0),
  note text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references public.deals(id) on delete cascade,
  company_id uuid not null references public.companies(id),
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now()
);

-- Payments are written only by a trusted server (payment-provider webhook) with the secret key.
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references public.deals(id) on delete cascade,
  amount_inr numeric(14,2) not null check (amount_inr >= 0),
  method text not null,
  provider_ref text,
  status text not null check (status in ('pending','held_in_escrow','released','refunded','failed')),
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  kind text not null,
  title text not null,
  href text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

-- Public contact form (insert-only for anyone).
create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  email text not null check (char_length(email) <= 254),
  company text check (char_length(company) <= 120),
  topic text not null check (topic in ('listing','sourcing','pilot','other')),
  message text not null check (char_length(message) between 10 and 1000),
  created_at timestamptz not null default now()
);

-- ---------- Row Level Security ----------
alter table public.companies enable row level security;
alter table public.memberships enable row level security;
alter table public.listings enable row level security;
alter table public.requirements enable row level security;
alter table public.deals enable row level security;
alter table public.offers enable row level security;
alter table public.messages enable row level security;
alter table public.payments enable row level security;
alter table public.notifications enable row level security;
alter table public.contact_messages enable row level security;

-- Company profiles are public; members edit their own (verification fields excluded via trigger below).
drop policy if exists companies_read on public.companies;
create policy companies_read on public.companies for select using (true);
drop policy if exists companies_update on public.companies;
create policy companies_update on public.companies for update using (public.is_member(id)) with check (public.is_member(id));
drop policy if exists companies_insert on public.companies;
create policy companies_insert on public.companies for insert to authenticated with check (true);

drop policy if exists memberships_read on public.memberships;
create policy memberships_read on public.memberships for select using (user_id = auth.uid());
drop policy if exists memberships_insert_self on public.memberships;
create policy memberships_insert_self on public.memberships for insert to authenticated
  with check (user_id = auth.uid() and not exists (select 1 from public.memberships m where m.company_id = memberships.company_id));

-- Active listings and open requirements are public; owners manage their own.
drop policy if exists listings_read on public.listings;
create policy listings_read on public.listings for select using (status = 'active' or public.is_member(company_id));
drop policy if exists listings_write on public.listings;
create policy listings_write on public.listings for all using (public.is_member(company_id)) with check (public.is_member(company_id));

drop policy if exists requirements_read on public.requirements;
create policy requirements_read on public.requirements for select using (status = 'open' or public.is_member(company_id));
drop policy if exists requirements_write on public.requirements;
create policy requirements_write on public.requirements for all using (public.is_member(company_id)) with check (public.is_member(company_id));

-- Deals and their threads: only the two parties.
drop policy if exists deals_read on public.deals;
create policy deals_read on public.deals for select using (public.is_member(buyer_id) or public.is_member(seller_id));
drop policy if exists deals_insert on public.deals;
create policy deals_insert on public.deals for insert with check (public.is_member(buyer_id) and status = 'requested');
drop policy if exists deals_update on public.deals;
create policy deals_update on public.deals for update using (public.is_member(buyer_id) or public.is_member(seller_id));

drop policy if exists offers_rw on public.offers;
create policy offers_rw on public.offers for all
  using (exists (select 1 from public.deals d where d.id = deal_id and (public.is_member(d.buyer_id) or public.is_member(d.seller_id))))
  with check (public.is_member(by_company_id) and exists (select 1 from public.deals d where d.id = deal_id and by_company_id in (d.buyer_id, d.seller_id)));

drop policy if exists messages_rw on public.messages;
create policy messages_rw on public.messages for all
  using (exists (select 1 from public.deals d where d.id = deal_id and (public.is_member(d.buyer_id) or public.is_member(d.seller_id))))
  with check (public.is_member(company_id) and exists (select 1 from public.deals d where d.id = deal_id and company_id in (d.buyer_id, d.seller_id)));

-- Parties can read payments; no client writes (server-side secret key only).
drop policy if exists payments_read on public.payments;
create policy payments_read on public.payments for select
  using (exists (select 1 from public.deals d where d.id = deal_id and (public.is_member(d.buyer_id) or public.is_member(d.seller_id))));

drop policy if exists notifications_own on public.notifications;
create policy notifications_own on public.notifications for select using (public.is_member(company_id));
drop policy if exists notifications_mark_read on public.notifications;
create policy notifications_mark_read on public.notifications for update using (public.is_member(company_id)) with check (public.is_member(company_id));

drop policy if exists contact_insert on public.contact_messages;
create policy contact_insert on public.contact_messages for insert to anon, authenticated with check (true);
-- No select policy: messages are readable only with the secret key / dashboard.

-- Members cannot self-verify: verification fields change only via the service role.
create or replace function public.protect_verification() returns trigger
language plpgsql as $$
begin
  if auth.role() <> 'service_role' and (new.verification_status is distinct from old.verification_status) then
    if not (old.verification_status in ('unverified','rejected') and new.verification_status = 'pending') then
      raise exception 'verification status can only be submitted for review';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists companies_protect_verification on public.companies;
create trigger companies_protect_verification before update on public.companies
  for each row execute function public.protect_verification();

-- Storage bucket for listing photos (public read, members upload into their company folder).
insert into storage.buckets (id, name, public) values ('listing-images', 'listing-images', true)
  on conflict (id) do nothing;
drop policy if exists listing_images_upload on storage.objects;
create policy listing_images_upload on storage.objects for insert to authenticated
  with check (bucket_id = 'listing-images' and public.is_member(((storage.foldername(name))[1])::uuid));
