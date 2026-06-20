import { test } from "node:test";
import assert from "node:assert/strict";
import { categorize } from "./categorize";

test("categorizes EN + PT to the same category", () => {
  assert.equal(categorize("milk"), "dairy");
  assert.equal(categorize("Leite"), "dairy");
  assert.equal(categorize("bananas"), "produce");
  assert.equal(categorize("Frango"), "meat_fish");
  assert.equal(categorize("Arroz"), "pantry");
  assert.equal(categorize("Ovos"), "dairy");
});

test("multiword keywords win over single tokens", () => {
  assert.equal(categorize("Azeite"), "pantry");
  assert.equal(categorize("Papel Higiénico"), "household");
  assert.equal(categorize("Coca-Cola"), "drinks");
  assert.equal(categorize("olive oil"), "pantry");
});

test("unknown items fall back to other", () => {
  assert.equal(categorize("zxqw blorp"), "other");
});

test("learned rule overrides the dictionary", () => {
  const learned = new Map([["vinho", "pantry"]]);
  assert.equal(categorize("vinho"), "drinks");
  assert.equal(categorize("Vinho", learned), "pantry");
});
