import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Activity, BarChart3, CheckCircle2, Clipboard, ExternalLink, Pause, Play, RotateCcw, ShieldAlert, TrendingUp } from "lucide-react";

type Strategy = "naive" | "skew" | "as";

const strategies = {
  naive: { label: "Naive 2-tick", pnl: "20,853", edge: "0.845", inventory: "88.1", note: "Highest P&L in the recorded baseline; inventory wanders." },
  skew: { label: "Inventory skew", pnl: "15,448", edge: "0.877", inventory: "12.0", note: "Sacrifices gross P&L to reduce inventory dispersion 7.3×." },
  as: { label: "A–S γ=0.1", pnl: "−15,830", edge: "—", inventory: "—", note: "The textbook reservation-price strategy loses in this calibration." }
} as const;

function seeded(seed: number) {
  let state = seed >>> 0;
  return () => ((state = (1664525 * state + 1013904223) >>> 0) / 4294967296);
}

export default function MarketWireLab() {
  const [strategy, setStrategy] = useState<Strategy>("skew");
  const [toxicity, setToxicity] = useState(28);
  const [latency, setLatency] = useState(2);
  const [tick, setTick] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [copied, setCopied] = useState(false);
  const tickRef = useRef(0);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requested = params.get("strategy") as Strategy | null;
    if (requested && requested in strategies) setStrategy(requested);
    const requestedToxicity = Number(params.get("toxicity"));
    if (Number.isFinite(requestedToxicity) && requestedToxicity >= 0 && requestedToxicity <= 100) setToxicity(requestedToxicity);
  }, []);

  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("strategy", strategy);
    url.searchParams.set("toxicity", String(toxicity));
    window.history.replaceState({}, "", url);
  }, [strategy, toxicity]);

  useEffect(() => {
    if (!playing || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => {
      tickRef.current = (tickRef.current + 1) % 240;
      setTick(tickRef.current);
    }, 140);
    return () => window.clearInterval(timer);
  }, [playing]);

  const market = useMemo(() => {
    const random = seeded(53826);
    let mid = 100;
    let inventory = 0;
    let cash = 0;
    const history: number[] = [];
    for (let step = 0; step <= tick; step += 1) {
      const shock = (random() - 0.5) * (0.12 + toxicity / 160);
      mid += shock;
      const flow = random() < 0.48 + toxicity / 450 ? 1 : -1;
      const fillChance = Math.max(0.08, 0.52 - latency * 0.055 - toxicity / 430);
      if (random() < fillChance) {
        const damp = strategy === "skew" ? Math.sign(inventory) * Math.min(Math.abs(inventory), 8) * 0.14 : 0;
        inventory += flow - damp;
        cash -= flow * (mid + flow * 0.02);
      }
      history.push(mid);
    }
    const skew = strategy === "skew" ? inventory * 0.018 : strategy === "as" ? inventory * 0.04 : 0;
    const spread = 0.04 + toxicity * 0.0012 + latency * 0.006;
    const bid = mid - spread - skew;
    const ask = mid + spread - skew;
    const pnl = cash + inventory * mid;
    return { mid, inventory, pnl, bid, ask, spread, history };
  }, [latency, strategy, tick, toxicity]);

  const path = market.history.map((price, index) => {
    const x = market.history.length <= 1 ? 0 : index / (market.history.length - 1) * 100;
    const y = 50 - (price - 100) * 11;
    return `${index === 0 ? "M" : "L"}${x.toFixed(2)},${Math.max(4, Math.min(96, y)).toFixed(2)}`;
  }).join(" ");

  const reset = () => { tickRef.current = 0; setTick(0); };
  const copyReplay = async () => { await navigator.clipboard.writeText(window.location.href); setCopied(true); window.setTimeout(() => setCopied(false), 1600); };
  const headline = strategies[strategy];

  return <div className="lab-app marketwire-app">
    <a className="skip-link" href="#exchange-console">Skip to exchange controls</a>
    <header className="lab-topbar">
      <a className="lab-wordmark" href="/labs/"><span>AP</span><strong>Proof Laboratory</strong></a>
      <nav aria-label="Laboratory navigation"><a href="/labs/faultline/">FAULTLINE</a><a href="/labs/signalroom/">SIGNALROOM</a><a aria-current="page" href="/labs/marketwire/">MARKETWIRE</a><a href="/labs/kernelarena/">KERNELARENA</a></nav>
      <a className="lab-back" href="/quant/">Quant route <ExternalLink aria-hidden="true" /></a>
    </header>
    <main>
      <section className="lab-intro" aria-labelledby="marketwire-title"><div><p className="lab-kicker">LAB 03 / MARKET MICROSTRUCTURE / DETERMINISTIC TAPE</p><h1 id="marketwire-title">Trade the<br />failure regime.</h1></div><p>Change adverse selection, quote staleness, and inventory control. The live tape explains mechanism; committed 20,000-step, 12-seed results remain the quantitative authority.</p></section>
      <section className="lab-console" id="exchange-console" aria-label="Interactive market-making evidence replay">
        <aside className="lab-scenario-rail"><div className="instrument-label"><TrendingUp aria-hidden="true" /> Strategy rack</div>{(Object.keys(strategies) as Strategy[]).map((id) => <button key={id} type="button" aria-pressed={strategy === id} onClick={() => setStrategy(id)}><span>{strategies[id].label}</span><small>recorded P&amp;L {strategies[id].pnl}</small></button>)}<div className="rail-divider" /><label htmlFor="toxicity">Adverse selection <output>{toxicity}%</output></label><input id="toxicity" type="range" min="0" max="100" value={toxicity} onChange={(event) => setToxicity(Number(event.target.value))} /><label htmlFor="latency">Quote age <output>{latency} ticks</output></label><input id="latency" type="range" min="0" max="8" value={latency} onChange={(event) => setLatency(Number(event.target.value))} /></aside>
        <div className="lab-stage exchange-stage">
          <div className="stage-status"><span className="status-live"><Activity aria-hidden="true" /> DETERMINISTIC TAPE</span><span>event {String(tick).padStart(3, "0")}</span><span>seed 53826</span></div>
          <div className="market-ticker"><div><small>BID</small><strong>{market.bid.toFixed(3)}</strong></div><div className="market-mid"><small>MID</small><strong>{market.mid.toFixed(3)}</strong><span>spread {market.spread.toFixed(3)}</span></div><div><small>ASK</small><strong>{market.ask.toFixed(3)}</strong></div></div>
          <svg className="market-chart" viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label="Deterministic simulated mid-price trace"><path className="market-gridline" d="M0 25H100 M0 50H100 M0 75H100" /><path className="market-path" d={path || "M0 50"} /></svg>
          <div className="book-ladder" aria-label="Synthetic order book depth"><div className="asks">{[4,3,2,1].map((level) => <span key={level} style={{"--depth": `${18 + level * 15}%`} as CSSProperties}><i />{(market.ask + level * 0.01).toFixed(3)} <small>{level * 17}</small></span>)}</div><div className="book-mid">LAST / {market.mid.toFixed(3)}</div><div className="bids">{[1,2,3,4].map((level) => <span key={level} style={{"--depth": `${18 + level * 15}%`} as CSSProperties}><i />{(market.bid - level * 0.01).toFixed(3)} <small>{level * 19}</small></span>)}</div></div>
          <div className="stage-command-row"><button type="button" onClick={() => setPlaying((value) => !value)}>{playing ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}{playing ? "Pause" : "Play"}</button><button type="button" onClick={reset}><RotateCcw aria-hidden="true" /> Reset tape</button><button type="button" onClick={() => { tickRef.current = Math.min(239, tickRef.current + 1); setTick(tickRef.current); }}><BarChart3 aria-hidden="true" /> Step event</button></div>
        </div>
        <aside className="lab-proof-rail"><div className="instrument-label"><BarChart3 aria-hidden="true" /> Risk monitor</div><div className="market-risk-grid"><div><small>LIVE INVENTORY</small><strong>{market.inventory.toFixed(1)}</strong></div><div><small>ILLUSTRATIVE P&amp;L</small><strong>{market.pnl.toFixed(2)}</strong></div></div><dl><div><dt><CheckCircle2 aria-hidden="true" /> Recorded sweep</dt><dd>{headline.note}</dd></div><div><dt><ShieldAlert aria-hidden="true" /> Sharp payoff trap</dt><dd>AAD delta matches analytic Black–Scholes to 5.56e−16, but returns zero for a discontinuous digital payoff.</dd></div><div><dt><Activity aria-hidden="true" /> Reproduce</dt><dd>make bench in both linked repositories.</dd></div></dl><div className="proof-links"><a href="https://github.com/asp53826/lob-market-making" target="_blank" rel="noreferrer">Market engine <ExternalLink aria-hidden="true" /></a><a href="https://github.com/asp53826/aad-greeks" target="_blank" rel="noreferrer">AAD engine <ExternalLink aria-hidden="true" /></a></div></aside>
        <div className="causal-tape market-tape"><div className="tape-head"><span>FLOW / QUOTE / FILL / RISK / ORACLE</span><button type="button" onClick={() => void copyReplay()}><Clipboard aria-hidden="true" /> {copied ? "Link copied" : "Share regime"}</button></div><ol><li><span>01</span><code>FLOW</code><p>Toxicity {toxicity}% changes the deterministic shock and fill stream.</p><small>seed 53826</small></li><li><span>02</span><code>QUOTE</code><p>{headline.label} posts {market.bid.toFixed(3)} / {market.ask.toFixed(3)}.</p><small>age {latency} ticks</small></li><li><span>03</span><code>RISK</code><p>Inventory is {market.inventory.toFixed(1)}; control changes quote placement.</p><small>illustrative replay</small></li><li><span>04</span><code>ORACLE</code><p>Recorded 12-seed P&amp;L: {headline.pnl}.</p><small>20,000 steps</small></li></ol></div>
      </section>
      <section className="lab-boundary"><p className="lab-kicker">SIMULATION CONTRACT</p><h2>The browser tape is explanatory. The benchmark is evidentiary.</h2><p>This page uses a seeded, lightweight order-flow model so every shared URL replays the same regime. It does not claim to reproduce the repository’s full Python experiment in real time. P&amp;L, edge, inventory dispersion, and AAD accuracy are taken from locally reproduced repository benchmarks; the changing live P&amp;L is deliberately labeled illustrative.</p></section>
    </main>
  </div>;
}
