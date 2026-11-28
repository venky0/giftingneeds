// Run from the repo root: node portal/test/estimate.test.mjs
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

class FakeEmailMessage { constructor(from, to, raw) { Object.assign(this, { from, to, raw }); } }
globalThis.FakeEmailMessage = FakeEmailMessage;
const src = readFileSync('portal/src/estimate.js', 'utf8')
  .replace("await import('cloudflare:email')", '{ EmailMessage: FakeEmailMessage }');
const dir = mkdtempSync(join(tmpdir(), 'est-'));
writeFileSync(join(dir, 'estimate.mjs'), src);
const { handleEstimate } = await import(join(dir, 'estimate.mjs'));

let pass = 0, fail = 0;
const check = (name, ok) => { ok ? pass++ : fail++; console.log(`  ${ok ? 'PASS' : 'FAIL'} ${name}`); };

const sent = [];
let allow = true;
const env = {
  SEND_EMAIL: { send: async m => { sent.push(m); } },
  ESTIMATE_LIMITER: { limit: async () => ({ success: allow }) },
};
const pdf = Buffer.from('%PDF-1.3\n' + 'x'.repeat(500)).toString('base64');
const good = {
  estNo: 'GN EST-W260921-171328', filename: 'GN-EST-W260921-171328-Acme.pdf', pdf,
  customer: { company: 'Acme Café Pvt Ltd', gstin: '29ABCDE1234F1ZW', contact: 'José', phone: '9876543210',
              email: 'buyer@acme.example', address: '12 Residency Rd, Bengaluru 560025', state: 'Karnataka',
              delivery: 'Multiple locations (2)\nBengaluru - 150\nChennai - 100' },
  items: [{ name: 'Orbit PU Bottle', brand: 'Borosil', code: 'THBTA001', qty: 150, amount: 110593.5 }],
  total: 110593.5,
};
const req = (body, origin = 'https://giftingneeds.org', method = 'POST') => new Request('https://giftingneeds.org/api/estimate', {
  method, headers: { 'Content-Type': 'application/json', Origin: origin },
  body: method === 'POST' ? JSON.stringify(body) : undefined,
});

let r = await handleEstimate(req(good), env);
check('valid estimate accepted', r.status === 200);
check('exactly one mail sent', sent.length === 1);
const m = sent[0];
check('mail goes to promo@', m.to === 'promo@giftingneeds.in');
check('reply-to is the customer', /\r\nReply-To: <buyer@acme\.example>\r\n/.test(m.raw));
check('subject is ASCII only', /^[\x20-\x7E]*$/.test(m.raw.match(/\r\nSubject: (.*)\r\n/)[1]));
check('PDF attached', /Content-Type: application\/pdf; name="GN-EST-W260921-171328-Acme.pdf"/.test(m.raw) && m.raw.includes(pdf.slice(0, 60)));
const bodyB64 = m.raw.split('Content-Transfer-Encoding: base64\r\n\r\n')[1].split('\r\n--')[0].replace(/\r\n/g, '');
const bodyText = Buffer.from(bodyB64, 'base64').toString('utf8');
check('body carries customer details (UTF-8 intact)', bodyText.includes('Acme Café Pvt Ltd') && bodyText.includes('José') && bodyText.includes('29ABCDE1234F1ZW'));
check('body lists the items and total', bodyText.includes('Orbit PU Bottle') && bodyText.includes('1,10,593.50'));
check('every MIME line within 998 chars', m.raw.split('\r\n').every(l => l.length <= 998));

r = await handleEstimate(req(good, 'https://evil.example'), env);
check('other origins refused', r.status === 403);
r = await handleEstimate(req(good, 'https://giftingneeds.org', 'GET'), env);
check('GET refused', r.status === 405);
r = await handleEstimate(req({ ...good, pdf: Buffer.from('<html>').toString('base64') }), env);
check('non-PDF refused', r.status === 400);
r = await handleEstimate(req({ ...good, estNo: 'EST-000347' }), env);
check('foreign estimate number refused', r.status === 400);
r = await handleEstimate(req({ ...good, customer: { ...good.customer, gstin: '' } }), env);
check('missing GSTIN refused', r.status === 400);
r = await handleEstimate(req({ ...good, customer: { ...good.customer, email: 'x@y.z>\r\nBcc: <a@b.c' } }), env);
check('header injection via email is dropped', r.status === 200 && !/Bcc:/.test(sent.at(-1).raw.split('\r\n\r\n')[0]));
const csvIn = 'Name,Phone,Address,City,Pincode,State,Quantity\r\n"=cmd|calc","9876543210","1 MG Rd, Floor 2",Bengaluru,560001,Karnataka,1\r\nAsha,+919123456780,2 Park St,Kolkata,700016,West Bengal,2\r\n';
r = await handleEstimate(req({ ...good, sample: true, recipientsCsv: csvIn,
  items: [{ ...good.items[0], discount: 3 }] }), env);
const mb = sent.at(-1).raw;
const parts = mb.split(/\r\n--gn-[0-9a-f-]+/);
const textOf = p => Buffer.from(p.split('\r\n\r\n')[1].replace(/\r\n/g, ''), 'base64').toString('utf8');
const csvPart = parts.find(p => p.includes('text/csv'));
check('bulk estimate accepted', r.status === 200);
check('recipient CSV attached', !!csvPart && /filename="GN-EST-W260921-171328-Acme-recipients\.csv"/.test(csvPart));
const csvOut = csvPart ? textOf(csvPart) : '';
check('formula cell neutralised', csvOut.includes(`"'=cmd|calc"`) && !/(^|,)"=/m.test(csvOut));
check('commas inside an address survive', csvOut.includes('"1 MG Rd, Floor 2"'));
const bt = textOf(parts[1]);
check('body notes the sample request and list size', bt.includes('Branded sample first: YES') && bt.includes('Recipient list: 2 addresses'));
check('body notes the volume price', bt.includes('volume price, 3% off'));
r = await handleEstimate(req(good), env);
check('no CSV part when no list sent', !sent.at(-1).raw.includes('text/csv') && textOf(sent.at(-1).raw.split(/\r\n--gn-[0-9a-f-]+/)[1]).includes('Branded sample first: no'));

allow = false;
r = await handleEstimate(req(good), env);
check('rate limit enforced', r.status === 429);
check('no mail sent when refused', sent.length === 4);

console.log(`\n  ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
