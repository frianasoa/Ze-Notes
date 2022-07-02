// Only create main object once
if (!Zotero.ZeNotes) {
	let loader = Components.classes["@mozilla.org/moz/jssubscript-loader;1"].getService(Components.interfaces.mozIJSSubScriptLoader);
	loader.loadSubScript("chrome://zenotes/content/zenotes.js");
}