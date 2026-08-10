import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  CheckCircle2,
  CircleOff,
  Clipboard,
  ExternalLink,
  GitBranch,
  Network,
  Play,
  RefreshCw,
  ShieldCheck,
  Split,
  Unplug,
  XCircle
} from "lucide-react";

type NodeState = {
  id: number;
  role: "follower" | "candidate" | "leader";
  term: number;
  commit: number;
  lastIndex: number;
  leader: number | null;
  digest: string;
};

type ClusterState = {
  engine: string;
  tick: number;
  dropped: number;
  isolated: number;
  event: string;
  nodes: NodeState[];
};

type HistoryResult = {
  linearizable: boolean;
  exploredStates: number;
  witness: number[];
};

type EmscriptenModule = {
  ccall: (name: string, returnType: string, argumentTypes: string[], arguments_: unknown[]) => string;
};

type TapeEvent = {
  sequence: number;
  token: string;
  label: string;
  tick: number;
};

const initialState: ClusterState = {
  engine: "Loading C++17/WASM",
  tick: 0,
  dropped: 0,
  isolated: 0,
  event: "Loading the compiled Raft + MVCC engine…",
  nodes: Array.from({ length: 5 }, (_, index) => ({
    id: index + 1,
    role: "follower",
    term: 0,
    commit: 0,
    lastIndex: 0,
    leader: null,
    digest: ""
  }))
};

const nodePositions = [
  [50, 13],
  [84, 39],
  [71, 83],
  [29, 83],
  [16, 39]
];

const scenarios = [
  { id: "election", label: "Clean election", tokens: ["r", "c1", "p"] },
  { id: "minority", label: "Minority leader", tokens: ["r", "c1", "i1", "p", "t11"] },
  { id: "repair", label: "Heal and repair", tokens: ["r", "c1", "i1", "p", "t11", "h", "t5"] },
  { id: "stale", label: "Stale-read oracle", tokens: ["r", "v", "s"] }
];

function resultFrom(module: EmscriptenModule, name: string, types: string[] = [], args: unknown[] = []) {
  return JSON.parse(module.ccall(name, "string", types, args));
}

