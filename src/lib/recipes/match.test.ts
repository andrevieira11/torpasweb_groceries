import { test } from "node:test";
import assert from "node:assert/strict";
import { matchRecipe } from "./match";

const recipes = [
  { id: "1", name: "Meatloaf", normalizedName: "meatloaf" },
  { id: "2", name: "Chicken Curry", normalizedName: "chicken curry" },
];

test("exact normalized match", () => {
  assert.equal(matchRecipe("meatloaf", recipes)?.id, "1");
  assert.equal(matchRecipe("Chicken Curry", recipes)?.id, "2");
});

test("close fuzzy match", () => {
  assert.equal(matchRecipe("meat loaf", recipes)?.id, "1");
});

test("unrelated words do not match", () => {
  assert.equal(matchRecipe("milk", recipes), null);
  assert.equal(matchRecipe("bananas", recipes), null);
});

test("too short or empty returns null", () => {
  assert.equal(matchRecipe("ab", recipes), null);
  assert.equal(matchRecipe("", recipes), null);
});
