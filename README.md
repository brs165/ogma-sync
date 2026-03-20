# ogma-sync

PartyKit relay server for [Ogma](https://github.com/brs165/ogma-fate) multiplayer sessions.

## What it does

Relays real-time state between a GM's Ogma Table canvas and remote players. The GM's browser is the authoritative source of truth; this server is a dumb relay with a state cache for late joiners.

- GM hosts → gets a 4-char room code
- Players visit `run.html?room=XXXX` or the Table canvas URL with `?room=XXXX`
- Full state syncs on every `persist()` call
- `gmOnly` cards never leave the GM's browser (filtered client-side before sending)

## Deploy (hosted by Ogma project)

The project maintains a shared instance at `sync.ogma.net`. No setup needed.

## Self-host: one click

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/brs165/ogma-sync)

## Self-host: manual

```bash
git clone https://github.com/brs165/ogma-sync
cd ogma-sync
npm install
npx partykit deploy
# → deployed to ogma-sync.<your-account>.partykit.dev
```

Then in Ogma Settings, paste your custom URL into the **Sync Server** field.

## Architecture

```
GM browser ──ws──▶ PartyKit DO ──ws──▶ Player browsers
                  (stores latest
                   state snapshot)
```

- GM → server: `{type:"state", payload:{...}}` — stored + broadcast to players
- Player → server: `{type:"player_action", ...}` — forwarded to GM only
- Server → new joiner: `{type:"welcome", state:{...}}` — late join catchup

See [partykit-multiplayer-spec.md](https://github.com/brs165/ogma-fate/blob/main/devdocs/partykit-multiplayer-spec.md) for the full protocol.

## License

CC BY 3.0 — same as Ogma. Attribution: Randy Oest (Amazing Rando Design), fate-srd.com
