/*
 * Tokyo rail network — schematic layout, "+JR" scope.
 *
 * Lines run at 0°, 45°, or 90° angles in the style of the official Tokyo map.
 * viewBox: 0 0 1000 720
 *
 * To adjust a station position, edit its x/y directly here and reload.
 * Geographic accuracy lives in BUILD_PLAN.md; this file drives the visual POC.
 */
(function () {

  var stations = {
    // ---- Yamanote Loop (29 stations, clockwise from Tokyo) ----
    tokyo:         { name: 'Tokyo',         x: 730, y: 440 },
    yurakucho:     { name: 'Yūrakuchō',     x: 730, y: 472 },
    shimbashi:     { name: 'Shimbashi',     x: 718, y: 502 },
    hamamatsucho:  { name: 'Hamamatsuchō',  x: 698, y: 527 },
    tamachi:       { name: 'Tamachi',       x: 676, y: 549 },
    shinagawa:     { name: 'Shinagawa',     x: 652, y: 568 },
    osaki:         { name: 'Ōsaki',         x: 597, y: 586 },
    gotanda:       { name: 'Gotanda',       x: 547, y: 583 },
    meguro:        { name: 'Meguro',        x: 497, y: 570 },
    ebisu:         { name: 'Ebisu',         x: 458, y: 550 },
    shibuya:       { name: 'Shibuya',       x: 415, y: 528 },
    harajuku:      { name: 'Harajuku',      x: 372, y: 507 },
    yoyogi:        { name: 'Yoyogi',        x: 331, y: 486 },
    shinjuku:      { name: 'Shinjuku',      x: 268, y: 460 },
    shinokubo:     { name: 'Shin-Ōkubo',    x: 253, y: 415 },
    takadanobaba:  { name: 'Takadanobaba',  x: 248, y: 370 },
    mejiro:        { name: 'Mejiro',        x: 252, y: 325 },
    ikebukuro:     { name: 'Ikebukuro',     x: 272, y: 278 },
    otsuka:        { name: 'Ōtsuka',        x: 352, y: 216 },
    sugamo:        { name: 'Sugamo',        x: 420, y: 196 },
    komagome:      { name: 'Komagome',      x: 496, y: 182 },
    tabata:        { name: 'Tabata',        x: 574, y: 170 },
    nishinippori:  { name: 'Nishi-Nippori', x: 624, y: 190 },
    nippori:       { name: 'Nippori',       x: 660, y: 222 },
    uguisudani:    { name: 'Uguisudani',    x: 698, y: 258 },
    ueno:          { name: 'Ueno',          x: 718, y: 293 },
    okachimachi:   { name: 'Okachimachi',   x: 728, y: 330 },
    akihabara:     { name: 'Akihabara',     x: 730, y: 365 },
    kanda:         { name: 'Kanda',         x: 730, y: 403 },

    // ---- Non-Yamanote stations ----
    akabane:       { name: 'Akabane',       x: 485,  y: 84  },  // KT north terminus
    ochanomizu:    { name: 'Ochanomizu',    x: 716,  y: 348 },  // Chuo/Sobu/Marunouchi hub
    yotsuya:       { name: 'Yotsuya',       x: 510,  y: 442 },  // Chuo + Marunouchi
    nakano:        { name: 'Nakano',        x: 148,  y: 454 },  // Chuo west terminus
    sendagaya:     { name: 'Sendagaya',     x: 362,  y: 460 },  // Sobu only
    asakusabashi:  { name: 'Asakusabashi',  x: 795,  y: 362 },  // Sobu east
    kinshicho:     { name: 'Kinshichō',     x: 868,  y: 360 },  // Sobu east terminus
    ginza:         { name: 'Ginza',         x: 774,  y: 470 },  // Marunouchi + Ginza Metro
    kasumigaseki:  { name: 'Kasumigaseki',  x: 646,  y: 490 },  // Marunouchi
    omotesando:    { name: 'Omote-sandō',   x: 488,  y: 530 },  // Ginza Metro
    asakusa:       { name: 'Asakusa',       x: 800,  y: 220 }   // Ginza Metro east terminus
  };

  var yamanoteOrder = [
    'tokyo', 'yurakucho', 'shimbashi', 'hamamatsucho', 'tamachi', 'shinagawa',
    'osaki', 'gotanda', 'meguro', 'ebisu', 'shibuya', 'harajuku', 'yoyogi',
    'shinjuku', 'shinokubo', 'takadanobaba', 'mejiro', 'ikebukuro', 'otsuka',
    'sugamo', 'komagome', 'tabata', 'nishinippori', 'nippori', 'uguisudani',
    'ueno', 'okachimachi', 'akihabara', 'kanda'
  ];

  var lines = [
    {
      id: 'yamanote', name: 'Yamanote Line', operator: 'JR East',
      color: '#9ACD32', loop: true, headwayMin: 3, hopMin: 2,
      stations: yamanoteOrder
    },
    {
      id: 'keihin_tohoku', name: 'Keihin-Tōhoku Line', operator: 'JR East',
      color: '#00B2E3', loop: false, headwayMin: 4, hopMin: 3,
      stations: ['akabane', 'tabata', 'nishinippori', 'nippori', 'uguisudani',
        'ueno', 'okachimachi', 'akihabara', 'kanda', 'tokyo', 'yurakucho',
        'shimbashi', 'hamamatsucho', 'tamachi', 'shinagawa']
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

  // Station label anchors for the SVG (only the most recognisable hubs)
  var labels = {
    tokyo:        { dx: 12, dy: 4,   anchor: 'start'  },
    shinjuku:     { dx: -12, dy: 4,  anchor: 'end'    },
    ikebukuro:    { dx: -12, dy: 4,  anchor: 'end'    },
    shibuya:      { dx: -12, dy: 4,  anchor: 'end'    },
    ueno:         { dx: 12, dy: 4,   anchor: 'start'  },
    shinagawa:    { dx: 12, dy: 4,   anchor: 'start'  },
    akihabara:    { dx: 12, dy: 4,   anchor: 'start'  },
    akabane:      { dx: 0,  dy: -10, anchor: 'middle' },
    kinshicho:    { dx: 12, dy: 4,   anchor: 'start'  },
    nakano:       { dx: -12, dy: 4,  anchor: 'end'    },
    asakusa:      { dx: 12, dy: -8,  anchor: 'start'  },
    ochanomizu:   { dx: 12, dy: -8,  anchor: 'start'  }
  };

  var NETWORK = { stations: stations, lines: lines, labels: labels, viewBox: '0 0 1000 720' };

  if (typeof window !== 'undefined') { window.NETWORK = NETWORK; }
  if (typeof module !== 'undefined' && module.exports) { module.exports = { NETWORK: NETWORK }; }
})();
