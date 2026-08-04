const cfg=window.FIREFLIES_PORTAL_CONFIG||{};
const state=document.querySelector('[data-accounting-state]');
const form=document.querySelector('[data-accounting-form]');
const money=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(Number(n)||0);
document.querySelector('[data-new-entry]').onclick=()=>{form.hidden=false;form.scrollIntoView({behavior:'smooth'})};
document.querySelector('[data-cancel-entry]').onclick=()=>form.hidden=true;
if(cfg.forceDemo||!cfg.supabaseUrl||!cfg.supabaseAnonKey){
  state.textContent='Database setup is not connected yet. The opening ledger is read-only until Supabase and Google sign-in are configured.';
  document.querySelector('[data-new-entry]').disabled=true;
}else{
  const {createClient}=await import('https://esm.sh/@supabase/supabase-js@2');
  const db=createClient(cfg.supabaseUrl,cfg.supabaseAnonKey);
  const {data:{session}}=await db.auth.getSession();
  if(!session){state.innerHTML='Sign in with an approved parent or coach account to view accounting. <a href="login.html">Sign in</a>';document.querySelector('[data-new-entry]').disabled=true}
  else{
    const {data:profile}=await db.from('profiles').select('team_id,display_name,role,approval_status').eq('id',session.user.id).single();
    if(!profile||profile.approval_status!=='approved'||!['parent','coach'].includes(profile.role)){state.textContent='This account does not have approved accounting access.';document.querySelector('[data-new-entry]').disabled=true}
    else{
      state.textContent=`Connected as ${profile.display_name}. Changes are saved to the team database.`;
      async function load(){const {data,error}=await db.from('accounting_entries').select('id,entry_date,entry_type,description,amount,created_by,created_at').eq('team_id',profile.team_id).order('entry_date',{ascending:false});if(error){state.textContent=error.message;return}const rows=data||[];document.querySelector('[data-ledger]').innerHTML=rows.map(r=>`<tr><td>${r.entry_date}</td><td>${r.entry_type}</td><td>${escapeHtml(r.description)}</td><td>${money(r.amount)}</td><td>${r.created_by===session.user.id?'You':'Team member'}</td><td></td></tr>`).join('')||'<tr><td colspan="6">No entries yet.</td></tr>';const expenses=rows.filter(r=>['expense','reimbursement'].includes(r.entry_type)).reduce((a,r)=>a+Number(r.amount),0),contributions=rows.filter(r=>r.entry_type==='contribution').reduce((a,r)=>a+Number(r.amount),0);document.querySelector('[data-expenses]').textContent=money(expenses);document.querySelector('[data-contributions]').textContent=money(contributions);document.querySelector('[data-balance]').textContent=money(expenses-contributions)}
      form.onsubmit=async e=>{e.preventDefault();const values=Object.fromEntries(new FormData(form));const {error}=await db.from('accounting_entries').insert({team_id:profile.team_id,entry_date:values.entry_date,entry_type:values.entry_type,amount:Number(values.amount),description:values.description,notes:values.notes,created_by:session.user.id});if(error){state.textContent=error.message;return}form.reset();form.hidden=true;await load()};
      await load();
    }
  }
}
function escapeHtml(value){return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
