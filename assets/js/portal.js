(() => {
  const key = "team-portal-demo-v2";
  const initial = { submissions: [], questions: [{author:"Student 2",question:"What can reduce biodiversity in a local habitat?",answer:"Habitat loss, pollution, invasive species, and climate changes can all affect biodiversity. Choose one factor, find reliable evidence, and compare possible solutions."}], tests:[{mission:"Straight-line drill",attempts:10,successes:8,next:"Check wheel alignment"}], versions:[], ideas:[],decisions:[],meetings:[] };
  let state; try { state = {...initial,...JSON.parse(localStorage.getItem(key)||"{}")}; } catch { state={...initial}; }
  const save=()=>localStorage.setItem(key,JSON.stringify(state));
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const progressAreas=['Robot','Project','Teamwork','Presentation'];
  const qs=document.querySelectorAll.bind(document);
  const activateTab=name=>{const button=document.querySelector(`[data-tab="${name}"]`),panel=document.querySelector(`[data-panel="${name}"]`);if(!button||!panel)return;qs('[data-tab],[data-panel]').forEach(x=>x.classList.remove('active'));button.classList.add('active');panel.classList.add('active')};
  qs('[data-tab]').forEach(b=>b.onclick=()=>{activateTab(b.dataset.tab);history.replaceState(null,'',`#${b.dataset.tab}`)});
  activateTab(location.hash.slice(1)||'dashboard');
  const switchRole=e=>{const v=e.target.value;document.querySelector('#welcome').textContent=v==='coach'?'Coach dashboard':v==='parent'?'Family progress':'Student dashboard';qs('[data-tab="parent"],[data-tab="coach"]').forEach(x=>x.hidden=(x.dataset.tab!==v));};
  document.querySelector('#role-switcher').onchange=switchRole; switchRole({target:document.querySelector('#role-switcher')});
  document.querySelector('#reset-demo').onclick=()=>{localStorage.removeItem(key);location.reload()};
  const renderProgress=values=>{
    document.querySelector('#progress-cards').innerHTML=progressAreas.map(n=>`<article class="card"><strong>${n}</strong><div class="progress-track"><div class="progress-bar" style="width:${values[n]||0}%"></div></div><span>${values[n]||0}%</span></article>`).join('');
    document.querySelector('#parent-progress').innerHTML=progressAreas.map(n=>`<div class="progress-row"><strong>${n}</strong><div class="progress-track"><div class="progress-bar" style="width:${values[n]||0}%"></div></div><span>${values[n]||0}%</span></div>`).join('');
  };
  renderProgress({});
  async function setupProgress(){
    const config=window.FIREFLIES_PORTAL_CONFIG||{},week=document.querySelector('#progress-week');
    if(config.forceDemo||!config.supabaseUrl||!config.supabaseAnonKey)return;
    const {createClient}=await import('https://esm.sh/@supabase/supabase-js@2'),db=createClient(config.supabaseUrl,config.supabaseAnonKey);
    const {data:{session}}=await db.auth.getSession();if(!session)return;
    const {data:items}=await db.from('schedule_items').select('area,week_number,completed');if(!items)return;
    const calculate=()=>{
      const through=week.value==='all'?Infinity:Number(week.value),values={};
      for(const area of progressAreas){const relevant=items.filter(item=>item.area===area&&item.week_number<=through);values[area]=relevant.length?Math.round(relevant.filter(item=>item.completed).length/relevant.length*100):0;}
      renderProgress(values);
    };
    week.onchange=calculate;calculate();
  }
  setupProgress();
  function renderQuestions(){document.querySelector('#question-list').innerHTML=state.questions.map(q=>`<article class="card"><span class="status-chip">Team only</span><h3>${esc(q.question)}</h3><p>${esc(q.answer)}</p><small>Asked by ${esc(q.author)} · Coach review available</small></article>`).join('')}
  async function setupGuide(){
    const form=document.querySelector('#question-form'),status=document.querySelector('#guide-status'),message=document.querySelector('#guide-message'),button=form.querySelector('button');
    const config=window.FIREFLIES_PORTAL_CONFIG||{};
    if(config.forceDemo||!config.supabaseUrl||!config.supabaseAnonKey){status.textContent='Demo mode';renderQuestions();return;}
    const {createClient}=await import('https://esm.sh/@supabase/supabase-js@2');
    const client=createClient(config.supabaseUrl,config.supabaseAnonKey);
    const {data:{session}}=await client.auth.getSession();
    if(!session){status.textContent='Sign in required';button.disabled=true;message.innerHTML='Use the account button above to sign in with Google.';document.querySelector('#question-list').innerHTML='';return;}
    const {data:profile}=await client.from('profiles').select('role,approval_status').eq('id',session.user.id).maybeSingle();
    const allowed=profile?.approval_status==='approved'&&['student','coach'].includes(profile?.role);
    status.textContent=allowed?'AI test active':'Approval required';button.disabled=!allowed;
    if(!allowed){message.textContent='An administrator must approve this account as a student or coach.';document.querySelector('#question-list').innerHTML='';return;}
    const {data:history}=await client.from('questions').select('question,ai_answer,created_at').not('ai_answer','is',null).order('created_at',{ascending:false}).limit(20);
    state.questions=(history||[]).map(q=>({author:'Team member',question:q.question,answer:q.ai_answer}));renderQuestions();
    form.onsubmit=async e=>{
      e.preventDefault();const question=document.querySelector('#question-text').value.trim();if(!question)return;
      button.disabled=true;button.textContent='Researching…';message.textContent='';
      const {data,error}=await client.functions.invoke(config.functions?.guide||'firefly-guide',{body:{question}});
      button.disabled=false;button.textContent='Ask AI';
      if(error||data?.error){message.textContent=data?.error||error.message;return;}
      state.questions.unshift({author:'You',question,answer:data.answer});renderQuestions();form.reset();
      message.textContent=`Saved for coach review · ${data.remaining} AI questions remaining today.`;
    };
  }
  setupGuide().catch(()=>{document.querySelector('#guide-status').textContent='Unavailable';document.querySelector('#guide-message').textContent='Ask AI could not connect. Please try again later.';});
  function preview(){const h=document.querySelector('#build-html').value,c=document.querySelector('#build-css').value,j=document.querySelector('#build-js').value;document.querySelector('#student-preview').srcdoc=`<!doctype html><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src data:"><style>${c}</style>${h}<script>${j}<\/script>`}
  function versions(){document.querySelector('#version-list').innerHTML=state.versions.map((v,i)=>`<li>Version ${state.versions.length-i}: ${esc(v.name)} — ${esc(v.reflection)}</li>`).join('')||'<li>No saved versions yet.</li>'}
  document.querySelector('#build-form').onsubmit=e=>{e.preventDefault();preview();state.versions.unshift({name:document.querySelector('#project-name').value,reflection:document.querySelector('#build-reflection').value});save();versions()};preview();versions();
  function tests(){document.querySelector('#robot-tests').innerHTML=state.tests.map(t=>`<tr><td>${esc(t.mission)}</td><td>${t.attempts}</td><td>${t.successes}</td><td><strong>${Math.round(t.successes/t.attempts*100)}%</strong></td><td>${esc(t.next)}</td></tr>`).join('')}
  document.querySelector('#robot-form').onsubmit=e=>{e.preventDefault();const attempts=+document.querySelector('#attempts').value,successes=+document.querySelector('#successes').value;if(successes>attempts)return alert('Successes cannot exceed attempts.');state.tests.unshift({mission:document.querySelector('#mission').value,attempts,successes,next:document.querySelector('#next-change').value});save();e.target.reset();tests()};tests();
  qs('[data-demo-add]').forEach(b=>b.onclick=()=>{const type=b.dataset.demoAdd;const values={idea:'Smart shielded streetlight — Researching',decision:'Use a wide attachment rail — compare changeover time',meeting:'Kickoff — build models, read rules, list questions'};state[type+'s'].push(values[type]);save();document.querySelector(`#${type}-list`).innerHTML=state[type+'s'].map(x=>`<li>${esc(x)}</li>`).join('')});
})();
