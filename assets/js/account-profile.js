const config=window.FIREFLIES_PORTAL_CONFIG||{};
const state=document.querySelector('[data-account-profile-state]');
const view=document.querySelector('[data-account-profile-view]');
const form=document.querySelector('[data-account-profile-form]');
const photo=document.querySelector('[data-account-photo]');
const photoControls=document.querySelector('[data-account-photo-controls]');
const zoom=document.querySelector('[data-account-photo-zoom]');
const focusX=document.querySelector('[data-account-photo-x]');
const focusY=document.querySelector('[data-account-photo-y]');
const saveButton=document.querySelector('[data-account-profile-save]');
const saveMessage=document.querySelector('[data-account-profile-message]');
const familyPanel=document.querySelector('[data-family-panel]');
const familyChild=document.querySelector('[data-family-child]');
const adminDashboard=document.querySelector('[data-admin-profile-dashboard]');
const mascot='assets/img/logo.svg';

let pendingPhoto=null;
let pendingPhotoUrl=null;
let existingPhotoPath=null;
let removePhoto=false;

if(config.forceDemo||!config.supabaseUrl||!config.supabaseAnonKey){
  state.textContent='This page is unavailable right now.';
}else{
  try{
    const {createClient}=await import('https://esm.sh/@supabase/supabase-js@2');
    const db=createClient(config.supabaseUrl,config.supabaseAnonKey);
    const {data:{session}}=await db.auth.getSession();
    if(!session){
      state.innerHTML='Sign in to open your profile. <a href="login.html">Sign in</a>';
    }else{
      const {data:profile,error:profileError}=await db.from('profiles').select('id,display_name,role,approval_status,linked_student_id,is_active').eq('id',session.user.id).maybeSingle();
      if(profileError)throw profileError;
      if(!profile||profile.approval_status!=='approved'||!profile.is_active){
        state.textContent='Waiting for coach approval.';
      }else if(profile.role==='student'){
        location.replace('profile.html');
      }else{
        document.querySelector('[data-account-role]').textContent=profile.role==='coach'?'Coach administrator':'Parent account';
        document.querySelector('[data-account-intro]').textContent=profile.role==='coach'?'Your private profile and team overview.':'Your private profile and linked child.';
        form.elements.display_name.value=profile.display_name;
        const {data:details,error:detailsError}=await db.from('account_details').select('photo_path').eq('profile_id',profile.id).maybeSingle();
        if(detailsError)throw detailsError;
        existingPhotoPath=details?.photo_path||null;
        if(existingPhotoPath){
          const {data:signed,error:signedError}=await db.storage.from('account-photos').createSignedUrl(existingPhotoPath,900);
          if(signedError)throw signedError;
          if(signed?.signedUrl)photo.src=signed.signedUrl;
        }
        view.hidden=false;
        state.hidden=true;
        if(profile.role==='parent')await renderLinkedChild(db,profile.linked_student_id);
        if(profile.role==='coach')await renderAdminDashboard(db);
        setupForm(db,session,profile);
      }
    }
  }catch(error){
    window.FIREFLIES_DIAGNOSTICS?.report('Account profile',error);
    state.hidden=false;
    state.textContent='Your profile is unavailable right now.';
  }
}

async function renderLinkedChild(db,studentId){
  familyPanel.hidden=false;
  if(!studentId){
    familyChild.innerHTML='<h2>Not linked yet</h2><p>Ask a coach to connect this parent account to the correct student.</p>';
    return;
  }
  const {data,error}=await db.rpc('team_student_profile',{target:studentId});
  if(error){window.FIREFLIES_DIAGNOSTICS?.report('Linked child',error);familyChild.innerHTML='<p>Child details are unavailable right now.</p>';return;}
  const child=data?.[0];
  if(!child){familyChild.innerHTML='<p>Child details are unavailable right now.</p>';return;}
  const avatar=child.avatar_key||'robotics-engineer';
  familyChild.innerHTML=`<div class="family-child"><img src="assets/img/avatars/${safeAvatar(avatar)}.webp" alt=""><div><h2>${escapeHtml(child.display_name)}</h2>${child.tag_name?`<p>“${escapeHtml(child.tag_name)}”</p>`:''}</div></div><div class="stack"><a class="button secondary" href="student.html?id=${encodeURIComponent(studentId)}">View child profile</a><a class="button secondary" href="profile.html?student=${encodeURIComponent(studentId)}">Edit child details</a><a class="button secondary" href="portal.html?tab=homework">View homework</a></div>`;
}

