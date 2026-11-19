import { test } from "node:test";
import assert from "node:assert/strict";
import { onTab, pickStore, storeOf } from "./store";

test("Leroy things go to Leroy Merlin", () => {
  for (const n of ["Escada FERRAL 4+4", "parafusos 4x40", "rede mosquiteira porta", "tinta branca", "fita métrica", "masking tape", "WD-40", "calha para cabos"]) {
    assert.equal(storeOf(n), "hardware", n);
  }
});

test("things both shops sell go to both", () => {
  for (const n of ["duct tape", "fita adesiva", "Extension cord", "extension cord (office)", "pilhas AA", "lâmpada E27"]) {
    assert.equal(storeOf(n), "both", n);
  }
});

test("food and cleaning stay at the supermarket, whatever tab you type them on", () => {
  for (const n of ["leite", "Paper towels", "mozzarella fresca", "arroz jasmim", "eggs"]) {
    assert.equal(pickStore(n, "hardware"), "grocery", n);
  }
  // Serra da Estrela is cheese, not a saw; "prego" is a steak sandwich
  assert.notEqual(storeOf("queijo serra da estrela"), "hardware");
});

test("unknown names go to the tab you are on", () => {
  assert.equal(pickStore("Yoga ball", "grocery"), "grocery");
  assert.equal(pickStore("Yoga ball", "hardware"), "hardware");
});

test("a taught shop wins", () => {
  assert.equal(storeOf("dog bed", new Map([["dog bed", "hardware"]])), "hardware");
  assert.equal(storeOf("fita adesiva", new Map([["fita adesiva", "grocery"]])), "grocery");
});

test("both items show on both tabs", () => {
  assert.equal(onTab("both", "grocery"), true);
  assert.equal(onTab("both", "hardware"), true);
  assert.equal(onTab("hardware", "grocery"), false);
  assert.equal(onTab(undefined, "grocery"), true);
});
