var AppBase;

function log(msg) {
	Zotero.log("ZeNotes: " + msg);
}

function install() {
	log("Installed ZeNotes");
}

function registerchrome(rootURI, slug)
{
	var aomStartup = Cc["@mozilla.org/addons/addon-manager-startup;1"].getService(Ci.amIAddonManagerStartup);
	var manifestURI = Services.io.newURI(rootURI + "manifest.json");

	chromeHandle = aomStartup.registerChrome(manifestURI, [
		["content", slug, "chrome/content/"],
		["locale", slug, "en-US", "chrome/locale/en-US"],
	]);
}

async function startup({ id, version, rootURI }) {
	log("Starting ZeNotes");
	Services.scriptloader.loadSubScript(rootURI + '/chrome/core/appbase.js');
	AppBase.init({ id, version, rootURI });
  
  registerchrome(rootURI, AppBase.Config.slug);
  
  Zotero.PreferencePanes.register({
    id: AppBase.Config.id,
		pluginID: AppBase.Config.id,
		src: rootURI + 'chrome/content/xhtml/preferences/prefs.xhtml',
    stylesheets: [rootURI + 'chrome/content/xhtml/preferences/prefs.css'],
		scripts: [rootURI + 'chrome/content/xhtml/preferences/prefs.js'],
    image: rootURI+"chrome/content/icons/settings.png"
	});
  
	await AppBase.main();
  Zotero.AppBase = AppBase;
  Zotero.AppBase.addToAllWindows();
  Zotero.AppBase.Migrate.run();
}

function onMainWindowLoad({ window }) {
	AppBase.addToWindow(window);
}

function onMainWindowUnload({ window }) {
	AppBase.removeFromWindow(window);
}

function shutdown() {
	log("Shutting down ZeNotes");
  AppBase.close();
	AppBase.removeFromAllWindows();
	AppBase = undefined;
}

function uninstall() {
  log("Uninstalled ZeNotes");
}