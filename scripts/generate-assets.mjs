import { readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const evidence = JSON.parse(await readFile(path.join(root, "data/evidence.json"), "utf8"));
const socialDir = path.join(root, "public/social");
const dataDir = path.join(root, "public/data");
const recruiterDir = path.join(root, "public/recruiter");
await Promise.all([socialDir, dataDir, recruiterDir].map((dir) => mkdir(dir, { recursive: true })));

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

await writeFile(path.join(dataDir, "evidence.json"), `${JSON.stringify(evidence, null, 2)}\n`);
await writeFile(path.join(dataDir, "health.json"), `${JSON.stringify({ ...evidence.health, generated: evidence.generated, status: "passing" }, null, 2)}\n`);

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

console.log(`generated ${evidence.projects.length + evidence.routes.length + 1} social cards and evidence packets`);
