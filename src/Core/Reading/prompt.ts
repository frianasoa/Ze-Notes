/**
 * What the reading pass asks a model, and how its answer is read — AI zone.
 *
 * The model is asked for quotations copied word for word, each with a column and a one-line
 * comment, as JSON and nothing else. It is not trusted on the first point: every quote is then
 * looked for on the page (`locate.ts`), and one that is not there is never saved. Pure, so it is
 * tested alone (`test/prompt.test.mjs`).
 */

export const DEFAULT_INSTRUCTION =
  "Find what this paper says about its method, its main findings, and the gaps it names. Prefer sentences that state a result or a design choice over background.";

export const DEFAULT_COLUMNS = ["Method", "Findings", "Gap"];

/** At most this many proposals per request, so an answer is not cut off mid-JSON. */
export const MAX_PER_CHUNK = 12;

/** Characters of paper text per request. A 25-page article is two or three requests. */
export const CHUNK_CHARS = 40000;

export interface Proposal {
  quote: string;
  column: string;
  /** The highlight's comment, in Ze-Notes' parts: `[[Summary]]`, then any paraphrase and translation. */
  comment: string;
}

/** What the comment holds besides the summary, and in which language it is written. */
export interface CommentOptions {
  /** The language the researcher writes in, as a name ("English", "Français"). */
  language: string;
  paraphrase: boolean;
  translation: boolean;
}

export const DEFAULT_COMMENT_OPTIONS: CommentOptions = { language: "English", paraphrase: false, translation: false };

/**
 * A comment in Ze-Notes' parts, the way its reader menu and its table read them
 * (`Utils.splitcomment`): each `[[Title]]` starts a part, drawn as its own box. Empty parts are
 * left out, so a quote already in the writing language has no translation box.
 */
export function composeComment(parts: { summary?: string; paraphrase?: string; translation?: string }): string {
  return (
    [
      ["Summary", parts.summary],
      ["Paraphrase", parts.paraphrase],
      ["Translation", parts.translation],
    ] as Array<[string, string | undefined]>
  )
    .filter(([, text]) => typeof text === "string" && text.trim() !== "")
    .map(([title, text]) => `[[${title}]]\n${text!.trim()}`)
    .join("\n\n");
}

export interface Chunk {
  /** Page indexes covered, first and last. */
  first: number;
  last: number;
  text: string;
}

/** The columns as the person typed them: comma-separated, trimmed, empty ones and repeats dropped. */
export function parseColumns(text: string): string[] {
  return [
    ...new Set(
      text
        .split(",")
        .map((c) => c.trim())
        .filter(Boolean),
    ),
  ];
}

/**
 * The system prompt, word for word what every request carries (and what a pass keeps, to be shown).
 *
 * The summary is asked for as a note in a matrix, stating the content itself: models left to
 * themselves open with "Explains…" or "This passage describes…", which says nothing a column
 * header does not, so those openings are named and ruled out, and an example shows the register.
 */
export function systemPrompt(
  columns: string[],
  options: CommentOptions = DEFAULT_COMMENT_OPTIONS,
  max = MAX_PER_CHUNK,
): string {
  const language = options.language.trim() || "English";
  const keys = ['"quote"', '"column"', '"summary"'];
  if (options.paraphrase) keys.push('"paraphrase"');
  if (options.translation) keys.push('"translation"');
  const first = columns[0] ?? "Findings";
  const lines = [
    "You help a researcher build a literature matrix. In one paper, you find the passages that answer the researcher's instruction and file each one under a column.",
    "",
    `Reply with JSON only, with no prose and no code fence: an array of objects with the keys ${keys.join(", ")}.`,
    "",
    "For each object:",
    '- "quote": copied exactly, character for character, from the paper text you are given: one or two consecutive sentences. Never paraphrase, shorten inside, correct spelling, or join words from different places. Never include a page marker such as [page 3].',
    `- "column": exactly one of ${columns.map((c) => JSON.stringify(c)).join(", ")}: the one the passage answers.`,
    `- "summary": one sentence in ${language} stating what the passage says, as a note in a literature matrix. Write the content itself. Never open with, or use, framing words such as "Explains", "Describes", "Discusses", "Highlights", "This passage", "This sentence", "The authors" or "The study". Keep the numbers, populations, places and methods that matter.`,
  ];
  if (options.paraphrase) {
    lines.push(`- "paraphrase": the quote rewritten in ${language} in plain words, with the same meaning and nothing added.`);
  }
  if (options.translation) {
    lines.push(
      `- "translation": a faithful translation of the quote into ${language}, or an empty string when the quote is already in ${language}.`,
    );
  }
  lines.push(
    "",
    "Choosing the passages:",
    `- At most ${max} objects. Prefer passages that state a result, a sample, a method, a design choice or a limitation over background and over what other studies found.`,
    "- Do not propose the same idea twice.",
    "- If nothing in the text fits, reply [].",
    "",
    "The register of a summary, for a quote such as \"We interviewed 34 first-year teachers in rural schools over two school years.\":",
    `{"quote": "We interviewed 34 first-year teachers in rural schools over two school years.", "column": ${JSON.stringify(first)}, "summary": "Two-year interview study of 34 first-year teachers in rural schools."}`,
  );
  return lines.join("\n");
}

