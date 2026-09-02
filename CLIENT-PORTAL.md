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
| Production branch | `main` |
| Framework preset | None |
| Build command | *(leave empty)* |
| Build output directory | `portal` |

The output directory is what keeps this deployment small: it publishes
only `portal/`, not the 299 MB of catalogues and product imagery.

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

## Adding a customer

1. Copy `portal/clients/demo-customer/` to `portal/clients/<slug>/` —
   lowercase, hyphens, no spaces.
2. Put their files in that folder.
3. In that folder's `index.html`, change `data-customer="demo-customer"`
   to the new slug.
4. Add the customer to `portal/clients/manifest.json`:

```json
{
  "slug": "acme-industries",
  "name": "Acme Industries Pvt Ltd",
  "emails": ["priya@acme.example"],
  "files": [
    { "file": "diwali-proposal.pdf", "label": "Diwali 2026 proposal", "kind": "PDF" }
  ]
}
```

5. Commit and push. Cloudflare Pages redeploys on its own.
6. **Add the email to the Cloudflare Access policy.** This is the step
   that actually grants access; nothing in the repository does.

### Keeping customers apart
A single application covering `giftingneeds.org` lets **every** approved
person open **every** customer folder. For real separation, create one
application per path, each with its own email list:

| Application | Path | Allowed |
|---|---|---|
| Acme | `clients/acme-industries` | priya@acme.example |
| Bharat Motors | `clients/bharat-motors` | admin@bharatmotors.example |

Then keep the site-wide application as a broader gate, or remove it and
let the per-path ones do the work.

The `emails` field in `manifest.json` is a note to yourself. It grants
nothing — Cloudflare holds the real list.

---

## Limits worth knowing

- **`manifest.json` lists every customer** and is readable by anyone
  Access lets in, so one customer can see the others' names. If that
  matters, split it into one manifest per folder.
- **Git history keeps files forever.** Removing a file from the working
  tree does not remove it from earlier commits in a public repository.
  Treat anything committed here as permanently recorded.
- **The repository is public.** Filenames under `portal/` are visible on
  GitHub even though the served pages are gated. Do not rely on a filename
  being secret.
- **`catalogs/` on giftingneeds.in is public** — 357 supplier pages
  including price lists, reachable without any login. It is a separate
  domain and deployment, and this setup does not cover it.
