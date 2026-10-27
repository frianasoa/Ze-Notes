/**
 * Every reading pass of each PDF, kept so any of them can be opened again — AI zone.
 *
 * A run costs the person time and API credit, and its proposals stay worth having: to save more
 * later, to delete a highlight, to add a deleted one back, to change a comment. And passes with
 * different aims sit side by side on one PDF (the gaps today, the method tomorrow). So each PDF
 * keeps all of its passes, newest last, in Ze-Notes' own database (`../Prefs.ts`, the table that
 * also holds the Custom AI presets), under `reading-pass/<libraryID>/<attachmentKey>`.
 *
 * Each pass carries the settings it ran with, the full prompt included, so what produced a
 * highlight can always be shown.
 *
 * Whether a proposal is saved is not stored but asked of Zotero when a pass is opened: its
 * highlight has the key the pass gave it, so one deleted in Zotero since reads as unsaved, and one
 * saved from another window reads as saved.
 */
import Prefs from "../Prefs";
import type { CommentOptions, Proposal } from "./prompt";
import type { Found } from "./propose";

export interface KeptItem {
  found: Found;
  column: string;
  comment: string;
  checked: boolean;
  /** Saved at least once: a key Zotero has seen is not used again after a deletion. */
  savedOnce?: boolean;
}

/** What a pass ran with: shown on request, for transparency. */
export interface PassSettings {
  ai: string;
  /** The AI's id (`ai.ts`), so "Use these settings" picks the same one; absent on early passes. */
  aiId?: string;
  instruction: string;
  columns: string[];
  /** What the comments held besides the summary, and their language; absent on early passes. */
  comment?: CommentOptions;
  /** The system prompt sent with every part, word for word. */
  systemPrompt: string;
  /** How the paper was cut into requests, and how many passages each could propose. */
  chunkChars: number;
  maxPerChunk: number;
}

export interface KeptRun {
  version: 2;
  /** Unique within the PDF; the date it was made, which also orders the passes. */
  id: string;
  date: string;
  /** "DeepSeek (deepseek-chat)": which AI made it. */
  ai: string;
  instruction: string;
  columns: string[];
  settings: PassSettings;
  items: KeptItem[];
  missing: Proposal[];
  problems: string[];
}

interface KeptFile {
  version: 2;
  runs: KeptRun[];
}

const keyOf = (libraryID: number, attachmentKey: string): string => `reading-pass/${libraryID}/${attachmentKey}`;

/**
 * One pass as written on 2026-10-26 before passes were listed (`version: 1`, one per PDF), made
 * into a pass of today's shape so it is not lost: its settings are what it recorded, and the
 * prompt it did not record is said to be unknown.
 */
function fromVersion1(v: Record<string, unknown>): KeptRun | null {
  if (v["version"] !== 1 || !Array.isArray(v["items"]) || !Array.isArray(v["columns"])) return null;
  const date = String(v["date"] ?? new Date(0).toISOString());
  const columns = v["columns"] as string[];
  return {
    version: 2,
    id: date,
    date,
    ai: String(v["ai"] ?? ""),
    instruction: String(v["instruction"] ?? ""),
    columns,
    settings: {
      ai: String(v["ai"] ?? ""),
      instruction: String(v["instruction"] ?? ""),
      columns,
      systemPrompt: "(not recorded: this pass was made before passes kept their prompt)",
      chunkChars: 0,
      maxPerChunk: 0,
    },
    items: v["items"] as KeptItem[],
    missing: (v["missing"] as Proposal[]) ?? [],
    problems: (v["problems"] as string[]) ?? [],
  };
}

function isRun(value: unknown): value is KeptRun {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return v["version"] === 2 && typeof v["id"] === "string" && Array.isArray(v["items"]);
}

/** Every pass of this PDF, oldest first; none when it has never been read. */
export async function loadRuns(libraryID: number, attachmentKey: string): Promise<KeptRun[]> {
  try {
    const raw = await Prefs.get(keyOf(libraryID, attachmentKey));
    if (!raw) return [];
    const data: unknown = JSON.parse(String(raw));
    if (typeof data !== "object" || data === null) return [];
    const d = data as Record<string, unknown>;
    if (d["version"] === 2 && Array.isArray(d["runs"])) return (d["runs"] as unknown[]).filter(isRun);
    const old = fromVersion1(d);
    return old ? [old] : [];
  } catch {
    // Passes that will not read are no passes; the window starts empty.
    return [];
  }
}

async function writeRuns(libraryID: number, attachmentKey: string, runs: KeptRun[]): Promise<void> {
  const file: KeptFile = { version: 2, runs };
  await Prefs.set(keyOf(libraryID, attachmentKey), JSON.stringify(file));
}

/** Adds a pass, newest last. */
export async function addRun(libraryID: number, attachmentKey: string, run: KeptRun): Promise<void> {
  const runs = await loadRuns(libraryID, attachmentKey);
  await writeRuns(libraryID, attachmentKey, [...runs.filter((r) => r.id !== run.id), run]);
}

/** Forgets one pass. Highlights it saved stay in Zotero; that is the caller's to decide. */
export async function removeRun(libraryID: number, attachmentKey: string, id: string): Promise<void> {
  const runs = await loadRuns(libraryID, attachmentKey);
  await writeRuns(
    libraryID,
    attachmentKey,
    runs.filter((r) => r.id !== id),
  );
}

/** Replaces one pass, by its id, with its edits. */
export async function updateRun(libraryID: number, attachmentKey: string, run: KeptRun): Promise<void> {
  const runs = await loadRuns(libraryID, attachmentKey);
  await writeRuns(
    libraryID,
    attachmentKey,
    runs.map((r) => (r.id === run.id ? run : r)),
  );
}

/** Whether the highlight a proposal was given its key for exists in Zotero now. */
export function isSaved(libraryID: number, found: Found): boolean {
  const item: any = Zotero.Items.getByLibraryAndKey(libraryID, found.key);
  return Boolean(item && !item.deleted && item.isAnnotation?.());
}
