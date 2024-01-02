async function run(){
	await Zotero_Preferences.ZeNotes.init();
	var includes = document.querySelectorAll(".zn-include");	
	for(include of includes)
	{
		await Zotero_Preferences.ZeNotes.readxhtml(include);
	}
	return Promise.resolve();
}
run();

