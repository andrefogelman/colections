-- Profiles table linked to auth.users
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null,
  role text not null default 'viewer' check (role in ('admin', 'viewer')),
  must_change_password boolean not null default true,
  created_at timestamptz default now()
);

-- Auto-create profile on signup via trigger
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, name, email, role, must_change_password)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    coalesce(new.raw_user_meta_data->>'role', 'viewer'),
    coalesce((new.raw_user_meta_data->>'must_change_password')::boolean, true)
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Helper function to check if current user is admin
create or replace function is_admin()
returns boolean as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  );
$$ language sql security definer stable;

-- ============================================
-- RLS on profiles
-- ============================================
alter table profiles enable row level security;

create policy "Users can read own profile"
  on profiles for select
  using (id = auth.uid() or is_admin());

create policy "Admins can insert profiles"
  on profiles for insert
  with check (is_admin());

create policy "Admins can update profiles"
  on profiles for update
  using (is_admin());

create policy "Admins can delete profiles"
  on profiles for delete
  using (is_admin());

-- ============================================
-- RLS on collections
-- ============================================
alter table collections enable row level security;

create policy "Authenticated users can read collections"
  on collections for select
  using (auth.uid() is not null);

create policy "Admins can insert collections"
  on collections for insert
  with check (is_admin());

create policy "Admins can update collections"
  on collections for update
  using (is_admin());

create policy "Admins can delete collections"
  on collections for delete
  using (is_admin());

-- ============================================
-- RLS on items
-- ============================================
alter table items enable row level security;

create policy "Authenticated users can read items"
  on items for select
  using (auth.uid() is not null);

create policy "Admins can insert items"
  on items for insert
  with check (is_admin());

create policy "Admins can update items"
  on items for update
  using (is_admin());

create policy "Admins can delete items"
  on items for delete
  using (is_admin());

-- ============================================
-- RLS on photos
-- ============================================
alter table photos enable row level security;

create policy "Authenticated users can read photos"
  on photos for select
  using (auth.uid() is not null);

create policy "Admins can insert photos"
  on photos for insert
  with check (is_admin());

create policy "Admins can update photos"
  on photos for update
  using (is_admin());

create policy "Admins can delete photos"
  on photos for delete
  using (is_admin());

-- ============================================
-- RLS on tags
-- ============================================
alter table tags enable row level security;

create policy "Authenticated users can read tags"
  on tags for select
  using (auth.uid() is not null);

create policy "Admins can insert tags"
  on tags for insert
  with check (is_admin());

create policy "Admins can update tags"
  on tags for update
  using (is_admin());

create policy "Admins can delete tags"
  on tags for delete
  using (is_admin());

-- ============================================
-- RLS on item_tags
-- ============================================
alter table item_tags enable row level security;

create policy "Authenticated users can read item_tags"
  on item_tags for select
  using (auth.uid() is not null);

create policy "Admins can insert item_tags"
  on item_tags for insert
  with check (is_admin());

create policy "Admins can delete item_tags"
  on item_tags for delete
  using (is_admin());
