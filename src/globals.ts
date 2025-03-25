function createXULElement(document: Document, tag: string): Element {
  const XUL_NS = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";
  return document.createElementNS(XUL_NS, tag);
}

var Zotero_Tabs = Zotero.getMainWindow().Zotero_Tabs;
globalThis.console = Zotero.getMainWindow().console;

export {
	createXULElement,
	Zotero_Tabs
}