#!/usr/bin/env node
// Lists the changed files (git status) that lie outside the AI zones, so original Ze-Notes code
// touched by an AI assistant is seen before it is committed. The zones are listed in
// `src/Core/Extensions.ts`; the three known touch points are named apart.
//
//   node commands/check-zones.mjs
import { execSync } from "node:child_process";

const ZONES = [
  "src/Core/Extensions.ts",
  "src/Core/Bridge/",
  "src/Core/Annotate/",
  "src/Core/Reading/",
  "app/chrome/content/xhtml/reading/",
  "commands/check-zones.mjs",
];

/** Original files the zones are wired through, one or two lines each (see `Extensions.ts`). */
const TOUCH_POINTS = [
  "src/Core/index.ts",
  "src/index.ts",
  "app/chrome/core/appbase.js",
  // The AI-zone rules themselves, written for the next assistant.
  ".claude.md",
];

/** Build output and release files: generated, not written by hand. */
const GENERATED = ["app/chrome/core/engine.js", "app/chrome/content/xhtml/notes.css", "build/"];

const changed = execSync("git status --porcelain", { encoding: "utf8" })
  .split("\n")
  .filter(Boolean)
  .map((line) => ({ status: line.slice(0, 2).trim(), path: line.slice(3).replace(/^"|"$/g, "") }));

const inside = (path, list) => list.some((z) => (z.endsWith("/") ? path.startsWith(z) : path === z));
const zone = changed.filter((c) => inside(c.path, ZONES));
const touch = changed.filter((c) => inside(c.path, TOUCH_POINTS));
const generated = changed.filter((c) => inside(c.path, GENERATED));
const outside = changed.filter(
  (c) => !inside(c.path, ZONES) && !inside(c.path, TOUCH_POINTS) && !inside(c.path, GENERATED),
);

const show = (title, list) => {
  console.log(`${title} (${list.length})`);
  for (const c of list) console.log(`  ${c.status.padEnd(2)} ${c.path}`);
};
show("Inside the AI zones", zone);
show("Touch points (expected: a line or two each)", touch);
show("Generated", generated);
show("Outside the zones: check these were changed by you", outside);
