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
    if(error){note.textContent='Shared checklist is temporarily unavailable.';list.after(note);}
    else if(items?.length){
      const canEdit=profile?.approval_status==='approved'&&profile.role==='coach';
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
  }
}
function escapeHtml(value){return String(value||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
