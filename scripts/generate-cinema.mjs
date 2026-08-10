import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";

const output = new URL("../public/media/cinema/", import.meta.url).pathname;
mkdirSync(output, { recursive: true });

const films = [
  { id:"faultline", code:"FL·01", accent:"#74d9f3", title:"A LEADER ALONE\nIS NOT A MAJORITY", cues:[
    ["The control surface", "FAULTLINE runs the repository's C plus plus seventeen Raft and M V C C engine after compilation to WebAssembly."],
    ["The attack", "Campaign node one, commit a baseline transaction, then isolate that leader from the other four nodes."],
    ["The safety claim", "The isolated leader may look alive, but without a quorum it cannot turn a new proposal into a committed fact."],
    ["The oracle", "Heal the network, inspect terms and logs, then ask the linearizability checker for a legal witness order."],
    ["The boundary", "This proves simulator-level protocol behavior. Logical ticks are not production latency, and the engine has no disk or sockets."]]},
  { id:"signalroom", code:"SR·02", accent:"#65e6a7", title:"THE ADVANCED\nESTIMATOR LOSES", cues:[
    ["Inside the model bank", "On a maneuvering target, I M M lowers localization error from twenty six point nine two to fourteen point four zero."],
    ["Outside the model bank", "The same filter loses on straight motion and on a turn outside its configured rate hypotheses."],
    ["Association ghosts", "J P D A localizes a crossing slightly better, yet total O S P A is worse because it sustains more false tracks."],
    ["Observability loss", "During hover, visual inertial odometry becomes thirteen times worse than dead reckoning because translation and parallax disappear."],
    ["The contract", "SIGNALROOM visualizes committed benchmark regimes. The drawn dots explain geometry; they are not fresh numerical measurements."]]},
  { id:"marketwire", code:"MW·03", accent:"#f7b955", title:"PROFIT IS NOT\nTHE ONLY STATE", cues:[
    ["The tape", "MARKETWIRE replays deterministic order flow while you change adverse selection, quote age, and inventory control."],
    ["The tradeoff", "A naive strategy records higher profit, while inventory skew reduces inventory dispersion from eighty eight point one to twelve."],
    ["The losing model", "In this calibration the textbook Avellaneda Stoikov strategy loses fifteen thousand eight hundred thirty."],
    ["The sharp payoff", "Automatic differentiation matches smooth analytic delta, then fails correctly as a diagnostic on a discontinuous digital payoff."],
    ["The boundary", "The live tape is explanatory. The twenty thousand step, twelve seed repository benchmark remains the quantitative authority."]]},
  { id:"kernelarena", code:"KA·04", accent:"#bda7ff", title:"INTERROGATE\nEVERY REWRITE", cues:[
    ["Typed input", "KERNELARENA opens TensorForge itself, with typed tensor shapes checked before any G P U work begins."],
    ["Compiler passes", "Replay canonicalization, operator fusion, dead code elimination, and liveness aware buffer reuse."],
    ["Generated program", "Every visible node count, memory slot, dispatch, and W G S L kernel comes from the running compiler."],
    ["Local oracle", "The browser executes an equivalent C P U path, probes Web G P U when available, and compares numerical output."],
    ["The boundary", "Structural improvements are compiler facts. Wall time belongs to the visitor's adapter and is never claimed as universal speedup."]]}
];

const esc = (value) => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
const stamp = (seconds) => `00:00:${String(seconds).padStart(2,"0")}.000`;

