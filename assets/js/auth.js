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
    setState('Opening Google sign-in…');
    const redirectTo = new URL('portal.html#homework', location.href).href;
    const { error } = await supabase.auth.signInWithOAuth({provider:'google',options:{redirectTo}});
    if (error) setState(error.message);
  });
  const { data:{session} } = await supabase.auth.getSession();
  if (!session) setState('Not signed in.');
  else {
    const { data:profile } = await supabase.from('profiles').select('display_name,role,approval_status,team_id').eq('id',session.user.id).maybeSingle();
    if (!profile) setState('Account received. Waiting for administrator approval.');
    else if (profile.approval_status !== 'approved') setState('Signed in. Waiting for administrator approval.');
    else {
      setState(`Signed in as ${profile.display_name} (${profile.role}).`);
      if (profile.role === 'coach') {
        document.querySelector('[data-admin-locked]')?.setAttribute('hidden','');
        document.querySelector('[data-admin-view]')?.removeAttribute('hidden');
        const pendingRoot=document.querySelector('[data-pending-users]');
        const approvedRoot=document.querySelector('[data-approved-users]');
        if(pendingRoot && approvedRoot){
          const [{data:pending,error:pendingError},{data:approved,error:approvedError}]=await Promise.all([
            supabase.rpc('pending_users'),
            supabase.rpc('admin_users')
          ]);
          const students=(approved||[]).filter(user=>user.role==='student');
          const studentOptions=`<option value="">Select child (parents only)</option>`+students.map(student=>`<option value="${student.id}">${escapeHtml(student.display_name)}</option>`).join('');
          if(pendingError) pendingRoot.innerHTML=`<tr><td colspan="4">${escapeHtml(pendingError.message)}</td></tr>`;
          else pendingRoot.innerHTML=(pending||[]).map(user=>`<tr><td>${escapeHtml(user.email||'')}</td><td><select data-role="${user.id}"><option value="student">Student</option><option value="parent">Parent</option><option value="coach">Coach</option></select></td><td><select data-student="${user.id}" disabled>${studentOptions}</select></td><td><button type="button" data-approve="${user.id}">Approve</button></td></tr>`).join('')||'<tr><td colspan="4">No pending users.</td></tr>';
          if(approvedError) approvedRoot.innerHTML=`<tr><td colspan="4">${escapeHtml(approvedError.message)}</td></tr>`;
          else approvedRoot.innerHTML=(approved||[]).map(user=>`<tr><td>${escapeHtml(user.display_name||'')}</td><td>${escapeHtml(user.email||'')}</td><td>${escapeHtml(user.role||'')}</td><td>${escapeHtml(user.linked_student_name||'—')}</td></tr>`).join('')||'<tr><td colspan="4">No approved users.</td></tr>';
          pendingRoot.addEventListener('change',event=>{
            const roleSelect=event.target.closest('[data-role]');
            if(!roleSelect)return;
            const studentSelect=pendingRoot.querySelector(`[data-student="${roleSelect.dataset.role}"]`);
            studentSelect.disabled=roleSelect.value!=='parent';
            if(studentSelect.disabled)studentSelect.value='';
          });
          pendingRoot.addEventListener('click',async event=>{
            const button=event.target.closest('[data-approve]');
            if(!button)return;
            const id=button.dataset.approve;
            const role=pendingRoot.querySelector(`[data-role="${id}"]`).value;
            const student=pendingRoot.querySelector(`[data-student="${id}"]`).value||null;
            if(role==='parent' && !student){setState('Select the parent’s child before approving.');return;}
            button.disabled=true;
            button.textContent='Approving…';
            const {error:approveError}=await supabase.rpc('approve_user',{target_id:id,target_role:role,target_team:profile.team_id,target_student:student});
            if(approveError){setState(approveError.message);button.disabled=false;button.textContent='Approve';}
            else location.reload();
          });
        }
      }
    }
  }
}
function escapeHtml(value){return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
