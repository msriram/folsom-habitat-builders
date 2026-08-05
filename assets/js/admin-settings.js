const state=document.querySelector('[data-settings-state]');
const view=document.querySelector('[data-settings-view]');
const diagnosticSummary=document.querySelector('[data-diagnostic-summary]');
const diagnosticLog=document.querySelector('[data-diagnostic-log]');
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
        if(error)window.FIREFLIES_DIAGNOSTICS?.report('Admin access',error);
        state.textContent='Coach administrator access required.';
      }else{
        state.hidden=true;
        view.hidden=false;
        const issues=window.FIREFLIES_DIAGNOSTICS?.list?.()||[];
        diagnosticSummary.innerHTML=`<div><strong>Website</strong><span>${escapeHtml(location.origin)}</span></div><div><strong>Database</strong><span>${escapeHtml(new URL(config.supabaseUrl).host)}</span></div><div><strong>Account</strong><span>Approved coach</span></div><div><strong>Recent issues</strong><span>${issues.length}</span></div>`;
        diagnosticLog.innerHTML=issues.length?issues.map(item=>`<tr><td>${escapeHtml(new Date(item.time).toLocaleString())}</td><td>${escapeHtml(item.area)}</td><td><code>${escapeHtml(item.detail)}</code></td></tr>`).join(''):'<tr><td colspan="3">No technical issues recorded in this browser session.</td></tr>';
        document.querySelector('[data-clear-diagnostics]').onclick=()=>{window.FIREFLIES_DIAGNOSTICS?.clear?.();diagnosticLog.innerHTML='<tr><td colspan="3">No technical issues recorded in this browser session.</td></tr>';diagnosticSummary.lastElementChild.querySelector('span').textContent='0';};
      }
    }
  }catch(error){
    window.FIREFLIES_DIAGNOSTICS?.report('Admin settings',error);
    state.textContent='Admin settings are unavailable right now.';
  }
}
function escapeHtml(value){return String(value||'').replace(/[&<>"']/g,character=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]))}