export function userMessage(instruction: string, columns: string[], chunk: Chunk): string {
  return [
    `Instruction: ${instruction}`,
    `Columns: ${columns.join(", ")}`,
    "",
    "Text of the paper (each page starts with its marker, such as [page 3]; never quote a marker):",
    chunk.text,
  ].join("\n");
}

/**
 * The paper's pages in requests of about `cap` characters, each page whole and marked with its
 * label, so a quote can be traced back and a page is never cut in two.
 */
export function chunks(
  pages: Array<{ pageIndex: number; label: string; text: string }>,
  cap = CHUNK_CHARS,
): Chunk[] {
  const out: Chunk[] = [];
  let current: Chunk | null = null;
  for (const page of pages) {
    const block = `[page ${page.label}]\n${page.text.trim()}\n`;
    if (current && current.text.length + block.length > cap) {
      out.push(current);
      current = null;
    }
    if (!current) current = { first: page.pageIndex, last: page.pageIndex, text: "" };
    current.text += block;
    current.last = page.pageIndex;
  }
  if (current && current.text.trim()) out.push(current);
  return out;
}

/**
 * A part in two (or three), at page boundaries near the middle, for a request whose answer was
 * cut off: half the text asks for half the answer. A part of one page cannot be split, and comes
 * back alone.
 */
export function splitPart(
  part: Chunk,
  pages: Array<{ pageIndex: number; label: string; text: string }>,
): Chunk[] {
  const inside = pages.filter((p) => p.pageIndex >= part.first && p.pageIndex <= part.last);
  if (inside.length < 2) return [part];
  return chunks(inside, Math.ceil(part.text.length / 2));
}

/** True when the answer holds a JSON array that arrived whole, its closing bracket included. */
export function isWholeArray(answer: string): boolean {
  const start = answer.indexOf("[");
  const end = answer.lastIndexOf("]");
  if (start < 0 || end <= start) return false;
  try {
    return Array.isArray(JSON.parse(answer.slice(start, end + 1)));
  } catch {
    return false;
  }
}

/**
 * The proposals in a model's answer. The answer is meant to be a bare JSON array, but models wrap
 * it in prose or a code fence often enough that the array is cut out of whatever surrounds it.
 * Anything that is not an object with a non-empty quote is dropped; a column the model invented
 * is kept as it is, for the person to change in the review.
 */
export function parseProposals(answer: string): Proposal[] {
  const start = answer.indexOf("[");
  const end = answer.lastIndexOf("]");
  let data: unknown = null;
  if (start >= 0 && end > start) {
    try {
      data = JSON.parse(answer.slice(start, end + 1));
    } catch {
      data = null;
    }
  }
  // An answer cut off by the provider's token limit is an array with no end. Each object that
  // did arrive whole is still good, so they are taken one by one.
  const items = Array.isArray(data) ? data : objectsIn(answer);
  const out: Proposal[] = [];
  for (const item of items) {
    if (typeof item !== "object" || item === null) continue;
    const r = item as Record<string, unknown>;
    const quote = typeof r["quote"] === "string" ? r["quote"].trim() : "";
    if (!quote) continue;
    const text = (key: string): string => (typeof r[key] === "string" ? (r[key] as string).trim() : "");
    out.push({
      quote,
      column: text("column"),
      // The parts become the comment; a model that answered with a plain "comment" (as the first
      // prompt asked) still gives one, as its summary.
      comment: composeComment({
        summary: text("summary") || text("comment"),
        paraphrase: text("paraphrase"),
        translation: text("translation"),
      }),
    });
  }
  return out;
}

/** Every complete top-level `{…}` in a text that parses as JSON, strings and escapes respected. */
export function objectsIn(text: string): unknown[] {
  const out: unknown[] = [];
  let depth = 0;
  let start = -1;
  let inString = false;
  let escaped = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (c === "\\") escaped = true;
      else if (c === '"') inString = false;
      continue;
    }
    if (c === '"') inString = true;
    else if (c === "{") {
      if (depth === 0) start = i;
      depth++;
    } else if (c === "}" && depth > 0) {
      depth--;
      if (depth === 0 && start >= 0) {
        try {
          out.push(JSON.parse(text.slice(start, i + 1)));
        } catch {
          // Not JSON after all; the next object may be.
        }
        start = -1;
      }
    }
  }
  return out;
}

/** True when an answer says "nothing here" (`[]`), as opposed to saying something unreadable. */
export function saysNothing(answer: string): boolean {
  return /^\s*(```(json)?)?\s*\[\s*\]\s*(```)?\s*$/i.test(answer);
}
