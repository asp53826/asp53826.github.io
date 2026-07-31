import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  CirclePause,
  CirclePlay,
  Download,
  ExternalLink,
  FileCode2,
  Gauge,
  Network,
  Pause,
  Play,
  RadioTower,
  RotateCcw,
  Search,
  ShieldCheck,
  X
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Evidence, Project, TrackId } from "./Observatory";

const flagshipIds = ["raft-mvcc", "edgar-mcp", "track-fusion"];

function projectFor(evidence: Evidence, id: string) {
  return evidence.projects.find((project) => project.id === id)!;
}

function sourceUrl(project: Project, file: string) {
  return `${project.repo}/blob/main/${file}`;
}

export function VerificationTheater({ evidence }: { evidence: Evidence }) {
  const [projectId, setProjectId] = useState(flagshipIds[0]);
  const [eventIndex, setEventIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const experience = evidence.experience.flagships.find((item) => item.projectId === projectId)!;
  const project = projectFor(evidence, projectId);
  const event = experience.events[eventIndex];

  useEffect(() => {
    setEventIndex(0);
    setPlaying(false);
  }, [projectId]);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => {
      setEventIndex((current) => {
        if (current >= experience.events.length - 1) {
          setPlaying(false);
          return current;
        }
        return current + 1;
      });
    }, 10000);
    return () => window.clearInterval(timer);
  }, [playing, experience.events.length]);

  const progress = ((eventIndex + 1) / experience.events.length) * 100;
  const faultActive = event.state === "fault";

  return (
    <section className="theater-section" id="theater" aria-labelledby="theater-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow"><RadioTower aria-hidden="true" /> VERIFICATION THEATER</p>
          <h2 id="theater-title">Break the system. Watch the invariant hold.</h2>
        </div>
        <p>Each 60-second brief replays published test scenarios and benchmark checkpoints. It is evidence playback, not simulated production telemetry.</p>
      </div>

      <div className="theater-selector" role="group" aria-label="Select flagship verification replay">
        {evidence.experience.flagships.map((item) => {
          const candidate = projectFor(evidence, item.projectId);
          return (
            <button
              type="button"
              aria-pressed={item.projectId === projectId}
              key={item.projectId}
              onClick={() => setProjectId(item.projectId)}
            >
              <span>{candidate.name}</span>
              <small>{item.scenarioLabel}</small>
            </button>
          );
        })}
      </div>

      <div className="theater-console" data-project={projectId} data-state={event.state}>
        <header className="console-header">
          <div>
            <span className="console-kicker">REPLAY // {project.name} // {experience.commit}</span>
            <strong>{experience.scenarioLabel}</strong>
          </div>
          <span className={`console-state ${event.state}`}><i /> {event.state}</span>
        </header>

        <div className="console-body">
          <div className="topology-panel" aria-label={`${project.name} scenario topology at ${event.time}`}>
            <div className="topology-label"><Network aria-hidden="true" /> SYSTEM TOPOLOGY</div>
            {projectId === "raft-mvcc" && (
              <div className={`raft-topology${faultActive || eventIndex === 2 ? " partitioned" : ""}`} aria-hidden="true">
                {[1, 2, 3, 4, 5].map((node) => <span key={node} className={`topology-node node-${node}`}>N{node}</span>)}
                <i className="partition-cut" />
              </div>
            )}
            {projectId === "edgar-mcp" && (
              <div className="pipeline-topology" aria-hidden="true">
                {[
                  ["CALLS", eventIndex < 2 ? "burst" : "paced"],
                  ["PACER", eventIndex === 1 ? "fault" : "verified"],
                  ["CACHE", eventIndex === 3 ? "fault" : eventIndex > 3 ? "verified" : "idle"],
                  ["EDGAR", "endpoint"]
                ].map(([label, state]) => <span key={label} data-state={state}>{label}<small>{state}</small></span>)}
              </div>
            )}
            {projectId === "track-fusion" && (
              <div className="tracking-topology" aria-hidden="true">
                <i className="sensor-origin" />
                <span className="track-path path-a" />
                <span className="track-path path-b" />
                <i className="track-target target-a">A</i>
                <i className="track-target target-b">B</i>
                {eventIndex >= 3 && <span className="clutter-field">+ · + · +</span>}
              </div>
            )}
            <div className="topology-readout">
              <span>{event.time}</span>
              <strong>{event.label}</strong>
              <p>{event.detail}</p>
            </div>
          </div>

          <div className="scenario-panel">
            <div className="scenario-summary">
              <span>SCENARIO</span>
              <p>{experience.scenarioSummary}</p>
            </div>
            <div className="invariant-card">
              <ShieldCheck aria-hidden="true" />
              <span><small>INVARIANT UNDER TEST</small><strong>{experience.invariant}</strong></span>
            </div>
            <div className="result-card">
              <Gauge aria-hidden="true" />
              <span><small>PUBLISHED RESULT</small><strong>{experience.result}</strong></span>
            </div>
          </div>
        </div>

        <div className="replay-controls">
          <div className="replay-buttons">
            <button type="button" onClick={() => setPlaying((value) => !value)}>
              {playing ? <><Pause aria-hidden="true" /> Pause film</> : <><Play aria-hidden="true" /> Play 60-second film</>}
            </button>
            <button type="button" aria-label="Reset replay" onClick={() => { setEventIndex(0); setPlaying(false); }}><RotateCcw aria-hidden="true" /></button>
          </div>
          <div className="replay-progress" aria-label={`Replay checkpoint ${eventIndex + 1} of ${experience.events.length}`}>
            <span style={{ width: `${progress}%` }} />
          </div>
          <span className="replay-time">{String((eventIndex + 1) * 10).padStart(2, "0")} / 60 SEC</span>
        </div>

        <div className="event-timeline" role="group" aria-label="Replay checkpoints">
          {experience.events.map((item, index) => (
            <button
              type="button"
              key={`${item.time}-${item.label}`}
              className={index === eventIndex ? "active" : index < eventIndex ? "complete" : ""}
              onClick={() => { setEventIndex(index); setPlaying(false); }}
              aria-current={index === eventIndex ? "step" : undefined}
            >
              <span>{item.time}</span><strong>{item.label}</strong>
            </button>
          ))}
        </div>

        <details className="evidence-drawer">
          <summary><FileCode2 aria-hidden="true" /> Open evidence drawer</summary>
          <div>
            <p>{evidence.experience.disclosure}</p>
            <dl>
              <div><dt>Commit</dt><dd><code>{experience.commit}</code></dd></div>
              <div><dt>Benchmark</dt><dd><code>{experience.benchmarkCommand}</code></dd></div>
              <div><dt>Verified</dt><dd>{evidence.experience.verifiedOn}</dd></div>
            </dl>
            <nav aria-label={`${project.name} source evidence`}>
              {experience.sourceFiles.map((file) => <a key={file} href={sourceUrl(project, file)} target="_blank" rel="noreferrer">{file}<ExternalLink aria-hidden="true" /></a>)}
            </nav>
          </div>
        </details>
      </div>
    </section>
  );
}

