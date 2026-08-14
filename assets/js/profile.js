import {attachDirectPhotoEditor} from './photo-editor.js?v=drag1';

const cfg = window.FIREFLIES_PORTAL_CONFIG || {};
const status = document.querySelector('[data-profile-state]');
const form = document.querySelector('[data-profile-form]');
const saveButton = document.querySelector('[data-profile-save]');
const saveMessage = document.querySelector('[data-profile-message]');
const avatarNames = ['robotics-engineer','tech-hero','nature-guardian','space-explorer','inventor','firefly-mascot','red-panda-builder','owl-scientist','dragon-coder','ocean-explorer','jungle-adventurer','robot-companion'];
const picker = document.querySelector('[data-avatar-picker]');
const previewFrame = document.querySelector('[data-photo-preview]');
const previewImage = document.querySelector('[data-photo-image]');
const photoControls = document.querySelector('[data-photo-controls]');
const zoomControl = document.querySelector('[data-photo-zoom]');
const horizontalControl = document.querySelector('[data-photo-x]');
const verticalControl = document.querySelector('[data-photo-y]');

let pendingPhoto = null;
let pendingPhotoUrl = null;
let keepExistingPhoto = false;
let photoWasAdjusted = false;

const directPhotoEditor = attachDirectPhotoEditor({
  frame: previewFrame,
  image: previewImage,
  zoom: zoomControl,
  horizontal: horizontalControl,
  vertical: verticalControl,
  enabled: () => !photoControls.hidden,
  onChange: () => {
    photoWasAdjusted = true;
    setMessage('Photo adjusted. Save the profile when it looks right.');
  }
});

picker.innerHTML = avatarNames.map((name, index) => `
  <label class="avatar-option" title="${label(name)}">
    <input type="radio" name="avatar_key" value="${name}" ${index === 0 ? 'checked' : ''}>
    <img src="${avatarUrl(name)}" alt="${label(name)} avatar">
    <small>${label(name)}</small>
  </label>`).join('');

picker.addEventListener('change', event => {
  if (!avatarNames.includes(event.target.value)) return;
  clearPendingPhoto();
  keepExistingPhoto = false;
  photoWasAdjusted = false;
  showAvatar(event.target.value);
  setMessage('Selected avatar will replace the uploaded photo when you save.');
});

