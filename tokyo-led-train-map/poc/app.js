/* Renders the network as a metro-style SVG map and animates trains from a data source. */
(function () {
  var SVG_NS = 'http://www.w3.org/2000/svg';
  var network = window.NETWORK;
  var source = new window.TimetableSimulationSource(network);

  // --- Tokyo time (JST = UTC + 9) ---
  (function initClock() {
    var now = new Date();
    var jstMinutes = ((now.getUTCHours() + 9) % 24) * 60 + now.getUTCMinutes() + now.getUTCSeconds() / 60;
    window._BASE_MINUTES = jstMinutes;
  })();

  var simMinutes = 0;
  var speed = 1;       // real-time multiplier: 1 = real time, 5 = 5× faster
  var playing = true;
  var lastTs = null;

  // --- Interchange detection ---
  var stationLineCount = {};
  network.lines.forEach(function (line) {
    line.stations.forEach(function (id) {
      stationLineCount[id] = (stationLineCount[id] || 0) + 1;
    });
  });

  // --- Build SVG ---
  var svg = document.getElementById('map');
  svg.setAttribute('viewBox', network.viewBox);

  // glow filter
  var defs = document.createElementNS(SVG_NS, 'defs');
  defs.innerHTML =
    '<filter id="glow" x="-80%" y="-80%" width="260%" height="260%">' +
    '<feGaussianBlur stdDeviation="4" result="b"/>' +
    '<feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>' +
    '</filter>';
  svg.appendChild(defs);

  // Layers (back to front)
  var lineOutlineLayer = mk('g');  // dark border behind lines
  var lineColorLayer   = mk('g');  // colored line paths
  var dotLayer         = mk('g');  // station circles
  var labelLayer       = mk('g');  // station name text
  var trainLayer       = mk('g');  // moving train markers
  svg.appendChild(lineOutlineLayer);
  svg.appendChild(lineColorLayer);
  svg.appendChild(dotLayer);
  svg.appendChild(labelLayer);
  svg.appendChild(trainLayer);

  function buildPath(line) {
    return line.stations.map(function (id, i) {
      var s = network.stations[id];
      return (i === 0 ? 'M' : 'L') + s.x + ' ' + s.y;
    }).join(' ') + (line.loop ? ' Z' : '');
  }

  // Draw line outlines (dark border so overlapping lines stay legible)
  network.lines.forEach(function (line) {
    var path = mk('path', {
      d: buildPath(line), fill: 'none',
      stroke: '#0c0e12', 'stroke-width': 14,
      'stroke-linejoin': 'round', 'stroke-linecap': 'round'
    });
    lineOutlineLayer.appendChild(path);
  });

  // Draw colored lines on top of outlines
  network.lines.forEach(function (line) {
    var path = mk('path', {
      d: buildPath(line), fill: 'none',
      stroke: line.color, 'stroke-width': 9,
      'stroke-linejoin': 'round', 'stroke-linecap': 'round'
    });
    lineColorLayer.appendChild(path);
  });

  // Station dots — white circles; larger + ringed for interchanges
  var dotEls = {};
  Object.keys(network.stations).forEach(function (id) {
    var s = network.stations[id];
    var isX = stationLineCount[id] > 1;
    var r = isX ? 7 : 4.5;
    var sw = isX ? 2.5 : 1.5;
    var c = mk('circle', {
      cx: s.x, cy: s.y, r: r,
      fill: '#ffffff', stroke: '#0c0e12', 'stroke-width': sw
    });
    var t = document.createElementNS(SVG_NS, 'title');
    t.textContent = s.name;
    c.appendChild(t);
    dotLayer.appendChild(c);
    dotEls[id] = c;
  });

  // Station labels for major hubs
  var labels = network.labels || {};
  Object.keys(labels).forEach(function (id) {
    var s = network.stations[id];
    if (!s) return;
    var lbl = labels[id];
    var t = document.createElementNS(SVG_NS, 'text');
    t.setAttribute('x', s.x + lbl.dx);
    t.setAttribute('y', s.y + lbl.dy);
    t.setAttribute('text-anchor', lbl.anchor);
    t.setAttribute('font-size', '11');
    t.setAttribute('font-family', '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif');
    t.setAttribute('font-weight', '600');
    t.setAttribute('fill', '#e7ebf0');
    t.setAttribute('paint-order', 'stroke');
    t.setAttribute('stroke', '#0c0e12');
    t.setAttribute('stroke-width', '3');
    t.setAttribute('stroke-linejoin', 'round');
    t.textContent = s.name;
    labelLayer.appendChild(t);
  });

  // Train marker pool — white-ringed glowing dots
  var markerPool = [];
  function marker(i) {
    if (!markerPool[i]) {
      var m = mk('circle', {
        r: 5.5, filter: 'url(#glow)',
        stroke: '#ffffff', 'stroke-width': 1.5
      });
      trainLayer.appendChild(m);
      markerPool[i] = m;
    }
    return markerPool[i];
  }

  // --- Legend ---
  var legendEl = document.getElementById('legend');
  network.lines.forEach(function (line) {
    var row = document.createElement('div');
    row.className = 'legend-row';
    row.dataset.line = line.id;
    row.innerHTML =
      '<span class="sw" style="background:' + line.color + '"></span>' +
      '<span class="ln"><b>' + line.name + '</b><small>' + line.operator + '</small></span>' +
      '<span class="st">on time</span>';
    legendEl.appendChild(row);
  });

  // --- Render one frame ---
  function render(state) {
    // Reset all station dots to default
    Object.keys(dotEls).forEach(function (id) {
      var isX = stationLineCount[id] > 1;
      dotEls[id].setAttribute('r', isX ? 7 : 4.5);
      dotEls[id].setAttribute('fill', '#ffffff');
      dotEls[id].setAttribute('stroke', '#0c0e12');
      dotEls[id].removeAttribute('filter');
    });

    var i = 0;
    state.trains.forEach(function (tr) {
      var m = marker(i++);
      m.setAttribute('cx', tr.x.toFixed(1));
      m.setAttribute('cy', tr.y.toFixed(1));
      m.setAttribute('fill', tr.color);
      m.setAttribute('opacity', tr.delayed ? 0.65 : 1);
      m.style.display = '';

      // Light up station when a train is present
      if (tr.station && dotEls[tr.station]) {
        var c = dotEls[tr.station];
        var isX = stationLineCount[tr.station] > 1;
        c.setAttribute('r', isX ? 10 : 7);
        c.setAttribute('fill', tr.color);
        c.setAttribute('stroke', '#ffffff');
        c.setAttribute('filter', 'url(#glow)');
      }
    });
    for (; i < markerPool.length; i++) markerPool[i].style.display = 'none';

    // Legend + service status
    var delayed = state.delays || {};
    var anyDelay = false;
    document.querySelectorAll('.legend-row').forEach(function (row) {
      var id = row.dataset.line;
      var st = row.querySelector('.st');
      if (delayed[id]) {
        anyDelay = true;
        st.textContent = '+' + delayed[id] + ' min';
        st.className = 'st delayed';
      } else {
        st.textContent = 'on time';
        st.className = 'st';
      }
    });

    var status = document.getElementById('status');
    if (anyDelay) {
      var parts = Object.keys(delayed).map(function (id) {
        var line = network.lines.find(function (l) { return l.id === id; });
        return (line ? line.name : id) + ' +' + delayed[id] + ' min';
      });
      status.innerHTML = '<span class="dot bad"></span> Delays: ' + parts.join(' · ');
      status.className = 'status bad';
    } else {
      status.innerHTML = '<span class="dot ok"></span> All lines running on time';
      status.className = 'status ok';
    }
  }

  // --- Clock (Tokyo time) ---
  function updateClock() {
    var total = Math.floor(window._BASE_MINUTES + simMinutes) % (24 * 60);
    var h = Math.floor(total / 60), m = Math.floor(total % 60);
    document.getElementById('clock').textContent =
      (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m + ' JST';
  }

  // --- Animation loop ---
  // speed is a real-time multiplier: 1 = real time, 5 = 5× faster.
  // simMinutes tracks elapsed simulation minutes; BASE_MINUTES is today's JST start.
  function tick(ts) {
    if (lastTs == null) lastTs = ts;
    var dt = (ts - lastTs) / 1000;   // real seconds since last frame
    lastTs = ts;
    if (playing) simMinutes += dt * speed / 60; // /60 converts real-seconds → real-minutes
    render(source.getState(simMinutes));
    updateClock();
    requestAnimationFrame(tick);
  }

  // --- Controls ---
  document.getElementById('source').textContent = source.describe();
  var playBtn = document.getElementById('play');
  playBtn.addEventListener('click', function () {
    playing = !playing;
    playBtn.textContent = playing ? '⏸ Pause' : '▶ Play';
  });
  document.querySelectorAll('[data-speed]').forEach(function (b) {
    b.addEventListener('click', function () {
      speed = parseFloat(b.dataset.speed);
      document.querySelectorAll('[data-speed]').forEach(function (x) { x.classList.remove('active'); });
      b.classList.add('active');
    });
  });

  requestAnimationFrame(tick);

  function mk(tag, attrs) {
    var el = document.createElementNS(SVG_NS, tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { el.setAttribute(k, attrs[k]); });
    return el;
  }
})();
