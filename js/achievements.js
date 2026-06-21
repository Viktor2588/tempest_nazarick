/* ============================================================
   achievements.js — Erfolge (parallele Langzeitziele).
   DOM-frei; klassisches Script für file:// und Bun-Tests.

   Abgrenzung: GameSystems.QUESTS ist die LINEARE Tutorial-Kette
   (genau ein Ziel aktiv). Erfolge laufen PARALLEL über Kategorien
   und bauen auf den bereits gepflegten state.metrics auf.

   Bereitgestellt als window.GameAchievements / globalThis.
   ============================================================ */
(function () {
  'use strict';
  var root = (typeof window !== 'undefined') ? window : globalThis;
  function GD() { return root.GameData; }
  function SI() { return root.GameSystemsInternal; }

  // ---------- sichere Lese-Helfer auf den Spielzustand ----------
  function num(x) { var n = Number(x); return isFinite(n) ? n : 0; }
  function metric(s, key) { return num(s.metrics && s.metrics[key]); }
  function arrLen(s, key) { return Array.isArray(s[key]) ? s[key].length : 0; }

  function buildingsTotal(s) {
    var sum = 0; for (var id in (s.buildings || {})) sum += num(s.buildings[id]); return sum;
  }
  function namedCount(s) {
    return (s.creatures || []).filter(function (c) { return c.named; }).length;
  }
  function highestRankIdx(s) {
    var best = -1;
    (s.creatures || []).forEach(function (c) {
      var sp = GD() && GD().creature(c.speciesId);
      if (sp) best = Math.max(best, GD().rankIndex(sp.rank));
    });
    return best;
  }
  function maxCreatureLevel(s) {
    var best = 0;
    (s.creatures || []).forEach(function (c) { best = Math.max(best, num(c.level)); });
    return best;
  }
  function divineItemCount(s) {
    if (!GD()) return 0;
    var top = GD().rarities.length - 1;
    return (s.inventory || []).filter(function (it) { return num(it.quality) >= top; }).length;
  }
  function talentsSpent(s) {
    var t = (s.herrscher && s.herrscher.talents) || {}, sum = 0;
    for (var id in t) sum += num(t[id]);
    return sum;
  }
  function regionCount() { return (GD() && GD().regions) ? GD().regions.length : 10; }
  function maxStageIdx() { return (GD() && GD().rulerStages) ? GD().rulerStages.length - 1 : 5; }

  // ---------- Erfolgsdefinitionen ----------
  // cur(s) -> aktueller Wert; goal -> Zahl oder Funktion (dynamisches Ziel);
  // reward -> einmalige Ressourcen beim Freischalten (optional).
  var CATEGORIES = [
    { id: 'reich', icon: '🏰', label: 'Reich' },
    { id: 'kreaturen', icon: '🐉', label: 'Kreaturen' },
    { id: 'kampf', icon: '⚔️', label: 'Kampf' },
    { id: 'arkanum', icon: '🔮', label: 'Magie & Schmiede' },
    { id: 'herrschaft', icon: '👑', label: 'Herrschaft' }
  ];

  var ACHIEVEMENTS = [
    // ---- Reich ----
    { id: 'r_build8', cat: 'reich', icon: '🏘️', title: 'Siedlung', desc: 'Errichte Gebäude im Gesamtwert von 8 Stufen.',
      goal: 8, cur: buildingsTotal, reward: { gold: 150 } },
    { id: 'r_build20', cat: 'reich', icon: '🏙️', title: 'Metropole', desc: 'Errichte Gebäude im Gesamtwert von 20 Stufen.',
      goal: 20, cur: buildingsTotal, reward: { gold: 500, material: 300 } },
    { id: 'r_build40', cat: 'reich', icon: '🌆', title: 'Reich der Wunder', desc: 'Errichte Gebäude im Gesamtwert von 40 Stufen.',
      goal: 40, cur: buildingsTotal, reward: { gold: 2000, wissen: 500 } },
    { id: 'r_region3', cat: 'reich', icon: '🚩', title: 'Eroberer', desc: 'Erobere 3 Regionen.',
      goal: 3, cur: function (s) { return arrLen(s, 'claimedRegions'); }, reward: { seelen: 120 } },
    { id: 'r_region6', cat: 'reich', icon: '🏴', title: 'Hegemon', desc: 'Erobere 6 Regionen.',
      goal: 6, cur: function (s) { return arrLen(s, 'claimedRegions'); }, reward: { seelen: 400 } },
    { id: 'r_regionAll', cat: 'reich', icon: '👑', title: 'Herr von Jura', desc: 'Erobere alle Regionen der Welt.',
      goal: regionCount, cur: function (s) { return arrLen(s, 'claimedRegions'); }, reward: { seelen: 1500, gold: 2000 } },
    { id: 'r_sites3', cat: 'reich', icon: '⛏️', title: 'Außenposten', desc: 'Sichere 3 Ressourcenanlagen auf der Karte.',
      goal: 3, cur: function (s) { return arrLen(s, 'claimedMapSites'); }, reward: { material: 300 } },
    { id: 'r_research5', cat: 'reich', icon: '📚', title: 'Gelehrtenhof', desc: 'Schließe 5 Forschungen ab.',
      goal: 5, cur: function (s) { return arrLen(s, 'research'); }, reward: { wissen: 300 } },

    // ---- Kreaturen ----
    { id: 'k_summon5', cat: 'kreaturen', icon: '✨', title: 'Beschwörer', desc: 'Beschwöre 5-mal Kreaturen.',
      goal: 5, cur: function (s) { return metric(s, 'summoned'); }, reward: { magie: 120 } },
    { id: 'k_summon25', cat: 'kreaturen', icon: '🌟', title: 'Heerführer', desc: 'Beschwöre 25-mal Kreaturen.',
      goal: 25, cur: function (s) { return metric(s, 'summoned'); }, reward: { magie: 600 } },
    { id: 'k_named1', cat: 'kreaturen', icon: '🔤', title: 'Namensgeber', desc: 'Gib einer Kreatur einen wahren Namen.',
      goal: 1, cur: function (s) { return metric(s, 'named'); }, reward: { seelen: 30 } },
    { id: 'k_named10', cat: 'kreaturen', icon: '🎖️', title: 'Hof der Eliten', desc: 'Halte 10 benannte Eliten gleichzeitig.',
      goal: 10, cur: namedCount, reward: { seelen: 300 } },
    { id: 'k_named20', cat: 'kreaturen', icon: '🏛️', title: 'Volle Tafel', desc: 'Halte 20 benannte Eliten gleichzeitig.',
      goal: 20, cur: namedCount, reward: { seelen: 1000 } },
    { id: 'k_evo5', cat: 'kreaturen', icon: '🧬', title: 'Wandler', desc: 'Entwickle 5-mal eine Kreatur weiter.',
      goal: 5, cur: function (s) { return metric(s, 'evolutions'); }, reward: { seelen: 150 } },
    { id: 'k_rankA', cat: 'kreaturen', icon: '🅰️', title: 'Aufstieg zur Elite', desc: 'Bringe eine Kreatur auf Rang A.',
      goal: 4, cur: highestRankIdx, reward: { seelen: 300 } },
    { id: 'k_rankS', cat: 'kreaturen', icon: '💠', title: 'Klasse S', desc: 'Bringe eine Kreatur auf Rang S.',
      goal: 5, cur: highestRankIdx, reward: { seelen: 800 } },
    { id: 'k_rankSS', cat: 'kreaturen', icon: '☄️', title: 'Wahre Katastrophe', desc: 'Bringe eine Kreatur auf Rang SS (Katastrophe).',
      goal: 6, cur: highestRankIdx, reward: { seelen: 2500 } },
    { id: 'k_level50', cat: 'kreaturen', icon: '📈', title: 'Veteran', desc: 'Bringe eine Kreatur auf Level 50.',
      goal: 50, cur: maxCreatureLevel, reward: { seelen: 300 } },
    { id: 'k_level100', cat: 'kreaturen', icon: '💯', title: 'Vollendet', desc: 'Bringe eine Kreatur auf Level 100.',
      goal: 100, cur: maxCreatureLevel, reward: { seelen: 1500 } },
    { id: 'k_fusion1', cat: 'kreaturen', icon: '🧪', title: 'Chimären-Schmied', desc: 'Führe eine Chimära-Fusion durch.',
      goal: 1, cur: function (s) { return metric(s, 'fused'); }, reward: { seelen: 300 } },
    { id: 'k_fusion5', cat: 'kreaturen', icon: '⚗️', title: 'Meister der Chimären', desc: 'Führe 5 Chimära-Fusionen durch.',
      goal: 5, cur: function (s) { return metric(s, 'fused'); }, reward: { seelen: 1200 } },

    // ---- Kampf ----
    { id: 'c_exped1', cat: 'kampf', icon: '🗡️', title: 'Erste Eroberung', desc: 'Gewinne eine Expedition.',
      goal: 1, cur: function (s) { return metric(s, 'expeditionsWon'); }, reward: { gold: 100 } },
    { id: 'c_exped25', cat: 'kampf', icon: '⚔️', title: 'Feldherr', desc: 'Gewinne 25 Expeditionen.',
      goal: 25, cur: function (s) { return metric(s, 'expeditionsWon'); }, reward: { gold: 800 } },
    { id: 'c_army10', cat: 'kampf', icon: '🛡️', title: 'Kriegsherr', desc: 'Gewinne 10 Feldzüge mit Armeegruppen.',
      goal: 10, cur: function (s) { return metric(s, 'armyVictories'); }, reward: { gold: 600, material: 400 } },
    { id: 'c_tactical10', cat: 'kampf', icon: '♟️', title: 'Taktiker', desc: 'Gewinne 10 taktische Rasterkämpfe.',
      goal: 10, cur: function (s) { return metric(s, 'tacticalWins'); }, reward: { wissen: 300 } },
    { id: 'c_repel1', cat: 'kampf', icon: '🚧', title: 'Standhaft', desc: 'Wehre den Angriff eines Rivalen ab.',
      goal: 1, cur: function (s) { return metric(s, 'raidsRepelled'); }, reward: { material: 200 } },
    { id: 'c_rivals', cat: 'kampf', icon: '😈', title: 'Bezwinger der Lords', desc: 'Besiege 3 Rivalen-Dämonenlords endgültig.',
      goal: 3, cur: function (s) { return arrLen(s, 'rivalsDefeated'); }, reward: { seelen: 1000, gold: 1000 } },
    { id: 'c_echo10', cat: 'kampf', icon: '🌀', title: 'Echo-Jäger', desc: 'Räume 10 Echo-Knoten.',
      goal: 10, cur: function (s) { return metric(s, 'echoesCleared'); }, reward: { material: 600 } },
    { id: 'c_echoBoss3', cat: 'kampf', icon: '🔮', title: 'Kern-Brecher', desc: 'Bezwinge 3 Echo-Kerne (Bosse).',
      goal: 3, cur: function (s) { return metric(s, 'echoBosses'); }, reward: { seelen: 600 } },
    { id: 'c_echocycle5', cat: 'kampf', icon: '♾️', title: 'Tiefen-Wanderer', desc: 'Erreiche Echo-Zyklus 5.',
      goal: 5, cur: function (s) { return num(s.echoes && s.echoes.cycle); }, reward: { wissen: 800 } },

    // ---- Magie & Schmiede ----
    { id: 'a_magic5', cat: 'arkanum', icon: '🪄', title: 'Magus', desc: 'Erlerne 5 Reichszauber/Rituale.',
      goal: 5, cur: function (s) { return arrLen(s, 'learnedMagic'); }, reward: { magie: 300 } },
    { id: 'a_magic12', cat: 'arkanum', icon: '🌌', title: 'Großmagier', desc: 'Erlerne 12 Reichszauber/Rituale.',
      goal: 12, cur: function (s) { return arrLen(s, 'learnedMagic'); }, reward: { magie: 1000 } },
    { id: 'a_field5', cat: 'arkanum', icon: '🔥', title: 'Feldzauberer', desc: 'Erlerne 5 Feldzauber.',
      goal: 5, cur: function (s) { return arrLen(s, 'learnedFieldMagic'); }, reward: { magie: 300 } },
    { id: 'a_craft10', cat: 'arkanum', icon: '⚒️', title: 'Schmiedemeister', desc: 'Schmiede 10 Ausrüstungsstücke.',
      goal: 10, cur: function (s) { return metric(s, 'crafted'); }, reward: { material: 400 } },
    { id: 'a_temper10', cat: 'arkanum', icon: '🛠️', title: 'Verfeinerer', desc: 'Werte Ausrüstung 10-mal auf.',
      goal: 10, cur: function (s) { return metric(s, 'tempered'); }, reward: { material: 600 } },
    { id: 'a_divine', cat: 'arkanum', icon: '🌠', title: 'Göttliche Schmiede', desc: 'Bringe ein Ausrüstungsstück auf Göttlich.',
      goal: 1, cur: divineItemCount, reward: { material: 1500, seelen: 300 } },

    // ---- Herrschaft ----
    { id: 'h_level10', cat: 'herrschaft', icon: '🌟', title: 'Erwachter Herrscher', desc: 'Erreiche Herrscher-Level 10.',
      goal: 10, cur: function (s) { return num(s.herrscher && s.herrscher.level); }, reward: { magie: 300 } },
    { id: 'h_stage3', cat: 'herrschaft', icon: '👿', title: 'Dämonenlord', desc: 'Steige zur Herrscher-Stufe Dämonenlord auf.',
      goal: 3, cur: function (s) { return num(s.herrscher && s.herrscher.stage); }, reward: { magie: 1000, gold: 1000 } },
    { id: 'h_stageMax', cat: 'herrschaft', icon: '🟪', title: 'Wahrer Dämonenlord', desc: 'Erreiche die höchste Herrscher-Stufe.',
      goal: maxStageIdx, cur: function (s) { return num(s.herrscher && s.herrscher.stage); }, reward: { magie: 3000, seelen: 1000 } },
    { id: 'h_talents10', cat: 'herrschaft', icon: '🌳', title: 'Begabt', desc: 'Investiere 10 Talentpunkte.',
      goal: 10, cur: talentsSpent, reward: { gold: 500 } },
    { id: 'h_souls', cat: 'herrschaft', icon: '💀', title: 'Seelenherr', desc: 'Sammle insgesamt 10.000 Seelen.',
      goal: 10000, cur: function (s) { return metric(s, 'seelenGesamt'); }, reward: { seelen: 500 } },
    { id: 'h_play1h', cat: 'herrschaft', icon: '⏳', title: 'Beständig', desc: 'Herrsche eine Stunde lang über Tempest.',
      goal: 3600, cur: function (s) { return num(s.tick); }, reward: { gold: 500 } }
  ];

  var BY_ID = {};
  ACHIEVEMENTS.forEach(function (a) { BY_ID[a.id] = a; });

  function goalOf(a) { return typeof a.goal === 'function' ? a.goal() : a.goal; }
  function ensure(s) { if (!Array.isArray(s.achievements)) s.achievements = []; }
  function isUnlocked(s, id) { return Array.isArray(s.achievements) && s.achievements.indexOf(id) >= 0; }

  // Fortschritt eines Erfolgs (für die UI).
  function progressOf(s, a) {
    var max = Math.max(1, goalOf(a));
    var cur = Math.max(0, Math.floor(a.cur(s)));
    var done = isUnlocked(s, a.id) || cur >= max;
    return { cur: Math.min(cur, max), max: max, frac: Math.min(1, cur / max), done: done };
  }

  function unlockedCount(s) {
    ensure(s);
    return ACHIEVEMENTS.reduce(function (n, a) { return n + (s.achievements.indexOf(a.id) >= 0 ? 1 : 0); }, 0);
  }

  // Prüft alle noch nicht erreichten Erfolge; schaltet erfüllte frei,
  // gewährt einmalige Belohnung + Chronik-Eintrag. Gibt neu Freigeschaltete zurück.
  function evaluate(s) {
    ensure(s);
    var si = SI(), fresh = [];
    ACHIEVEMENTS.forEach(function (a) {
      if (s.achievements.indexOf(a.id) >= 0) return;
      if (Math.floor(a.cur(s)) < goalOf(a)) return;
      s.achievements.push(a.id);
      if (a.reward && si && si.addResources) si.addResources(s, a.reward);
      if (si && si.log) si.log(s, '🏆 Erfolg freigeschaltet: ' + a.title + '.', 'gold');
      fresh.push(a);
    });
    return fresh;
  }

  // Beim Laden still bis zum tatsächlichen Stand vorrücken (keine Belohnungsflut
  // für Erfolge, die vor Einführung des Systems längst erfüllt waren).
  function sync(s) {
    ensure(s);
    ACHIEVEMENTS.forEach(function (a) {
      if (s.achievements.indexOf(a.id) < 0 && Math.floor(a.cur(s)) >= goalOf(a)) s.achievements.push(a.id);
    });
    return s.achievements.length;
  }

  function byCategory(catId) {
    return ACHIEVEMENTS.filter(function (a) { return a.cat === catId; });
  }

  root.GameAchievements = {
    ACHIEVEMENTS: ACHIEVEMENTS,
    CATEGORIES: CATEGORIES,
    total: function () { return ACHIEVEMENTS.length; },
    get: function (id) { return BY_ID[id] || null; },
    goalOf: goalOf,
    isUnlocked: isUnlocked,
    progressOf: progressOf,
    unlockedCount: unlockedCount,
    byCategory: byCategory,
    evaluate: evaluate,
    sync: sync
  };
})();
