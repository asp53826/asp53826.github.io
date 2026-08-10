import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  CheckCircle2,
  Clipboard,
  Crosshair,
  ExternalLink,
  Pause,
  Play,
  Radar,
  RadioTower,
  RotateCcw,
  Satellite,
  TriangleAlert
} from "lucide-react";

type ScenarioId = "maneuver" | "crossing" | "clutter" | "hover" | "defocus";
type Algorithm = "baseline" | "advanced";

type Scenario = {
  id: ScenarioId;
  label: string;
  channel: string;
  baseline: string;
  advanced: string;
  metric: string;
  baselineValue: string;
  advancedValue: string;
  result: string;
  boundary: string;
  source: string;
  results: string;
  command: string;
};

const scenarios: Scenario[] = [
  {
    id: "maneuver",
    label: "Maneuvering target",
    channel: "TRACK FUSION / MOTION MODEL",
    baseline: "Single CV",
    advanced: "IMM ±6°/s",
    metric: "OSPA localization",
    baselineValue: "26.92",
    advancedValue: "14.40",
    result: "47% lower localization error inside the configured model bank.",
    boundary: "The same IMM loses on straight motion and outside the bank at 12°/s.",
    source: "https://github.com/asp53826/track-fusion/blob/main/tf/imm.py",
    results: "https://github.com/asp53826/track-fusion/blob/main/results/benchmark.txt",
    command: "python bench/benchmark.py --quick"
  },
  {
    id: "crossing",
    label: "Crossing tracks",
    channel: "TRACK FUSION / ASSOCIATION",
    baseline: "GNN",
    advanced: "JPDA",
    metric: "Total OSPA",
    baselineValue: "28.73",
    advancedValue: "39.55",
    result: "JPDA localizes slightly better and performs worse overall.",
    boundary: "Soft association sustains 2.7× as many false tracks in this light-clutter crossing.",
    source: "https://github.com/asp53826/track-fusion/blob/main/tf/assoc/jpda.py",
    results: "https://github.com/asp53826/track-fusion/blob/main/results/benchmark.txt",
    command: "python bench/benchmark.py --quick"
  },
  {
    id: "clutter",
    label: "Dense clutter",
    channel: "TRACK FUSION / 80 FALSE ALARMS",
    baseline: "GNN",
    advanced: "JPDA",
    metric: "Total OSPA",
    baselineValue: "49.09",
    advancedValue: "47.75",
    result: "JPDA finally overtakes hard assignment by 2.7%.",
    boundary: "The run costs 17.08 seconds and coverage falls to 0.737.",
    source: "https://github.com/asp53826/track-fusion/blob/main/bench/benchmark.py",
    results: "https://github.com/asp53826/track-fusion/blob/main/results/benchmark.txt",
    command: "python bench/benchmark.py"
  },
  {
    id: "hover",
    label: "VIO hover",
    channel: "VIO / OBSERVABILITY LOSS",
    baseline: "Dead reckoning",
    advanced: "MSCKF",
    metric: "ATE RMSE m",
    baselineValue: "0.094",
    advancedValue: "1.202",
    result: "The camera makes position 13× worse when translation disappears.",
    boundary: "No parallax means depth is unobservable; 12,086 feature measurements are rejected.",
    source: "https://github.com/asp53826/vio-nav/blob/main/vio/msckf.py",
    results: "https://github.com/asp53826/vio-nav/blob/main/results/benchmark.txt",
    command: "python bench/benchmark.py --quick"
  },
  {
    id: "defocus",
    label: "SAR defocus",
    channel: "SAR / PHASE GRADIENT AUTOFOCUS",
    baseline: "4 rad defocus",
    advanced: "PGA corrected",
    metric: "Impulse width m",
    baselineValue: "1.1587",
    advancedValue: "0.3317",
    result: "Autofocus removes a 3.49× blur to within 0.3% of the diffraction limit.",
    boundary: "High-order random phase error barely improves and can make the width metric misleading.",
    source: "https://github.com/asp53826/sar-focus/blob/main/sar/autofocus.py",
    results: "https://github.com/asp53826/sar-focus/blob/main/results/benchmark.txt",
    command: "python bench/benchmark.py --quick"
  }
];

function targetPoint(frame: number, index: number, crossing: boolean) {
  const t = frame / 100;
  if (crossing) {
    return index === 0
      ? { x: 12 + 76 * t, y: 28 + 42 * t }
      : { x: 88 - 76 * t, y: 28 + 42 * t };
  }
  const angle = t * Math.PI * 1.6 + index * 1.7;
  return { x: 18 + 64 * t, y: 50 + Math.sin(angle) * (18 + index * 4) };
}

