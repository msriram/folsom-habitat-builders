const cfg=window.FIREFLIES_PORTAL_CONFIG||{};
const sessionKey=document.body.dataset.session;
const list=document.querySelector('.checklist');
const note=document.createElement('p');
note.className='muted schedule-save-note';

if(list&&sessionKey&&!cfg.forceDemo&&cfg.supabaseUrl&&cfg.supabaseAnonKey){
  const {createClient}=await import('https://esm.sh/@supabase/supabase-js@2');
  const db=createClient(cfg.supabaseUrl,cfg.supabaseAnonKey);
  const {data:{session}}=await db.auth.getSession();
  if(!session){
    note.innerHTML='Sign in to see the shared completion checklist.';
    list.after(note);
  }else{
    const [{data:profile},{data:items,error}]=await Promise.all([
      db.from('profiles').select('role,approval_status').eq('id',session.user.id).maybeSingle(),
      db.from('schedule_items').select('id,label,area,completed,sort_order').eq('session_key',sessionKey).order('sort_order')
    ]);
    const canEdit=profile?.approval_status==='approved'&&['coach','student_coach'].includes(profile.role);
    if(error){note.textContent='Shared checklist is temporarily unavailable.';list.after(note);}
    else if(items?.length){
      list.innerHTML=items.map(item=>`<li><label class="schedule-check"><input type="checkbox" data-schedule-item="${item.id}" ${item.completed?'checked':''} ${canEdit?'':'disabled'}><span>${escapeHtml(item.label)}</span><small>${escapeHtml(item.area)}</small></label></li>`).join('');
      note.textContent=canEdit?'Coach view: checking an item updates Team Room progress for everyone.':'Completion is updated by a coach.';
      list.after(note);
      if(canEdit)list.addEventListener('change',async event=>{
        const input=event.target.closest('[data-schedule-item]');if(!input)return;
        input.disabled=true;note.textContent='Saving…';
        const {error:updateError}=await db.from('schedule_items').update({completed:input.checked,completed_by:session.user.id,completed_at:input.checked?new Date().toISOString():null}).eq('id',input.dataset.scheduleItem);
        input.disabled=false;note.textContent=updateError?updateError.message:'Saved. Team Room progress is now updated.';
        if(updateError)input.checked=!input.checked;
      });
    }
    if(canEdit) await renderStudentSessionReviews(db,session.user.id);
  }
}
function escapeHtml(value){return String(value||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}

async function renderStudentSessionReviews(db,userId){
  const main=document.querySelector('main');if(!main)return;
  const section=document.createElement('section');section.className='section compact';section.dataset.sessionStudentReviews='';
  section.innerHTML='<div class="container"><div class="section-title"><div><span class="eyebrow">Coach session review</span><h2>Student attendance and notes</h2></div></div><p class="form-message" data-session-review-state>Loading student records…</p><div class="session-student-review-list" data-session-student-review-list></div><div class="session-review-save"><button class="button primary" type="button" data-save-session-reviews>Save session notes</button><span class="form-message" data-review-message></span></div></div>';
  main.append(section);
  const state=section.querySelector('[data-session-review-state]'),host=section.querySelector('[data-session-student-review-list]');
  const [{data:users,error:usersError},{data:reviews,error:reviewsError}]=await Promise.all([
    db.rpc('admin_users'),db.from('session_student_reviews').select('student_id,attendance,work_completed,went_well,next_improvement,updated_at').eq('session_key',sessionKey)
  ]);
  if(usersError||reviewsError){state.textContent='Student session reviews are unavailable right now.';return;}
  const reviewByStudent=new Map((reviews||[]).map(review=>[review.student_id,review]));
  const students=(users||[]).filter(user=>user.role==='student');state.hidden=true;
  host.innerHTML=students.length?`<table class="session-review-table"><thead><tr><th scope="col">Student name</th><th scope="col">Areas focused</th><th scope="col">Highlights</th><th scope="col">Improvements</th><th scope="col">Attendance</th></tr></thead><tbody>${students.map(student=>reviewRow(student,reviewByStudent.get(student.id))).join('')}</tbody></table>`:'<p class="muted">No approved students are available yet.</p>';
  const saveButton=section.querySelector('[data-save-session-reviews]'),message=section.querySelector('[data-review-message]');
  if(!students.length){saveButton.hidden=true;return;}
  saveButton.onclick=async()=>{
    saveButton.disabled=true;message.textContent='Saving…';
    const {data:profile}=await db.from('profiles').select('team_id').eq('id',userId).maybeSingle();
    if(!profile?.team_id){saveButton.disabled=false;message.textContent='Could not find the team for this review.';return;}
    const rows=[...host.querySelectorAll('[data-session-review]')];
    const results=await Promise.all(rows.map(row=>saveStudentReview(db,userId,profile.team_id,row)));
    saveButton.disabled=false;
    const failure=results.find(Boolean);message.textContent=failure?(failure.message||'Some notes could not be saved.'):'Session notes saved.';
  };
}

function reviewRow(student,review={}){
  const present=(review.attendance||'present')==='present';
  return `<tr data-session-review data-student-id="${student.id}"><th scope="row">${escapeHtml(student.display_name)}</th><td><textarea data-work-completed maxlength="4000" aria-label="Areas focused for ${escapeHtml(student.display_name)}" placeholder="Build, research, robot test…">${escapeHtml(review.work_completed)}</textarea></td><td><textarea data-went-well maxlength="4000" aria-label="Highlights for ${escapeHtml(student.display_name)}" placeholder="Strengths or contributions…">${escapeHtml(review.went_well)}</textarea></td><td><textarea data-next-improvement maxlength="4000" aria-label="Improvements for ${escapeHtml(student.display_name)}" placeholder="Helpful next step…">${escapeHtml(review.next_improvement)}</textarea></td><td class="session-attendance-cell"><input type="checkbox" data-attendance aria-label="${escapeHtml(student.display_name)} attended" ${present?'checked':''}><span>Present</span></td></tr>`;
}

async function saveStudentReview(db,userId,teamId,row){
  const payload={team_id:teamId,session_key:sessionKey,student_id:row.dataset.studentId,attendance:row.querySelector('[data-attendance]').checked?'present':'absent',work_completed:row.querySelector('[data-work-completed]').value.trim(),went_well:row.querySelector('[data-went-well]').value.trim(),next_improvement:row.querySelector('[data-next-improvement]').value.trim(),reviewed_by:userId,updated_at:new Date().toISOString()};
  const {error}=await db.from('session_student_reviews').upsert(payload,{onConflict:'team_id,session_key,student_id'});
  return error;
}
