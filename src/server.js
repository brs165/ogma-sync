// ogma-sync — PartyKit relay server for Ogma Table multiplayer
// Deploy:  npx partykit deploy
// Docs:    https://docs.partykit.io
// License: CC BY 3.0 (same as Ogma)

export default class OgmaRoom {
  constructor(room) {
    this.room = room;
    this.state = null;   // latest full game state snapshot (set by GM)
    this.gmId  = null;   // connection ID of the current GM
  }

  onConnect(conn, ctx) {
    var url  = new URL(ctx.request.url);
    var role = url.searchParams.get('role');

    // First connection, or explicit ?role=gm claim, becomes GM
    if (role === 'gm' && !this.gmId) {
      this.gmId = conn.id;
      conn.setState({ role: 'gm' });
    } else {
      conn.setState({ role: 'player' });
    }

    // Late-join: send current snapshot immediately
    conn.send(JSON.stringify({
      type:        'welcome',
      state:       this.state,
      role:        conn.state.role,
      roomCode:    this.room.id,
      gmConnected: this._isGmConnected(),
    }));

    this._broadcastPresence();
  }

  onMessage(msg, sender) {
    var data;
    try { data = JSON.parse(msg); } catch (e) { return; }

    if (sender.id === this.gmId) {
      // GM → store state snapshot + relay to all players
      if (data.type === 'state') {
        this.state = data.payload;
      }
      this.room.broadcast(msg, [sender.id]);

    } else {
      // Player → forward to GM only (GM applies + re-broadcasts)
      var gm = this._getGmConnection();
      if (gm) gm.send(msg);
    }
  }

  onClose(conn) {
    if (conn.id === this.gmId) {
      this.gmId = null;
      this.room.broadcast(JSON.stringify({
        type: 'toast',
        msg:  'GM disconnected — waiting for reconnect…',
      }));
    }
    this._broadcastPresence();
  }

  _isGmConnected() {
    if (!this.gmId) return false;
    for (var conn of this.room.getConnections()) {
      if (conn.id === this.gmId) return true;
    }
    return false;
  }

  _getGmConnection() {
    for (var conn of this.room.getConnections()) {
      if (conn.id === this.gmId) return conn;
    }
    return null;
  }

  _broadcastPresence() {
    var conns = [];
    for (var conn of this.room.getConnections()) {
      conns.push({
        id:        conn.id,
        role:      conn.state ? conn.state.role : 'player',
        connected: true,
      });
    }
    this.room.broadcast(JSON.stringify({
      type:        'presence',
      connections: conns,
    }));
  }
}
