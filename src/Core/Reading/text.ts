/**
 * The open PDF's characters, page by page, from Zotero's own reader — AI zone.
 *
 * Zotero's fork of pdf.js gives each page's characters with their boxes in PDF user space
 * (`pdfDocument.getPageData({ pageIndex })`): the data its reader builds highlights from, so a
 * highlight made from it sits exactly where one made by hand would. Probed on Zotero
 * 11.0-beta.1, 2026-10-26: 1967 characters on a page, each `{ c, rect, offset, pageIndex, … }`.
 *
 * Two things the probe showed are needed from outside the reader's frame: its pdf.js is reached
 * through `wrappedJSObject`, and the argument has to be made in that frame (`cloneInto`), or the
 * call fails with a DataCloneError. The characters are copied out into plain objects at once,
 * so nothing here keeps a reference into the reader.
 */
import type { PageChar } from "./locate";
import { charsFromItems, pageText } from "./locate";

export interface ReadPage {
  pageIndex: number;
  /** The page's own label (roman numerals, journal page numbers), else its number. */
  label: string;
  /** `[x1, y1, x2, y2]` of the page in PDF user space, for the reader's `sortIndex`. */
  viewBox: number[];
  chars: PageChar[];
  text: string;
}

/** The PDF view of a reader, or `null` when it shows something else (an EPUB, a snapshot). */
function pdfOf(reader: any): { win: any; doc: any; labels: unknown } | null {
  const view = reader?._internalReader?._primaryView;
  const win = view?._iframeWindow;
  const app = win ? (win.wrappedJSObject ?? win).PDFViewerApplication : null;
  if (!app) return null;
  return { win, doc: app.pdfDocument, labels: view._pageLabels };
}

export function isPdfReader(reader: any): boolean {
  return pdfOf(reader) !== null;
}

/** Every page of the reader's PDF; `onPage` is told as each one is read. */
export async function readPages(
  reader: any,
  onPage?: (done: number, total: number) => void,
): Promise<ReadPage[]> {
  const pdf = pdfOf(reader);
  if (!pdf?.doc) throw new Error("This reader is not showing a PDF that has finished loading.");
  const total: number = pdf.doc.numPages;
  const pages: ReadPage[] = [];
  for (let pageIndex = 0; pageIndex < total; pageIndex++) {
    const { chars, viewBox } = (await zoteroChars(pdf, pageIndex)) ?? (await textItemChars(pdf, pageIndex));
    const labels = pdf.labels;
    const label =
      Array.isArray(labels) && typeof labels[pageIndex] === "string" && labels[pageIndex]
        ? (labels[pageIndex] as string)
        : String(pageIndex + 1);
    pages.push({
      pageIndex,
      label,
      viewBox,
      chars,
      text: pageText(chars),
    });
    onPage?.(pageIndex + 1, total);
  }
  return pages;
}

type PageSource = { chars: PageChar[]; viewBox: number[] };

/**
 * The reader's own characters (`getPageData`, Zotero's fork of pdf.js), or `null` when this
 * Zotero's reader does not give them: proven on Zotero 11; Zotero 7's types declare it too, and
 * the fallback below covers a version where it is missing or empty.
 */
async function zoteroChars(pdf: { win: any; doc: any }, pageIndex: number): Promise<PageSource | null> {
  if (typeof pdf.doc.getPageData !== "function") return null;
  try {
    const data = await pdf.doc.getPageData(Components.utils.cloneInto({ pageIndex }, pdf.win));
    const chars: PageChar[] = Array.from((data?.chars ?? []) as any[], (ch: any) => ({
      c: String(ch.c ?? ""),
      rect: Array.from((ch.rect ?? []) as number[], Number),
      ...(ch.spaceAfter ? { spaceAfter: true } : {}),
      ...(ch.lineBreakAfter || ch.paragraphBreakAfter ? { lineBreakAfter: true } : {}),
    }));
    if (chars.length === 0) return null;
    return { chars, viewBox: Array.from((data?.viewBox ?? [0, 0, 0, 0]) as number[], Number) };
  } catch {
    return null;
  }
}

/**
 * Standard pdf.js text items, each item's width shared out among its characters
 * (`charsFromItems`): a little less exact, but on the right words. A page with no text at all
 * (a scan) comes back empty, and the pass says so.
 */
async function textItemChars(pdf: { doc: any }, pageIndex: number): Promise<PageSource> {
  const proxy = await pdf.doc.getPage(pageIndex + 1);
  // Seen from outside the reader's frame, the page's methods are behind the same wrapper as
  // the reader's pdf.js; `wrappedJSObject` reaches them.
  const page = proxy?.wrappedJSObject ?? proxy;
  if (typeof page?.getTextContent !== "function") return { chars: [], viewBox: [0, 0, 0, 0] };
  const content = await page.getTextContent();
  const items = Array.from((content?.items ?? []) as any[])
    .filter((item: any) => typeof item?.str === "string")
    .map((item: any) => ({
      str: String(item.str),
      transform: Array.from((item.transform ?? []) as number[], Number),
      width: Number(item.width) || 0,
      height: Number(item.height) || 0,
    }));
  return { chars: charsFromItems(items), viewBox: Array.from((page.view ?? [0, 0, 0, 0]) as number[], Number) };
}
