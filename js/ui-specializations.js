/* ============================================================
   ui-specializations.js — Reichsdoktrinen, Bezirks-Slots und
   Anführerschulen (Phase 50). Erweitert GameUI.
   ============================================================ */
(function () {
  'use strict';
  var UI = window.GameUI, H = window.GameUIInternal;
  if (!UI || !H) throw new Error('ui-specializations.js muss nach ui.js geladen werden');
  var SYS = window.GameSystems;
  var el = H.el, btn = H.btn, costText = H.costText;
  var openModal = H.openModal, closeModal = H.closeModal, toast = H.toast;

  function doctrineName(state) {
    var selected = SYS.activeDoctrine(state);
    return selected ? (selected.icon + ' ' + selected.name) : 'Noch nicht ausgerichtet';
  }
  function rebuildText(state) {
    var rebuild = state.specializations.rebuild;
    if (!rebuild) return '';
    var district = SYS.SPECIAL_DISTRICTS.filter(function (entry) { return entry.id === rebuild.districtId; })[0];
    return (district ? district.icon + ' ' + district.name : 'Bezirk') + ' · noch ' + Math.max(0, rebuild.readyTick - state.tick) + ' s';
  }
  function districtSlot(state, slot, ui) {
    var id = state.specializations.districts[slot], district = SYS.SPECIAL_DISTRICTS.filter(function (entry) { return entry.id === id; })[0];
    var rebuilding = state.specializations.rebuild && state.specializations.rebuild.slot === slot;
    return el('div', { class: 'special-slot' + (district ? ' active' : '') + (rebuilding ? ' rebuilding' : '') }, [
      el('div', { class: 'special-slot-icon', text: rebuilding ? '🏗️' : (district ? district.icon : '＋') }),
      el('div', { class: 'special-slot-copy' }, [
        el('div', { class: 'name', text: rebuilding ? 'Im Umbau' : (district ? district.name : 'Freier Bezirksslot') }),
        el('div', { class: 'meta', text: rebuilding ? rebuildText(state) : (district ? district.short : 'Wähle einen aktiven Reichsbonus.') })
      ]),
      btn('Ändern', function () { ui.openDistrictModal(slot); }, {
        small: true,
        disabled: !!state.specializations.rebuild
      })
    ]);
  }

  Object.assign(UI, {
    buildSpecializationBoard: function () {
      var state = this.state, self = this;
      SYS.ensureSpecializations(state);
      var section = el('section', { class: 'special-board', 'aria-label': 'Strategische Spezialisierungen' });
      section.appendChild(el('div', { class: 'special-head' }, [
        el('div', null, [
          el('div', { class: 'section-label', text: 'Strategische Ausrichtung' }),
          el('div', { class: 'special-current', text: doctrineName(state) }),
          el('div', { class: 'muted', text: (SYS.activeDoctrine(state) || {}).short || 'Ohne Doktrin gelten neutrale Kosten und Boni.' })
        ]),
        btn('Doktrin wählen', function () { self.openDoctrineModal(); }, { small: true, cls: SYS.activeDoctrine(state) ? '' : 'btn-gold' })
      ]));

      var autoOptions = [{ id: 'adaptive', icon: '🧭', name: 'Adaptiv' }].concat(SYS.DOCTRINES);
      var auto = el('div', { class: 'special-auto', role: 'group', 'aria-label': 'Auto-Doktrin' });
      autoOptions.forEach(function (entry) {
        var active = state.specializations.autoDoctrine === entry.id;
        auto.appendChild(el('button', {
          type: 'button',
          class: 'profile-segment' + (active ? ' active' : ''),
          'aria-pressed': active ? 'true' : 'false',
          onclick: function () {
            SYS.setDoctrineAutoProfile(state, entry.id);
            toast(entry.icon + ' Auto-Doktrin: ' + entry.name, 'gold');
            self.commit();
          }
        }, [el('span', { text: entry.icon }), el('span', { text: entry.name })]));
      });
      section.appendChild(auto);

      if (state.specializations.rebuild) {
        section.appendChild(el('div', { class: 'special-rebuild', text: '🏗️ Bezirksumbau: ' + rebuildText(state) }));
      }
      var slots = el('div', { class: 'special-slots' });
      for (var i = 0; i < SYS.districtSlots(state); i++) slots.appendChild(districtSlot(state, i, self));
      section.appendChild(slots);
      return section;
    },

    openDoctrineModal: function () {
      var state = this.state, self = this;
      var list = el('div', { class: 'doctrine-list' });
      SYS.DOCTRINES.forEach(function (entry) {
        var active = state.specializations.doctrineId === entry.id;
        var check = active ? { ok: false, reason: 'Aktiv' } : SYS.canSetDoctrine(state, entry.id);
        var cost = SYS.doctrineChangeCost(state, entry.id);
        list.appendChild(el('div', { class: 'doctrine-choice' + (active ? ' active' : '') }, [
          el('div', { class: 'doctrine-icon', text: entry.icon }),
          el('div', { class: 'doctrine-copy' }, [
            el('div', { class: 'name', text: entry.name }),
            el('div', { class: 'meta', text: entry.short }),
            el('div', { class: 'muted', text: 'Bevorzugt: ' + entry.preferredBuildings.map(function (id) {
              var building = window.GameData.building(id); return building ? building.name : id;
            }).join(' · ') })
          ]),
          btn(active ? 'Aktiv' : 'Ausrichten', function () {
            var result = SYS.setDoctrine(state, entry.id, 'manuelle Reichsentscheidung');
            if (!result.ok) { toast(result.reason, 'bad'); return; }
            toast(entry.icon + ' ' + entry.name + ' ist jetzt Reichsdoktrin.', 'gold');
            closeModal(); self.commit();
          }, { small: true, cls: active ? '' : 'btn-gold', disabled: !check.ok, cost: active ? '' : costText(cost) })
        ]));
      });
      openModal('Reichsdoktrin', list, '🧭', 'special-modal');
    },

    openDistrictModal: function (slot) {
      var state = this.state, self = this;
      var list = el('div', { class: 'doctrine-list' });
      SYS.SPECIAL_DISTRICTS.forEach(function (entry) {
        var check = SYS.canConfigureDistrict(state, slot, entry.id);
        list.appendChild(el('div', { class: 'doctrine-choice' }, [
          el('div', { class: 'doctrine-icon', text: entry.icon }),
          el('div', { class: 'doctrine-copy' }, [
            el('div', { class: 'name', text: entry.name }),
            el('div', { class: 'meta', text: entry.short })
          ]),
          btn('Umbauen', function () {
            var result = SYS.configureDistrict(state, slot, entry.id);
            if (!result.ok) { toast(result.reason, 'bad'); return; }
            toast('🏗️ Umbau zu ' + entry.name + ' gestartet.', 'gold');
            closeModal(); self.commit();
          }, { small: true, cls: 'btn-primary', disabled: !check.ok, cost: costText(SYS.districtRebuildCost(state, entry.id)) })
        ]));
      });
      if (state.specializations.districts[slot]) {
        list.appendChild(btn('Slot räumen', function () {
          var result = SYS.clearSpecialDistrict(state, slot);
          if (!result.ok) { toast(result.reason, 'bad'); return; }
          closeModal(); self.commit();
        }, { small: true, cls: 'btn-danger' }));
      }
      openModal('Bezirksslot ' + (slot + 1), list, '🏗️', 'special-modal');
    },

    openLeaderSchoolModal: function (creature) {
      var state = this.state, self = this;
      var list = el('div', { class: 'doctrine-list' });
      SYS.LEADER_SCHOOLS.forEach(function (entry) {
        var active = creature.schoolId === entry.id;
        var check = active ? { ok: false } : SYS.canAssignLeaderSchool(state, creature.uid, entry.id);
        list.appendChild(el('div', { class: 'doctrine-choice' + (active ? ' active' : '') }, [
          el('div', { class: 'doctrine-icon', text: entry.icon }),
          el('div', { class: 'doctrine-copy' }, [
            el('div', { class: 'name', text: entry.name }),
            el('div', { class: 'meta', text: entry.short })
          ]),
          btn(active ? 'Aktiv' : 'Ausbilden', function () {
            var result = SYS.assignLeaderSchool(state, creature.uid, entry.id);
            if (!result.ok) { toast(result.reason, 'bad'); return; }
            toast(entry.icon + ' ' + creature.name + ' ist jetzt ' + entry.name + '.', 'gold');
            closeModal(); self.commit();
          }, { small: true, cls: active ? '' : 'btn-gold', disabled: !check.ok, cost: active ? '' : costText(SYS.leaderSchoolCost(state, creature, entry.id)) })
        ]));
      });
      openModal('Anführerschule: ' + creature.name, list, '🎓', 'special-modal');
    }
  });
})();
