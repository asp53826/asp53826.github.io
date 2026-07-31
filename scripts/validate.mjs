import { access, readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const evidence = JSON.parse(await readFile(path.join(root, "data/evidence.json"), "utf8"));
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
}
await Promise.all([
  access(path.join(root, "public/social/observatory.png")),
  access(path.join(root, "public/data/evidence.json")),
  access(path.join(root, "public/data/health.json")),
  access(path.join(root, "public/resume/Aaryan-Patel-Systems-Resume.pdf"))
]);
console.log(`validated ${evidence.projects.length} projects, ${evidence.routes.length} routes, social cards, packets, evidence, and resume`);
