# Client portal — giftingneeds.org

A private area where an approved customer can view and download files
meant only for them.

**Public site:** giftingneeds.in — GitHub Pages, unchanged.
**Portal:** giftingneeds.org — Cloudflare Pages, gated by Cloudflare Access.

Two domains because GitHub Pages allows only one custom domain per site,
and its `CNAME` file is pinned to `giftingneeds.in`. Keeping them apart is
better anyway: the private area is a separate deployment, so nothing
public can accidentally end up inside it.

---

## Read this first

**Nothing in this repository protects the portal.** These are static
files: any check written in JavaScript runs in the visitor's browser and
can be skipped by requesting a file's URL directly.

Protection comes entirely from **Cloudflare Access**, which stops a
request before it reaches the page. Until the Access application in step 3
exists, everything under giftingneeds.org is downloadable by anyone who
knows the URL.

Every portal page says so, in red, whenever Cloudflare cannot confirm a
signed-in visitor. If you see that warning, the folder is public.

---

## Setup

The domain was bought through Cloudflare, so it is already on Cloudflare
nameservers (`kate` / `felicity.ns.cloudflare.com`). There is no registrar
step and no nameserver change.

### 1. Create the Pages project
Cloudflare dashboard → **Workers & Pages** → **Create** → **Pages** →
**Connect to Git** → pick `venky0/giftingneeds`.

Build settings:

| Field | Value |
|---|---|
| Production branch | `client-portal` |
| Framework preset | None |
| Build command | *(leave empty)* |
| Build output directory | `portal` |

The output directory is what keeps this deployment small: it publishes
only `portal/`, not the 299 MB of catalogues and product imagery. The
branch matters too — `main` has no `portal/` folder, so pointing at it
deploys nothing.

This is already configured. It is recorded here so it can be rebuilt.

### 2. Attach the domain
In the new Pages project → **Custom domains** → **Set up a custom domain**
→ `giftingneeds.org`. Cloudflare creates the DNS record itself and issues
the certificate, usually within a minute or two.

Add `www.giftingneeds.org` the same way if you want it to work.

### 3. Create the Access application
Zero Trust → **Access controls → Applications** → **Create new
application** → *Self-hosted*.

(The old "Access → Applications" path 404s — Cloudflare moved these under
**Access controls** in 2026.)

- **Application name:** Gifting Needs client portal
- **Session duration:** 24 hours
- **Domain:** `giftingneeds.org` — leave the path empty to cover the whole
  site

Add a policy:

- **Policy name:** Approved customers
- **Action:** Allow
- **Include → Emails:** the specific addresses to admit

### 3a. Enable One-time PIN — do not skip this
Zero Trust → **Integrations → Identity providers** → **Add an identity
provider** → **One-time PIN**. No configuration; it applies at once.

**The trap:** Cloudflare says a one-time PIN is the default *only if no
identity provider exists*. Add any provider — including the "Cloudflare"
one that may already be there — and the PIN option silently disappears.
The login page then offers just that provider, so a customer without a
Cloudflare account has no way in and no email box to type into. Nothing
errors; the door is simply shut.

With it added, customers receive a six-digit code by email. No account,
no password, nothing for anyone to manage.

### 4. Check it
Open `https://giftingneeds.org` in a private window. You should be asked
for an email before the page appears, and the status strip should turn
green showing the address you signed in with.

If the strip is red, Access is not in front of the site and the files are
public.

---

## Requesting access, and approving it

A visitor on giftingneeds.in presses **Request access**, fills in four
fields, and the client gets an email. One button in that email adds the
address to the Access policy. Nothing else happens anywhere.

    giftingneeds.in                giftingneeds.org              client's inbox
    [Request access] --POST--> /api/request-access --mail--> "Approve <name>?"
                                                                     |
    customer signs in <---- added to Access policy <---- [button] ---+

### Why the approve link is safe to email

- **It is a POST, not a GET.** The link opens a page with a button.
  Mail clients, security scanners and link previewers fetch every URL in
  a message; if a GET granted access, requests would approve themselves
  on arrival, silently, looking exactly as though the client had done it.
- **The address is inside the signed token.** The approve endpoint takes
  nothing from the incoming request, so the link cannot be edited to
  admit somebody else, and a token signed with any other secret is
  refused.
- **Tokens expire after 7 days.**

`portal/test/authorisation.test.mjs` covers all three, plus that
approving twice is harmless and that existing customers survive the
write. Run it after touching either file.

### The two public routes

`/api/request-access` and `/api/approve` **must stay outside Access**, or
the form cannot reach them and the client is asked to log in to approve.
They are excluded by a second Access application:

| | |
|---|---|
| Application | **Public API - request and approve** |
| Destinations | `giftingneeds.org/api/request-access`, `giftingneeds.org/api/approve` |
| Policy | **Public - request and approve endpoints** — action **Bypass**, include **Everyone** |

Access evaluates Bypass first, so this wins over the domain-wide app.
Verify with an anonymous request — no cookie, no browser:

```bash
curl -s -X POST https://giftingneeds.org/api/request-access \
  -H 'Content-Type: application/json' -d '{}'
```

A `400` with *"Please tell us your name."* means the bypass is working:
the Worker answered. A `302` means it is not, and the form is dead.

### Settings this needs

| Name | Type | Value |
|---|---|---|
| `CF_ACCOUNT_ID` | Text | `f2a1e0fc24819405f08c8946376a75fe` |
| `CF_POLICY_ID` | Text | `603781a3-6032-4098-93b4-c6f84f82a6b8` — the "Approved customers" policy |
| `APPROVAL_SECRET` | **Secret** | Long random string. Changing it invalidates every approval link already sent. |
| `WEB3FORMS_KEY` | **Secret** | Free key issued to promo@giftingneeds.in at web3forms.com |
| `CF_API_TOKEN` | **Secret** | Scoped to **Access: Apps and Policies — Edit** on this account, nothing else |

