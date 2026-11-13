import { test } from "node:test";
import assert from "node:assert/strict";
import { signUndo, verifyUndo, UNDO_TTL_MS } from "./undo";

const SECRET = "s".repeat(32);
const data = { items: [{ id: "a", name: "bacon", createdAt: "2026-11-13T10:00:00.000Z" }] };

test("round-trips for the same user", () => {
  const t = signUndo({ uid: "u1", listId: "L", data }, SECRET, 1000);
  const p = verifyUndo<typeof data>(t, SECRET, { uid: "u1" }, 2000);
  assert.ok(p);
  assert.equal(p.listId, "L");
  assert.deepEqual(p.data, data);
});

test("rejects another user, a wrong secret, an edited body and expiry", () => {
  const t = signUndo({ uid: "u1", listId: "L", data }, SECRET, 1000);
  assert.equal(verifyUndo(t, SECRET, { uid: "u2" }, 2000), null);
  assert.equal(verifyUndo(t, "x".repeat(32), { uid: "u1" }, 2000), null);
  const [body, sig] = t.split(".");
  const forged = Buffer.from(
    JSON.stringify({ ...JSON.parse(Buffer.from(body, "base64url").toString()), listId: "OTHER" }),
  ).toString("base64url");
  assert.equal(verifyUndo(`${forged}.${sig}`, SECRET, { uid: "u1" }, 2000), null);
  assert.equal(verifyUndo(t, SECRET, { uid: "u1" }, 1000 + UNDO_TTL_MS + 1), null);
  assert.equal(verifyUndo("garbage", SECRET, { uid: "u1" }), null);
  assert.equal(verifyUndo(".", SECRET, { uid: "u1" }), null);
});
