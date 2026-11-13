import { test } from "node:test";
import assert from "node:assert/strict";
import { ingredientLine } from "./lines";
import { parseInput } from "@/lib/parse/parseInput";

test("recipe lines parse back to the same quantity and unit", () => {
  const cases = [
    { name: "bacon", qty: 200, unit: "g" },
    { name: "farinha", qty: 1.5, unit: "kg" },
    { name: "leite", qty: 0.5, unit: "l" },
    { name: "ovos", qty: 3, unit: "x" },
    { name: "tomate pelado", qty: 2, unit: "can" },
    { name: "natas", qty: null, unit: null },
  ];
  const parsed = parseInput(cases.map(ingredientLine).join("\n"));
  assert.equal(parsed.length, cases.length);
  parsed.forEach((p, i) => {
    assert.equal(p.name, cases[i].name);
    assert.equal(p.qty, cases[i].qty);
    assert.equal(p.unit, cases[i].unit);
  });
});

test("a plain count prints as ×n", () => {
  assert.equal(ingredientLine({ name: "limões", qty: 2, unit: null }), "×2 limões");
});

test("a plain ×1 is left out", () => {
  assert.equal(ingredientLine({ name: "pato", qty: 1, unit: "x" }), "pato");
  assert.equal(ingredientLine({ name: "laranja", qty: 1, unit: null }), "laranja");
  assert.equal(ingredientLine({ name: "farinha", qty: 1, unit: "kg" }), "1 kg farinha");
});
