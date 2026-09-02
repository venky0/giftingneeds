/**
 * Authorisation tests for the portal Worker.
 *
 * Run from the repository root:  node portal/test/authorisation.test.mjs
 *
 * Drive and Cloudflare are stubbed, so this exercises the only logic the
 * Worker actually owns: who may see which folder, and whether a valid
 * customer can reach a file belonging to someone else.
 */
// Exercise the Worker's authorisation logic without Cloudflare or Google.
import { readFileSync } from 'fs';
const src = readFileSync('portal/src/index.js','utf8')
  .replace("import { listFolder, streamFile } from './drive.js';", '');
const stub = `
let LIST_CALLS = [];
async function listFolder(env, id){ LIST_CALLS.push(id);
  return id==='FOLDER_A' ? [{id:'fileA',name:'A.pdf'}] : [{id:'fileB',name:'B.pdf'}]; }
async function streamFile(env,id,name){ return new Response('bytes', {status:200}); }
${src}
export { LIST_CALLS };
`;
const mod = await import('data:text/javascript;base64,' + Buffer.from(stub).toString('base64'));
const w = mod.default;
const env = { CUSTOMER_FOLDERS: JSON.stringify({
  'priya@acme.com': { id:'FOLDER_A', label:'Acme' },
  'raj@bharat.com': { id:'FOLDER_B', label:'Bharat' }
}), ASSETS:{ fetch: async()=> new Response('static', {status:200}) } };

const req = (path, email) => new Request('https://giftingneeds.org'+path, {
  headers: email ? {'Cf-Access-Authenticated-User-Email': email} : {} });

let pass=0, fail=0;
const check = (name, cond) => { cond ? (pass++, console.log('  PASS', name)) : (fail++, console.log('  FAIL', name)); };

// 1. no Access header must never be treated as allowed
let r = await w.fetch(req('/api/files'), env);
check('no Access header -> 401', r.status === 401);

// 2. an approved caller sees only their own folder
r = await w.fetch(req('/api/files','priya@acme.com'), env);
let d = await r.json();
check('approved caller gets their group', d.groups?.length===1 && d.groups[0].label==='Acme');
check('and only their own file', d.groups[0].files[0].name==='A.pdf');

// 3. THE IMPORTANT ONE: a valid customer must not fetch another's file by id
r = await w.fetch(req('/api/file/fileB','priya@acme.com'), env);
check('cross-customer file id -> 404', r.status === 404);

// 4. their own file does download
r = await w.fetch(req('/api/file/fileA','priya@acme.com'), env);
check('own file downloads', r.status === 200);

// 5. an unmapped but Access-approved address sees nothing
r = await w.fetch(req('/api/files','stranger@nowhere.com'), env);
d = await r.json();
check('unmapped address -> no folders', d.groups?.length===0);

// 6. unknown paths fall through to the static portal
r = await w.fetch(req('/','priya@acme.com'), env);
check('static portal still served', (await r.text())==='static');

console.log(`\n  ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
