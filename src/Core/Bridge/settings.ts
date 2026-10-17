/**
 * The Ze-Notes display settings for one collection, read and written the way the table
 * itself reads and writes them — the same `TablePrefs` rows, so hiding a column here hides
 * it in the plugin and the other way round. There is one set of settings, not two.
 *
 * Two translations happen here so a browser client never has to know Zotero's internals:
 *
 * - **Hidden rows are stored as numeric item ids** (`Visibility.hiderow` pushes
 *   `celldata.itemid`, and `Table.tsx` compares with `String(r.itemid)`), while everything
 *   else in the bridge speaks item *keys*. Ids are translated to keys on the way out and
 *   back to ids on the way in. Old rows can hold numbers or strings, so both are accepted.
 * - **The untagged column is stored under its display label** (`untagged-column-label`,
 *   "Untagged" by default), which the user can rename. It is `""` everywhere in the bridge,
 *   matching the matrix. Since API 5 that includes the two colour maps, which until then
 *   went out keyed by the label while everything beside them was already keyed `""`; a
 *   client that still sends the label on a write is understood, so nothing older breaks.
 *
 * Column widths are a third row family, and not `TablePrefs` at all: `TableHooks.tsx` and
 * `ColumnResizer.tsx` read and write them in the plain `Prefs` table, under
 * `column-width/<collectionid>/<label>`, plus one global `column-width/<collectionid>/-all-
 * columns-` (`Visibility.resetwidths` clears them the same way). `Prefs.search()` is a loose
 * `LIKE %…%`, so a collection id that is a substring of another one's (`1` inside `12`) would
 * leak its rows in — every read below re-filters with `startsWith` on the full `/`-terminated
 * prefix, which a substring match cannot satisfy once the id itself differs.
 *
 * `rev` is a hash of the stored values, including the width rows. A client may send it back
 * as `ifRev` to be told (409) rather than silently overwrite a change made in Ze-Notes since
 * it last read.
 */
import Crypto from "../Crypto";
import Prefs from "../Prefs";
import TablePrefs from "../TablePrefs";
import ZPrefs from "../ZPrefs";

/** Every `tableoptions` key the display uses. Nothing else is read or written. */
const KEYS = [
  "hide-key",
  "row-hide-key",
  "column-sort-key",
  "table-sort-key",
  "column-bgcolor",
  "column-fgcolor",
  "data-filter",
] as const;

type Key = (typeof KEYS)[number];

export type DataFilter = "all" | "withTags" | "withoutTags";

export interface DisplaySettings {
  /** Tags; `""` is the untagged column. */
  hiddenColumns: string[];
  /** Item keys. */
  hiddenRows: string[];
  /** Tags, in the order the table shows them. */
  columnOrder: string[];
  sort: Array<{ field: string; reversed: boolean }>;
  /** Keyed like `hiddenColumns` (`""` is the untagged column). Since API 5; see `toTagMap`. */
  columnColors: Record<string, string>;
  columnTextColors: Record<string, string>;
  filter: DataFilter;
  /** CSS pixels, keyed like `columnColors` (`""` is the untagged column). Since API 4. */
  columnWidths: Record<string, number>;
  /** The `-all-columns-` global width, or `null` when unset. Since API 4. */
  allColumnsWidth: number | null;
}

export interface SettingsReply {
  collection: { key: string; id: number; name: string; libraryID: number };
  untaggedLabel: string;
  rev: string;
  display: DisplaySettings;
  /** Exactly what is stored, for anyone who needs to see through the translation. */
  raw: Record<string, unknown>;
}

function parseJson(raw: unknown, fallback: unknown): unknown {
  if (typeof raw !== "string") return raw ?? fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function asStrings(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => {
      if (typeof entry === "string") return entry;
      if (typeof entry === "number") return String(entry);
      if (entry && typeof entry === "object") {
        const v = (entry as Record<string, unknown>)["value"];
        return typeof v === "string" ? v : "";
      }
      return "";
    })
    .filter((s) => s !== "");
}

function asRecord(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (typeof v === "string" && v) out[k] = v;
  }
  return out;
}

const FILTERS: Record<string, DataFilter> = {
  all: "all",
  withtags: "withTags",
  withouttags: "withoutTags",
};
const STORED_FILTER: Record<DataFilter, string> = {
  all: "all",
  withTags: "withtags",
  withoutTags: "withouttags",
};

