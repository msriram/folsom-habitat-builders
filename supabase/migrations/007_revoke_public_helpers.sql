-- PostgreSQL grants EXECUTE on new functions to PUBLIC by default. Removing the
-- role-specific anon grant is not enough while that inherited grant remains.
revoke execute on function public.can_manage_student(uuid) from public;
revoke execute on function public.current_profile_role() from public;
revoke execute on function public.current_team_id() from public;
revoke execute on function public.handle_new_user() from public;

do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    execute 'revoke execute on function public.rls_auto_enable() from public';
  end if;
end $$;
