# Custom domain activation

The Observatory is ready for a custom domain, but no domain is configured until Aaryan owns and selects one. Do not add a speculative `CNAME`: GitHub Pages requires the repository setting and DNS ownership to agree.

Recommended naming order:

1. `aaryanpatel.dev`
2. `patelsystems.dev`
3. `systemsobservatory.dev`

Decision required from Aaryan: purchase/confirm exactly one of the names above
and provide the owned domain. Domain registration is a paid external action,
so the repository intentionally stops before creating `public/CNAME` or
changing the Pages setting. Everything else in this checklist is ready.

Activation checklist:

1. Purchase and verify the selected domain.
2. In `asp53826/asp53826.github.io`, open **Settings -> Pages -> Custom domain**.
3. Add the chosen apex domain before changing DNS.
4. Configure the apex `A`/`AAAA` records and the `www` CNAME using GitHub's current documentation.
5. Verify both apex and `www`, then enable **Enforce HTTPS**.
6. Update `site` in `astro.config.mjs`, `owner.site` in `data/evidence.json`, canonical URLs, route packets, social art, and the profile README.
7. Run `npm run build`, verify canonical and Open Graph URLs, then deploy.

Official references:

- https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site
- https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/verifying-your-custom-domain-for-github-pages
