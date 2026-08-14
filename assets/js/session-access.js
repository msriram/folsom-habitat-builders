const sessionConfig=window.FIREFLIES_PORTAL_CONFIG||{};
const sessionNotesStyle=document.createElement('style');sessionNotesStyle.textContent='.session-notes textarea{display:block;width:100%;min-height:18rem;box-sizing:border-box;resize:vertical;line-height:1.55;padding:1rem;border:1px solid var(--line,#d8dfd8);border-radius:.65rem;background:var(--surface,#fff);color:inherit}';document.head.append(sessionNotesStyle);
const sessionKey=document.body.dataset.session;
if(!sessionConfig.forceDemo&&sessionConfig.supabaseUrl&&sessionConfig.supabaseAnonKey){
  const {createClient}=await import('https://esm.sh/@supabase/supabase-js@2');
  const sessionDb=createClient(sessionConfig.supabaseUrl,sessionConfig.supabaseAnonKey);
  const {data:{session:userSession}}=await sessionDb.auth.getSession();
  const {data:viewer}=userSession?await sessionDb.from('profiles').select('role,approval_status').eq('id',userSession.user.id).maybeSingle():{data:null};
  const approved=viewer?.approval_status==='approved';
  const isCoach=approved&&['coach','student_coach'].includes(viewer.role);
  const {data:sessionRows,error}=approved?await sessionDb.from('schedule_sessions').select('session_key,session_date,coach_notes,published,published_at').order('session_date'): {data:[],error:null};
  const sessions=sessionRows||[];
  const current=sessions.find(item=>item.session_key===sessionKey);
  const isThisWeek=item=>{if(!item?.session_date)return false;const [year,month,day]=item.session_date.split('-').map(Number),meetingDate=new Date(year,month-1,day),today=new Date();const sunday=new Date(today.getFullYear(),today.getMonth(),today.getDate()-today.getDay());const nextSunday=new Date(sunday);nextSunday.setDate(sunday.getDate()+7);return meetingDate>=sunday&&meetingDate<nextSunday;};
  const visibleToTeam=item=>Boolean(item?.published||isThisWeek(item));
  const notice=message=>{document.querySelector('main').innerHTML=`<section class="section compact tint"><div class="container"><div class="plain-panel"><span class="eyebrow">Schedule</span><h1>Session plan not available yet</h1><p>${message}</p><a class="button secondary" href="season.html">Back to Schedule</a></div></div></section>`};
  if(sessionKey&&(!userSession||!approved)){notice('Sign in with an approved team account to view session plans.');}
  else if(sessionKey&&error){notice('Session access is temporarily unavailable. Please try again shortly.');}
  else if(sessionKey&&!isCoach&&!visibleToTeam(current)){notice('This session is still being prepared by the coaches. Published session plans will appear here after the meeting is complete.');}
  else if(sessionKey&&current){
    const layout=document.querySelector('.meeting-layout');
    const notes=document.createElement('section');notes.className='section compact session-notes';
    if(isCoach){notes.innerHTML=`<div class="container"><div class="plain-panel"><div class="section-title"><div><span class="eyebrow">Coach workspace</span><h2>Session notes</h2></div><span class="status-chip" data-session-status>${current.published?'Published to team':'Coach only'}</span></div><textarea rows="8" maxlength="6000" data-session-notes placeholder="Record decisions, evidence, follow-ups, and what should be shared with the team.">${escapeSession(current.coach_notes)}</textarea><div class="hero-actions"><button class="button secondary" type="button" data-save-session-notes>Save notes</button><button class="button primary" type="button" data-toggle-session>${current.published?'Unpublish session':'Publish completed session'}</button><span class="form-message" data-session-message aria-live="polite"></span></div></div></div>`;
      document.querySelector('main').append(notes);
      notes.querySelector('[data-save-session-notes]').onclick=async()=>{const message=notes.querySelector('[data-session-message]');const {error:saveError}=await sessionDb.from('schedule_sessions').update({coach_notes:notes.querySelector('[data-session-notes]').value}).eq('session_key',sessionKey);message.textContent=saveError?'Could not save notes.':'Notes saved.';};
      notes.querySelector('[data-toggle-session]').onclick=async()=>{const next=!current.published;const message=notes.querySelector('[data-session-message]');const {error:publishError}=await sessionDb.from('schedule_sessions').update({published:next,published_by:next?userSession.user.id:null,published_at:next?new Date().toISOString():null}).eq('session_key',sessionKey);if(publishError){message.textContent='Could not update publication status.';return}current.published=next;notes.querySelector('[data-session-status]').textContent=next?'Published to team':'Coach only';notes.querySelector('[data-toggle-session]').textContent=next?'Unpublish session':'Publish completed session';message.textContent=next?'Session published for approved students and parents.':'Session returned to coach-only view.';};
    }else if(current.coach_notes?.trim()){notes.innerHTML=`<div class="container"><article class="plain-panel"><span class="eyebrow">Coach recap</span><h2>Session notes</h2><div class="session-note-copy">${escapeSession(current.coach_notes).replace(/\n/g,'<br>')}</div></article></div>`;document.querySelector('main').append(notes);}
  }
  if(!sessionKey){
    const links=[...document.querySelectorAll('a[href^="meeting-"]')];
    if(!isCoach){links.forEach(link=>{const key=link.getAttribute('href').split('.')[0];if(!visibleToTeam(sessions.find(item=>item.session_key===key)))link.remove();});}
    else links.forEach(link=>{const key=link.getAttribute('href').split('.')[0],item=sessions.find(row=>row.session_key===key);if(item&&!item.published&&!isThisWeek(item)){const label=link.lastElementChild;if(label)label.textContent='Coach only →';}});
  }
}
function escapeSession(value){return String(value||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
