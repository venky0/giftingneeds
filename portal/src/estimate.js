/**
 * POST /api/estimate — a storefront customer has just downloaded an
 * estimate; mail Gifting Needs a copy with the PDF attached and the
 * customer's details in the body, so every estimate becomes a lead.
 *
 * The recipient is fixed by the SEND_EMAIL binding (see wrangler.jsonc),
 * so nothing a visitor sends can redirect the mail. Same-origin only,
 * size-capped, and rate-limited per IP when the limiter is bound.
 */

const MAX_PDF_BYTES = 3 * 1024 * 1024;

const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
});

const clean = (v, max) => String(v == null ? '' : v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().slice(0, max);
const ascii = s => s.replace(/[^\x20-\x7E]/g, '?');
const validEmail = e => /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/.test(e);

// base64 of UTF-8 text, folded to 76 columns as MIME requires
function b64utf8(text) {
  const bytes = new TextEncoder().encode(text);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return fold(btoa(bin));
}
const fold = b64 => b64.replace(/.{1,76}/g, '$&\r\n').trimEnd();

export async function handleEstimate(request, env) {
  const url = new URL(request.url);
  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  // Only the storefront on this host may post here.
  if (request.headers.get('Origin') !== url.origin) return json({ error: 'forbidden' }, 403);

  const declared = Number(request.headers.get('Content-Length') || 0);
  if (declared > MAX_PDF_BYTES * 1.5) return json({ error: 'too_large' }, 413);

  if (env.ESTIMATE_LIMITER) {
    const key = request.headers.get('CF-Connecting-IP') || 'unknown';
    const { success } = await env.ESTIMATE_LIMITER.limit({ key });
    if (!success) return json({ error: 'rate_limited' }, 429);
  }
  if (!env.SEND_EMAIL) return json({ error: 'mail_not_configured' }, 503);

  let body;
  try { body = await request.json(); } catch { return json({ error: 'bad_json' }, 400); }

  const estNo = clean(body.estNo, 40);
  if (!/^GN EST-W[0-9-]+$/.test(estNo)) return json({ error: 'bad_estimate_number' }, 400);

  const pdf = String(body.pdf || '').replace(/\s+/g, '');
  // "JVBER" is base64 for "%PDF" — refuse anything that isn't a PDF
  if (!/^JVBER[A-Za-z0-9+/]+=*$/.test(pdf) || pdf.length * 0.75 > MAX_PDF_BYTES) {
    return json({ error: 'bad_pdf' }, 400);
  }

  const c = body.customer || {};
  const cust = {
    company: clean(c.company, 160), gstin: clean(c.gstin, 15), contact: clean(c.contact, 80),
    phone: clean(c.phone, 30), email: clean(c.email, 254).toLowerCase(), address: clean(c.address, 600),
    state: clean(c.state, 60), delivery: clean(c.delivery, 1500),
  };
  if (!cust.company || !cust.gstin) return json({ error: 'missing_customer' }, 400);

  const items = (Array.isArray(body.items) ? body.items : []).slice(0, 300).map(it => ({
    name: clean(it.name, 200), brand: clean(it.brand, 60), code: clean(it.code, 120),
    qty: Math.max(0, Math.floor(Number(it.qty) || 0)), amount: Number(it.amount) || 0,
  }));
  const total = Number(body.total) || 0;
  const money = n => n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const text = [
    `A customer has just downloaded estimate ${estNo} from the storefront.`,
    'The PDF they received is attached.',
    '',
    'CUSTOMER',
    `Company:   ${cust.company}`,
    `GSTIN:     ${cust.gstin}`,
    `Contact:   ${cust.contact || '(not given)'}`,
    `Mobile:    ${cust.phone || '(not given)'}`,
    `Email:     ${cust.email || '(not given)'}`,
    `Address:   ${cust.address}`,
    `State:     ${cust.state}`,
    '',
    'DELIVERY',
    cust.delivery,
    '',
    `ITEMS (${items.length})`,
    ...items.map((it, i) => `${i + 1}. ${it.name}${it.brand ? ' - ' + it.brand : ''}${it.code ? ' (' + it.code + ')' : ''}  x ${it.qty}  =  Rs. ${money(it.amount)}`),
    '',
    `TOTAL incl. GST: Rs. ${money(total)}`,
    '',
    cust.email ? 'Reply to this email to answer the customer directly.' : 'The customer left no email address; call them on the number above.',
  ].join('\r\n');

  const to = env.ESTIMATE_EMAIL || 'promo@giftingneeds.in';
  const from = env.MAIL_FROM || 'portal@giftingneeds.org';
  const boundary = 'gn-' + crypto.randomUUID();
  const filename = ascii(clean(body.filename, 120)).replace(/["\\]/g, '') || `${estNo}.pdf`;

  const raw = [
    `From: Gifting Needs storefront <${from}>`,
    `To: <${to}>`,
    ...(validEmail(cust.email) ? [`Reply-To: <${cust.email}>`] : []),
    `Subject: ${ascii(`New estimate ${estNo} - ${cust.company}`).slice(0, 180)}`,
    `Message-ID: <${crypto.randomUUID()}@giftingneeds.org>`,
    `Date: ${new Date().toUTCString()}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset="utf-8"',
    'Content-Transfer-Encoding: base64',
    '',
    b64utf8(text),
    `--${boundary}`,
    `Content-Type: application/pdf; name="${filename}"`,
    `Content-Disposition: attachment; filename="${filename}"`,
    'Content-Transfer-Encoding: base64',
    '',
    fold(pdf),
    `--${boundary}--`,
    '',
  ].join('\r\n');

  try {
    const { EmailMessage } = await import('cloudflare:email');
    await env.SEND_EMAIL.send(new EmailMessage(from, to, raw));
  } catch (e) {
    console.error('estimate mail failed', e);
    return json({ error: 'send_failed' }, 502);
  }
  return json({ ok: true });
}
