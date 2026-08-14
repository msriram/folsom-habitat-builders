const config=window.FIREFLIES_PORTAL_CONFIG||{};
const states=document.querySelectorAll('[data-auth-state]');
const setState=text=>states.forEach(element=>element.textContent=text);

if(config.forceDemo||!config.supabaseUrl||!config.supabaseAnonKey){
  setState('Sign-in is unavailable right now.');
  document.querySelector('[data-google-login]')?.addEventListener('click',()=>setState('Sign-in is unavailable right now.'));
}else{
  const {createClient}=await import('https://esm.sh/@supabase/supabase-js@2');
  const supabase=createClient(config.supabaseUrl,config.supabaseAnonKey);
  document.querySelector('[data-google-login]')?.addEventListener('click',async()=>{
    setState('Opening Google sign-in…');
    const redirectTo=new URL('portal.html?tab=homework',location.href).href;
    const {error}=await supabase.auth.signInWithOAuth({provider:'google',options:{redirectTo}});
    if(error){window.FIREFLIES_DIAGNOSTICS?.report('Google sign-in',error);setState('Sign-in is unavailable right now.');}
  });

  const {data:{session}}=await supabase.auth.getSession();
  if(!session)setState('Continue with Google to open the team workspace.');
  else{
    document.querySelector('[data-google-login]')?.setAttribute('hidden','');
    // Keep the login path compatible with projects that have not yet applied
    // the optional coach-admin migration. A missing is_admin column should
    // never turn an already-approved coach into a "waiting" user.
    const {data:profile,error:profileError}=await supabase.from('profiles').select('display_name,email,role,approval_status,team_id,is_admin').eq('id',session.user.id).maybeSingle();
    if(profile)profile.is_admin=profile.role==='coach'&&(profile.is_admin||profile.email?.toLowerCase()==='sriram87@gmail.com');
    if(profileError){window.FIREFLIES_DIAGNOSTICS?.report('Profile lookup',profileError);setState('Your account could not be loaded right now.');}
    else if(!profile||profile.approval_status!=='approved')setState('Waiting for coach approval.');
    else{
      setState(`${profile.display_name} · ${profile.role==='coach'?(profile.is_admin?'coach administrator':'assistant coach'):profile.role==='student_coach'?'student coach':profile.role}`);
      if(profile.is_admin)await setupAdmin(supabase,profile);
    }
  }
}

