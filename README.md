# Aaryan Systems Observatory

An evidence-first recruiter surface for Aaryan Patel's systems, quantitative
infrastructure, autonomy, and ML infrastructure work.

The site is generated from [`data/evidence.json`](data/evidence.json). That
manifest drives:

- four shareable recruiter routes;
- twelve project proof chains and one-command reproduction paths;
- flagship proof passports for `raft-mvcc`, `edgar-mcp`, and `track-fusion`;
- six-checkpoint Verification Theater replays grounded in published tests;
- a pausable 90-second recruiter tour for each role route;
- a benchmark correction ledger, architecture constellation, and engineering postmortems;
- deterministic evidence search that cannot answer outside the committed manifest;
- the portfolio health surface and current-building strip;
- the machine-readable evidence endpoint and four one-page recruiter PDF packets;
- seventeen matching social-preview cards;
- the downloadable one-page systems resume.

## Local verification

```bash
npm install
python3 -m pip install -r requirements-build.txt
npm run build
npm run dev
```

The implementation is static-first: no visitor-side GitHub API calls, no
third-party badge service, no generative chatbot, and no runtime database.
GitHub Actions rebuilds and deploys the generated `dist/` folder on every main
push and on a daily proof-freshness schedule.

The interaction layer uses GSAP and ScrollTrigger for the observatory boot
sequence, proof-spine playback, route-card reveals, and scroll-linked hero
motion. CSS and runtime guards disable the choreography for visitors who prefer
reduced motion; the full evidence surface remains available without animation.

## Interaction references

21st.dev components 2075, 3920, and 18898 informed command-palette behavior,
copyable command interaction, and responsive composition. Their marketplace
styling was intentionally replaced by the Observatory's own accessible,
source-specific design system documented in [`.21st/design.json`](.21st/design.json).
