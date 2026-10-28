// The reading pass's prompt and the reading of a model's answer.
//   node --test src/Core/Reading/test/
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Buffer } from "node:buffer";
import { transformSync } from "esbuild";

async function load(file) {
  const source = readFileSync(new URL(file, import.meta.url), "utf8");
  const { code } = transformSync(source, { loader: "ts", format: "esm", target: "es2022" });
  return import(`data:text/javascript;base64,${Buffer.from(code).toString("base64")}`);
}
const {
  chunks,
  composeComment,
  isWholeArray,
  parseColumns,
  parseProposals,
  saysNothing,
  splitPart,
  systemPrompt,
  userMessage,
} = await load("../prompt.ts");
const { pageText } = await load("../locate.ts");

test("columns are what the person typed, tidied", () => {
  assert.deepEqual(parseColumns(" Method, Findings ,, Gap, Method "), ["Method", "Findings", "Gap"]);
});

test("pages go into requests whole and marked, under the cap", () => {
  const pages = [0, 1, 2].map((i) => ({ pageIndex: i, label: String(i + 1), text: "x".repeat(30) }));
  const parts = chunks(pages, 80);
  assert.deepEqual(
    parts.map((p) => [p.first, p.last]),
    [
      [0, 1],
      [2, 2],
    ],
  );
  assert.ok(parts[0].text.startsWith("[page 1]\n"));
  assert.ok(parts[0].text.includes("[page 2]\n"));
});

test("the prompt names the columns and asks for exact quotes as JSON", () => {
  const system = systemPrompt(["Method", "Gap"], undefined, 5);
  assert.match(system, /character for character/);
  assert.match(system, /"Method", "Gap"/);
  assert.match(system, /At most 5/);
  assert.match(userMessage("Find methods", ["Method"], { first: 0, last: 0, text: "[page 1]\nabc" }), /Instruction: Find methods/);
});

test("the summary is a note in the writing language, never 'Explains…'", () => {
  const system = systemPrompt(["Gap"], { language: "Français", paraphrase: false, translation: false });
  assert.match(system, /"summary": one sentence in Français/);
  assert.match(system, /"Explains", "Describes"/);
  assert.doesNotMatch(system, /"paraphrase"/);
  assert.doesNotMatch(system, /"translation"/);
  // The example of the register uses the person's own first column.
  assert.match(system, /"column": "Gap", "summary": "Two-year interview study/);
});

test("a paraphrase and a translation are asked for only when chosen", () => {
  const system = systemPrompt(["Method"], { language: "English", paraphrase: true, translation: true });
  assert.match(system, /keys "quote", "column", "summary", "paraphrase", "translation"/);
  assert.match(system, /an empty string when the quote is already in English/);
});

test("the comment is in Ze-Notes' parts, empty parts left out", () => {
  assert.equal(
    composeComment({ summary: "S.", paraphrase: "P.", translation: "" }),
    "[[Summary]]\nS.\n\n[[Paraphrase]]\nP.",
  );
  const [p] = parseProposals('[{"quote":"Some quote here","column":"Gap","summary":"S","translation":"T"}]');
  assert.equal(p.comment, "[[Summary]]\nS\n\n[[Translation]]\nT");
});

test("the array is cut out of a chatty or fenced answer, and bad entries dropped", () => {
  const answer = 'Here you go:\n```json\n[{"quote":" A sample of 1175 ","column":"Method","comment":"n"},{"column":"Gap"},"x",{"quote":"Q2"}]\n```';
  assert.deepEqual(parseProposals(answer), [
    // A plain "comment", as the first prompt asked for, becomes the summary.
    { quote: "A sample of 1175", column: "Method", comment: "[[Summary]]\nn" },
    { quote: "Q2", column: "", comment: "" },
  ]);
  assert.deepEqual(parseProposals("I could not find anything."), []);
  assert.deepEqual(parseProposals("[not json]"), []);
});

test("an answer cut off by the token limit keeps every object that arrived whole", () => {
  const cut =
    '[{"quote":"First whole one, with a } inside","column":"Method","comment":"a"},' +
    '{"quote":"Second whole one","column":"Gap","comment":"b"},{"quote":"Third, cut of';
  assert.deepEqual(
    parseProposals(cut).map((p) => p.quote),
    ["First whole one, with a } inside", "Second whole one"],
  );
});

test("tells a real nothing from an unreadable answer", () => {
  assert.equal(saysNothing("[]"), true);
  assert.equal(saysNothing("```json\n[ ]\n```"), true);
  assert.equal(saysNothing("Sorry, I cannot help with that."), false);
  assert.equal(saysNothing('[{"quote":"x"'), false);
});

test("characters become text with spaces and line breaks where the boxes say", () => {
  const ch = (c, x, y) => ({ c, rect: [x, y, x + 5, y + 10] });
  const chars = [ch("a", 0, 100), ch("b", 5, 100), ch("c", 15, 100), ch("d", 0, 80)];
  assert.equal(pageText(chars), "ab c\nd");
  assert.equal(pageText([{ ...ch("a", 0, 100), spaceAfter: true }, ch("b", 5, 100)]), "a b");
});

test("a cut-off part splits at page boundaries; a single page does not", () => {
  const pages = [0, 1, 2, 3].map((i) => ({ pageIndex: i, label: String(i + 1), text: "x".repeat(30) }));
  const [whole] = chunks(pages);
  const halves = splitPart(whole, pages);
  assert.ok(halves.length >= 2);
  assert.equal(halves[0].first, 0);
  assert.equal(halves[halves.length - 1].last, 3);
  for (let i = 1; i < halves.length; i++) assert.equal(halves[i].first, halves[i - 1].last + 1);
  const [one] = chunks(pages.slice(2, 3));
  assert.deepEqual(splitPart(one, pages), [one]);
});

test("an answer is whole only when its array closes", () => {
  assert.equal(isWholeArray('```json\n[{"quote": "a"}]\n```'), true);
  assert.equal(isWholeArray('[{"quote": "a"}, {"quote": "b'), false);
  assert.equal(isWholeArray('[{"quote": "a"}, {"quote": "b"'), false);
  assert.equal(isWholeArray("undefined"), false);
  assert.equal(isWholeArray(""), false);
});
