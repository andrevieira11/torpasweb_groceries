import { test } from "node:test";
import assert from "node:assert/strict";
import { mergeQuantities, formatQuantity, canMerge } from "./quantity";

test("merges same unit", () => {
  assert.deepEqual(mergeQuantities({ qty: 1, unit: "kg" }, { qty: 2, unit: "kg" }), {
    qty: 3,
    unit: "kg",
  });
});

test("merges compatible mass, rolls up to kg", () => {
  assert.deepEqual(mergeQuantities({ qty: 500, unit: "g" }, { qty: 0.7, unit: "kg" }), {
    qty: 1.2,
    unit: "kg",
  });
});

test("merges compatible volume", () => {
  assert.deepEqual(mergeQuantities({ qty: 500, unit: "ml" }, { qty: 1, unit: "l" }), {
    qty: 1.5,
    unit: "l",
  });
});

test("merges plain counts", () => {
  assert.deepEqual(mergeQuantities({ qty: 2, unit: null }, { qty: 3, unit: null }), {
    qty: 5,
    unit: null,
  });
});

test("merges plain count with explicit count unit and a dozen", () => {
  assert.deepEqual(mergeQuantities({ qty: 2, unit: null }, { qty: 3, unit: "x" }), {
    qty: 5,
    unit: "x",
  });
  assert.deepEqual(mergeQuantities({ qty: 6, unit: "x" }, { qty: 1, unit: "dozen" }), {
    qty: 18,
    unit: "x",
  });
});

test("absent qty takes the other side (never loses a quantity)", () => {
  assert.deepEqual(mergeQuantities({ qty: null, unit: null }, { qty: 2, unit: "kg" }), {
    qty: 2,
    unit: "kg",
  });
  assert.deepEqual(mergeQuantities({ qty: 3, unit: "x" }, { qty: null, unit: null }), {
    qty: 3,
    unit: "x",
  });
});

test("incompatible units do not merge", () => {
  assert.equal(mergeQuantities({ qty: 1, unit: "kg" }, { qty: 1, unit: "l" }), null);
  assert.equal(mergeQuantities({ qty: 1, unit: "can" }, { qty: 1, unit: "bottle" }), null);
  assert.equal(canMerge({ qty: 1, unit: "kg" }, { qty: 1, unit: "l" }), false);
});

test("same pack type merges", () => {
  assert.deepEqual(mergeQuantities({ qty: 2, unit: "can" }, { qty: 3, unit: "lata" }), {
    qty: 5,
    unit: "can",
  });
});

test("formatQuantity renders nicely", () => {
  assert.equal(formatQuantity(2, "kg"), "2 kg");
  assert.equal(formatQuantity(3, null), "×3");
  assert.equal(formatQuantity(3, "x"), "×3");
  assert.equal(formatQuantity(1.5, "l"), "1.5 l");
  assert.equal(formatQuantity(null, null), "");
});
