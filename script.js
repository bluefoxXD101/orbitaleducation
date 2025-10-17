// OrbitalEducation front-end logic
// - uses API if /api/ is reachable otherwise falls back to localStorage demo
// - provides signup/login flows, district creation, parent links, add account, help desk
(() => {
  const API_BASE = '/api'; // backend endpoints (optional)
  const USE_API_TIMEOUT = 1000; // ms
  let apiAvailable = false;

  // Attempt to detect API presence (HEAD /api/ping)
  function detectAPI(){
    return new Promise(resolve => {
      const ok = () => { apiAvailable = true; resolve(true); };
      const fail = () => { apiAvailable = false; resolve(false); };
      // try fetch to /api/ping (server should respond {ok:true})
      const timer = setTimeout(() => fail(), USE_API_TIMEOUT);
      fetch(API_BASE + '/ping', { method: 'GET' }).then(r=>r.json()).then(j=>{
        clearTimeout(timer);
        if(j && j.ok) ok(); else fail();
      }).catch(()=>{ clearTimeout(timer); fail(); });
    });
  }

  // LocalStorage fallback "backend"
  const STORAGE_KEY = 'orbital_demo_v2';
  const stateTemplate = {
    orgs: {}, users: {}, sessions: {}, updates: []
  };

  function loadState(){
    const raw = localStorage.getItem(STORAGE_KEY);
    if(!raw){ localStorage.setItem(STORAGE_KEY, JSON.stringify(stateTemplate)); return JSON.parse(JSON.stringify(stateTemplate)); }
    try { return JSON.parse(raw); } catch(e){ localStorage.setItem(STORAGE_KEY, JSON.stringify(stateTemplate)); return JSON.parse(JSON.stringify(stateTemplate)); }
  }
  function saveState(s){ localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); }

  let state = loadState();

  // Utilities
  function uid(prefix='id'){ return prefix + '_' + Math.random().toString(36).slice(2,9); }
  function generateDistrictCode(){ return Math.random().toString(36).slice(2,8).toUpperCase(); }
  function currentUser(){ return localStorage.getItem('orbital_user') || null; }
  function setCurrentUser(email){ if(email) localStorage.setItem('orbital_user', email); else localStorage.removeItem('orbital_user'); renderDashboard(); }

  // API wrappers: try server, fallback to local
  async function apiFetch(path, opts){
    if(apiAvailable){
      try {
        const res = await fetch(API_BASE + path, Object.assign({headers:{'Content-Type':'application/json'}}, opts));
        if(res.status >= 400) {
          const txt = await res.text();
          throw new Error(txt || ('API error ' + res.status));
        }
        return await res.json();
      } catch (err){
        console.warn('API call failed, falling back to local:', err.message || err);
        apiAvailable = false;
      }
    }
    // local fallback
    return localFallback(path, opts);
  }

  function localFallback(path, opts){
    // simple mapping of key endpoints used by frontend
    const method = (opts && opts.method) ? opts.method.toUpperCase() : 'GET';
    const body = (opts && opts.body) ? JSON.parse(opts.body) : null;

    if(path === '/ping') return { ok: true };
    if(path === '/state' && method === 'GET') return state;

    if(path === '/signup/district' && method === 'POST'){
      const { name, email, password, type, orgName, plan } = body;
      if(state.users[email]) return { error: 'User exists' };
      const orgId = uid('org');
      const code = generateDistrictCode();
      state.orgs[orgId] = { id:orgId, name:orgName, ownerName:name, ownerEmail:email, plan, code, domains:[], admins:[email], staff:[], accounts:[], tickets:[], settings:{type} };
      state.users[email] = { email, password, role:'district', orgId, name };
      saveState(state);
      return { ok:true, org: state.orgs[orgId] };
    }

    if(path === '/signup/parent' && method === 'POST'){
      const { email, password, child, districtCode } = body;
      if(state.users[email]) return { error: 'User exists' };
      const orgId = Object.keys(state.orgs).find(id => state.orgs[id].code === districtCode);
      if(!orgId) return { error: 'District code not found' };
      state.users[email] = { email, password, role:'parent', orgId, childEmail: child, name: 'Parent' };
      saveState(state);
      return { ok:true, user: state.users[email] };
    }

    if(path === '/login' && method === 'POST'){
      const { email, password } = body;
      const u = state.users[email];
      if(!u || u.password !== password) return { error: 'Invalid credentials' };
      return { ok:true, user:u };
    }

    if(path.startsWith('/org/') && path.endsWith('/addAccount') && method === 'POST'){
      const orgId = path.split('/')[2];
      const { email, role, password, name } = body;
      const org = state.orgs[orgId];
      if(!org) return { error: 'Org not found' };
      if(state.users[email]) return { error: 'User exists' };
      if(org.plan === 'Basics' && org.accounts.length >= 10000) return { error: 'Basics account limit reached' };
      state.users[email] = { email, password, role, orgId, name };
      org.accounts.push(email);
      if(role === 'admin' && !org.admins.includes(email)) org.admins.push(email);
      if(role === 'staff' && !org.staff.includes(email)) org.staff.push(email);
      saveState(state);
      return { ok:true, user: state.users[email] };
    }

    if(path.startsWith('/org/') && path.endsWith('/tickets') && method === 'POST'){
      const orgId = path.split('/')[2];
      const { requester, title, description } = body;
      const org = state.orgs[orgId];
      if(!org) return { error: 'Org not found' };
      const t = { id: uid('t'), requester, title, description, status:'open', createdAt: new Date().toISOString() };
      org.tickets.push(t);
      saveState(state);
      return { ok:true, ticket: t };
    }

    // default, return state snapshot
    return state;
  }

  // UI / Modal handling
  const modalBackdrop = document.getElementById('modalBackdrop');
  const modalContent = document.getElementById('modalContent');

  function modalBackdropClick(e){ closeModal(); }
  function openModal(html){ modalContent.innerHTML = html; modalBackdrop.classList.remove('hidden'); }
  function closeModal(){ modalBackdrop.classList.add('hidden'); }

  // Auth flows
  function showAuthLanding(){
    openModal(`
      <h2>Login or Sign up?</h2>
      <div class="muted">Choose an option below to continue.</div>
      <div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap">
        <button onclick="OE.showLogin()">Login</button>
        <button onclick="OE.showSignupChoice()">Signup</button>
        <button onclick="OE.showOrbitalStaff()">OrbitalStaff</button>
        <button style="margin-left:auto" onclick="OE.closeModal()">Close</button>
      </div>
    `);
  }

  function showLogin(){
    openModal(`
      <h2>Login</h2>
      <label>Email</label><input id="loginEmail" />
      <label>Password</label><input id="loginPass" type="password" />
      <div style="margin-top:12px;display:flex;gap:8px">
        <button onclick="OE.doLogin()">Login</button>
        <button onclick="OE.showAuthLanding()">Back</button>
      </div>
    `);
  }

  async function doLogin(){
    const email = document.getElementById('loginEmail').value.trim().toLowerCase();
    const pass = document.getElementById('loginPass').value;
    if(!email || !pass){ alert('Enter credentials'); return; }
    const res = await apiFetch('/login', {method:'POST', body: JSON.stringify({ email, password: pass })});
    if(res.error){ alert(res.error); return; }
    setCurrentUser(email);
    closeModal();
    alert('Logged in');
  }

  function showSignupChoice(){ openModal(`
    <h2>Sign up</h2>
    <div class="muted">Who are you?</div>
    <div style="margin-top:12px;display:flex;gap:8px">
      <button onclick="OE.showSignupParent()">Parent</button>
      <button onclick="OE.showSignupDistrict()">District / School</button>
      <button onclick="OE.showAuthLanding()">Back</button>
    </div>
  `); }

  function showSignupParent(){ openModal(`
    <h2>Sign up — Parent</h2>
    <label>Email</label><input id="pEmail" />
    <label>Password</label><input id="pPass" type="password" />
    <label>Child's Email / PIN</label><input id="pChild" />
    <label>District Code</label><input id="pDistrictCode" />
    <div style="margin-top:12px;display:flex;gap:8px">
      <button onclick="OE.doParentSignup()">Create Parent Account</button>
      <button onclick="OE.showSignupChoice()">Back</button>
    </div>
  `); }

  async function doParentSignup(){
    const email = document.getElementById('pEmail').value.trim().toLowerCase();
    const pass = document.getElementById('pPass').value;
    const child = document.getElementById('pChild').value.trim().toLowerCase();
    const dcode = document.getElementById('pDistrictCode').value.trim().toUpperCase();
    if(!email || !pass || !child || !dcode){ alert('Complete all fields'); return; }
    const res = await apiFetch('/signup/parent', { method:'POST', body: JSON.stringify({ email, password: pass, child, districtCode: dcode })});
    if(res.error){ alert(res.error); return; }
    setCurrentUser(email);
    closeModal();
    alert('Parent account created');
  }

  function showSignupDistrict(){ openModal(`
    <h2>Sign up — District / School</h2>
    <label>Your Name</label><input id="dName" />
    <label>Your Work Email</label><input id="dEmail" />
    <label>Password</label><input id="dPass" type="password" />
    <label>What are you?</label>
    <select id="dType" onchange="document.getElementById('dOrgNameWrap').style.display='block'">
      <option>District</option><option>School</option>
    </select>
    <div id="dOrgNameWrap">
      <label>District / School Name</label><input id="dOrgName" />
    </div>
    <div style="margin-top:8px"><label><input type="checkbox" id="dTos" /> I agree to the <a href="https://tos.orbitaleducation.qzz.io" target="_blank">TOS</a></label></div>
    <label style="margin-top:8px">Choose a Plan</label>
    <div style="display:flex;gap:8px">
      <label><input type="radio" name="dPlan" value="Basics" checked /> Basics</label>
      <label><input type="radio" name="dPlan" value="Pro" /> Pro</label>
    </div>
    <div style="margin-top:10px;display:flex;gap:8px">
      <button onclick="OE.doDistrictSignup()">Create District / School</button>
      <button onclick="OE.showSignupChoice()">Back</button>
    </div>
  `); }

  async function doDistrictSignup(){
    const name = document.getElementById('dName').value.trim();
    const email = document.getElementById('dEmail').value.trim().toLowerCase();
    const pass = document.getElementById('dPass').value;
    const type = document.getElementById('dType').value;
    const orgName = document.getElementById('dOrgName').value.trim();
    const tos = document.getElementById('dTos').checked;
    const plan = document.querySelector('input[name="dPlan"]:checked').value;
    if(!name || !email || !pass || !orgName){ alert('Complete required fields'); return; }
    if(!tos){ alert('Accept TOS'); return; }
    const res = await apiFetch('/signup/district', { method:'POST', body: JSON.stringify({ name, email, password: pass, type, orgName, plan })});
    if(res.error){ alert(res.error); return; }
    setCurrentUser(email);
    closeModal();
    alert(`Created ${type} "${orgName}". District Code: ${res.org.code}`);
  }

  // Admin: add account
  async function showAddAccount(){
    const cur = currentUser();
    if(!cur){ alert('Login as district/admin to add accounts'); return; }
    const u = await ensureUser(cur);
    const org = state.orgs[u.orgId];
    openModal(`
      <h2>Add Account to ${org.name}</h2>
      <label>Account Email</label><input id="aEmail" />
      <label>Role</label><select id="aRole"><option value="student">Student</option><option value="staff">Staff</option><option value="admin">Admin</option></select>
      <label>Password</label><input id="aPass" />
      <label>Display Name</label><input id="aName" />
      <div style="margin-top:10px;display:flex;gap:8px">
        <button onclick="OE.doAddAccount()">Create</button>
        <button onclick="OE.closeModal()">Cancel</button>
      </div>
    `);
  }

  async function doAddAccount(){
    const cur = currentUser();
    if(!cur) return alert('Not logged in');
    const u = await ensureUser(cur);
    const org = state.orgs[u.orgId];
    const email = document.getElementById('aEmail').value.trim().toLowerCase();
    const role = document.getElementById('aRole').value;
    const pass = document.getElementById('aPass').value || 'changeme';
    const name = document.getElementById('aName').value.trim();
    if(!email){ alert('Enter account email'); return; }
    const res = await apiFetch(`/org/${org.id}/addAccount`, { method:'POST', body: JSON.stringify({ email, role, password: pass, name })});
    if(res.error){ alert(res.error); return; }
    closeModal();
    alert('Account created: ' + email);
    await refreshState();
  }

  // Help desk
  async function openHelpdesk(){
    const cur = currentUser();
    if(!cur){ alert('Please login to use Help Desk'); return; }
    const u = await ensureUser(cur);
    const org = state.orgs[u.orgId];
    const ticketsHtml = (org.tickets || []).map(t => `
      <div style="padding:8px;border-radius:8px;border:1px solid rgba(255,255,255,0.03);margin-bottom:8px">
        <div style="display:flex;align-items:center">
          <strong>${t.title}</strong><span style="margin-left:auto" class="tiny muted">${t.status}</span>
        </div>
        <div class="muted" style="margin-top:6px">${t.description}</div>
        <div class="tiny muted">Filed by ${t.requester} • ${new Date(t.createdAt).toLocaleString()}</div>
        ${(u.role === 'admin' || u.role === 'district') ? `<div style="margin-top:6px"><button onclick="OE.updateTicket('${t.id}','complete')">Complete</button> <button onclick="OE.updateTicket('${t.id}','denied')">Deny</button></div>` : ''}
      </div>
    `).join('') || '<div class="muted">No tickets yet.</div>';

    openModal(`
      <h2>Help Desk — ${org.name}</h2>
      <div style="max-height:260px;overflow:auto">${ticketsHtml}</div>
      <hr />
      <h3>File a Ticket</h3>
      <label>Title</label><input id="tTitle" />
      <label>Description</label><textarea id="tDesc" rows="4"></textarea>
      <div style="margin-top:8px;display:flex;gap:8px">
        <button onclick="OE.fileTicket()">Submit Ticket</button>
        <button onclick="OE.closeModal()">Close</button>
      </div>
    `);
  }

  async function fileTicket(){
    const cur = currentUser();
    const u = await ensureUser(cur);
    const org = state.orgs[u.orgId];
    const title = document.getElementById('tTitle').value.trim();
    const desc = document.getElementById('tDesc').value.trim();
    if(!title || !desc) return alert('Provide title and description');
    const res = await apiFetch(`/org/${org.id}/tickets`, { method:'POST', body: JSON.stringify({ requester: cur, title, description: desc })});
    if(res.error){ alert(res.error); return; }
    alert('Ticket filed');
    openHelpdesk();
  }

  async function updateTicket(id, action){
    // local-only update for demo (server endpoint not implemented in sample backend)
    const cur = currentUser();
    const u = await ensureUser(cur);
    const org = state.orgs[u.orgId];
    const t = org.tickets.find(x => x.id === id);
    if(!t) return alert('Ticket not found');
    if(action === 'complete') t.status = 'complete';
    if(action === 'denied') t.status = 'denied';
    saveState(state);
    alert('Ticket updated');
    openHelpdesk();
  }

  // helpers to keep local state in sync with API if available
  async function refreshState(){
    const res = await apiFetch('/state', { method:'GET' });
    if(res && !res.error){ state = res; saveState(state); }
    renderDashboard();
  }
  async function ensureUser(email){
    // refresh local state from server if available
    if(apiAvailable){
      await refreshState();
    } else {
      state = loadState();
    }
    return state.users[email];
  }

  // Render dashboard
  function renderDashboard(){
    const cur = currentUser();
    const orgNameEl = document.getElementById('orgName');
    const orgPlanEl = document.getElementById('orgPlan');
    const accountCountEl = document.getElementById('accountCount');
    const adminCountEl = document.getElementById('adminCount');
    const domainsEl = document.getElementById('domains');
    const domainLimitEl = document.getElementById('domainLimit');
    const announceLimitEl = document.getElementById('announceLimit');
    const hubTitleEl = document.getElementById('hubTitle');
    const addAccountBtn = document.getElementById('addAccountBtn');
    const helpdeskBtn = document.getElementById('helpdeskBtn');

    if(!cur){
      orgNameEl.textContent = 'Not logged in';
      orgPlanEl.textContent = '—';
      accountCountEl.textContent = '—';
      adminCountEl.textContent = '—';
      domainsEl.textContent = '—';
      domainLimitEl.textContent = '—';
      announceLimitEl.textContent = '—';
      hubTitleEl.textContent = 'OrbitalEducation Hub';
      addAccountBtn.style.display = 'none';
      helpdeskBtn.style.display = 'none';
      document.getElementById('exampleAccounts').textContent = 'No accounts visible — log in to see.';
      return;
    }

    const u = state.users[cur];
    if(!u){ setCurrentUser(null); return; }
    const org = state.orgs[u.orgId];
    if(!org){ orgNameEl.textContent = 'No organization'; return; }

    orgNameEl.textContent = `${org.name} (${org.settings?.type || ''})`;
    orgPlanEl.textContent = org.plan;
    accountCountEl.textContent = org.accounts.length || 0;
    adminCountEl.textContent = org.admins.length || 0;
    domainsEl.textContent = (org.domains.length === 0 ? 'None' : org.domains.join(', '));
    domainLimitEl.textContent = org.plan === 'Basics' ? '2' : 'Unlimited';
    announceLimitEl.textContent = org.plan === 'Basics' ? '5,000 chars — 1/day' : 'Unlimited';
    hubTitleEl.textContent = `${org.name} Hub`;

    if(u.role === 'district' || u.role === 'admin') addAccountBtn.style.display = 'inline-block'; else addAccountBtn.style.display = 'none';
    helpdeskBtn.style.display = 'inline-block';

    const accountsList = org.accounts.slice(0,50).map(a => `${a} (${state.users[a]?.role || '—'})`).join('\n') || 'No accounts yet.';
    document.getElementById('exampleAccounts').textContent = accountsList;
  }

  function demoReset(){
    if(!confirm('Reset demo storage? This clears locally stored demo data.')) return;
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem('orbital_user');
    state = loadState();
    renderDashboard();
    alert('Demo reset');
  }

  function goHome(){ window.scrollTo({top:0, behavior:'smooth'}); alert('Static demo ready. Use Dashboard to sign up or login.'); }

  // Initial sample data (only if empty)
  function ensureSample(){
    if(Object.keys(state.orgs).length > 0) return;
    const orgId1 = uid('org');
    state.orgs[orgId1] = {
      id:orgId1,name:'Springfield Unified', ownerName:'Admin One', ownerEmail:'admin@spring.test', plan:'Basics',
      code: 'SPF123', domains:['spring.edu'], admins:['admin@spring.test'], staff:['t1@spring.test'],
      accounts:['s1@spring.test','s2@spring.test'], tickets:[], settings:{type:'District'}
    };
    state.users['admin@spring.test'] = { email:'admin@spring.test', password:'password', role:'district', orgId:orgId1, name:'Admin One' };
    state.users['t1@spring.test'] = { email:'t1@spring.test', password:'password', role:'staff', orgId:orgId1, name:'Teacher One' };
    state.users['s1@spring.test'] = { email:'s1@spring.test', password:'s1pass', role:'student', orgId:orgId1, name:'Student One' };
    state.users['s2@spring.test'] = { email:'s2@spring.test', password:'s2pass', role:'student', orgId:orgId1, name:'Student Two' };

    const orgId2 = uid('org');
    state.orgs[orgId2] = {
      id:orgId2,name:'Orion Academy', ownerName:'Principal', ownerEmail:'owner@orion.test', plan:'Pro',
      code: 'ORION', domains:['orion.edu','labs.orion.edu'], admins:['owner@orion.test'], staff:['t2@orion.test'],
      accounts:['s3@orion.test'], tickets:[], settings:{type:'School'}
    };
    state.users['owner@orion.test'] = { email:'owner@orion.test', password:'ownerpass', role:'district', orgId:orgId2, name:'Principal' };
    state.users['t2@orion.test'] = { email:'t2@orion.test', password:'teachpass', role:'staff', orgId:orgId2, name:'Teacher Two' };
    state.users['s3@orion.test'] = { email:'s3@orion.test', password:'s3pass', role:'student', orgId:orgId2, name:'Student Three' };

    saveState(state);
  }

  // expose functions globally for onclick strings in modal content
  window.OE = {
    showAuthLanding, showLogin, showSignupChoice, showSignupParent, showSignupDistrict, showOrbitalStaff: showLogin,
    doLogin, doParentSignup, doDistrictSignup, closeModal, showAddAccount: showAddAccount, doAddAccount,
    openHelpdesk, fileTicket, updateTicket, showPlans: () => {
      openModal(`<h2>Plans</h2><div style="display:flex;gap:12px"><div class="plan-card"><h3>Basics</h3><p class="muted">Free — essential features</p></div><div class="plan-card"><h3>Pro</h3><p class="muted">Licensed — organization features</p></div></div><div style="margin-top:8px"><button onclick="OE.closeModal()">Close</button></div>`);
    },
    modalContent, doAddAccount: doAddAccount, doLogin: doLogin, doParentSignup: doParentSignup, doDistrictSignup: doDistrictSignup,
    fileTicket, updateTicket, closeModal
  };

  // hook up UI buttons
  document.getElementById('dashboardBtn').addEventListener('click', async () => { await detectAPI(); showAuthLanding(); });
  document.getElementById('openDashboardBtn').addEventListener('click', async () => { await detectAPI(); showAuthLanding(); });
  document.getElementById('plansBtn').addEventListener('click', () => OE.showPlans());
  document.getElementById('openPortalBtn').addEventListener('click', () => goHome());
  document.getElementById('resetDemoBtn').addEventListener('click', demoReset);
  document.getElementById('addAccountBtn').addEventListener('click', showAddAccount);
  document.getElementById('helpdeskBtn').addEventListener('click', openHelpdesk);

  // close modal when clicking backdrop (delegated)
  modalBackdrop.addEventListener('click', modalBackdropClick);

  // initialize
  detectAPI().then(() => {
    ensureSample();
    refreshState();
  });
})();
