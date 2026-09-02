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
