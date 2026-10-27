/**
 * The reading pass itself: ask, check, and shape what is found into highlights — AI zone.
 *
 * The model is whichever AI the person chose (`ai.ts`: Ze-Notes' own providers and Custom AI
 * presets, read-only), asked with this feature's own prompt. Each proposed quote is then looked
 * for on the page; only one found word for word becomes something that can be saved.
 */
import type { Located } from "./locate";
import { locate } from "./locate";
import type { CommentOptions, Proposal } from "./prompt";
import { chunks, parseProposals, saysNothing, systemPrompt, userMessage } from "./prompt";
import type { ReadPage } from "./text";

/** Zotero's eight highlight colours. Each column takes the next, in the order the columns are given. */
export const COLOURS = ["#ffd400", "#2ea8e5", "#f19837", "#5fb236", "#a28ae5", "#e56eee", "#ff6666", "#aaaaaa"];

export interface Found extends Proposal {
  /** A Zotero key made now, so saving twice after a lost answer makes one highlight, not two. */
  key: string;
  located: Located;
  pageLabel: string;
  /**
   * The reader's ordering, worked out while the page's size is known, so a run reopened later,
   * without the pages, can still be saved.
   */
  sortIndex: string;
}

export interface PassResult {
  found: Found[];
  /** Quotes the model gave that are not in the PDF. Shown, never saved. */
  missing: Proposal[];
  /** Requests that failed, with the provider's message. */
  problems: string[];
}

export function newKey(): string {
  const utils = (Zotero as any).DataObjectUtilities;
  if (typeof utils?.generateKey === "function") return utils.generateKey();
  return (Zotero.Utilities as any).generateObjectKey();
}

export async function runPass(options: {
  pages: ReadPage[];
  /** One request to the chosen AI: a system prompt and a message, the answer as text. */
  ask(system: string, user: string): Promise<string>;
  instruction: string;
  columns: string[];
  /** What a comment holds besides the summary, and its language. */
  comment: CommentOptions;
  onProgress?: (done: number, total: number) => void;
}): Promise<PassResult> {
  const parts = chunks(options.pages);
  const result: PassResult = { found: [], missing: [], problems: [] };
  const seen = new Set<string>();
  const system = systemPrompt(options.columns, options.comment);

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i]!;
    let answer: string;
    try {
      answer = await options.ask(system, userMessage(options.instruction, options.columns, part));
    } catch (e) {
      result.problems.push(`Part ${i + 1}: ${String((e as Error)?.message ?? e)}`);
      options.onProgress?.(i + 1, parts.length);
      continue;
    }

    const proposals = parseProposals(answer);
    // Nothing readable in an answer that was not "[]" is said, never passed off as "nothing found".
    if (proposals.length === 0 && !saysNothing(answer)) {
      result.problems.push(
        `Part ${i + 1}: the AI's answer could not be read as a list of passages. It may have been cut off; ` +
          "fewer columns, or a higher maximum of tokens for this AI in Ze-Notes' settings, can help.",
      );
    }

    // The pages this request covered first, then the rest: a quote is expected where it was
    // read, and found anywhere else only if the model moved it.
    const near = options.pages.filter((p) => p.pageIndex >= part.first && p.pageIndex <= part.last);
    const far = options.pages.filter((p) => p.pageIndex < part.first || p.pageIndex > part.last);
    for (const proposal of proposals) {
      const located = locate(proposal.quote, near) ?? locate(proposal.quote, far);
      if (!located) {
        result.missing.push(proposal);
        continue;
      }
      const where = `${located.pageIndex}:${located.offset}`;
      if (seen.has(where)) continue;
      seen.add(where);
      result.found.push({
        ...proposal,
        key: newKey(),
        located,
        pageLabel: options.pages[located.pageIndex]?.label ?? String(located.pageIndex + 1),
        sortIndex: sortIndexOf(located, options.pages[located.pageIndex]?.viewBox ?? [0, 0, 0, 0]),
      });
    }
    options.onProgress?.(i + 1, parts.length);
  }

  result.found.sort((a, b) => a.located.pageIndex - b.located.pageIndex || a.located.offset - b.located.offset);
  return result;
}

/** The reader's `sortIndex`: page, offset on the page, distance from the top in points. */
export function sortIndexOf(located: Located, viewBox: number[]): string {
  const pad = (n: number, width: number, max: number): string =>
    String(Math.max(0, Math.min(max, Math.floor(n)))).padStart(width, "0");
  const top = (viewBox[3] ?? 0) - (located.rects[0]?.[3] ?? 0);
  return `${pad(located.pageIndex, 5, 99999)}|${pad(located.offset, 6, 999999)}|${pad(top, 5, 99999)}`;
}

/** One accepted proposal, as `../Annotate/` takes it. */
export function toAnnotation(found: Found, attachmentKey: string, color: string): Record<string, unknown> {
  return {
    attachmentKey,
    key: found.key,
    type: "highlight",
    text: found.located.text,
    comment: found.comment,
    color,
    pageLabel: found.pageLabel,
    sortIndex: found.sortIndex,
    position: { pageIndex: found.located.pageIndex, rects: found.located.rects },
    tags: found.column ? [found.column] : [],
  };
}
