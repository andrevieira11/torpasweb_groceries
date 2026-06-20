import { test } from "node:test";
import assert from "node:assert/strict";
import { planMerge } from "./merge-plan";

const inc = (
  name: string,
  qty: number | null,
  unit: string | null,
  categoryKey = "other",
) => ({ name, normalizedName: name, qty, unit, categoryKey });

test("inserts when nothing exists", () => {
  const plan = planMerge([inc("milk", null, null, "dairy")], []);
  assert.equal(plan.updates.length, 0);
  assert.equal(plan.inserts.length, 1);
});

test("merges a compatible quantity into an existing item", () => {
  const existing = [{ id: "e1", normalizedName: "banana", qty: 2, unit: null }];
  const plan = planMerge([inc("banana", 3, null, "produce")], existing);
  assert.deepEqual(plan.updates, [{ id: "e1", qty: 5, unit: null }]);
  assert.equal(plan.inserts.length, 0);
});

test("incompatible units stay a separate insert", () => {
  const existing = [{ id: "e1", normalizedName: "rice", qty: 1, unit: "kg" }];
  const plan = planMerge([inc("rice", 2, "l", "pantry")], existing);
  assert.equal(plan.updates.length, 0);
  assert.equal(plan.inserts.length, 1);
});

test("duplicates within a batch merge into one insert", () => {
  const plan = planMerge(
    [inc("egg", 6, "x", "dairy"), inc("egg", 6, "x", "dairy")],
    [],
  );
  assert.equal(plan.inserts.length, 1);
  assert.equal(plan.inserts[0].qty, 12);
  assert.equal(plan.updates.length, 0);
});

test("batch dup folds into an existing update (500g + 0.5kg + 0.5kg = 1.5kg)", () => {
  const existing = [{ id: "e1", normalizedName: "flour", qty: 500, unit: "g" }];
  const plan = planMerge(
    [inc("flour", 0.5, "kg", "pantry"), inc("flour", 0.5, "kg", "pantry")],
    existing,
  );
  assert.deepEqual(plan.updates, [{ id: "e1", qty: 1.5, unit: "kg" }]);
  assert.equal(plan.inserts.length, 0);
});
