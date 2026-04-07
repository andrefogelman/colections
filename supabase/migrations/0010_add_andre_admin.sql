-- Temporarily drop trigger to allow user creation
drop trigger if exists on_auth_user_created on auth.users;
