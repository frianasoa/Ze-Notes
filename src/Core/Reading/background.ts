/**
 * A PDF's reader, for a paper nobody has open — AI zone.
 *
 * The reading pass reads characters from Zotero's own reader (`text.ts`), so a batch opens each
 * PDF in a background tab, reads it, and closes the tab again. A PDF the person already has open
 * is read from their tab, which is left as it was.
 */

/** How long a PDF may take to load before the batch gives up on that paper. */
const LOAD_TIMEOUT_MS = 45000;

const readerOf = (attachmentID: number): any =>
  Zotero.Reader._readers.find((r: any) => r.itemID === attachmentID && !r._isTabClosed);

function hasPdf(reader: any): boolean {
  const win = reader?._internalReader?._primaryView?._iframeWindow;
  const app = win ? (win.wrappedJSObject ?? win).PDFViewerApplication : null;
  return Boolean(app?.pdfDocument);
}

/** Waits until the reader's PDF has loaded, selecting its tab once if it is slow (a lazy tab). */
async function loaded(reader: any): Promise<void> {
  if (reader?._initPromise) await reader._initPromise;
  const start = Date.now();
  let nudged = false;
  while (!hasPdf(reader)) {
    if (Date.now() - start > LOAD_TIMEOUT_MS) throw new Error("The PDF did not finish loading.");
    if (!nudged && Date.now() - start > LOAD_TIMEOUT_MS / 3 && reader.tabID) {
      // A background tab that never loads is waiting to be seen; show it for a moment.
      Zotero.getMainWindow().Zotero_Tabs.select(reader.tabID);
      nudged = true;
    }
    await Zotero.Promise.delay(250);
  }
}

/** Runs `fn` with a loaded reader for `attachmentID`, opening and closing a tab if needed. */
export async function withReader<T>(attachmentID: number, fn: (reader: any) => Promise<T>): Promise<T> {
  const mine = readerOf(attachmentID);
  if (mine) {
    await loaded(mine);
    return fn(mine);
  }
  const win = Zotero.getMainWindow();
  const before = win.Zotero_Tabs.selectedID;
  const opened = (await Zotero.Reader.open(attachmentID, undefined, { openInBackground: true })) ?? readerOf(attachmentID);
  if (!opened) throw new Error("The PDF could not be opened.");
  try {
    await loaded(opened);
    return await fn(opened);
  } finally {
    if (opened.tabID) win.Zotero_Tabs.close(opened.tabID);
    if (before && win.Zotero_Tabs.selectedID !== before) win.Zotero_Tabs.select(before);
  }
}

/** Opens a PDF in a tab in front, for the person to review, and returns its reader. */
export async function showReader(attachmentID: number): Promise<any> {
  const reader = (await Zotero.Reader.open(attachmentID)) ?? readerOf(attachmentID);
  if (!reader) throw new Error("The PDF could not be opened.");
  await loaded(reader);
  return reader;
}
