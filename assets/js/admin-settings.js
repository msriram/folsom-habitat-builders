const state=document.querySelector('[data-settings-state]');
const view=document.querySelector('[data-settings-view]');
const config=window.FIREFLIES_PORTAL_CONFIG||{};

if(config.forceDemo||!config.supabaseUrl||!config.supabaseAnonKey){
  state.textContent='Administrator sign-in is not configured.';
}else{
  try{
    const {createClient}=await import('https://esm.sh/@supabase/supabase-js@2');
    const client=createClient(config.supabaseUrl,config.supabaseAnonKey);
    const {data:{session}}=await client.auth.getSession();
    if(!session){
      state.innerHTML='Sign in with an approved coach account. <a href="login.html">Sign in</a>';
    }else{
      const {data:profile,error}=await client.from('profiles').select('role,approval_status,is_active').eq('id',session.user.id).maybeSingle();
      if(error||!profile||profile.approval_status!=='approved'||profile.role!=='coach'||!profile.is_active){
        state.textContent='Access denied. This page is available only to approved coach administrators.';
      }else{
        state.textContent='Administrator access confirmed.';
        view.hidden=false;
      }
    }
  }catch{
    state.textContent='Administrator access could not be verified.';
  }
}
