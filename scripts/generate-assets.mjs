import { readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const evidence = JSON.parse(await readFile(path.join(root, "data/evidence.json"), "utf8"));
const socialDir = path.join(root, "public/social");
const dataDir = path.join(root, "public/data");
const recruiterDir = path.join(root, "public/recruiter");
const linkedinBannerDir = path.join(root, "public/linkedin/banner");
const linkedinFeaturedDir = path.join(root, "public/linkedin/featured");
await Promise.all([socialDir, dataDir, recruiterDir, linkedinBannerDir, linkedinFeaturedDir].map((dir) => mkdir(dir, { recursive: true })));

const esc = (value) => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;");

const wrap = (value, width = 46) => {
  const words = String(value).split(/\s+/);
  const lines = [];
  let line = "";
  for (const word of words) {
    if (`${line} ${word}`.trim().length > width && line) {
      lines.push(line);
      line = word;
    } else {
      line = `${line} ${word}`.trim();
    }
  }
  if (line) lines.push(line);
  return lines.slice(0, 3);
};

const trackAccent = {
  systems: "#39d9f9",
  quant: "#f2b84b",
  defense: "#65e6a7",
  "ml-infrastructure": "#9f8cff"
};

function cardSvg({ eyebrow, title, statement, metric, metricLabel, tags = [], accent = "#39d9f9" }) {
  const titleLines = wrap(title, 27);
  const statementLines = wrap(statement, 70);
  const tagMarkup = tags.slice(0, 4).map((tag, index) => {
    const x = 64 + index * 245;
    return `<g><rect x="${x}" y="526" width="220" height="42" rx="6" fill="#0b1220" stroke="#26364f"/><circle cx="${x + 20}" cy="547" r="4" fill="${accent}"/><text x="${x + 34}" y="552" class="mono tag">${esc(tag.toUpperCase())}</text></g>`;
  }).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="640" viewBox="0 0 1280 640" role="img" aria-label="${esc(title)} social preview">
    <defs>
      <pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse"><path d="M32 0H0V32" fill="none" stroke="#7f91aa" stroke-opacity=".08"/></pattern>
      <linearGradient id="glow" x1="0" x2="1"><stop stop-color="${accent}" stop-opacity=".18"/><stop offset=".55" stop-color="${accent}" stop-opacity="0"/></linearGradient>
    </defs>
    <style>
      .sans{font-family:Arial,Helvetica,sans-serif;fill:#eaf1fb}.mono{font-family:'Courier New',monospace;fill:#9aabc2}.title{font-size:72px;font-weight:700;letter-spacing:-2px}.eyebrow{font-size:15px;font-weight:700;letter-spacing:2px}.statement{font-size:24px;fill:#b6c4d8}.metric{font-size:82px;font-weight:700;fill:${accent};letter-spacing:-3px}.metric-label{font-size:14px;letter-spacing:1.4px}.tag{font-size:12px;font-weight:700;letter-spacing:.7px}
    </style>
    <rect width="1280" height="640" rx="24" fill="#050913"/>
    <rect width="1280" height="640" rx="24" fill="url(#grid)"/>
    <rect width="720" height="640" fill="url(#glow)"/>
    <rect x="1" y="1" width="1278" height="638" rx="23" fill="none" stroke="#26364f" stroke-width="2"/>
    <path d="M64 91H1216" stroke="#26364f"/><path d="M64 91H330" stroke="${accent}" stroke-width="3"/>
    <text x="64" y="63" class="mono eyebrow" fill="${accent}">${esc(eyebrow.toUpperCase())}</text>
    <text x="1216" y="63" text-anchor="end" class="mono eyebrow">AARYAN PATEL // SOURCE BACKED</text>
    ${titleLines.map((line, index) => `<text x="64" y="${172 + index * 76}" class="sans title">${esc(line)}</text>`).join("")}
    ${statementLines.map((line, index) => `<text x="64" y="${378 + index * 32}" class="sans statement">${esc(line)}</text>`).join("")}
    <g transform="translate(905 188)"><rect width="311" height="236" rx="14" fill="#0b1220" stroke="#26364f"/><text x="24" y="93" class="sans metric">${esc(metric)}</text><text x="26" y="126" class="mono metric-label">${esc(metricLabel.toUpperCase())}</text><path d="M24 164H287" stroke="#26364f"/><circle cx="28" cy="198" r="5" fill="#65e6a7"/><text x="44" y="203" class="mono tag">VERIFIED PATH</text></g>
    ${tagMarkup}
    <text x="1216" y="608" text-anchor="end" class="mono tag">asp53826.github.io</text>
  </svg>`;
}

async function render(name, spec) {
  const svg = cardSvg(spec);
  await sharp(Buffer.from(svg)).png({ compressionLevel: 9, quality: 100 }).toFile(path.join(socialDir, `${name}.png`));
}

function linkedinBannerSvg(variant = "architecture") {
  const W = 1584;
  const H = 396;
  const quietZone = `<path d="M0 0H318V396H0Z" fill="#030711"/><path d="M318 0V396" stroke="#21344d" stroke-dasharray="4 8" opacity=".55"/>`;
  const topRail = `<text x="362" y="39" class="mono tiny" fill="#65e6a7">● OPEN TO SYSTEMS + ML INFRASTRUCTURE ROLES</text><text x="1536" y="39" text-anchor="end" class="mono tiny">ASP53826.GITHUB.IO / RECRUITER</text><path d="M362 57H1536" stroke="#21344d"/><path d="M362 57H660" stroke="#55ddff" stroke-width="2"/>`;
  const base = `<defs><linearGradient id="bg" x1="0" x2="1"><stop stop-color="#030711"/><stop offset=".58" stop-color="#071323"/><stop offset="1" stop-color="#0b1021"/></linearGradient><radialGradient id="halo"><stop stop-color="#55ddff" stop-opacity=".18"/><stop offset="1" stop-color="#55ddff" stop-opacity="0"/></radialGradient><pattern id="grid" width="28" height="28" patternUnits="userSpaceOnUse"><path d="M28 0H0V28" fill="none" stroke="#7f91aa" stroke-opacity=".07"/></pattern><filter id="glow"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs><style>.sans{font-family:Arial,Helvetica,sans-serif;fill:#edf5ff}.mono{font-family:'Courier New',monospace;fill:#8ea3bd}.tiny{font-size:10px;font-weight:700;letter-spacing:1.8px}.label{font-size:9px;font-weight:700;letter-spacing:1.3px}.title{font-size:52px;font-weight:700;letter-spacing:-2.6px}.sub{font-size:17px;fill:#b9c9dc}.node{fill:#08111e;stroke:#314967;stroke-width:1.2}.nodeTitle{font-size:10px;font-weight:700;letter-spacing:1px}.nodeSub{font-size:8px;letter-spacing:.6px}</style><rect width="${W}" height="${H}" fill="url(#bg)"/><rect width="${W}" height="${H}" fill="url(#grid)"/><circle cx="1220" cy="190" r="360" fill="url(#halo)"/>${quietZone}${topRail}`;

  if (variant === "proof") {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${base}<text x="362" y="125" class="mono label" fill="#55ddff">AARYAN PATEL / ENGINEERING OS</text><text x="362" y="185" class="sans title">MEASURE. BREAK. VERIFY.</text><text x="362" y="220" class="sans sub">Systems engineering with the failure boundary published beside the result.</text><g transform="translate(362 258)">${[["24","MEASURED SYSTEMS","#55ddff"],["815","TEST FUNCTIONS","#65e6a7"],["05","LIVE LABS","#9f8cff"],["04","ROLE ROUTES","#f2b84b"]].map(([value,label,color],i)=>`<g transform="translate(${i*286} 0)"><rect width="258" height="82" class="node"/><text x="18" y="38" class="sans" font-size="29" font-weight="700" fill="${color}">${value}</text><text x="18" y="61" class="mono label">${label}</text></g>`).join("")}</g><text x="54" y="352" class="mono label" opacity=".34">PROFILE PHOTO SAFE ZONE</text></svg>`;
  }

  if (variant === "signal") {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${base}<text x="362" y="124" class="mono label" fill="#9f8cff">AARYAN PATEL / SYSTEMS + ML INFRASTRUCTURE</text><text x="362" y="183" class="sans title">I BUILD THE LAYER UNDERNEATH THE MODEL.</text><text x="362" y="221" class="sans sub">Storage · distributed systems · retrieval · inference serving · GPU compilation</text><g transform="translate(362 272)"><path d="M20 30H1110" stroke="#334b69"/><path d="M20 30H1110" stroke="#9f8cff" stroke-width="2" stroke-dasharray="8 13"/>${["FAULT","STATE","SCHEDULE","COMPILE","GPU","PROOF"].map((label,i)=>`<g transform="translate(${i*216} 0)"><circle cx="20" cy="30" r="8" fill="#071323" stroke="${i===5 ? "#65e6a7" : "#9f8cff"}" stroke-width="2"/><text x="20" y="63" text-anchor="middle" class="mono label">${label}</text></g>`).join("")}</g><text x="54" y="352" class="mono label" opacity=".34">PROFILE PHOTO SAFE ZONE</text></svg>`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${base}<text x="362" y="112" class="mono label" fill="#55ddff">AARYAN PATEL / ENGINEERING OS</text><text x="362" y="166" class="sans title">SYSTEMS + ML INFRASTRUCTURE</text><text x="362" y="202" class="sans sub">Evidence-first engineering across storage, compilers, inference, and autonomy.</text><g transform="translate(362 252)"><path d="M34 38H1122" stroke="#304764"/><path d="M34 38H1122" stroke="#55ddff" stroke-opacity=".42" stroke-width="2" stroke-dasharray="7 12"/>${[["DATA","ingest","#55ddff"],["STATE","MVCC + Raft","#65e6a7"],["RETRIEVE","HNSW","#9f8cff"],["SCHEDULE","paged KV","#9f8cff"],["COMPILE","typed IR","#f2b84b"],["VERIFY","oracle + limit","#65e6a7"]].map(([title,sub,color],i)=>`<g transform="translate(${i*196} 0)"><rect width="176" height="76" rx="4" class="node"/><rect width="3" height="76" fill="${color}"/><circle cx="22" cy="21" r="4" fill="${color}" filter="url(#glow)"/><text x="34" y="25" class="mono nodeTitle" fill="#edf5ff">${title}</text><text x="18" y="51" class="mono nodeSub">${sub}</text></g>`).join("")}</g><text x="54" y="352" class="mono label" opacity=".34">PROFILE PHOTO SAFE ZONE</text></svg>`;
}

function featuredDiagram(kind, accent) {
  if (kind === "compiler") return `<g transform="translate(714 126)"><path d="M60 116H150M242 116H300M392 116H450" stroke="${accent}" stroke-width="2" stroke-dasharray="7 9"/>${[[0,"INPUT","[8,128]"],[150,"TYPED IR","13 → 8"],[300,"FUSION","8 → 3"],[450,"WEBGPU","CPU oracle"]].map(([x,t,s])=>`<g transform="translate(${x} 70)"><rect width="92" height="92" rx="5" fill="#0b1627" stroke="#324866"/><rect width="92" height="3" fill="${accent}"/><text x="46" y="42" text-anchor="middle" class="mono diaTitle">${t}</text><text x="46" y="63" text-anchor="middle" class="mono diaSub">${s}</text></g>`).join("")}</g>`;
  if (kind === "scheduler") return `<g transform="translate(784 105)">${[0,1,2,3,4].map((row)=>[0,1,2,3,4,5,6,7].map((col)=>`<rect x="${col*52}" y="${row*52}" width="40" height="40" rx="4" fill="${col < 6-row ? accent : "#101d30"}" fill-opacity="${col < 6-row ? .2 + row*.08 : 1}" stroke="${col < 6-row ? accent : "#263b56"}"/>`).join("")).join("")}<path d="M18 290H394" stroke="${accent}" stroke-width="2"/><text x="18" y="320" class="mono diaSub">PAGED KV CACHE / LIVE SCHEDULER</text></g>`;
  if (kind === "vector") return `<g transform="translate(930 290)">${Array.from({length:28},(_,i)=>{const a=i*2.399;const r=18+9*Math.sqrt(i);const x=Math.cos(a)*r;const y=Math.sin(a)*r;return `<circle cx="${x}" cy="${y}" r="${i%7===0?7:4}" fill="${i%7===0?accent:"#47627f"}" opacity="${i%7===0?1:.7}"/>`;}).join("")}<circle r="152" fill="none" stroke="#304762"/><circle r="94" fill="none" stroke="${accent}" stroke-dasharray="6 9"/><path d="M-145 0H145M0-145V145" stroke="#304762"/><text x="0" y="184" text-anchor="middle" class="mono diaSub">HNSW / RECALL-MATCHED SEARCH</text></g>`;
  if (kind === "radio") return `<g transform="translate(710 106)"><path d="M0 210C50 210 56 74 106 74S162 348 212 348 268 90 318 90 374 264 424 264 480 136 530 136" fill="none" stroke="${accent}" stroke-width="3"/><path d="M0 210H530M265 10V360" stroke="#304762"/><circle cx="265" cy="210" r="128" fill="none" stroke="#304762"/><circle cx="265" cy="210" r="76" fill="none" stroke="${accent}" stroke-dasharray="5 10"/><text x="265" y="390" text-anchor="middle" class="mono diaSub">QPSK → LDPC → CONSTELLATION</text></g>`;
  return `<g transform="translate(714 105)"><path d="M28 168H476" stroke="${accent}" stroke-width="2" stroke-dasharray="7 10"/>${["FAULT","STATE","COMPUTE","PROOF"].map((label,i)=>`<g transform="translate(${i*140} 110)"><rect width="96" height="96" rx="5" fill="#0b1627" stroke="#324866"/><circle cx="48" cy="36" r="9" fill="${accent}" fill-opacity=".22" stroke="${accent}"/><text x="48" y="70" text-anchor="middle" class="mono diaTitle">${label}</text></g>`).join("")}</g>`;
}

function featuredSvg({ eyebrow, title, statement, metric, metricLabel, accent, kind, action = "OPEN LIVE LAB" }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="640" viewBox="0 0 1280 640"><defs><linearGradient id="feature-bg" x1="0" x2="1"><stop stop-color="#030711"/><stop offset="1" stop-color="#0a1424"/></linearGradient><radialGradient id="feature-halo"><stop stop-color="${accent}" stop-opacity=".17"/><stop offset="1" stop-color="${accent}" stop-opacity="0"/></radialGradient><pattern id="feature-grid" width="32" height="32" patternUnits="userSpaceOnUse"><path d="M32 0H0V32" fill="none" stroke="#7690b0" stroke-opacity=".08"/></pattern></defs><style>.sans{font-family:Arial,Helvetica,sans-serif;fill:#eef5ff}.mono{font-family:'Courier New',monospace;fill:#8fa3bc}.eyebrow{font-size:13px;font-weight:700;letter-spacing:2px;fill:${accent}}.title{font-size:66px;font-weight:700;letter-spacing:-2.5px}.statement{font-size:20px;fill:#b9c8db}.metric{font-size:56px;font-weight:700;fill:${accent}}.metricLabel{font-size:10px;font-weight:700;letter-spacing:1.2px}.diaTitle{font-size:9px;font-weight:700;fill:#eef5ff}.diaSub{font-size:8px;fill:#8fa3bc;letter-spacing:.6px}.action{font-size:12px;font-weight:700;letter-spacing:1.4px;fill:#031019}</style><rect width="1280" height="640" rx="20" fill="url(#feature-bg)"/><rect width="1280" height="640" rx="20" fill="url(#feature-grid)"/><circle cx="1000" cy="300" r="430" fill="url(#feature-halo)"/><rect x="1" y="1" width="1278" height="638" rx="19" fill="none" stroke="#2b405c" stroke-width="2"/><path d="M52 78H1228" stroke="#2b405c"/><path d="M52 78H336" stroke="${accent}" stroke-width="3"/><text x="52" y="49" class="mono eyebrow">${esc(eyebrow.toUpperCase())}</text><text x="1228" y="49" text-anchor="end" class="mono eyebrow">AARYAN PATEL / VERIFIED BUILD</text><text x="52" y="172" class="sans title">${esc(title)}</text>${wrap(statement, 50).slice(0,3).map((line,index)=>`<text x="52" y="${225+index*29}" class="sans statement">${esc(line)}</text>`).join("")}<g transform="translate(52 360)"><rect width="596" height="132" rx="7" fill="#08111e" stroke="#2b405c"/><text x="22" y="62" class="sans metric">${esc(metric)}</text><text x="24" y="93" class="mono metricLabel">${esc(metricLabel.toUpperCase())}</text><circle cx="454" cy="64" r="7" fill="#65e6a7"/><text x="472" y="69" class="mono metricLabel">SOURCE BACKED</text></g>${featuredDiagram(kind,accent)}<g transform="translate(52 552)"><rect width="1176" height="52" rx="4" fill="${accent}"/><text x="22" y="33" class="mono action">${esc(action)}</text><text x="1152" y="33" text-anchor="end" class="mono action">ASP53826.GITHUB.IO  ↗</text></g></svg>`;
}

async function renderLinkedinAssets() {
  await Promise.all([
    ["aaryan-engineering-os", linkedinBannerSvg("architecture")],
    ["aaryan-proof-matrix", linkedinBannerSvg("proof")],
    ["aaryan-signal-map", linkedinBannerSvg("signal")]
  ].map(([name, svg]) => sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(path.join(linkedinBannerDir, `${name}.png`))));

  const featuredSpecs = [
    { name: "engineering-os", eyebrow: "Recruiter command center", title: "ENGINEERING OS", statement: "Choose a role signal. Follow the architecture. Open the proof.", metric: "90 SEC", metricLabel: "from role to reproducible evidence", accent: "#55ddff", kind: "os", action: "ENTER RECRUITER COMMAND CENTER" },
    { name: "tensorforge", eyebrow: "TypeScript + WGSL / live WebGPU", title: "TENSORFORGE", statement: "A visual tensor compiler with typed IR, fusion, buffer reuse, and generated WGSL.", metric: "8 → 3", metricLabel: "primitive kernels to GPU dispatches", accent: "#9f8cff", kind: "compiler", action: "RUN THE LIVE COMPILER" },
    { name: "vllm-lite", eyebrow: "ML infrastructure / inference serving", title: "vLLM-LITE", statement: "Paged KV cache, continuous batching, chunked prefill, and prefix reuse.", metric: "94%", metricLabel: "KV slot utilization versus 21 percent", accent: "#55ddff", kind: "scheduler", action: "INSPECT THE SCHEDULER" },
    { name: "annlite", eyebrow: "C++17 + Python / vector search", title: "ANNLITE", statement: "HNSW retrieval benchmarked against exact ground truth and a recall-matched FAISS baseline.", metric: "1.83×", metricLabel: "FAISS QPS at 0.999 recall", accent: "#65e6a7", kind: "vector", action: "OPEN THE PROOF PASSPORT" },
    { name: "sdr-receiver", eyebrow: "Signal processing / interactive lab", title: "SDR RECEIVER", statement: "Operate the QPSK and LDPC signal chain, then inspect the constellation and decode path.", metric: "LIVE", metricLabel: "browser-accessible signal lab", accent: "#f2b84b", kind: "radio", action: "OPERATE THE RECEIVER" }
  ];
  await Promise.all(featuredSpecs.map(({ name, ...spec }) => sharp(Buffer.from(featuredSvg(spec))).png({ compressionLevel: 9 }).toFile(path.join(linkedinFeaturedDir, `${name}.png`))));
}

await writeFile(path.join(dataDir, "evidence.json"), `${JSON.stringify(evidence, null, 2)}\n`);
await writeFile(path.join(dataDir, "health.json"), `${JSON.stringify({
  ...evidence.health,
  evidenceVersion: evidence.version,
  evidenceVerified: evidence.experience.verifiedOn,
  generated: new Date().toISOString(),
  status: "passing"
}, null, 2)}\n`);

await render("observatory", {
  eyebrow: "Aaryan Systems Observatory",
  title: "Measured systems, not portfolio theater.",
  statement: evidence.contract,
  metric: String(evidence.health.measuredSystems),
  metricLabel: "measured public systems",
  tags: ["fault tolerance", "quant", "autonomy", "ML infrastructure"]
});

for (const route of evidence.routes) {
  const projects = route.projects.map((id) => evidence.projects.find((project) => project.id === id));
  await render(`route-${route.id}`, {
    eyebrow: `${route.short} recruiter signal`,
    title: route.label,
    statement: route.summary,
    metric: "03",
    metricLabel: "flagship systems",
    tags: projects.map((project) => project.name),
    accent: trackAccent[route.id]
  });
  await writeFile(path.join(recruiterDir, `${route.id}.json`), `${JSON.stringify({
    route,
    owner: evidence.owner,
    thesis: evidence.thesis,
    projects,
    generated: evidence.generated
  }, null, 2)}\n`);
}

for (const project of evidence.projects) {
  await render(project.id, {
    eyebrow: `${project.track} // ${project.language}`,
    title: project.name,
    statement: project.tagline,
    metric: project.metric,
    metricLabel: project.metricLabel,
    tags: project.methods,
    accent: trackAccent[project.track]
  });
}

await renderLinkedinAssets();

console.log(`generated ${evidence.projects.length + evidence.routes.length + 1} social cards, evidence packets, and LinkedIn visual kit`);
