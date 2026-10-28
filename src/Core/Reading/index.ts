/**
 * The reading pass — AI zone (see `../Extensions.ts`).
 *
 * In Zotero's reader, right-click a page and choose Ze-Notes › Reading pass…. A window, branded
 * Ze-Notes, asks which AI, which
 * columns and what to look for; the AI reads the open PDF and proposes quotes; each is looked for
 * word for word on the page (`locate.ts`), and one that is not there is listed apart and never
 * saved, so an invented quotation never becomes a highlight. The person reviews the rest, changes
 * a column or a comment, and saves what they accept: real Zotero highlights, made by
 * `../Annotate/`, the code the bridge route uses too.
 *
 * Registered on Zotero's own reader event, so the original reader menu (`ReaderMenu.ts`) is not
 * touched. The window is `app/chrome/content/xhtml/reading/`; it talks to this file through the
 * controller passed to it.
 */
import Config from "../../Config";
import { createAnnotations, deleteAnnotation, editAnnotation } from "../Annotate";
import type { EditResult, SlotResult } from "../Annotate";
import { readingAis } from "./ai";
import type { NotUsable, ReadingAi } from "./ai";
import Garbage from "../Garbage";
import MainMenu from "../../Ui/MainMenu";
import { createXULElement } from "../../globals";
import { addBatchMenus, forCollection, forSelection, removeBatchMenus } from "./batch";
import { defaultChoice, layout, passChoiceOf, rememberChoice, setWindowMode, windowMode } from "./choice";
import { closeHost, showTab } from "./host";
import type { FormChoice, WindowMode } from "./choice";
import { passFor } from "./pass";
import { COLOURS, newKey, toAnnotation } from "./propose";
import { deletePreset, listPresets, savePreset } from "./presets";
import type { Preset } from "./presets";
import { isSaved, loadRuns, removeRun, updateRun } from "./store";
import type { KeptRun } from "./store";
import { isPdfReader } from "./text";

/** A pass as the list shows it. */
export interface PassSummary {
  id: string;
  date: string;
  ai: string;
  columns: string[];
  instruction: string;
  found: number;
  saved: number;
}

/** A pass opened: everything kept, and which of its proposals are in Zotero now. */
export type OpenPass = KeptRun & { saved: boolean[] };

/** What the review window can ask of the reading pass. */
export interface ReadingController {
  title: string;
  defaults: FormChoice;
  /** How this window opens next time, and setting it. */
  windowMode: WindowMode;
  setWindowMode(mode: WindowMode): void;
  /** Which folds were open, kept between openings. */
  layout: typeof layout;
  /** The AIs that can be used, with what each runs, and the ones that cannot, with why. */
  providers(): Promise<{
    usable: Array<{ id: string; label: string; detail: string }>;
    notUsable: NotUsable[];
  }>;
  /** Ze-Notes' settings, where an API key, a model or a Custom AI is set. */
  openSettings(): void;
  /** This PDF's passes, newest first. */
  passes(): Promise<PassSummary[]>;
  /** One pass, ready to review, save, edit or delete from. */
  openPass(id: string): Promise<OpenPass | null>;
  /** Asks the AI, adds the pass, and opens it (nothing is saved yet). */
  run(choice: FormChoice, onProgress: (message: string) => void): Promise<OpenPass>;
  /**
   * Forgets a pass. Its highlights saved in Zotero stay unless `withHighlights`, which deletes
   * them from the PDF too; the count of those deleted is returned.
   */
  deletePass(id: string, withHighlights: boolean): Promise<number>;
  /** Edits to proposals not in Zotero: a column, a comment, a tick. Saved ones change through `edit`. */
  remember(id: string, edits: Array<{ column: string; comment: string; checked: boolean }>): Promise<void>;
  colourOf(column: string): string;
  /** Saves proposals of the open pass as highlights, by their place in it. */
  save(id: string, chosen: Array<{ index: number; column: string; comment: string }>): Promise<SlotResult[]>;
  /** Changes a saved highlight's column and comment in Zotero. */
  edit(id: string, index: number, change: { column: string; comment: string }): Promise<EditResult>;
  /**
   * Deletes saved highlights from the PDF, by their place in the pass, one result each; the
   * proposals stay, to be added again.
   */
  remove(id: string, indexes: number[]): Promise<EditResult[]>;
  /** Scrolls the PDF to a proposal: its highlight when saved, else its place on the page. */
  goTo(id: string, index: number): Promise<void>;
  /** The saved settings, any PDF's to use. */
  presets(): Promise<Preset[]>;
  savePreset(preset: Omit<Preset, "saved">): Promise<Preset>;
  deletePreset(name: string): Promise<void>;
}

