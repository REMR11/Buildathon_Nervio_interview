import assert from "node:assert/strict";
import {
  buildElevenLabsEvaluation,
  normalizeResultList,
} from "../src/lib/interview/reporting";

assert.deepEqual(normalizeResultList(["a", " b ", 3]), ["a", "b"]);
assert.deepEqual(normalizeResultList('["uno","dos"]'), ["uno", "dos"]);
assert.deepEqual(normalizeResultList("- Claridad\n- Ejemplos concretos"), [
  "Claridad",
  "Ejemplos concretos",
]);
assert.deepEqual(normalizeResultList("• Claridad • Buen tono"), [
  "Claridad",
  "Buen tono",
]);
assert.deepEqual(normalizeResultList("Claridad, seguridad, estructura"), [
  "Claridad",
  "seguridad",
  "estructura",
]);
assert.deepEqual(normalizeResultList("Una sola fortaleza"), [
  "Una sola fortaleza",
]);
assert.deepEqual(normalizeResultList(""), []);
assert.deepEqual(normalizeResultList(null), []);

const base = { scoreGlobal: { value: 80 } };
const en = buildElevenLabsEvaluation({
  analysis: {
    data_collection_results: {
      ...base,
      strengths: { value: "Claridad\nSeguridad" },
      weaknesses: { value: '["Más ejemplos"]' },
    },
  },
} as never);
assert.deepEqual(en?.strengths, ["Claridad", "Seguridad"]);
assert.deepEqual(en?.weaknesses, ["Más ejemplos"]);

const es = buildElevenLabsEvaluation({
  analysis: {
    data_collection_results: {
      ...base,
      fortalezas: { value: "Tono, ritmo" },
      areas_de_mejora: { value: "1. Estructura\n2. Datos" },
    },
  },
} as never);
assert.deepEqual(es?.strengths, ["Tono", "ritmo"]);
assert.deepEqual(es?.weaknesses, ["Estructura", "Datos"]);

console.log("check-result-list: OK");
