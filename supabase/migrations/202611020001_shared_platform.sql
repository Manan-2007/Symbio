-- Apply AFTER schema.sql. All application mutations are authenticated, atomic RPCs.
-- No service-role key is used by the application.
begin;
create table if not exists public.app_cities(id text primary key, lat double precision not null, lng double precision not null);
create table if not exists public.app_materials(id text primary key);
insert into public.app_cities values
('ludhiana',30.901,75.8573),('doraha',30.799,76.0244),('chandigarh',30.7333,76.7794),('mohali',30.7046,76.7179),('jalandhar',31.326,75.5762),('amritsar',31.634,74.8723),('patiala',30.3398,76.3869),('gobindgarh',30.6696,76.2984),('panipat',29.3909,76.9635),('delhi',28.6139,77.209) on conflict do nothing;
insert into public.app_materials values ('sawdust'),('wood_chips'),('pallet_wood'),('cotton_scraps'),('polyester_scraps'),('pet_flakes'),('hdpe_regrind'),('plastic_film'),('steel_turnings'),('aluminium_scrap'),('coffee_grounds'),('food_waste'),('cardboard'),('paper_offcuts'),('concrete_rubble') on conflict do nothing;
alter table public.companies add column if not exists verification_document text;
alter table public.companies add column if not exists verification_submitted_at timestamptz;
alter table public.companies add column if not exists notifications_seen_at timestamptz;
create unique index if not exists memberships_one_company_per_user on public.memberships(user_id);
create table if not exists public.saved_listings(company_id uuid references public.companies(id), listing_id uuid references public.listings(id), primary key(company_id,listing_id));
create table if not exists public.deal_events(id uuid primary key default gen_random_uuid(), deal_id uuid not null references public.deals(id), company_id uuid not null references public.companies(id), status text not null, created_at timestamptz not null default now());
alter table public.saved_listings enable row level security;
alter table public.deal_events enable row level security;
alter table public.app_cities enable row level security;
alter table public.app_materials enable row level security;
drop policy if exists saved_read on public.saved_listings;
create policy saved_read on public.saved_listings for select to authenticated using(public.is_member(company_id));
drop policy if exists events_read on public.deal_events;
create policy events_read on public.deal_events for select to authenticated using(exists(select 1 from public.deals d where d.id=deal_id and (public.is_member(d.buyer_id) or public.is_member(d.seller_id))));
-- Closed lots remain visible to the parties whose deal history references them.
drop policy if exists listings_read on public.listings;
create policy listings_read on public.listings for select using(status='active' or public.is_member(company_id) or exists(select 1 from public.deals d where d.listing_id=listings.id and (public.is_member(d.buyer_id) or public.is_member(d.seller_id))));
-- Remove the original membership-claim race and unrestricted status/offer writes.
revoke insert,update,delete on public.companies,public.memberships,public.listings,public.requirements,public.deals,public.offers,public.messages,public.payments,public.notifications,public.saved_listings,public.deal_events from anon,authenticated;
grant select on public.companies,public.memberships,public.listings,public.requirements,public.deals,public.offers,public.messages,public.payments,public.notifications,public.saved_listings,public.deal_events to authenticated;
grant select on public.companies,public.listings,public.requirements to anon;
grant insert on public.contact_messages to anon,authenticated;
create index if not exists listings_company_idx on public.listings(company_id);
create index if not exists requirements_company_idx on public.requirements(company_id);
create index if not exists deals_buyer_idx on public.deals(buyer_id);
create index if not exists deals_seller_idx on public.deals(seller_id);
create index if not exists offers_deal_idx on public.offers(deal_id,created_at);
create index if not exists messages_deal_idx on public.messages(deal_id,created_at);
create unique index if not exists deals_one_open_request on public.deals(listing_id,buyer_id) where status in ('requested','negotiating','accepted','in_transit');

create or replace function public.app_number(p jsonb,k text,lo numeric,hi numeric,places integer) returns numeric
language plpgsql immutable set search_path='' as $$
declare n numeric;
begin
 if jsonb_typeof(p->k) is distinct from 'number' then raise exception 'Enter a numeric value for %',k; end if;
 n:=(p->>k)::numeric;
 if n<lo or n>hi or round(n,places)<>n then raise exception 'Value out of range or precision for %',k; end if;
 return n;