async function renderAdminDashboard(db){
  adminDashboard.hidden=false;
  const [usersResult,assignmentsResult,submissionsResult,projectsResult,scheduleResult]=await Promise.all([
    db.rpc('admin_users'),
    db.from('assignments').select('id').eq('published',true),
    db.from('submissions').select('student_id,status,submitted_at,created_at'),
    db.from('coding_projects').select('owner_id'),
    db.from('schedule_items').select('area,completed')
  ]);
  const failed=[usersResult,assignmentsResult,submissionsResult,projectsResult,scheduleResult].find(result=>result.error);
  if(failed){
    window.FIREFLIES_DIAGNOSTICS?.report('Admin profile report',failed.error);
    document.querySelector('[data-admin-student-report]').innerHTML='<tr><td colspan="5">The student report is unavailable right now.</td></tr>';
    return;
  }
  const students=(usersResult.data||[]).filter(person=>person.role==='student');
  const assignments=assignmentsResult.data||[];
  const submissions=submissionsResult.data||[];
  const projects=projectsResult.data||[];
  const areas=['Robot','Project','Teamwork','Presentation'];
  const schedule=scheduleResult.data||[];
  document.querySelector('[data-admin-progress]').innerHTML=areas.map(area=>{
    const items=schedule.filter(item=>item.area===area);
    const percent=items.length?Math.round(items.filter(item=>item.completed).length/items.length*100):0;
    return `<article class="plain-panel"><span class="eyebrow">${area}</span><h2>${percent}%</h2><div class="progress-track"><div class="progress-bar" style="width:${percent}%"></div></div></article>`;
  }).join('');
  document.querySelector('[data-admin-student-report]').innerHTML=students.map(student=>{
    const work=submissions.filter(item=>item.student_id===student.id);
    const latest=[...work].sort((a,b)=>new Date(b.submitted_at||b.created_at)-new Date(a.submitted_at||a.created_at))[0];
    const projectCount=projects.filter(project=>project.owner_id===student.id).length;
    return `<tr><td>${escapeHtml(student.display_name)}</td><td>${work.length} of ${assignments.length}</td><td>${latest?escapeHtml(labelStatus(latest.status)):'Not started'}</td><td>${projectCount}</td><td><a href="profile.html?student=${encodeURIComponent(student.id)}">Edit profile</a></td></tr>`;
  }).join('')||'<tr><td colspan="5">No approved students yet.</td></tr>';
}

