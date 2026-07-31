# Aaryan Systems Observatory

An evidence-first recruiter surface for Aaryan Patel's systems, quantitative
infrastructure, autonomy, and ML infrastructure work.

The site is generated from [`data/evidence.json`](data/evidence.json). That
manifest drives:

- four shareable recruiter routes;
- twelve project proof chains and one-command reproduction paths;
- flagship proof passports for `raft-mvcc`, `edgar-mcp`, and `track-fusion`;
- the portfolio health surface and current-building strip;
- the machine-readable evidence endpoint and route packets;
- seventeen matching social-preview cards;
- the downloadable one-page systems resume.

## Local verification

```bash
npm install
npm run build
npm run dev
```

The implementation is static-first: no visitor-side GitHub API calls, no
third-party badge service, and no runtime database. GitHub Actions builds and
deploys the generated `dist/` folder to Pages.

## Interaction references

21st.dev components 2075, 3920, and 18898 informed command-palette behavior,
copyable command interaction, and responsive composition. Their marketplace
styling was intentionally replaced by the Observatory's own accessible,
source-specific design system documented in [`.21st/design.json`](.21st/design.json).
