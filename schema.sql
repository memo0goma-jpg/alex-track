-- ============================================================================
-- ALEX TRACK — Supabase production schema
-- Run once in Supabase SQL Editor. Never put the service_role key in the app.
-- ============================================================================

create extension if not exists pgcrypto;

-- 1) Profiles are created automatically when a Supabase Auth user registers.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name_ar text not null default 'مستخدم جديد',
  full_name_en text not null default 'New user',
  email text,
  role text not null default 'buyer' check (role in ('buyer','seller','admin')),
  company_name text,
  phone text,
  whatsapp text,
  governorate text not null default 'cairo',
  avatar_url text,
  is_verified boolean not null default false,
  is_suspended boolean not null default false,
  rating numeric(3,2) not null default 5.00 check (rating between 0 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2) Marketplace categories.
create table if not exists public.categories (
  id text primary key,
  group_type text not null check (group_type in ('heavy','agricultural','additional')),
  name_ar text not null,
  name_en text not null,
  icon_key text,
  is_active boolean not null default true,
  sort_order integer not null default 0
);

insert into public.categories (id,group_type,name_ar,name_en,icon_key,sort_order) values
('excavators','heavy','حفارات','Excavators','excavator',1),
('bulldozers','heavy','بلدوزرات','Bulldozers','bulldozer',2),
('wheel-loaders','heavy','لوادر','Wheel Loaders','loader',3),
('cranes','heavy','أوناش ورافعات','Cranes','crane',4),
('forklifts','heavy','كلاركات (رافعات شوكية)','Forklifts','forklift',5),
('graders','heavy','جريدرات تسوية','Graders','grader',6),
('dump-trucks','heavy','شاحنات قلاب','Dump Trucks','dumptruck',7),
('road-rollers','heavy','هراسات طرق','Road Rollers','roller',8),
('concrete-mixers','heavy','خلاطات خرسانة','Concrete Mixers','mixer',9),
('generators','heavy','مولدات كهرباء','Generators','generator',10),
('tractors','agricultural','جرارات زراعية','Tractors','tractor',11),
('harvesters','agricultural','حصادات زراعية','Harvesters','harvester',12),
('sprayers','agricultural','رشاشات مبيدات','Agricultural Sprayers','sprayer',13),
('plows','agricultural','محاريث','Plows','plow',14),
('seeders','agricultural','بذارات','Seeders','seeder',15),
('irrigation','agricultural','معدات ري محوري','Irrigation Equipment','irrigation',16),
('agri-trailers','agricultural','مقطورات زراعية','Agricultural Trailers','trailer',17),
('hay-balers','agricultural','مكابس قش','Hay Balers','baler',18),
('agri-pumps','agricultural','طلمبات ومضخات زراعية','Agricultural Pumps','pump',19),
('spare-parts','additional','قطع غيار أصلية','Spare Parts','parts',20),
('accessories','additional','ملحقات ومرفقات معدات','Equipment Accessories','accessory',21),
('construction-vehicles','additional','مركبات إنشاءات','Construction Vehicles','vehicle',22),
('used-equipment','additional','معدات مستعملة','Used Equipment','used',23),
('new-equipment','additional','معدات جديدة زيرو','New Equipment','new',24)
on conflict (id) do update set group_type=excluded.group_type,name_ar=excluded.name_ar,name_en=excluded.name_en,icon_key=excluded.icon_key,sort_order=excluded.sort_order;

