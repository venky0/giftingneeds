/**
 * Gifting Needs — Lead Delivery
 *
 * Replaces the Cloud Run inquiry endpoint, which returns 503 and silently
 * loses every quote request. Delivery is layered so a lead is never dropped:
 *
 *   1. Web3Forms  — posts the enquiry straight to the sales inbox.
 *   2. WhatsApp   — if that fails for any reason, the visitor is handed a
 *                   pre-filled WhatsApp message instead of an error.
 *
 * Layer 2 needs no configuration, so the form works correctly even before
 * the access key below is filled in.
 */

const LeadDelivery = (() => {

  /* ----------------------------------------------------------------
     CONFIGURATION

     WEB3FORMS_KEY — get one free at https://web3forms.com (no account
     needed; enter sales@giftingneeds.in and the key is emailed over).
     Paste it between the quotes and enquiries begin arriving by email.
     Until then, every enquiry is routed to WhatsApp automatically.
     ---------------------------------------------------------------- */
  const WEB3FORMS_KEY = '';

  const SALES_WHATSAPP = '916361054099';
  const ENDPOINT       = 'https://api.web3forms.com/submit';
  const TIMEOUT_MS     = 12000;

  const isConfigured = () => WEB3FORMS_KEY.trim().length > 0;

  /** Human-readable enquiry, used for both the email body and WhatsApp. */
  function format(lead) {
    const lines = [
      'New corporate gifting enquiry',
      '',
      `Name:      ${lead.name}`,
      `Company:   ${lead.company || '—'}`,
      `Email:     ${lead.email}`,
      `Phone:     ${lead.phone}`,
      `Quantity:  ${lead.qty} units`,
      `Timeline:  ${lead.timeline || 'flexible'}`,
      `Interest:  ${lead.productDetails || 'General enquiry'}`
    ];
    if (lead.summary) lines.push(`Hamper:    ${lead.summary}`);
    if (lead.message) lines.push('', 'Message:', lead.message);
    lines.push('', `Sent from giftingneeds.in · ${new Date().toLocaleString('en-IN')}`);
    return lines.join('\n');
  }

  /** wa.me link carrying the whole enquiry, so nothing is retyped. */
  function whatsappUrl(lead) {
    return `https://wa.me/${SALES_WHATSAPP}?text=${encodeURIComponent(format(lead))}`;
  }

  async function postToInbox(lead) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          access_key: WEB3FORMS_KEY,
          subject: `Diwali enquiry — ${lead.company || lead.name} · ${lead.qty} units`,
          from_name: 'Gifting Needs website',
          replyto: lead.email,
          name: lead.name,
          email: lead.email,
          phone: lead.phone,
          company: lead.company,
          quantity: lead.qty,
          timeline: lead.timeline,
          interest: lead.productDetails,
          hamper: lead.summary,
          message: format(lead)
        })
      });
      const data = await res.json().catch(() => ({}));
      return res.ok && data.success === true;
    } catch {
      return false;
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Deliver a lead.
   * Resolves to { delivered, whatsapp } — `delivered` true means it reached
   * the inbox; false means the caller should offer the WhatsApp handoff.
   */
  async function send(lead) {
    const whatsapp = whatsappUrl(lead);
    if (!isConfigured()) return { delivered: false, whatsapp };
    return { delivered: await postToInbox(lead), whatsapp };
  }

  return { send, whatsappUrl, format, isConfigured };
})();

if (typeof window !== 'undefined') window.LeadDelivery = LeadDelivery;
