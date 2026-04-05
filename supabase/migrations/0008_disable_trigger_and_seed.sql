-- Temporarily disable the trigger to create first admin
drop trigger if exists on_auth_user_created on auth.users;
