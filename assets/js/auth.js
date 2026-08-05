const config = window.FIREFLIES_PORTAL_CONFIG || {};
const states = document.querySelectorAll('[data-auth-state]');
const setState = text => states.forEach(el => el.textContent = text);
if (config.forceDemo || !config.supabaseUrl || !config.supabaseAnonKey) {
  setState('Sign-in is unavailable right now.');
  document.querySelector('[data-google-login]')?.addEventListener('click', () => setState('Sign-in is unavailable right now.'));
} else {
  const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
  const supabase = createClient(config.supabaseUrl, config.supabaseAnonKey);
  document.querySelector('[data-google-login]')?.addEventListener('click', async () => {
    setState('Opening Google sign-in…');
    // Supabase returns OAuth credentials in the URL fragment. Keep the desired
    // Team Room tab in the query string so it cannot collide with that fragment.
    const redirectTo = new URL('portal.html?tab=homework', location.href).href;
    const { error } = await supabase.auth.signInWithOAuth({provider:'google',options:{redirectTo}});
    if (error){window.FIREFLIES_DIAGNOSTICS?.report('Google sign-in',error);setState('Sign-in is unavailable right now.');}
  });
  const { data:{session} } = await supabase.auth.getSession();
  if (!session) setState('Continue with Google to open the team workspace.');
  else {
    document.querySelector('[data-google-login]')?.setAttribute('hidden','');
    const { data:profile } = await supabase.from('profiles').select('display_name,role,approval_status,team_id').eq('id',session.user.id).maybeSingle();
    if (!profile) setState('Waiting for coach approval.');
    else if (profile.approval_status !== 'approved') setState('Waiting for coach approval.');
    else {
      setState(`${profile.display_name} · ${profile.role}`);
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
          if(pendingError){window.FIREFLIES_DIAGNOSTICS?.report('Pending accounts',pendingError);pendingRoot.innerHTML='<tr><td colspan="4">Accounts are unavailable right now.</td></tr>';}
          else pendingRoot.innerHTML=(pending||[]).map(user=>`<tr><td>${escapeHtml(user.email||'')}</td><td><select data-role="${user.id}"><option value="student">Student</option><option value="parent">Parent</option><option value="coach">Coach</option></select></td><td><select data-student="${user.id}" disabled>${studentOptions}</select></td><td><button type="button" data-approve="${user.id}">Approve</button></td></tr>`).join('')||'<tr><td colspan="4">No pending users.</td></tr>';
          if(approvedError){window.FIREFLIES_DIAGNOSTICS?.report('Approved accounts',approvedError);approvedRoot.innerHTML='<tr><td colspan="4">Accounts are unavailable right now.</td></tr>';}
          else approvedRoot.innerHTML=(approved||[]).map(user=>`<tr><td>${escapeHtml(user.display_name||'')}</td><td>${escapeHtml(user.email||'')}</td><td>${escapeHtml(user.role||'')}</td><td>${user.role==='parent'?`<div class="linked-child-editor"><select data-approved-student="${user.id}">${studentOptions.replace(`value="${user.linked_student_id||''}"`,`value="${user.linked_student_id||''}" selected`)}</select><button type="button" data-save-parent-link="${user.id}">Save</button></div>`:'—'}</td></tr>`).join('')||'<tr><td colspan="4">No approved users.</td></tr>';
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
            if(approveError){window.FIREFLIES_DIAGNOSTICS?.report('Account approval',approveError);setState('This account could not be approved right now.');button.disabled=false;button.textContent='Approve';}
            else location.reload();
          });
          approvedRoot.addEventListener('click',async event=>{
            const button=event.target.closest('[data-save-parent-link]');
            if(!button)return;
            const id=button.dataset.saveParentLink;
            const student=approvedRoot.querySelector(`[data-approved-student="${id}"]`).value||null;
            button.disabled=true;
            button.textContent='Saving…';
            const {error:linkError}=await supabase.rpc('set_parent_student',{target_parent:id,target_student:student});
            if(linkError){window.FIREFLIES_DIAGNOSTICS?.report('Parent child link',linkError);setState('The linked child could not be saved right now.');button.disabled=false;button.textContent='Save';}
            else{button.textContent='Saved';setState('Parent and child linked.');}
          });
        }
      }
    }
  }
}
function escapeHtml(value){return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
