import { access, readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const evidence = JSON.parse(await readFile(path.join(root, "data/evidence.json"), "utf8"));
const ecosystem = JSON.parse(await readFile(path.join(root, "data/ecosystem.json"), "utf8"));
const ids = new Set(evidence.projects.map((project) => project.id));

if (ids.size !== evidence.projects.length) throw new Error("project ids must be unique");
if (evidence.routes.length !== 4) throw new Error("exactly four recruiter routes are required");
for (const route of evidence.routes) {
  if (route.projects.length !== 3) throw new Error(`${route.id} must contain exactly three projects`);
  for (const id of route.projects) if (!ids.has(id)) throw new Error(`${route.id} references missing project ${id}`);
}
for (const project of evidence.projects) {
  for (const field of ["problem", "mechanism", "attack", "proof", "limitation", "command", "repo"]) {
    if (!project[field]) throw new Error(`${project.id} missing ${field}`);
  }
  if (!project.command.startsWith("git clone https://github.com/asp53826/")) throw new Error(`${project.id} command is not cloneable`);
  await access(path.join(root, `public/social/${project.id}.png`));
}
for (const route of evidence.routes) {
  await access(path.join(root, `public/social/route-${route.id}.png`));
  await access(path.join(root, `public/recruiter/${route.id}.json`));
  await access(path.join(root, `public/recruiter/${route.id}.pdf`));
}
if (evidence.version < 2) throw new Error("evidence manifest must include the interactive verification schema");
if (evidence.experience.flagships.length !== 3) throw new Error("exactly three flagship verification experiences are required");
for (const experience of evidence.experience.flagships) {
  if (!ids.has(experience.projectId)) throw new Error(`verification experience references missing project ${experience.projectId}`);
  if (experience.events.length !== 6) throw new Error(`${experience.projectId} must include six 10-second replay checkpoints`);
  if (!experience.commit || !experience.benchmarkCommand || experience.sourceFiles.length < 2) throw new Error(`${experience.projectId} missing provenance`);
}
if (ecosystem.labs.length !== 4) throw new Error("proof ecosystem must contain four flagship laboratories");
if (new Set(ecosystem.labs.map((lab) => lab.id)).size !== 4) throw new Error("laboratory ids must be unique");
const labIds = new Set(ecosystem.labs.map((lab) => lab.id));
for (const benchmark of ecosystem.benchmarks) {
  if (!labIds.has(benchmark.lab)) throw new Error(`${benchmark.id} references an unknown lab`);
  for (const field of ["metric", "value", "unit", "commit", "command", "environment", "boundary"]) if (benchmark[field] === undefined || benchmark[field] === "") throw new Error(`${benchmark.id} missing ${field}`);
}
for (const history of ecosystem.histories) {
  if (!labIds.has(history.lab) || history.points.length < 2) throw new Error(`${history.id} needs a known lab and at least two points`);
  for (const point of history.points) if (!point.commit || !point.date || !Number.isFinite(point.value)) throw new Error(`${history.id} has an invalid point`);
}
for (const contribution of ecosystem.contributions) {
  if (!/^https:\/\/github\.com\/[^/]+\/[^/]+\/pull\/\d+$/.test(contribution.url)) throw new Error(`invalid contribution URL ${contribution.url}`);
}
const wasm = await readFile(path.join(root, "public/wasm/faultline/faultline-engine.wasm"));
if (!wasm.subarray(0, 4).equals(Buffer.from([0, 97, 115, 109]))) throw new Error("FAULTLINE engine is not a WebAssembly binary");
for (const film of ["faultline", "signalroom", "marketwire", "kernelarena"]) {
  for (const suffix of ["mp4", "vtt", "svg", "png"]) await access(path.join(root, `public/media/cinema/${film}${["svg", "png"].includes(suffix) ? "-poster" : ""}.${suffix}`));
}
await Promise.all([
  access(path.join(root, "public/social/observatory.png")),
  access(path.join(root, "public/.nojekyll")),
  access(path.join(root, "public/.well-known/security.txt")),
  access(path.join(root, "public/data/evidence.json")),
  access(path.join(root, "public/data/health.json")),
  access(path.join(root, "public/resume/Aaryan-Patel-Systems-Resume.pdf")),
  access(path.join(root, "public/resume/Aaryan-Patel-Systems-Resume.docx")),
  access(path.join(root, "public/resume/Aaryan-Patel-Professional-Resume.pdf")),
  access(path.join(root, "public/resume/Aaryan-Patel-Professional-Resume.docx")),
  access(path.join(root, "public/linkedin/banner/aaryan-engineering-os.png")),
  access(path.join(root, "public/linkedin/banner/aaryan-proof-matrix.png")),
  access(path.join(root, "public/linkedin/banner/aaryan-signal-map.png")),
  access(path.join(root, "public/linkedin/featured/engineering-os.png")),
  access(path.join(root, "public/linkedin/featured/tensorforge.png")),
  access(path.join(root, "public/linkedin/featured/vllm-lite.png")),
  access(path.join(root, "public/linkedin/featured/annlite.png")),
  access(path.join(root, "public/linkedin/featured/sdr-receiver.png"))
]);
console.log(`validated ${evidence.projects.length} projects, ${ecosystem.labs.length} proof labs, ${ecosystem.benchmarks.length} benchmark records, ${ecosystem.histories.length} cross-commit histories, ${ecosystem.contributions.length} merged contributions, four narrated films, packets, evidence, and both resume editions`);
