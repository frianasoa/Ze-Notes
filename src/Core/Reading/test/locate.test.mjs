// The reading pass's locator: a quote is found word for word or not at all.
//   node --test src/Core/Reading/test/locate.test.mjs
// The module is compiled here with esbuild, Ze-Notes' own build tool, so no test framework or
// configuration is added to the project.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Buffer } from "node:buffer";
import { transformSync } from "esbuild";

const source = readFileSync(new URL("../locate.ts", import.meta.url), "utf8");
const { code } = transformSync(source, { loader: "ts", format: "esm", target: "es2022" });
const { charsFromItems, fold, lineRects, locate } = await import(
  `data:text/javascript;base64,${Buffer.from(code).toString("base64")}`
);

/**
 * A page from lines of text: each character 5 points wide and 10 high, lines 12 points apart
 * going down from y = 700, as PDF user space counts upwards.
 */
function page(lines, pageIndex = 0) {
  const chars = [];
  lines.forEach((line, row) => {
    const y = 700 - row * 12;
    Array.from(line).forEach((c, i) => chars.push({ c, rect: [72 + i * 5, y, 77 + i * 5, y + 10] }));
    chars.push({ c: "\n", rect: [0, 0, 0, 0] });
  });
  return { pageIndex, chars };
}

test("finds a quote on one line and gives its rectangle", () => {
  const p = page(["Using binary logistic regression, the strongest determinants were race."]);
  const hit = locate("the strongest determinants were race", [p]);
  assert.equal(hit.pageIndex, 0);
  assert.equal(hit.text, "the strongest determinants were race");
  assert.deepEqual(hit.rects, [[72 + 34 * 5, 700, 72 + 70 * 5, 710]]);
  assert.equal(hit.offset, 34);
});

test("follows a quote across a line broken by a hyphen, one rectangle per line", () => {
  const p = page(["their socio-economic status and their", "year of their gradu-", "ation mattered most."]);
  const hit = locate("their year of their graduation mattered", [p]);
  assert.equal(hit.rects.length, 3);
  assert.ok(hit.rects[0][3] > hit.rects[1][3], "top line first");
});

test("treats a ligature and curly quotes as the letters they stand for", () => {
  const p = page(["Surprisingly, the graduates’ ﬁeld of study did not matter."]);
  assert.ok(locate("the graduates' field of study did not matter", [p]));
});

test("does not find an invented quotation, and refuses one too short to tell", () => {
  const p = page(["Strong ties however play a stabilizing role by limiting large transitions."]);
  assert.equal(locate("weak ties play a destabilizing role", [p]), null);
  assert.equal(locate("Strong ties", [p]), null);
});

test("looks through every page and says which one", () => {
  const pages = [page(["Nothing here about it."], 0), page(["Job search through social networks is effective."], 1)];
  assert.equal(locate("Job search through social networks", pages).pageIndex, 1);
});

test("folds text the same way on both sides", () => {
  assert.equal(fold("ﬁeld “work”-seeking"), fold("field \"work\" seeking"));
});

test("merges a line's characters and drops empty boxes", () => {
  assert.deepEqual(lineRects([[0, 0, 0, 0], [10, 100, 15, 110], [15, 100.5, 20, 110.5]]), [[10, 100, 20, 110.5]]);
});

test("shares an item's width among its characters when only items are known", () => {
  const chars = charsFromItems([{ str: "abcd", transform: [10, 0, 0, 10, 100, 500], width: 40, height: 10 }]);
  assert.deepEqual(chars[1], { c: "b", rect: [110, 500, 120, 510] });
});
