import { test } from "node:test";
import assert from "node:assert/strict";
import { splitSections, cleanSection, canonicalDish, sameDish, splitLeadingEmoji } from "./sections";

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

test("canonicalDish files under an existing dish ignoring case/accents/plurals", () => {
  const existing = ["Almoço de domingo", "Lasanha"];
  assert.equal(canonicalDish("almoco de domingo", existing), "Almoço de domingo");
  assert.equal(canonicalDish("LASANHAS", existing), "Lasanha");
  assert.equal(canonicalDish("  Jantar  ", existing), "Jantar");
  assert.equal(canonicalDish("", existing), null);
});

test("emoji-only and non-Latin dish names are not all the same dish", () => {
  assert.equal(sameDish("🎂", "🍕"), false);
  assert.equal(sameDish("🍕", "🍕"), true);
  assert.equal(sameDish("寿司", "ラーメン"), false);
  assert.equal(sameDish("寿司 party", "ラーメン party"), false);
  assert.equal(canonicalDish("🍕", ["🎂"]), "🍕");
  assert.equal(canonicalDish("寿司", ["ラーメン"]), "寿司");
  assert.equal(canonicalDish("ラーメン", ["ラーメン"]), "ラーメン");
});

test("punctuation, case, accents and plurals still don't make a new dish", () => {
  assert.equal(sameDish("Dia 1", "Dia 1!"), true);
  assert.equal(sameDish("Mac & cheese", "mac cheese"), true);
  assert.equal(sameDish("Almoço", "ALMOCOS"), true);
  assert.equal(sameDish("Dia 1", "Dia 2"), false);
});

test("a leading emoji doesn't make a new dish — nobody types or dictates it", () => {
  assert.equal(sameDish("Bacalhau com natas (17)", "🐟 Bacalhau com natas (17)"), true);
  assert.equal(sameDish("pizza (6)", "🍕 Pizza (6)"), true);
  assert.equal(sameDish("🎂 Bolo", "Bolo"), true);
  assert.equal(sameDish("❤️ Jantar", "jantar"), true);
  assert.equal(sameDish("🍕", "🎂"), false);
  assert.equal(sameDish("🍕 Pizza", "🍕 Lasanha"), false);
  assert.equal(sameDish("寿司", "ラーメン"), false);
  const real = ["🍕 Pizza (6)", "🍛 Thai curry (6)", "🐟 Bacalhau com natas (17)", "🥗 Salada mexicana (6)", "🍟 Fish & chips (miúdos)"];
  assert.equal(canonicalDish("Bacalhau com natas (17)", real), "🐟 Bacalhau com natas (17)");
  assert.equal(canonicalDish("fish & chips (miudos)", real), "🍟 Fish & chips (miúdos)");
  assert.equal(canonicalDish("Thai curry", real), "Thai curry");
  // an exact name still wins over a look-alike (a duplicate made before this fix)
  assert.equal(canonicalDish("Pizza (6)", ["🍕 Pizza (6)", "Pizza (6)"]), "Pizza (6)");
});

test("splitLeadingEmoji", () => {
  assert.deepEqual(splitLeadingEmoji("🐟 Bacalhau"), { emoji: "🐟", rest: "Bacalhau" });
  assert.deepEqual(splitLeadingEmoji("🍕"), { emoji: "🍕", rest: "" });
  assert.equal(splitLeadingEmoji("Bacalhau 🐟"), null);
  assert.equal(splitLeadingEmoji("2 ovos"), null);
});
