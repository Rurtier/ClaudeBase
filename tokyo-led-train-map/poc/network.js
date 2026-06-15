/*
 * Tokyo rail network data for the "+JR" proof-of-concept.
 *
 * Scope: the Yamanote loop + JR East core lines, plus two iconic Tokyo Metro
 * lines to demonstrate multi-operator colour coding.
 *
 * NOTE: station coordinates are a *stylised schematic* (viewBox 1000x800), not a
 * geographically accurate map. The Yamanote loop is generated as an ellipse;
 * everything else is placed to read clearly. Swapping in a real map later only
 * means changing these x/y values — the simulation/UI don't care how they were set.
 */
(function () {
  // ---- Yamanote loop (clockwise from Tokyo, ~one stop omitted for the POC) ----
  var yamanoteOrder = [
    ['tokyo', 'Tokyo'], ['yurakucho', 'Yūrakuchō'], ['shimbashi', 'Shimbashi'],
    ['hamamatsucho', 'Hamamatsuchō'], ['tamachi', 'Tamachi'], ['shinagawa', 'Shinagawa'],
    ['osaki', 'Ōsaki'], ['gotanda', 'Gotanda'], ['meguro', 'Meguro'], ['ebisu', 'Ebisu'],
    ['shibuya', 'Shibuya'], ['harajuku', 'Harajuku'], ['yoyogi', 'Yoyogi'],
    ['shinjuku', 'Shinjuku'], ['shinokubo', 'Shin-Ōkubo'], ['takadanobaba', 'Takadanobaba'],
    ['mejiro', 'Mejiro'], ['ikebukuro', 'Ikebukuro'], ['otsuka', 'Ōtsuka'],
    ['sugamo', 'Sugamo'], ['komagome', 'Komagome'], ['tabata', 'Tabata'],
    ['nishinippori', 'Nishi-Nippori'], ['nippori', 'Nippori'], ['uguisudani', 'Uguisudani'],
    ['ueno', 'Ueno'], ['okachimachi', 'Okachimachi'], ['akihabara', 'Akihabara'],
    ['kanda', 'Kanda']
  ];

  var stations = {};
  var cx = 500, cy = 400, rx = 250, ry = 330;
  var N = yamanoteOrder.length;
  yamanoteOrder.forEach(function (s, i) {
    var theta = (i / N) * 2 * Math.PI; // 0 = east (Tokyo), increasing = clockwise (screen y-down)
    stations[s[0]] = {
      name: s[1],
      x: Math.round(cx + rx * Math.cos(theta)),
      y: Math.round(cy + ry * Math.sin(theta))
    };
  });

  // ---- Extra (non-Yamanote) stations, placed by hand ----
  var extras = {
    ochanomizu: ['Ochanomizu', 585, 230],
    yotsuya: ['Yotsuya', 330, 330],
    nakano: ['Nakano', 80, 330],
    sendagaya: ['Sendagaya', 360, 380],
    asakusabashi: ['Asakusabashi', 810, 250],
    kinshicho: ['Kinshichō', 920, 300],
    akabane: ['Akabane', 470, 45],
    kamata: ['Kamata', 650, 760],
    yokohama: ['Yokohama', 700, 790],
    ginza: ['Ginza', 650, 480],
    kasumigaseki: ['Kasumigaseki', 560, 540],
    omotesando: ['Omote-sandō', 320, 500],
    asakusa: ['Asakusa', 850, 130]
  };
  Object.keys(extras).forEach(function (id) {
    var e = extras[id];
    stations[id] = { name: e[0], x: e[1], y: e[2] };
  });

  // ---- Lines ----
  // headwayMin = minutes between consecutive trains; hopMin = minutes per inter-station hop.
  var lines = [
    {
      id: 'yamanote', name: 'Yamanote Line', operator: 'JR East',
      color: '#9ACD32', loop: true, headwayMin: 3, hopMin: 2,
      stations: yamanoteOrder.map(function (s) { return s[0]; })
    },
    {
      id: 'keihin_tohoku', name: 'Keihin-Tōhoku Line', operator: 'JR East',
      color: '#00B2E3', loop: false, headwayMin: 4, hopMin: 3,
      stations: ['akabane', 'tabata', 'nishinippori', 'nippori', 'uguisudani', 'ueno',
        'okachimachi', 'akihabara', 'kanda', 'tokyo', 'yurakucho', 'shimbashi',
        'hamamatsucho', 'tamachi', 'shinagawa', 'kamata', 'yokohama']
    },
    {
      id: 'chuo_rapid', name: 'Chūō Rapid Line', operator: 'JR East',
      color: '#F15A22', loop: false, headwayMin: 4, hopMin: 3,
      stations: ['tokyo', 'ochanomizu', 'yotsuya', 'shinjuku', 'nakano']
    },
    {
      id: 'sobu_local', name: 'Chūō-Sōbu Local Line', operator: 'JR East',
      color: '#FFD500', loop: false, headwayMin: 5, hopMin: 3,
      stations: ['shinjuku', 'sendagaya', 'ochanomizu', 'akihabara', 'asakusabashi', 'kinshicho']
    },
    {
      id: 'marunouchi', name: 'Marunouchi Line', operator: 'Tokyo Metro',
      color: '#E60012', loop: false, headwayMin: 4, hopMin: 3,
      stations: ['ikebukuro', 'ochanomizu', 'tokyo', 'ginza', 'kasumigaseki', 'yotsuya', 'shinjuku']
    },
    {
      id: 'ginza_metro', name: 'Ginza Line', operator: 'Tokyo Metro',
      color: '#FF9500', loop: false, headwayMin: 4, hopMin: 3,
      stations: ['shibuya', 'omotesando', 'ginza', 'ueno', 'asakusa']
    }
  ];

  var NETWORK = { stations: stations, lines: lines, viewBox: '0 0 1000 800' };

  if (typeof window !== 'undefined') { window.NETWORK = NETWORK; }
  if (typeof module !== 'undefined' && module.exports) { module.exports = { NETWORK: NETWORK }; }
})();
