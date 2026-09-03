/**
 * Authorisation tests for the portal Worker.
 *
 * Run from the repository root:  node portal/test/authorisation.test.mjs
 *
 * Drive, Cloudflare and the mail service are stubbed, so this exercises
 * the logic the Worker actually owns: who may see which folder, whether
 * a valid customer can reach someone else's file, and whether an
 * approval link can be made to admit an address it was not issued for.
 *
 * approval.js is loaded for real — the signing is the point of the test,
 * so stubbing it would test nothing.
 */
import { readFileSync } from 'fs';

const approvalSrc = readFileSync('portal/src/approval.js', 'utf8')
  .replace(/^export /gm, '');
const driveSrc = readFileSync('portal/src/drive.js', 'utf8');
const treeSrc = driveSrc.slice(
  driveSrc.indexOf("const FOLDER_MIME"),
  driveSrc.indexOf("/** Files directly inside one folder")
).replace(/^export /gm, '');

const indexSrc = readFileSync('portal/src/index.js', 'utf8')
  .replace("import { listFolderTree, streamFile } from './drive.js';", '')
  .replace(/import \{[^}]*\} from '\.\/approval\.js';/, '');

const stub = `
const FOLDERS = {
  FOLDER_A:   [{id:'fileA', name:'A.pdf'}],
  FOLDER_B:   [{id:'fileB', name:'B.pdf'}],
  // A library split into categories, like the client's "category wise".
  FOLDER_CAT: [{id:'SUB1', name:'Drinkware', mimeType:'application/vnd.google-apps.folder'},
               {id:'SUB2', name:'Bags',      mimeType:'application/vnd.google-apps.folder'},
               {id:'loose', name:'Index.pdf'}],
  SUB1:       [{id:'cup', name:'Mugs.pdf'}],
  SUB2:       [{id:'bag', name:'Totes.pdf'}],
};
let LIST_CALLS = [];
async function listFolder(env, id){ LIST_CALLS.push(id); return FOLDERS[id] || []; }
async function streamFile(env,id,name){ return new Response('bytes', {status:200}); }
${treeSrc}
${approvalSrc}
${indexSrc}
export { LIST_CALLS, signRequest, verifyToken };
`;
const mod = await import('data:text/javascript;base64,' + Buffer.from(stub).toString('base64'));
const w = mod.default;

const env = {
  CUSTOMER_FOLDERS: JSON.stringify({
    'priya@acme.com': [{ id:'FOLDER_A', label:'Acme' }, { id:'FOLDER_CAT', label:'Catalogues' }],
    'raj@bharat.com': { id:'FOLDER_B', label:'Bharat' }
  }),
  ASSETS: { fetch: async () => new Response('static', { status:200 }) },
  APPROVAL_SECRET: 'test-secret-not-the-real-one',
  WEB3FORMS_KEY: 'test-key',
  CF_ACCOUNT_ID: 'acct', CF_POLICY_ID: 'pol', CF_API_TOKEN: 'tok',
};

/* ---- stub the outside world, and record what we tried to change ---- */
let policyInclude = [{ email: { email: 'existing@customer.com' } }];
let mailsSent = [], policyWrites = [];
globalThis.fetch = async (url, init = {}) => {
  const u = String(url);
  if (u.startsWith('https://api.web3forms.com')) {
    mailsSent.push(JSON.parse(init.body));
    return new Response(JSON.stringify({ success:true }), { status:200 });
  }
  if (u.includes('/access/policies/')) {
    if ((init.method || 'GET') === 'GET') {
      return new Response(JSON.stringify({ success:true,
        result:{ name:'Approved customers', decision:'allow', include:policyInclude } }), { status:200 });
    }
    const body = JSON.parse(init.body);
    policyWrites.push(body);
    policyInclude = body.include;
    return new Response(JSON.stringify({ success:true }), { status:200 });
  }
  throw new Error('unexpected fetch: ' + u);
};

const req = (path, email) => new Request('https://giftingneeds.org'+path, {
  headers: email ? {'Cf-Access-Authenticated-User-Email': email} : {} });

let pass=0, fail=0;
const check = (name, cond) => { cond ? (pass++, console.log('  PASS', name)) : (fail++, console.log('  FAIL', name)); };

/* =============================== files =============================== */

let r = await w.fetch(req('/api/files'), env);
check('no Access header -> 401', r.status === 401);

r = await w.fetch(req('/api/files','priya@acme.com'), env);
let d = await r.json();
const acme = (d.groups || []).find(g => g.label === 'Acme');
check('approved caller gets their group', !!acme && acme.files[0].name === 'A.pdf');
check('and nothing belonging to anyone else',
  !d.groups.some(g => g.files.some(f => f.name === 'B.pdf')));

r = await w.fetch(req('/api/file/fileB','priya@acme.com'), env);
check('cross-customer file id -> 404', r.status === 404);

r = await w.fetch(req('/api/file/fileA','priya@acme.com'), env);
check('own file downloads', r.status === 200);