end $$;

create or replace function public.app_mutate(action text,p jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); me uuid; ident uuid; l public.listings; r public.requirements; d public.deals; o public.offers;
 q numeric; price numeric; used numeric; new_status text; v_roles text[]; city text; mat text; note text; dist double precision; c1 public.app_cities; c2 public.app_cities;
begin
 if uid is null then raise exception 'Sign in first'; end if;
 -- Small-workload serialization prevents cross-deal overselling and duplicate onboarding.
 perform pg_advisory_xact_lock(701122,1);
 select company_id into me from public.memberships where user_id=uid;
 if action='createCompany' then
  if me is not null then return jsonb_build_object('id',me); end if;
  select array_agg(value) into v_roles from jsonb_array_elements_text(p->'roles');
  if v_roles is null or cardinality(v_roles)=0 or not v_roles<@array['generator','consumer']::text[] then raise exception 'Choose a company role'; end if;
  if not exists(select 1 from public.app_cities where id=p->>'cityId') then raise exception 'Choose a supported city'; end if;
  insert into public.companies(name,industry,city_id,roles,phone,founded_year) values(trim(p->>'companyName'),trim(p->>'industry'),p->>'cityId',v_roles,left(coalesce(p->>'phone',''),40),extract(year from now())) returning id into me;
  insert into public.memberships(company_id,user_id) values(me,uid);
  return jsonb_build_object('id',me);
 end if;
 if me is null then raise exception 'Complete company registration first'; end if;
 if action='updateProfile' then
  select array_agg(value) into v_roles from jsonb_array_elements_text(p->'roles');
  if v_roles is null or cardinality(v_roles)=0 or not v_roles<@array['generator','consumer']::text[] then raise exception 'Choose a company role'; end if;
  if not exists(select 1 from public.app_cities where id=p->>'cityId') then raise exception 'Choose a supported city'; end if;
  update public.companies set name=trim(p->>'name'),industry=trim(p->>'industry'),city_id=p->>'cityId',phone=left(coalesce(p->>'phone',''),40),description=coalesce(p->>'description',''),roles=v_roles,founded_year=public.app_number(p,'foundedYear',1800,extract(year from now()),0) where id=me;
 elsif action in ('addListing','addRequirement') then
  city:=p->>'cityId'; mat:=p->>'materialId';
  if not exists(select 1 from public.app_cities where id=city) or not exists(select 1 from public.app_materials where id=mat) then raise exception 'Unsupported material or city'; end if;
  if action='addListing' then
   if not exists(select 1 from public.companies where id=me and 'generator'=any(companies.roles)) then raise exception 'Generator role required'; end if;
   q:=public.app_number(p,'quantity',0.001,10000000,3)*(case when p->>'unit'='tonne' then 1000 else 1 end);
   if q>10000000 then raise exception 'Quantity too large'; end if;
   if p->>'imagePath' is not null and not starts_with(p->>'imagePath',me::text||'/') then raise exception 'Invalid image path'; end if;
   insert into public.listings(company_id,material_id,title,description,quantity_kg,unit,price_per_kg,city_id,quality,moisture_pct,contamination,availability,image_path)
   values(me,mat,coalesce(nullif(trim(p->>'title'),''),mat),coalesce(p->>'description',''),q,p->>'unit',public.app_number(p,'pricePerKg',0,100000,2),city,p->>'quality',public.app_number(p,'moisturePct',0,100,1),p->>'contamination',p->>'availability',p->>'imagePath') returning id into ident;
  else
   if not exists(select 1 from public.companies where id=me and 'consumer'=any(companies.roles)) then raise exception 'Consumer role required'; end if;
   insert into public.requirements(company_id,material_id,quantity_kg,max_budget_per_kg,city_id,max_distance_km,min_quality,max_contamination,max_moisture_pct,delivery,notes)
   values(me,mat,public.app_number(p,'quantityKg',0.001,10000000,3),public.app_number(p,'maxBudgetPerKg',0,100000,2),city,public.app_number(p,'maxDistanceKm',1,3000,0),p->>'minQuality',p->>'maxContamination',case when p->>'maxMoisturePct' is null then null else public.app_number(p,'maxMoisturePct',0,100,1) end,p->>'delivery',coalesce(p->>'notes','')) returning id into ident;
  end if;
 elsif action='setListingStatus' then
  update public.listings set status=p->>'status' where id=(p->>'id')::uuid and company_id=me;
  if not found then raise exception 'Only the listing owner can change its status'; end if;
 elsif action='setRequirementStatus' then
  update public.requirements set status=p->>'status' where id=(p->>'id')::uuid and company_id=me;
  if not found then raise exception 'Only the requirement owner can change its status'; end if;
 elsif action='toggleSaved' then
  delete from public.saved_listings where company_id=me and listing_id=(p->>'id')::uuid;
  if not found then insert into public.saved_listings values(me,(p->>'id')::uuid); end if;
 elsif action='markNotificationsSeen' then
  update public.companies set notifications_seen_at=now() where id=me;
 elsif action='submitVerification' then
  if char_length(coalesce(p->>'documentName','')) not between 1 and 200 then raise exception 'Document name required'; end if;
  update public.companies set gstin=upper(p->>'gstin'),verification_status='pending',verification_document=p->>'documentName',verification_submitted_at=now() where id=me and verification_status in ('unverified','rejected');
  if not found then raise exception 'Verification is already pending or completed'; end if;
 elsif action='requestDeal' then
  select * into l from public.listings where id=(p->>'listingId')::uuid;
  if not found or l.status<>'active' or l.company_id=me then raise exception 'Listing unavailable or owned by you'; end if;
  if not exists(select 1 from public.companies where id=me and 'consumer'=any(companies.roles)) then raise exception 'Consumer role required'; end if;
  q:=public.app_number(p,'quantityKg',0.001,l.quantity_kg,3); price:=public.app_number(p,'pricePerKg',0,100000,2);
  if p->>'requirementId' is not null then
   select * into r from public.requirements where id=(p->>'requirementId')::uuid and company_id=me and status='open';
   if not found or q>r.quantity_kg then raise exception 'Requirement unavailable or quantity too large'; end if;
   if not (l.material_id=r.material_id or (r.material_id||':'||l.material_id)=any(array['sawdust:wood_chips','wood_chips:sawdust','wood_chips:pallet_wood','pallet_wood:wood_chips','cotton_scraps:polyester_scraps','polyester_scraps:cotton_scraps','coffee_grounds:food_waste','food_waste:coffee_grounds','cardboard:paper_offcuts','paper_offcuts:cardboard'])) then raise exception 'Incompatible material'; end if;
   if l.quality>r.min_quality or array_position(array['none','low','moderate','high'],l.contamination)>array_position(array['none','low','moderate','high'],r.max_contamination) or l.moisture_pct>r.max_moisture_pct then raise exception 'Quality does not meet requirement'; end if;
   select * into c1 from public.app_cities where id=l.city_id; select * into c2 from public.app_cities where id=r.city_id;
   dist:=6371*2*asin(sqrt(least(1,power(sin(radians(c2.lat-c1.lat)/2),2)+cos(radians(c1.lat))*cos(radians(c2.lat))*power(sin(radians(c2.lng-c1.lng)/2),2)));
   if dist>r.max_distance_km then raise exception 'Outside the requirement radius'; end if;
  end if;
  insert into public.deals(listing_id,requirement_id,buyer_id,seller_id) values(l.id,(p->>'requirementId')::uuid,me,l.company_id) returning id into ident;
  note:=coalesce(p->>'note',''); if char_length(note)>1000 then raise exception 'Note too long'; end if;
  insert into public.offers(deal_id,by_company_id,quantity_kg,price_per_kg,note) values(ident,me,q,price,note);
  insert into public.deal_events(deal_id,company_id,status) values(ident,me,'requested');
 elsif action in ('counterOffer','acceptDeal','rejectDeal','cancelDeal','markDispatched','markReceived','sendMessage') then
  select * into d from public.deals where id=(p->>'id')::uuid and (buyer_id=me or seller_id=me) for update;
  if not found then raise exception 'Exchange not found or not yours'; end if;
  select * into l from public.listings where id=d.listing_id;
  select * into o from public.offers where deal_id=d.id order by created_at desc,id desc limit 1;
  new_status:=d.status;
  if action='sendMessage' then
   insert into public.messages(deal_id,company_id,body) values(d.id,me,trim(p->>'text'));
  elsif action='counterOffer' then
   if d.status not in ('requested','negotiating') then raise exception 'Offers are locked after acceptance'; end if;
   q:=public.app_number(p,'quantityKg',0.001,l.quantity_kg,3); price:=public.app_number(p,'pricePerKg',0,100000,2);
   if d.requirement_id is not null and q>(select quantity_kg from public.requirements where id=d.requirement_id) then raise exception 'Quantity exceeds requirement'; end if;
   note:=coalesce(p->>'note',''); if char_length(note)>1000 then raise exception 'Note too long'; end if;
   insert into public.offers(deal_id,by_company_id,quantity_kg,price_per_kg,note) values(d.id,me,q,price,note); new_status:='negotiating';
  elsif action in ('acceptDeal','rejectDeal') then
   if d.status not in ('requested','negotiating') or o.by_company_id=me then raise exception 'Only the other party may respond to the current offer'; end if;
   if action='acceptDeal' then
    if l.status<>'active' then raise exception 'Listing is closed'; end if;
    select coalesce(sum(latest.quantity_kg),0) into used from public.deals other cross join lateral(select quantity_kg from public.offers where deal_id=other.id order by created_at desc,id desc limit 1) latest where other.listing_id=l.id and other.status in ('accepted','in_transit','completed');
    if used+o.quantity_kg>l.quantity_kg then raise exception 'Insufficient uncommitted quantity'; end if;
    if d.requirement_id is not null then
     select * into r from public.requirements where id=d.requirement_id;
     select coalesce(sum(latest.quantity_kg),0) into used from public.deals other cross join lateral(select quantity_kg from public.offers where deal_id=other.id order by created_at desc,id desc limit 1) latest where other.requirement_id=r.id and other.status in ('accepted','in_transit','completed');
     if r.status<>'open' or used+o.quantity_kg>r.quantity_kg then raise exception 'Requirement closed or already fulfilled'; end if;
    end if;
    new_status:='accepted';
   else new_status:='rejected'; end if;
  elsif action='cancelDeal' then
   if d.status not in ('requested','negotiating','accepted') then raise exception 'Exchange can no longer be cancelled'; end if;
   new_status:='cancelled';
  elsif action='markDispatched' then
   if d.status<>'accepted' or d.seller_id<>me then raise exception 'Only the seller can dispatch an accepted exchange'; end if;
   new_status:='in_transit';
  elsif action='markReceived' then
   if d.status<>'in_transit' or d.buyer_id<>me then raise exception 'Only the buyer can confirm dispatched material'; end if;
   new_status:='completed';
  end if;
  update public.deals set status=new_status,updated_at=now() where id=d.id;
  if new_status<>d.status then insert into public.deal_events(deal_id,company_id,status) values(d.id,me,new_status); end if;
  ident:=d.id;
 else raise exception 'Unsupported action';
 end if;
 return jsonb_build_object('id',ident);
end $$;
revoke all on function public.app_mutate(text,jsonb) from public,anon;
grant execute on function public.app_mutate(text,jsonb) to authenticated;
revoke all on function public.app_number(jsonb,text,numeric,numeric,integer) from public,anon,authenticated;
revoke all on function public.is_member(uuid) from public,anon;
grant execute on function public.is_member(uuid) to anon,authenticated;
-- Storage writes remain scoped to a member's folder; listing records only reference that folder.
drop policy if exists listing_images_delete on storage.objects;
create policy listing_images_delete on storage.objects for delete to authenticated using(bucket_id='listing-images' and public.is_member(((storage.foldername(name))[1])::uuid));
commit;