/** Stored label → bridge tag (`""` for untagged), and back. */
const toTag = (label: string, untagged: string): string => (label === untagged ? "" : label);
const toLabel = (tag: string, untagged: string): string => (tag === "" ? untagged : tag);

/**
 * A map keyed by stored column labels, re-keyed the way the rest of the contract is keyed:
 * the untagged column becomes `""`. Since API 5 the two colour maps go through this, so a
 * client never has to know the label to find the untagged column's colour — and renaming
 * the label in Ze-Notes no longer moves the key under the client's feet.
 */
function toTagMap(map: Record<string, string>, untagged: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [label, value] of Object.entries(map)) out[toTag(label, untagged)] = value;
  return out;
}

/**
 * The way back, for a write. Both keyings are accepted, because a client written against
 * API 4 or earlier still sends the untagged column under the label it read: whichever of
 * the two it used lands on the same stored row, which is the one Ze-Notes' own table reads.
 * Should a map somehow carry both, the canonical `""` wins — it is the one this bridge
 * handed out, so it is the one the client was editing.
 */
function toLabelMap(map: Record<string, string>, untagged: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [tag, value] of Object.entries(map)) {
    if (tag !== "") out[toLabel(tag, untagged)] = value;
  }
  const canonical = map[""];
  if (canonical !== undefined) out[untagged] = canonical;
  return out;
}

function keyForItemId(id: string): string | null {
  const numeric = Number(id);
  if (!Number.isFinite(numeric)) return null;
  try {
    const item = Zotero.Items.get(numeric);
    return item?.key ?? null;
  } catch {
    return null;
  }
}

function itemIdForKey(libraryID: number, key: string): number | null {
  try {
    const item: any = Zotero.Items.getByLibraryAndKey(libraryID, key);
    return item ? item.id : null;
  } catch {
    return null;
  }
}

async function readRaw(collectionID: string): Promise<Record<Key, unknown>> {
  const raw = {} as Record<Key, unknown>;
  for (const key of KEYS) {
    raw[key] = await TablePrefs.get(collectionID, key, null);
  }
  return raw;
}

/** The literal segment `TableHooks.tsx`/`ColumnResizer.tsx` use for the global width. */
const ALL_COLUMNS = "-all-columns-";

function widthPrefix(collectionID: string): string {
  return `column-width/${collectionID}/`;
}

/**
 * Every `column-width/<collectionID>/…` row, keyed by the segment after the prefix (a
 * stored column label, or `-all-columns-`). `Prefs.search()` matches loosely, so rows are
 * kept only when the key truly starts with this collection's `/`-terminated prefix *and*
 * holds exactly one more path segment — otherwise a collection whose id is a substring of
 * this one's (or vice versa) could leak a row in, or a key with a stray extra segment could
 * be misread as a label.
 */
async function readWidthsRaw(collectionID: string): Promise<Record<string, string>> {
  const prefix = widthPrefix(collectionID);
  const found = await Prefs.search(prefix);
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(found)) {
    if (!key.startsWith(prefix)) continue;
    const rest = key.slice(prefix.length);
    if (rest === "" || rest.includes("/")) continue;
    out[rest] = String(value);
  }
  return out;
}

/** Turns the raw width rows into the wire shape, dropping anything not a positive number. */
function widthsFromRaw(
  widthsRaw: Record<string, string>,
  untagged: string,
): { columnWidths: Record<string, number>; allColumnsWidth: number | null } {
  const columnWidths: Record<string, number> = {};
  let allColumnsWidth: number | null = null;
  for (const [rest, value] of Object.entries(widthsRaw)) {
    const n = Number(value);
    if (!Number.isFinite(n) || n <= 0) continue;
    if (rest === ALL_COLUMNS) {
      allColumnsWidth = n;
    } else {
      columnWidths[toTag(rest, untagged)] = n;
    }
  }
  return { columnWidths, allColumnsWidth };
}

/**
 * `rev` folds in the width rows too — otherwise two clients could clobber each other's
 * widths without `ifRev` ever noticing. The width keys are sorted before hashing so the
 * result does not depend on the order `Prefs.search()` (SQLite) happens to return rows in,
 * and a collection with no width rows at all hashes to exactly what it did before widths
 * existed, so `rev` does not change for settings nobody has resized yet.
 */
