const config = window.FIREFLIES_PORTAL_CONFIG || {};
const body = document.body;

function destination() {
  return `${location.pathname.split('/').pop() || 'portal.html'}${location.search}${location.hash}`;
}

function goToSignIn(reason = '') {
  const query = new URLSearchParams({ returnTo: destination() });
  if (reason) query.set('reason', reason);
  location.replace(`login.html?${query.toString()}`);
}

if (config.forceDemo || !config.supabaseUrl || !config.supabaseAnonKey) {
  goToSignIn('unavailable');
} else {
  const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
  const db = createClient(config.supabaseUrl, config.supabaseAnonKey);
  const { data: { session } } = await db.auth.getSession();

  if (!session) {
    goToSignIn();
  } else {
    const { data: profile, error } = await db
      .from('profiles')
      .select('approval_status,is_active')
      .eq('id', session.user.id)
      .maybeSingle();

    if (error || !profile || profile.approval_status !== 'approved' || !profile.is_active) {
      goToSignIn('approval');
    } else {
      body.removeAttribute('data-team-room-auth-loading');
      document.dispatchEvent(new CustomEvent('fireflies:team-room-access-granted'));
    }
  }
}
