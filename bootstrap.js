if (typeof Zotero == 'undefined') {
	var Zotero;
}

var Zotero_Tabs;
var ZeNotes;
var Menu;
var Data;
var Database;
var Ui;
var Format;
var Utils
var Filter;
var Image;
var Ai;
var CryptoJS;

const ANNOTATION = 1;
const ANNOTATION_LABEL = "annotation";
const ATTACHMENT = 3;
const ATTACHMENT_LABEL = "attachment";
const NOTE = 28;
const NOTE_LABEL = "note";

let mainWindowListener;

function log(msg) {
	Zotero.debug("ZeNotes: " + msg);
}

function alert(msg)
{
	Zotero.getMainWindow().alert(msg);
}

// In Zotero 6, bootstrap methods are called before Zotero is initialized, and using include.js
// to get the Zotero XPCOM service would risk breaking Zotero startup. Instead, wait for the main
// Zotero window to open and get the Zotero object from there.
//
// In Zotero 7, bootstrap methods are not called until Zotero is initialized, and the 'Zotero' is
// automatically made available.
async function waitForZotero() {
		
	if (typeof Zotero != 'undefined') {
		await Zotero.initializationPromise;
		return;
	}
	
	var {Services} = ChromeUtils.import("resource://gre/modules/Services.jsm");
	var windows = Services.wm.getEnumerator('navigator:browser');
	var found = false;
	while (windows.hasMoreElements()) {
		let win = windows.getNext();
		if (win.Zotero) {
			Zotero = win.Zotero;
			found = true;
			break;
		}
	}
	if (!found) {
		await new Promise((resolve) => {
			var listener = {
				onOpenWindow: function (aWindow) {
					// Wait for the window to finish loading
					let domWindow = aWindow.QueryInterface(Ci.nsIInterfaceRequestor)
						.getInterface(Ci.nsIDOMWindowInternal || Ci.nsIDOMWindow);
					domWindow.addEventListener("load", function () {
						domWindow.removeEventListener("load", arguments.callee, false);
						if (domWindow.Zotero) {
							Services.wm.removeListener(listener);
							Zotero = domWindow.Zotero;
							resolve();
						}
					}, false);
				}
			};
			Services.wm.addListener(listener);
		});
	}
	await Zotero.initializationPromise;
}

// Adds main window open/close listeners in Zotero 6
function listenForMainWindowEvents() {
	mainWindowListener = {
		onOpenWindow: function (aWindow) {
			let domWindow = aWindow.QueryInterface(Ci.nsIInterfaceRequestor)
				.getInterface(Ci.nsIDOMWindowInternal || Ci.nsIDOMWindow);
			async function onload() {
				domWindow.removeEventListener("load", onload, false);
				if (domWindow.location.href !== "chrome://zotero/content/standalone/standalone.xul") {
					return;
				}
				onMainWindowLoad({ window: domWindow });
			}
			domWindow.addEventListener("load", onload, false);
		},
		onCloseWindow: async function (aWindow) {
			let domWindow = aWindow.QueryInterface(Ci.nsIInterfaceRequestor)
				.getInterface(Ci.nsIDOMWindowInternal || Ci.nsIDOMWindow);
			if (domWindow.location.href !== "chrome://zotero/content/standalone/standalone.xul") {
				return;
			}
			onMainWindowUnload({ window: domWindow });
		},
	};
	Services.wm.addListener(mainWindowListener);
}

function removeMainWindowListener() {
	if (mainWindowListener) {
		Services.wm.removeListener(mainWindowListener);
	}
}

// Loads default preferences from prefs.js in Zotero 6
function setDefaultPrefs(rootURI) {
	var branch = Services.prefs.getDefaultBranch("");
	var obj = {
		pref(pref, value) {
			switch (typeof value) {
				case 'boolean':
					branch.setBoolPref(pref, value);
					break;
				case 'string':
					branch.setStringPref(pref, value);
					break;
				case 'number':
					branch.setIntPref(pref, value);
					break;
				default:
					Zotero.logError(`Invalid type '${typeof(value)}' for pref '${pref}'`);
			}
		}
	};
	Services.scriptloader.loadSubScript(rootURI + "prefs.js", obj);
}

function registerchrome(rootURI){
	var aomStartup = Cc["@mozilla.org/addons/addon-manager-startup;1"].getService(Ci.amIAddonManagerStartup);    
	var manifestURI = Services.io.newURI(rootURI + "manifest.json");	

	chromeHandle = aomStartup.registerChrome(manifestURI, [
        ["content", "ze-notes", "content/"],
        ["locale", "ze-notes", "en-US", "chrome/locale/en-US"],
    ]);
	
}

