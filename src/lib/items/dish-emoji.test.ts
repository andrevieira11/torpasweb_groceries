import { test } from "node:test";
import assert from "node:assert/strict";
import { autoEmoji, dishDisplay, dishTitle, isDishEmoji, suggestEmoji } from "./dish-emoji";

test("suggests from PT and EN names, ignoring case, accents and plurals", () => {
  assert.equal(suggestEmoji("Lasanha"), "🍝");
  assert.equal(suggestEmoji("SOPA de legumes"), "🍲");
  assert.equal(suggestEmoji("Tacos"), "🌮");
  assert.equal(suggestEmoji("Bacalhau à Brás"), "🐟");
  assert.equal(suggestEmoji("Panquecas"), "🥞");
  assert.equal(suggestEmoji("Thai curry"), "🍛");
});

test("the first keyword wins, multi-word keywords before words", () => {
  assert.equal(suggestEmoji("Salada de frango"), "🥗");
  assert.equal(suggestEmoji("Frango com salada"), "🍗");
  assert.equal(suggestEmoji("Pequeno-almoço de domingo"), "🍳");
});

test("no keyword, no suggestion", () => {
  assert.equal(suggestEmoji("Family lunch"), null);
  assert.equal(suggestEmoji(""), null);
});

test("dishDisplay: null = suggest, '' = none, else the pick", () => {
  assert.deepEqual(dishDisplay({ name: "Pizza night", emoji: null }), { icon: "🍕", label: "Pizza night" });
  assert.deepEqual(dishDisplay({ name: "Pizza night", emoji: "" }), { icon: null, label: "Pizza night" });
  assert.deepEqual(dishDisplay({ name: "Pizza night", emoji: "🎉" }), { icon: "🎉", label: "Pizza night" });
  assert.deepEqual(dishDisplay({ name: "Family lunch", emoji: null }), { icon: null, label: "Family lunch" });
});

test("a name that starts with an emoji shows it once, as the icon (the 5 real dishes)", () => {
  const real: [string, string, string][] = [
    ["🍕 Pizza (6)", "🍕", "Pizza (6)"],
    ["🍛 Thai curry (6)", "🍛", "Thai curry (6)"],
    ["🐟 Bacalhau com natas (17)", "🐟", "Bacalhau com natas (17)"],
    ["🥗 Salada mexicana (6)", "🥗", "Salada mexicana (6)"],
    ["🍟 Fish & chips (miúdos)", "🍟", "Fish & chips (miúdos)"], // not the 🐟 "fish" suggests
  ];
  for (const [name, icon, label] of real) {
    assert.deepEqual(dishDisplay({ name, emoji: null }), { icon, label }, name);
    assert.equal(dishTitle({ name, emoji: null }), `${icon} ${label}`);
    assert.equal(autoEmoji(name), icon);
  }
});

test("leading emoji: VS16, ZWJ sequences, skin tones and flags count as one icon", () => {
  assert.deepEqual(dishDisplay({ name: "❤️ Jantar", emoji: null }), { icon: "❤️", label: "Jantar" });
  assert.deepEqual(dishDisplay({ name: "👨‍🍳 Chef's menu", emoji: null }), { icon: "👨‍🍳", label: "Chef's menu" });
  assert.deepEqual(dishDisplay({ name: "👍🏽 Bom", emoji: null }), { icon: "👍🏽", label: "Bom" });
  assert.deepEqual(dishDisplay({ name: "🇵🇹 Cozido", emoji: null }), { icon: "🇵🇹", label: "Cozido" });
  assert.deepEqual(dishDisplay({ name: "🍕🍺 Party", emoji: null }), { icon: "🍕", label: "🍺 Party" });
});

test("a picked icon: the name's own copy of it is dropped, a different one is kept", () => {
  assert.deepEqual(dishDisplay({ name: "🍕 Pizza (6)", emoji: "🍕" }), { icon: "🍕", label: "Pizza (6)" });
  assert.deepEqual(dishDisplay({ name: "🍕 Pizza (6)", emoji: "🎉" }), { icon: "🎉", label: "🍕 Pizza (6)" });
  assert.deepEqual(dishDisplay({ name: "🍕 Pizza (6)", emoji: "" }), { icon: null, label: "🍕 Pizza (6)" });
});

test("an emoji-only name stays the label, with the plain icon", () => {
  assert.deepEqual(dishDisplay({ name: "🍕", emoji: null }), { icon: null, label: "🍕" });
  assert.equal(dishTitle({ name: "🍕", emoji: null }), "🍕");
  assert.equal(autoEmoji("🍕"), null);
  assert.equal(autoEmoji("Lasanha"), "🍝");
});

test("only palette emojis are valid", () => {
  assert.equal(isDishEmoji("🍝"), true);
  assert.equal(isDishEmoji("x"), false);
  assert.equal(isDishEmoji("💣"), false);
});

test("cheese dishes get the cheese", () => {
  assert.equal(suggestEmoji("Mac & cheese"), "🧀");
  assert.equal(suggestEmoji("Tábua de queijos"), "🧀");
  assert.equal(suggestEmoji("Cheesecake"), "🍰");
});