async function setupAdmin(supabase,profile){
  document.querySelector('[data-admin-locked]')?.setAttribute('hidden','');
  document.querySelector('[data-admin-view]')?.removeAttribute('hidden');
  const sendHomeworkButton=document.querySelector('[data-send-homework-now]');
  const sendHomeworkMessage=document.querySelector('[data-homework-send-message]');
  if(sendHomeworkButton)sendHomeworkButton.onclick=async()=>{
    if(!confirm('Send the current homework email now to all approved students, parents, and coaches?'))return;
    sendHomeworkButton.disabled=true;sendHomeworkButton.textContent='Sending…';sendHomeworkMessage.textContent='';
    const {data,error}=await supabase.functions.invoke('gmail-send-test',{body:{kind:'current',deliverToTeam:true}});
    sendHomeworkMessage.textContent=error?'The homework email could not be sent.':`Homework email sent to ${data?.sent||0} account(s)${data?.failed?`; ${data.failed} failed`:''}.`;
    sendHomeworkButton.disabled=false;sendHomeworkButton.textContent='Send homework now';
  };
  const pendingRoot=document.querySelector('[data-pending-users]');
  const approvedRoot=document.querySelector('[data-approved-users]');
  const approvedStudentsRoot=document.querySelector('[data-approved-students]');
  const approvedParentsRoot=document.querySelector('[data-approved-parents]');
  const approvedCoachesRoot=document.querySelector('[data-approved-coaches]');
  if(!pendingRoot||!approvedRoot||!approvedStudentsRoot||!approvedParentsRoot||!approvedCoachesRoot)return;

  const [{data:pending,error:pendingError},{data:approved,error:approvedError}]=await Promise.all([
    profile.is_admin?supabase.rpc('pending_users'):Promise.resolve({data:[],error:null}),
    supabase.rpc('admin_users')
  ]);
  if(!profile.is_admin){document.querySelector('[data-pending-section]')?.setAttribute('hidden','');pendingRoot.closest('.table-wrap')?.setAttribute('hidden','');}
  const users=approved||[];
  const students=users.filter(user=>user.role==='student');
  const parents=users.filter(user=>user.role==='parent'||user.role==='coach');

  if(pendingError){
    window.FIREFLIES_DIAGNOSTICS?.report('Pending accounts',pendingError);
    pendingRoot.innerHTML='<tr><td colspan="5">Accounts are unavailable right now.</td></tr>';
  }else{
    pendingRoot.innerHTML=(pending||[]).map(user=>`<tr><td>${escapeHtml(user.email||'')}</td><td><select data-role="${user.id}"><option value="student">Student</option><option value="parent">Parent</option><option value="coach">Coach administrator</option><option value="assistant_coach">Assistant coach</option><option value="student_coach">Student coach</option></select></td><td><select data-student="${user.id}" disabled>${personOptions(students,'Optional student')}</select></td><td><button type="button" data-approve="${user.id}">Approve</button></td><td><button type="button" class="button danger" data-remove-user="${user.id}">Remove</button></td></tr>`).join('')||'<tr><td colspan="5">No pending users.</td></tr>';
  }

  if(approvedError){
    window.FIREFLIES_DIAGNOSTICS?.report('Approved accounts',approvedError);
    [approvedStudentsRoot,approvedParentsRoot,approvedCoachesRoot].forEach(root=>root.innerHTML='<tr><td colspan="5">Accounts are unavailable right now.</td></tr>');
  }else{
    const access=user=>profile.is_admin?`<button type="button" class="button danger" data-remove-user="${user.id}" ${user.id===profile.id?'disabled title="You cannot remove your own coach account"':''}>Remove</button>`:'—';
    const people=users.filter(user=>user.role==='student');
    const parentAccounts=users.filter(user=>user.role==='parent');
    const coachAccounts=users.filter(user=>user.role==='coach'||user.role==='student_coach');
    approvedStudentsRoot.innerHTML=people.map(user=>`<tr><td>${escapeHtml(user.display_name||'')}</td><td>${escapeHtml(user.email||'')}</td><td>${relationshipEditor(user,students,parents)}</td><td>${access(user)}</td></tr>`).join('')||'<tr><td colspan="4">No approved students.</td></tr>';
    approvedParentsRoot.innerHTML=parentAccounts.map(user=>`<tr><td>${escapeHtml(user.display_name||'')}</td><td>${escapeHtml(user.email||'')}</td><td>${relationshipEditor(user,students,parents)}</td><td>${access(user)}</td></tr>`).join('')||'<tr><td colspan="4">No approved parents.</td></tr>';
    approvedCoachesRoot.innerHTML=coachAccounts.map(user=>{const primaryCoach=user.is_admin||user.email?.toLowerCase()==='sriram87@gmail.com';const title=user.role==='student_coach'?'Student coach':primaryCoach?'Coach administrator':'Assistant coach';return `<tr><td>${escapeHtml(user.display_name||'')}</td><td>${escapeHtml(user.email||'')}</td><td>${title}</td><td>${relationshipEditor(user,students,parents)}</td><td>${access(user)}</td></tr>`}).join('')||'<tr><td colspan="5">No approved coaches.</td></tr>';
  }

  pendingRoot.addEventListener('change',event=>{
    const roleSelect=event.target.closest('[data-role]');
    if(!roleSelect)return;
    const studentSelect=pendingRoot.querySelector(`[data-student="${roleSelect.dataset.role}"]`);
    studentSelect.disabled=!['parent','coach'].includes(roleSelect.value);
    if(studentSelect.disabled)studentSelect.value='';
  });

  pendingRoot.addEventListener('click',async event=>{
    const removeButton=event.target.closest('[data-remove-user]');
    if(removeButton){await removeUser(removeButton,supabase);return;}
    const button=event.target.closest('[data-approve]');
    if(!button)return;
    const id=button.dataset.approve;
    const selectedRole=pendingRoot.querySelector(`[data-role="${id}"]`).value;
    const role=selectedRole==='assistant_coach'?'coach':selectedRole;
    const student=['parent','assistant_coach','coach'].includes(selectedRole)?pendingRoot.querySelector(`[data-student="${id}"]`).value||null:null;
    button.disabled=true;
    button.textContent='Approving…';
    // Production may still expose the original four-argument RPC while the
    // newer admin migration adds target_admin. Retry with the compatible
    // signature so the on-page Approve action remains usable.
    let {error}=await supabase.rpc('approve_user',{target_id:id,target_role:role,target_team:profile.team_id,target_student:student,target_admin:selectedRole==='coach'});
    if(error&&/function .*approve_user|schema cache|does not exist/i.test(error.message||'')){
      ({error}=await supabase.rpc('approve_user',{target_id:id,target_role:role,target_team:profile.team_id,target_student:student}));
    }
    if(error){window.FIREFLIES_DIAGNOSTICS?.report('Account approval',error);setState('This account could not be approved right now.');button.disabled=false;button.textContent='Approve';}
    else location.reload();
  });

  approvedRoot.addEventListener('click',async event=>{
    const removeButton=event.target.closest('[data-remove-user]');
    if(removeButton){await removeUser(removeButton,supabase);return;}
    const parentButton=event.target.closest('[data-save-parent-link]');
    const studentButton=event.target.closest('[data-save-student-parents]');
    if(!parentButton&&!studentButton)return;
    const button=parentButton||studentButton;
    button.disabled=true;
    button.textContent='Saving…';
    let result;
    if(parentButton){
      const id=parentButton.dataset.saveParentLink;
      const student=approvedRoot.querySelector(`[data-approved-student="${id}"]`).value||null;
      result=await supabase.rpc('set_parent_student',{target_parent:id,target_student:student});
    }else{
      const id=studentButton.dataset.saveStudentParents;
      const parentIds=[...approvedRoot.querySelectorAll(`[data-student-parent="${id}"]`)].map(select=>select.value).filter(Boolean);
      if(new Set(parentIds).size!==parentIds.length){setState('Choose two different parents.');button.disabled=false;button.textContent='Save';return;}
      result=await supabase.rpc('set_student_parents',{target_student:id,target_parents:parentIds});
    }
    if(result.error){window.FIREFLIES_DIAGNOSTICS?.report('Family relationship',result.error);setState(`The relationship could not be saved: ${result.error.message||'please try again'}`);button.disabled=false;button.textContent='Save';}
    else location.reload();
  });
}

