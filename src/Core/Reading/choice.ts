/**
 * The reading form's choices, as both windows read and remember them — AI zone.
 *
 * What the person last chose (the AI, the columns, what to look for, the writing language and
 * whether comments add a paraphrase or a translation) is remembered in Ze-Notes' preferences and
 * offered again, in either window. The writing language starts as Ze-Notes' own translation
 * language (`translation-language`), so a person who set one is not asked twice.
 */
import ZPrefs from "../ZPrefs";
import Languages from "../Translation/Languages";
import { DEFAULT_COLUMNS, DEFAULT_INSTRUCTION, parseColumns } from "./prompt";
import type { PassChoice } from "./pass";

export interface FormChoice {
  provider: string;
  instruction: string;
  /** As typed: comma-separated. */
  columns: string;
  language: string;
  paraphrase: boolean;
  translation: boolean;
}

/**
 * How the reading window opens: kept in front of Zotero while Zotero stays usable, or on its own.
 * Modal was tried and dropped (2026-10-26): with Zotero blocked, "Go to" could not move the PDF
 * until the window closed.
 */
export type WindowMode = "front" | "normal";

const flag = (key: string): boolean => String(ZPrefs.get(key, "false")) === "true";

export function defaultChoice(): FormChoice {
  const iso = String(ZPrefs.get("translation-language", "en") || "en");
  return {
    provider: String(ZPrefs.get("reading-provider", "")),
    instruction: String(ZPrefs.get("reading-instruction", DEFAULT_INSTRUCTION)),
    columns: String(ZPrefs.get("reading-columns", DEFAULT_COLUMNS.join(", "))),
    language: String(ZPrefs.get("reading-language", "") || Languages.getlabel(iso) || "English"),
    paraphrase: flag("reading-paraphrase"),
    translation: flag("reading-translation"),
  };
}

export function rememberChoice(choice: FormChoice): void {
  ZPrefs.set("reading-provider", choice.provider);
  ZPrefs.set("reading-instruction", choice.instruction);
  ZPrefs.set("reading-columns", choice.columns);
  ZPrefs.set("reading-language", choice.language);
  ZPrefs.set("reading-paraphrase", String(choice.paraphrase));
  ZPrefs.set("reading-translation", String(choice.translation));
}

/** The form's choice as a pass takes it: columns parsed, the defaults standing in for nothing typed. */
export function passChoiceOf(choice: FormChoice): PassChoice {
  const columns = parseColumns(choice.columns);
  return {
    instruction: choice.instruction.trim() || DEFAULT_INSTRUCTION,
    columns: columns.length ? columns : [...DEFAULT_COLUMNS],
    comment: {
      language: choice.language.trim() || "English",
      paraphrase: Boolean(choice.paraphrase),
      translation: Boolean(choice.translation),
    },
  };
}

export function windowMode(): WindowMode {
  // "modal", once the default, now reads as "front": the nearest that lets "Go to" work.
  return String(ZPrefs.get("reading-window", "front")) === "normal" ? "normal" : "front";
}

export function setWindowMode(mode: WindowMode): void {
  ZPrefs.set("reading-window", mode);
}

/** Where the window was and how big, so it opens there again. */
export interface Geometry {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function savedGeometry(): Geometry | null {
  try {
    const g: unknown = JSON.parse(String(ZPrefs.get("reading-geometry", "") || "null"));
    if (typeof g !== "object" || g === null) return null;
    const { x, y, w, h } = g as Record<string, unknown>;
    if (![x, y, w, h].every((n) => typeof n === "number" && Number.isFinite(n))) return null;
    // A window too small to use is not put back; the default size is.
    if ((w as number) < 400 || (h as number) < 300) return null;
    return { x: x as number, y: y as number, w: w as number, h: h as number };
  } catch {
    return null;
  }
}

export function saveGeometry(g: Geometry): void {
  ZPrefs.set("reading-geometry", JSON.stringify(g));
}

/**
 * The windows' layout state (which folds are open), by name: `null` when never set, so the page's
 * own rule (the settings open while a PDF has no pass yet) decides the first time.
 */
export const layout = {
  get(key: string): boolean | null {
    const v = String(ZPrefs.get(`reading-ui.${key}`, ""));
    return v === "true" ? true : v === "false" ? false : null;
  },
  set(key: string, open: boolean): void {
    ZPrefs.set(`reading-ui.${key}`, String(open));
  },
};