function controllerFor(reader: any): ReadingController {
  const attachment = reader._item;
  const libraryID: number = attachment.libraryID;
  const parent = attachment?.parentItem;
  let ais: ReadingAi[] = [];
  /** The pass on screen, as last kept. */
  let current: KeptRun | null = null;

  const colourOf = (column: string): string => {
    const columns = current?.columns ?? [];
    const at = columns.indexOf(column);
    return COLOURS[(at < 0 ? columns.length : at) % COLOURS.length]!;
  };

  const opened = (run: KeptRun): OpenPass => ({
    ...run,
    saved: run.items.map((item) => isSaved(libraryID, item.found)),
  });

  /** The pass `id`, the one on screen when it is that one, else read from the store. */
  async function passById(id: string): Promise<KeptRun | null> {
    if (current?.id === id) return current;
    const runs = await loadRuns(libraryID, attachment.key);
    return runs.find((r) => r.id === id) ?? null;
  }

  async function keep(run: KeptRun): Promise<void> {
    current = run;
    await updateRun(libraryID, attachment.key, run);
  }

  return {
    title: String(parent?.getField?.("title") || attachment?.getField?.("title") || "PDF"),
    defaults: defaultChoice(),
    windowMode: windowMode(),
    setWindowMode,
    layout,
    async providers() {
      const found = await readingAis();
      ais = found.usable;
      return {
        usable: found.usable.map(({ id, label, detail }) => ({ id, label, detail })),
        notUsable: found.notUsable,
      };
    },
    openSettings() {
      (Zotero.Utilities as any).Internal.openPreferences(Config.id);
    },
    async passes() {
      const runs = await loadRuns(libraryID, attachment.key);
      return runs
        .map((run) => ({
          id: run.id,
          date: run.date,
          ai: run.ai,
          columns: run.columns,
          instruction: run.instruction,
          found: run.items.length,
          saved: run.items.filter((item) => isSaved(libraryID, item.found)).length,
        }))
        .reverse();
    },
    async openPass(id) {
      const run = await passById(id);
      if (!run) return null;
      current = run;
      return opened(run);
    },
    async run(choice, onProgress) {
      const ai = ais.find((a) => a.id === choice.provider);
      if (!ai) throw new Error("Choose an AI first.");
      rememberChoice(choice);
      // Added by `passFor` before anything is shown, so even a window closed at once loses nothing.
      current = await passFor(reader, ai, passChoiceOf(choice), onProgress);
      return opened(current);
    },
    async deletePass(id, withHighlights) {
      const run = await passById(id);
      if (!run) return 0;
      let deleted = 0;
      if (withHighlights) {
        for (const item of run.items) {
          if (!isSaved(libraryID, item.found)) continue;
          if ((await deleteAnnotation(libraryID, attachment.key, item.found.key)).ok) deleted += 1;
        }
      }
      await removeRun(libraryID, attachment.key, id);
      if (current?.id === id) current = null;
      return deleted;
    },
    async remember(id, edits) {
      const run = await passById(id);
      if (!run || edits.length !== run.items.length) return;
      await keep({
        ...run,
        // A saved highlight's column and comment are what Zotero holds; they change through
        // `edit`, so the pass never says one thing while Zotero says another.
        items: run.items.map((item, i) =>
          isSaved(libraryID, item.found) ? item : { ...item, ...edits[i]! },
        ),
      });
    },
    colourOf,
    async save(id, chosen) {
      const run = await passById(id);
      if (!run) return chosen.map(() => ({ error: "no_pass", message: "That pass is not there any more." }));
      const items = run.items.map((item) => ({ ...item, found: { ...item.found } }));
      const proposals = chosen.map(({ index, column, comment }) => {
        const item = items[index]!;
        // A key Zotero has seen is not used again: a highlight deleted since gets a new one.
        if (item.savedOnce && !isSaved(libraryID, item.found)) item.found.key = newKey();
        return toAnnotation({ ...item.found, column, comment }, attachment.key, colourOf(column));
      });
      const results = await createAnnotations(libraryID, proposals);
      results.forEach((result, i) => {
        if (!("key" in result)) return;
        const { index, column, comment } = chosen[i]!;
        items[index] = { ...items[index]!, column, comment, savedOnce: true, checked: true };
      });
      await keep({ ...run, items });
      return results;
    },
    async edit(id, index, change) {
      const run = await passById(id);
      const item = run?.items[index];
      if (!run || !item || !isSaved(libraryID, item.found)) {
        return { ok: false, error: "not_found", message: "That highlight is not in Zotero." };
      }
      const result = await editAnnotation(libraryID, attachment.key, item.found.key, {
        comment: change.comment,
        color: colourOf(change.column),
        fromTag: item.column,
        toTag: change.column,
      });
      if (result.ok) {
        await keep({
          ...run,
          items: run.items.map((it, i) => (i === index ? { ...it, column: change.column, comment: change.comment } : it)),
        });
      }
      return result;
    },
    async remove(id, indexes) {
      const run = await passById(id);
      const gone: EditResult = { ok: false, error: "not_found", message: "That proposal is not there any more." };
      if (!run) return indexes.map(() => gone);
      const items = [...run.items];
      const results: EditResult[] = [];
      for (const index of indexes) {
        const item = items[index];
        const result = item ? await deleteAnnotation(libraryID, attachment.key, item.found.key) : gone;
        // A new key at once, so adding it again never reuses the one Zotero deleted.
        if (item && result.ok) {
          items[index] = { ...item, savedOnce: true, checked: false, found: { ...item.found, key: newKey() } };
        }
        results.push(result);
      }
      // Kept once, after all of them, with every one that was deleted marked so.
      await keep({ ...run, items });
      return results;
    },
    async goTo(id, index) {
      const run = await passById(id);
      const item = run?.items[index];
      if (!item) return;
      // A saved highlight is found by its key, as Zotero's own "Show annotation" does; one not
      // saved has no key in Zotero, so the reader is taken to its place on the page instead.
      const location = isSaved(libraryID, item.found)
        ? { annotationID: item.found.key }
        : { position: { pageIndex: item.found.located.pageIndex, rects: item.found.located.rects } };
      // `open` brings the PDF's tab forward (opening it again if it was closed) and goes there.
      await Zotero.Reader.open(attachment.id, location as any);
      // A window on its own would be left behind Zotero; one kept in front stays in sight anyway.
      if (windowMode() === "normal") Zotero.getMainWindow().focus();
    },
    presets: listPresets,
    savePreset,
    deletePreset,
  };
}

