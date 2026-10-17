/**
 * The matrix, in the shape Clew already reads (`clew-hub-json` v1).
 *
 * The rows come from Ze-Notes' own builder, `Data.items()` — the same call `notes.xhtml`
 * makes before rendering the table — so the bridge can never drift from what the table
 * shows. Everything here is presentation on top of that.
 *
 * Two things the builder's output cannot be used for directly:
 *
 * - Cells carry numeric ids (`noteid`, `annotationid`, `attachmentid`), not Zotero keys, so
 *   each one is looked up again to get its key and `dateModified`.
 * - A note cell's `text` has been through `Utils.toxhtml`, which escapes the HTML for
 *   display. Writing that back would double-escape the note, so the raw `getNote()` is sent
 *   as `html` instead, which is also what `PUT /cells` expects to receive.
 *
 * Untagged notes and annotations sit under a label the user can rename
 * (`untagged-column-label`). They are emitted under the key `""`, so a collection that
 * happens to have a real tag called "Untagged" still round-trips.
 */
import Data from "../Data";
import TablePrefs from "../TablePrefs";
import ZPrefs from "../ZPrefs";

/** Row fields `Data.format` always sets; everything else on a row is a tag column. */
const NATIVE_FIELDS = new Set([
  "id",
  "itemid",
  "itemtype",
  "key",
  "title",
  "date",
  "journal",
  "bookTitle",
  "publisher",
  "source",
  "zpaths",
  "NoTags",
]);

export interface MatrixCell {
  type: "note" | "annotation" | "empty";
  key: string | null;
  dateModified: string | null;
  html?: string;
  attachmentKey?: string;
  annotationType?: string;
  text?: string;
  comment?: string;
  pageLabel?: string;
  position?: unknown;
  color?: string;
}

export interface MatrixColumn {
  tag: string;
  order: number;
  hidden: boolean;
  color?: string;
}

export interface MatrixRow {
  itemKey: string | null;
  csl: unknown;
  /**
   * The metadata columns Ze-Notes shows beside the tag columns, exactly as it computed
   * them — `source` is `Format.source()`, not something a client re-derives from CSL, so a
   * full view can match the plugin rather than approximate it.
   */
  fields: Record<string, string>;
  cells: Record<string, MatrixCell[]>;
}

export interface Matrix {
  format: "clew-hub-json";
  version: 1;
  exported: string;
  collection: { key: string; name: string; libraryID: number; groupID?: number };
  columns: MatrixColumn[];
  rows: MatrixRow[];
}

function parseJson(raw: unknown, fallback: unknown): unknown {
  if (typeof raw !== "string") return raw ?? fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

/** `column-sort-key` and `hide-key` hold either plain strings or `{value}` objects. */
function toTagList(raw: unknown): string[] {
  const parsed = parseJson(raw, []);
  if (!Array.isArray(parsed)) return [];
  return parsed
    .map((entry: unknown) => {
      if (typeof entry === "string") return entry;
      if (entry && typeof entry === "object") {
        const o = entry as Record<string, unknown>;
        const v = o["value"] ?? o["tag"] ?? o["name"];
        return typeof v === "string" ? v : "";
      }
      return "";
    })
    .filter((tag): tag is string => tag !== "");
}

function cslFor(item: unknown): unknown {
  try {
    const utilities = (Zotero.Utilities as unknown as { Item?: { itemToCSLJSON(i: unknown): unknown } }).Item;
    if (utilities?.itemToCSLJSON) return utilities.itemToCSLJSON(item);
  } catch (e) {
    Zotero.log("ZeNotes bridge: itemToCSLJSON failed " + e);
  }
  return null;
}

/**
 * The metadata columns. `Data.format` stores most of them as `[{type:"native-field",text}]`
 * and a couple as plain values; both shapes are flattened to a string here.
 *
 * `id`, `itemid` and `zpaths` are deliberately left out: the first two are Zotero's internal
 * numbers, which nothing outside Zotero should key on, and the third is a list of attachment
 * objects rather than a column value.
 */
const FIELD_COLUMNS = ["source", "title", "journal", "bookTitle", "publisher", "date", "itemtype", "key"] as const;

function fieldsOf(rawRow: Record<string, any>): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const name of FIELD_COLUMNS) {
    const value = rawRow[name];
    if (Array.isArray(value)) {
      const text = value[0]?.text;
      fields[name] = text === undefined || text === null ? "" : String(text);
    } else if (typeof value === "string" || typeof value === "number") {
      fields[name] = String(value);
    } else {
      fields[name] = "";
    }
  }
  // Ze-Notes' "with tags / without tags" filter reads this, so a client can apply it too.
  fields["NoTags"] = rawRow["NoTags"] === "true" ? "true" : "";
  return fields;
}

