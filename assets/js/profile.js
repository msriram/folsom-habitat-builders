const cfg=window.FIREFLIES_PORTAL_CONFIG||{};
const status=document.querySelector('[data-profile-state]');
const form=document.querySelector('[data-profile-form]');
const avatarNames=['robotics-engineer','tech-hero','nature-guardian','space-explorer','inventor','firefly-mascot','red-panda-builder','owl-scientist','dragon-coder','ocean-explorer','jungle-adventurer','robot-companion'];
const picker=document.querySelector('[data-avatar-picker]');
picker.innerHTML=avatarNames.map((name,index)=>`<label class="avatar-option" title="${label(name)}"><input type="radio" name="avatar_key" value="${name}" ${index===0?'checked':''}><span style="--avatar-x:${index%4};--avatar-y:${Math.floor(index/4)}"></span><small>${label(name)}</small></label>`).join('');

if(cfg.forceDemo||!cfg.supabaseUrl||!cfg.supabaseAnonKey){
  status.textContent='Profile editing is ready but unavailable until Supabase and Google sign-in are connected.';
}else{
  const {createClient}=await import('https://esm.sh/@supabase/supabase-js@2');
  const db=createClient(cfg.supabaseUrl,cfg.supabaseAnonKey);
  const {data:{session}}=await db.auth.getSession();
  if(!session) status.innerHTML='Not signed in. <a href="login.html">Sign in</a>';
  else{
    const requested=new URLSearchParams(location.search).get('student');
    const {data:me}=await db.from('profiles').select('id,role,linked_student_id,approval_status').eq('id',session.user.id).single();
    const target=me?.role==='student'?me.id:me?.role==='parent'?me.linked_student_id:requested;
    if(!me||me.approval_status!=='approved'||!target) status.textContent='No approved student profile is linked to this account.';
    else{
      const [{data:person,error:personError},{data:details}]=await Promise.all([
        db.from('profiles').select('id,display_name').eq('id',target).single(),
        db.from('student_details').select('*').eq('student_id',target).maybeSingle()
      ]);
      if(personError) status.textContent=personError.message;
      else{
        form.hidden=false;
        status.textContent=`Editing the private profile for ${person.display_name}.`;
        for(const [name,value] of Object.entries({...details,display_name:person.display_name})) if(form.elements[name]&&value!==null) form.elements[name].value=value;
        if(details?.avatar_key) form.querySelector(`[name="avatar_key"][value="${details.avatar_key}"]`)?.click();
        if(details?.photo_path){const {data:signed}=await db.storage.from('profile-photos').createSignedUrl(details.photo_path,900);if(signed?.signedUrl) document.querySelector('[data-photo-preview]').style.backgroundImage=`url("${signed.signedUrl}")`;}
        document.querySelector('[data-remove-photo]').onclick=async()=>{if(details?.photo_path){await db.storage.from('profile-photos').remove([details.photo_path]);details.photo_path=null;}document.querySelector('[data-photo-preview]').style.backgroundImage='';status.textContent='Uploaded photo removed. Save to keep the selected avatar.'};
        form.onsubmit=async event=>{
          event.preventDefault();
          const values=Object.fromEntries(new FormData(form));
          const file=form.elements.profile_photo.files[0];
          delete values.profile_photo;
          const display_name=values.display_name;delete values.display_name;
          for(const key of ['height_inches','weight_pounds']) values[key]=values[key]?Number(values[key]):null;
          if(file){
            if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>5*1024*1024){status.textContent='Choose a JPEG, PNG, or WebP image no larger than 5 MB.';return;}
            if(details?.photo_path) await db.storage.from('profile-photos').remove([details.photo_path]);
            const extension=file.type==='image/jpeg'?'jpg':file.type.split('/')[1];
            values.photo_path=`${target}/${crypto.randomUUID()}.${extension}`;
            const {error:uploadError}=await db.storage.from('profile-photos').upload(values.photo_path,file,{contentType:file.type,upsert:false});
            if(uploadError){status.textContent=uploadError.message;return;}
          }else values.photo_path=details?.photo_path||null;
          const {error:nameError}=await db.rpc('update_student_display_name',{target,new_name:display_name});
          const {error:profileError}=await db.from('student_details').upsert({student_id:target,...values,updated_by:session.user.id},{onConflict:'student_id'});
          status.textContent=nameError?.message||profileError?.message||'Profile and picture saved to the private database.';
        };
      }
    }
  }
}
function label(value){return value.split('-').map(word=>word[0].toUpperCase()+word.slice(1)).join(' ')}
