import { test } from "node:test";
import assert from "node:assert/strict";
import { plausibleTranslation } from "./plausible";
import { itemNames } from "./strings";

test("real translations pass", () => {
  assert.equal(plausibleTranslation("pato", "duck"), true);
  assert.equal(plausibleTranslation("azeitonas", "olives"), true);
  assert.equal(plausibleTranslation("noz-moscada", "nutmeg"), true);
  assert.equal(plausibleTranslation("sal", "salt"), true);
  assert.equal(plausibleTranslation("bacalhau demolhado desfiado", "soaked shredded salted cod"), true);
  assert.equal(plausibleTranslation("pão", "bread"), true);
});

test("translations of names with notes, numbers and several words pass (live cases)", () => {
  assert.equal(plausibleTranslation("salsa (1 molho)", "parsley (1 bunch)"), true);
  assert.equal(plausibleTranslation("gelo (2 sacos)", "ice (2 bags)"), true);
  assert.equal(plausibleTranslation("água 1.5l", "Water 1.5 L"), true);
  assert.equal(plausibleTranslation("pet food", "alimentação para animais de estimação"), true);
  assert.equal(plausibleTranslation("Standing desktop", "Mesa para trabalhar em pé"), true);
  assert.equal(plausibleTranslation("extension cord (office)", "extensão elétrica (escritório)"), true);
});

test("a symbol the source doesn't have is still junk", () => {
  assert.equal(plausibleTranslation("rib", '<g id="x">costela</g>'), false);
  assert.equal(plausibleTranslation("gelo", "ice (2 bags)"), false);
  assert.equal(plausibleTranslation("leite 1l", "milk 1l ▲"), false);
});

test("machine junk is rejected", () => {
  assert.equal(plausibleTranslation("pato", "&Mudo"), false);
  assert.equal(plausibleTranslation("azeitonas", "▲Olives"), false);
  assert.equal(plausibleTranslation("caril", "Charles Starkweather"), false);
  assert.equal(plausibleTranslation("ovo", "egg (food) 2"), false);
  assert.equal(plausibleTranslation("sal", "the salt of the earth and sea"), false);
  assert.equal(plausibleTranslation("leite", ""), false);
});

test("the list shows what was typed instead of saved junk", () => {
  assert.deepEqual(itemNames("pt", { name: "pato", nameEn: "pato", namePt: "&Mudo" }), { name: "pato", alt: null });
  assert.deepEqual(itemNames("en", { name: "caril", nameEn: "Charles Starkweather", namePt: "caril" }), {
    name: "caril",
    alt: null,
  });
  assert.deepEqual(itemNames("pt", { name: "eggs", nameEn: "eggs", namePt: "ovos" }), { name: "ovos", alt: "eggs" });
});