export function RecruiterTour({ evidence, activeTrack, onSelectTrack }: { evidence: Evidence; activeTrack: TrackId; onSelectTrack: (track: TrackId) => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const route = evidence.routes.find((item) => item.id === activeTrack)!;
  const projects = route.projects.map((id) => projectFor(evidence, id));
  const scenes = [
    { eyebrow: `${route.short} RECRUITER SIGNAL`, title: route.label, body: route.summary, metric: "03", label: "selected systems" },
    ...projects.map((project) => ({ eyebrow: project.language, title: project.name, body: project.proof, metric: project.metric, label: project.metricLabel })),
    { eyebrow: "EVIDENCE CONTRACT", title: "Every claim has an attack path.", body: evidence.contract, metric: String(new Set(projects.flatMap((project) => project.methods)).size), label: "verification methods" },
    { eyebrow: "START HERE", title: "Inspect. Reproduce. Challenge.", body: "Download the route packet, open the evidence manifest, or run the first project locally.", metric: "05", label: "minutes to first verification" }
  ];
  const scene = scenes[step];

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => {
      setStep((current) => {
        if (current >= scenes.length - 1) {
          setPlaying(false);
          return current;
        }
        return current + 1;
      });
    }, 15000);
    return () => window.clearInterval(timer);
  }, [playing, scenes.length]);

  const open = () => {
    setStep(0);
    setPlaying(true);
    dialogRef.current?.showModal();
  };

  return (
    <>
      <button className="button tour-launch" type="button" onClick={open}><CirclePlay aria-hidden="true" /> Start 90-second recruiter tour</button>
      <dialog className="tour-dialog" ref={dialogRef} onClose={() => setPlaying(false)}>
        <div className="tour-topbar">
          <span>GUIDED SIGNAL // 90 SEC</span>
          <button type="button" onClick={() => dialogRef.current?.close()} aria-label="Close recruiter tour"><X aria-hidden="true" /></button>
        </div>
        <div className="tour-route-switcher" role="group" aria-label="Recruiter tour route">
          {evidence.routes.map((item) => <button type="button" key={item.id} aria-pressed={item.id === activeTrack} onClick={() => { onSelectTrack(item.id); setStep(0); }}>{item.short}</button>)}
        </div>
        <div className="tour-scene" aria-live="polite">
          <p className="eyebrow">{scene.eyebrow}</p>
          <h2>{scene.title}</h2>
          <p>{scene.body}</p>
          <div className="tour-metric"><strong>{scene.metric}</strong><span>{scene.label}</span></div>
        </div>
        <div className="tour-progress"><span style={{ width: `${((step + 1) / scenes.length) * 100}%` }} /></div>
        <div className="tour-controls">
          <button type="button" disabled={step === 0} onClick={() => setStep((value) => Math.max(0, value - 1))}><ArrowLeft aria-hidden="true" /> Previous</button>
          <button type="button" onClick={() => setPlaying((value) => !value)}>{playing ? <><CirclePause aria-hidden="true" /> Pause</> : <><CirclePlay aria-hidden="true" /> Continue</>}</button>
          <button type="button" disabled={step === scenes.length - 1} onClick={() => setStep((value) => Math.min(scenes.length - 1, value + 1))}>Next <ArrowRight aria-hidden="true" /></button>
        </div>
        <footer className="tour-footer">
          <span>{String(step + 1).padStart(2, "0")} / {String(scenes.length).padStart(2, "0")}</span>
          <a href={`/recruiter/${activeTrack}.pdf`} download><Download aria-hidden="true" /> Download {route.short} packet</a>
        </footer>
      </dialog>
    </>
  );
}