for (const film of films) {
  const work = mkdtempSync(join(tmpdir(), `cinema-${film.id}-`));
  try {
    for (let index = 0; index < film.cues.length; index += 1) {
      const [heading, copy] = film.cues[index];
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720"><defs><radialGradient id="g"><stop stop-color="${film.accent}" stop-opacity=".2"/><stop offset="1" stop-color="#080c12" stop-opacity="0"/></radialGradient><pattern id="p" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0H0V40" fill="none" stroke="${film.accent}" stroke-opacity=".08"/></pattern></defs><rect width="1280" height="720" fill="#080c12"/><rect width="1280" height="720" fill="url(#p)"/><circle cx="1010" cy="350" r="350" fill="url(#g)"/><path d="M790 115H1165V605H790" fill="none" stroke="${film.accent}" stroke-opacity=".35"/><path d="M835 185H1120M835 245H1050M835 475H1120M835 535H1000" stroke="${film.accent}" stroke-opacity=".22"/><circle cx="976" cy="358" r="118" fill="none" stroke="${film.accent}"/><circle cx="976" cy="358" r="75" fill="none" stroke="${film.accent}" stroke-opacity=".45" stroke-dasharray="8 12"/><path d="M976 245V471M863 358H1089" stroke="${film.accent}" stroke-opacity=".45"/><text x="78" y="84" fill="${film.accent}" font-family="Menlo,monospace" font-size="18" letter-spacing="3">${film.code} / PROOF CINEMA / ${String(index+1).padStart(2,"0")}</text><text x="78" y="230" fill="#f4f7fa" font-family="Helvetica,sans-serif" font-size="67" font-weight="700">${esc(heading.toUpperCase())}</text><foreignObject x="78" y="290" width="630" height="240"><div xmlns="http://www.w3.org/1999/xhtml" style="color:#aeb9c6;font:30px/1.45 Helvetica,sans-serif">${esc(copy)}</div></foreignObject><text x="78" y="650" fill="#637183" font-family="Menlo,monospace" font-size="14">MECHANISM / ATTACK / ORACLE / BOUNDARY</text></svg>`;
      writeFileSync(join(work, `${index}.svg`), svg);
      await sharp(Buffer.from(svg)).png().toFile(join(work, `${index}.png`));
    }
    const poster = `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720"><rect width="1280" height="720" fill="#080c12"/><path d="M0 100H1280M0 620H1280M120 0V720M1160 0V720" stroke="${film.accent}" stroke-opacity=".18"/><circle cx="1010" cy="350" r="210" fill="none" stroke="${film.accent}" stroke-opacity=".35"/><circle cx="1010" cy="350" r="125" fill="none" stroke="${film.accent}" stroke-dasharray="10 14"/><text x="78" y="86" fill="${film.accent}" font-family="Menlo,monospace" font-size="18" letter-spacing="3">${film.code} / PROOF CINEMA</text><text x="78" y="300" fill="#f4f7fa" font-family="Helvetica,sans-serif" font-size="72" font-weight="700">${film.title.split("\n")[0]}</text><text x="78" y="382" fill="#f4f7fa" font-family="Helvetica,sans-serif" font-size="72" font-weight="700">${film.title.split("\n")[1]}</text><polygon points="985,315 985,385 1045,350" fill="${film.accent}"/></svg>`;
    writeFileSync(join(output, `${film.id}-poster.svg`), poster);
    await sharp(Buffer.from(poster)).png().toFile(join(output, `${film.id}-poster.png`));
    const fullNarration = film.cues.map((cue) => cue[1]).join(" ");
    execFileSync("say", ["-r", "155", "-o", join(work, "voice.aiff"), fullNarration]);
    const filters = film.cues.map((_, index) => `[${index}:v]scale=1280:720,zoompan=z='min(zoom+0.0005,1.055)':d=264:s=1280x720:fps=24[v${index}]`).join(";") + ";[v0][v1]xfade=transition=fade:duration=1:offset=10[v01];[v01][v2]xfade=transition=fade:duration=1:offset=20[v02];[v02][v3]xfade=transition=fade:duration=1:offset=30[v03];[v03][v4]xfade=transition=fade:duration=1:offset=40[vout];[5:a]apad=pad_dur=51[aout]";
    const inputs = film.cues.flatMap((_, index) => ["-loop", "1", "-t", "11", "-i", join(work, `${index}.png`)]);
    execFileSync("ffmpeg", ["-y", ...inputs, "-i", join(work, "voice.aiff"), "-filter_complex", filters, "-map", "[vout]", "-map", "[aout]", "-t", "51", "-c:v", "libx264", "-preset", "veryfast", "-crf", "27", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", join(output, `${film.id}.mp4`)], { stdio: "ignore" });
    const vtt = `WEBVTT\n\n${film.cues.map((cue, index) => `${stamp(index * 10)} --> ${stamp(index === 4 ? 51 : (index + 1) * 10)}\n${cue[1]}\n`).join("\n")}`;
    writeFileSync(join(output, `${film.id}.vtt`), vtt);
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}

console.log(`Generated ${films.length} narrated proof films in ${output}`);
