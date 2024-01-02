Settings = {
	addpref(win){
		var prefwindow = win.document.querySelector("prefwindow");
		var znpref = win.document.createElement("prefpane");
		znpref.setAttribute("id", "zotero-prefpane-zenotes");
		znpref.setAttribute("label", "Ze Notes");
		znpref.setAttribute("image", "chrome://ze-notes/content/images/zenotes-settings.png");
		znpref.setAttribute("src", "chrome://ze-notes/content/settings/preferences6.xul");
		prefwindow.addPane(znpref);
	},
	inject(){
		const windowListener = {
			onOpenWindow: (xulWindow) => {
			  const win = xulWindow.QueryInterface(Components.interfaces.nsIInterfaceRequestor).getInterface(Components.interfaces.nsIDOMWindow);
			  win.addEventListener("load", async () => {
				if(win.location.href === "chrome://zotero/content/preferences/preferences.xul") {
					Zotero.ZeNotes.Settings.addpref(win);
				}
			  }, false);
			}
		};
		Services.wm.addListener(windowListener);
	}
}