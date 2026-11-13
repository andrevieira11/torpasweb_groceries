import { test } from "node:test";
import assert from "node:assert/strict";
import { applyOp, byAisle, dishView, findDish, planAdd, type Board, type BoardItem } from "./board";

const item = (id: string, name: string, dish: string | null, extra: Partial<BoardItem> = {}): BoardItem => ({
  id,
  name,
  alt: null,
  normalizedName: name,
  dish,
  qty: null,
  unit: null,
  categoryKey: "other",
  checked: false,
  ...extra,
});

const board = (): Board => ({
  dishes: [
    { id: "d1", name: "Lasanha", emoji: null },
    { id: "d2", name: "Salada", emoji: "🥗" },
  ],
  items: [
    item("a", "leite", null, { categoryKey: "dairy" }),
    item("b", "bacon", "Lasanha", { qty: 200, unit: "g", categoryKey: "meat_fish" }),
    item("c", "natas", "Lasanha", { checked: true, categoryKey: "dairy" }),
    item("d", "alface", "Salada", { categoryKey: "produce" }),
  ],
});

let n = 0;
const seq = () => `id${++n}`;

test("planAdd merges only into the same dish, with fresh ids per parsed line", () => {
  const b = board();
  b.items.push(item("e", "bacon", null, { qty: 100, unit: "g" })); // loose bacon must not merge
  const plan = planAdd(b, "Lasanha", "100 g bacon, 2 cebolas", seq);
  assert.equal(plan.ids.length, 2);
  assert.deepEqual(plan.updates, [{ id: "b", qty: 300, unit: "g" }]);
  assert.equal(plan.inserts.length, 1);
  assert.equal(plan.inserts[0].id, plan.ids[1]);
  assert.equal(plan.inserts[0].dish, "Lasanha");
  assert.equal(plan.inserts[0].qty, 2);
});

test("planAdd never merges into a bought (checked) item", () => {
  const plan = planAdd(board(), "Lasanha", "natas", seq);
  assert.equal(plan.updates.length, 0);
  assert.equal(plan.inserts.length, 1);
});

test("add: inserts appear pending, updates bump the quantity, a new dish is created", () => {
  const b = applyOp(board(), {
    kind: "add",
    dish: { id: "d3", name: "Bolo", emoji: "🍰" },
    inserts: [item("x", "farinha", "Bolo")],
    updates: [{ id: "b", qty: 300, unit: "g" }],
  });
  assert.equal(b.items.find((i) => i.id === "x")?.pending, true);
  assert.equal(b.items.find((i) => i.id === "b")?.qty, 300);
  assert.deepEqual(b.dishes.map((d) => d.name), ["Lasanha", "Salada", "Bolo"]);
  // adding into an existing dish does not duplicate it
  const again = applyOp(b, { kind: "add", dish: { id: "d3", name: "Bolo", emoji: null }, inserts: [], updates: [] });
  assert.equal(again.dishes.length, 3);
});

test("remove + restore puts the item back where it was", () => {
  const before = board();
  const removed = applyOp(before, { kind: "remove", ids: ["b"] });
  assert.equal(removed.items.some((i) => i.id === "b"), false);
  const back = applyOp(removed, { kind: "restore", items: [{ item: before.items[1], at: 1 }], dishes: [] });
  assert.deepEqual(back.items.map((i) => i.id), ["a", "b", "c", "d"]);
  // restoring twice is harmless
  const twice = applyOp(back, { kind: "restore", items: [{ item: before.items[1], at: 1 }], dishes: [] });
  assert.equal(twice.items.length, 4);
});

test("removeDish drops the dish and its items; restore brings both back in place", () => {
  const before = board();
  const gone = applyOp(before, { kind: "removeDish", id: "d1" });
  assert.deepEqual(gone.dishes.map((d) => d.name), ["Salada"]);
  assert.deepEqual(gone.items.map((i) => i.id), ["a", "d"]);
  const back = applyOp(gone, {
    kind: "restore",
    dishes: [{ dish: before.dishes[0], at: 0 }],
    items: [
      { item: before.items[1], at: 1 },
      { item: before.items[2], at: 2 },
    ],
  });
  assert.deepEqual(back, before);
});