export function ExperimentLedger({ evidence }: { evidence: Evidence }) {
  const [projectId, setProjectId] = useState(flagshipIds[0]);
  const experience = evidence.experience.flagships.find((item) => item.projectId === projectId)!;
  const project = projectFor(evidence, projectId);

  return (
    <section className="ledger-section" id="ledger" aria-labelledby="ledger-title">
      <div className="section-heading compact-heading">
        <div><p className="eyebrow">BENCHMARK TIME MACHINE</p><h2 id="ledger-title">The correction is part of the result.</h2></div>
        <p>Published milestones preserve the baseline, the failure that invalidated it, and the corrected measurement.</p>
      </div>
      <div className="ledger-shell">
        <div className="ledger-tabs" role="group" aria-label="Select experiment history">
          {flagshipIds.map((id) => <button type="button" aria-pressed={id === projectId} key={id} onClick={() => setProjectId(id)}>{id}</button>)}
        </div>
        <ol className="ledger-list">
          {experience.history.map((item, index) => (
            <li key={`${item.label}-${index}`}>
              <span className="ledger-index">{String(index + 1).padStart(2, "0")}</span>
              <div><small>{item.commit}</small><strong>{item.label}</strong><p>{item.note}</p></div>
              <b>{item.metric}</b>
            </li>
          ))}
        </ol>
        <div className="freshness-contract">
          <CheckCircle2 aria-hidden="true" />
          <span><strong>Verified {evidence.experience.verifiedOn}</strong><small>{experience.benchmarkCommand}</small></span>
          <a href={project.repo} target="_blank" rel="noreferrer">Repository <ExternalLink aria-hidden="true" /></a>
        </div>
      </div>
    </section>
  );
}

export function ArchitectureConstellation({ evidence, activeTrack, onSelectTrack }: { evidence: Evidence; activeTrack: TrackId; onSelectTrack: (track: TrackId) => void }) {
  return (
    <section className="constellation-section" id="map" aria-labelledby="constellation-title">
      <div className="section-heading compact-heading">
        <div><p className="eyebrow"><Network aria-hidden="true" /> ARCHITECTURE CONSTELLATION</p><h2 id="constellation-title">Twelve systems. One verification spine.</h2></div>
        <p>The map groups projects by the engineering question they answer, then routes every claim back through the same evidence contract.</p>
      </div>
      <div className="constellation-map">
        <div className="constellation-core"><RadioTower aria-hidden="true" /><strong>EVIDENCE</strong><span>command · source · oracle · limit</span></div>
        {evidence.routes.map((route, index) => (
          <button
            type="button"
            className={`constellation-route route-${index + 1}${route.id === activeTrack ? " active" : ""}`}
            key={route.id}
            onClick={() => onSelectTrack(route.id)}
            aria-pressed={route.id === activeTrack}
          >
            <span>{route.short}</span><strong>{route.label}</strong>
            <small>{route.projects.join(" · ")}</small>
          </button>
        ))}
        <svg viewBox="0 0 1000 520" aria-hidden="true" focusable="false">
          <path d="M500 260L220 130M500 260L780 130M500 260L220 390M500 260L780 390" />
          <circle cx="500" cy="260" r="7" />
        </svg>
      </div>
    </section>
  );
}

function scoreProject(project: Project, query: string) {
  const words = query.toLowerCase().split(/\W+/).filter((word) => word.length > 2);
  const haystack = [project.id, project.name, project.track, project.language, project.tagline, project.problem, project.mechanism, project.attack, project.proof, project.limitation, ...project.methods].join(" ").toLowerCase();
  return words.reduce((score, word) => score + (haystack.includes(word) ? 1 : 0), project.name.toLowerCase() === query.trim().toLowerCase() ? 10 : 0);
}