-- 3) Equipment listings and their images.
create table if not exists public.equipment (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles(id) on delete restrict,
  category_id text not null references public.categories(id),
  title_ar text not null,
  title_en text not null,
  brand text not null,
  model text not null,
  manufacture_year integer not null check (manufacture_year between 1900 and 2100),
  price_egp numeric(14,2) not null check (price_egp >= 0),
  original_price_egp numeric(14,2) check (original_price_egp is null or original_price_egp >= 0),
  listing_type text not null check (listing_type in ('sale','rent')),
  rent_period text check (rent_period in ('day','month')),
  condition text not null check (condition in ('new','used')),
  operating_hours integer not null default 0 check (operating_hours >= 0),
  engine_specs_ar text not null default '',
  engine_specs_en text not null default '',
  weight_tons numeric(8,2) not null default 0 check (weight_tons >= 0),
  governorate text not null default 'cairo',
  description_ar text not null default '',
  description_en text not null default '',
  status text not null default 'pending' check (status in ('active','pending','sold','rented','rejected')),
  is_featured boolean not null default false,
  is_best_seller boolean not null default false,
  views integer not null default 0 check (views >= 0),
  stock_code text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.equipment_images (
  id uuid primary key default gen_random_uuid(),
  equipment_id uuid not null references public.equipment(id) on delete cascade,
  image_url text not null,
  object_path text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- 4) Buyer/seller interactions and moderation.
create table if not exists public.favorites (
  user_id uuid not null references public.profiles(id) on delete cascade,
  equipment_id uuid not null references public.equipment(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id,equipment_id)
);

create table if not exists public.inquiries (
  id uuid primary key default gen_random_uuid(),
  equipment_id uuid not null references public.equipment(id) on delete cascade,
  seller_id uuid not null references public.profiles(id) on delete cascade,
  buyer_id uuid references public.profiles(id) on delete set null,
  buyer_name text not null,
  buyer_phone text not null,
  message text not null,
  reply text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  equipment_id uuid not null references public.equipment(id) on delete cascade,
  buyer_id uuid not null references public.profiles(id) on delete cascade,
  reviewer_name text not null,
  rating smallint not null default 5 check (rating between 1 and 5),
  comment text not null,
  created_at timestamptz not null default now(),
  unique (equipment_id,buyer_id)
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  equipment_id uuid not null references public.equipment(id) on delete cascade,
  reporter_id uuid references public.profiles(id) on delete set null,
  reporter_name text not null default 'زائر المنصة',
  reason text not null,
  details text not null,
  status text not null default 'open' check (status in ('open','resolved','dismissed')),
  created_at timestamptz not null default now()
);

create table if not exists public.banners (
  id text primary key,
  badge_ar text not null,
  badge_en text not null,
  title_ar text not null,
  title_en text not null,
  subtitle_ar text not null,
  subtitle_en text not null,
  cta_ar text not null,
  cta_en text not null,
  filter_preset jsonb not null default '{}'::jsonb,
  image_url text not null,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  updated_at timestamptz not null default now()
);

insert into public.banners (id,badge_ar,badge_en,title_ar,title_en,subtitle_ar,subtitle_en,cta_ar,cta_en,filter_preset,image_url,is_active,sort_order) values
('ban-1','المنصة الصناعية الأولى في مصر','EGYPT’S #1 INDUSTRIAL MARKETPLACE','قوة الأداء في موقعك ومزرعتك مع ALEX TRACK','Power Your Jobsite & Farm with ALEX TRACK','اشترِ أو استأجر أحدث المعدات الثقيلة والجرارات الزراعية من وكلاء وتجار معتمدين في جميع محافظات مصر بضمان الفحص والشفافية.','Buy, sell, or rent certified heavy construction machinery and agricultural tractors from verified dealers across all Egyptian governorates.','تصفح المعدات الثقيلة','Explore Heavy Equipment','{"group":"heavy"}'::jsonb,'https://images.unsplash.com/photo-1580901368919-7738efb0f87e?auto=format&fit=crop&w=1000&q=80',true,1),
('ban-2','موسم الاستصلاح والزراعة 2026','2026 AGRICULTURAL MECHANIZATION SEASON','أحدث الجرارات والحصادات وأنظمة الري المحوري','Next-Gen Tractors, Harvesters & Pivot Irrigation','عروض حصرية على جرارات جون دير وماسي فيرجسون ونيو هولاند مع خدمات ما بعد البيع وتوافر قطع الغيار الأصلية.','Exclusive deals on John Deere, Massey Ferguson, and New Holland machinery with nationwide spare parts support.','استكشف المعدات الزراعية','Explore Agri Machinery','{"group":"agricultural"}'::jsonb,'https://images.unsplash.com/photo-1592982537447-7440770cbfc9?auto=format&fit=crop&w=1000&q=80',true,2),
('ban-3','حلول التأجير للمشروعات القومية','FLEET RENTAL FOR MEGA PROJECTS','استأجر معداتك باليوم أو الشهر بأفضل أسعار السوق','Rent Certified Machinery Daily or Monthly','لوادر، حفارات، هراسات، وأوناش جاهزة للتحرك الفوري لمواقع الإنشاءات والطرق في القاهرة، الإسكندرية، والعاصمة الإدارية.','Loaders, excavators, compactors, and cranes ready for immediate dispatch across Cairo, Alexandria, and the New Capital.','عرض معدات الإيجار','Browse Rental Fleet','{"listingType":"rent"}'::jsonb,'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=1000&q=80',true,3)
on conflict (id) do nothing;

-- Compatibility: safely add columns that were absent in the first draft schema.
alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists updated_at timestamptz not null default now();
alter table public.equipment add column if not exists is_best_seller boolean not null default false;
alter table public.equipment add column if not exists stock_code text;
alter table public.equipment add column if not exists updated_at timestamptz not null default now();
alter table public.equipment_images add column if not exists object_path text;
alter table public.equipment_images add column if not exists created_at timestamptz not null default now();
alter table public.reports add column if not exists reporter_name text not null default 'زائر المنصة';
alter table public.reports add column if not exists reporter_id uuid references public.profiles(id) on delete set null;
create unique index if not exists equipment_stock_code_unique_idx on public.equipment(stock_code) where stock_code is not null;

-- 5) Helpers and profile bootstrap.
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path=public
as $$ select exists (select 1 from public.profiles p where p.id=auth.uid() and p.role='admin' and not p.is_suspended); $$;

