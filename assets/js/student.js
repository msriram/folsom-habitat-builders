const cfg=window.FIREFLIES_PORTAL_CONFIG||{},state=document.querySelector('[data-student-state]'),root=document.querySelector('[data-student-profile]');
const avatarNames=['robotics-engineer','tech-hero','nature-guardian','space-explorer','inventor','firefly-mascot','red-panda-builder','owl-scientist','dragon-coder','ocean-explorer','jungle-adventurer','robot-companion'];
if(cfg.forceDemo||!cfg.supabaseUrl||!cfg.supabaseAnonKey)state.textContent='Team profiles are unavailable until the database is connected.';
else{
  const id=new URLSearchParams(location.search).get('id');
  const {createClient}=await import('https://esm.sh/@supabase/supabase-js@2'),db=createClient(cfg.supabaseUrl,cfg.supabaseAnonKey);
  const {data:{session}}=await db.auth.getSession();
  if(!session)state.innerHTML='Sign in with an approved team account. <a href="login.html">Sign in</a>';
  else if(!id)state.textContent='No student was selected.';
  else{
    const {data,error}=await db.rpc('team_student_profile',{target:id});
    const profile=data?.[0];
    if(error||!profile)state.textContent=error?.message||'Student profile not found.';
    else{
      state.textContent='Team-visible profile loaded.';
      root.hidden=false;
      const avatar=avatarNames.includes(profile.avatar_key)?profile.avatar_key:avatarNames[0];
      root.innerHTML=`<div class="student-profile-head"><img class="profile-avatar-large" src="assets/img/avatars/${avatar}.webp" alt=""><div><span class="eyebrow">Student</span><h2>${esc(profile.display_name)}${profile.tag_name?` <small>“${esc(profile.tag_name)}”</small>`:''}</h2><p><strong>Parents:</strong> ${esc(profile.parent_names||'Not listed')}</p></div></div><div class="grid three">${fact('Favorite character',profile.favorite_hero)}${fact('Favorite movie',profile.favorite_movie)}${fact('Favorite show',profile.favorite_show)}${fact('Favorite place',profile.favorite_place)}${fact('Favorite LEGO build',profile.favorite_lego)}${fact('Wants to learn',profile.learning_goal)}</div>`;
    }
  }
}
function fact(label,value){return value?`<article class="plain-panel"><span class="eyebrow">${esc(label)}</span><p>${esc(value)}</p></article>`:''}
function esc(v){return String(v||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
