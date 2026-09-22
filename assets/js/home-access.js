// The public home page contains only team-purpose information. Member session
// cards and internal links are revealed after an approved account is present.
const memberSections = [...document.querySelectorAll('[data-home-member]')];
const accessMessage = document.querySelector('[data-home-access-message]');

function showMemberHome() {
  memberSections.forEach(section => { section.hidden = false; });
  if (accessMessage) accessMessage.hidden = true;
}

function showPendingHome() {
  if (accessMessage) accessMessage.textContent = 'Your account is waiting for coach approval. Team schedules and member resources will appear here once it is approved.';
}

function loadConfig() {
  if (window.FIREFLIES_PORTAL_CONFIG) return Promise.resolve(window.FIREFLIES_PORTAL_CONFIG);
  return new Promise(resolve => {
    const script = document.createElement('script');
    script.src = 'assets/js/portal-config.js?v=home-access1';
    script.onload = () => resolve(window.FIREFLIES_PORTAL_CONFIG || null);
    script.onerror = () => resolve(null);
    document.head.append(script);
  });
}

const config = await loadConfig();
if (!config?.forceDemo && config?.supabaseUrl && config?.supabaseAnonKey) {
  const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
  const db = createClient(config.supabaseUrl, config.supabaseAnonKey);

  async function updateHome(userSession) {
    if (!userSession) return;
    const { data: profile } = await db.from('profiles').select('approval_status').eq('id', userSession.user.id).maybeSingle();
    if (profile?.approval_status === 'approved') showMemberHome();
    else showPendingHome();
  }

  const { data: { session } } = await db.auth.getSession();
  await updateHome(session);
  db.auth.onAuthStateChange((_event, nextSession) => { updateHome(nextSession); });
}
