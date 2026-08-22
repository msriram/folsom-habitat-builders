const digestConfig = window.FIREFLIES_PORTAL_CONFIG || {};
const digestCard = document.querySelector('[data-team-digest]');
const digestButton = document.querySelector('[data-send-team-digest]');
const digestMessage = document.querySelector('[data-team-digest-message]');

if (digestCard && digestButton && digestMessage && !digestConfig.forceDemo && digestConfig.supabaseUrl && digestConfig.supabaseAnonKey) {
  const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
  const db = createClient(digestConfig.supabaseUrl, digestConfig.supabaseAnonKey);
  const { data: { session } } = await db.auth.getSession();
  const { data: profile } = session
    ? await db.from('profiles').select('role,approval_status,is_active').eq('id', session.user.id).maybeSingle()
    : { data: null };
  if (profile?.approval_status === 'approved' && profile.is_active && profile.role === 'coach') {
    digestCard.hidden = false;
    digestButton.addEventListener('click', async () => {
      if (!window.confirm('Send the family digest now to all approved students and parents?')) return;
      digestButton.disabled = true;
      digestButton.textContent = 'Preparing digest…';
      digestMessage.textContent = '';
      const { data, error } = await db.functions.invoke('team-digest');
      if (error || data?.error) {
        window.FIREFLIES_DIAGNOSTICS?.report('Team digest', error || data);
        digestMessage.textContent = data?.error || error?.message || 'The email digest could not be sent right now.';
        digestButton.disabled = false;
        digestButton.textContent = 'Send email digest';
        return;
      }
      digestMessage.textContent = `Digest sent to ${data.sent} of ${data.recipients} students and parents.${data.failed ? ` ${data.failed} could not be delivered.` : ''}`;
      digestButton.textContent = 'Digest sent';
    });
  }
}