export default function FaultlineLab() {
  const engineRef = useRef<EmscriptenModule | null>(null);
  const sequenceRef = useRef(0);
  const [cluster, setCluster] = useState<ClusterState>(initialState);
  const [historyResult, setHistoryResult] = useState<HistoryResult | null>(null);
  const [tape, setTape] = useState<TapeEvent[]>([]);
  const [selectedNode, setSelectedNode] = useState(1);
  const [ready, setReady] = useState(false);
  const [engineError, setEngineError] = useState("");
  const [copied, setCopied] = useState(false);
  const [running, setRunning] = useState(false);
  const [tokens, setTokens] = useState<string[]>([]);

  const appendTape = useCallback((token: string, state: ClusterState, label = state.event) => {
    sequenceRef.current += 1;
    setTape((current) => [
      ...current.slice(-7),
      { sequence: sequenceRef.current, token, label, tick: state.tick }
    ]);
  }, []);

  const updateUrl = useCallback((nextTokens: string[]) => {
    const url = new URL(window.location.href);
    if (nextTokens.length) url.searchParams.set("run", nextTokens.join("."));
    else url.searchParams.delete("run");
    window.history.replaceState({}, "", url);
  }, []);

  const runToken = useCallback((token: string, record = true) => {
    const module = engineRef.current;
    if (!module) return;
    let state: ClusterState | null = null;
    if (token === "r") state = resultFrom(module, "faultline_reset");
    else if (token.startsWith("c")) state = resultFrom(module, "faultline_campaign", ["number"], [Number(token.slice(1))]);
    else if (token.startsWith("i")) state = resultFrom(module, "faultline_isolate", ["number"], [Number(token.slice(1))]);
    else if (token.startsWith("t")) state = resultFrom(module, "faultline_tick", ["number"], [Number(token.slice(1))]);
    else if (token === "h") state = resultFrom(module, "faultline_heal");
    else if (token === "p") state = resultFrom(module, "faultline_propose", ["number", "string", "string"], [7, "account/alice", "90"]);
    else if (token === "v" || token === "s") {
      const result = resultFrom(module, "faultline_check_history", ["number"], [token === "s" ? 1 : 0]) as HistoryResult;
      setHistoryResult(result);
      const current = resultFrom(module, "faultline_snapshot") as ClusterState;
      appendTape(token, current, result.linearizable
        ? `History accepted; witness ${result.witness.join(" → ")}.`
        : `Stale read rejected after ${result.exploredStates} explored states.`);
    }
    if (state) {
      setCluster(state);
      appendTape(token, state);
    }
    if (record) {
      setTokens((current) => {
        const next = token === "r" ? ["r"] : [...current, token];
        updateUrl(next);
        return next;
      });
    }
  }, [appendTape, updateUrl]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const modulePath = "/wasm/faultline/faultline-engine.mjs";
        const imported = await import(/* @vite-ignore */ modulePath);
        const wasm = await fetch("/wasm/faultline/faultline-engine.wasm").then((response) => {
          if (!response.ok) throw new Error(`WASM fetch failed with ${response.status}`);
          return response.arrayBuffer();
        });
        const module = await imported.default({
          locateFile: (path: string) => `/wasm/faultline/${path}`,
          instantiateWasm(imports: WebAssembly.Imports, success: (instance: WebAssembly.Instance) => void) {
            WebAssembly.instantiate(wasm, imports).then(({ instance }) => success(instance));
          }
        }) as EmscriptenModule;
        if (!active) return;
        engineRef.current = module;
        const restored = new URLSearchParams(window.location.search).get("run")?.split(".").filter(Boolean) ?? [];
        const start = resultFrom(module, "faultline_reset") as ClusterState;
        setCluster(start);
        setReady(true);
        appendTape("r", start);
        if (restored.length) {
          setTokens(restored);
          for (const token of restored) {
            if (token !== "r") runToken(token, false);
          }
        }
      } catch (error) {
        if (!active) return;
        setEngineError(error instanceof Error ? error.message : "The WebAssembly engine did not load.");
      }
    };
    void load();
    return () => { active = false; };
  }, [appendTape, runToken]);

  const runScenario = async (scenarioTokens: string[]) => {
    if (!ready || running) return;
    setRunning(true);
    setTokens([]);
    updateUrl([]);
    for (const token of scenarioTokens) {
      runToken(token);
      if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        await new Promise((resolve) => window.setTimeout(resolve, 380));
      }
    }
    setRunning(false);
  };

  const leaders = cluster.nodes.filter((node) => node.role === "leader");
  const leaderCount = leaders.length;
  const leadersPerTerm = leaders.reduce((counts, node) => counts.set(node.term, (counts.get(node.term) ?? 0) + 1), new Map<number, number>());
  const electionSafe = [...leadersPerTerm.values()].every((count) => count <= 1);
  const commits = cluster.nodes.map((node) => node.commit);
  const digests = cluster.nodes.map((node) => node.digest);
  const invariants = useMemo(() => [
    {
      label: "Election safety",
      pass: electionSafe,
      detail: electionSafe
        ? `${leaderCount} visible leader${leaderCount === 1 ? "" : "s"}${leaderCount > 1 ? " in distinct terms" : ""}`
        : "multiple leaders share one term"
    },
    {
      label: "Commit convergence",
      pass: new Set(commits).size === 1,
      detail: new Set(commits).size === 1 ? `all nodes at index ${commits[0]}` : `commit indexes ${commits.join(" / ")}`
    },
    {
      label: "State convergence",
      pass: new Set(digests).size === 1,
      detail: new Set(digests).size === 1 ? "all MVCC digests agree" : "partitioned replicas differ"
    },
    {
      label: "History oracle",
      pass: historyResult?.linearizable ?? true,
      detail: historyResult ? `${historyResult.exploredStates} states explored` : "run a valid or stale history"
    }
  ], [cluster.nodes, commits, digests, electionSafe, historyResult, leaderCount]);

  const copyScenario = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="lab-app faultline-app">
      <a className="skip-link" href="#lab-console">Skip to FAULTLINE controls</a>
      <header className="lab-topbar">
        <a className="lab-wordmark" href="/labs/"><span>AP</span><strong>Proof Laboratory</strong></a>
        <nav aria-label="Laboratory navigation">
          <a aria-current="page" href="/labs/faultline/">FAULTLINE</a>
          <a href="/labs/signalroom/">SIGNALROOM</a>
          <a href="/labs/marketwire/">MARKETWIRE</a>
          <a href="/labs/kernelarena/">KERNELARENA</a>
        </nav>
        <a className="lab-back" href="/recruiter/">Recruiter OS <ExternalLink aria-hidden="true" /></a>
      </header>

      <main>
        <section className="lab-intro" aria-labelledby="faultline-title">
          <div>
            <p className="lab-kicker">LAB 01 / CONSENSUS + STORAGE / C++17 → WASM</p>
            <h1 id="faultline-title">Break the cluster.<br />Inspect the proof.</h1>
          </div>
          <p>Operate the actual `raft-mvcc` protocol sources in your browser. Every control changes deterministic logical state; no animation invents a network event the engine did not produce.</p>
        </section>

        <section className="lab-console" id="lab-console" aria-label="Interactive five-node Raft and MVCC laboratory">
          <aside className="lab-scenario-rail" aria-label="Failure scenarios">
            <div className="instrument-label"><GitBranch aria-hidden="true" /> Scenario deck</div>
            {scenarios.map((scenario) => (
              <button key={scenario.id} type="button" disabled={!ready || running} onClick={() => void runScenario(scenario.tokens)}>
                <span>{scenario.label}</span>
                <small>{scenario.tokens.join(" → ")}</small>
              </button>
            ))}
            <div className="rail-divider" />
            <label htmlFor="faultline-node">Target node</label>
            <select id="faultline-node" value={selectedNode} onChange={(event) => setSelectedNode(Number(event.target.value))}>
              {cluster.nodes.map((node) => <option key={node.id} value={node.id}>node-{node.id}</option>)}
            </select>
            <button type="button" disabled={!ready || running} onClick={() => runToken(`c${selectedNode}`)}><Play aria-hidden="true" /> Campaign</button>
            <button type="button" disabled={!ready || running} onClick={() => runToken(`i${selectedNode}`)}><Unplug aria-hidden="true" /> Isolate</button>
            <button type="button" disabled={!ready || running} onClick={() => runToken("h")}><Network aria-hidden="true" /> Heal</button>
          </aside>

          <div className="lab-stage">
            <div className="stage-status">
              <span className={ready ? "status-live" : "status-loading"}><Activity aria-hidden="true" /> {engineError || cluster.engine}</span>
              <span>tick {cluster.tick.toString().padStart(3, "0")}</span>
              <span>{cluster.dropped} dropped</span>
              <span>{tokens.length} replay ops</span>
            </div>
            <div className="cluster-map" data-running={running ? "true" : "false"}>
              <svg viewBox="0 0 100 100" role="img" aria-label="Five-node Raft topology showing roles and partition state">
                {nodePositions.map(([x], index) => {
                  const [nextX, nextY] = nodePositions[(index + 1) % nodePositions.length];
                  return <line key={`ring-${index}`} x1={x} y1={nodePositions[index][1]} x2={nextX} y2={nextY} />;
                })}
                {nodePositions.slice(1).map(([x, y], index) => <line key={`leader-${index}`} x1="50" y1="13" x2={x} y2={y} />)}
              </svg>
              {cluster.nodes.map((node, index) => {
                const [left, top] = nodePositions[index];
                return (
                  <button
                    type="button"
                    key={node.id}
                    className={`cluster-node role-${node.role}${cluster.isolated === node.id ? " isolated" : ""}`}
                    style={{ left: `${left}%`, top: `${top}%` }}
                    onClick={() => setSelectedNode(node.id)}
                    aria-label={`Node ${node.id}, ${node.role}, term ${node.term}, commit index ${node.commit}${cluster.isolated === node.id ? ", isolated" : ""}`}
                  >
                    <span>n{node.id}</span>
                    <strong>{node.role}</strong>
                    <small>t{node.term} · c{node.commit} · l{node.lastIndex}</small>
                  </button>
                );
              })}
              <div className="cluster-core" aria-hidden="true"><Split /><span>RAFT</span></div>
            </div>
            <div className="stage-command-row" aria-label="Cluster controls">
              <button type="button" disabled={!ready || running} onClick={() => runToken("r")}><RefreshCw aria-hidden="true" /> Reset</button>
              <button type="button" disabled={!ready || running} onClick={() => runToken("t1")}><Play aria-hidden="true" /> Tick 1</button>
              <button type="button" disabled={!ready || running} onClick={() => runToken("t11")}><Play aria-hidden="true" /> Tick 11</button>
              <button type="button" disabled={!ready || running} onClick={() => runToken("p")}><GitBranch aria-hidden="true" /> Propose tx-7</button>
            </div>
          </div>

          <aside className="lab-proof-rail" aria-label="Live invariants and evidence">
            <div className="instrument-label"><ShieldCheck aria-hidden="true" /> Invariant monitor</div>
            <dl>
              {invariants.map((invariant) => (
                <div key={invariant.label}>
                  <dt>{invariant.pass ? <CheckCircle2 aria-hidden="true" /> : <XCircle aria-hidden="true" />}{invariant.label}</dt>
                  <dd>{invariant.detail}</dd>
                </div>
              ))}
            </dl>
            <div className="oracle-controls">
              <button type="button" disabled={!ready} onClick={() => runToken("v")}><CheckCircle2 aria-hidden="true" /> Valid history</button>
              <button type="button" disabled={!ready} onClick={() => runToken("s")}><CircleOff aria-hidden="true" /> Stale read</button>
            </div>
            <div className="proof-links">
              <a href="https://github.com/asp53826/raft-mvcc/blob/main/src/raft.cpp" target="_blank" rel="noreferrer">Protocol source <ExternalLink aria-hidden="true" /></a>
              <a href="https://github.com/asp53826/raft-mvcc/blob/main/tests/test_raft_mvcc.cpp" target="_blank" rel="noreferrer">598-assertion suite <ExternalLink aria-hidden="true" /></a>
              <a href="https://github.com/asp53826/raft-mvcc/blob/main/DESIGN.md" target="_blank" rel="noreferrer">Safety boundaries <ExternalLink aria-hidden="true" /></a>
            </div>
          </aside>

          <div className="causal-tape" aria-live="polite">
            <div className="tape-head"><span>CAUSAL PROOF TAPE</span><button type="button" onClick={() => void copyScenario()}><Clipboard aria-hidden="true" /> {copied ? "Link copied" : "Share replay"}</button></div>
            <ol>
              {tape.map((event) => (
                <li key={event.sequence}>
                  <span>{String(event.sequence).padStart(2, "0")}</span>
                  <code>{event.token}</code>
                  <p>{event.label}</p>
                  <small>tick {event.tick}</small>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="lab-boundary" aria-labelledby="faultline-boundary">
          <p className="lab-kicker">FAILURE BOUNDARY</p>
          <h2 id="faultline-boundary">A protocol laboratory—not a production database.</h2>
          <p>The measured throughput excludes sockets, serialization, fsync, operating-system scheduling, persistence, snapshots, membership changes, and cross-range transactions. Logical ticks are deterministic simulator steps, not milliseconds. The lab keeps those limits beside the controls because removing them would turn evidence into theater.</p>
        </section>
      </main>
    </div>
  );
}