function revisionOf(raw: Record<string, unknown>, widthsRaw: Record<string, string>): string {
  const base = KEYS.map((k) => `${k}=${String(raw[k] ?? "")}`).join("\n");
  const widthKeys = Object.keys(widthsRaw).sort();
  if (widthKeys.length === 0) return Crypto.SHA256(base).slice(0, 16);
  const widths = widthKeys.map((k) => `column-width/${k}=${widthsRaw[k]}`).join("\n");
  return Crypto.SHA256(`${base}\n${widths}`).slice(0, 16);
}

export async function readSettings(collection: any): Promise<SettingsReply> {
  const collectionID = String(collection.id);
  const untagged = String(ZPrefs.get("untagged-column-label", "") || "Untagged");
  const raw = await readRaw(collectionID);
  const widthsRaw = await readWidthsRaw(collectionID);
  const { columnWidths, allColumnsWidth } = widthsFromRaw(widthsRaw, untagged);

  const sortRaw = parseJson(raw["table-sort-key"], []);
  const sort = Array.isArray(sortRaw)
    ? sortRaw
        .map((entry) => {
          const e = (entry ?? {}) as Record<string, unknown>;
          const field = typeof e["value"] === "string" ? e["value"] : "";
          return field ? { field, reversed: e["reversed"] === true } : null;
        })
        .filter((s): s is { field: string; reversed: boolean } => s !== null)
    : [];

  const hiddenRows: string[] = [];
  for (const id of asStrings(parseJson(raw["row-hide-key"], []))) {
    const key = keyForItemId(id);
    // An item that has since been deleted simply stops being hidden; the stored id is left
    // alone, so undoing the deletion in Zotero restores the setting too.
    if (key) hiddenRows.push(key);
  }

  const storedFilter = String(raw["data-filter"] ?? "all").toLowerCase();

  return {
    collection: {
      key: collection.key,
      id: collection.id,
      name: collection.name,
      libraryID: collection.libraryID,
    },
    untaggedLabel: untagged,
    rev: revisionOf(raw as Record<string, unknown>, widthsRaw),
    display: {
      hiddenColumns: asStrings(parseJson(raw["hide-key"], [])).map((l) => toTag(l, untagged)),
      hiddenRows,
      columnOrder: asStrings(parseJson(raw["column-sort-key"], [])).map((l) => toTag(l, untagged)),
      sort,
      columnColors: toTagMap(asRecord(parseJson(raw["column-bgcolor"], {})), untagged),
      columnTextColors: toTagMap(asRecord(parseJson(raw["column-fgcolor"], {})), untagged),
      filter: FILTERS[storedFilter] ?? "all",
      columnWidths,
      allColumnsWidth,
    },
    raw: { ...raw, "column-width": widthsRaw } as Record<string, unknown>,
  };
}

export class RevisionMismatch extends Error {
  readonly current: SettingsReply;
  constructor(current: SettingsReply) {
    super("settings changed since that revision");
    this.name = "RevisionMismatch";
    this.current = current;
  }
}

/**
 * Applies a partial display change. Only the fields present are touched, so a client can
 * hide one column without sending everything else back.
 */
