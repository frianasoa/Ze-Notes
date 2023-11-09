var ZeNotes;
var Zotero_Tabs;
var Menu;
var Prefs;
var Data;
var Database;
var Ui;
var Format;
var chromeHandle;

const ANNOTATION = 1;
const ATTACHMENT = 3;
const NOTE = 28;


function log(msg) {
	Zotero.debug("ZeNotes: " + msg);
}

function install() {
	log("Installed 2.0");
}

function registerchrome(rootURI){
	var aomStartup = Cc["@mozilla.org/addons/addon-manager-startup;1"].getService(Ci.amIAddonManagerStartup);
	
    var manifestURI = Services.io.newURI(rootURI + "manifest.json");	
	chromeHandle = aomStartup.registerChrome(manifestURI, [
        ["content", "ze-notes-7", "pages/"],
    ]);
}

async function startup({ id, version, rootURI }) {
	log("Starting 2.0");
	registerchrome(rootURI);
	Zotero.PreferencePanes.register({
		pluginID: 'zenotes@alefa.net',
		id: 'zenotes@alefa.net',
		stylesheets: [
			rootURI + 'pages/settings/preferences.css',
			rootURI + 'pages/lib/fontawesome/6.1.1/css/all.min.css',
		],
		src: rootURI + 'pages/settings/preferences.xhtml',
		scripts: [
			rootURI + 'pages/settings/zntable.js',
			rootURI + 'pages/settings/preferences.js',
		],
		image: rootURI+"/assets/zenotes-settings.png"
	});
	
	Services.scriptloader.loadSubScript(rootURI + 'core/ui.js');
	Services.scriptloader.loadSubScript(rootURI + 'core/zenotes.js');
	Services.scriptloader.loadSubScript(rootURI + 'core/menu.js');
	Services.scriptloader.loadSubScript(rootURI + 'core/data.js');
	Services.scriptloader.loadSubScript(rootURI + 'core/database.js');
	Services.scriptloader.loadSubScript(rootURI + 'core/prefs.js');
	Services.scriptloader.loadSubScript(rootURI + 'core/format.js');
	
	ZeNotes.init({ id, version, rootURI});
	ZeNotes.addToAllWindows();
	Menu.addToAllWindows();
	
	// Zotero_Tabs is set in addToAllWindows in Menu
	Zotero_Tabs = ZeNotes.window.Zotero_Tabs;
	ZeNotes.Menu = Menu;
	ZeNotes.Ui = Ui;
	// ZeNotes.browser = browser;
	ZeNotes.Data = Data;
	ZeNotes.Database = Database;
	ZeNotes.Prefs = Prefs;
	ZeNotes.Format = Format;
	Zotero.ZeNotes = ZeNotes;
	
	Database.create();
	
	await Zotero.ZeNotes.main();
}

function onMainWindowLoad({ window }) {
	ZeNotes.addToWindow(window);
}

function onMainWindowUnload({ window }) {
	ZeNotes.removeFromWindow(window);
}

function shutdown() {
	log("Shutting down 2.0");
	ZeNotes.removeFromAllWindows();
	ZeNotes = undefined;
	chromeHandle.destruct();
	chromeHandle = null;
}

function uninstall() {
	log("Uninstalled 2.0");
}