r = await w.fetch(req('/api/files','stranger@nowhere.com'), env);
d = await r.json();
check('unmapped address -> no folders', d.groups?.length===0);

/* ========================= folders inside folders ==================== */

r = await w.fetch(req('/api/files','priya@acme.com'), env);
d = await r.json();
const labels = d.groups.map(g => g.label);
check('subfolders become their own groups',
  labels.includes('Drinkware') && labels.includes('Bags'));
check('loose files in the parent keep the library label',
  labels.includes('Catalogues'));
check('a folder is never listed as a downloadable file',
  !d.groups.some(g => g.files.some(f => /Drinkware|Bags$/.test(f.name))));

r = await w.fetch(req('/api/file/cup','priya@acme.com'), env);
check('a file inside a subfolder downloads', r.status === 200);

r = await w.fetch(req('/api/file/bag','priya@acme.com'), env);
check('and so does one in a sibling subfolder', r.status === 200);

// THE IMPORTANT ONE: deep listing must not widen who can reach what.
r = await w.fetch(req('/api/file/cup','raj@bharat.com'), env);
check('another customer still cannot reach a subfolder file', r.status === 404);

/* ============================== routing ============================== */

r = await w.fetch(req('/','priya@acme.com'), env);
check('root redirects to /customer-login',
  r.status===302 && r.headers.get('location')==='https://giftingneeds.org/customer-login');

r = await w.fetch(req('/customer-login','priya@acme.com'), env);
check('/customer-login serves the portal', (await r.text())==='static');

// Typed by hand off an email; the near misses must not dead-end.
for (const near of ['/customer_login','/customerlogin','/login','/portal','/customer']) {
  r = await w.fetch(req(near,'priya@acme.com'), env);
  check('near miss ' + near + ' redirects',
    r.status===302 && r.headers.get('location')==='https://giftingneeds.org/customer-login');
}
// Differently-cased is the real path, so serve it rather than bounce.
r = await w.fetch(req('/Customer-Login','priya@acme.com'), env);
check('/Customer-Login is served, not redirected', (await r.text())==='static');

/* ========================== access requests ========================== */

const post = (path, body, origin='https://giftingneeds.in') =>
  new Request('https://giftingneeds.org'+path, { method:'POST',
    headers:{ 'Content-Type':'application/json', Origin: origin },
    body: JSON.stringify(body) });

r = await w.fetch(post('/api/request-access', { name:'', email:'x@y.com' }), env);
check('request without a name -> 400', r.status===400);

r = await w.fetch(post('/api/request-access', { name:'Asha', email:'not-an-email' }), env);
check('request with a bad email -> 400', r.status===400);

mailsSent = [];
r = await w.fetch(post('/api/request-access',
  { name:'Asha Rao', company:'Acme', email:'Asha@Acme.com', phone:'900' }), env);
check('valid request accepted', r.status===200);
check('exactly one mail sent', mailsSent.length===1);
check('mail carries an approve link', /\/api\/approve\?t=/.test(mailsSent[0].message));
check('request alone grants nothing', policyWrites.length===0);

const link = mailsSent[0].message.match(/https:\/\/\S*\/api\/approve\?t=(\S+)/)[1];

/* ============================== approval ============================= */

r = await w.fetch(new Request(`https://giftingneeds.org/api/approve?t=${link}`), env);
check('GET approve shows a confirmation page', r.status===200);
check('GET approve does NOT grant access', policyWrites.length===0);

const approve = t => new Request('https://giftingneeds.org/api/approve',
  { method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded'},
    body:'t='+encodeURIComponent(t) });

r = await w.fetch(approve(link + 'x'), env);
check('tampered token rejected', r.status===400 && policyWrites.length===0);

// Re-sign a different address with the WRONG secret: must not be accepted.
const forged = await mod.signRequest({ APPROVAL_SECRET:'attacker-guess' },
  { email:'intruder@evil.com', name:'X', company:'', phone:'' });
r = await w.fetch(approve(forged), env);
check('token signed with another secret rejected', r.status===400);
check('and the intruder was not added',
  !policyInclude.some(e => e.email.email==='intruder@evil.com'));

const expired = await mod.signRequest(env, { email:'late@acme.com', name:'L', company:'', phone:'' });
// fast-forward past the 7-day window
const realNow = Date.now; Date.now = () => realNow() + 8*24*60*60*1000;
r = await w.fetch(approve(expired), env);
check('expired token rejected', r.status===410);
Date.now = realNow;

r = await w.fetch(approve(link), env);
check('POST approve grants access', r.status===200 && policyWrites.length===1);
check('address added lower-cased', policyInclude.some(e => e.email.email==='asha@acme.com'));
check('existing customers preserved',
  policyInclude.some(e => e.email.email==='existing@customer.com'));

const before = policyWrites.length;
r = await w.fetch(approve(link), env);
check('approving twice is harmless', r.status===200 && policyWrites.length===before);

console.log(`\n  ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