/** One cell of the table, re-read from Zotero so it carries keys and a modification time. */
function toCell(entry: Record<string, any>): MatrixCell | null {
  if (entry?.type === "annotation") {
    const annotation: any = entry.annotationid ? Zotero.Items.get(entry.annotationid) : null;
    if (!annotation) return null;
    const attachment: any = entry.attachmentid ? Zotero.Items.get(entry.attachmentid) : null;
    return {
      type: "annotation",
      key: annotation.key ?? entry.annotationkey ?? null,
      dateModified: annotation.dateModified ?? null,
      ...(attachment ? { attachmentKey: attachment.key } : {}),
      annotationType: annotation.annotationType ?? "",
      text: annotation.annotationText ?? "",
      comment: annotation.annotationComment ?? "",
      pageLabel: annotation.annotationPageLabel ?? "",
      position: annotation.annotationPosition,
      color: annotation.annotationColor ?? "",
    };
  }

  if (entry?.type === "note") {
    const note: any = entry.noteid ? Zotero.Items.get(entry.noteid) : null;
    if (!note) return null;
    return {
      type: "note",
      key: note.key ?? null,
      dateModified: note.dateModified ?? null,
      html: note.getNote(),
    };
  }

  return null;
}

/**
 * Builds the payload for one collection.
 *
 * `Data.items()` writes to its own module-level `Data.collectionID` as a side effect; the
 * open table can be doing the same at the same moment, so nothing here reads it — the
 * collection is carried through explicitly instead.
 */
export async function buildMatrix(collection: any): Promise<Matrix> {
  const collectionID = String(collection.id);
  const untaggedLabel = String(ZPrefs.get("untagged-column-label", "") || "Untagged");

  const rawRows = await Data.items({
    collection: { id: collection.id, name: collection.name, key: collection.key },
  });

  const order = toTagList(await TablePrefs.get(collectionID, "column-sort-key", "[]"));
  const hidden = new Set(toTagList(await TablePrefs.get(collectionID, "hide-key", "[]")));
  const colours = parseJson(await TablePrefs.get(collectionID, "column-bgcolor", "{}"), {}) as Record<string, string>;

  const seen = new Set<string>();
  const rows: MatrixRow[] = [];

  for (const rawRow of rawRows as unknown as Array<Record<string, any>>) {
    const itemKey: string | null = rawRow["key"]?.[0]?.text ?? null;
    const item = itemKey ? Zotero.Items.get(rawRow["itemid"]?.[0]?.text) : null;

    const cells: Record<string, MatrixCell[]> = {};
    for (const field of Object.keys(rawRow)) {
      if (NATIVE_FIELDS.has(field)) continue;
      const entries = rawRow[field];
      if (!Array.isArray(entries)) continue;

      const tag = field === untaggedLabel ? "" : field;
      seen.add(tag);
      const built = entries
        .map((entry: Record<string, any>) => toCell(entry))
        .filter((cell): cell is MatrixCell => cell !== null);
      if (built.length === 0) continue;
      cells[tag] = (cells[tag] ?? []).concat(built);
    }

    rows.push({ itemKey, csl: item ? cslFor(item) : null, fields: fieldsOf(rawRow), cells });
  }

  // Ze-Notes' saved order first, then anything it has not seen, alphabetically.
  const ordered = order.map((tag) => (tag === untaggedLabel ? "" : tag)).filter((tag) => seen.has(tag));
  const rest = [...seen].filter((tag) => !ordered.includes(tag)).sort();
  const columns: MatrixColumn[] = [...ordered, ...rest].map((tag, index) => {
    const label = tag === "" ? untaggedLabel : tag;
    const colour = colours[label];
    return {
      tag,
      order: index,
      hidden: hidden.has(label),
      ...(typeof colour === "string" && colour ? { color: colour } : {}),
    };
  });

  const library: any = Zotero.Libraries.get(collection.libraryID);
  return {
    format: "clew-hub-json",
    version: 1,
    exported: new Date().toISOString(),
    collection: {
      key: collection.key,
      name: collection.name,
      libraryID: collection.libraryID,
      ...(library?.isGroup && library?.groupID ? { groupID: library.groupID } : {}),
    },
    columns,
    rows,
  };
}