test("renameDish renames the dish (same id) and re-tags its items", () => {
  const b = applyOp(board(), { kind: "renameDish", id: "d1", to: "Lasanha da avó", emoji: "🍝" });
  assert.deepEqual(b.dishes[0], { id: "d1", name: "Lasanha da avó", emoji: "🍝" });
  assert.deepEqual(b.items.filter((i) => i.dish === "Lasanha da avó").map((i) => i.id), ["b", "c"]);
  // an unknown id changes nothing
  assert.deepEqual(applyOp(board(), { kind: "renameDish", id: "nope", to: "X", emoji: null }), board());
});

test("restore puts an item back into its dish's current name after a rename", () => {
  const before = board();
  const removed = applyOp(before, { kind: "remove", ids: ["b"] });
  const renamed = applyOp(removed, { kind: "renameDish", id: "d1", to: "Lasanha da avó", emoji: null });
  const back = applyOp(renamed, { kind: "restore", items: [{ item: before.items[1], at: 1, dishId: "d1" }], dishes: [] });
  assert.equal(back.items.find((i) => i.id === "b")?.dish, "Lasanha da avó");
});

test("several removals undo together, back in their original order", () => {
  const before = board();
  const r1 = applyOp(before, { kind: "remove", ids: ["b"] }); // b was at 1
  const r2 = applyOp(r1, { kind: "remove", ids: ["c"] }); // c is now at 1
  // Undo all: newest first
  const u1 = applyOp(r2, { kind: "restore", items: [{ item: before.items[2], at: 1 }], dishes: [] });
  const u2 = applyOp(u1, { kind: "restore", items: [{ item: before.items[1], at: 1 }], dishes: [] });
  assert.deepEqual(u2.items.map((i) => i.id), ["a", "b", "c", "d"]);
});

test("patch changes one item", () => {
  const b = applyOp(board(), { kind: "patch", id: "a", patch: { checked: true, categoryKey: "pantry" } });
  assert.equal(b.items[0].checked, true);
  assert.equal(b.items[0].categoryKey, "pantry");
  assert.equal(b.items[1].checked, false);
});

test("planAdd merges an item typed in the other language into its translation's row", () => {
  const b = board();
  b.items.push(item("e", "eggs", "Lasanha", { normalizedName: "egg", alt: "ovos", qty: 3, unit: "x" }));
  const plan = planAdd(b, "Lasanha", "2 ovos", seq);
  assert.deepEqual(plan.updates, [{ id: "e", qty: 5, unit: "x" }]);
  assert.equal(plan.inserts.length, 0);
});

test("dishView keeps empty dishes, sorts bought last, and shows orphan sections", () => {
  const b = board();
  b.dishes.push({ id: "d9", name: "Vazio", emoji: null });
  b.items.unshift(item("z", "pão", "Pequeno-almoço"));
  b.items.push(item("f", "massa", "Lasanha"));
  const v = dishView(b);
  assert.deepEqual(v.loose.map((i) => i.id), ["a"]);
  assert.deepEqual(v.dishes.map((d) => d.name), ["Lasanha", "Salada", "Vazio", "Pequeno-almoço"]);
  assert.deepEqual(v.dishes[0].items.map((i) => i.id), ["b", "f", "c"]); // checked natas last
  assert.equal(v.dishes[2].items.length, 0);
  assert.equal(v.dishes[3].pending, true); // no dish row to act on yet
});

test("byAisle groups in store order with bought items last", () => {
  const groups = byAisle([
    item("1", "x", null, { categoryKey: "pantry", checked: true }),
    item("2", "y", null, { categoryKey: "produce" }),
    item("3", "z", null, { categoryKey: "pantry" }),
    item("4", "w", null, { categoryKey: "not-a-key" }),
  ]);
  assert.deepEqual(groups.map((g) => g.key), ["produce", "pantry", "other"]);
  assert.deepEqual(groups[1].items.map((i) => i.id), ["3", "1"]);
});

test("findDish matches exactly first, then ignoring case/accents/plurals", () => {
  const ds = [{ name: "Almoço" }, { name: "almoço" }];
  assert.equal(findDish(ds, "almoço")?.name, "almoço");
  assert.equal(findDish(ds, "ALMOCOS")?.name, "Almoço");
  assert.equal(findDish(ds, "Jantar"), undefined);
});

test("planAdd merges a dictionary word typed in the other language (\"eggs\" in the PT app + \"ovos\")", () => {
  const b = board();
  b.items.push(item("e", "eggs", "Lasanha", { normalizedName: "egg", alt: null, qty: 3, unit: "x" }));
  const plan = planAdd(b, "Lasanha", "2 ovos", seq);
  assert.deepEqual(plan.updates, [{ id: "e", qty: 5, unit: "x" }]);
});
