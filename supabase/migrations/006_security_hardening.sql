-- Remove anonymous access to every SECURITY DEFINER helper. Public portal users
-- must authenticate before invoking any team RPC or triggering policy helpers.
revoke execute on function public.approve_user(uuid,text,uuid,uuid) from anon;
revoke execute on function public.can_manage_student(uuid) from anon;
revoke execute on function public.current_linked_student_id() from anon;
revoke execute on function public.current_profile_role() from anon;
revoke execute on function public.current_team_id() from anon;
revoke execute on function public.handle_new_user() from anon, authenticated;
revoke execute on function public.pending_users() from anon;
revoke execute on function public.team_roster() from anon;
revoke execute on function public.tshirt_order() from anon;
revoke execute on function public.update_student_display_name(uuid,text) from anon;

-- Supabase may create this event-trigger helper in the public schema. It is not
-- an application RPC and should not be exposed through the REST API.
do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    execute 'revoke execute on function public.rls_auto_enable() from anon, authenticated';
  end if;
end $$;
