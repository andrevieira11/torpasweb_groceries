import { test } from "node:test";
import assert from "node:assert/strict";
import { accentFold, normalizeName } from "./normalize";

test("accentFold strips PT diacritics", () => {
  assert.equal(accentFold("Pão"), "Pao");
  assert.equal(accentFold("maçã"), "maca");
  assert.equal(accentFold("limões"), "limoes");
  assert.equal(accentFold("café"), "cafe");
});

test("normalizeName folds, lowercases, strips punctuation", () => {
  assert.equal(normalizeName("  Leite!! "), "leite");
  assert.equal(normalizeName("Papel-Higiénico"), "papel higienico");
  assert.equal(normalizeName("Coca-Cola"), "coca cola");
});

test("normalizeName singularizes EN + PT plurals to one key", () => {
  assert.equal(normalizeName("Bananas"), "banana");
  assert.equal(normalizeName("banana"), "banana");
  assert.equal(normalizeName("Ovos"), "ovo");
  assert.equal(normalizeName("Batatas"), "batata");
  assert.equal(normalizeName("Tomatoes"), "tomato");
  assert.equal(normalizeName("Potatoes"), "potato");
  assert.equal(normalizeName("Limões"), "limao");
  assert.equal(normalizeName("eggs"), "egg");
  assert.equal(normalizeName("boxes"), "box");
});

test("plural and singular forms collapse equal", () => {
  assert.equal(normalizeName("maçãs"), normalizeName("maçã"));
  assert.equal(normalizeName("Tomatoes"), normalizeName("tomato"));
});

test("normalizeName handles empty / junk", () => {
  assert.equal(normalizeName("   "), "");
  assert.equal(normalizeName("!!!"), "");
});
