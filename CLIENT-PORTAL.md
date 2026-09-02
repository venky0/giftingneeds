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
Zero Trust → **Access** → **Applications** → **Add an application** →
*Self-hosted*.

- **Application name:** Gifting Needs client portal
- **Session duration:** 24 hours
- **Domain:** `giftingneeds.org` — leave the path empty to cover the whole
  site

Add a policy:

- **Policy name:** Approved customers
- **Action:** Allow
- **Include → Emails:** the specific addresses to admit

Under Settings → Authentication, enable **One-time PIN**. Customers then
receive a six-digit code by email; there is no account or password for
anyone to manage.

### 4. Check it
Open `https://giftingneeds.org` in a private window. You should be asked
for an email before the page appears, and the status strip should turn
green showing the address you signed in with.

If the strip is red, Access is not in front of the site and the files are
public.

---

## Where the files live

**In Google Drive, not in this repository.** Two reasons, both hard:

- Cloudflare Workers refuses any asset over 25 MiB. Eight of the current
  catalogues are between 30 MB and 136 MB, so they simply cannot be
  served from here.
- This repository is **public**. Access gates the served pages, not the
  git history — anything committed to `portal/` is downloadable from
  GitHub by anyone, permanently. Several catalogues are cost sheets and
  price lists.

So the portal holds only a link. The files stay in Drive.

### Two allowlists, and they must agree

| Layer | Controls | Managed in |
|---|---|---|
| Cloudflare Access | who can open the portal page | Zero Trust → Access |
| Google Drive sharing | who can open the folder | Drive, per folder |

**Share the Drive folder with the same address the customer signs into
the portal with.** If they differ, the customer reaches the page and is
then refused by Google, which looks like a broken link. The portal card
prints the signed-in address so a mismatch reads as an instruction
rather than a dead end.

---

## Adding a customer

1. **In Google Drive:** create a folder, put their PDFs in it, share it
   with their email address (Viewer). Copy the folder link.
2. **Copy the template:** `portal/clients/demo-customer/` →
   `portal/clients/<slug>/` — lowercase, hyphens, no spaces.
3. In that folder's `index.html`, change `data-customer="demo-customer"`
   to the new slug.
4. Add them to `portal/clients/manifest.json`:

```json
{
  "slug": "acme-industries",
  "name": "Acme Industries Pvt Ltd",
  "emails": ["priya@acme.example"],
  "drive": {
    "url": "https://drive.google.com/drive/folders/XXXXXXXX",
    "label": "Diwali 2026 catalogues",
    "note": "33 PDFs"
  },
  "files": []
}
```

5. Commit and push to `client-portal`. Cloudflare redeploys itself.
6. **Add their email to the Cloudflare Access policy.** Zero Trust →
   Access → Applications → giftingneeds.org → "Approved customers".

Steps 1 and 6 are the two that actually grant anything. Steps 2–5 only
draw the page.

### Keeping customers apart
One Access application on `giftingneeds.org` lets **every** approved
person open **every** customer's page — and therefore see every Drive
link. Drive still refuses the folder itself, but the link and the
customer's name are visible. For real separation, create one application
per path, each with its own email list:

| Application | Path | Allowed |
|---|---|---|
| Acme | `clients/acme-industries` | priya@acme.example |
| Bharat Motors | `clients/bharat-motors` | admin@bharatmotors.example |

## Limits worth knowing

- **`manifest.json` lists every customer** and is readable by anyone
  Access lets in, so one customer can see the others' names and Drive
  links. Drive still refuses the folders. Split it per folder if that
  matters.
- **Customers need a Google account** to open a Drive folder. That is the
  cost of this approach; the alternative is hosting the files yourself.
- **The repository is public.** Never commit a customer's documents to
  `portal/`. Links only.
- **`catalogs/` on giftingneeds.in is public** — 357 supplier pages
  including price lists, reachable without any login. Separate domain,
  not covered by this setup.
