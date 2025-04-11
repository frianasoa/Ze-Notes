if (typeof Services == 'undefined') {
	var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
}

var Engine;
if (Zotero.platformMajorVersion < 102)
{
	Cu.importGlobalProperties(['URL']);
}

AppBase = {
	id: null,
	version: null,
	rootURI: null,
	initialized: false,
	addedElementIDs: [],

  addprefs(rootURI, slug)
  {
    Zotero.PreferencePanes.register({
      pluginID: slug+'@alefa.net',
      src: rootURI+'/chrome/content/xhtml/preferences/prefs.xhtml',
      scripts: [rootURI+'/chrome/content/xhtml/preferences/prefs.js'],
      stylesheets: [rootURI+'/chrome/content/xhtml/preferences/prefs.css'],
    });
  },

	async init({id, version, rootURI})
	{
		if (this.initialized) return;
		Services.scriptloader.loadSubScript(rootURI + '/chrome/core/engine.js');
    
		this.id = id;
		this.version = version;
		this.rootURI = rootURI;
		this.initialized = true;
		this.Engine = Engine.Engine;

		this.Config = this.Engine.Config;
    this.note_url = "chrome://"+AppBase.Config.slug+"/content/xhtml/notes.xhtml";
    this.Engine.init({id, version, rootURI, Zotero});
		this.Engine.Ui.ContextMenu.additems([
      {
        id: "150", label: "Show notes", icon: "icon.png", command: function(){AppBase.Engine.Core.Page.open(AppBase.note_url, "notes");}
      }
    ]);
		this.Engine.Ui.MainMenu.additems([
      {
        id: "150", label: "Show notes", icon: "icon.png", command: function(){AppBase.Engine.Core.Page.open(AppBase.note_url, "notes");}
      },
      {
        id: "150", label: "Show settings", icon: "settings.png", command: function(){Zotero.Utilities.Internal.openPreferences(AppBase.Config.id);}
      },
    ]);
    await this.Engine.Core.Database.init();
    await this.Engine.ReaderMenu.init();
    this.addprefs(rootURI);
	},

	menuitems()
	{
		return ;
	},

	log(msg) {
		Zotero.debug("AppBase: " + msg);
	},

	addToWindow(window) {
		let doc = window.document;

		// createElementNS() necessary in Zotero 6; createElement() defaults to HTML in Zotero 7
		let HTML_NS = "http://www.w3.org/1999/xhtml";
		let XUL_NS = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";

		// Add a stylesheet to the main Zotero pane
		let link1 = doc.createElementNS(HTML_NS, 'link');
		link1.id = AppBase.Config.slug+'-stylesheet';
		link1.type = 'text/css';
		link1.rel = 'stylesheet';
		link1.href = this.rootURI + 'style.css';
		doc.documentElement.appendChild(link1);
		this.storeAddedElement(link1);

		// Add menu option
		let menuitem = doc.createElementNS(XUL_NS, 'menuitem');
		menuitem.id = 'make-it-green-instead';
		menuitem.setAttribute('type', 'checkbox');
    menuitem.setAttribute("label", "Green")
		// menuitem.setAttribute('data-l10n-id', AppBase.Config.slug+'-green-instead');
		menuitem.addEventListener('command', () => {
			AppBase.toggleGreen(window, menuitem.getAttribute('checked') === 'true');
		});
		doc.getElementById('menu_viewPopup').appendChild(menuitem);
		this.storeAddedElement(menuitem);

		if (Zotero.platformMajorVersion >= 102) {
			/** Check why this gives error later*/
      // window.MozXULElement.insertFTLIfNeeded(AppBase.Config.slug+".ftl");
		}

		else {
			let stringBundle = Services.strings.createBundle(
				"chrome://"+AppBase.Config.slug+"/locale/"+AppBase.Config.slug+".properties"
			);
			doc.getElementById('make-it-green-instead')
				.setAttribute('label', stringBundle.GetStringFromName('makeItGreenInstead.label'));
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
		doc.querySelector("[href='"+AppBase.Config.slug+".ftl']").remove();
	},

	removeFromAllWindows() {
		this.Engine.Core.Database.close();
		var windows = Zotero.getMainWindows();
		for (let win of windows) {
			if (!win.ZoteroPane) continue;
			this.removeFromWindow(win);
		}
	},

	toggleGreen(window, enabled) {

		let docElem = window.document.documentElement;

    for(const row of Array.from(docElem.querySelectorAll(".row")))
    //Zotero.log(row.innerHTML);

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
		this.log(`Intensity is ${Zotero.Prefs.get("extensions." + AppBase.Config.slug + ".intensity", true)}`);
	},
};
