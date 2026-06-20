import { test } from "node:test";
import assert from "node:assert/strict";
import { parseInput } from "./parseInput";

const simplify = (s: string) =>
  parseInput(s).map(({ name, qty, unit }) => ({ name, qty, unit }));

test("splits a multi-item line and extracts quantities", () => {
  assert.deepEqual(simplify("milk, 2kg potatoes, bananas"), [
    { name: "milk", qty: null, unit: null },
    { name: "potatoes", qty: 2, unit: "kg" },
    { name: "bananas", qty: null, unit: null },
  ]);
});

test("count markers x3 / 3x, leading and trailing", () => {
  assert.deepEqual(simplify("x3 bananas"), [{ name: "bananas", qty: 3, unit: "x" }]);
  assert.deepEqual(simplify("bananas x3"), [{ name: "bananas", qty: 3, unit: "x" }]);
});

test("number with a spaced unit", () => {
  assert.deepEqual(simplify("2 L leite"), [{ name: "leite", qty: 2, unit: "l" }]);
  assert.deepEqual(simplify("500 g queijo"), [{ name: "queijo", qty: 500, unit: "g" }]);
});

test("strips a command verb and splits on 'e' / 'and'", () => {
  assert.deepEqual(simplify("Adiciona 500g queijo e 1 pão"), [
    { name: "queijo", qty: 500, unit: "g" },
    { name: "pão", qty: 1, unit: null },
  ]);
  assert.deepEqual(simplify("add milk and bread"), [
    { name: "milk", qty: null, unit: null },
    { name: "bread", qty: null, unit: null },
  ]);
});

test("PT decimal comma is not a separator", () => {
  assert.deepEqual(simplify("0,5 L leite"), [{ name: "leite", qty: 0.5, unit: "l" }]);
  assert.deepEqual(simplify("1,5kg farinha, açúcar"), [
    { name: "farinha", qty: 1.5, unit: "kg" },
    { name: "açúcar", qty: null, unit: null },
  ]);
});

test("a bare quantity or blank yields nothing", () => {
  assert.deepEqual(simplify("   "), []);
  assert.deepEqual(simplify("2kg"), []);
});
