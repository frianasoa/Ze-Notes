/**
 * The reading pass for many papers — AI zone (see `../Extensions.ts`).
 *
 * Right-click a collection, or a selection of items, and choose "Ze-Notes: Reading pass…". A
 * window lists the papers with a tick box each; the ticked ones are read one after another, each
 * in a background reader tab (`background.ts`), with the same pass as a single paper (`pass.ts`).
 * Nothing is saved to Zotero here: each run is kept per PDF, and "Review" opens the paper with its
 * reading window, where the proposals are looked over and saved. Decided with the user,
 * 2026-10-26: a window of its own (the Ze-Notes table is not changed), review first, one by one.
 */
import Config from "../../Config";
import Garbage from "../Garbage";
import Prefs from "../Prefs";
import { createXULElement } from "../../globals";
import { readingAis } from "./ai";
import type { NotUsable, ReadingAi } from "./ai";
import { showReader, withReader } from "./background";
import { defaultChoice, layout, passChoiceOf, rememberChoice } from "./choice";
import { showTab } from "./host";
import type { FormChoice } from "./choice";
import { passFor } from "./pass";
import { deletePreset, listPresets, savePreset } from "./presets";
import type { Preset } from "./presets";
import { isSaved, loadRuns } from "./store";

/** One paper in the list. */
export interface PaperRow {
  itemID: number;
  /** "Blokker et al. (2023)". */
  label: string;
  title: string;
  /** The PDF read, or null when the item has none. */
  attachmentID: number | null;
  /** The PDF's page count, to judge the time and the cost before reading; null when unknown. */
  pages?: number | null;
  /** Its word count, from Zotero's full-text cache; null when Zotero has not indexed it. */
  words?: number | null;
  why?: string;
  /** Its latest reading pass, if any, and how many passes it has in all. */
  last?: { date: string; found: number; saved: number; ai: string; passes: number };
}

export interface BatchController {
  title: string;
  defaults: FormChoice;
  /** Which folds were open, kept between openings. */
  layout: typeof layout;
  papers(): Promise<PaperRow[]>;
  /** The papers ticked when this collection (or selection) was last open here; null the first time. */
  ticked(): Promise<number[] | null>;
  rememberTicked(itemIDs: number[]): Promise<void>;
  providers(): Promise<{ usable: Array<{ id: string; label: string; detail: string }>; notUsable: NotUsable[] }>;
  openSettings(): void;
  /**
   * Reads the papers one by one. `onPaper` is told as each starts and ends; `shouldStop` is asked
   * between papers, so Stop lets the paper in hand finish rather than throwing its cost away.
   */
  run(
    choice: FormChoice,
    itemIDs: number[],
    hooks: {
      onProgress(itemID: number, message: string): void;
      onPaper(itemID: number, outcome: { ok: boolean; message: string; row?: PaperRow }): void;
      shouldStop(): boolean;
    },
  ): Promise<void>;
  review(itemID: number): Promise<void>;
  /** The saved settings, shared with every PDF's reading window. */
  presets(): Promise<Preset[]>;
  savePreset(preset: Omit<Preset, "saved">): Promise<Preset>;
  deletePreset(name: string): Promise<void>;
}

function labelOf(item: any): string {
  const creator = String(item.firstCreator || "").trim();
  const year = String(item.getField?.("date", true, true) || "").slice(0, 4);
  return [creator, year && `(${year})`].filter(Boolean).join(" ") || String(item.getDisplayTitle?.() || "Item");
}

/**
 * A PDF's page count: from Zotero's full-text index when it has indexed the file (no reading
 * needed), else from the PDF worker extracting a single page, which reports the total as well.
 */
async function pageCountOf(attachmentID: number): Promise<number | null> {
  try {
    const fulltext = (Zotero as any).Fulltext ?? (Zotero as any).FullText;
    const row = await fulltext?.getPages?.(attachmentID);
    const total = Number(row?.total);
    if (total > 0) return total;
  } catch {
    // Not indexed; ask the worker below.
  }
  try {
    const result = await (Zotero as any).PDFWorker.getFullText(attachmentID, 1);
    const total = Number(result?.totalPages);
    if (total > 0) return total;
  } catch {
    // A PDF the worker cannot open shows no count; reading it will say why.
  }
  return null;
}

/**
 * A PDF's word count, from the text Zotero extracted when it indexed the file (its full-text cache,
 * a plain text file beside the PDF), so no PDF is opened to count. Words are what is separated by
 * spaces, which undercounts Japanese and Chinese; it is a guide to the size, not a measure.
 */
