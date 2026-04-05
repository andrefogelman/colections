-- Insert admin profile manually
insert into profiles (id, name, email, role, must_change_password)
values (
  '37df24ad-3519-44e0-8727-900d0a39d4f3',
  'Raphael Bigio',
  'rapahel@dryko.com.br',
  'admin',
  true
) on conflict (id) do nothing;

-- Re-enable the trigger for future user creation
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Re-enable RLS on profiles
alter table profiles enable row level security;
