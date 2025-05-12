var Engine;
var Migrate;
var Version01;

AppBase = {
	id: null,
	version: null,
	rootURI: null,
	initialized: false,
	addedElementIDs: [],
  Migrate: null,
	
	async init({ id, version, rootURI }) {
		if (this.initialized) return;
    
    Services.scriptloader.loadSubScript(rootURI + '/chrome/core/engine.js');
		Services.scriptloader.loadSubScript(rootURI + '/chrome/core/migrate/version01.js');
		Services.scriptloader.loadSubScript(rootURI + '/chrome/core/migrate/migrate.js');
    Migrate.init(rootURI, Version01);
    this.Migrate = Migrate;
		this.id = id;
		this.version = version;
		this.rootURI = rootURI;
		this.initialized = true;
    this.Engine = Engine.Engine;
    
    this.Config = this.Engine.Config;
    this.note_url = "chrome://"+AppBase.Config.slug+"/content/xhtml/notes.xhtml";
    this.Engine.init({id, version, rootURI, Zotero});
    await this.Engine.Core.Database.open();
    
    this.Engine.Ui.ContextMenu.additems(
    [
      {
        id: "150", label: "Show notes", icon: "icon.png", command: function(){AppBase.Engine.Core.Page.open(AppBase.note_url, "notes");}
      }
    ]);
		this.Engine.Ui.MainMenu.additems(
    [
      {
        id: "150", label: "Show notes", icon: "icon.png", command: function(){AppBase.Engine.Core.Page.open(AppBase.note_url, "notes");}
      },
      {
        id: "150", label: "Show settings", icon: "settings.png", command: function(){Zotero.Utilities.Internal.openPreferences(AppBase.Config.id);}
      },
    ]);
    await this.Engine.ReaderMenu.init();
	},
  
  async close()
  {
    this.Engine.Core.Database.close(true);
  },
	
	log(msg) {
		Zotero.log("ZeNotes: " + msg);
	},
	
	addToWindow(window) {
		let doc = window.document;
		Zotero.log("add to window");
		// Add a stylesheet to the main Zotero pane
		let link1 = doc.createElement('link');
		link1.id = AppBase.Config.slug+'-stylesheet';
		link1.type = 'text/css';
		link1.rel = 'stylesheet';
		link1.href = this.rootURI + 'style.css';
		doc.documentElement.appendChild(link1);
		this.storeAddedElement(link1);
		
		// Use Fluent for localization
		window.MozXULElement.insertFTLIfNeeded(AppBase.Config.slug+".ftl");
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
    this.Engine.Core.Garbage.freeall(doc);
		// Remove all elements added to DOM
		for (let id of this.addedElementIDs) {
			doc.getElementById(id)?.remove();
		}
		doc.querySelector("[href='"+AppBase.Config.slug+".ftl']").remove();
	},
	
	removeFromAllWindows() {
		var windows = Zotero.getMainWindows();
		for (let win of windows) {
			if (!win.ZoteroPane) continue;
			this.removeFromWindow(win);
		}
	},
		
	async main() {
		// Global properties are included automatically in Zotero 7
		var host = new URL('https://foo.com/path').host;
		this.log(`Host is ${host}`);
		
		// Retrieve a global pref
    const intensity = AppBase.Engine.Core.ZPrefs.get("intensity");
		// this.log(`Intensity is ${Zotero.Prefs.get("extensions." + AppBase.Config.slug + ".intensity", true)}`);
		this.log(`Intensity is ${intensity}`);
    
	},
};