form.elements.profile_photo.addEventListener('change', event => {
  const file = event.target.files[0];
  if (!file) return;
  if (!['image/jpeg','image/png','image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
    event.target.value = '';
    setMessage('Choose a JPEG, PNG, or WebP image no larger than 5 MB.', true);
    return;
  }
  clearPendingPhoto();
  pendingPhoto = file;
  pendingPhotoUrl = URL.createObjectURL(file);
  previewImage.src = pendingPhotoUrl;
  keepExistingPhoto = false;
  photoWasAdjusted = false;
  zoomControl.value = '1';
  horizontalControl.value = '50';
  verticalControl.value = '50';
  photoControls.hidden = false;
  applyPhotoPreview();
  setMessage('Adjust the photo, then save the profile.');
});

[zoomControl, horizontalControl, verticalControl].forEach(control => control.addEventListener('input', applyPhotoPreview));
showAvatar(avatarNames[0]);

if (cfg.forceDemo || !cfg.supabaseUrl || !cfg.supabaseAnonKey) {
  form.hidden = false;
  status.textContent = 'Preview mode: choose avatars and preview a photo locally. Saving begins after Supabase and Google sign-in are connected.';
  form.addEventListener('submit', event => {
    event.preventDefault();
    setMessage('Preview only—nothing was uploaded or saved.', true);
  });
} else {
  const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
  const db = createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
  const { data: { session } } = await db.auth.getSession();
  if (!session) status.innerHTML = 'Not signed in. <a href="login.html">Sign in</a>';
  else {
    const requested = new URLSearchParams(location.search).get('student');
    const { data: me } = await db.from('profiles').select('id,role,linked_student_id,approval_status').eq('id', session.user.id).single();
    if (me?.approval_status === 'approved' && me.role !== 'student' && !requested) location.replace('account-profile.html');
    const target = me?.role === 'student' ? me.id : me?.role === 'parent' && requested === me.linked_student_id ? requested : me?.role === 'coach' ? requested : null;
    if (!me || me.approval_status !== 'approved' || !target) status.textContent = 'No approved student profile is linked to this account.';
    else {
      const [{ data: person, error: personError }, { data: loadedDetails }] = await Promise.all([
        db.from('profiles').select('id,display_name').eq('id', target).single(),
        db.from('student_details').select('*').eq('student_id', target).maybeSingle()
      ]);
      if (personError) {
        window.FIREFLIES_DIAGNOSTICS?.report('Student profile', personError);
        status.textContent = 'The student profile is unavailable right now.';
      }
      else {
        let details = loadedDetails || {};
        form.hidden = false;
        status.hidden = true;
        for (const [name, value] of Object.entries({ ...details, display_name: person.display_name })) {
          if (form.elements[name] && value !== null) form.elements[name].value = value;
        }
        const selectedAvatar = avatarNames.includes(details.avatar_key) ? details.avatar_key : avatarNames[0];
        const selectedInput = form.querySelector(`[name="avatar_key"][value="${selectedAvatar}"]`);
        if (selectedInput) selectedInput.checked = true;
        showAvatar(selectedAvatar);
        if (details.photo_path) {
          const { data: signed } = await db.storage.from('profile-photos').createSignedUrl(details.photo_path, 900);
          if (signed?.signedUrl) {
            previewImage.src = signed.signedUrl;
            keepExistingPhoto = true;
            photoControls.hidden = false;
            directPhotoEditor.apply();
          }
        }
        if (me.role === 'student' || me.role === 'coach') await setupStudentRelationships(db, target);

        document.querySelector('[data-remove-photo]').onclick = () => {
          clearPendingPhoto();
          keepExistingPhoto = false;
          photoWasAdjusted = false;
          showAvatar(form.elements.avatar_key.value);
          setMessage('The selected avatar will replace the uploaded photo when you save.');
        };

        form.onsubmit = async event => {
          event.preventDefault();
          saveButton.disabled = true;
          saveButton.textContent = 'Saving…';
          setMessage('Saving profile and picture…');
          let uploadedPath = null;
          try {
            const values = Object.fromEntries(new FormData(form));
            delete values.profile_photo;
            const displayName = values.display_name;
            delete values.display_name;
            let editablePhoto = pendingPhoto;
            if (!editablePhoto && photoWasAdjusted && details.photo_path) {
              const { data: existingPhoto, error: existingPhotoError } = await db.storage.from('profile-photos').download(details.photo_path);
              if (existingPhotoError) throw existingPhotoError;
              editablePhoto = existingPhoto;
            }
            if (editablePhoto) {
              const croppedPhoto = await createSquarePhoto(editablePhoto);
              uploadedPath = `${target}/${crypto.randomUUID()}.webp`;
              const { error: uploadError } = await db.storage.from('profile-photos').upload(uploadedPath, croppedPhoto, { contentType: 'image/webp', upsert: false });
              if (uploadError) throw uploadError;
              values.photo_path = uploadedPath;
            } else values.photo_path = keepExistingPhoto ? details.photo_path || null : null;

            const { error: nameError } = await db.rpc('update_student_display_name', { target, new_name: displayName });
            if (nameError) throw nameError;
            const { error: profileError } = await db.from('student_details').upsert({ student_id: target, ...values, updated_by: session.user.id }, { onConflict: 'student_id' });
            if (profileError) throw profileError;

            if (details.photo_path && details.photo_path !== values.photo_path) {
              await db.storage.from('profile-photos').remove([details.photo_path]);
            }
            details = { ...details, ...values };
            keepExistingPhoto = Boolean(details.photo_path);

            let headerPhotoUrl = null;
            if (details.photo_path) {
              const { data: signed } = await db.storage.from('profile-photos').createSignedUrl(details.photo_path, 900);
              headerPhotoUrl = signed?.signedUrl || null;
              if (headerPhotoUrl) {
                previewImage.src = headerPhotoUrl;
              }
            } else showAvatar(values.avatar_key);
            window.dispatchEvent(new CustomEvent('fireflies:profile-photo-updated', { detail: { target, url: headerPhotoUrl } }));
            clearPendingPhoto();
            photoControls.hidden = !details.photo_path;
            photoWasAdjusted = false;
            zoomControl.value = '1';
            horizontalControl.value = '50';
            verticalControl.value = '50';
            directPhotoEditor.apply();
            form.elements.profile_photo.value = '';
            setMessage('Saved. Your profile and picture are up to date.');
          } catch (error) {
            if (uploadedPath) await db.storage.from('profile-photos').remove([uploadedPath]);
            window.FIREFLIES_DIAGNOSTICS?.report('Save student profile', error);
            setMessage('The profile could not be saved right now.', true);
          } finally {
            saveButton.disabled = false;
            saveButton.textContent = 'Save profile';
          }
        };
      }
    }
  }
}

function avatarUrl(name) {
  return `assets/img/avatars/${avatarNames.includes(name) ? name : avatarNames[0]}.webp`;
}

function label(value) {
  return value.split('-').map(word => word[0].toUpperCase() + word.slice(1)).join(' ');
}

function showAvatar(name) {
  previewImage.src = avatarUrl(name);
  previewImage.style.transform = '';
  previewImage.style.transformOrigin = '';
  photoControls.hidden = true;
  directPhotoEditor.apply();
}

function applyPhotoPreview() {
  directPhotoEditor.apply();
}

function clearPendingPhoto() {
  pendingPhoto = null;
  if (pendingPhotoUrl) URL.revokeObjectURL(pendingPhotoUrl);
  pendingPhotoUrl = null;
  photoControls.hidden = true;
  directPhotoEditor.apply();
}

function setMessage(message, isError = false) {
  saveMessage.textContent = message;
  saveMessage.classList.toggle('error', isError);
}

async function setupStudentRelationships(db, target) {
  const panel = document.querySelector('[data-student-family]');
  const parentOne = document.querySelector('[data-student-parent-one]');
  const parentTwo = document.querySelector('[data-student-parent-two]');
  const message = document.querySelector('[data-student-family-message]');
  const button = document.querySelector('[data-save-student-family]');
  const [{ data: options, error: optionsError }, { data: relationships, error: relationshipsError }] = await Promise.all([
    db.rpc('family_relationship_options', { option_role: 'adult' }),
    db.rpc('family_relationships', { target_user: target })
  ]);
  if (optionsError || relationshipsError) {
    window.FIREFLIES_DIAGNOSTICS?.report('Student family relationships', optionsError || relationshipsError);
    return;
  }
  const current = (relationships || []).map(person => person.id);
  const optionMarkup = `<option value="">Not linked</option>${(options || []).map(person => `<option value="${person.id}">${escapeHtml(person.display_name)}</option>`).join('')}`;
  parentOne.innerHTML = optionMarkup;
  parentTwo.innerHTML = optionMarkup;
  parentOne.value = current[0] || '';
  parentTwo.value = current[1] || '';
  panel.hidden = false;
  button.onclick = async () => {
    const selected = [parentOne.value, parentTwo.value].filter(Boolean);
    if (new Set(selected).size !== selected.length) {
      message.textContent = 'Choose two different linked adults.';
      message.classList.add('error');
      return;
    }
    button.disabled = true;
    button.textContent = 'Updating…';
    message.textContent = '';
    message.classList.remove('error');
    const { error } = await db.rpc('set_student_parents', { target_student: target, target_parents: selected });
    if (error) {
      window.FIREFLIES_DIAGNOSTICS?.report('Update student parents', error);
      message.textContent = 'The family relationship could not be updated right now.';
      message.classList.add('error');
      button.disabled = false;
      button.textContent = 'Update relationships';
      return;
    }
    message.textContent = 'Relationships updated.';
    button.disabled = false;
    button.textContent = 'Update relationships';
  };
}

function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
}

async function createSquarePhoto(file) {
  const image = await loadImage(file);
  const size = 512;
  const zoom = Number(zoomControl.value);
  const positionX = Number(horizontalControl.value) / 100;
  const positionY = Number(verticalControl.value) / 100;
  const scale = Math.min(size / image.naturalWidth, size / image.naturalHeight) * zoom;
  const width = image.naturalWidth * scale;
  const height = image.naturalHeight * scale;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  context.fillStyle = '#fffdf5';
  context.fillRect(0, 0, size, size);
  context.drawImage(image, (size - width) * positionX, (size - height) * positionY, width, height);
  return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Photo could not be prepared.')), 'image/webp', 0.9));
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(file);
    image.onload = () => { URL.revokeObjectURL(url); resolve(image); };
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Photo could not be opened.')); };
    image.src = url;
  });
}
