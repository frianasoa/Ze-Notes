// Only create main object once
if (!Zotero.ZNotes) {
	let loader = Components.classes["@mozilla.org/moz/jssubscript-loader;1"].getService(Components.interfaces.mozIJSSubScriptLoader);
	loader.loadSubScript("chrome://znotes/content/znotes.js");
}