/**
 * One paper's reading pass, start to finish — AI zone.
 *
 * Read the PDF's pages from its reader, ask the AI part by part, check every quote on the page,
 * and add the pass to the PDF's passes (`store.ts`) before anything is shown, so a closed window
 * or a stopped batch loses nothing, and an earlier pass is never replaced. The settings it ran
 * with, the prompt word for word included, go with it. A pass in which every request failed (a
 * rejected API key) is not kept: there is nothing in it but the error, which is shown instead.
 * The reading window (`index.ts`) runs it for the PDF on screen; the batch window (`batch.ts`)
 * runs it for each paper ticked.
 */
import type { ReadingAi } from "./ai";
import { CHUNK_CHARS, MAX_PER_CHUNK, systemPrompt } from "./prompt";
import type { CommentOptions } from "./prompt";
import { runPass } from "./propose";
import { addRun } from "./store";
import type { KeptRun } from "./store";
import { readPages } from "./text";

export interface PassChoice {
  instruction: string;
  columns: string[];
  comment: CommentOptions;
}

export async function passFor(
  reader: any,
  ai: ReadingAi,
  choice: PassChoice,
  onProgress: (message: string) => void,
): Promise<KeptRun> {
  const attachment = reader._item;
  const pages = await readPages(reader, (done, total) => onProgress(`Reading page ${done} of ${total}…`));
  if (!pages.some((p) => p.text.trim())) {
    throw new Error("This PDF has no text to read (a scan without OCR?).");
  }
  const result = await runPass({
    pages,
    ask: ai.ask,
    instruction: choice.instruction,
    columns: choice.columns,
    comment: choice.comment,
    onProgress: (done, total) => onProgress(`Asking the AI: part ${done} of ${total}…`),
  });
  if (result.found.length === 0 && result.missing.length === 0 && result.problems.length > 0) {
    throw new Error(`The AI could not be asked: ${result.problems[0]}`);
  }
  const date = new Date().toISOString();
  const aiName = `${ai.label} (${ai.detail})`;
  const run: KeptRun = {
    version: 2,
    id: date,
    date,
    ai: aiName,
    instruction: choice.instruction,
    columns: choice.columns,
    settings: {
      ai: aiName,
      aiId: ai.id,
      instruction: choice.instruction,
      columns: choice.columns,
      comment: choice.comment,
      systemPrompt: systemPrompt(choice.columns, choice.comment),
      chunkChars: CHUNK_CHARS,
      maxPerChunk: MAX_PER_CHUNK,
    },
    items: result.found.map((found) => ({ found, column: found.column, comment: found.comment, checked: true })),
    missing: result.missing,
    problems: result.problems,
  };
  await addRun(attachment.libraryID, attachment.key, run);
  return run;
}
