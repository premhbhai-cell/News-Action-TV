-- =========================================================
-- NEWS ACTION TV - SUPABASE DATABASE SETUP
-- SINGLE ADMIN
-- Admin Email: [newsactiontv@gmail.com](mailto:newsactiontv@gmail.com)
-----------------------------------------------------------------------

-- IMPORTANT:
-- Admin password is NOT stored in this SQL.
-- Create the admin user from:
-- Supabase Dashboard → Authentication → Users
-- =========================================================

-- =========================================================
-- 1. NEWS TABLE
-- =========================================================

create table if not exists public.news (
id uuid primary key default gen_random_uuid(),

title text not null
check (length(trim(title)) > 0),

description text not null default '',

content text not null default '',

category text not null
check (
category in (
'varanasi',
'uttar-pradesh',
'desh',
'rajneeti',
'apradh',
'mumbai',
'video'
)
),

location text not null default '',

news_date date not null default current_date,

news_time time not null default localtime,

published boolean not null default false,

image_url text,

video_url text
check (
video_url is null
or video_url ~ '^https?://'
),

created_at timestamptz not null default now(),

updated_at timestamptz not null default now()
);

-- =========================================================
-- 2. INDEXES
-------------

-- These help the homepage/category pages retrieve
-- the newest published news efficiently.
-- =========================================================

create index if not exists news_published_date_idx
on public.news (
published,
news_date desc,
created_at desc
);

create index if not exists news_published_category_date_idx
on public.news (
published,
category,
news_date desc,
created_at desc
);

-- =========================================================
-- 3. UPDATED_AT FUNCTION
-- =========================================================

create or replace function public.set_news_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
new.updated_at = now();
return new;
end;

$$;


-- =========================================================
-- 4. UPDATED_AT TRIGGER
-- =========================================================

drop trigger if exists news_set_updated_at
on public.news;

create trigger news_set_updated_at
before update on public.news
for each row
execute function public.set_news_updated_at();


-- =========================================================
-- 5. ENABLE ROW LEVEL SECURITY
-- =========================================================

alter table public.news enable row level security;


-- =========================================================
-- 6. TABLE PERMISSIONS
-- =========================================================

revoke all
on table public.news
from anon, authenticated;

grant select
on table public.news
to anon, authenticated;

grant insert, update, delete
on table public.news
to authenticated;


-- =========================================================
-- 7. REMOVE OLD NEWS POLICIES
-- =========================================================

drop policy if exists "Public reads published news"
on public.news;

drop policy if exists "Only admin creates news"
on public.news;

drop policy if exists "Only admin updates news"
on public.news;

drop policy if exists "Only admin deletes news"
on public.news;


-- =========================================================
-- 8. PUBLIC READ POLICY
--
-- Normal visitors:
--   published news only
--
-- Admin:
--   published + unpublished news
-- =========================================================

create policy "Public reads published news"
on public.news
for select
to anon, authenticated
using (
  published = true

  or lower(
    coalesce(
      (select auth.jwt() ->> 'email'),
      ''
    )
  ) = 'newsactiontv@gmail.com'
);


-- =========================================================
-- 9. ADMIN INSERT POLICY
-- =========================================================

create policy "Only admin creates news"
on public.news
for insert
to authenticated
with check (
  lower(
    coalesce(
      (select auth.jwt() ->> 'email'),
      ''
    )
  ) = 'newsactiontv@gmail.com'
);


-- =========================================================
-- 10. ADMIN UPDATE POLICY
-- =========================================================

create policy "Only admin updates news"
on public.news
for update
to authenticated

using (
  lower(
    coalesce(
      (select auth.jwt() ->> 'email'),
      ''
    )
  ) = 'newsactiontv@gmail.com'
)

with check (
  lower(
    coalesce(
      (select auth.jwt() ->> 'email'),
      ''
    )
  ) = 'newsactiontv@gmail.com'
);


-- =========================================================
-- 11. ADMIN DELETE POLICY
-- =========================================================

create policy "Only admin deletes news"
on public.news
for delete
to authenticated

using (
  lower(
    coalesce(
      (select auth.jwt() ->> 'email'),
      ''
    )
  ) = 'newsactiontv@gmail.com'
);


-- =========================================================
-- 12. STORAGE BUCKET
-- =========================================================

insert into storage.buckets (
  id,
  name,
  public
)
values (
  'news-images',
  'news-images',
  true
)

on conflict (id)
do update
set public = excluded.public;


-- =========================================================
-- 13. REMOVE OLD STORAGE POLICIES
-- =========================================================

drop policy if exists "Public reads news images"
on storage.objects;

drop policy if exists "Only admin uploads news images"
on storage.objects;

drop policy if exists "Only admin updates news images"
on storage.objects;

drop policy if exists "Only admin deletes news images"
on storage.objects;


-- =========================================================
-- 14. PUBLIC IMAGE READ
-- =========================================================

create policy "Public reads news images"
on storage.objects
for select
to anon, authenticated
using (
  bucket_id = 'news-images'
);


-- =========================================================
-- 15. ADMIN IMAGE UPLOAD
-- =========================================================

create policy "Only admin uploads news images"
on storage.objects
for insert
to authenticated

with check (
  bucket_id = 'news-images'

  and lower(
    coalesce(
      (select auth.jwt() ->> 'email'),
      ''
    )
  ) = 'newsactiontv@gmail.com'
);


-- =========================================================
-- 16. ADMIN IMAGE UPDATE
-- =========================================================

create policy "Only admin updates news images"
on storage.objects
for update
to authenticated

using (
  bucket_id = 'news-images'

  and lower(
    coalesce(
      (select auth.jwt() ->> 'email'),
      ''
    )
  ) = 'newsactiontv@gmail.com'
)

with check (
  bucket_id = 'news-images'

  and lower(
    coalesce(
      (select auth.jwt() ->> 'email'),
      ''
    )
  ) = 'newsactiontv@gmail.com'
);


-- =========================================================
-- 17. ADMIN IMAGE DELETE
-- =========================================================

create policy "Only admin deletes news images"
on storage.objects
for delete
to authenticated

using (
  bucket_id = 'news-images'

  and lower(
    coalesce(
      (select auth.jwt() ->> 'email'),
      ''
    )
  ) = 'newsactiontv@gmail.com'
);


-- =========================================================
-- DONE
--
-- Database:
--   Public → published news only
--   Admin → full news CRUD
--
-- Storage:
--   Public → read images
--   Admin → upload/update/delete images
--
-- IMPORTANT:
--   7–8 news cards are controlled by the website's
--   JavaScript/Supabase query, NOT by this SQL.
-- =========================================================
$$