function initPreferences(rootURI) {
	
	/* already done in chrome.manifest
		Keep for the day it becomes obsolete
		registerchrome(rootURI);
	*/
	
	if(Zotero.platformMajorVersion < 102) {
		/*
		Try to implement native preference in Zotero 6
		*/
	}
	else
	{
		registerchrome(rootURI);
		Zotero.PreferencePanes.register({
			pluginID: 'zenotes@alefa.net',
			id: 'zenotes@alefa.net',
			stylesheets: [
				rootURI + 'content/settings/preferences.css',
				rootURI + 'content/lib/fontawesome/6.1.1/css/all.min.css',
			],
			src: rootURI + 'content/settings/preferences.xhtml',
			scripts: [
				rootURI + 'content/settings/zntable.js',
				rootURI + 'content/settings/preferences.js',
			],
			image: rootURI+"/content/images/zenotes-settings.png"
		});
	}
}

async function install() {
	await waitForZotero();
	log("Installed ZeNotes");
}

async function startup({ id, version, resourceURI, rootURI = resourceURI.spec }) {
	await waitForZotero();
	log("Starting Ze-Notes");
	
	initPreferences(rootURI);
	Zotero.createXULElement = function(doc, tag) {
		let XUL_NS = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";
		return doc.createElementNS(XUL_NS, tag);
	}
	
	// 'Services' may not be available in Zotero 6
	if (typeof Services == 'undefined') {
		var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
	}
	
	if (Zotero.platformMajorVersion < 102) {
		// Listen for window load/unload events in Zotero 6, since onMainWindowLoad/Unload don't
		// get called
		listenForMainWindowEvents();
		// Read prefs from prefs.js in Zotero 6
		
		/*
			Does not work on Zotero 6 on certain machines
		*/
		// setDefaultPrefs(rootURI);
	}

	Services.scriptloader.loadSubScript(rootURI + 'core/image.js');
	Services.scriptloader.loadSubScript(rootURI + 'core/filter.js');
	Services.scriptloader.loadSubScript(rootURI + 'core/utils.js');
	Services.scriptloader.loadSubScript(rootURI + 'core/zenotes.js');
	Services.scriptloader.loadSubScript(rootURI + 'core/ui.js');
	Services.scriptloader.loadSubScript(rootURI + 'core/menu.js');
	
	Services.scriptloader.loadSubScript(rootURI + 'core/data.js');
	Services.scriptloader.loadSubScript(rootURI + 'core/database.js');
	Services.scriptloader.loadSubScript(rootURI + 'core/prefs.js');
	Services.scriptloader.loadSubScript(rootURI + 'core/format.js');
	Services.scriptloader.loadSubScript(rootURI + 'core/ai.js');
	
	Services.scriptloader.loadSubScript(rootURI + '3rdparty/CryptoJS 3.1.2/aes.js');
	
	ZeNotes.init({ id, version, rootURI });
	Zotero.ZeNotes = ZeNotes;
	ZeNotes.addToAllWindows();
	
	Zotero_Tabs = Zotero.getMainWindow().Zotero_Tabs;
	Menu.addToAllWindows();
	ZeNotes.Ui = Ui; 
	ZeNotes.Menu = Menu;
	ZeNotes.Utils = Utils;
	ZeNotes.Filter = Filter;
	ZeNotes.Image = Image;
	ZeNotes.Ai = Ai;
	ZeNotes.CryptoJS = CryptoJS;

	ZeNotes.Data = Data;
	ZeNotes.Database = Database;
	ZeNotes.Prefs = Prefs;
	ZeNotes.Format = Format;
	Database.create();
	Database.z6transition(Prefs.get("tag-lists"));
	await ZeNotes.main();
}

function onMainWindowLoad({ window }) {
	ZeNotes.addToWindow(window);
}

function onMainWindowUnload({ window }) {
	ZeNotes.removeFromWindow(window);
}

function shutdown() {
	log("Shutting down 1.2");

	if (Zotero.platformMajorVersion < 102) {
		removeMainWindowListener();
	}
	else
	{
		chromeHandle.destruct();
	}

	ZeNotes.removeFromAllWindows();
	ZeNotes = undefined;
}

function uninstall() {
	// `Zotero` object isn't available in `uninstall()` in Zotero 6, so log manually
	if (typeof Zotero == 'undefined') {
		dump("ZeNotes: Uninstalled\n\n");
		return;
	}
	
	log("Uninstalled 1.2");
}
