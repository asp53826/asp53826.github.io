// Loads FAULTLINE: the raft-mvcc C++17 sources compiled to WebAssembly with
// Emscripten. The site already serves the build at /wasm/faultline/; this is a
// thin, dependency-free wrapper around its exported functions.
//
// Every call returns the engine's own JSON snapshot:
//   { engine, tick, dropped, isolated, event, nodes:[{id, role, term, commit, lastIndex, leader, digest}] }
//
// Tokens (the same vocabulary the FAULTLINE lab uses):
//   r reset · c<n> campaign · i<n> isolate · h heal · t<n> tick n · p[<tx>] propose

const BASE = new URL('/wasm/faultline/', location.origin).href;
const TX = { 7: ['account/alice', '90'], 8: ['account/bob', '40'], 9: ['account/carol', '25'] };

export async function loadFaultline() {
  const mod = await import(BASE + 'faultline-engine.mjs');
  const wasm = await fetch(BASE + 'faultline-engine.wasm').then((r) => {
    if (!r.ok) throw new Error('engine download failed (' + r.status + ')');
    return r.arrayBuffer();
  });
  const M = await mod.default({
    locateFile: (p) => BASE + p,
    instantiateWasm(imports, ok) { WebAssembly.instantiate(wasm, imports).then(({ instance }) => ok(instance)); return {}; },
  });
  const call = (name, types = [], args = []) => JSON.parse(M.ccall(name, 'string', types, args));
  let nextTx = 9;

  function run(tok) {
    if (tok === 'r') { nextTx = 9; return call('faultline_reset'); }
    if (tok === 'h') return call('faultline_heal');
    const kind = tok[0], n = Number(tok.slice(1));
    if (kind === 'c') return call('faultline_campaign', ['number'], [n || 1]);
    if (kind === 'i') return call('faultline_isolate', ['number'], [n || 1]);
    if (kind === 't') return call('faultline_tick', ['number'], [n || 1]);
    if (kind === 'p') {
      const id = n || nextTx++;
      const [key, value] = TX[id] || ['account/u' + id, String(10 + id)];
      return call('faultline_propose', ['number', 'string', 'string'], [id, key, value]);
    }
    throw new Error('unknown engine token ' + tok);
  }

  return {
    run,
    snapshot: () => call('faultline_snapshot'),
    history: (stale) => call('faultline_check_history', ['number'], [stale ? 1 : 0]),
  };
}

/** The invariants FAULTLINE monitors, computed from one snapshot. */
export function invariants(s) {
  const leaders = s.nodes.filter((n) => n.role === 'leader');
  const perTerm = new Map();
  for (const l of leaders) perTerm.set(l.term, (perTerm.get(l.term) || 0) + 1);
  const electionSafe = [...perTerm.values()].every((c) => c <= 1);
  const commits = s.nodes.map((n) => n.commit);
  const digests = s.nodes.map((n) => n.digest);
  const iso = s.nodes.find((n) => n.id === s.isolated);
  const majority = s.nodes.filter((n) => n.id !== s.isolated);
  const majorityCommit = majority.length ? Math.max(...majority.map((n) => n.commit)) : 0;
  return [
    { label: 'Election safety', state: electionSafe ? 'pass' : 'fail',
      detail: leaders.length ? `${leaders.length} leader${leaders.length > 1 ? 's' : ''}${leaders.length > 1 ? ', each in its own term' : ''}` : 'no leader yet' },
    { label: 'Minority safety', state: !iso || iso.commit <= majorityCommit ? 'pass' : 'fail',
      detail: iso ? `isolated n${iso.id} holds ${iso.lastIndex} entr${iso.lastIndex === 1 ? 'y' : 'ies'}, commits only ${iso.commit}` : 'no partition' },
    { label: 'Commit convergence', state: new Set(commits).size === 1 ? 'pass' : 'wait',
      detail: new Set(commits).size === 1 ? `every node at commit ${commits[0]}` : `commits ${commits.join(' / ')}` },
    { label: 'State convergence', state: new Set(digests).size === 1 ? 'pass' : 'wait',
      detail: new Set(digests).size === 1 ? 'all MVCC digests agree' : 'replicas differ while partitioned' },
  ];
}

// Sound and haptics for an engine step, keyed on the token that caused it.
// No-ops unless the visitor turned sound on (haptics only need a phone).
export function sonify(tok, s) {
  const fx = window.__sfx; if (!fx || !tok) return;
  const k = tok[0], ev = (s && s.event || '').toLowerCase();
  if (k === 'r') fx.play('blip');
  else if (k === 'c') fx.play('elect');
  else if (k === 'i') { fx.play('crash'); fx.buzz([60, 30, 90]); }
  else if (k === 'h') fx.play('heal');
  else if (k === 'p' || k === 't') fx.play(/commit/.test(ev) ? 'commit' : 'note', s ? s.tick % 10 : 0);
}
