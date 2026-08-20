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
  section.innerHTML='<div class="container"><div class="section-title"><div><span class="eyebrow">Coach session review</span><h2>Student attendance and notes</h2><p class="muted">Record what each student worked on, what went well, and a helpful next improvement. These notes are visible only to coaches.</p></div></div><p class="form-message" data-session-review-state>Loading student records…</p><div class="session-student-review-list" data-session-student-review-list></div></div>';
  main.append(section);
  const state=section.querySelector('[data-session-review-state]'),host=section.querySelector('[data-session-student-review-list]');
  const [{data:users,error:usersError},{data:reviews,error:reviewsError}]=await Promise.all([
    db.rpc('admin_users'),db.from('session_student_reviews').select('student_id,attendance,work_completed,went_well,next_improvement,updated_at').eq('session_key',sessionKey)
  ]);
  if(usersError||reviewsError){state.textContent='Student session reviews are unavailable right now.';return;}
  const reviewByStudent=new Map((reviews||[]).map(review=>[review.student_id,review]));
  const students=(users||[]).filter(user=>user.role==='student');state.hidden=true;
  host.innerHTML=students.map(student=>reviewCard(student,reviewByStudent.get(student.id))).join('')||'<p class="muted">No approved students are available yet.</p>';
  host.addEventListener('click',async event=>{
    const form=event.target.closest('[data-session-review]');if(!form)return;
    const attendance=event.target.closest('[data-attendance]');
    if(attendance){form.dataset.attendance=attendance.dataset.attendance;syncAttendance(form);await saveStudentReview(db,userId,form,'Attendance saved.');return;}
    if(event.target.closest('[data-save-session-review]'))await saveStudentReview(db,userId,form,'Session review saved.');
  });
}

function reviewCard(student,review={}){
  const attendance=review.attendance||'present';const status=review.updated_at?(attendance==='absent'?'Absent · saved':'Present · saved'):'Not recorded';
  return `<form class="plain-panel student-session-review" data-session-review data-student-id="${student.id}" data-attendance="${attendance}"><header><h3>${escapeHtml(student.display_name)}</h3><span class="status-chip" data-attendance-status>${status}</span></header><div class="session-attendance"><button class="button secondary ${attendance==='present'?'is-selected':''}" type="button" data-attendance="present">Present</button><button class="button secondary ${attendance==='absent'?'is-selected':''}" type="button" data-attendance="absent">Mark absent</button></div><label>What did this student work on?<textarea data-work-completed maxlength="4000" placeholder="Build, measurement, robot test, research, team role…">${escapeHtml(review.work_completed)}</textarea></label><label>What went well?<textarea data-went-well maxlength="4000" placeholder="A specific strength, contribution, or helpful habit…">${escapeHtml(review.went_well)}</textarea></label><label>What can improve next time?<textarea data-next-improvement maxlength="4000" placeholder="One kind, concrete next step…">${escapeHtml(review.next_improvement)}</textarea></label><div class="session-review-save"><button class="button primary" type="button" data-save-session-review>Save review</button><span class="form-message" data-review-message></span></div></form>`;
}

function syncAttendance(form){const attendance=form.dataset.attendance||'present';form.querySelectorAll('[data-attendance]').forEach(button=>button.classList.toggle('is-selected',button.dataset.attendance===attendance));const status=form.querySelector('[data-attendance-status]');if(status)status.textContent=attendance==='absent'?'Absent':'Present';}

async function saveStudentReview(db,userId,form,successMessage){
  const button=form.querySelector('[data-save-session-review]'),message=form.querySelector('[data-review-message]');if(button)button.disabled=true;message.textContent='Saving…';
  const {data:profile}=await db.from('profiles').select('team_id').eq('id',userId).maybeSingle();
  if(!profile?.team_id){if(button)button.disabled=false;message.textContent='Could not find the team for this review.';return;}
  const payload={team_id:profile.team_id,session_key:sessionKey,student_id:form.dataset.studentId,attendance:form.dataset.attendance||'present',work_completed:form.querySelector('[data-work-completed]').value.trim(),went_well:form.querySelector('[data-went-well]').value.trim(),next_improvement:form.querySelector('[data-next-improvement]').value.trim(),reviewed_by:userId,updated_at:new Date().toISOString()};
  const {error}=await db.from('session_student_reviews').upsert(payload,{onConflict:'team_id,session_key,student_id'});if(button)button.disabled=false;
  if(error){message.textContent=error.message||'Could not save this review.';return;}syncAttendance(form);message.textContent=successMessage;
}