/** "Blokker et al. (2023)": what a PDF's tab says. */
function tabTitleOf(reader: any): string {
  const item = reader._item?.parentItem ?? reader._item;
  const creator = String(item?.firstCreator || "").trim();
  const year = String(item?.getField?.("date", true, true) || "").slice(0, 4);
  return [creator, year && `(${year})`].filter(Boolean).join(" ") || String(item?.getDisplayTitle?.() || "PDF");
}

/**
 * Opens a PDF's reading pass as a tab of the one Reading pass window (`host.ts`); the tab is
 * brought forward when it is open already. Selecting it brings the PDF up in Zotero.
 */
function open(reader: any): void {
  const attachment = reader._item;
  showTab({
    id: `pdf:${attachment.libraryID}/${attachment.key}`,
    kind: "pdf",
    title: tabTitleOf(reader),
    controller: controllerFor(reader),
    onSelect: () => {
      void Zotero.Reader.open(attachment.id);
    },
  });
}

/**
 * Tools › Ze Notes › Reading pass…: on what is in front. The PDF of the reader tab on screen; else
 * the collections selected in the library; else the items selected there.
 */
function openFromContext(win: any): void {
  const tabs = win.Zotero_Tabs;
  if (tabs?.selectedType === "reader") {
    const reader = Zotero.Reader.getByTabID(tabs.selectedID);
    if (reader && isPdfReader(reader)) {
      open(reader);
      return;
    }
  }
  if (forCollection(win) || forSelection(win)) return;
  win.alert("Open a PDF, or select a collection or some items, then choose Reading pass again.");
}

const TOOLS_ID = `${Config.slug}-reading-tools`;

/** Adds "Reading pass…" to Tools › Ze Notes, through Ze-Notes' own menu helper, unchanged. */
function addToolsMenu(): void {
  for (const win of Zotero.getMainWindows?.() ?? []) {
    const doc = (win as any).document;
    if (!doc || doc.getElementById(TOOLS_ID)) continue;
    const popup = MainMenu.getmenupopup(doc);
    const menuitem = createXULElement(doc, "menuitem");
    menuitem.id = TOOLS_ID;
    menuitem.setAttribute("label", "Reading pass…");
    menuitem.className = "menuitem-iconic";
    menuitem.setAttribute("image", "chrome://zenotes/content/icons/reading-pass.png");
    menuitem.addEventListener("command", () => openFromContext(win));
    Garbage.collect(menuitem);
    popup.appendChild(menuitem);
  }
}

function removeToolsMenu(): void {
  for (const win of Zotero.getMainWindows?.() ?? []) (win as any).document?.getElementById(TOOLS_ID)?.remove();
}

/** Adds "Reading pass…" to the menu of a page in a PDF reader. */
function onViewMenu(event: any): void {
  const { reader, append } = event;
  if (!isPdfReader(reader)) return;
  // A "Ze-Notes" submenu: the reader's menu takes no icons (an item's only image is a colour
  // swatch), but an item with `groups` becomes a submenu, so whose entry it is is said once.
  // `disabled: false` must be said: Zotero 11's reader builds an item with
  // `toggleAttribute("disabled", item.disabled)`, and an undefined `disabled` toggles it on.
  append({
    label: "Ze-Notes",
    groups: [[{ label: "Reading pass…", disabled: false, onCommand: () => open(reader) }]],
  });
}

const Reading = {
  init(): void {
    Zotero.Reader.registerEventListener("createViewContextMenu", onViewMenu as any);
    addBatchMenus(open);
    addToolsMenu();
  },

  async stop(): Promise<void> {
    Zotero.Reader.unregisterEventListener("createViewContextMenu", onViewMenu as any);
    removeBatchMenus();
    removeToolsMenu();
    closeHost();
  },
};

export default Reading;
