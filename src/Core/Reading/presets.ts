/**
 * Saved reading-pass settings, for any PDF — AI zone.
 *
 * A set of settings that worked (the AI, the columns, what to look for) is given a name and kept
 * in Ze-Notes' own database (`../Prefs.ts`), under `reading-preset/<name>`, so it can be set into
 * the form of any PDF's reading window or of the batch window: "Gaps" on one paper today, the same
 * on a whole collection tomorrow. The user's idea, 2026-10-26.
 */
import Prefs from "../Prefs";
import type { CommentOptions } from "./prompt";

export interface Preset {
  name: string;
  /** The AI's id, as `ai.ts` names it, so the same one is chosen again. */
  aiId: string;
  /** Its name as shown, "DeepSeek (deepseek-chat)", for when that id is not usable here. */
  ai: string;
  columns: string[];
  instruction: string;
  /** The writing language and whether comments add a paraphrase or a translation; absent on early sets. */
  comment?: CommentOptions;
  /** When it was saved, ISO. */
  saved: string;
}

const PREFIX = "reading-preset/";
export const MAX_NAME = 80;

function isPreset(value: unknown): value is Preset {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v["name"] === "string" && Array.isArray(v["columns"]) && typeof v["instruction"] === "string";
}

/** Every saved set, by name. */
export async function listPresets(): Promise<Preset[]> {
  const found: Record<string, string> = await Prefs.search(PREFIX);
  const out: Preset[] = [];
  for (const [key, raw] of Object.entries(found)) {
    // `Prefs.search` matches anywhere in the key; only keys that start with the prefix are ours.
    if (!key.startsWith(PREFIX)) continue;
    try {
      const preset: unknown = JSON.parse(String(raw));
      if (isPreset(preset)) out.push(preset);
    } catch {
      // One that will not read is left out; the others are still offered.
    }
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

/** Saves a set under its name; a set already saved under that name is replaced. */
export async function savePreset(preset: Omit<Preset, "saved">): Promise<Preset> {
  const name = preset.name.trim();
  if (!name) throw new Error("Give the settings a name.");
  if (name.length > MAX_NAME) throw new Error(`A name is at most ${MAX_NAME} characters.`);
  const kept: Preset = { ...preset, name, saved: new Date().toISOString() };
  await Prefs.set(PREFIX + name, JSON.stringify(kept));
  return kept;
}

export async function deletePreset(name: string): Promise<void> {
  await Prefs.remove(PREFIX + name);
}
