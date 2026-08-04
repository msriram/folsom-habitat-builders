const cfg=window.FIREFLIES_PORTAL_CONFIG||{},status=document.querySelector('[data-roster-state]');
if(cfg.forceDemo||!cfg.supabaseUrl||!cfg.supabaseAnonKey) status.textContent='Private roster is unavailable until the team database is connected.';
else{
  const {createClient}=await import('https://esm.sh/@supabase/supabase-js@2'),db=createClient(cfg.supabaseUrl,cfg.supabaseAnonKey);
  const {data:{session}}=await db.auth.getSession();
  if(!session) status.innerHTML='Not signed in. <a href="login.html">Sign in</a>';
  else{
    const {data,error}=await db.rpc('team_roster');
    if(error)status.textContent=error.message;
    else{
      document.querySelector('[data-roster-locked]').hidden=true;
      document.querySelector('[data-roster-view]').hidden=false;
      status.textContent='Private roster loaded.';
      const people=data||[];
      document.querySelector('[data-coaches]').innerHTML=people.filter(p=>p.role==='coach').map(coachCard).join('');
      document.querySelector('[data-students]').innerHTML=people.filter(p=>p.role==='student').map(studentCard).join('');
    }
  }
}
function coachCard(p){return `<article class="roster-card"><span>Coach</span><h3>${escapeHtml(p.display_name)}</h3>${p.team_title?`<p>${escapeHtml(p.team_title)}</p>`:''}</article>`}
function studentCard(p){return `<a class="roster-card roster-link" href="student.html?id=${encodeURIComponent(p.id)}"><span>Student profile</span><h3>${escapeHtml(p.display_name)}</h3><p>View team profile →</p></a>`}
function escapeHtml(v){return String(v||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
