# ogma-sync

Cloudflare Workers + Durable Objects relay server for [Ogma](https://github.com/brs165/ogma-fate) multiplayer sessions.

## What it does

Relays real-time state between a GM's Ogma Table canvas and remote players. The GM's browser is the authoritative source of truth — this server just relays and caches the latest snapshot for late joiners. GM-only cards are filtered client-side before anything is sent.
(https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/your-username/ogma)
## Deploy in 3 steps

### 1. Add two secrets to your GitHub repo

Go to your repo → **Settings → Secrets and variables → Actions** and add:

| Secret name | Where to find it |
|-------------|-----------------|
| `CLOUDFLARE_API_TOKEN` | dash.cloudflare.com → My Profile → API Tokens → Create Token → **Edit Cloudflare Workers** template |
| `CLOUDFLARE_ACCOUNT_ID` | dash.cloudflare.com → right sidebar on any page → "Account ID" |

### 2. Push to main

The included `.github/workflows/deploy.yml` runs `wrangler deploy` automatically on every push to `main`. After the Action completes (~30 seconds) your worker is live at:

```
https://ogma-sync.<your-subdomain>.workers.dev
```

You can also trigger it manually: Actions tab → Deploy to Cloudflare Workers → Run workflow.

### 3. Point Ogma at your server

In the Ogma Table toolbar, click **⚙** (visible when not connected) and paste your worker URL. Ogma saves it to your browser preferences.

## Local dev

```bash
npm install
npx wrangler dev   # runs locally on localhost:8787
```

## Architecture

```
GM browser ──ws──▶ Cloudflare DO ──ws──▶ Player browsers
                   (stores latest
                    state snapshot)
```

- **GM → server:** `{type:"state", payload:{...}}` stored + broadcast to players
- **Player → server:** `{type:"player_action", ...}` forwarded to GM only
- **Server → new joiner:** `{type:"welcome", state:{...}}` for late-join catchup
- **On GM disconnect:** toast broadcast to all players

## Cloudflare free tier limits

Durable Objects: 100,000 WebSocket message-days per month (~125 four-hour sessions). Free for most groups. See [Cloudflare pricing](https://developers.cloudflare.com/workers/platform/pricing/) for details.

## License

CC BY 3.0 — same as Ogma. Attribution: Randy Oest (Amazing Rando Design), fate-srd.com
