// ogma-sync — Cloudflare Durable Object WebSocket relay for Ogma multiplayer
// Compatible with partysocket client (URL format: /parties/main/:roomCode)
// Deploy: npx wrangler deploy  OR  GitHub Action with cloudflare/wrangler-action

// ── Durable Object ─────────────────────────────────────────────────────────
export class OgmaRoom {
  constructor(state, env) {
    this.state = state;   // DurableObjectState
    this.snapshot = null; // latest game state from GM
  }

  async fetch(request) {
    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('Expected WebSocket upgrade', { status: 426 });
    }

    const url  = new URL(request.url);
    const role = url.searchParams.get('role') === 'gm' ? 'gm' : 'player';

    // If no GM exists yet, first connection becomes GM
    const existingGms = this.state.getWebSockets('gm');
    const assignedRole = (role === 'gm' && existingGms.length === 0) ? 'gm' : 'player';

    const [client, server] = Object.values(new WebSocketPair());
    this.state.acceptWebSocket(server, [assignedRole]);

    // Welcome message with current snapshot (late-join support)
    server.send(JSON.stringify({
      type:        'welcome',
      state:       this.snapshot,
      role:        assignedRole,
      roomCode:    url.pathname.split('/').pop(),
      gmConnected: this.state.getWebSockets('gm').length > 0,
    }));

    this._broadcastPresence();

    return new Response(null, { status: 101, webSocket: client });
  }

  webSocketMessage(ws, message) {
    let data;
    try { data = JSON.parse(message); } catch (e) { return; }

    const isGm = this.state.getTags(ws).includes('gm');

    if (isGm) {
      // GM → store state snapshot, relay to all players
      if (data.type === 'state') this.snapshot = data.payload;
      for (const conn of this.state.getWebSockets()) {
        if (conn !== ws) this._safeSend(conn, message);
      }
    } else {
      // Player → forward to GM only
      for (const conn of this.state.getWebSockets('gm')) {
        this._safeSend(conn, message);
      }
    }
  }

  webSocketClose(ws) {
    const isGm = this.state.getTags(ws).includes('gm');
    if (isGm) {
      // Notify players that GM has gone
      const msg = JSON.stringify({ type: 'toast', msg: 'GM disconnected \u2014 waiting for reconnect\u2026' });
      for (const conn of this.state.getWebSockets('player')) {
        this._safeSend(conn, msg);
      }
    }
    this._broadcastPresence();
  }

  webSocketError(ws) {
    this.webSocketClose(ws);
  }

  _safeSend(conn, msg) {
    try { conn.send(msg); } catch (e) { /* connection already closed */ }
  }

  _broadcastPresence() {
    const conns = this.state.getWebSockets().map(function(ws) {
      return { role: this.state.getTags(ws)[0] || 'player', connected: true };
    }, this);
    const msg = JSON.stringify({ type: 'presence', connections: conns });
    for (const conn of this.state.getWebSockets()) {
      this._safeSend(conn, msg);
    }
  }
}

// ── Worker (routes requests to the right Durable Object) ──────────────────
export default {
  async fetch(request, env) {
    const url   = new URL(request.url);
    // partysocket connects to /parties/main/:roomCode
    // also handle /rooms/:roomCode for direct use
    const parts = url.pathname.split('/').filter(Boolean);
    const roomCode = (parts[parts.length - 1] || 'default').toLowerCase();

    const id   = env.OGMA_ROOM.idFromName(roomCode);
    const stub = env.OGMA_ROOM.get(id);
    return stub.fetch(request);
  },
};
