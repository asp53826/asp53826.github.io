// `ssh lab`: a three-room text adventure inside the home page's shell.
// Elect the right Raft leader, get a lease, open the closet, take the flag.
import { capture } from './flags.js';

const LOGS = [['n1', 5, 12], ['n2', 6, 9], ['n3', 6, 14], ['n4', 5, 14], ['n5', 6, 13]];
const ROOMS = {
  lobby: { d: 'The lobby. Racks hum, an air handler sighs. A terminal blinks next to a pile of intern badges.', exits: ['raft-room', 'closet'], items: ['badge'] },
  'raft-room': { d: 'Five servers in a ring, n1 to n5, all followers, all waiting. A sticky note: "elect the one whose log is most up to date". Type logs.', exits: ['lobby'], items: [] },
  closet: { d: 'A steel door with a card reader. The display says LEADER LEASE REQUIRED.', exits: ['lobby'], items: [] },
};
const S = { active: false, room: 'lobby', inv: new Set(), open: false, tries: 0 };
const say = (p, t, c) => p(t, c);

function look(p) {
  const r = ROOMS[S.room];
  say(p, '[' + S.room + ']', 'k');
  say(p, S.room === 'closet' && S.open ? 'The closet is open. A small envelope sits on the shelf.' : r.d);
  const items = r.items.filter((i) => !S.inv.has(i)).concat(S.room === 'closet' && S.open && !S.inv.has('envelope') ? ['envelope'] : []);
  if (items.length) say(p, 'you see: ' + items.join(', '), 'd');
  say(p, 'exits: ' + r.exits.join(', '), 'd');
}

export function start(p) {
  Object.assign(S, { active: true, room: 'lobby' });
  say(p, 'Connecting to lab.aaryan.dev port 22…', 'd');
  say(p, "Warning: Permanently added 'lab' (ED25519) to the list of known hosts.", 'd');
  say(p, 'Welcome to the lab. Commands: look, go <place>, take <thing>, use <thing>, inventory, logs, elect <node>, exit.', 'g');
  look(p);
}

export function handle(raw, p) {
  const [cmd = '', ...rest] = raw.trim().toLowerCase().split(/\s+/), arg = rest.join(' ');
  window.__sfx?.play('blip');
  switch (cmd) {
    case 'look': case 'l': look(p); break;
    case 'go': case 'cd': case 'walk': {
      const to = arg.replace(/^the\s+/, '');
      if (!ROOMS[S.room].exits.includes(to)) { say(p, "can't go to '" + (to || '?') + "' from here. exits: " + ROOMS[S.room].exits.join(', '), 'w'); break; }
      S.room = to; look(p); break;
    }
    case 'take': case 'get': {
      const here = ROOMS[S.room].items.concat(S.room === 'closet' && S.open ? ['envelope'] : []);
      if (!here.includes(arg) || S.inv.has(arg)) { say(p, 'nothing called ' + (arg || '?') + ' here.', 'w'); break; }
      S.inv.add(arg);
      if (arg === 'badge') say(p, 'An intern badge. It says READ ACCESS ONLY. Better than nothing.', 'g');
      if (arg === 'envelope') {
        say(p, 'Inside: a card that reads "flag{the-majority-is-always-right}". You pocket it.', 'k');
        if (capture('ssh')) say(p, '🚩 flag captured. type flags to see how many are left.', 'g');
        else say(p, 'you already had this one.', 'd');
      }
      break;
    }
    case 'inventory': case 'inv': case 'i': say(p, S.inv.size ? 'you carry: ' + [...S.inv].join(', ') : 'your pockets are empty.', 'd'); break;
    case 'logs': case 'log':
      if (S.room !== 'raft-room') { say(p, 'no logs here. try the raft-room.', 'w'); break; }
      say(p, 'node  last term  last index', 'd');
      LOGS.forEach(([n, t, i]) => say(p, n.padEnd(6) + String(t).padEnd(11) + i));
      break;
    case 'elect': case 'vote': {
      if (S.room !== 'raft-room') { say(p, 'elections happen in the raft-room.', 'w'); break; }
      const n = LOGS.find(([id]) => id === arg);
      if (!n) { say(p, 'elect which node? n1 to n5', 'w'); break; }
      S.tries++;
      if (arg === 'n3') {
        say(p, 'n3 asks for votes in term 7. its log is at least as up to date as everyone else’s.', 'd');
        say(p, 'n3 wins 5/5 · it hands you a LEADER LEASE, valid while it holds the term.', 'g');
        S.inv.add('lease'); window.__sfx?.play('elect');
      } else {
        const why = n[1] < 6 ? `its last term is ${n[1]}, older than term 6` : `its log ends at index ${n[2]}, shorter than n3’s 14`;
        say(p, `${arg} asks for votes and gets rejected: ${why}. Voters refuse a candidate whose log is behind theirs.`, 'w');
        window.__sfx?.play('error');
        if (S.tries >= 2) say(p, 'hint: compare last term first, then last index.', 'd');
      }
      break;
    }
    case 'use': case 'open': case 'swipe': {
      if (S.room !== 'closet') { say(p, 'nothing to use that on here.', 'w'); break; }
      if (arg === 'badge' && S.inv.has('badge')) { say(p, 'The reader beeps: READ ACCESS ONLY. Denied.', 'w'); window.__sfx?.play('error'); break; }
      if ((arg === 'lease' || arg === 'door') && S.inv.has('lease')) { S.open = true; say(p, 'The lease checks out. The door clicks open.', 'g'); window.__sfx?.play('commit'); look(p); break; }
      say(p, S.inv.has(arg) || arg === 'door' ? 'The reader wants a leader lease.' : "you don't have " + (arg || 'that') + '.', 'w');
      break;
    }
    case 'sudo': say(p, 'nice try. this box runs on consensus, not root.', 'w'); break;
    case 'help': case '?': say(p, 'look, go <place>, take <thing>, use <thing>, inventory, logs, elect <node>, exit', 'd'); break;
    case 'exit': case 'logout': case 'quit': S.active = false; say(p, 'Connection to lab closed.', 'd'); break;
    case 'clear': return 'clear';
    default: say(p, cmd + ': not something you can do in here. try help', 'w');
  }
}

window.__adv = { start, handle, get active() { return S.active; } };