The API token can rewrite who may reach the portal. Scope it to that one
permission: a broader token in a Worker is a much larger loss if it ever
leaks.

---

## The login page

Zero Trust → **Reusable components → Custom pages → Access login page**.
None of this lives in git, so it is recorded here.

| Field | Value |
|---|---|
| Organization's name | `documents` |
| Logo URL | `https://giftingneeds.in/uploads/gifting_needs_logo_dark.png` |
| Header text | Explains the six-digit code, no password, no account |
| Message | Falls back to the account manager's number |
| Background colour | `#FBF7EE` — same `--bg-primary` as the portal |

Two things worth knowing:

- **"Your organization's name" is the line that used to read
  `small-flower-f43f.cloudflareaccess.com`.** It is pre-filled with the
  team domain, which looks unchangeable but is just a default.
- **The logo must be on a public URL.** The login page is served before
  authentication, so anything behind Access cannot load. It is pulled
  from giftingneeds.in, which is public — do not repoint it at
  giftingneeds.org.

The team was also renamed from `small-flower-f43f` to `giftingneeds`
(Settings → Team name), so the login URL is now
`giftingneeds.cloudflareaccess.com`.

---

## Where the files live

**In Google Drive, served through this site.** The Worker holds one
Google service account, fetches on the customer's behalf and streams the
bytes back through giftingneeds.org.

That arrangement exists for one reason: **access is granted in exactly
one place — the Cloudflare Access policy.** Nobody edits Drive sharing
per customer, and customers need no Google account at all.

Two things follow, and both matter:

- The Drive folders must be shared with the **service account only**.
  Not "anyone with the link" — a link-shared folder is readable by
  anyone who ever receives the URL, which defeats the whole design.
- The 25 MiB Workers asset limit does not apply. Files are streamed from
  Drive, not stored in the deployment, so a 136 MB catalogue is fine.

### How a request is authorised

1. Cloudflare Access stops anyone not on the policy. Unauthenticated
   requests never reach the Worker.
2. Access stamps `Cf-Access-Authenticated-User-Email` on what it admits.
3. The Worker maps that address to a Drive folder via `CUSTOMER_FOLDERS`
   and returns only that folder's files.
4. A download re-checks that the requested file id actually sits in a
   folder the caller may read — so one approved customer cannot pull
   another's document by guessing an id.

Step 4 is covered by `portal/test/authorisation.test.mjs`. Run it after
touching the Worker:

```bash
node portal/test/authorisation.test.mjs
```

---

## One-time Google setup

Done once, by you. I cannot do these — they need your Google account.

### 1. Create a service account
Google Cloud console → create (or pick) a project → **APIs & Services →
Library** → enable **Google Drive API**.

Then **IAM & Admin → Service Accounts → Create service account**. Name it
something like `giftingneeds-portal`. No roles are needed — it gets
access purely by being shared on folders.

Open it → **Keys → Add key → Create new key → JSON**. A `.json` file
downloads. That file is a credential: treat it like a password, and do
not paste it into chat or commit it.

### 2. Share the folders with it
Copy the service account's address — it looks like
`giftingneeds-portal@your-project.iam.gserviceaccount.com`.

In Drive, for each customer folder: **Share** → set *General access* to
**Restricted** → add that address as **Viewer**.

Restricted is the important half. A folder left on "anyone with the
link" stays readable to anyone holding the URL no matter what this
Worker does.

### 3. Give the Worker the key
Cloudflare dashboard → Workers & Pages → `giftingneeds` → **Settings →
Variables and Secrets** → add a **Secret**:

- Name: `GOOGLE_SERVICE_ACCOUNT`
- Value: the entire contents of the JSON file

A secret, not a variable — secrets are write-only and never shown again.

### 4. Map addresses to folders
Same page, add a **Variable** (plain text is fine, but see the note):

- Name: `CUSTOMER_FOLDERS`
- Value, one entry per customer:

```json
{"priya@acme.com": {"id": "1l4a0tud...", "label": "Diwali 2026"}}
```

Use `"*"` as the address to give one folder to everyone the Access
policy admits:

```json
{"*": {"id": "1l4a0tud...", "label": "Diwali 2026 catalogues"}}
```

Set this in the dashboard rather than in `wrangler.jsonc`, so customer
addresses stay out of the public repository.

---

## Adding a customer

1. **Drive:** create their folder, add the PDFs, share it with the
   service account as Viewer, set general access to **Restricted**.
   Copy the folder id from the URL —
   `drive.google.com/drive/folders/<THIS PART>`.
2. **Cloudflare → Worker → Variables:** add them to `CUSTOMER_FOLDERS`.
3. **Zero Trust → Access controls → Applications → `giftingneeds.org`
   → "Approved customers":** click the empty `email@example.com` box,
   type the address, press Enter, then **Save policy**.

That is all. No code change, no deploy, no new page — one portal page
serves everyone and shows each caller only their own folder.

Steps 2 and 3 must use the **same address**, or the customer signs in
and sees an empty portal.

## Limits worth knowing

- **The service account key is a credential.** Anyone holding it can read
  every folder shared with it. It lives only as a Cloudflare secret.
- **A folder on "anyone with the link" is public** regardless of this
  setup. Set every customer folder to Restricted.
- **Never commit customer documents or addresses** to this repository —
  it is public. Files stay in Drive; addresses stay in the Worker
  variable.
- **`catalogs/` on giftingneeds.in is public** — 357 supplier pages
  including price lists, reachable without any login. Separate domain,
  not covered by this setup.