function setupForm(db,session,profile){
  form.elements.account_photo.addEventListener('change',event=>{
    const file=event.target.files[0];
    if(!file)return;
    if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>5*1024*1024){
      event.target.value='';
      setMessage('Choose a JPEG, PNG, or WebP image no larger than 5 MB.',true);
      return;
    }
    clearPendingPhoto();
    pendingPhoto=file;
    pendingPhotoUrl=URL.createObjectURL(file);
    photo.src=pendingPhotoUrl;
    removePhoto=false;
    zoom.value='1';focusX.value='50';focusY.value='50';
    photoControls.hidden=false;
    applyPhotoPreview();
    setMessage('Adjust the photo, then save your profile.');
  });
  [zoom,focusX,focusY].forEach(control=>control.addEventListener('input',applyPhotoPreview));
  document.querySelector('[data-remove-account-photo]').onclick=()=>{
    clearPendingPhoto();
    removePhoto=true;
    photo.src=mascot;
    photo.style.transform='';
    photo.style.transformOrigin='';
    setMessage('The team mascot will be used after you save.');
  };
  form.onsubmit=async event=>{
    event.preventDefault();
    saveButton.disabled=true;
    saveButton.textContent='Saving…';
    setMessage('Saving…');
    let uploadedPath=null;
    try{
      let photoPath=removePhoto?null:existingPhotoPath;
      if(pendingPhoto){
        const cropped=await createSquarePhoto(pendingPhoto);
        uploadedPath=`${profile.id}/${crypto.randomUUID()}.webp`;
        const {error:uploadError}=await db.storage.from('account-photos').upload(uploadedPath,cropped,{contentType:'image/webp',upsert:false});
        if(uploadError)throw uploadError;
        photoPath=uploadedPath;
      }
      const {error:nameError}=await db.rpc('update_my_display_name',{new_name:form.elements.display_name.value.trim()});
      if(nameError)throw nameError;
      const {error:detailsError}=await db.from('account_details').upsert({profile_id:profile.id,photo_path:photoPath,updated_by:session.user.id,updated_at:new Date().toISOString()},{onConflict:'profile_id'});
      if(detailsError)throw detailsError;
      if(existingPhotoPath&&existingPhotoPath!==photoPath){
        const {error:removeError}=await db.storage.from('account-photos').remove([existingPhotoPath]);
        if(removeError)window.FIREFLIES_DIAGNOSTICS?.report('Old account photo',removeError);
      }
      existingPhotoPath=photoPath;
      removePhoto=false;
      clearPendingPhoto();
      form.elements.account_photo.value='';
      let signedUrl=null;
      if(photoPath){
        const {data:signed}=await db.storage.from('account-photos').createSignedUrl(photoPath,900);
        signedUrl=signed?.signedUrl||null;
        if(signedUrl)photo.src=signedUrl;
      }else photo.src=mascot;
      window.dispatchEvent(new CustomEvent('fireflies:account-photo-updated',{detail:{target:profile.id,url:signedUrl}}));
      setMessage('Profile saved.');
    }catch(error){
      if(uploadedPath)await db.storage.from('account-photos').remove([uploadedPath]);
      window.FIREFLIES_DIAGNOSTICS?.report('Save account profile',error);
      setMessage('Your profile could not be saved right now.',true);
    }finally{
      saveButton.disabled=false;
      saveButton.textContent='Save profile';
    }
  };
}

function applyPhotoPreview(){photo.style.transform=`scale(${zoom.value})`;photo.style.transformOrigin=`${focusX.value}% ${focusY.value}%`}
function clearPendingPhoto(){pendingPhoto=null;if(pendingPhotoUrl)URL.revokeObjectURL(pendingPhotoUrl);pendingPhotoUrl=null;photoControls.hidden=true}
function setMessage(text,isError=false){saveMessage.textContent=text;saveMessage.classList.toggle('error',isError)}
function safeAvatar(value){const allowed=['robotics-engineer','tech-hero','nature-guardian','space-explorer','inventor','firefly-mascot','red-panda-builder','owl-scientist','dragon-coder','ocean-explorer','jungle-adventurer','robot-companion'];return allowed.includes(value)?value:allowed[0]}
function labelStatus(value){return ({assigned:'Assigned',submitted:'Submitted',review:'In review',revise:'Revision requested',complete:'Complete'})[value]||value}
function escapeHtml(value){return String(value||'').replace(/[&<>"']/g,character=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]))}

async function createSquarePhoto(file){
  const image=await loadImage(file),size=512,scale=Math.min(size/image.naturalWidth,size/image.naturalHeight)*Number(zoom.value),width=image.naturalWidth*scale,height=image.naturalHeight*scale,x=(size-width)*Number(focusX.value)/100,y=(size-height)*Number(focusY.value)/100;
  const canvas=document.createElement('canvas');canvas.width=size;canvas.height=size;
  const context=canvas.getContext('2d');context.fillStyle='#fffdf5';context.fillRect(0,0,size,size);context.drawImage(image,x,y,width,height);
  return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('Photo could not be prepared.')),'image/webp',.9));
}
function loadImage(file){return new Promise((resolve,reject)=>{const image=new Image(),url=URL.createObjectURL(file);image.onload=()=>{URL.revokeObjectURL(url);resolve(image)};image.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('Photo could not be opened.'))};image.src=url})}