async function wordCountOf(attachment: any): Promise<number | null> {
  try {
    const fulltext = (Zotero as any).Fulltext ?? (Zotero as any).FullText;
    const file = fulltext?.getItemCacheFile?.(attachment);
    if (!file?.exists?.()) return null;
    const text: string = await (Zotero as any).File.getContentsAsync(file);
    const words = text.split(/\s+/).filter(Boolean).length;
    return words > 0 ? words : null;
  } catch {
    return null;
  }
}

async function rowFor(item: any): Promise<PaperRow> {
  const row: PaperRow = {
    itemID: item.id,
    label: labelOf(item),
    title: String(item.getField?.("title") || ""),
    attachmentID: null,
  };
  const attachment: any = await item.getBestAttachment?.();
  if (!attachment || !attachment.isPDFAttachment?.()) {
    row.why = "no PDF";
    return row;
  }
  if (!(await attachment.fileExists())) {
    row.why = "PDF file not on this computer";
    return row;
  }
  row.attachmentID = attachment.id;
  row.pages = await pageCountOf(attachment.id);
  row.words = await wordCountOf(attachment);
  const runs = await loadRuns(attachment.libraryID, attachment.key);
  const run = runs[runs.length - 1];
  if (run) {
    row.last = {
      date: run.date,
      found: run.items.length,
      saved: run.items.filter((i) => isSaved(attachment.libraryID, i.found)).length,
      ai: run.ai,
      passes: runs.length,
    };
  }
  return row;
}

/** Opens the single-paper reading window on a reader; given by `index.ts`, which owns it. */
type OpenReading = (reader: any) => void;
let openReading: OpenReading = () => undefined;

/**
 * Which papers were ticked, kept per collection (or per selection of items) in Ze-Notes' own
 * database, under `reading-batch/<scope>`, by item key: opening the same collection again finds
 * the same papers ticked. The user's request, 2026-10-26.
 */
const tickedKey = (scope: string): string => `reading-batch/${scope}`;

function controllerFor(title: string, scope: string, items: any[]): BatchController {
  let ais: ReadingAi[] = [];
  const byID = new Map(items.map((i) => [i.id as number, i]));
  const byKey = new Map(items.map((i) => [`${i.libraryID}/${i.key}`, i.id as number]));

  return {
    title,
    defaults: defaultChoice(),
    layout,
    async papers() {
      const rows: PaperRow[] = [];
      for (const item of items) rows.push(await rowFor(item));
      return rows;
    },
    async ticked() {
      try {
        const raw = await Prefs.get(tickedKey(scope));
        if (!raw) return null;
        const keys: unknown = JSON.parse(String(raw));
        if (!Array.isArray(keys)) return null;
        return keys.map((k) => byKey.get(String(k))).filter((id): id is number => typeof id === "number");
      } catch {
        return null;
      }
    },
    async rememberTicked(itemIDs) {
      const keys = itemIDs
        .map((id) => byID.get(id))
        .filter(Boolean)
        .map((item) => `${item.libraryID}/${item.key}`);
      await Prefs.set(tickedKey(scope), JSON.stringify(keys));
    },
    async providers() {
      const found = await readingAis();
      ais = found.usable;
      return { usable: found.usable.map(({ id, label, detail }) => ({ id, label, detail })), notUsable: found.notUsable };
    },
    openSettings() {
      (Zotero.Utilities as any).Internal.openPreferences(Config.id);
    },
    async run(choice, itemIDs, hooks) {
      const ai = ais.find((a) => a.id === choice.provider);
      if (!ai) throw new Error("Choose an AI first.");
      rememberChoice(choice);
      const passChoice = passChoiceOf(choice);

      for (const itemID of itemIDs) {
        if (hooks.shouldStop()) break;
        const item = byID.get(itemID);
        if (!item) continue;
        const row = await rowFor(item);
        if (!row.attachmentID) {
          hooks.onPaper(itemID, { ok: false, message: row.why ?? "no PDF", row });
          continue;
        }
        try {
          hooks.onProgress(itemID, "Opening the PDF…");
          const run = await withReader(row.attachmentID, (reader) =>
            passFor(reader, ai, passChoice, (m) => hooks.onProgress(itemID, m)),
          );
          const missing = run.missing.length ? `, ${run.missing.length} not in the PDF` : "";
          const problems = run.problems.length ? ` (${run.problems.length} part(s) could not be read)` : "";
          hooks.onPaper(itemID, {
            ok: true,
            message: `${run.items.length} found${missing}${problems}`,
            row: await rowFor(item),
          });
        } catch (e) {
          hooks.onPaper(itemID, { ok: false, message: String((e as Error)?.message ?? e) });
        }
      }
    },
    async review(itemID) {
      const item = byID.get(itemID);
      const row = item ? await rowFor(item) : null;
      if (!row?.attachmentID) return;
      const reader = await showReader(row.attachmentID);
      // The single-paper window opens on the run just kept, ready to review and save.
      openReading(reader);
    },
    presets: listPresets,
    savePreset,
    deletePreset,
  };
}

