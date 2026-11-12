import { test } from "node:test";
import assert from "node:assert/strict";
import { splitSections, cleanSection } from "./sections";

test("no prefix = no section", () => {
  assert.deepEqual(splitSections("milk, 2kg potatoes"), [{ section: null, text: "milk, 2kg potatoes" }]);
});

test("Name: items puts them in a section, next lines inherit it", () => {
  assert.deepEqual(splitSections("Family lunch: cod, potatoes\nonions\nThai curry: chicken"), [
    { section: "Family lunch", text: "cod, potatoes" },
    { section: "Family lunch", text: "onions" },
    { section: "Thai curry", text: "chicken" },
  ]);
});

test("a quantity line is never a section", () => {
  assert.deepEqual(splitSections("2kg arroz"), [{ section: null, text: "2kg arroz" }]);
});

test("cleanSection trims and caps", () => {
  assert.equal(cleanSection("  a   b "), "a b");
  assert.equal(cleanSection(""), null);
  assert.equal(cleanSection("x".repeat(60))?.length, 40);
});
