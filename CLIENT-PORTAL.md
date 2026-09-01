# Client portal — setup and operation

A private area at `/clients/<customer>/` where an approved customer can
view and download files meant only for them.

---

## Read this first

**The pages under `/clients/` are not protected by anything in this
repository.** giftingneeds.in is static files on GitHub Pages: there is no
server to check a password, so any check written in JavaScript runs in the
visitor's browser and can be skipped by requesting a file's URL directly.

Protection comes from **Cloudflare Access**, which sits in front of the
site and stops a request before it ever reaches these pages. Until the
Access application in step 4 exists, every file under `/clients/` is
downloadable by anyone who knows or guesses the URL.

The portal page says so, in red, whenever Cloudflare cannot confirm a
signed-in visitor. If you see that warning, the folder is public.

---

## One-time setup

### 1. Add the domain to Cloudflare
Sign up at cloudflare.com (the free plan is enough), add `giftingneeds.in`,
and let it import the existing DNS records.

### 2. Change the nameservers
At the registrar where `giftingneeds.in` was bought, replace the
nameservers with the two Cloudflare gives you. Propagation usually takes
under an hour.

### 3. Keep GitHub Pages as the origin
In Cloudflare's DNS tab, confirm the records still point at GitHub Pages
and that the cloud icon is **orange** (proxied). Traffic must pass through
Cloudflare or Access cannot gate anything.

```
A     giftingneeds.in   185.199.108.153   proxied
A     giftingneeds.in   185.199.109.153   proxied
A     giftingneeds.in   185.199.110.153   proxied
A     giftingneeds.in   185.199.111.153   proxied
```

Set SSL/TLS mode to **Full**, so Cloudflare talks to GitHub over HTTPS.

### 4. Create the Access application
Zero Trust → Access → Applications → **Add an application** → *Self-hosted*.

- **Application name:** Gifting Needs client portal
- **Session duration:** 24 hours is reasonable
- **Domain:** `giftingneeds.in`, path `clients`

Then add a policy:

- **Policy name:** Approved customers
- **Action:** Allow
- **Include → Emails:** the specific addresses to admit

Under Settings → Authentication, enable **One-time PIN**. Customers then
receive a six-digit code by email — no account or password to manage.

### 5. Check it
Open `https://giftingneeds.in/clients/demo-customer/` in a private window.
You should be asked for an email before the page appears, and the status
strip should turn green and show the address you signed in with.

---

## Adding a customer

1. Copy `clients/demo-customer/` to `clients/<slug>/` — lowercase, hyphens,
   no spaces.
2. Put their files in that folder.
3. In `clients/<slug>/index.html`, change `data-customer="demo-customer"`
   to the new slug.
4. Add the customer to `clients/manifest.json`:

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

5. **Add a Cloudflare Access policy for the new path.** In Zero Trust →
   Access → Applications, either add `clients/acme-industries` to the
   existing application, or create a separate application for that path
   with only that customer's emails.

Step 5 is the one that actually restricts access. Skipping it leaves the
folder public.

### Per-customer isolation
One application covering `clients` lets **every** approved person reach
**every** customer folder. To keep customers apart, create one application
per path, each with its own email list:

| Application | Path | Allowed |
|---|---|---|
| Acme | `clients/acme-industries` | priya@acme.example |
| Bharat Motors | `clients/bharat-motors` | admin@bharatmotors.example |

The `emails` field in `manifest.json` is documentation for you. It grants
nothing — Cloudflare holds the real list.

---

## Limits worth knowing

- **Folder names are guessable.** Access blocks the request, so a guessed
  URL still fails — but avoid putting anything sensitive in the *name*.
- **`manifest.json` is readable by anyone Access lets in.** It lists every
  customer, so it reveals your client list to any signed-in customer. If
  that matters, split it into one manifest per folder.
- **Git history keeps files forever.** Removing a file from the working
  tree does not remove it from earlier commits in a public repository.
- **The `catalogs/` folder is public** — 357 supplier pages including
  price lists, reachable without any login. It is outside `/clients/` and
  is not covered by this setup.