/**
 * Opens a batch as a tab of the one Reading pass window (`host.ts`); the same collection, or the
 * same selection, brings its tab forward instead of opening a second. False when there was no
 * paper to list.
 */
function openBatch(title: string, scope: string, items: any[]): boolean {
  const regular = items.filter((i) => i?.isRegularItem?.());
  if (regular.length === 0) return false;
  showTab({
    id: `batch:${scope}`,
    kind: "batch",
    title: `Papers: ${title}`,
    controller: controllerFor(title, scope, regular),
  });
  return true;
}

/**
 * The papers of the collections selected in the library, each paper once. Zotero 11 selects
 * several collections and removed `getSelectedCollection()` (it throws); Zotero 7 has only that.
 * False when none is selected.
 */
export function forCollection(win: any): boolean {
  const pane = win.ZoteroPane;
  const collections: any[] =
    typeof pane?.getSelectedCollections === "function"
      ? pane.getSelectedCollections()
      : [pane?.getSelectedCollection?.()].filter(Boolean);
  if (collections.length === 0) return false;
  const items = new Map<number, any>();
  for (const collection of collections) {
    for (const item of collection.getChildItems(false)) items.set(item.id, item);
  }
  const scope = `collections:${collections
    .map((c) => `${c.libraryID}/${c.key}`)
    .sort()
    .join(",")}`;
  return openBatch(collections.map((c) => String(c.name)).join(", "), scope, [...items.values()]);
}

/**
 * The papers selected in the items list; an attachment or note stands for its parent. False when
 * nothing that is a paper is selected.
 */
export function forSelection(win: any): boolean {
  const selected: any[] = win.ZoteroPane?.getSelectedItems?.() ?? [];
  const items = new Map<number, any>();
  for (const item of selected) {
    const paper = item.isRegularItem?.() ? item : item.parentItem;
    if (paper?.isRegularItem?.()) items.set(paper.id, paper);
  }
  const n = items.size;
  // The same items selected again find their ticks again; a different selection starts afresh.
  const scope = `items:${[...items.values()]
    .map((i) => `${i.libraryID}/${i.key}`)
    .sort()
    .join(",")}`;
  return openBatch(`${n} selected item${n === 1 ? "" : "s"}`, scope, [...items.values()]);
}

const MENU_IDS = { collection: `${Config.slug}-reading-collection`, items: `${Config.slug}-reading-items` };

const ICON = "chrome://zenotes/content/icons/reading-pass.png";
const ICON_DARK = "chrome://zenotes/content/icons/reading-pass-dark.png";

/** The icon for the theme the window is in now: Zotero can switch between light and dark. */
const iconFor = (win: any): string =>
  win.matchMedia?.("(prefers-color-scheme: dark)")?.matches ? ICON_DARK : ICON;

/** Each popup's listener, so the icon is chosen as the menu opens and the listener can go. */
const showing: Array<{ popup: any; listener: () => void }> = [];

/**
 * Adds the two menu entries to every main window. Ze-Notes' own menus are not changed. The entry
 * says "Reading pass…" without "Ze-Notes": its icon, Ze-Notes' の, says whose it is.
 */
export function addBatchMenus(open: OpenReading): void {
  openReading = open;
  for (const win of Zotero.getMainWindows?.() ?? []) {
    const doc = (win as any).document;
    const entries: Array<[string, string, (w: any) => void]> = [
      ["zotero-collectionmenu", MENU_IDS.collection, forCollection],
      ["zotero-itemmenu", MENU_IDS.items, forSelection],
    ];
    for (const [popupID, id, command] of entries) {
      const popup = doc?.getElementById(popupID);
      if (!popup || doc.getElementById(id)) continue;
      const menuitem = createXULElement(doc, "menuitem");
      menuitem.id = id;
      menuitem.setAttribute("label", "Reading pass…");
      menuitem.className = "menuitem-iconic";
      menuitem.setAttribute("image", iconFor(win));
      menuitem.addEventListener("command", () => command(win));
      Garbage.collect(menuitem);
      popup.appendChild(menuitem);
      const listener = (): void => menuitem.setAttribute("image", iconFor(win));
      popup.addEventListener("popupshowing", listener);
      showing.push({ popup, listener });
    }
  }
}

export function removeBatchMenus(): void {
  for (const { popup, listener } of showing.splice(0)) popup.removeEventListener("popupshowing", listener);
  for (const win of Zotero.getMainWindows?.() ?? []) {
    for (const id of Object.values(MENU_IDS)) (win as any).document?.getElementById(id)?.remove();
  }
}
