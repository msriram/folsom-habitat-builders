const config = window.FIREFLIES_PORTAL_CONFIG || {};
const states = document.querySelectorAll('[data-auth-state]');
const setState = text => states.forEach(el => el.textContent = text);
if (config.forceDemo || !config.supabaseUrl || !config.supabaseAnonKey) {
  setState('Sign-in setup is not connected yet. Add the Supabase URL and publishable key to enable Google login.');
  document.querySelector('[data-google-login]')?.addEventListener('click', () => setState('Google login is disabled until Supabase is configured.'));
} else {
  const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
  const supabase = createClient(config.supabaseUrl, config.supabaseAnonKey);
  document.querySelector('[data-google-login]')?.addEventListener('click', async () => {
    const { error } = await supabase.auth.signInWithOAuth({provider:'google',options:{redirectTo:new URL('homework.html', location.href).href}});
    if (error) setState(error.message);
  });
  const { data:{session} } = await supabase.auth.getSession();
  if (!session) setState('Not signed in.');
  else {
    const { data:profile } = await supabase.from('profiles').select('display_name,role,approval_status').eq('id',session.user.id).maybeSingle();
    if (!profile) setState('Account received. Waiting for administrator approval.');
    else if (profile.approval_status !== 'approved') setState('Signed in. Waiting for administrator approval.');
    else {
      setState(`Signed in as ${profile.display_name} (${profile.role}).`);
      if (profile.role === 'coach') {
        document.querySelector('[data-admin-locked]')?.setAttribute('hidden','');
        document.querySelector('[data-admin-view]')?.removeAttribute('hidden');
        const pendingRoot=document.querySelector('[data-pending-users]');
        if(pendingRoot){
          const {data:pending,error}=await supabase.rpc('pending_users');
          if(error) pendingRoot.innerHTML=`<tr><td colspan="4">${escapeHtml(error.message)}</td></tr>`;
          else pendingRoot.innerHTML=(pending||[]).map(user=>`<tr><td>${escapeHtml(user.email||'')}</td><td><select data-role="${user.id}"><option value="student">Student</option><option value="parent">Parent</option><option value="coach">Coach</option></select></td><td><input data-student="${user.id}" placeholder="Student profile UUID (parent only)"></td><td><button type="button" data-approve="${user.id}">Approve</button></td></tr>`).join('')||'<tr><td colspan="4">No pending users.</td></tr>';
          pendingRoot.addEventListener('click',async event=>{const button=event.target.closest('[data-approve]');if(!button)return;const id=button.dataset.approve,role=pendingRoot.querySelector(`[data-role="${id}"]`).value,student=pendingRoot.querySelector(`[data-student="${id}"]`).value||null;const {error:approveError}=await supabase.rpc('approve_user',{target_id:id,target_role:role,target_team:profile.team_id,target_student:student});if(approveError)setState(approveError.message);else button.closest('tr').remove()});
        }
      }
    }
  }
}
function escapeHtml(value){return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
