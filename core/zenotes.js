if (Zotero.platformMajorVersion < 102) {
	Cu.importGlobalProperties(['URL']);
}

ZeNotes = {
	id: null,
	version: null,
	rootURI: null,
	initialized: false,
	addedElementIDs: [],
	
	init({ id, version, rootURI }) {
		if (this.initialized) return;
		this.id = id;
		this.version = version;
		this.rootURI = rootURI;
		this.initialized = true;
		this.icon = rootURI+"/content/images/zenotes-notes.png";
	},
	
	log(msg) {
		Zotero.debug("ZeNotes: " + msg);
	},
		
	addToWindow(window) {
		let doc = window.document;
		
		/**
		Add style sheet
		*/
		// createElementNS() necessary in Zotero 6; createElement() defaults to HTML in Zotero 7
		let HTML_NS = "http://www.w3.org/1999/xhtml";
		let XUL_NS = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";
		
		// Add a stylesheet to the main Zotero pane
		let link1 = doc.createElementNS(HTML_NS, 'link');
		link1.id = 'zenotes-stylesheet';
		link1.type = 'text/css';
		link1.rel = 'stylesheet';
		link1.href = this.rootURI + 'style.css';
		doc.documentElement.appendChild(link1);
		this.storeAddedElement(link1);
		
		// Use strings from zenotes.ftl (Fluent) in Zotero 7
		if (Zotero.platformMajorVersion >= 102) {
			window.MozXULElement.insertFTLIfNeeded("zenotes.ftl");
		}
		
		// Use strings from zenotes.properties (legacy properties format) in Zotero 6
		else {
			let stringBundle = Services.strings.createBundle(
				'chrome://ze-notes/locale/zenotes.properties'
			);
		}
	},
	
	addToAllWindows() {
		var windows = Zotero.getMainWindows();
		for (let win of windows) {
			if (!win.ZoteroPane) continue;
			this.addToWindow(win);
		}
	},
	
	storeAddedElement(elem) {
		if (!elem.id) {
			throw new Error("Element must have an id");
		}
		this.addedElementIDs.push(elem.id);
	},
	
	removeFromWindow(window) {
		var doc = window.document;
		// Remove all elements added to DOM
		for (let id of this.addedElementIDs) {
			// ?. (null coalescing operator) not available in Zotero 6
			let elem = doc.getElementById(id);
			if (elem) elem.remove();
		}
		doc.querySelector('[href="zenotes.ftl"]').remove();
	},
	
	removeFromAllWindows() {
		var windows = Zotero.getMainWindows();
		for (let win of windows) {
			if (!win.ZoteroPane) continue;
			this.removeFromWindow(win);
		}
	},
	
	toggleGreen(window, enabled) {
		let docElem = window.document.documentElement;
		// Element#toggleAttribute() is not supported in Zotero 6
		if (enabled) {
			docElem.setAttribute('data-green-instead', 'true');
		}
		else {
			docElem.removeAttribute('data-green-instead');
		}
	},
	
	async main() {
		// Global properties are imported above in Zotero 6 and included automatically in
		// Zotero 7
		var host = new URL('https://foo.com/path').host;
		this.log(`Host is ${host}`);
		
		// Retrieve a global pref
		this.log(`Intensity is ${Zotero.Prefs.get('extensions.make-it-red.intensity', true)}`);
	},
};
