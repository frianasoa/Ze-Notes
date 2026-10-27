/**
 * The one Reading pass window, with a tab per thing being read — AI zone.
 *
 * Every way in (the reader's menu, the collection and items menus, Tools › Ze Notes) opens a tab in
 * the same window rather than a window of its own: a tab for a batch of papers, a tab for each PDF.
 * A thing already open is brought forward instead of opened twice. Selecting a PDF's tab brings that
 * PDF up in Zotero. Each tab shows the page it always did (`reading.xhtml`, `batch.xhtml`) in a
 * frame, handed its controller the way `window.arguments` handed it before; the window around them
 * (`host.xhtml`) holds the tabs. Its size and place are kept and put back. The user's request,
 * 2026-10-26.
 */
import { saveGeometry, savedGeometry, windowMode } from "./choice";

const HOST_URL = "chrome://zenotes/content/xhtml/reading/host.xhtml";

export interface TabSpec {
  /** One tab per thing: `pdf:<library>/<key>`, `batch:<scope>`. */
  id: string;
  kind: "pdf" | "batch";
  /** What the tab says: "Blokker et al. (2023)", "Papers: Literature Matrix". */
  title: string;
  /** What the page in the tab talks to (`ReadingController`, `BatchController`). */
  controller: unknown;
  /** Run when the tab is selected: a PDF's tab brings the PDF up in Zotero. */
  onSelect?: () => void;
}

let host: any = null;
/** Tabs asked for while the window is still opening; it takes them once it has loaded. */
const pending: TabSpec[] = [];

/** Opens `spec` as a tab: in the window when it is open, else in a new one. */
export function showTab(spec: TabSpec): void {
  if (host && !host.closed) {
    if (host.ZeHost) {
      host.ZeHost.addTab(spec);
      host.focus();
    } else {
      pending.push(spec);
    }
    return;
  }
  const g = savedGeometry();
  const features = [
    "chrome",
    "resizable",
    "dialog=false",
    ...(g ? [`left=${g.x}`, `top=${g.y}`, `width=${g.w}`, `height=${g.h}`] : ["centerscreen", "width=860", "height=880"]),
    // Kept in front of Zotero, which stays usable, so "Go to" shows the PDF behind it.
    ...(windowMode() === "front" ? ["dependent"] : []),
  ].join(",");
  pending.length = 0;
  pending.push(spec);
  host = Zotero.getMainWindow().openDialog(HOST_URL, "zenotes-reading", features, {
    wrappedJSObject: {
      takePending: (): TabSpec[] => pending.splice(0),
      saveGeometry,
      onClosed: (): void => {
        host = null;
      },
    },
  });
}

/** Closes the window, at shutdown. */
export function closeHost(): void {
  if (host && !host.closed) host.close();
  host = null;
}
