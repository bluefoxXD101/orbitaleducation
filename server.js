// Simple Express backend for OrbitalEducation demo.
// - Stores data in data.json in the same directory
// - WARNING: For demo only. Not for production.
const express = require('express');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const cors = require('cors');

const DATA_FILE = path.join(__dirname, 'data.json');
const PORT = process.env.PORT || 8787;

const app = express();
app.use(cors());
app.use(bodyParser.json());

function load(){
  if(!fs.existsSync(DATA_FILE)){
    const template = { orgs: {}, users: {}, sessions: {}, updates: [] };
    fs.writeFileSync(DATA_FILE, JSON.stringify(template, null, 2));
    return template;
  }
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch(e){
    const template = { orgs: {}, users: {}, sessions: {}, updates: [] };
    fs.writeFileSync(DATA_FILE, JSON.stringify(template, null, 2));
    return template;
  }
}
function save(data){
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

let state = load();

// Ping
app.get('/api/ping', (req, res) => res.json({ ok: true }));

// Dump state (GET)
app.get('/api/state', (req, res) => {
  state = load();
  res.json(state);
});

// District signup
app.post('/api/signup/district', (req, res) => {
  const { name, email, password, type, orgName, plan } = req.body;
  if(!name || !email || !password || !orgName) return res.status(400).json({ error: 'Missing fields' });
  if(state.users[email]) return res.status(400).json({ error: 'User exists' });
  // create org id + code
  const id = 'org_' + Math.random().toString(36).slice(2,9);
  const code = Math.random().toString(36).slice(2,8).toUpperCase();
  state.orgs[id] = { id, name: orgName, ownerName: name, ownerEmail: email, plan: plan || 'Basics', code, domains: [], admins: [email], staff: [], accounts: [], tickets: [], settings: { type } };
  state.users[email] = { email, password, role: 'district', orgId: id, name };
  save(state);
  res.json({ ok:true, org: state.orgs[id] });
});

// Parent signup
app.post('/api/signup/parent', (req, res) => {
  const { email, password, child, districtCode } = req.body;
  if(!email || !password || !child || !districtCode) return res.status(400).json({ error: 'Missing fields' });
  if(state.users[email]) return res.status(400).json({ error: 'User exists' });
  const orgId = Object.keys(state.orgs).find(k => state.orgs[k].code === districtCode);
  if(!orgId) return res.status(400).json({ error: 'District code not found' });
  state.users[email] = { email, password, role: 'parent', orgId, childEmail: child, name: 'Parent' };
  save(state);
  res.json({ ok:true, user: state.users[email] });
});

// Login
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  if(!email || !password) return res.status(400).json({ error: 'Missing fields' });
  const u = state.users[email];
  if(!u || u.password !== password) return res.status(400).json({ error: 'Invalid credentials' });
  res.json({ ok:true, user: u });
});

// Add account to org
app.post('/api/org/:orgId/addAccount', (req, res) => {
  const { orgId } = req.params;
  const { email, role, password, name } = req.body;
  if(!email || !role) return res.status(400).json({ error: 'Missing fields' });
  const org = state.orgs[orgId];
  if(!org) return res.status(404).json({ error: 'Org not found' });
  if(state.users[email]) return res.status(400).json({ error: 'User exists' });
  if(org.plan === 'Basics' && org.accounts.length >= 10000) return res.status(400).json({ error: 'Basics account limit reached' });
  state.users[email] = { email, password: password || 'changeme', role, orgId, name: name || '' };
  org.accounts.push(email);
  if(role === 'admin' && !org.admins.includes(email)) org.admins.push(email);
  if(role === 'staff' && !org.staff.includes(email)) org.staff.push(email);
  save(state);
  res.json({ ok:true, user: state.users[email] });
});

// File a ticket
app.post('/api/org/:orgId/tickets', (req, res) => {
  const { orgId } = req.params;
  const { requester, title, description } = req.body;
  if(!requester || !title || !description) return res.status(400).json({ error: 'Missing fields' });
  const org = state.orgs[orgId];
  if(!org) return res.status(404).json({ error: 'Org not found' });
  const t = { id: 't_' + Math.random().toString(36).slice(2,9), requester, title, description, status:'open', createdAt: new Date().toISOString() };
  org.tickets = org.tickets || []; org.tickets.push(t);
  save(state);
  res.json({ ok:true, ticket: t });
});

app.listen(PORT, () => {
  console.log(`OrbitalEducation demo API listening on http://localhost:${PORT}`);
});
