async function run(){
	await Zotero_Preferences.ZeNotes.init();
	var includes = document.querySelectorAll(".zn-include");	
	for(include of includes)
	{
		await Zotero_Preferences.ZeNotes.readxhtml(include);
	}
	return Promise.resolve();
}

this.addEventListener("paneload", function(e){
	run().then(e=>{
		var tabbox = document.querySelector('#zn-settings-tabbox');
		tabbox.addEventListener("click", function(e){
			Zotero.ZeNotes.Prefs.set("prefs-tab-index", e.currentTarget.selectedIndex);
		});
		tabbox.selectedIndex = Zotero.ZeNotes.Prefs.get("prefs-tab-index", 0);
	})
})