create or replace function public.is_active_seller()
returns boolean language sql stable security definer set search_path=public
as $$ select exists (select 1 from public.profiles p where p.id=auth.uid() and p.role='seller' and not p.is_suspended); $$;

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$ begin new.updated_at=now(); return new; end; $$;

create or replace function public.handle_new_auth_user()
returns trigger language plpgsql security definer set search_path=public
as $$
begin
  insert into public.profiles (id,full_name_ar,full_name_en,email,role,phone,governorate,company_name)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'name_ar',''), nullif(new.raw_user_meta_data->>'full_name',''), 'مستخدم جديد'),
    coalesce(nullif(new.raw_user_meta_data->>'name_en',''), nullif(new.raw_user_meta_data->>'full_name',''), 'New user'),
    new.email,
    case when new.raw_user_meta_data->>'account_role'='seller' then 'seller' else 'buyer' end,
    nullif(new.raw_user_meta_data->>'phone',''),
    coalesce(nullif(new.raw_user_meta_data->>'governorate',''),'cairo'),
    nullif(new.raw_user_meta_data->>'company_name','')
  ) on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_auth_user();

create or replace function public.guard_profile_privileges()
returns trigger language plpgsql security definer set search_path=public
as $$
begin
  if not public.is_admin() then
    if new.role is distinct from old.role or new.is_verified is distinct from old.is_verified
      or new.is_suspended is distinct from old.is_suspended or new.rating is distinct from old.rating then
      raise exception 'Protected profile fields can only be changed by an administrator';
    end if;
  end if;
  new.updated_at=now();
  return new;
end;
$$;
drop trigger if exists profiles_guard_privileges on public.profiles;
create trigger profiles_guard_privileges before update on public.profiles for each row execute procedure public.guard_profile_privileges();

create or replace function public.guard_equipment_fields()
returns trigger language plpgsql security definer set search_path=public
as $$
begin
  if not public.is_admin() then
    if new.seller_id is distinct from old.seller_id or new.is_featured is distinct from old.is_featured
      or new.is_best_seller is distinct from old.is_best_seller or new.views < old.views then
      raise exception 'Protected equipment fields cannot be changed by sellers';
    end if;
    if new.status not in ('pending','active','sold','rented') then
      raise exception 'Invalid listing status';
    end if;
    if new.status='active' and not exists(select 1 from public.profiles p where p.id=auth.uid() and p.is_verified) then
      raise exception 'Unverified sellers cannot activate listings';
    end if;
    if new.status is distinct from old.status and not ((old.status='active' and new.status in ('sold','rented')) or (old.status='rejected' and new.status='pending')) then
      raise exception 'Only an administrator can publish or reject a listing';
    end if;
  end if;
  new.updated_at=now();
  return new;
end;
$$;
drop trigger if exists equipment_guard_fields on public.equipment;
create trigger equipment_guard_fields before update on public.equipment for each row execute procedure public.guard_equipment_fields();

-- New seller listings always enter moderation; only admins can publish or feature them.
create or replace function public.guard_new_equipment()
returns trigger language plpgsql security definer set search_path=public
as $$
begin
  if not public.is_admin() then
    new.status := 'pending';
    new.is_featured := false;
    new.is_best_seller := false;
  end if;
  return new;
end;
$$;
drop trigger if exists equipment_insert_moderation on public.equipment;
create trigger equipment_insert_moderation before insert on public.equipment for each row execute procedure public.guard_new_equipment();

create or replace function public.increment_equipment_view(p_equipment_id uuid)
returns void language sql security definer set search_path=public
as $$ update public.equipment set views=views+1 where id=p_equipment_id and status in ('active','sold','rented'); $$;
grant execute on function public.increment_equipment_view(uuid) to anon,authenticated;

