# relay

The lab's only backend: a Cloudflare Worker with one Durable Object per room,
holding WebSockets with the hibernation API. It powers two things on `/lab/`:

- **Order Book Royale** tables across browsers (room `order-book-royale`)
- **live visitor cursors** on every lab page (room `lab-presence`)

It only forwards messages. The game's host page still runs the exchange, and
nobody's cursor position is stored anywhere.

## Turn it on (about five minutes, free plan)

1. Create a free Cloudflare account at https://dash.cloudflare.com/sign-up.
2. In Cloudflare, create an API token from the **Edit Cloudflare Workers**
   template (My Profile → API Tokens → Create Token). Copy your **Account ID**
   from the Workers & Pages overview page.
3. In this GitHub repo, go to Settings → Secrets and variables → Actions and
   add two repository **secrets**: `CLOUDFLARE_API_TOKEN` and
   `CLOUDFLARE_ACCOUNT_ID`.
4. Run the **deploy relay** workflow (Actions tab → deploy relay → Run
   workflow). Its log ends with the address, something like
   `https://obr-relay.<your-subdomain>.workers.dev`. Open it: it should say
   `relay: ok`.
5. Back in Settings → Secrets and variables → Actions → **Variables**, add
   `LAB_RELAY_URL` with that address, `wss://` in place of `https://`.
6. Run the **deploy systems observatory** workflow (or push anything). Cursors
   and online tables are live.

Remove the `LAB_RELAY_URL` variable to switch both features off again. Without
it, the site behaves exactly as before: no sockets are opened.

## Settings

`wrangler.toml` → `ALLOWED_ORIGINS` lists the pages that may open sockets.
Add a custom domain there if you set one up, then rerun the workflow.

Limits per room, in `src/worker.js`: 64 sockets, 16 KB per frame, 2 KB of
presence per peer, 40 frames per second per socket (extra frames are dropped,
not disconnected).

## Local test

```sh
cd relay && npm install
npx wrangler dev --var "ALLOWED_ORIGINS:http://127.0.0.1:8790"
```

Then serve `public/` on port 8790, change `public/lab/data/relay.json` to
`{"url":"ws://127.0.0.1:8787"}` (don't commit that), and open the lab in two
browsers. The committed file has an empty URL, which keeps sockets off.

## Protocol

```
client -> relay  {t:"p", p:{...}}            replace my presence
                 {t:"e", topic, data}        broadcast to everyone else
                 "ping"                      keepalive, answered "pong"
relay -> client  {t:"hello", me, peers:[{peer, p}]}
                 {t:"p", peer, p}            a presence changed
                 {t:"bye", peer}             a peer left
                 {t:"e", peer, topic, data}  a broadcast
```
