import { test } from "node:test";
import assert from "node:assert/strict";
import { clampPeople, scaleQuantity } from "./scale";

test("same people or no amount: unchanged", () => {
  assert.deepEqual(scaleQuantity({ qty: 200, unit: "g" }, 2, 2), { qty: 200, unit: "g" });
  assert.deepEqual(scaleQuantity({ qty: null, unit: null }, 2, 6), { qty: null, unit: null });
});

test("plain counts round up to whole items", () => {
  assert.deepEqual(scaleQuantity({ qty: 1, unit: null }, 2, 3), { qty: 2, unit: null });
  assert.deepEqual(scaleQuantity({ qty: 3, unit: null }, 2, 1), { qty: 2, unit: null });
  assert.deepEqual(scaleQuantity({ qty: 1, unit: null }, 2, 1), { qty: 1, unit: null });
});

test("grams and ml round up to 10 and switch to kg / l from 1000", () => {
  assert.deepEqual(scaleQuantity({ qty: 150, unit: "g" }, 2, 3), { qty: 230, unit: "g" });
  assert.deepEqual(scaleQuantity({ qty: 400, unit: "g" }, 2, 6), { qty: 1.2, unit: "kg" });
  assert.deepEqual(scaleQuantity({ qty: 1, unit: "kg" }, 2, 1), { qty: 500, unit: "g" });
  assert.deepEqual(scaleQuantity({ qty: 400, unit: "ml" }, 2, 4), { qty: 800, unit: "ml" });
});

test("packs stay whole", () => {
  const can = scaleQuantity({ qty: 1, unit: "lata" }, 2, 3);
  assert.equal(can.qty, 2);
});

test("clampPeople keeps 1–50 whole", () => {
  assert.equal(clampPeople(0), 1);
  assert.equal(clampPeople(3.6), 4);
  assert.equal(clampPeople(99), 50);
});