-- 6) Indexes for catalogue, dashboards, and joins.
create index if not exists equipment_status_created_idx on public.equipment(status,created_at desc);
create index if not exists equipment_category_status_idx on public.equipment(category_id,status);
create index if not exists equipment_seller_created_idx on public.equipment(seller_id,created_at desc);
create index if not exists equipment_price_idx on public.equipment(price_egp);
create index if not exists equipment_governorate_idx on public.equipment(governorate);
create index if not exists equipment_brand_idx on public.equipment(brand);
create index if not exists equipment_images_equipment_sort_idx on public.equipment_images(equipment_id,sort_order);
create index if not exists inquiries_seller_created_idx on public.inquiries(seller_id,created_at desc);
create index if not exists inquiries_buyer_idx on public.inquiries(buyer_id,created_at desc);
create index if not exists reviews_equipment_idx on public.reviews(equipment_id,created_at desc);
create index if not exists reports_status_created_idx on public.reports(status,created_at desc);

-- 7) RLS.
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.equipment enable row level security;
alter table public.equipment_images enable row level security;
alter table public.favorites enable row level security;
alter table public.inquiries enable row level security;
alter table public.reviews enable row level security;
alter table public.reports enable row level security;
alter table public.banners enable row level security;

drop policy if exists profiles_read_self_or_admin on public.profiles;
create policy profiles_read_self_or_admin on public.profiles for select to authenticated using (id=auth.uid() or public.is_admin());
drop policy if exists profiles_update_self_or_admin on public.profiles;
create policy profiles_update_self_or_admin on public.profiles for update to authenticated using (id=auth.uid() or public.is_admin()) with check (id=auth.uid() or public.is_admin());

drop policy if exists categories_read_active on public.categories;
create policy categories_read_active on public.categories for select to anon,authenticated using (is_active or public.is_admin());
drop policy if exists categories_admin_all on public.categories;
create policy categories_admin_all on public.categories for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Public view active equipment" on public.equipment;
drop policy if exists "Sellers insert own equipment" on public.equipment;
drop policy if exists "Sellers update own equipment" on public.equipment;
drop policy if exists equipment_public_read on public.equipment;
create policy equipment_public_read on public.equipment for select to anon,authenticated using (status in ('active','sold','rented') or seller_id=auth.uid() or public.is_admin());
drop policy if exists equipment_seller_insert on public.equipment;
create policy equipment_seller_insert on public.equipment for insert to authenticated with check ((seller_id=auth.uid() and public.is_active_seller()) or public.is_admin());
drop policy if exists equipment_seller_update on public.equipment;
create policy equipment_seller_update on public.equipment for update to authenticated using (seller_id=auth.uid() or public.is_admin()) with check (seller_id=auth.uid() or public.is_admin());
drop policy if exists equipment_seller_delete on public.equipment;
create policy equipment_seller_delete on public.equipment for delete to authenticated using (seller_id=auth.uid() or public.is_admin());

drop policy if exists equipment_images_read on public.equipment_images;
create policy equipment_images_read on public.equipment_images for select to anon,authenticated using (exists(select 1 from public.equipment e where e.id=equipment_id and (e.status in ('active','sold','rented') or e.seller_id=auth.uid() or public.is_admin())));
drop policy if exists equipment_images_owner_write on public.equipment_images;
create policy equipment_images_owner_write on public.equipment_images for all to authenticated using (exists(select 1 from public.equipment e where e.id=equipment_id and (e.seller_id=auth.uid() or public.is_admin()))) with check (exists(select 1 from public.equipment e where e.id=equipment_id and (e.seller_id=auth.uid() or public.is_admin())));

drop policy if exists favorites_owner_all on public.favorites;
create policy favorites_owner_all on public.favorites for all to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid());

drop policy if exists inquiries_read_participants on public.inquiries;
create policy inquiries_read_participants on public.inquiries for select to authenticated using (buyer_id=auth.uid() or seller_id=auth.uid() or public.is_admin());
drop policy if exists inquiries_create_public on public.inquiries;
create policy inquiries_create_public on public.inquiries for insert to anon,authenticated with check (
  (buyer_id is null or buyer_id=auth.uid()) and exists(select 1 from public.equipment e where e.id=equipment_id and e.seller_id=public.inquiries.seller_id and e.status='active')
);
drop policy if exists inquiries_seller_reply on public.inquiries;
create policy inquiries_seller_reply on public.inquiries for update to authenticated using (seller_id=auth.uid() or public.is_admin()) with check (seller_id=auth.uid() or public.is_admin());

