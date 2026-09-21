-- Migration: Automatic tenant row creation on merchant sign-up
-- Creates a tenant row automatically when a merchant signs up.
-- Runs as security definer, so it works even before the user has a session
-- (e.g. while email confirmation is pending) and bypasses RLS safely.

-- Optional: enforce valid industry values at the database level.
alter table public.tenants
  drop constraint if exists tenants_industry_type_check;

alter table public.tenants
  add constraint tenants_industry_type_check
  check (industry_type in ('boutique', 'electrical_solar', 'retail', 'services'));

create or replace function public.handle_new_merchant()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.tenants (owner_id, business_name, industry_type)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'business_name', ''),
    coalesce(new.raw_user_meta_data->>'industry_type', 'retail')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_merchant();

-- RLS policy so merchants can read their own tenant:
alter table public.tenants enable row level security;

drop policy if exists "Owners can read own tenant" on public.tenants;

create policy "Owners can read own tenant"
  on public.tenants for select
  using (owner_id = auth.uid());
