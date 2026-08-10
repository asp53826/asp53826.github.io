import {
  ArrowDown,
  ArrowUpRight,
  CheckCircle2,
  ChevronRight,
  CircuitBoard,
  Code2,
  Database,
  Download,
  ExternalLink,
  FileJson,
  Gauge,
  Layers3,
  Mail,
  Network,
  RadioTower,
  ShieldCheck,
  Sparkles,
  Workflow,
  Zap
} from "lucide-react";
import { useMemo, useState } from "react";
import type { Evidence, Project, TrackId } from "./Observatory";
import EngineeringScene from "./EngineeringScene";

type Props = { evidence: Evidence };

const pathLabels: Record<TrackId, string[]> = {
  systems: ["FAULT", "LOG", "STATE", "ORACLE", "PROOF"],
  quant: ["FILING", "CACHE", "MODEL", "RISK", "PROOF"],
  defense: ["SENSOR", "TRACK", "FUSE", "EVALUATE", "PROOF"],
  "ml-infrastructure": ["TENSOR", "GRAPH", "MEMORY", "GPU", "PROOF"]
};

const routeCopy: Record<TrackId, { question: string; signal: string }> = {
  systems: { question: "Can it stay correct when the system fails?", signal: "Consensus · storage · deterministic faults" },
  quant: { question: "Can the data path survive scrutiny?", signal: "SEC data · market structure · differentiable risk" },
  defense: { question: "Can the estimator expose where it loses?", signal: "Tracking · radar · GPS-denied navigation" },
  "ml-infrastructure": { question: "Can the model-serving layer earn its speedup?", signal: "Retrieval · scheduling · tensor compilation" }
};

function ProjectSignal({ project }: { project: Project }) {
  return (
    <article className="os-project-card">
      <div className="os-card-index" aria-hidden="true">{project.language}</div>
      <div className="os-card-copy">
        <span>{project.track.replace("-", " ")}</span>
        <h3>{project.name}</h3>
        <p>{project.proof}</p>
      </div>
      <div className="os-card-metric"><strong>{project.metric}</strong><span>{project.metricLabel}</span></div>
      <div className="os-card-actions">
        {project.live && <a href={project.live} target="_blank" rel="noreferrer">Run live <ExternalLink aria-hidden="true" /></a>}
        <a href={`/projects/${project.id}/`}>Proof passport <ChevronRight aria-hidden="true" /></a>
        <a href={project.repo} target="_blank" rel="noreferrer" aria-label={`Open ${project.name} source on GitHub`}><Code2 aria-hidden="true" /></a>
      </div>
    </article>
  );
}

