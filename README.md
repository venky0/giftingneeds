# Gifting Needs — both websites

One folder, one branch, two live sites. They are deployed from the same
commit by two different hosts:

| Site | Served from | Host | Branch |
|------|-------------|------|--------|
| **giftingneeds.in** — the public website | this folder (root) | GitHub Pages | `main` |
| **giftingneeds.org** — storefront, catalogues, posters | `portal/` | Cloudflare Workers | `client-portal` |

`portal/` is listed in `_config.yml` under `exclude`, so GitHub Pages leaves
it out and the .org site is not published twice.

## Deploying

Both hosts watch their own branch, so a change goes live only when both
branches are pushed. The two branches are kept at the same commit:

```bash
git push origin main:main main:client-portal
```

Push only `main` and the .in site updates while .org keeps serving the
previous version. (Pointing Cloudflare at `main` in its dashboard would
remove the need for the second ref; until then, push both.)

## Where things live

```
index.html, products.html, …   the .in website
css/  js/  images/  uploads/   its assets
catalogs/                      supplier catalogue pages
portal/
  home.html                    giftingneeds.org landing
  storefront/                  product catalogue + quotation builder
  catalogues/                  Drive-backed catalogue library
  posters.html                 poster gallery
  assets/                      portal CSS and JS
  src/                         the Cloudflare Worker
  test/                        node test suites for the Worker
  wrangler.jsonc               Cloudflare config (root directory: portal)
```

Supplier price lists live in `pricing/`, which is deliberately untracked —
see `.gitignore`. `CLIENT-PORTAL.md` documents the portal's access setup.
