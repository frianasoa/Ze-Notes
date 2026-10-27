/**
 * Finding a quote on a PDF page, word for word, and where it sits — AI zone.
 *
 * An AI proposes quotes; this decides whether each one is really in the paper and, when it is,
 * returns the rectangles a highlight needs. A quote that is not on any page is not found, and
 * the reading pass drops it and says so: an invented quotation never becomes a highlight.
 *
 * "Word for word" ignores what a PDF's text layer and a model's copy of it disagree on without
 * the words being different: ligatures (`ﬁ` against `fi`), curly against straight quotes, a word
 * broken by a hyphen at the end of a line, spacing and case. Letters and digits must match, in
 * order. The same rules found the twenty quotes of Clew's literature manual on 2026-10-26.
 *
 * Pure: it takes a page's characters with their boxes in PDF user space and knows nothing of
 * Zotero, so it is tested alone (`test/locate.test.mjs`).
 */

/** One character on a page, with its box in PDF user space: `[x1, y1, x2, y2]`. */
export interface PageChar {
  c: string;
  rect: number[];
  /** Zotero's own word and line breaks, when its character data has them. */
  spaceAfter?: boolean;
  lineBreakAfter?: boolean;
}

export interface PageText {
  pageIndex: number;
  chars: PageChar[];
}

export interface Located {
  pageIndex: number;
  /** One rectangle per line, as Zotero's reader stores a highlight. */
  rects: number[][];
  /** Where the quote starts among the page's characters, for the reader's `sortIndex`. */
  offset: number;
  /** The quote's text as it is on the page, which is what the highlight carries. */
  text: string;
}

/** Letters and digits, lower case, ligatures unfolded: what two copies of a text must share. */
export function fold(text: string): string {
  return text
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "");
}

/** The page's folded text, and for each folded character the page character it came from. */
function foldPage(chars: PageChar[]): { text: string; from: number[] } {
  let text = "";
  const from: number[] = [];
  chars.forEach((ch, i) => {
    const f = fold(ch.c);
    for (const piece of f) {
      text += piece;
      from.push(i);
    }
  });
  return { text, from };
}

/**
 * The boxes of the matched characters, merged into one per line. Two characters are on one line
 * when they overlap vertically by more than half the shorter one's height.
 */
export function lineRects(boxes: number[][]): number[][] {
  const lines: number[][] = [];
  for (const [x1, y1, x2, y2] of boxes) {
    if (!(x2 > x1) || !(y2 > y1)) continue;
    const line = lines.find((l) => {
      const overlap = Math.min(l[3], y2) - Math.max(l[1], y1);
      return overlap > Math.min(l[3] - l[1], y2 - y1) / 2;
    });
    if (line) {
      line[0] = Math.min(line[0], x1);
      line[1] = Math.min(line[1], y1);
      line[2] = Math.max(line[2], x2);
      line[3] = Math.max(line[3], y2);
    } else {
      lines.push([x1, y1, x2, y2]);
    }
  }
  // Top to bottom: PDF user space counts y upwards, so the highest line has the largest y.
  return lines
    .sort((a, b) => b[3] - a[3] || a[0] - b[0])
    .map((r) => r.map((n) => Math.round(n * 1000) / 1000));
}

/**
 * Characters back into readable text: Zotero's own breaks where it gives them, otherwise a
 * space where two characters on a line stand apart and a line break where the line changes.
 * Words that run together would be no use to a model, nor in a saved highlight.
 */
export function pageText(chars: PageChar[]): string {
  let out = "";
  chars.forEach((ch, i) => {
    out += ch.c;
    const next = chars[i + 1];
    if (!next) return;
    if (ch.lineBreakAfter) {
      out += "\n";
      return;
    }
    if (ch.spaceAfter) {
      out += " ";
      return;
    }
    const [x1, y1, x2, y2] = ch.rect;
    const [nx1, ny1, , ny2] = next.rect;
    const height = Math.max(y2 - y1, ny2 - ny1, 1);
    if (!(x2 > x1) || /\s/.test(ch.c) || /\s/.test(next.c)) return;
    const overlap = Math.min(y2, ny2) - Math.max(y1, ny1);
    if (overlap < height / 2) out += "\n";
    else if (nx1 - x2 > height * 0.15) out += " ";
  });
  return out;
}

/** The first place `quote` occurs on these pages, or `null` when it is on none of them. */
export function locate(quote: string, pages: PageText[]): Located | null {
  const needle = fold(quote);
  // Too short to be a quotation rather than a common word: refused, not guessed.
  if (needle.length < 12) return null;
  for (const page of pages) {
    const { text, from } = foldPage(page.chars);
    const at = text.indexOf(needle);
    if (at < 0) continue;
    const first = from[at]!;
    const last = from[at + needle.length - 1]!;
    const chars = page.chars.slice(first, last + 1);
    return {
      pageIndex: page.pageIndex,
      rects: lineRects(chars.filter((ch) => ch.c.trim() !== "").map((ch) => ch.rect)),
      offset: first,
      text: pageText(chars).replace(/\s+/g, " ").trim(),
    };
  }
  return null;
}

/**
 * A page's characters made from pdf.js text items, for when only items are to hand: each item's
 * width is shared out evenly among its characters. Less exact than the reader's own characters,
 * so used only as a fallback.
 */
export function charsFromItems(
  items: Array<{ str: string; transform: number[]; width: number; height: number }>,
): PageChar[] {
  const chars: PageChar[] = [];
  for (const item of items) {
    const [, , , d, e, f] = item.transform;
    const height = item.height || Math.abs(d) || 0;
    const step = item.str.length ? item.width / item.str.length : 0;
    Array.from(item.str).forEach((c, i) => {
      chars.push({ c, rect: [e + step * i, f, e + step * (i + 1), f + height] });
    });
    // Items carry no space between them; a space keeps words apart for the text a highlight carries.
    chars.push({ c: " ", rect: [0, 0, 0, 0] });
  }
  return chars;
}
