Menu = {
	window: null,
	opentab() {
		var title = "All documents";
			var collection = Zotero.getActiveZoteroPane().getSelectedCollection();
			var group = Zotero.getActiveZoteroPane().getSelectedGroup();
			var libraryID = Zotero.getActiveZoteroPane().getSelectedLibraryID();
			if (collection!=undefined && collection.name!=undefined)
			{
				title = collection.name;
			}
			else if(group!=undefined && group.name!=undefined)
			{
				title = group.name;
			}
			Ui.opentab("chrome://ze-notes-7/content/notes/notes.xhtml", title);
	},
	mainmenu(w){
		let document = w.document;
		
		if(document.getElementById("zenotes-menu-main")!=null)
		{
			return;
		}
		
		var menubar = document.getElementById("main-menubar");
        var menu = document.createXULElement("menu");
		menu.setAttribute("id", "zenotes-menu-main");
		menu.setAttribute("label", "ZeNotes");
		menu.setAttribute("accesskey", "z");
		ZeNotes.storeAddedElement(menu);

		// Add menu in front of tools
		var toolsmenu = document.getElementById("toolsMenu");
        menubar.insertBefore(menu, toolsmenu);
		ZeNotes.storeAddedElement(toolsmenu);
				
		// Add popup
		var menupopup = document.createXULElement("menupopup");
		menupopup.setAttribute("id", "zenotes-menupopup-main");
		menu.appendChild(menupopup);
		ZeNotes.storeAddedElement(menupopup);
		
		// Add items
		var menuitem_settings = document.createXULElement("menuitem");
		menuitem_settings.setAttribute("id", "zenotes-menuitem-settings");
		menuitem_settings.setAttribute("data-l10n-id", "ze-notes-settings1");
        menuitem_settings.className="menuitem-iconic";
        menuitem_settings.setAttribute("image", ZeNotes.rootURI+"/assets/zenotes-settings.png");
        menuitem_settings.addEventListener("command", function(){
			Ui.openpreferences();
		});
        menuitem_settings.setAttribute("accesskey", "S");
        menupopup.appendChild(menuitem_settings);
		ZeNotes.storeAddedElement(menuitem_settings);
        
        var menuitem_notes = document.createXULElement("menuitem");
        menuitem_notes.setAttribute("id", "zenotes-menuitem-notes");
        menuitem_notes.setAttribute("label", "Notes");
        menuitem_notes.className="menuitem-iconic";
        menuitem_notes.setAttribute("image", ZeNotes.rootURI+"/assets/zenotes-notes.png");
        menuitem_notes.addEventListener("command", function(){
			Menu.opentab();
		});
        menuitem_notes.setAttribute("accesskey", "n");
        menupopup.appendChild(menuitem_notes);
		ZeNotes.storeAddedElement(menuitem_notes);	
		
		/** collection menu items */
        var menuitem_notes_c = document.createXULElement("menuitem");
        menuitem_notes_c.setAttribute("id", "zenotes-menuitem-contextmenu");
        menuitem_notes_c.setAttribute("label", "ZeNotes - My notes in collection");
        menuitem_notes_c.className="menuitem-iconic";
        menuitem_notes_c.setAttribute("image", ZeNotes.rootURI+"/assets/zenotes-notes.png");
        menuitem_notes_c.addEventListener("command", function(){
			Menu.opentab();
		});
        menupopup.appendChild(menuitem_notes);
        document.getElementById("zotero-collectionmenu").appendChild(menuitem_notes_c);
		ZeNotes.storeAddedElement(menuitem_notes_c);
		ZeNotes.window = w;
	},
	addToWindow(window) {
		this.mainmenu(window);
	},
	addToAllWindows() {
		var windows = Zotero.getMainWindows();
		for (let win of windows) {
			if (!win.ZoteroPane) continue;
			this.addToWindow(win);
		}
	},
};