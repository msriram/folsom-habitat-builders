const cfg=window.FIREFLIES_PORTAL_CONFIG||{};
const status=document.querySelector('[data-roster-state]');
const avatarNames=['robotics-engineer','tech-hero','nature-guardian','space-explorer','inventor','firefly-mascot','red-panda-builder','owl-scientist','dragon-coder','ocean-explorer','jungle-adventurer','robot-companion'];

if(cfg.forceDemo||!cfg.supabaseUrl||!cfg.supabaseAnonKey)status.textContent='The private team page is unavailable right now.';
else{
  const {createClient}=await import('https://esm.sh/@supabase/supabase-js@2');
  const db=createClient(cfg.supabaseUrl,cfg.supabaseAnonKey);
  const {data:{session}}=await db.auth.getSession();
  if(!session)status.innerHTML='Not signed in. <a href="login.html">Sign in</a>';
  else{
    const privacyNote=document.querySelector('.privacy-note');
    privacyNote?.setAttribute('hidden','');
    const {data:me}=await db.from('profiles').select('email,role,is_admin').eq('id',session.user.id).maybeSingle();
    if(me?.role==='coach'&&(me.is_admin||me.email?.toLowerCase()==='sriram87@gmail.com'))privacyNote?.removeAttribute('hidden');
    const {data,error}=await db.rpc('team_roster');
    if(error){
      window.FIREFLIES_DIAGNOSTICS?.report('Team roster',error);
      status.textContent='Account approval is required to view the private team page.';
      document.querySelector('[data-roster-locked]').innerHTML='<h2>Account approval required</h2><p>A coach must approve this account before the team page is available.</p>';
    }else{
      document.querySelector('[data-roster-locked]').hidden=true;
      document.querySelector('[data-roster-view]').hidden=false;
      status.hidden=true;
      const people=data||[];
      document.querySelector('[data-coaches]').innerHTML=people.filter(person=>person.role==='coach').map(coachCard).join('');
      const studentCards=await Promise.all(people.filter(person=>person.role==='student').map(person=>studentCard(db,person)));
      document.querySelector('[data-students]').innerHTML=studentCards.join('');
    }
  }
}

function coachCard(person){
  const title=person.team_title||"Assistant coach";
  return `<article class="roster-card"><span>Coach</span><h3>${escapeHtml(person.display_name)}</h3><p>${escapeHtml(title)}</p></article>`;
}

async function studentCard(db,person){
  let imageUrl=avatarUrl(person.avatar_key);
  if(person.photo_path){
    const {data:signed,error}=await db.storage.from('profile-photos').createSignedUrl(person.photo_path,900);
    if(!error&&signed?.signedUrl)imageUrl=signed.signedUrl;
  }
  return `<a class="student-roster-card" href="student.html?id=${encodeURIComponent(person.id)}" aria-label="View ${escapeHtml(person.display_name)}"><img src="${escapeHtml(imageUrl)}" alt=""><strong>${escapeHtml(person.display_name)}</strong></a>`;
}

function avatarUrl(value){return `assets/img/avatars/${avatarNames.includes(value)?value:avatarNames[0]}.webp`}
function escapeHtml(value){return String(value||'').replace(/[&<>"']/g,character=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]))}