async function removeUser(button,supabase){
  const id=button.dataset.removeUser;
  const label=button.closest('tr')?.querySelector('td')?.textContent?.trim()||'this account';
  if(!window.confirm(`Remove access for ${label}? Their homework and records will be kept, but they will no longer be able to use the team workspace.`))return;
  button.disabled=true;
  button.textContent='Removing…';
  const {error}=await supabase.rpc('remove_user_access',{target_id:id});
  if(error){window.FIREFLIES_DIAGNOSTICS?.report('Remove user',error);setState('This account could not be removed right now.');button.disabled=false;button.textContent='Remove';return;}
  location.reload();
}

function relationshipEditor(user,students,parents){
  if(user.role==='parent'||user.role==='coach')return `<div class="linked-child-editor"><select data-approved-student="${user.id}">${personOptions(students,'Not linked',user.linked_student_id)}</select><button type="button" data-save-parent-link="${user.id}">Save</button></div>`;
  if(user.role==='student'){
    const linked=parents.filter(parent=>parent.linked_student_id===user.id);
    return `<div class="student-parent-editor"><select aria-label="First linked parent" data-student-parent="${user.id}">${personOptions(parents,'Parent 1',linked[0]?.id)}</select><select aria-label="Second linked parent" data-student-parent="${user.id}">${personOptions(parents,'Parent 2',linked[1]?.id)}</select><button type="button" data-save-student-parents="${user.id}">Save</button></div>`;
  }
  return '—';
}

function personOptions(people,emptyLabel,selected=''){
  return `<option value="">${escapeHtml(emptyLabel)}</option>${people.map(person=>`<option value="${person.id}" ${person.id===selected?'selected':''}>${escapeHtml(person.display_name)}</option>`).join('')}`;
}

function escapeHtml(value){return String(value||'').replace(/[&<>"']/g,character=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]))}
