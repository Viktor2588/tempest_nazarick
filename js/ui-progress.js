/* ============================================================
   ui-progress.js — Erfolge & Reichsstatistik (Modal).
   Erweitert GameUI nach ui.js; klassisches Script ohne Build.
   Liest GameAchievements + state.metrics; verändert keinen Zustand.
   ============================================================ */
(function () {
  'use strict';
  var UI = window.GameUI, H = window.GameUIInternal;
  if (!UI || !H) throw new Error('ui-progress.js muss nach ui.js geladen werden');
  var GD = window.GameData;
  var el = H.el, fmt = H.fmt, bar = H.bar, btn = H.btn;
  var openModal = H.openModal, costText = H.costText;

  function ACH() { return window.GameAchievements; }

  // ---------- abgeleitete Statistikwerte ----------
  function num(x) { var n = Number(x); return isFinite(n) ? n : 0; }
  function m(s, k) { return num(s.metrics && s.metrics[k]); }
  function namedCount(s) { return (s.creatures || []).filter(function (c) { return c.named; }).length; }
  function buildingsTotal(s) { var sum = 0; for (var id in (s.buildings || {})) sum += num(s.buildings[id]); return sum; }
  function arrLen(s, k) { return Array.isArray(s[k]) ? s[k].length : 0; }

  function playtime(s) {
    var t = Math.max(0, Math.floor(num(s.tick)));
    var h = Math.floor(t / 3600), mi = Math.floor((t % 3600) / 60), se = t % 60;
    if (h > 0) return h + ' h ' + mi + ' min';
    if (mi > 0) return mi + ' min ' + se + ' s';
    return se + ' s';
  }

  function strongestCreature(s) {
    var best = null, bestKey = -1;
    (s.creatures || []).forEach(function (c) {
      var sp = GD.creature(c.speciesId); if (!sp) return;
      var key = GD.rankIndex(sp.rank) * 1000 + num(c.level);
      if (key > bestKey) { bestKey = key; best = { c: c, sp: sp }; }
    });
    if (!best) return '—';
    return (best.c.named ? best.c.name : best.sp.name) + ' (' + best.sp.rank + ' · Lv ' + num(best.c.level) + ')';
  }

  function statGroups(s) {
    return [
      { label: 'Allgemein', rows: [
        ['⏳', 'Spielzeit', playtime(s)],
        ['💀', 'Seelen gesamt', fmt(m(s, 'seelenGesamt'))],
        ['👑', 'Herrscher', 'Lv ' + num(s.herrscher && s.herrscher.level) + ' · ' + (GD.rulerStages[num(s.herrscher && s.herrscher.stage)] || {}).name],
        ['🏆', 'Erfolge', ACH() ? (ACH().unlockedCount(s) + ' / ' + ACH().total()) : '—']
      ] },
      { label: 'Reich', rows: [
        ['🏰', 'Gebäudestufen', fmt(buildingsTotal(s))],
        ['🏳️', 'Regionen', arrLen(s, 'claimedRegions') + ' / ' + GD.regions.length],
        ['⛏️', 'Anlagen gesichert', '' + arrLen(s, 'claimedMapSites')],
        ['📚', 'Forschungen', '' + arrLen(s, 'research')]
      ] },
      { label: 'Kreaturen', rows: [
        ['✨', 'Beschworen', fmt(m(s, 'summoned'))],
        ['🎖️', 'Benannte Eliten', '' + namedCount(s)],
        ['🧬', 'Evolutionen', fmt(m(s, 'evolutions'))],
        ['🧪', 'Fusionen', '' + m(s, 'fused')],
        ['🐉', 'Stärkste Kreatur', strongestCreature(s)]
      ] },
      { label: 'Kampf', rows: [
        ['🗡️', 'Expeditionen gewonnen', m(s, 'expeditionsWon') + ' / ' + m(s, 'expeditions')],
        ['🛡️', 'Armee-Feldzüge', fmt(m(s, 'armyVictories'))],
        ['♟️', 'Taktik-Siege', fmt(m(s, 'tacticalWins'))],
        ['🚧', 'Raids abgewehrt', '' + m(s, 'raidsRepelled')],
        ['😈', 'Rivalen besiegt', '' + arrLen(s, 'rivalsDefeated')],
        ['🌀', 'Echos geräumt', m(s, 'echoesCleared') + ' (Zyklus ' + num(s.echoes && s.echoes.cycle) + ')']
      ] },
      { label: 'Magie & Schmiede', rows: [
        ['🪄', 'Zauber gelernt', '' + (arrLen(s, 'learnedMagic') + arrLen(s, 'learnedFieldMagic'))],
        ['⚒️', 'Geschmiedet', fmt(m(s, 'crafted'))],
        ['🛠️', 'Aufgewertet', fmt(m(s, 'tempered'))],
        ['📜', 'Baupläne bekannt', '' + arrLen(s, 'unlockedRecipes')]
      ] }
    ];
  }

  function buildStats(s) {
    var box = el('div', { class: 'codex-stats' });
    statGroups(s).forEach(function (g) {
      box.appendChild(el('div', { class: 'section-label', text: g.label }));
      var grid = el('div', { class: 'stat-grid' });
      g.rows.forEach(function (r) {
        grid.appendChild(el('div', { class: 'stat-cell' }, [
          el('span', { class: 'stat-ico', text: r[0] }),
          el('div', { class: 'stat-body' }, [
            el('div', { class: 'stat-k', text: r[1] }),
            el('div', { class: 'stat-v', text: r[2] })
          ])
        ]));
      });
      box.appendChild(grid);
    });
    return box;
  }

  function achievementCard(s, a) {
    var p = ACH().progressOf(s, a);
    var head = el('div', { class: 'ach-head' }, [
      el('span', { class: 'ach-ico', text: a.icon }),
      el('div', { class: 'ach-text' }, [
        el('div', { class: 'ach-title' }, [a.title, el('span', { class: 'ach-state', text: p.done ? '✅' : '🔒' })]),
        el('div', { class: 'ach-desc', text: a.desc })
      ])
    ]);
    var foot = el('div', { class: 'ach-foot' }, [
      bar(p.frac, p.done ? 'good' : ''),
      el('div', { class: 'ach-meta' }, [
        el('span', { text: p.cur + ' / ' + p.max }),
        a.reward ? el('span', { class: 'ach-reward', text: (p.done ? '✔ ' : '🎁 ') + costText(a.reward) }) : null
      ])
    ]);
    return el('div', { class: 'ach-card' + (p.done ? ' done' : '') }, [head, foot]);
  }

  function buildAchievements(s) {
    var box = el('div', { class: 'codex-ach' });
    var done = ACH().unlockedCount(s), total = ACH().total();
    box.appendChild(el('div', { class: 'codex-summary' }, [
      bar(done / total, 'gold'),
      el('div', { class: 'bar-label', text: '🏆 ' + done + ' / ' + total + ' Erfolge freigeschaltet' })
    ]));
    ACH().CATEGORIES.forEach(function (cat) {
      var list = ACH().byCategory(cat.id);
      var unl = list.filter(function (a) { return ACH().progressOf(s, a).done; }).length;
      box.appendChild(el('div', { class: 'section-label', text: cat.icon + ' ' + cat.label + ' · ' + unl + '/' + list.length }));
      var grid = el('div', { class: 'ach-grid' });
      list.forEach(function (a) { grid.appendChild(achievementCard(s, a)); });
      box.appendChild(grid);
    });
    return box;
  }

  Object.assign(UI, {
    // Modal mit zwei Unter-Ansichten: Erfolge und Statistik.
    openCodexModal: function (tab) {
      var self = this, s = this.state;
      if (!ACH()) return;
      this._codexTab = tab || this._codexTab || 'erfolge';
      var body = el('div', { class: 'codex-body' });
      function tabBtn(id, label) {
        return btn(label, function () { self.openCodexModal(id); }, { small: true, cls: self._codexTab === id ? 'btn-gold' : '' });
      }
      body.appendChild(el('div', { class: 'codex-tabs' }, [
        tabBtn('erfolge', '🏆 Erfolge'),
        tabBtn('statistik', '📊 Statistik')
      ]));
      body.appendChild(this._codexTab === 'statistik' ? buildStats(s) : buildAchievements(s));
      openModal('Erfolge & Statistik', body, '🏆', 'codex-modal');
    }
  });
})();
