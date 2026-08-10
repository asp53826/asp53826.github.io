export const papers = [
  {
    id: "consensus-under-partition",
    lab: "FAULTLINE / CONSENSUS",
    title: "Consensus Under Partition: What the Animation Must Not Hide",
    dek: "A failure lab earns trust only when quorum boundaries, message loss, the safety oracle, and simulator limitations remain inspectable.",
    minutes: 8,
    sections: [
      { heading: "A topology is not a proof", paragraphs: ["An animated five-node cluster can make consensus look understandable while removing the difficult part: which messages were delivered, under which term, and whether a quorum actually acknowledged a log entry. FAULTLINE treats motion as an index into evidence. Each campaign, partition, proposal, and heal operation enters a causal tape that can be replayed from a URL.", "The engine behind that tape is not a JavaScript imitation. The repository’s C++17 Raft, MVCC, and linearizability sources are compiled with Emscripten and invoked through a narrow C interface. Native and browser builds therefore share the protocol implementation even though both remain an in-process simulator."] },
      { heading: "The minority leader test", paragraphs: ["The useful partition is not merely a red line between nodes. Isolate the current leader, let it accept a proposed client operation, and ask what became committed. A stale leader may still believe it leads for a short period; it must not manufacture a majority. The visible invariant is therefore not leader uniqueness alone. It is quorum-backed commitment within a term.", "Healing the transport is another operation, not an edit to history. A new leader’s log becomes authoritative through the protocol. The event tape keeps the isolated proposal visible so the repair does not look magically clean."] },
      { heading: "Linearizability needs a witness", paragraphs: ["A green badge saying linearizable is weak evidence. The checker consumes invocation and response intervals, explores legal serializations, and returns a witness order when one exists. A deliberately stale read provides the negative control: the same checker must reject it.", "The browser exposes explored-state counts and witness order because an oracle should leave a trail. A passing result without an inspectable input history or a failing control would be too easy to fake."] },
      { heading: "Where the claim ends", paragraphs: ["The measured throughput is a deterministic protocol microbenchmark. It excludes sockets, serialization, disk flushes, scheduler contention, snapshots, membership changes, and crash recovery from persistent media. Logical failover ticks are not milliseconds.", "That boundary does not make the project less serious. It names the layer actually under test: state-machine and protocol behavior. Production claims would require a different transport, persistence layer, fault model, and measurement harness."] }
    ]
  },
  {
    id: "sensor-fusion-loses",
    lab: "SIGNALROOM / AUTONOMY",
    title: "When Sensor Fusion Loses",
    dek: "IMM, JPDA, visual–inertial odometry, and autofocus fail for different reasons. The failure regime is part of the result.",
    minutes: 10,
    sections: [
      { heading: "Model diversity has a perimeter", paragraphs: ["On a maneuvering target inside its configured model bank, an interacting multiple-model filter reduces OSPA localization error from 26.92 to 14.40. That is the useful result. The boundary is equally useful: the same bank loses on straight motion and on a 12-degree-per-second turn outside the configured plus-or-minus 6-degree-per-second hypotheses.", "More models do not create universal robustness. They trade mismatch against mode probability, mixing, and additional variance. The appropriate question is not whether IMM is better, but whether the expected motion regime is represented."] },
      { heading: "Soft association can sustain ghosts", paragraphs: ["In the recorded light-clutter crossing, JPDA localizes slightly better yet performs worse on total OSPA: 39.55 versus 28.73 for GNN. It maintains roughly 2.7 times as many false tracks. Under 80 false alarms, the ordering reverses narrowly—47.75 versus 49.09—but the JPDA run costs 17.08 seconds and coverage falls to 0.737.", "This is why SIGNALROOM shows truth, detections, estimates, and residuals as separate visual layers. A smoother-looking track can coexist with a worse population-level metric."] },
      { heading: "Observability beats sophistication", paragraphs: ["The VIO benchmark reaches 0.041 meters ATE over a 40-second repeating figure-eight while dead reckoning reaches 2.106 meters. During hover, the ranking collapses: MSCKF reaches 1.202 meters while dead reckoning remains at 0.094. With no translational parallax, depth becomes unobservable and 12,086 feature measurements are rejected.", "No UI control can repair missing information. The interface therefore labels hover as an observability loss, not a tuning problem."] },
      { heading: "One sharpness metric is not the image", paragraphs: ["Phase-gradient autofocus reduces a four-radian defocus impulse width from 1.1587 meters to 0.3317, close to the 0.3326-meter theoretical reference. Random high-order errors, however, may barely improve or can make the width metric misleading.", "A responsible imaging demonstration keeps the phase-error family, point-target assumption, and measurement definition beside the improvement ratio."] }
    ]
  },
  {
    id: "benchmarks-that-fight-back",
    lab: "MARKETWIRE + KERNELARENA",
    title: "Benchmarks That Fight Back",
    dek: "Performance evidence becomes credible when the benchmark is allowed to contradict the project’s preferred mechanism.",
    minutes: 9,
    sections: [
      { heading: "A strategy can win the wrong objective", paragraphs: ["In the locally reproduced 20,000-step, 12-seed market-making sweep, a naive two-tick strategy produces P&L of 20,853 with inventory dispersion of 88.1. Inventory skew lowers dispersion to 12.0 but also lowers P&L to 15,448. The Avellaneda–Stoikov calibration at gamma 0.1 loses 15,830.", "Those values do not identify a universal winner. They expose an objective trade: gross simulated profit, inventory risk, quote staleness, and toxicity respond differently to each control law."] },
      { heading: "Differentiation needs a nonsmooth test", paragraphs: ["For a 50-input smooth Black–Scholes workload, pathwise automatic differentiation takes 26.5 milliseconds versus 1,524.5 milliseconds for bump-and-revalue, a 57.6-times local speedup. Delta relative error is 5.56e-16 and the AAD tape costs twice the price calculation.", "A sharp digital payoff is the negative control. The pathwise derivative is zero almost everywhere and the resulting Greek is wrong without smoothing or a likelihood-ratio method. The failure is mathematical, not an implementation inconvenience."] },
      { heading: "Compiler counts are not GPU time", paragraphs: ["TensorForge can prove that a graph rewrite removed nodes, reduced dispatches, and reused buffers because those facts come directly from its IR and allocation plan. It cannot infer a universal wall-time speedup from those structural changes.", "KERNELARENA therefore recomputes the structural matrix in the visitor’s browser and runs timing only on that visitor’s CPU and GPU. Adapter, browser, thermal state, and workload size remain part of the result."] },
      { heading: "The evidence contract", paragraphs: ["Every benchmark record should retain a commit, command, environment, unit, and boundary. Results with different units should not be forced into a common score. Historical records should be appended, not silently rewritten.", "A benchmark that can embarrass the preferred technique is doing its job. It tests an engineering claim instead of decorating it."] }
    ]
  }
];
