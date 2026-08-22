const cfg=window.FIREFLIES_PORTAL_CONFIG||{};
const state=document.querySelector('[data-student-state]');
const root=document.querySelector('[data-student-profile]');
const avatarNames=['robotics-engineer','tech-hero','nature-guardian','space-explorer','inventor','firefly-mascot','red-panda-builder','owl-scientist','dragon-coder','ocean-explorer','jungle-adventurer','robot-companion'];

if(cfg.forceDemo||!cfg.supabaseUrl||!cfg.supabaseAnonKey)state.textContent='Team profiles are unavailable right now.';
else{
  const id=new URLSearchParams(location.search).get('id');
  const {createClient}=await import('https://esm.sh/@supabase/supabase-js@2');
  const db=createClient(cfg.supabaseUrl,cfg.supabaseAnonKey);
  const {data:{session}}=await db.auth.getSession();
  if(!session)state.innerHTML='Sign in with an approved team account. <a href="login.html">Sign in</a>';
  else if(!id)state.textContent='No student was selected.';
  else{
    const {data,error}=await db.rpc('team_student_profile',{target:id});
    const profile=data?.[0];
    if(error||!profile){
      if(error)window.FIREFLIES_DIAGNOSTICS?.report('Student page',error);
      state.textContent='Team member not found.';
    }else{
      let imageUrl=avatarUrl(profile.avatar_key);
      if(profile.photo_path){
        const {data:signed}=await db.storage.from('profile-photos').createSignedUrl(profile.photo_path,900);
        if(signed?.signedUrl)imageUrl=signed.signedUrl;
      }
      document.title=`${profile.display_name} | Habitat Builders`;
      state.hidden=true;
      root.hidden=false;
      root.innerHTML=`<div class="student-profile-head"><img class="profile-avatar-large" src="${esc(imageUrl)}" alt=""><div><h1>${esc(profile.display_name)}${profile.tag_name?` <small>“${esc(profile.tag_name)}”</small>`:''}</h1><p><strong>Parents:</strong> ${esc(profile.parent_names||'Not listed')}</p></div></div><div class="grid three">${fact('Favorite character',profile.favorite_hero)}${fact('Favorite movie',profile.favorite_movie)}${fact('Favorite show',profile.favorite_show)}${fact('Favorite place',profile.favorite_place)}${fact('Favorite LEGO build',profile.favorite_lego)}${fact('Wants to learn',profile.learning_goal)}</div>`;
    }
  }
}

function avatarUrl(value){return `assets/img/avatars/${avatarNames.includes(value)?value:avatarNames[0]}.webp`}
function fact(label,value){return value?`<article class="plain-panel"><span class="eyebrow">${esc(label)}</span><p>${esc(value)}</p></article>`:''}
function esc(value){return String(value||'').replace(/[&<>"']/g,character=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]))}
