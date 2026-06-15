/* Renders the network as a glowing SVG map and animates trains from a data source. */
(function () {
  var SVG_NS = 'http://www.w3.org/2000/svg';
  var network = window.NETWORK;
  var source = new window.TimetableSimulationSource(network); // <- swap for OdptSource later

  // --- Sim clock state ---
  var BASE_MINUTES = 8 * 60;   // map "starts" at 08:00
  var simMinutes = 0;
  var speed = 2;               // sim-minutes advanced per real second
  var playing = true;
  var lastTs = null;

  // --- Build SVG ---
  var svg = document.getElementById('map');
  svg.setAttribute('viewBox', network.viewBox);

  // glow filter
  var defs = document.createElementNS(SVG_NS, 'defs');
  defs.innerHTML =
    '<filter id="glow" x="-60%" y="-60%" width="220%" height="220%">' +
    '<feGaussianBlur stdDeviation="3.2" result="b"/>' +
    '<feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>' +
    '</filter>';
  svg.appendChild(defs);

  var lineLayer = mk('g');
  var dotLayer = mk('g');
  var trainLayer = mk('g');
  svg.appendChild(lineLayer);
  svg.appendChild(dotLayer);
  svg.appendChild(trainLayer);

  // line paths
  network.lines.forEach(function (line) {
    var d = line.stations.map(function (id, i) {
      var s = network.stations[id];
      return (i === 0 ? 'M' : 'L') + s.x + ' ' + s.y;
    }).join(' ') + (line.loop ? ' Z' : '');
    var path = mk('path', { d: d, fill: 'none', stroke: line.color,
      'stroke-width': 6, 'stroke-linejoin': 'round', 'stroke-linecap': 'round', opacity: 0.45 });
    lineLayer.appendChild(path);
  });

  // station dots (one per station, shared across lines)
  var dotEls = {};
  Object.keys(network.stations).forEach(function (id) {
    var s = network.stations[id];
    var c = mk('circle', { cx: s.x, cy: s.y, r: 4.5, fill: '#1b1f26', stroke: '#4a5160', 'stroke-width': 1.4 });
    var t = document.createElementNS(SVG_NS, 'title');
    t.textContent = s.name;
    c.appendChild(t);
    dotLayer.appendChild(c);
    dotEls[id] = c;
  });

  // train marker pool
  var markerPool = [];
  function marker(i) {
    if (!markerPool[i]) {
      var m = mk('circle', { r: 4, filter: 'url(#glow)' });
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
    // reset station dots
    Object.keys(dotEls).forEach(function (id) {
      var c = dotEls[id];
      c.setAttribute('r', 4.5);
      c.setAttribute('fill', '#1b1f26');
      c.removeAttribute('filter');
    });

    var i = 0;
    state.trains.forEach(function (tr) {
      var m = marker(i++);
      m.setAttribute('cx', tr.x.toFixed(1));
      m.setAttribute('cy', tr.y.toFixed(1));
      m.setAttribute('fill', tr.color);
      m.setAttribute('opacity', tr.delayed ? 0.7 : 1);
      m.style.display = '';
      if (tr.station && dotEls[tr.station]) {
        var c = dotEls[tr.station];
        c.setAttribute('r', 7);
        c.setAttribute('fill', tr.color);
        c.setAttribute('filter', 'url(#glow)');
      }
    });
    for (; i < markerPool.length; i++) markerPool[i].style.display = 'none';

    // legend + status
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

  // --- Clock label ---
  function updateClock() {
    var total = (BASE_MINUTES + simMinutes) % (24 * 60);
    var h = Math.floor(total / 60), m = Math.floor(total % 60);
    document.getElementById('clock').textContent =
      (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
  }

  // --- Animation loop ---
  function tick(ts) {
    if (lastTs == null) lastTs = ts;
    var dt = (ts - lastTs) / 1000;
    lastTs = ts;
    if (playing) simMinutes += dt * speed;
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
