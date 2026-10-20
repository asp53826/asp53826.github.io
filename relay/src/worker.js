// The lab relay: a presence-and-broadcast room over WebSockets, used by Order
// Book Royale tables and by the live visitor cursors on /lab/.
//
// It speaks the same protocol as the game's RoomTransport and ChannelTransport,
// so the game's sessions run unchanged on top of it:
//
//   client -> relay  {t:"p", p:{...}}            replace my presence
//                    {t:"e", topic, data}        broadcast to everyone else
//                    "ping"                      keepalive (answered "pong")
//   relay -> client  {t:"hello", me, peers:[{peer, p}]}
//                    {t:"p", peer, p}            someone's presence changed
//                    {t:"bye", peer}             someone left
//                    {t:"e", peer, topic, data}  a broadcast
//
// The relay never runs the exchange. The host's page does, exactly as on
// claude.ai; the relay only forwards. One Durable Object per room name keeps
// every player of a lobby on the same instance, and the hibernation API means
// an idle lobby costs nothing.

const MAX_PEERS = 64;        // sockets per room
const MAX_MSG = 16 * 1024;   // bytes per frame; host state is fitted under 4 KB
const MAX_PRESENCE = 2048;   // bytes of presence per peer
const MAX_RATE = 40;         // frames per second per socket
const PEER_RE = /^[a-z0-9]{6,24}$/;
const ROOM_RE = /^\/room\/([a-z0-9-]{1,32})$/;

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (url.pathname === "/" || url.pathname === "/health") {
      return new Response("lab relay: ok\n", { headers: { "content-type": "text/plain" } });
    }
    const m = url.pathname.match(ROOM_RE);
    if (!m) return new Response("not found\n", { status: 404 });
    if ((req.headers.get("Upgrade") || "").toLowerCase() !== "websocket") {
      return new Response("expected a websocket upgrade\n", { status: 426 });
    }
    const allowed = (env.ALLOWED_ORIGINS || "").split(",").map((s) => s.trim()).filter(Boolean);
    const origin = req.headers.get("Origin") || "";
    if (allowed.length && !allowed.includes(origin)) return new Response("origin not allowed\n", { status: 403 });
    return env.ROOMS.get(env.ROOMS.idFromName(m[1])).fetch(req);
  },
};

export class Room {
  constructor(state) {
    this.state = state;
    // Keepalives are answered without waking the object.
    this.state.setWebSocketAutoResponse(new WebSocketRequestResponsePair("ping", "pong"));
  }

  live() {
    return this.state.getWebSockets().filter((ws) => ws.readyState === 1 && ws.deserializeAttachment());
  }

  async fetch(req) {
    const socks = this.live();
    if (socks.length >= MAX_PEERS) return new Response("room full\n", { status: 503 });

    // A page keeps its peer id across reconnects so a dropped socket does not
    // cost the player their seat. An id already in use gets a fresh one.
    const asked = new URL(req.url).searchParams.get("peer") || "";
    const taken = new Set(socks.map((ws) => ws.deserializeAttachment().peer));
    const peer = PEER_RE.test(asked) && !taken.has(asked) ? asked : "w" + crypto.randomUUID().replace(/-/g, "").slice(0, 15);

    const pair = new WebSocketPair();
    const [client, server] = [pair[0], pair[1]];
    this.state.acceptWebSocket(server);
    server.serializeAttachment({ peer, p: {}, n: 0, win: 0 });
    server.send(JSON.stringify({ t: "hello", me: peer, peers: socks.map((ws) => { const a = ws.deserializeAttachment(); return { peer: a.peer, p: a.p }; }) }));
    this.broadcast({ t: "p", peer, p: {} }, server);
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws, msg) {
    if (typeof msg !== "string") return;
    if (msg.length > MAX_MSG) { ws.close(1009, "frame too large"); return; }
    const a = ws.deserializeAttachment();
    if (!a) return;
    const now = Date.now();
    if (now - a.win > 1000) { a.win = now; a.n = 0; }
    a.n++;
    if (a.n > MAX_RATE) { ws.serializeAttachment(a); return; }   // drop, don't disconnect
    let m;
    try { m = JSON.parse(msg); } catch { ws.serializeAttachment(a); return; }
    if (m && m.t === "p" && m.p && typeof m.p === "object" && !Array.isArray(m.p)) {
      if (JSON.stringify(m.p).length <= MAX_PRESENCE) {
        a.p = m.p;
        this.broadcast({ t: "p", peer: a.peer, p: a.p }, ws);
      }
    } else if (m && m.t === "e" && typeof m.topic === "string" && m.topic.length <= 16) {
      this.broadcast({ t: "e", peer: a.peer, topic: m.topic, data: m.data }, ws);
    }
    ws.serializeAttachment(a);
  }

  async webSocketClose(ws, code) { this.left(ws); try { ws.close(code === 1005 ? 1000 : code, "bye"); } catch { /* already closed */ } }
  async webSocketError(ws) { this.left(ws); }

  left(ws) {
    const a = ws.deserializeAttachment();
    if (!a || a.gone) return;
    a.gone = true;
    try { ws.serializeAttachment(null); } catch { /* closed */ }
    this.broadcast({ t: "bye", peer: a.peer }, ws);
  }

  broadcast(obj, except) {
    const s = JSON.stringify(obj);
    for (const ws of this.state.getWebSockets()) {
      if (ws === except || ws.readyState !== 1) continue;
      try { ws.send(s); } catch { /* closing */ }
    }
  }
}
