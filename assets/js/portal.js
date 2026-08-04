(() => {
  const key = "team-portal-demo-v2";
  const initial = { submissions: [], questions: [{author:"Student 2",question:"What can reduce biodiversity in a local habitat?",answer:"Habitat loss, pollution, invasive species, and climate changes can all affect biodiversity. Choose one factor, find reliable evidence, and compare possible solutions."}], tests:[{mission:"Straight-line drill",attempts:10,successes:8,next:"Check wheel alignment"}], versions:[], ideas:[],decisions:[],meetings:[] };
  let state; try { state = {...initial,...JSON.parse(localStorage.getItem(key)||"{}")}; } catch { state={...initial}; }
  const save=()=>localStorage.setItem(key,JSON.stringify(state));
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const assignments=[{title:"Local biodiversity problem",due:"August 8",status:"Assigned",text:"Find one local problem, who it affects, an existing solution, and one weakness."},{title:"Robot consistency test",due:"Next meeting",status:"In progress",text:"Run the same route ten times, measure the endpoints, and describe the biggest source of variation."}];
  const progress=[['Robot',18],['Project',12],['Teamwork',25],['Presentation',8]];
  const qs=document.querySelectorAll.bind(document);
  qs('[data-tab]').forEach(b=>b.onclick=()=>{qs('[data-tab],[data-panel]').forEach(x=>x.classList.remove('active'));b.classList.add('active');document.querySelector(`[data-panel="${b.dataset.tab}"]`).classList.add('active')});
  const switchRole=e=>{const v=e.target.value;document.querySelector('#welcome').textContent=v==='coach'?'Coach dashboard':v==='parent'?'Family progress':'Hello, Student 1';qs('[data-tab="parent"],[data-tab="coach"]').forEach(x=>x.hidden=(x.dataset.tab!==v));};
  document.querySelector('#role-switcher').onchange=switchRole; switchRole({target:document.querySelector('#role-switcher')});
  document.querySelector('#reset-demo').onclick=()=>{localStorage.removeItem(key);location.reload()};
  document.querySelector('#progress-cards').innerHTML=progress.map(([n,v])=>`<article class="card"><strong>${n}</strong><div class="progress-track"><div class="progress-bar" style="width:${v}%"></div></div><span>${v}%</span></article>`).join('');
  document.querySelector('#parent-progress').innerHTML=progress.map(([n,v])=>`<div class="progress-row"><strong>${n}</strong><div class="progress-track"><div class="progress-bar" style="width:${v}%"></div></div><span>${v}%</span></div>`).join('');
  document.querySelector('#assignment-list').innerHTML=assignments.map(a=>`<article class="card"><span class="status-chip">${a.status}</span><h3>${a.title}</h3><p>${a.text}</p><strong>Due: ${a.due}</strong></article>`).join('');
  document.querySelector('#submission-assignment').innerHTML=assignments.map(a=>`<option>${a.title}</option>`).join('');
  document.querySelector('#submission-form').onsubmit=e=>{e.preventDefault();state.submissions.push({assignment:document.querySelector('#submission-assignment').value,text:document.querySelector('#submission-text').value});save();e.target.reset();e.target.querySelector('.form-message').textContent='Saved locally in demo mode.'};
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
