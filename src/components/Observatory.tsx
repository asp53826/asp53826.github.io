import {
  Activity,
  ArrowUpRight,
  Check,
  ChevronRight,
  Code2,
  Copy,
  Download,
  ExternalLink,
  FileJson,
  Mail,
  Moon,
  Radio,
  Search,
  ShieldCheck,
  Sun,
  Terminal,
  X
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArchitectureConstellation,
  EvidenceDesk,
  ExperimentLedger,
  PostmortemIndex,
  RecruiterTour,
  VerificationTheater
} from "./ExperienceModules";
import MotionDirector from "./MotionDirector";

export type TrackId = "systems" | "quant" | "defense" | "ml-infrastructure";

export type Route = {
  id: TrackId;
  label: string;
  short: string;
  summary: string;
  projects: string[];
};

export type Project = {
  id: string;
  name: string;
  track: TrackId;
  language: string;
  tagline: string;
  problem: string;
  mechanism: string;
  attack: string;
  metric: string;
  metricLabel: string;
  proof: string;
  limitation: string;
  command: string;
  repo: string;
  live?: string;
  methods: string[];
};

export type ReplayEvent = {
  time: string;
  label: string;
  detail: string;
  state: "healthy" | "fault" | "contained" | "recovering" | "verified";
};

export type FlagshipExperience = {
  projectId: string;
  commit: string;
  benchmarkCommand: string;
  sourceFiles: string[];
  scenarioLabel: string;
  scenarioSummary: string;
  invariant: string;
  result: string;
  events: ReplayEvent[];
  history: Array<{ label: string; commit: string; metric: string; note: string }>;
  postmortem: { failure: string; signal: string; correction: string; lesson: string };
};

export type Evidence = {
  generated: string;
  owner: {
    name: string;
    email: string;
    github: string;
    linkedin: string;
    site: string;
    role: string;
    education: string;
    work: string;
  };
  thesis: string;
  contract: string;
  health: Record<string, number | string>;
  current: {
    title: string;
    repo: string;
    status: string;
    summary: string;
    proof: string;
  };
  experience: {
    verifiedOn: string;
    disclosure: string;
    flagships: FlagshipExperience[];
  };
  routes: Route[];
  projects: Project[];
};

type Props = {
  evidence: Evidence;
  initialTrack: TrackId;
};

type CommandItem = {
  id: string;
  label: string;
  detail: string;
  keywords: string;
  run: () => void;
};

const flagshipIds = ["raft-mvcc", "edgar-mcp", "track-fusion"];

function CopyCommand({ command, compact = false }: { command: string; compact?: boolean }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(command);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className={`command-snippet${compact ? " compact" : ""}`}>
      <span className="prompt" aria-hidden="true">$</span>
      <code>{command}</code>
      <button type="button" onClick={copy} aria-label={copied ? "Command copied" : "Copy command"}>
        {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
      </button>
      <span className="visually-hidden" aria-live="polite">{copied ? "Command copied to clipboard" : ""}</span>
    </div>
  );
}

function ProjectCard({ project, featured = false, verifiedOn }: { project: Project; featured?: boolean; verifiedOn: string }) {
  return (
    <article className={`project-card${featured ? " featured" : ""}`}>
      <header>
        <div>
          <p className="project-language">{project.language}</p>
          <h3>{project.name}</h3>
        </div>
        <a href={project.repo} target="_blank" rel="noreferrer" aria-label={`Open ${project.name} on GitHub`}>
          <ArrowUpRight aria-hidden="true" />
        </a>
      </header>
      <p className="project-tagline">{project.tagline}</p>
      <div className="metric-lockup">
        <strong>{project.metric}</strong>
        <span>{project.metricLabel}</span>
      </div>
      <p className="project-proof">{project.proof}</p>
      <div className="proof-freshness"><span><i /> VERIFIED</span><time dateTime={verifiedOn}>{verifiedOn}</time></div>
      <details>
        <summary>Inspect proof chain</summary>
        <dl className="proof-chain">
          <div><dt>Problem</dt><dd>{project.problem}</dd></div>
          <div><dt>Mechanism</dt><dd>{project.mechanism}</dd></div>
          <div><dt>Attack</dt><dd>{project.attack}</dd></div>
          <div className="limit"><dt>Failure boundary</dt><dd>{project.limitation}</dd></div>
        </dl>
      </details>
      <CopyCommand command={project.command} compact />
      {project.live && (
        <a className="text-link" href={project.live} target="_blank" rel="noreferrer">
          Open live lab <ExternalLink aria-hidden="true" />
        </a>
      )}
    </article>
  );
}

