var ZNStringBundle = Services.strings.createBundle('chrome://zenotes/locale/zenotes.properties');

Menu = {
	window: null,
	menu: null,
	toolsmenu: null,
	menubar: null,
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
		Ui.opentab("chrome://zenotes/content/notes/notes.xhtml", title);
	},
	
	mainmenu(w){
		var showmain = Prefs.get("add-to-menu");
		showmain = showmain==true || showmain=="true";
		
		if(this.menubar!=null)
		{
			if(Zotero.isMac)
			{
				this.menubar.insertBefore(this.menu, this.toolsmenu);
			}
			return;
		}
		else
		{
			w.onfocus = function(e){Zotero.ZeNotes.Menu.mainmenu(e.target)};
		}
		
		let document = w.document;

		if(document.getElementById("zenotes-menu-main")!=null)
		{
			return;
		}
		
		var menubar = document.getElementById("main-menubar");
        var menu = Zotero.createXULElement(document, "menu");
		menu.setAttribute("id", "zenotes-menu-main");
		menu.setAttribute("label", "ZeNotes");
		menu.setAttribute("accesskey", "z");
		ZeNotes.storeAddedElement(menu);

		// Add menu in front of tools
		var toolsmenu = document.getElementById("toolsMenu");

		if(toolsmenu)
		{
			if(Prefs.get("remove-menu", false)==true || Prefs.get("remove-menu", false)=="true")
			{
				toolsmenu.querySelector("menupopup").appendChild(menu);
			}
			else
			{
				menubar.insertBefore(menu, toolsmenu);
			}
			ZeNotes.storeAddedElement(menu);
		}
		else
		{
			menubar.appendChild(menu);
		}
		ZeNotes.storeAddedElement(menu);
		
		this.menu = menu;
		this.toolsmenu = toolsmenu;
		this.menubar = menubar;
				
		// Add popup
		var menupopup = Zotero.createXULElement(document, "menupopup");
		menupopup.setAttribute("id", "zenotes-menupopup-main");
		menu.appendChild(menupopup);
		ZeNotes.storeAddedElement(menupopup);
		
		// Add items
		var menuitem_settings = Zotero.createXULElement(document, "menuitem");
		menuitem_settings.setAttribute("id", "zenotes-menuitem-settings");
		menuitem_settings.setAttribute("data-l10n-id", "zenotes-settings");
		
        menuitem_settings.className="menuitem-iconic";
        menuitem_settings.setAttribute("image", ZeNotes.rootURI+"/content/images/zenotes-settings.png");
        menuitem_settings.addEventListener("command", function(){
			Ui.openpreferences();
		});
        menuitem_settings.setAttribute("accesskey", "S");
        menupopup.appendChild(menuitem_settings);
		ZeNotes.storeAddedElement(menuitem_settings);
		
		if (Zotero.platformMajorVersion < 102)
		{
			menuitem_settings.setAttribute("label", ZNStringBundle.GetStringFromName('zenotes-settings.label'));
        }
		
		
        var menuitem_notes = Zotero.createXULElement(document, "menuitem");
        menuitem_notes.setAttribute("id", "zenotes-menuitem-notes");
        menuitem_notes.setAttribute("label", "Notes");
        menuitem_notes.className="menuitem-iconic";
        menuitem_notes.setAttribute("image", ZeNotes.rootURI+"/content/images/zenotes-notes.png");
        menuitem_notes.addEventListener("command", function(){
			Menu.opentab();
		});
        menuitem_notes.setAttribute("accesskey", "n");
        menupopup.appendChild(menuitem_notes);
		menupopup.appendChild(menuitem_notes);
		ZeNotes.storeAddedElement(menuitem_notes);	
		
		/** collection menu items */
		icon = ZeNotes.rootURI+"/content/images/zenotes-notes.png";
		iconup = ZeNotes.rootURI+"/content/images/icon-upload.png";
		icondown = ZeNotes.rootURI+"/content/images/icon-download.png";
		
		if(Prefs.get("dropbox-refresh-token") && Prefs.get("dropbox-client-id") && Prefs.get("dropbox-client-secret") && Prefs.get("dropbox-target-user"))
		{
			this.addMenuToZenotes(document, menupopup, 1, "zenotes-dropbox-upload", iconup,  function(){NSync.export();}, "E");
			this.addMenuToZenotes(document, menupopup, 2, "zenotes-dropbox-download", icondown,  function(){NSync.import();}, "I");
		}
		
		this.addMenuToCollection(
			document, "1", "ZeNotes - My notes in collection", icon, 
			function(){Menu.opentab();}
		);
		
		if(Prefs.get("dropbox-refresh-token") && Prefs.get("dropbox-client-id") && Prefs.get("dropbox-client-secret") && Prefs.get("dropbox-target-user"))
		{
			this.addMenuToCollection(
				document, "2", "Export to Dropbox", iconup, 
				function(){NSync.export();}
			);
			
			this.addMenuToCollection(
				document, "3", "Import from Dropbox", icondown, 
				function(){NSync.import();}
			);
		}
		
		ZeNotes.window = w;
	},
	
	addMenuToCollection(document, id, label, icon, command)
	{
		var menuitem = Zotero.createXULElement(document, "menuitem");
        menuitem.setAttribute("id", "zenotes-menuitem-contextmenu"+id);
        menuitem.setAttribute("label", label);
        menuitem.setAttribute("image", icon);
		menuitem.className="menuitem-iconic";
        menuitem.addEventListener("command", command);
		document.getElementById("zotero-collectionmenu").appendChild(menuitem);
		ZeNotes.storeAddedElement(menuitem);
	},
	
	addMenuToZenotes(document, menupopup, id, labelid, icon, command, accesskey)
	{
		var menuitem = Zotero.createXULElement(document, "menuitem");
		menuitem.setAttribute("id", "zenotes-menuitem-"+id);
		menuitem.setAttribute("data-l10n-id", labelid);
		
        menuitem.className="menuitem-iconic";
        menuitem.setAttribute("image", icon);
        menuitem.addEventListener("command", command);
        menuitem.setAttribute("accesskey", accesskey);
        menupopup.appendChild(menuitem);
		if (Zotero.platformMajorVersion < 102)
		{
			menuitem.setAttribute("label", ZNStringBundle.GetStringFromName(labelid+'.label'));
        }
		ZeNotes.storeAddedElement(menuitem);
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