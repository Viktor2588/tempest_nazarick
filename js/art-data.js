/* ============================================================
   art-data.js — Reine Darstellungsmetadaten für Canvas-Szenen.
   Keine Spiellogik; klassisches Script für file:// und Tests.
   ============================================================ */
(function () {
  'use strict';
  var root = (typeof window !== 'undefined') ? window : globalThis;

  var lineAliases = {
    'schleim': 'slime', 'slime': 'slime',
    'goblin': 'goblin',
    'wolf': 'wolf', 'direwolf': 'wolf',
    'oger': 'ogre', 'ogre': 'ogre',
    'untot': 'undead', 'skelett': 'undead', 'undead': 'undead',
    'drache': 'dragon', 'dragon': 'dragon'
  };

  var units = {
    slime:  { col: 0, row: 0, scale: 0.78, anchorY: 0.84 },
    goblin: { col: 1, row: 0, scale: 1.00, anchorY: 0.91 },
    wolf:   { col: 2, row: 0, scale: 1.03, anchorY: 0.87 },
    ogre:   { col: 0, row: 1, scale: 1.08, anchorY: 0.94 },
    undead: { col: 1, row: 1, scale: 1.00, anchorY: 0.94 },
    dragon: { col: 2, row: 1, scale: 1.05, anchorY: 0.92 }
  };

  var locationOrder = [
    'hauptstadt', 'wald', 'site_manaquelle', 'site_jagdlager', 'hoehlen', 'site_mine',
    'sumpf', 'site_handel', 'ruinen', 'site_archiv', 'grenze', 'gebirge',
    'site_drachennest', 'schattenreich', 'site_seelenbrunnen', 'site_schatzhort', 'himmelsfeste', 'goetterthron'
  ];
  var mapObjects = {};
  locationOrder.forEach(function (id, index) {
    mapObjects[id] = { col: index % 6, row: Math.floor(index / 6), scale: id === 'hauptstadt' ? 1.15 : (id.indexOf('site_') === 0 ? 0.88 : 1) };
  });

  function normalizeLine(line) {
    return String(line || '').toLowerCase().replace(/[^a-zäöüß]/g, '');
  }

  function unitFor(line) {
    var key = lineAliases[normalizeLine(line)] || null;
    if (!key || !units[key]) return null;
    var source = units[key], out = { key: key };
    for (var prop in source) out[prop] = source[prop];
    return out;
  }

  function mapObjectFor(nodeId) {
    var source = mapObjects[nodeId]; if (!source) return null;
    return { key: nodeId, col: source.col, row: source.row, scale: source.scale };
  }

  function armyFor(rulerLed, direction) {
    var directions = { east: 0, south: 1, west: 2, north: 3 };
    return { col: directions[direction] == null ? 0 : directions[direction], row: rulerLed ? 0 : 1 };
  }

  root.GameArtData = {
    assets: {
      battleJura: 'assets/battle/jura-clearing.png',
      battleJuraUnits: 'assets/battle/jura-units.png',
      adventureMap: 'assets/tempest-adventure-map.png',
      adventureLocations: 'assets/world/adventure-locations.png',
      adventureArmies: 'assets/world/adventure-armies.png'
    },
    battleAtlas: { columns: 3, rows: 2, units: units },
    adventureLocationAtlas: { columns: 6, rows: 3, objects: mapObjects },
    adventureArmyAtlas: { columns: 4, rows: 2 },
    battleLines: Object.keys(units),
    unitFor: unitFor,
    mapObjectFor: mapObjectFor,
    armyFor: armyFor
  };
})();