drop policy if exists reviews_public_read on public.reviews;
create policy reviews_public_read on public.reviews for select to anon,authenticated using (true);
drop policy if exists reviews_buyer_insert on public.reviews;
create policy reviews_buyer_insert on public.reviews for insert to authenticated with check (buyer_id=auth.uid() and exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='buyer' and not p.is_suspended));
drop policy if exists reviews_owner_delete on public.reviews;
create policy reviews_owner_delete on public.reviews for delete to authenticated using (buyer_id=auth.uid() or public.is_admin());

drop policy if exists reports_public_insert on public.reports;
create policy reports_public_insert on public.reports for insert to anon,authenticated with check (reporter_id is null or reporter_id=auth.uid());
drop policy if exists reports_admin_read on public.reports;
create policy reports_admin_read on public.reports for select to authenticated using (public.is_admin());
drop policy if exists reports_admin_update on public.reports;
create policy reports_admin_update on public.reports for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists banners_public_read on public.banners;
create policy banners_public_read on public.banners for select to anon,authenticated using (is_active or public.is_admin());
drop policy if exists banners_admin_all on public.banners;
create policy banners_admin_all on public.banners for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Expose only safe seller contact/display fields publicly; email and moderation data stay private.
create or replace view public.public_seller_profiles with (security_barrier=true) as
select id,full_name_ar,full_name_en,company_name,phone,whatsapp,governorate,avatar_url,is_verified,rating
from public.profiles where role='seller' and not is_suspended;
grant select on public.public_seller_profiles to anon,authenticated;

-- Column-level grants stop ordinary users from changing role/moderation/rating columns.
revoke all on public.profiles from anon;
grant select on public.profiles to authenticated;
grant update (full_name_ar,full_name_en,phone,whatsapp,governorate,avatar_url,company_name,role,is_verified,is_suspended,rating) on public.profiles to authenticated;
-- Admin-only protected-field updates are additionally enforced by guard_profile_privileges().
grant select on public.categories,public.equipment,public.equipment_images,public.banners,public.reviews to anon,authenticated;
grant insert,delete on public.equipment to authenticated;
revoke update on public.equipment from authenticated;
grant update (category_id,title_ar,title_en,brand,model,manufacture_year,price_egp,original_price_egp,listing_type,rent_period,condition,operating_hours,engine_specs_ar,engine_specs_en,weight_tons,governorate,description_ar,description_en,status,stock_code) on public.equipment to authenticated;
grant select,insert,update,delete on public.equipment_images,public.favorites to authenticated;
grant select,insert on public.inquiries to anon;
grant select,insert on public.inquiries to authenticated;
revoke update on public.inquiries from authenticated;
grant update (reply,is_read) on public.inquiries to authenticated;
grant select,insert,delete on public.reviews to authenticated;
grant select,insert on public.reports to anon;
grant select,insert on public.reports to authenticated;
revoke update on public.reports from authenticated;
grant update (status) on public.reports to authenticated;
grant select,insert,update,delete on public.categories,public.banners to authenticated;

-- 8) Public image bucket. Object paths must start with the authenticated seller UUID.
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('equipment-images','equipment-images',true,10485760,array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public=true,file_size_limit=10485760,allowed_mime_types=array['image/jpeg','image/png','image/webp'];

drop policy if exists equipment_images_public_read on storage.objects;
create policy equipment_images_public_read on storage.objects for select to anon,authenticated using (bucket_id='equipment-images');
drop policy if exists equipment_images_seller_upload on storage.objects;
create policy equipment_images_seller_upload on storage.objects for insert to authenticated with check (
  bucket_id='equipment-images' and (storage.foldername(name))[1]=auth.uid()::text and (public.is_active_seller() or public.is_admin())
);
drop policy if exists equipment_images_seller_update on storage.objects;
create policy equipment_images_seller_update on storage.objects for update to authenticated using (
  bucket_id='equipment-images' and (storage.foldername(name))[1]=auth.uid()::text and (public.is_active_seller() or public.is_admin())
) with check (bucket_id='equipment-images' and (storage.foldername(name))[1]=auth.uid()::text and (public.is_active_seller() or public.is_admin()));
drop policy if exists equipment_images_seller_delete on storage.objects;
create policy equipment_images_seller_delete on storage.objects for delete to authenticated using (
  bucket_id='equipment-images' and ((storage.foldername(name))[1]=auth.uid()::text or public.is_admin())
);

-- IMPORTANT: Promote the first administrator manually from the Supabase SQL Editor
-- only after creating their account, replacing the UUID with that user's auth.users id:
-- update public.profiles set role='admin' where id='00000000-0000-0000-0000-000000000000';
