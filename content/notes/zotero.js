if(typeof window.parent.Zotero!=="function")
{
	var Zotero = Components.classes["@zotero.org/Zotero;1"]
		.getService(Components.interfaces.nsISupports)
		.wrappedJSObject;

	const { XPCOMUtils } = ChromeUtils.import("resource://gre/modules/XPCOMUtils.jsm");
	XPCOMUtils.defineLazyModuleGetters(this, {
		E10SUtils: "resource://gre/modules/E10SUtils.jsm",
		Services: "resource://gre/modules/Services.jsm",
		setTimeout: "resource://gre/modules/Timer.jsm",
		FileUtils: "resource://gre/modules/FileUtils.jsm"
	});

}
else
{
	var Zotero = window.parent.Zotero;
}
