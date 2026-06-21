/* ============================================================
   ui-siege.js — Aktive Belagerungsabwehr (Phase 43).
   Prominente Übersichtskarte bei drohendem Raid + interaktives
   Verteidigungsmodal (Mauer-/Bresche-Management). Erweitert GameUI.
   ============================================================ */
(function () {
  'use strict';
  var UI = window.GameUI, H = window.GameUIInternal, SYS = window.GameSystems;
  if (!UI || !H || !SYS) throw new Error('ui-siege.js muss nach ui.js und systems-siege.js geladen werden');
  var el = H.el, btn = H.btn, bar = H.bar, fmt = H.fmt;
  var openModal = H.openModal, closeModal = H.closeModal, toast = H.toast, costText = H.costText;

  function shieldPips(value, max) {
    var row = el('div', { class: 'siege-shield', 'aria-label': 'Bannschild ' + value + ' von ' + max });
    for (var i = 0; i < max; i++) row.appendChild(el('span', { text: i < value ? '✨' : '◇' }));
    return row;
  }

  Object.assign(UI, {
    buildSiegeCard: function () {
      var self = this, status = SYS.siegeStatus(this.state);
      if (!status.pending && !status.active) return null;
      var rv = status.rival;
      var active = status.active;
      var card = el('div', { class: 'card siege-card' + (active ? ' active' : '') }, [
        el('div', { class: 'card-head' }, [
          el('div', { class: 'card-emoji', text: '🏰' }),
          el('div', { class: 'card-title' }, [
            el('div', { class: 'name' }, ['Belagerung', el('span', { class: 'pill tag-bad', text: active ? '● Verteidigung läuft' : '⚠ Angriff droht' })]),
            el('div', { class: 'meta', text: (rv ? rv.icon + ' ' + rv.name : 'Ein Rivale') + (active ? (' · Mauer ' + Math.ceil(active.wallHp) + '/' + active.wallMax + ' · Welle ' + active.round + '/' + active.rounds) : (' greift an (Kraft ~' + (status.raid ? status.raid.power : '?') + '). Verteidige aktiv, um auch Stärkere abzuwehren.')) })
          ])
        ]),
        el('div', { class: 'card-actions' }, [
          btn(active ? '🛡️ Verteidigung fortsetzen' : '🛡️ Aktiv verteidigen', function () { self.openSiegeModal(); }, { cls: 'btn-action' })
        ])
      ]);
      return card;
    },

    openSiegeModal: function () {
      var self = this, s = this.state;
      var status = SYS.siegeStatus(s);
      if (!status.active) {
        var start = SYS.startSiege(s);
        if (!start.ok) { toast(start.reason, 'bad'); return; }
        self.persist(s); self.refresh();
        status = SYS.siegeStatus(s);
      }
      var active = status.active, rv = status.rival;
      var body = el('div', { class: 'siege-battle' });
      body.appendChild(el('div', { class: 'siege-versus' }, [
        el('div', { class: 'siege-side' }, [
          el('small', { text: '🏰 Mauer von Tempest' }),
          bar(active.wallHp / active.wallMax, 'good'),
          el('b', { text: Math.ceil(active.wallHp) + ' / ' + active.wallMax })
        ]),
        el('div', { class: 'siege-side' }, [
          el('small', { text: (rv ? rv.icon + ' ' : '') + (rv ? rv.name : 'Rivale') + ' – Angriffskraft' }),
          bar(active.rivalRemaining / active.rivalPower, 'bad'),
          el('b', { text: Math.ceil(active.rivalRemaining) + ' / ' + active.rivalPower })
        ])
      ]));
      body.appendChild(el('div', { class: 'siege-meters' }, [
        el('div', null, [el('small', { text: 'Welle' }), el('b', { text: active.round + ' / ' + active.rounds })]),
        el('div', null, [el('small', { text: 'Bannschild' }), shieldPips(active.shield, SYS.SIEGE_MAX_SHIELD)])
      ]));

      function actBtn(id, label, hint, disabled) {
        return btn(label, function () {
          var res = SYS.siegeAction(s, id);
          if (!res.ok) { toast(res.reason, 'bad'); return; }
          self.persist(s); self.updateTopbar(); self.render();
          if (res.finished) self.openSiegeResult(res.result);
          else self.openSiegeModal();
        }, { cls: 'siege-action action-' + id, disabled: !!disabled, cost: hint });
      }
      body.appendChild(el('div', { class: 'siege-actions' }, [
        actBtn('verstaerken', '🧱 Verstärken', 'Mauer reparieren'),
        actBtn('ausfall', '⚔️ Ausfall', 'Feindkraft senken'),
        actBtn('bannschild', '✨ Bannschild', active.shield + ' übrig', active.shield <= 0)
      ]));
      var log = el('div', { class: 'siege-log' });
      (active.log || []).forEach(function (line) { log.appendChild(el('div', { text: line })); });
      body.appendChild(log);
      body.appendChild(el('div', { class: 'siege-foot' }, [
        btn('🏳️ Abbrechen', function () {
          SYS.abortSiege(s); self.persist(s); closeModal(); self.refresh();
        }, { small: true, cls: 'btn-ghost' }),
        el('span', { text: 'Bricht ab → der Angriff entscheidet sich automatisch.' })
      ]));
      openModal('Belagerung · ' + (rv ? rv.name : 'Verteidigung'), body, '🏰', 'siege-modal');
    },

    openSiegeResult: function (result) {
      var self = this;
      var rv = window.GameData.rival(result.rivalId);
      var body = el('div', { class: 'siege-result ' + (result.won ? 'won' : 'lost') }, [
        el('div', { class: 'siege-result-icon', text: result.won ? '🏰' : '💥' }),
        el('h4', { text: result.won ? 'Angriff abgewehrt!' : 'Mauern durchbrochen' }),
        el('p', { text: result.won ? ('Die Mauern hielten ' + result.rounds + ' Wellen stand.') : 'Kein dauerhafter Verlust – nur Plünderung und Verwundete.' }),
        result.won && result.bonus ? el('div', { class: 'siege-loot', text: 'Aktiv-Bonus: ' + costText(result.bonus) + (rv && rv.reward ? '  · Beute: ' + costText(rv.reward) : '') }) : null,
        el('div', { class: 'card-actions' }, [
          btn('Zur Übersicht', function () { closeModal(); self.refresh(); }, { cls: 'btn-action' })
        ])
      ]);
      openModal(result.won ? 'Abgewehrt' : 'Durchbruch', body, result.won ? '🏰' : '💥', 'siege-modal result');
    }
  });
})();
