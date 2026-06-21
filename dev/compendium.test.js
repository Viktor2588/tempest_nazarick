/* dev/compendium.test.js — Bestiarium-Fortschritt (Phase 38).
   Prüft seenSpecies: Startwert, Live-Erfassung, Normalisierung, Save-Roundtrip
   sowie die vom Bestiarium genutzte Datenintegrität (Linie + Basiswerte).
   Aufruf:  bun test dev/compendium.test.js                                  */
import { test, expect } from "bun:test";
import "../js/data-tables.js";
import "../js/data.js";
import "../js/state.js";
import "../js/systems.js";
import "../js/systems-combat.js";
import "../js/achievements.js";

const GD = globalThis.GameData, GST = globalThis.GameState, SYS = globalThis.GameSystems;

test("frischer Spielstand hat die Startspezies als entdeckt", () => {
  const s = GST.createDefault();
  expect(s.seenSpecies.slice().sort()).toEqual(["goblin", "schleim"]);
});

test("recordSeenSpecies erfasst neu gehaltene Spezies (idempotent)", () => {
  const s = GST.createDefault();
  s.creatures.push(GST.newCreature(s, "wolf"));
  SYS.recordSeenSpecies(s);
  expect(s.seenSpecies).toContain("wolf");
  const before = s.seenSpecies.length;
  SYS.recordSeenSpecies(s);
  expect(s.seenSpecies.length).toBe(before); // keine Duplikate
});

test("tick() erfasst entdeckte Spezies live", () => {
  const s = GST.createDefault();
  s.creatures.push(GST.newCreature(s, "echse"));
  SYS.tick(s);
  expect(s.seenSpecies).toContain("echse");
});

test("normalize vereinigt gehaltene Spezies und bereinigt korrupte Werte", () => {
  // Alt-Spielstand ohne seenSpecies: aktuelle Kreaturen gelten als entdeckt.
  const legacy = GST.createDefault();
  legacy.creatures.push(GST.newCreature(legacy, "oger"));
  delete legacy.seenSpecies;
  const migrated = GST.normalize(legacy);
  expect(migrated.seenSpecies).toContain("oger");

  // Unbekannte IDs + Duplikate werden entfernt.
  const dirty = GST.createDefault();
  dirty.seenSpecies = ["schleim", "voll_erfunden", "schleim"];
  expect(GST.normalize(dirty).seenSpecies.filter((id) => id === "schleim").length).toBe(1);
  expect(GST.normalize(dirty).seenSpecies).not.toContain("voll_erfunden");

  // Nicht-Array (korrupt) wird repariert (mind. aktuelle Kreaturen).
  const broken = GST.createDefault();
  broken.seenSpecies = "kaputt";
  expect(Array.isArray(GST.normalize(broken).seenSpecies)).toBe(true);
});

test("Save-Roundtrip erhält den Bestiarium-Fortschritt", () => {
  const s = GST.createDefault();
  s.creatures.push(GST.newCreature(s, "drache"));
  SYS.recordSeenSpecies(s);
  const round = GST.normalize(JSON.parse(JSON.stringify(s)));
  expect(round.seenSpecies).toContain("drache");
  expect(round.version).toBe(GST.VERSION);
});

test("alle Kreaturen besitzen Linie + endliche Basiswerte (Bestiarium-Daten)", () => {
  expect(GD.creatures.length).toBeGreaterThanOrEqual(40);
  GD.creatures.forEach((sp) => {
    expect(typeof sp.line).toBe("string");
    expect(sp.line.length).toBeGreaterThan(0);
    expect(GD.RANKS.indexOf(sp.rank)).toBeGreaterThanOrEqual(0);
    ["lp", "ang", "ver", "mag", "tmp"].forEach((k) => {
      expect(Number.isFinite(sp.base[k])).toBe(true);
    });
    (sp.evolvesTo || []).forEach((e) => { expect(GD.creature(e.to)).toBeTruthy(); });
  });
});
