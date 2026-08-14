alter table public.profiles
  add column if not exists color_theme text not null default 'forest';

alter table public.profiles
  drop constraint if exists profiles_color_theme_check;

alter table public.profiles
  add constraint profiles_color_theme_check
  check (color_theme in ('forest','ocean','violet','sunset','rose','cobalt','citrus','slate','berry','mint','lagoon','ember'));

create or replace function public.set_my_color_theme(new_theme text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if new_theme not in ('forest','ocean','violet','sunset','rose','cobalt','citrus','slate','berry','mint','lagoon','ember') then
    raise exception 'invalid color theme';
  end if;

  update public.profiles
  set color_theme = new_theme
  where id = auth.uid()
    and approval_status = 'approved'
    and is_active;

  if not found then
    raise exception 'approved active profile required';
  end if;
end;
$$;

revoke all on function public.set_my_color_theme(text) from public;
grant execute on function public.set_my_color_theme(text) to authenticated;
