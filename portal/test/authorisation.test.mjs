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
  .replace(/^export /gm, '')
  .replace("await import('cloudflare:email')", '{ EmailMessage: FakeEmailMessage }');
const driveSrc = readFileSync('portal/src/drive.js', 'utf8');
const treeSrc = driveSrc.slice(
  driveSrc.indexOf("const FOLDER_MIME"),
  driveSrc.indexOf("/** Files directly inside one folder")
).replace(/^export /gm, '');

const indexSrc = readFileSync('portal/src/index.js', 'utf8')
  .replace("import { listFolderTree, streamFile } from './drive.js';", '')
  .replace(/import \{[^}]*\} from '\.\/approval\.js';/, '');

class FakeEmailMessage {
  constructor(from, to, raw) { this.from = from; this.to = to; this.raw = raw; }
}
const stub = `
class FakeEmailMessage {
  constructor(from, to, raw) { this.from = from; this.to = to; this.raw = raw; }
}
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
    '*': [{ id:'FOLDER_A', label:'Acme' }, { id:'FOLDER_CAT', label:'Catalogues' }]
  }),
  ASSETS: { fetch: async (request) => new Response(new URL(request.url).pathname, { status:200 }) },
  APPROVAL_SECRET: 'test-secret-not-the-real-one',
  NOTIFY_EMAIL: 'promo@giftingneeds.in',
  SEND_EMAIL: { send: async (m) => { mailsSent.push(m); } },
  CF_ACCOUNT_ID: 'acct', CF_POLICY_ID: 'pol', CF_API_TOKEN: 'tok',
};

/* ---- stub the outside world, and record what we tried to change ---- */
let policyInclude = [{ email: { email: 'existing@customer.com' } }];
let mailsSent = [], policyWrites = [];
globalThis.fetch = async (url, init = {}) => {
  const u = String(url);
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

const req = (path) => new Request('https://giftingneeds.org'+path);

let pass=0, fail=0;
const check = (name, cond) => { cond ? (pass++, console.log('  PASS', name)) : (fail++, console.log('  FAIL', name)); };

let r, d;

/* ====================== files: open to everyone ====================== */

r = await w.fetch(req('/api/files'), env);
d = await r.json();
check('no header needed — the libraries are open', r.status === 200 && d.groups.length > 0);

const labels = d.groups.map(g => g.label);
check('subfolders become their own groups',
  labels.includes('Drinkware') && labels.includes('Bags'));
check('loose files keep the library label', labels.includes('Catalogues'));
check('a folder is never listed as a downloadable file',
  !d.groups.some(g => g.files.some(f => /^(Drinkware|Bags)$/.test(f.name))));

// Exercise edge-cache reuse, expiry and configuration isolation.
const entries = new Map();
let clock = 0;
globalThis.caches = { default: {
  async match(key) {
    const entry = entries.get(key.url);
    return entry && entry.expires > clock ? entry.response.clone() : undefined;
  },
  async put(key, response) {
    const ttl = Number(response.headers.get('Cache-Control').match(/max-age=(\d+)/)[1]);
    entries.set(key.url, { response, expires: clock + ttl });
  },
} };
r = await w.fetch(req('/api/files'), env);
const expected = await r.text();
const callsAfterFill = mod.LIST_CALLS.length;
r = await w.fetch(req('/api/files'), env);
check('cached list avoids all Drive calls', mod.LIST_CALLS.length === callsAfterFill);
check('cached list preserves contents and ordering', await r.text() === expected);
check('list cache lasts five minutes', r.headers.get('Cache-Control') === 'public, max-age=300');
clock = 301;
await w.fetch(req('/api/files'), env);
check('expired list is fetched again', mod.LIST_CALLS.length > callsAfterFill);
r = await w.fetch(req('/api/files'), { ...env, CUSTOMER_FOLDERS: JSON.stringify({ '*': ['FOLDER_B'] }) });
d = await r.json();
check('changed libraries cannot reuse previous cached contents',
  d.groups.length === 1 && d.groups[0].files[0].id === 'fileB');
delete globalThis.caches;

r = await w.fetch(req('/api/file/cup'), env);
check('a file inside a subfolder downloads', r.status === 200);

r = await w.fetch(req('/api/file/fileA'), env);
check('a top-level file downloads', r.status === 200);

// Open does not mean "serves anything asked for": an id outside the
// configured libraries must still be refused, or the Worker becomes a
// proxy for the whole of the service account's Drive.
r = await w.fetch(req('/api/file/not-in-any-folder'), env);
check('an id outside the libraries is still refused', r.status === 404);

r = await w.fetch(req('/api/me'), env);
d = await r.json();
check('/api/me reports open', d.open === true && d.folderCount > 0);

/* ============================== routing ============================== */

r = await w.fetch(req('/'), env);
check('root serves the hub', (await r.text()) === '/home.html');

for (const [near, target] of [
  ['/customer_login', '/catalogues'], ['/login', '/catalogues'],
  ['/customer-login', '/catalogues'],
  ['/store', '/storefront'], ['/shop', '/storefront'], ['/poster', '/posters'],
]) {
  r = await w.fetch(req(near), env);
  check(`${near} redirects to ${target}`,
    r.status === 302 && r.headers.get('location') === 'https://giftingneeds.org' + target);
}

for (const p of ['/catalogues', '/storefront', '/posters']) {
  r = await w.fetch(req(p), env);
  check(`${p} is served`, (await r.text()) === (p === '/posters' ? '/posters.html' : `${p}/`));
}

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
check('mail carries an approve link', /\/api\/approve\?t=/.test(mailsSent[0].raw));
check('mail is addressed to the client', mailsSent[0].to === 'promo@giftingneeds.in');
check('subject header is ASCII only', /^[\x20-\x7E\r\n:<>@. -]*$/.test(
  (mailsSent[0].raw.match(/^Subject: .*$/m) || [''])[0]));
check('request alone grants nothing', policyWrites.length===0);

const link = mailsSent[0].raw.match(/https:\/\/\S*\/api\/approve\?t=(\S+)/)[1];

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