export async function writeSettings(
  collection: any,
  patch: Partial<DisplaySettings>,
  ifRev?: string,
): Promise<SettingsReply> {
  const collectionID = String(collection.id);
  const untagged = String(ZPrefs.get("untagged-column-label", "") || "Untagged");

  const before = await readSettings(collection);
  if (ifRev && ifRev !== before.rev) throw new RevisionMismatch(before);

  const set = async (key: Key, value: unknown): Promise<void> => {
    await TablePrefs.set(collectionID, key, typeof value === "string" ? value : JSON.stringify(value));
  };

  if (patch.hiddenColumns) {
    await set("hide-key", [...new Set(patch.hiddenColumns.map((t) => toLabel(t, untagged)))]);
  }

  if (patch.hiddenRows) {
    const ids: number[] = [];
    for (const key of patch.hiddenRows) {
      const id = itemIdForKey(collection.libraryID, key);
      if (id !== null) ids.push(id);
    }
    // Stored as strings: Table.tsx compares with String(r.itemid), and older rows written by
    // the plugin's own menu are strings too.
    await set("row-hide-key", [...new Set(ids.map(String))]);
  }

  if (patch.columnOrder) {
    await set(
      "column-sort-key",
      patch.columnOrder.map((t) => toLabel(t, untagged)),
    );
  }

  if (patch.sort) {
    await set(
      "table-sort-key",
      patch.sort.map((s) => ({ value: s.field, reversed: s.reversed === true })),
    );
  }

  // Stored under the display label, because that is the key Ze-Notes' own table looks a
  // colour up by (`Table.tsx` reads `column-bgcolor[column]`, and its columns are labels).
  // The translation is what keeps the wire canonical without changing a stored row's shape.
  if (patch.columnColors) await set("column-bgcolor", toLabelMap(patch.columnColors, untagged));
  if (patch.columnTextColors) {
    await set("column-fgcolor", toLabelMap(patch.columnTextColors, untagged));
  }
  if (patch.filter) await set("data-filter", STORED_FILTER[patch.filter] ?? "all");

  if (patch.columnWidths) {
    if (Object.keys(patch.columnWidths).length === 0) {
      // `columnWidths: {}` means "reset every per-column width". Remove exactly the rows
      // this collection owns, by the keys just read — never `Prefs.deleteRecords()`, whose
      // loose `LIKE` and ">=2 slashes" rule are the wrong tool for a collection-scoped clear.
      for (const rest of Object.keys(await readWidthsRaw(collectionID))) {
        if (rest === ALL_COLUMNS) continue;
        await Prefs.remove(widthPrefix(collectionID) + rest);
      }
    } else {
      for (const [tag, value] of Object.entries(patch.columnWidths)) {
        const key = widthPrefix(collectionID) + toLabel(tag, untagged);
        if (Number.isFinite(value) && value > 0) {
          await Prefs.set(key, String(value));
        } else {
          // Zero, negative or non-finite removes the row rather than storing junk.
          await Prefs.remove(key);
        }
      }
    }
  }

  if (patch.allColumnsWidth !== undefined) {
    const key = widthPrefix(collectionID) + ALL_COLUMNS;
    if (patch.allColumnsWidth === null || !Number.isFinite(patch.allColumnsWidth) || patch.allColumnsWidth <= 0) {
      await Prefs.remove(key);
    } else {
      await Prefs.set(key, String(patch.allColumnsWidth));
    }
  }

  return await readSettings(collection);
}

/** Reads a display patch out of a request body, ignoring anything it does not own. */
export function patchFrom(body: unknown): Partial<DisplaySettings> {
  const b = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const source = (b["display"] && typeof b["display"] === "object" ? b["display"] : b) as Record<string, unknown>;
  const patch: Partial<DisplaySettings> = {};

  const strings = (v: unknown): string[] | null =>
    Array.isArray(v) && v.every((x) => typeof x === "string") ? (v as string[]) : null;

  const hiddenColumns = strings(source["hiddenColumns"]);
  if (hiddenColumns) patch.hiddenColumns = hiddenColumns;
  const hiddenRows = strings(source["hiddenRows"]);
  if (hiddenRows) patch.hiddenRows = hiddenRows;
  const columnOrder = strings(source["columnOrder"]);
  if (columnOrder) patch.columnOrder = columnOrder;

  if (Array.isArray(source["sort"])) {
    patch.sort = source["sort"]
      .map((entry) => {
        const e = (entry ?? {}) as Record<string, unknown>;
        return typeof e["field"] === "string" && e["field"]
          ? { field: e["field"], reversed: e["reversed"] === true }
          : null;
      })
      .filter((s): s is { field: string; reversed: boolean } => s !== null);
  }

  if (source["columnColors"]) patch.columnColors = asRecord(source["columnColors"]);
  if (source["columnTextColors"]) patch.columnTextColors = asRecord(source["columnTextColors"]);

  const filter = source["filter"];
  if (filter === "all" || filter === "withTags" || filter === "withoutTags") patch.filter = filter;

  // Numbers only, strictly — a string like "300" is rejected rather than coerced, so a
  // client cannot smuggle something odd into a pref value through JSON's looseness.
  const columnWidths = source["columnWidths"];
  if (columnWidths && typeof columnWidths === "object" && !Array.isArray(columnWidths)) {
    const entries = Object.entries(columnWidths as Record<string, unknown>);
    if (entries.every(([, v]) => typeof v === "number")) {
      patch.columnWidths = Object.fromEntries(entries) as Record<string, number>;
    }
  }

  const allColumnsWidth = source["allColumnsWidth"];
  if (allColumnsWidth === null) {
    patch.allColumnsWidth = null;
  } else if (typeof allColumnsWidth === "number") {
    patch.allColumnsWidth = allColumnsWidth;
  }

  return patch;
}
