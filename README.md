# LaurenPhotography

[Public studio](https://battydev.com/LaurenPhotography/) · [Studio admin](https://battydev.com/LaurenPhotography/admin/) · [Sample signing page](https://battydev.com/LaurenPhotography/contract.html)

A clickable photography studio demo for Lauren. Enter any four digits in the admin PIN field. Use sample details when trying it. Inquiries, contracts, signatures, prices, and the outbox stay in the browser.

## Try the pitch

1. Open the public site and admin in two tabs **in the same browser profile**. On a laptop, the admin also includes a live preview.
2. Pick a theme and choose **Make it live**. In **Automatic**, preview October 15 or December 10. Choose **Use today** to return to the actual calendar.
3. Open **Pricing**, change the Mini Session price, and start a sale. Watch the public banner and package price update.
4. Submit a public inquiry, then open the new **Lead** in **Clients**. Create a contract, preview its filled fields, and simulate sending the email. After about eight seconds the contract shows **Viewed**.
5. Copy the signing link into another tab in the same profile. Sign the sample and check the admin timeline. **Download PDF** and **Download copy** use the browser print dialog.
6. Use the admin overflow menu and **Reset demo** to restore the seed data.

A phone and laptop keep separate copies. The floating public theme switcher previews a theme for that tab. Choose **Use live theme** to follow admin changes again.

## Replace the placeholders

- **Photos** — put a JPG or WebP beside the SVG in `assets/img/themes/<theme-id>/`, keeping the base name. For example, add `assets/img/themes/classic/hero.webp`, then change the one `images.hero` line for Everyday in `data/defaults.json` from `hero.svg` to `hero.webp`. Each gallery slot has its own path in the same theme. Run `node scripts/make-placeholders.mjs` to regenerate the SVG placeholders.
- **Studio name and package prices** — change `settings.businessName` and `packages` in `data/defaults.json`. In admin, a price edit applies to this browser. Reset the demo after deploying new defaults to discard old saved overrides.
- **Copy and branding** — each theme has its own headline, subline, tagline, CTA, and palette. The logo, portrait, bio, social buttons, and testimonial text are placeholders in `index.html`.
- **Contract** — the merge fields and sample terms are in `data/contract-template.md`. Every rendered agreement is watermarked. Use this template only for the demo.

## Run locally and deploy

Serve the repository with a static HTTP server, for example `python -m http.server 8000` in the checkout, then open `http://localhost:8000/`. The modules and seed data load over HTTP. There is no dependency installation or build step. All fonts are local system fonts.

GitHub Pages serves `main` from the repository root under the existing account domain. Each HTML page includes `noindex, nofollow`. The project-level `robots.txt` is included as requested. Crawlers look for that file at the domain root, so the page-level meta tags carry the indexing instruction here. The site and repository are public to anyone with the address.

See [SUGGESTIONS.md](SUGGESTIONS.md) for Cody’s review notes.