function answerFor(project: Project, query: string) {
  const normalized = query.toLowerCase();
  if (/limit|lose|failure|wrong|boundary/.test(normalized)) return project.limitation;
  if (/run|clone|start|command|reproduce/.test(normalized)) return project.command;
  if (/verify|proof|test|attack|oracle|check/.test(normalized)) return `${project.attack} Verification methods: ${project.methods.join(", ")}. ${project.proof}`;
  if (/metric|benchmark|result|fast|performance/.test(normalized)) return `${project.metric} ${project.metricLabel}. ${project.proof}`;
  return `${project.problem} Mechanism: ${project.mechanism}`;
}

export function EvidenceDesk({ evidence }: { evidence: Evidence }) {
  const [query, setQuery] = useState("How did raft-mvcc verify safety under a partition?");
  const [submitted, setSubmitted] = useState(query);
  const ranked = useMemo(() => evidence.projects
    .map((project) => ({ project, score: scoreProject(project, submitted) }))
    .sort((a, b) => b.score - a.score), [evidence.projects, submitted]);
  const result = ranked[0]?.score > 0 ? ranked[0].project : undefined;
  const experience = result ? evidence.experience.flagships.find((item) => item.projectId === result.id) : undefined;

  return (
    <section className="desk-section" id="evidence-desk" aria-labelledby="desk-title">
      <div className="section-heading compact-heading">
        <div><p className="eyebrow"><Search aria-hidden="true" /> EVIDENCE DESK</p><h2 id="desk-title">Ask the work. Get the source.</h2></div>
        <p>This is deterministic manifest search—not a generative chatbot. Answers can only use committed project claims, commands, methods, and limitations.</p>
      </div>
      <div className="desk-shell">
        <form onSubmit={(event) => { event.preventDefault(); setSubmitted(query); }}>
          <label htmlFor="evidence-question">Question about the portfolio</label>
          <div><Search aria-hidden="true" /><input id="evidence-question" value={query} onChange={(event) => setQuery(event.target.value)} /><button type="submit">Search evidence</button></div>
          <div className="desk-prompts" aria-label="Suggested evidence questions">
            {[
              "Where does track-fusion lose?",
              "How do I reproduce edgar-mcp?",
              "What verifies annlite recall?",
              "Which project uses fault injection?"
            ].map((prompt) => <button type="button" key={prompt} onClick={() => { setQuery(prompt); setSubmitted(prompt); }}>{prompt}</button>)}
          </div>
        </form>
        <article className="desk-answer" aria-live="polite">
          {result ? (
            <>
              <header><span>MATCH // {result.name}</span><b>{result.metric} {result.metricLabel}</b></header>
              <p>{answerFor(result, submitted)}</p>
              <div className="answer-sources">
                <span><ShieldCheck aria-hidden="true" /> {result.methods.join(" · ")}</span>
                <a href={`${result.repo}#readme`} target="_blank" rel="noreferrer">README <ExternalLink aria-hidden="true" /></a>
                {experience && <a href={sourceUrl(result, experience.sourceFiles[0])} target="_blank" rel="noreferrer">Primary source <ExternalLink aria-hidden="true" /></a>}
                <a href="/data/evidence.json" target="_blank" rel="noreferrer">Manifest <ExternalLink aria-hidden="true" /></a>
              </div>
            </>
          ) : (
            <><header><span>NO MATCH</span></header><p>No committed evidence matches that question. Try a project name, method, result, or limitation.</p></>
          )}
        </article>
      </div>
    </section>
  );
}

export function PostmortemIndex({ evidence }: { evidence: Evidence }) {
  return (
    <section className="postmortem-section" id="postmortems" aria-labelledby="postmortem-title">
      <div className="section-heading compact-heading">
        <div><p className="eyebrow"><AlertTriangle aria-hidden="true" /> ENGINEERING POSTMORTEMS</p><h2 id="postmortem-title">The flattering answer was not the final answer.</h2></div>
        <p>Three short records of a plausible result being invalidated by a stronger measurement.</p>
      </div>
      <div className="postmortem-grid">
        {evidence.experience.flagships.map((item) => {
          const project = projectFor(evidence, item.projectId);
          return (
            <article key={item.projectId}>
              <header><span>{project.name}</span><small>{item.commit}</small></header>
              <dl>
                <div><dt>What failed</dt><dd>{item.postmortem.failure}</dd></div>
                <div><dt>Signal</dt><dd>{item.postmortem.signal}</dd></div>
                <div><dt>Correction</dt><dd>{item.postmortem.correction}</dd></div>
                <div className="lesson"><dt>Engineering lesson</dt><dd>{item.postmortem.lesson}</dd></div>
              </dl>
            </article>
          );
        })}
      </div>
    </section>
  );
}