export default function RecruiterOS({ evidence }: Props) {
  const [activeTrack, setActiveTrack] = useState<TrackId>("ml-infrastructure");
  const route = evidence.routes.find((item) => item.id === activeTrack)!;
  const projects = useMemo(() => {
    const routeProjects = route.projects.map((id) => evidence.projects.find((project) => project.id === id)!).filter(Boolean);
    if (activeTrack === "ml-infrastructure") {
      const tensorforge = evidence.projects.find((project) => project.id === "tensorforge-webgpu");
      return tensorforge ? [tensorforge, ...routeProjects.slice(0, 2)] : routeProjects;
    }
    return routeProjects;
  }, [activeTrack, evidence.projects, route.projects]);
  const featured = evidence.projects.find((project) => project.id === "tensorforge-webgpu")!;

  return (
    <div className="engineering-os" data-route={activeTrack}>
      <a className="skip-link" href="#os-main">Skip to recruiter command center</a>
      <header className="os-topbar">
        <a className="os-brand" href="/" aria-label="Return to Aaryan Systems Observatory">
          <span aria-hidden="true">AP</span>
          <span><strong>Aaryan Patel</strong><small>Engineering OS</small></span>
        </a>
        <nav aria-label="Recruiter navigation">
          <a href="#proof">Proof</a>
          <a href="/labs/">Live labs</a>
          <a href="/tours/">3-minute tours</a>
          <a href="/cinema/">Cinema</a>
        </nav>
        <a className="os-top-cta" href="/resume/Aaryan-Patel-Professional-Resume.pdf" target="_blank" rel="noreferrer"><Download aria-hidden="true" /> Resume</a>
      </header>

      <main id="os-main">
        <section className="os-hero" aria-labelledby="os-title">
          <div className="os-hero-copy">
            <p className="os-kicker"><span><i /> VERIFIED {evidence.health.lastVerified}</span> RECRUITER ENTRY / 90 SEC</p>
            <h1 id="os-title">I build the layer<br />underneath <em>the model.</em></h1>
            <p className="os-lede">Systems and ML infrastructure engineered with explicit failure modes, reproducible commands, and the benchmark boundary published beside the result.</p>
            <div className="os-primary-actions">
              <a className="os-button primary" href="/labs/">Enter live proof lab <ArrowDown aria-hidden="true" /></a>
              <a className="os-button" href={evidence.owner.github} target="_blank" rel="noreferrer"><Code2 aria-hidden="true" /> Inspect GitHub</a>
            </div>
            <dl className="os-health" aria-label="Verified portfolio summary">
              <div><dt>Measured systems</dt><dd>{evidence.health.measuredSystems}</dd></div>
              <div><dt>Test functions</dt><dd>{Number(evidence.health.testFunctions).toLocaleString()}</dd></div>
              <div><dt>Live labs</dt><dd>{evidence.health.liveLabs}</dd></div>
            </dl>
          </div>

          <div className="os-command" aria-label={`Active ${route.label} architecture signal`}>
            <div className="os-command-head">
              <span><RadioTower aria-hidden="true" /> ARCHITECTURE SIGNAL</span>
              <span className="os-live"><i /> ROUTE ACTIVE</span>
            </div>
            <EngineeringScene activeTrack={activeTrack} />
            <div className="os-route-question">
              <span>{route.short} / {route.label}</span>
              <strong>{routeCopy[activeTrack].question}</strong>
              <small>{routeCopy[activeTrack].signal}</small>
            </div>
            <div className="os-static-path" role="img" aria-label={`${route.label} path: ${pathLabels[activeTrack].join(" to ")}`}>
              {pathLabels[activeTrack].map((label, index) => <span key={label}><i>{String(index + 1).padStart(2, "0")}</i>{label}</span>)}
            </div>
          </div>

          <div className="os-route-dock" role="group" aria-label="Choose a recruiter route">
            {evidence.routes.map((item) => (
              <button key={item.id} type="button" aria-pressed={item.id === activeTrack} onClick={() => setActiveTrack(item.id)}>
                <span>{item.short}</span><strong>{item.label}</strong><small>{item.summary}</small>
              </button>
            ))}
          </div>
        </section>

        <section className="os-proof" id="proof" aria-labelledby="proof-title">
          <div className="os-section-heading">
            <div><p className="os-kicker">ACTIVE PROOF PATH / {route.short}</p><h2 id="proof-title">Three systems. No vague claims.</h2></div>
            <p>Select a route above. Every result links to a proof passport, runnable source, published limitation, and—where available—a live browser lab.</p>
          </div>
          <div className="os-proof-grid">
            <aside className="os-proof-index" aria-label={`${route.label} verification method`}>
              <span>ROLE SIGNAL</span>
              <strong>{route.label}</strong>
              <p>{route.summary}</p>
              <ol>
                <li><ShieldCheck aria-hidden="true" /> Independent oracle</li>
                <li><Workflow aria-hidden="true" /> Reproduction command</li>
                <li><Gauge aria-hidden="true" /> Benchmark boundary</li>
              </ol>
              <a href={`/recruiter/${activeTrack}.pdf`} download><Download aria-hidden="true" /> Download route packet</a>
            </aside>
            <div className="os-project-list">
              {projects.map((project) => <ProjectSignal key={project.id} project={project} />)}
            </div>
          </div>
        </section>

        <section className="os-frontier" id="frontier" aria-labelledby="frontier-title">
          <div className="os-frontier-grid" aria-hidden="true">
            <span className="tensor-node input">INPUT<small>[8,128]</small></span>
            <span className="tensor-node graph">TYPED IR<small>13 → 8 nodes</small></span>
            <span className="tensor-node fused">FUSION<small>8 → 3 kernels</small></span>
            <span className="tensor-node gpu">WEBGPU<small>WGSL dispatch</small></span>
            <span className="tensor-node oracle">ORACLE<small>CPU agreement</small></span>
            <svg viewBox="0 0 1000 350" preserveAspectRatio="none"><path d="M110 175H252C300 175 300 90 355 90H462C520 90 520 252 580 252H680C730 252 730 175 785 175H900" /></svg>
          </div>
          <div className="os-frontier-copy">
            <p className="os-kicker"><Sparkles aria-hidden="true" /> FRONTIER BUILD / LIVE WEBGPU</p>
            <h2 id="frontier-title">TensorForge turns compiler internals into something recruiters can operate.</h2>
            <p>{featured.mechanism}</p>
            <div className="os-frontier-metrics">
              <div><strong>13 → 8</strong><span>graph nodes</span></div>
              <div><strong>{featured.metric}</strong><span>{featured.metricLabel}</span></div>
              <div><strong>CPU</strong><span>numerical oracle</span></div>
            </div>
            <div className="os-primary-actions">
              <a className="os-button primary" href={featured.live} target="_blank" rel="noreferrer"><Zap aria-hidden="true" /> Run TensorForge</a>
              <a className="os-button" href={featured.repo} target="_blank" rel="noreferrer"><Code2 aria-hidden="true" /> Source</a>
            </div>
          </div>
        </section>

        <section className="os-architecture" aria-labelledby="architecture-title">
          <div className="os-section-heading compact">
            <div><p className="os-kicker">ENGINEERING SURFACE</p><h2 id="architecture-title">One verification spine across four domains.</h2></div>
          </div>
          <div className="os-architecture-grid">
            <article><Database aria-hidden="true" /><span>01 / STATE</span><h3>Storage + consensus</h3><p>MVCC, Raft, vectorized execution, deterministic fault injection.</p></article>
            <article><Layers3 aria-hidden="true" /><span>02 / COMPUTE</span><h3>ML infrastructure</h3><p>HNSW retrieval, paged KV scheduling, distributed training, GPU compilation.</p></article>
            <article><CircuitBoard aria-hidden="true" /><span>03 / SENSING</span><h3>Autonomy systems</h3><p>Signal processing, radar image formation, association, VIO evaluation.</p></article>
            <article><Network aria-hidden="true" /><span>04 / VERIFY</span><h3>Evidence engineering</h3><p>Independent oracles, paired seeds, invariants, explicit failure boundaries.</p></article>
          </div>
        </section>

        <section className="os-contact" aria-labelledby="contact-title">
          <div><p className="os-kicker"><CheckCircle2 aria-hidden="true" /> CHANNEL OPEN</p><h2 id="contact-title">Need someone who can explain the benchmark—and defend it?</h2></div>
          <div className="os-contact-actions">
            <a className="os-button primary" href={`mailto:${evidence.owner.email}`}><Mail aria-hidden="true" /> {evidence.owner.email}</a>
            <a className="os-button" href="/resume/Aaryan-Patel-Professional-Resume.pdf" target="_blank" rel="noreferrer"><Download aria-hidden="true" /> Full resume</a>
            <a className="os-button" href="/data/evidence.json" target="_blank" rel="noreferrer"><FileJson aria-hidden="true" /> Evidence JSON</a>
          </div>
        </section>
      </main>

      <footer className="os-footer"><span>AARYAN PATEL / SYSTEMS + ML INFRASTRUCTURE</span><a href="/">Open full observatory <ArrowUpRight aria-hidden="true" /></a></footer>
    </div>
  );
}