export default function Observatory({ evidence, initialTrack }: Props) {
  const [activeTrack, setActiveTrack] = useState<TrackId>(initialTrack);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [compareA, setCompareA] = useState("raft-mvcc");
  const [compareB, setCompareB] = useState("edgar-mcp");
  const [query, setQuery] = useState("");
  const [commandIndex, setCommandIndex] = useState(0);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const commandButtonRef = useRef<HTMLButtonElement>(null);

  const route = evidence.routes.find((item) => item.id === activeTrack) ?? evidence.routes[0];
  const routeProjects = route.projects.map((id) => evidence.projects.find((project) => project.id === id)!).filter(Boolean);
  const flagships = flagshipIds.map((id) => evidence.projects.find((project) => project.id === id)!).filter(Boolean);
  const projectA = evidence.projects.find((project) => project.id === compareA)!;
  const projectB = evidence.projects.find((project) => project.id === compareB)!;
  const liveLabs = evidence.projects.filter((project) => project.live);

  const chooseTrack = (id: TrackId) => {
    setActiveTrack(id);
    const path = `/${id}/`;
    window.history.pushState({ track: id }, "", path);
    const selected = evidence.routes.find((item) => item.id === id);
    if (selected) document.title = `${selected.label} | Aaryan Systems Observatory`;
  };

  const openPalette = () => {
    setQuery("");
    setCommandIndex(0);
    dialogRef.current?.showModal();
    window.requestAnimationFrame(() => searchRef.current?.focus());
  };

  const closePalette = () => {
    dialogRef.current?.close();
    commandButtonRef.current?.focus();
  };

  const commands: CommandItem[] = useMemo(() => {
    const routeCommands = evidence.routes.map((item) => ({
      id: `route-${item.id}`,
      label: `Open ${item.label} signal`,
      detail: item.summary,
      keywords: `${item.label} ${item.short} ${item.projects.join(" ")}`,
      run: () => chooseTrack(item.id)
    }));
    const projectCommands = evidence.projects.map((project) => ({
      id: `project-${project.id}`,
      label: `Open ${project.name}`,
      detail: `${project.metric} ${project.metricLabel}`,
      keywords: `${project.name} ${project.track} ${project.language} ${project.methods.join(" ")}`,
      run: () => window.open(project.repo, "_blank", "noopener,noreferrer")
    }));
    return [
      ...routeCommands,
      ...projectCommands,
      {
        id: "resume",
        label: "Download ATS systems resume",
        detail: "One-page recruiter resume with experience, skills, and measured engineering results.",
        keywords: "resume cv pdf recruiter download",
        run: () => { window.location.href = "/resume/Aaryan-Patel-Systems-Resume.pdf"; }
      },
      {
        id: "resume-docx",
        label: "Download editable resume",
        detail: "ATS-friendly Microsoft Word version for applications that request DOCX.",
        keywords: "resume cv docx word editable recruiter download",
        run: () => { window.location.href = "/resume/Aaryan-Patel-Systems-Resume.docx"; }
      },
      {
        id: "manifest",
        label: "Open evidence manifest",
        detail: "Machine-readable claims, commands, methods, and limitations.",
        keywords: "json evidence source benchmark proof",
        run: () => window.open("/data/evidence.json", "_blank", "noopener,noreferrer")
      },
      {
        id: "email",
        label: "Email Aaryan",
        detail: evidence.owner.email,
        keywords: "contact email hire",
        run: () => { window.location.href = `mailto:${evidence.owner.email}`; }
      }
    ];
  }, [evidence]);

  const filteredCommands = commands.filter((item) => {
    const haystack = `${item.label} ${item.detail} ${item.keywords}`.toLowerCase();
    return haystack.includes(query.trim().toLowerCase());
  });

  const runCommand = (item: CommandItem) => {
    dialogRef.current?.close();
    item.run();
  };

  useEffect(() => {
    const saved = document.documentElement.dataset.theme === "light" ? "light" : "dark";
    setTheme(saved);
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        openPalette();
      }
    };
    const onPopState = () => {
      const segment = window.location.pathname.split("/").filter(Boolean)[0] as TrackId | undefined;
      if (segment && evidence.routes.some((item) => item.id === segment)) setActiveTrack(segment);
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("popstate", onPopState);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("popstate", onPopState);
    };
  }, [evidence.routes]);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    localStorage.setItem("observatory-theme", next);
  };

  const handlePaletteKeys = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setCommandIndex((index) => Math.min(index + 1, filteredCommands.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setCommandIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter" && filteredCommands[commandIndex]) {
      event.preventDefault();
      runCommand(filteredCommands[commandIndex]);
    }
  };

  const compareRows = [
    ["Problem", projectA.problem, projectB.problem],
    ["Mechanism", projectA.mechanism, projectB.mechanism],
    ["Strongest proof", `${projectA.metric} ${projectA.metricLabel}`, `${projectB.metric} ${projectB.metricLabel}`],
    ["Verification", projectA.methods.join(" · "), projectB.methods.join(" · ")],
    ["Failure boundary", projectA.limitation, projectB.limitation]
  ];

  return (
    <div className="observatory-shell" data-track={activeTrack}>
      <MotionDirector />
      <a className="skip-link" href="#main-content">Skip to portfolio evidence</a>

      <header className="topbar">
        <a className="brand" href="/" aria-label="Aaryan Systems Observatory home">
          <span className="brand-mark" aria-hidden="true">AP</span>
          <span><strong>Aaryan Patel</strong><small>Systems Observatory</small></span>
        </a>
        <nav aria-label="Primary">
          <a href="#theater">Verification theater</a>
          <a href="#map">System map</a>
          <a href="#evidence-desk">Ask evidence</a>
          <a href="/data/evidence.json" target="_blank" rel="noreferrer">Evidence</a>
          <a href="/resume/Aaryan-Patel-Systems-Resume.pdf" target="_blank" rel="noreferrer">Resume</a>
        </nav>
        <div className="topbar-actions">
          <button ref={commandButtonRef} className="command-trigger" type="button" onClick={openPalette} aria-label="Search portfolio evidence">
            <Search aria-hidden="true" /> <span>Search evidence</span> <kbd>⌘K</kbd>
          </button>
          <button className="icon-button" type="button" onClick={toggleTheme} aria-label={`Use ${theme === "dark" ? "light" : "dark"} theme`}>
            {theme === "dark" ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
          </button>
        </div>
      </header>

      <main id="main-content">
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-radar" aria-hidden="true">
            <span className="radar-ring ring-1" />
            <span className="radar-ring ring-2" />
            <span className="radar-ring ring-3" />
            <span className="radar-crosshair" />
            <i className="radar-sweep" />
            <b className="radar-target target-1" />
            <b className="radar-target target-2" />
            <b className="radar-target target-3" />
          </div>
          <div className="hero-copy">
            <p className="eyebrow"><Radio aria-hidden="true" /> LIVE EVIDENCE SURFACE</p>
            <h1 id="hero-title">{evidence.thesis}</h1>
            <p className="hero-contract">{evidence.contract}</p>
            <div className="hero-actions">
              <a className="button primary" href="#routes">Choose a recruiter route <ChevronRight aria-hidden="true" /></a>
              <RecruiterTour evidence={evidence} activeTrack={activeTrack} onSelectTrack={chooseTrack} />
              <a className="button" href="/resume/Aaryan-Patel-Systems-Resume.pdf" download>
                <Download aria-hidden="true" /> Download ATS resume
              </a>
            </div>
          </div>
          <div className="hero-instrument" aria-label="Portfolio verification overview">
            <div className="instrument-header">
              <span>OBSERVATORY // BUILD 01</span>
              <span className="status"><i /> SOURCE BACKED</span>
            </div>
            <div className="instrument-grid">
              <div><span>Measured systems</span><strong data-count={evidence.health.measuredSystems}>{evidence.health.measuredSystems}</strong></div>
              <div><span>Test functions</span><strong data-count={evidence.health.testFunctions}>{Number(evidence.health.testFunctions).toLocaleString()}</strong></div>
              <div><span>Live labs</span><strong data-count={evidence.health.liveLabs}>{evidence.health.liveLabs}</strong></div>
              <div><span>Languages</span><strong data-count={evidence.health.languages}>{evidence.health.languages}</strong></div>
            </div>
            <div className="proof-spine" role="img" aria-label="Evidence pipeline: claim, attack, oracle, and failure boundary">
              <span className="proof-rail" aria-hidden="true"><i className="proof-rail-live" /></span>
              <i className="proof-packet" aria-hidden="true" />
              <div className="proof-stage"><small>01</small><strong>CLAIM</strong><span>published</span></div>
              <div className="proof-stage"><small>02</small><strong>ATTACK</strong><span>fault injected</span></div>
              <div className="proof-stage"><small>03</small><strong>ORACLE</strong><span>independent</span></div>
              <div className="proof-stage"><small>04</small><strong>LIMIT</strong><span>disclosed</span></div>
            </div>
            <p>No page-load API. No third-party stats card. Every claim is committed with its source.</p>
          </div>
        </section>

        <section className="current-strip" aria-label="Currently building">
          <span className="live-dot" aria-hidden="true" />
          <p><strong>Currently building:</strong> {evidence.current.title}</p>
          <span>{evidence.current.summary}</span>
          <a href="https://github.com/asp53826/asp53826.github.io">Open source <ArrowUpRight aria-hidden="true" /></a>
        </section>

        <VerificationTheater evidence={evidence} />

        <section className="routes-section" id="routes" aria-labelledby="routes-title">
          <div className="section-heading">
            <div><p className="eyebrow">RECRUITER ENTRY ROUTES</p><h2 id="routes-title">Choose the signal that matches the role.</h2></div>
            <p>Each route is a shareable view with three high-signal systems, proof methods, limitations, and reproduction commands.</p>
          </div>
          <div className="route-grid">
            {evidence.routes.map((item) => (
              <button
                type="button"
                key={item.id}
                className={`route-card${item.id === activeTrack ? " active" : ""}`}
                onClick={() => chooseTrack(item.id)}
                aria-pressed={item.id === activeTrack}
              >
                <span className="route-code">{item.short}</span>
                <strong>{item.label}</strong>
                <span>{item.summary}</span>
                <small>{item.projects.join(" · ")}</small>
              </button>
            ))}
          </div>
          <div className="signal-path" data-track={activeTrack} aria-hidden="true"><span /></div>
          <p className="visually-hidden" aria-live="polite">Showing the {route.label} recruiter route.</p>
          <div className="route-packet-bar">
            <span><FileJson aria-hidden="true" /> {route.short} evidence packet</span>
            <a href={`/recruiter/${activeTrack}.pdf`} download><Download aria-hidden="true" /> Download recruiter PDF</a>
            <a href={`/recruiter/${activeTrack}.json`} target="_blank" rel="noreferrer">Open JSON <ArrowUpRight aria-hidden="true" /></a>
          </div>
        </section>

        <ArchitectureConstellation evidence={evidence} activeTrack={activeTrack} onSelectTrack={chooseTrack} />

        <section className="route-output" aria-labelledby="route-output-title">
          <div className="section-heading compact-heading">
            <div><p className="eyebrow">ACTIVE SIGNAL // {route.short}</p><h2 id="route-output-title">{route.label}</h2></div>
            <p>{route.summary}</p>
          </div>
          <div className="project-grid">
            {routeProjects.map((project) => <ProjectCard key={project.id} project={project} verifiedOn={evidence.experience.verifiedOn} />)}
          </div>
        </section>

        <section id="flagships" className="flagship-section" aria-labelledby="flagship-title">
          <div className="section-heading">
            <div><p className="eyebrow">THREE FLAGSHIP PROOF PASSPORTS</p><h2 id="flagship-title">Claim, mechanism, attack, result, reproduce.</h2></div>
            <p>The failure boundary is part of the card because knowing what a result does not prove is engineering evidence.</p>
          </div>
          <div className="flagship-grid">
            {flagships.map((project) => <ProjectCard key={project.id} project={project} featured verifiedOn={evidence.experience.verifiedOn} />)}
          </div>
        </section>

        <ExperimentLedger evidence={evidence} />

        <PostmortemIndex evidence={evidence} />

        <EvidenceDesk evidence={evidence} />

        <section className="compare-section" id="compare" aria-labelledby="compare-title">
          <div className="section-heading compact-heading">
            <div><p className="eyebrow">SYSTEM COMPARATOR</p><h2 id="compare-title">Compare mechanisms, not logos.</h2></div>
            <p>Put any two public systems on the same evidence axes.</p>
          </div>
          <div className="compare-controls">
            <label>First system<select value={compareA} onChange={(event) => setCompareA(event.target.value)}>{evidence.projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label>
            <span aria-hidden="true">VERSUS</span>
            <label>Second system<select value={compareB} onChange={(event) => setCompareB(event.target.value)}>{evidence.projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label>
          </div>
          <div className="compare-table-wrap" tabIndex={0} aria-label={`Comparison of ${projectA.name} and ${projectB.name}`}>
            <table>
              <thead><tr><th scope="col">Evidence axis</th><th scope="col">{projectA.name}</th><th scope="col">{projectB.name}</th></tr></thead>
              <tbody>{compareRows.map(([label, a, b]) => <tr key={label}><th scope="row">{label}</th><td>{a}</td><td>{b}</td></tr>)}</tbody>
            </table>
          </div>
        </section>

        <section className="methods-section" aria-labelledby="methods-title">
          <div className="section-heading compact-heading">
            <div><p className="eyebrow">PROOF METHOD INDEX</p><h2 id="methods-title">Evidence has a method.</h2></div>
            <p>Every headline result names the mechanism used to challenge it.</p>
          </div>
          <div className="method-cloud">
            {Array.from(new Set(evidence.projects.flatMap((project) => project.methods))).sort().map((method) => {
              const count = evidence.projects.filter((project) => project.methods.includes(method)).length;
              return <span key={method}><ShieldCheck aria-hidden="true" /> {method}<small>{count}</small></span>;
            })}
          </div>
        </section>

        <section className="live-section" aria-labelledby="live-title">
          <div className="section-heading compact-heading">
            <div><p className="eyebrow">INTERACTIVE RESULTS</p><h2 id="live-title">Drive the variables yourself.</h2></div>
            <p>Four static-first labs with every figure traceable to the benchmark that produced it.</p>
          </div>
          <div className="live-grid">
            {liveLabs.map((project) => (
              <a key={project.id} href={project.live} target="_blank" rel="noreferrer">
                <Activity aria-hidden="true" /><span><strong>{project.name}</strong><small>{project.tagline}</small></span><ArrowUpRight aria-hidden="true" />
              </a>
            ))}
          </div>
        </section>

        <section className="open-channel" aria-labelledby="contact-title">
          <div>
            <p className="eyebrow">OPEN CHANNEL</p>
            <h2 id="contact-title">Inspect the work. Challenge the benchmark.</h2>
            <p>{evidence.owner.education}. {evidence.owner.work}.</p>
          </div>
          <div className="contact-actions">
            <a className="button primary" href={`mailto:${evidence.owner.email}`}><Mail aria-hidden="true" /> {evidence.owner.email}</a>
            <a className="button" href={evidence.owner.github} target="_blank" rel="noreferrer"><Code2 aria-hidden="true" /> GitHub</a>
            <a className="button" href="/data/evidence.json" target="_blank" rel="noreferrer"><FileJson aria-hidden="true" /> Evidence JSON</a>
          </div>
        </section>
      </main>

      <aside className="health-rail" aria-label="Live portfolio health">
        <div className="health-heading"><Activity aria-hidden="true" /><span><strong>Portfolio health</strong><small>Refreshed {String(evidence.health.lastVerified)}</small></span></div>
        <dl>
          <div><dt>Systems</dt><dd>{evidence.health.measuredSystems}</dd></div>
          <div><dt>Tests</dt><dd>{evidence.health.testFunctions}</dd></div>
          <div><dt>Live</dt><dd>{evidence.health.liveLabs}</dd></div>
          <div><dt>CI</dt><dd className="verified">PASS</dd></div>
        </dl>
      </aside>

      <footer>
        <p>Aaryan Patel // Systems Observatory</p>
        <p>Static-first. Source-backed. MIT-licensed systems.</p>
      </footer>

      <dialog ref={dialogRef} className="command-dialog" onClose={() => setQuery("")}>
        <div className="command-dialog-header">
          <Search aria-hidden="true" />
          <label className="visually-hidden" htmlFor="command-search">Search portfolio evidence</label>
          <input
            ref={searchRef}
            id="command-search"
            value={query}
            onChange={(event) => { setQuery(event.target.value); setCommandIndex(0); }}
            onKeyDown={handlePaletteKeys}
            placeholder="Search projects, proof methods, routes, or actions…"
            autoComplete="off"
          />
          <button type="button" onClick={closePalette} aria-label="Close command palette"><X aria-hidden="true" /></button>
        </div>
        <div className="command-results" aria-label="Portfolio commands">
          {filteredCommands.length > 0 ? filteredCommands.map((item, index) => (
            <button
              type="button"
              aria-current={index === commandIndex ? "true" : undefined}
              className={index === commandIndex ? "selected" : ""}
              key={item.id}
              onMouseEnter={() => setCommandIndex(index)}
              onClick={() => runCommand(item)}
            >
              <Terminal aria-hidden="true" /><span><strong>{item.label}</strong><small>{item.detail}</small></span><ChevronRight aria-hidden="true" />
            </button>
          )) : <p className="empty-command">No matching evidence. Try a project name, role, language, or proof method.</p>}
        </div>
        <div className="command-footer"><span><kbd>↑</kbd><kbd>↓</kbd> Navigate</span><span><kbd>↵</kbd> Open</span><span><kbd>esc</kbd> Close</span></div>
      </dialog>
    </div>
  );
}
