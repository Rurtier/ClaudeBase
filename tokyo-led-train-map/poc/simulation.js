/*
 * Data sources for the Tokyo live-map POC.
 *
 * Both sources implement the same tiny interface so the UI never changes:
 *
 *     source.getState(simMinutes) -> {
 *       trains: [ { lineId, color, x, y, station: <id|null>, delayed: <bool> }, ... ],
 *       delays: { <lineId>: <minutes>, ... }   // only delayed lines appear
 *     }
 *
 * TimetableSimulationSource  -> used NOW. Fabricates trains from each line's
 *                               timetable (headway + per-hop time) and injects
 *                               pseudo-random delays. No network, no API key.
 *
 * OdptSource (stub at bottom) -> the drop-in replacement once your ODPT
 *                               registration is approved.
 */
(function () {

  // Deterministic pseudo-random in [0,1) from integer-ish inputs (so the sim is
  // smooth and repeatable rather than jittering every frame).
  function hash01(a, b) {
    var x = Math.sin((a * 127.1 + b * 311.7) * 43758.5453);
    return x - Math.floor(x);
  }

  function TimetableSimulationSource(network, opts) {
    opts = opts || {};
    this.network = network;
    this.hopMin = opts.hopMin || 2.5;       // default minutes per inter-station hop
    this.headwayMin = opts.headwayMin || 4; // default minutes between trains
    this.delayChunkMin = opts.delayChunkMin || 6; // delays re-roll every N sim-minutes
  }

  // Current delay (minutes) for a line at a given sim time. Mostly 0; occasionally
  // a line gets a few minutes of delay, with the worst around the morning peak.
  TimetableSimulationSource.prototype._delayFor = function (line, simMinutes) {
    var lineIdx = this.network.lines.indexOf(line);
    var chunk = Math.floor(simMinutes / this.delayChunkMin);
    var roll = hash01(lineIdx + 1, chunk + 1);
    // ~25% of chunks have some delay on a given line.
    if (roll > 0.75) {
      var severity = hash01(chunk + 7, lineIdx + 3); // 0..1
      return Math.round(2 + severity * 12); // 2..14 minutes
    }
    return 0;
  };

  // Convert a fractional position p (in "station index" units) along an ordered
  // list of station ids into an {x,y, station} point. For loops, p wraps modulo N.
  TimetableSimulationSource.prototype._pointAt = function (orderIds, p, loop) {
    var stations = this.network.stations;
    var n = orderIds.length;
    var i0, i1, frac;
    if (loop) {
      p = ((p % n) + n) % n;
      i0 = Math.floor(p) % n;
      i1 = (i0 + 1) % n;
      frac = p - Math.floor(p);
    } else {
      // ping-pong over [0, n-1] so trains bounce end-to-end without spawning/despawning
      var span = n - 1;
      var period = 2 * span;
      var q = ((p % period) + period) % period;
      if (q > span) q = period - q; // reflect
      i0 = Math.floor(q);
      i1 = Math.min(i0 + 1, span);
      frac = q - i0;
      p = q;
    }
    var a = stations[orderIds[i0]];
    var b = stations[orderIds[i1]];
    var x = a.x + (b.x - a.x) * frac;
    var y = a.y + (b.y - a.y) * frac;
    // "At a station" when within the dwell window near an integer index.
    var nearest = (frac < 0.18) ? i0 : (frac > 0.82 ? i1 : -1);
    var station = nearest >= 0 ? orderIds[nearest] : null;
    return { x: x, y: y, station: station };
  };

  TimetableSimulationSource.prototype.getState = function (simMinutes) {
    var trains = [];
    var delays = {};
    var self = this;

    this.network.lines.forEach(function (line) {
      var order = line.stations;
      var n = order.length;
      var headway = line.headwayMin || self.headwayMin;
      var hop = line.hopMin || self.hopMin;
      var delay = self._delayFor(line, simMinutes);
      if (delay > 0) delays[line.id] = delay;

      // Delay slows trains down: a 20-min delay roughly halves speed.
      var effHop = hop * (1 + delay / 20);

      function emit(p) {
        var pt = self._pointAt(order, p, line.loop);
        trains.push({
          lineId: line.id, color: line.color,
          x: pt.x, y: pt.y, station: pt.station, delayed: delay > 0
        });
      }

      if (line.loop) {
        var cycle = n * effHop; // minutes for one full loop
        var count = Math.max(2, Math.round(cycle / headway));
        for (var k = 0; k < count; k++) {
          var phase = k * (cycle / count);
          var dist = (simMinutes + phase) / effHop;
          emit(dist);                 // clockwise
          emit(n - dist);             // counter-clockwise
        }
      } else {
        var span = n - 1;
        var period = 2 * span * effHop;       // full there-and-back in minutes
        var count2 = Math.max(2, Math.round(period / headway));
        for (var j = 0; j < count2; j++) {
          var phase2 = j * (period / count2);
          var dist2 = (simMinutes + phase2) / effHop;
          emit(dist2);
        }
      }
    });

    return { trains: trains, delays: delays };
  };

  TimetableSimulationSource.prototype.describe = function () {
    return 'Timetable simulation (offline) — live ODPT tracking pending registration';
  };

  /*
   * ---------------------------------------------------------------------------
   * OdptSource — STUB for when your ODPT key is approved.
   *
   * Replace `new TimetableSimulationSource(NETWORK)` in app.js with
   * `new OdptSource(NETWORK, { proxyUrl: '/api/odpt' })`. Keep the API key on a
   * tiny server/serverless proxy (see poc/README.md) — never ship it in the page.
   *
   * The real feed is async, so this caches the last poll and serves it
   * synchronously to getState(), matching the simulation's contract.
   * ---------------------------------------------------------------------------
   */
  function OdptSource(network, opts) {
    this.network = network;
    this.proxyUrl = (opts || {}).proxyUrl;
    this._cache = { trains: [], delays: {} };
    var self = this;
    if (this.proxyUrl) {
      setInterval(function () { self._poll(); }, 7000);
      this._poll();
    }
  }
  OdptSource.prototype._poll = function () {
    var self = this;
    // Expected proxy response: { trains:[{lineId,station,fromStation,toStation,delayed}], delays:{lineId:min} }
    fetch(this.proxyUrl).then(function (r) { return r.json(); }).then(function (data) {
      var trains = (data.trains || []).map(function (t) {
        var line = self.network.lines.find(function (l) { return l.id === t.lineId; });
        var s = self.network.stations[t.station || t.fromStation];
        return { lineId: t.lineId, color: line ? line.color : '#fff',
          x: s ? s.x : 0, y: s ? s.y : 0, station: t.station || t.fromStation, delayed: !!t.delayed };
      });
      self._cache = { trains: trains, delays: data.delays || {} };
    }).catch(function () { /* keep last good cache */ });
  };
  OdptSource.prototype.getState = function () { return this._cache; };
  OdptSource.prototype.describe = function () { return 'ODPT live tracking'; };

  if (typeof window !== 'undefined') {
    window.TimetableSimulationSource = TimetableSimulationSource;
    window.OdptSource = OdptSource;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { TimetableSimulationSource: TimetableSimulationSource, OdptSource: OdptSource };
  }
})();
