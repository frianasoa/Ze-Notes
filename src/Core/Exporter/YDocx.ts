import { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun } from "docx";
import JSZip from "jszip";
import Html2Docx from "./Html2Docx";
import Format from "../Format";

const ILLEGAL_FILENAME_CHARS = /[\\/:*?"<>|\x00-\x1f]/g;
const CONTENT_TYPES = "[Content_Types].xml";
const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

type MetadataField = {
  label: string;
  settingkey: string;
  /** Used whenever the export dialog hasn't persisted this key yet (e.g. an older saved settings blob) */
  default: "true" | "false";
  getvalue: (item: _ZoteroTypes.Items) => string;
};

/** Order the metadata table's rows follow when their toggle is enabled in export settings */
const METADATA_FIELDS: MetadataField[] = [
  { label: "Author", settingkey: "ydocxmetaauthor", default: "true", getvalue: (item) => Format.author(item) },
  { label: "Year", settingkey: "ydocxmetayear", default: "true", getvalue: (item) => Format.date(item) },
  { label: "Title", settingkey: "ydocxmetatitle", default: "true", getvalue: (item) => YDocx.fieldvalue(item, "title") },
  {
    label: "Publisher",
    settingkey: "ydocxmetapublisher",
    default: "true",
    getvalue: (item) => YDocx.fieldvalue(item, "publisher"),
  },
  {
    label: "Journal / Publication",
    settingkey: "ydocxmetajournal",
    default: "false",
    getvalue: (item) => YDocx.fieldvalue(item, "publicationTitle"),
  },
  {
    label: "Book Title",
    settingkey: "ydocxmetabooktitle",
    default: "false",
    getvalue: (item) => YDocx.fieldvalue(item, "bookTitle"),
  },
  {
    label: "Item Type",
    settingkey: "ydocxmetaitemtype",
    default: "false",
    getvalue: (item) => Zotero.ItemTypes.getName(item.itemTypeID),
  },
  { label: "DOI", settingkey: "ydocxmetadoi", default: "false", getvalue: (item) => YDocx.fieldvalue(item, "DOI") },
  { label: "ISBN", settingkey: "ydocxmetaisbn", default: "false", getvalue: (item) => YDocx.fieldvalue(item, "ISBN") },
  { label: "URL", settingkey: "ydocxmetaurl", default: "false", getvalue: (item) => YDocx.fieldvalue(item, "url") },
  {
    label: "Volume",
    settingkey: "ydocxmetavolume",
    default: "false",
    getvalue: (item) => YDocx.fieldvalue(item, "volume"),
  },
  {
    label: "Issue",
    settingkey: "ydocxmetaissue",
    default: "false",
    getvalue: (item) => YDocx.fieldvalue(item, "issue"),
  },
  {
    label: "Pages",
    settingkey: "ydocxmetapages",
    default: "false",
    getvalue: (item) => YDocx.fieldvalue(item, "pages"),
  },
  {
    label: "Abstract",
    settingkey: "ydocxmetaabstract",
    default: "false",
    getvalue: (item) => YDocx.fieldvalue(item, "abstractNote"),
  },
  {
    label: "Date Added",
    settingkey: "ydocxmetadateadded",
    default: "false",
    getvalue: (item) => item.dateAdded || "",
  },
  {
    label: "Tags",
    settingkey: "ydocxmetatags",
    default: "false",
    getvalue: (item) =>
      (item.getTags() || [])
        .map((t: any) => t.tag)
        .filter(Boolean)
        .join(", "),
  },
];

const YDocx = {
  isRowHidden(row: HTMLTableRowElement): boolean {
    const style = window.getComputedStyle(row)!;
    return (
      style.display === "none" ||
      style.visibility === "hidden" ||
      row.style.display === "none" ||
      row.style.visibility === "hidden"
    );
  },

  sanitizeFilename(name: string): string {
    const cleaned = name.replace(ILLEGAL_FILENAME_CHARS, "").trim();
    return cleaned || "Untitled";
  },

  /** a, b, ..., z, aa, ab, ... (spreadsheet-column style, for >26 clashes) */
  lettersuffix(index: number): string {
    let n = index;
    let letters = "";
    do {
      letters = String.fromCharCode(97 + (n % 26)) + letters;
      n = Math.floor(n / 26) - 1;
    } while (n >= 0);
    return letters;
  },

  /** Inserts a disambiguation letter before the name's closing "(Year)" paren, e.g. "Smith (2024)" -> "Smith (2024a)" */
  insertsuffix(name: string, suffix: string): string {
    const idx = name.lastIndexOf(")");
    if (idx !== -1) {
      return name.slice(0, idx) + suffix + name.slice(idx);
    }
    return name + suffix;
  },

  /** Letters every entry sharing a base name (2024a, 2024b, ...), leaving unique names untouched */
  assignfilenames(basenames: string[]): string[] {
    const counts = new Map<string, number>();
    for (const name of basenames) {
      counts.set(name, (counts.get(name) || 0) + 1);
    }

    const seen = new Map<string, number>();
    return basenames.map((name) => {
      if ((counts.get(name) || 1) <= 1) return name;
      const index = seen.get(name) || 0;
      seen.set(name, index + 1);
      return this.insertsuffix(name, this.lettersuffix(index));
    });
  },

  resolveitem(itemid: string | undefined): _ZoteroTypes.Items | null {
    if (!itemid) return null;
    try {
      return (Zotero.Items.get(Number(itemid)) as unknown as _ZoteroTypes.Items) || null;
    } catch (error) {
      Zotero.log("YDocx: failed to resolve item " + itemid + ": " + error);
      return null;
    }
  },

  fieldvalue(item: _ZoteroTypes.Items, field: string): string {
    const value = item.getField(field as never);
    return typeof value === "string" ? value.trim() : "";
  },

  basenamefor(item: _ZoteroTypes.Items | null, rowindex: number): string {
    if (item) {
      try {
        return this.sanitizeFilename(Format.source(item));
      } catch (error) {
        Zotero.log("YDocx: failed to format source for row " + rowindex + ": " + error);
      }
    }
    return "Untitled-" + (rowindex + 1);
  },

  /**
   * Re-packs a Packer-produced .docx into a Word-like OPC package so Office.js's package-editing
   * APIs (customXmlParts.add, settings.saveAsync) accept it. The docx library's ZIP includes
   * explicit directory entries and does not place [Content_Types].xml first; Word's reader is
   * lenient about both, but Office.js's in-place package *writer* is strict and rejects them with
   * "NotAllowed" - which is why re-saving in Word (which normalizes the package) currently fixes
   * it. Every part is copied byte-for-byte; only the entry order/dir-entries change.
   */
  async repackage(blob: Blob): Promise<Blob> {
    const src = await JSZip.loadAsync(blob);
    const out = new JSZip();

    const names = Object.keys(src.files).filter((name) => !src.files[name].dir);
    if (names.includes(CONTENT_TYPES)) {
      names.splice(names.indexOf(CONTENT_TYPES), 1);
      names.unshift(CONTENT_TYPES);
    }

    for (const name of names) {
      out.file(name, await src.files[name].async("uint8array"), { createFolders: false });
    }

    return out.generateAsync({ type: "blob", compression: "DEFLATE", mimeType: DOCX_MIME });
  },

  metarow(label: string, value: string, bold = false): TableRow {
    const cell = (text: string) =>
      new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text, bold })] })],
      });
    return new TableRow({ children: [cell(label), cell(value)] });
  },

  fieldenabled(field: MetadataField, settings: Record<string, string>): boolean {
    return (settings[field.settingkey] ?? field.default) === "true";
  },

  /**
   * Builds the "Metadata | Value" table for one row. Always returns a table (every document gets
   * exactly one) with one row per enabled field, even when a field's value is blank or the item
   * couldn't be resolved - fields are never silently dropped once selected.
   */
  buildmetadatatable(item: _ZoteroTypes.Items | null, settings: Record<string, string>): Table {
    const rows = METADATA_FIELDS.filter((field) => this.fieldenabled(field, settings)).map((field) => ({
      label: field.label,
      value: item ? field.getvalue(item) : "",
    }));

    return new Table({
      rows: [this.metarow("Metadata", "Value", true), ...rows.map((row) => this.metarow(row.label, row.value))],
    });
  },

  /**
   * Turns a table into one flat docx per row, zipped together as "Author (Year).docx" files.
   * Two body styles, chosen via settings.ydocxstyle:
   * - "Normal" (default): column name as a Heading1, then the column's content below it.
   * - "Interview": each paragraph of a column's content is its own line, prefixed with
   *   "ColumnName: " (repeated per paragraph), like a Q&A/interview transcript.
   *
   * `rawTable` is the original, uncleaned table: it still carries the
   * per-cell `data-itemid` (stripped by Html.start's cleaning pass) needed
   * to resolve each row back to a Zotero item for the filename/metadata table.
   * `cleanedTable` is the already-cleaned table (Html.start output) used for
   * content, same as Docx.start consumes.
   */
  async start(
    rawTable: HTMLTableElement,
    cleanedTable: HTMLTableElement,
    settings: Record<string, string> = {},
  ): Promise<Blob> {
    const rawBodies = Array.from(rawTable.tBodies) as HTMLTableSectionElement[];
    const rawRows = rawBodies.flatMap((tbody) => Array.from(tbody.rows) as HTMLTableRowElement[]);
    const itemids = rawRows.filter((row) => !this.isRowHidden(row)).map((row) => row.cells[0]?.dataset?.itemid);
    const items = itemids.map((itemid) => this.resolveitem(itemid));

    const headerRow = cleanedTable.tHead?.rows[0] ?? cleanedTable.rows[0];
    const headers = (Array.from(headerRow?.cells ?? []) as HTMLTableCellElement[]).map(
      (cell) => cell.textContent?.trim() || "",
    );

    const dataRows = Array.from(cleanedTable.tBodies[0]?.rows ?? []) as HTMLTableRowElement[];

    const basenames = dataRows.map((_, i) => this.basenamefor(items[i], i));
    const filenames = this.assignfilenames(basenames);
    const showmetadata = settings.ydocxmetadata !== "false";
    const interview = settings.ydocxstyle === "Interview";

    const zip = new JSZip();

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      const children: (Paragraph | Table)[] = [];

      if (showmetadata) {
        children.push(this.buildmetadatatable(items[i], settings));
        children.push(new Paragraph({}));
      }

      for (let j = 0; j < headers.length; j++) {
        const cell = row.cells[j];
        if (!cell) continue;
        if (interview) {
          children.push(...(await Html2Docx.parse(cell, headers[j])));
        } else {
          children.push(new Paragraph({ text: headers[j], heading: Html2Docx.headingMap.h1 as any }));
          children.push(...(await Html2Docx.parse(cell)));
          children.push(new Paragraph({}));
        }
      }

      const doc = new Document({ sections: [{ children }] });
      const blob = await this.repackage(await Packer.toBlob(doc));

      zip.file(filenames[i] + ".docx", blob);
    }

    return zip.generateAsync({ type: "blob" });
  },
};

export default YDocx;