export default function SignalRoomLab() {
  const [scenarioId, setScenarioId] = useState<ScenarioId>("maneuver");
  const [algorithm, setAlgorithm] = useState<Algorithm>("advanced");
  const [frame, setFrame] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [copied, setCopied] = useState(false);
  const frameRef = useRef(0);
  const scenario = scenarios.find((item) => item.id === scenarioId) ?? scenarios[0];

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requested = params.get("scenario") as ScenarioId | null;
    if (requested && scenarios.some((item) => item.id === requested)) setScenarioId(requested);
    if (params.get("algorithm") === "baseline") setAlgorithm("baseline");
  }, []);

  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("scenario", scenarioId);
    url.searchParams.set("algorithm", algorithm);
    window.history.replaceState({}, "", url);
  }, [algorithm, scenarioId]);

  useEffect(() => {
    if (!playing || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let animation = 0;
    let previous = performance.now();
    const advance = (now: number) => {
      if (now - previous > 70) {
        frameRef.current = (frameRef.current + 1) % 101;
        setFrame(frameRef.current);
        previous = now;
      }
      animation = requestAnimationFrame(advance);
    };
    animation = requestAnimationFrame(advance);
    return () => cancelAnimationFrame(animation);
  }, [playing]);

  const chooseScenario = (id: ScenarioId) => {
    setScenarioId(id);
    frameRef.current = 0;
    setFrame(0);
  };

  const scrubFrame = (next: number) => {
    frameRef.current = Math.max(0, Math.min(100, next));
    setFrame(frameRef.current);
  };

  const tracks = useMemo(() => {
    const crossing = scenarioId === "crossing" || scenarioId === "clutter";
    return [0, 1].map((index) => {
      const truth = targetPoint(frame, index, crossing);
      const errorScale = algorithm === "advanced" ? 1.8 : 4.8;
      const difficult = scenarioId === "hover" ? 9 : scenarioId === "clutter" ? 4 : 1;
      return {
        truth,
        estimate: {
          x: truth.x + Math.sin((frame + index * 13) * 0.31) * errorScale * difficult,
          y: truth.y + Math.cos((frame + index * 19) * 0.27) * errorScale * difficult
        }
      };
    });
  }, [algorithm, frame, scenarioId]);

  const clutter = useMemo(() => {
    const count = scenarioId === "clutter" ? 54 : scenarioId === "crossing" ? 14 : 5;
    return Array.from({ length: count }, (_, index) => ({
      x: (index * 37 + frame * 0.9) % 96 + 2,
      y: (index * 61 + frame * 0.42) % 90 + 5
    }));
  }, [frame, scenarioId]);

  const selectedValue = algorithm === "advanced" ? scenario.advancedValue : scenario.baselineValue;
  const copyReplay = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className="lab-app signalroom-app">
      <a className="skip-link" href="#mission-console">Skip to mission controls</a>
      <header className="lab-topbar">
        <a className="lab-wordmark" href="/labs/"><span>AP</span><strong>Proof Laboratory</strong></a>
        <nav aria-label="Laboratory navigation">
          <a href="/labs/faultline/">FAULTLINE</a>
          <a aria-current="page" href="/labs/signalroom/">SIGNALROOM</a>
          <a href="/labs/marketwire/">MARKETWIRE</a>
          <a href="/labs/kernelarena/">KERNELARENA</a>
        </nav>
        <a className="lab-back" href="/defense/">Defense route <ExternalLink aria-hidden="true" /></a>
      </header>

      <main>
        <section className="lab-intro" aria-labelledby="signalroom-title">
          <div><p className="lab-kicker">LAB 02 / AUTONOMY + SENSING / MEASURED REPLAY</p><h1 id="signalroom-title">See what the<br />sensor cannot.</h1></div>
          <p>Replay published tracking, navigation, and imaging regimes. The interface separates truth, measurement, estimate, and the failure condition instead of presenting a clean animation as proof.</p>
        </section>

        <section className="lab-console" id="mission-console" aria-label="Interactive autonomy evidence replay">
          <aside className="lab-scenario-rail">
            <div className="instrument-label"><Satellite aria-hidden="true" /> Mission deck</div>
            {scenarios.map((item) => <button key={item.id} type="button" aria-pressed={scenarioId === item.id} onClick={() => chooseScenario(item.id)}><span>{item.label}</span><small>{item.channel}</small></button>)}
            <div className="rail-divider" />
            <label>Estimator</label>
            <button type="button" aria-pressed={algorithm === "baseline"} onClick={() => setAlgorithm("baseline")}><span>{scenario.baseline}</span><small>published baseline</small></button>
            <button type="button" aria-pressed={algorithm === "advanced"} onClick={() => setAlgorithm("advanced")}><span>{scenario.advanced}</span><small>candidate mechanism</small></button>
          </aside>

          <div className="lab-stage mission-stage">
            <div className="stage-status"><span className="status-live"><RadioTower aria-hidden="true" /> MEASURED REPLAY</span><span>frame {String(frame).padStart(3, "0")}</span><span>{scenario.channel}</span></div>
            {scenarioId === "defocus" ? (
              <div className="sar-scope" data-corrected={algorithm === "advanced" ? "true" : "false"} role="img" aria-label={`${algorithm === "advanced" ? "Corrected" : "Defocused"} synthetic aperture radar impulse response`}>
                <div className="sar-target"><i /><i /><i /><i /><i /><span /></div>
                <div className="sar-crosshair" />
                <p>{algorithm === "advanced" ? "PGA / 0.3317 m IRW" : "4 RAD PHASE ERROR / 1.1587 m IRW"}</p>
              </div>
            ) : (
              <svg className="radar-scope" viewBox="0 0 100 100" role="img" aria-label="Target truth, measurements, and estimated tracks">
                <circle className="range-ring" cx="50" cy="50" r="42" /><circle className="range-ring" cx="50" cy="50" r="28" /><circle className="range-ring" cx="50" cy="50" r="14" />
                <line className="scope-axis" x1="4" y1="50" x2="96" y2="50" /><line className="scope-axis" x1="50" y1="4" x2="50" y2="96" />
                {clutter.map((point, index) => <circle key={index} className="measurement clutter" cx={point.x} cy={point.y} r="0.55" />)}
                {tracks.map((track, index) => <g key={index}>
                  <line className="residual" x1={track.truth.x} y1={track.truth.y} x2={track.estimate.x} y2={track.estimate.y} />
                  <circle className="truth" cx={track.truth.x} cy={track.truth.y} r="1.6" />
                  <circle className="estimate-gate" cx={track.estimate.x} cy={track.estimate.y} r={algorithm === "advanced" ? 3.3 : 5.2} />
                  <path className="estimate" d={`M ${track.estimate.x - 1.8} ${track.estimate.y} h 3.6 M ${track.estimate.x} ${track.estimate.y - 1.8} v 3.6`} />
                </g>)}
                <path className="sweep" d={`M 50 50 L ${50 + 44 * Math.cos(frame / 16)} ${50 + 44 * Math.sin(frame / 16)}`} />
              </svg>
            )}
            <div className="mission-legend"><span><i className="legend-truth" /> truth</span><span><i className="legend-measurement" /> measurement</span><span><i className="legend-estimate" /> estimate</span></div>
            <div className="stage-command-row">
              <button type="button" onClick={() => setPlaying((value) => !value)}>{playing ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}{playing ? "Pause" : "Play"}</button>
              <button type="button" onClick={() => scrubFrame(0)}><RotateCcw aria-hidden="true" /> Replay</button>
              <button type="button" onClick={() => scrubFrame(frameRef.current - 5)}><Crosshair aria-hidden="true" /> −5 frames</button>
              <button type="button" onClick={() => scrubFrame(frameRef.current + 5)}><Crosshair aria-hidden="true" /> +5 frames</button>
            </div>
          </div>

          <aside className="lab-proof-rail">
            <div className="instrument-label"><Radar aria-hidden="true" /> Evidence monitor</div>
            <div className="mission-metric"><span>{scenario.metric}</span><strong>{selectedValue}</strong><small>{algorithm === "advanced" ? scenario.advanced : scenario.baseline}</small></div>
            <dl>
              <div><dt><CheckCircle2 aria-hidden="true" /> Published result</dt><dd>{scenario.result}</dd></div>
              <div><dt><TriangleAlert aria-hidden="true" /> Losing regime</dt><dd>{scenario.boundary}</dd></div>
              <div><dt><Activity aria-hidden="true" /> Reproduce</dt><dd>{scenario.command}</dd></div>
            </dl>
            <div className="proof-links"><a href={scenario.source} target="_blank" rel="noreferrer">Open mechanism <ExternalLink aria-hidden="true" /></a><a href={scenario.results} target="_blank" rel="noreferrer">Published sweep <ExternalLink aria-hidden="true" /></a></div>
          </aside>

          <div className="causal-tape mission-tape">
            <div className="tape-head"><span>MEASUREMENT / ESTIMATE / BOUNDARY</span><button type="button" onClick={() => void copyReplay()}><Clipboard aria-hidden="true" /> {copied ? "Link copied" : "Share replay"}</button></div>
            <ol>
              <li><span>01</span><code>TRUTH</code><p>Deterministic scenario geometry advances to frame {frame}.</p><small>{scenario.label}</small></li>
              <li><span>02</span><code>SENSE</code><p>{clutter.length} rendered detections expose clutter rather than hiding it.</p><small>measurement layer</small></li>
              <li><span>03</span><code>ESTIMATE</code><p>{algorithm === "advanced" ? scenario.advanced : scenario.baseline} produces the visible residual.</p><small>{scenario.metric}</small></li>
              <li><span>04</span><code>ORACLE</code><p>{scenario.result}</p><small>committed benchmark</small></li>
              <li><span>05</span><code>LIMIT</code><p>{scenario.boundary}</p><small>failure remains visible</small></li>
            </ol>
          </div>
        </section>

        <section className="lab-boundary"><p className="lab-kicker">REPLAY CONTRACT</p><h2>Animation is not the algorithm.</h2><p>SIGNALROOM is a deterministic visualization of committed benchmark regimes, not a browser port of NumPy, SciPy, or the full sensor models. Every quantitative statement comes from the linked repository output. The replay exists to make the geometry and failure mode understandable without pretending that drawn dots are fresh tracker measurements.</p></section>
      </main>
    </div>
  );
}
