function alert(msg) {
	Zotero.getMainWindow().alert(msg);
}

Ui = {
	tabs: [],
	iframes:[],
	openpreferences()
	{
		if (Zotero.platformMajorVersion < 102)
		{
			Ui.openpreferences6();
			return;
		}
		Zotero.Utilities.Internal.openPreferences("zenotes@alefa.net");
	},
	
	openpreferences6()
	{
		var collection = Zotero.getActiveZoteroPane().getSelectedCollection();
        if(collection)
        {
            Zotero.ZeNotes.collection = collection.name;
        }
        else
        {
            Zotero.ZeNotes.collection = "All documents";
        }
        var url = "chrome://ze-notes/content/settings/preferences.xul";
        var io = {collection: Zotero.ZeNotes.collection};
        var name = "settingswin";
		let width = Zotero.ZeNotes.Prefs.get("prefs-window-width", "775");
		let height = Zotero.ZeNotes.Prefs.get("prefs-window-height", "575");
		Zotero.getMainWindow().openDialog(url, name, 'chrome,titlebar,toolbar,centerscreen,dialog,modal=no,resize,resizable=yes,width='+width+',height='+height, io);
	},
	
	reload(){
		if(Ui.tab!=null)
		{
			Ui.iframe.reload();
		}
	},
	
	reloadcustomtab(tabname)
	{
		if(Object.keys(Ui.tabs).includes(tabname))
		{
			Ui.iframes[tabname].reload();
		}
	},
	
	closetab()
	{
		Zotero_Tabs.close(Ui.tab.id);
		Ui.tab = null;
	},
	
	opencustomtab6(url, title, tabname, data)
	{
		if(!Object.keys(Ui.tabs).includes(tabname))
        {
            Ui.tabs[tabname] = Zotero_Tabs.add({
                title: "Ze Notes - "+title,
                data: {tabname: tabname, data: data},
                iconBackgroundImage:"url(\""+ZeNotes.icon+"\")",
                onClose: function(){
					delete Ui.tabs[this.data.tabname];
				}
            });
			
            var document = Zotero.getMainWindow().document;
			Ui.iframes[tabname] = document.createElement("browser");
            Ui.iframes[tabname].setAttribute("class", "reader");
            Ui.iframes[tabname].setAttribute("flex", "1");
            Ui.iframes[tabname].setAttribute("type", "content");
            Ui.tabs[tabname].container.appendChild(Ui.iframes[tabname]);

            var index = Zotero_Tabs._getTab(Ui.tabs[tabname].id).tabIndex;
			var tab = Zotero_Tabs._tabs[index];
            tab["iconBackgroundImage"] = "url(\""+ZeNotes.icon+"\")";
            Ui.iframes[tabname].setAttribute("src", url);
        }
        else
        {
            var index = Zotero_Tabs._getTab(Ui.tabs[tabname].id).tabIndex;
            Zotero_Tabs._tabs[index]["title"] = "Ze Notes - "+title;
            Ui.iframes[tabname].setAttribute("src", url);
            Ui.iframes[tabname].reload(true);
        }
        Zotero_Tabs.select(Ui.tabs[tabname].id);
	},
	
	opentab6(url, title)
	{
        if(Ui.tab==null)
        {
            Ui.tab = Zotero_Tabs.add({
                title: "Ze Notes - "+title,
                data: {},
                iconBackgroundImage:"url(\""+ZeNotes.icon+"\")",
                onClose: function(){Ui.tab=null;}
            });
            var document = Zotero.getMainWindow().document;
			Ui.iframe = document.createElement("browser");
            Ui.iframe.setAttribute("class", "reader");
            Ui.iframe.setAttribute("flex", "1");
            Ui.iframe.setAttribute("type", "content");
            Ui.tab.container.appendChild(Ui.iframe);

            var index = Zotero_Tabs._getTab(Ui.tab.id).tabIndex;
            Zotero_Tabs._tabs[index]["iconBackgroundImage"] = "url(\""+ZeNotes.icon+"\")";
            Ui.iframe.setAttribute("src", url);
        }
        else
        {
            var index = Zotero_Tabs._getTab(Ui.tab.id).tabIndex;
            Zotero_Tabs._tabs[index]["title"] = "Ze Notes - "+title;
            Ui.iframe.setAttribute("src", url);
            Ui.iframe.reload(true);
        }
        Zotero_Tabs.select(Ui.tab.id);
	},
	
	loadURI(iframe, url)
	{
		try {
			iframe.loadURI(url, {
				triggeringPrincipal: Services.scriptSecurityManager.getSystemPrincipal()
			});
		}
		catch{
			iframe.src = url;
		}
	},
	
	opentab(url, title)
	{
		if (Zotero.platformMajorVersion < 102)
		{
			Ui.opentab6(url, title);
			return;
		}
		
		if(Ui.tab==null)
        {
			Ui.tab = Zotero_Tabs.add({
				title: "Ze Notes - "+title,
				data: {},
				select: false,
				onClose: function(){Ui.tab=null;}
			});
						
			var document = Ui.tab.container.ownerDocument;
			// var document = Zotero.getMainWindow().document;
			Ui.iframe = Zotero.createXULElement(document, "browser");
			Ui.tab.container.appendChild(Ui.iframe);
			Ui.iframe.setAttribute("class", "reader");
			Ui.iframe.setAttribute("flex", "1");
			Ui.iframe.setAttribute("type", "content");
			
			Ui.loadURI(Ui.iframe, url);
			
			var index = Zotero_Tabs._getTab(Ui.tab.id).tabIndex;
			Zotero_Tabs._tabs[index]["iconBackgroundImage"] = "url(\""+ZeNotes.icon+"\")";
		}
		else
		{
			var index = Zotero_Tabs._getTab(Ui.tab.id).tabIndex;
            Zotero_Tabs._tabs[index]["title"] = "Ze Notes - "+title;
			Ui.loadURI(Ui.iframe, url);
		}
		Zotero_Tabs.select(Ui.tab.id);
	},
	
	opencustomtab(url, title, tabname, data)
	{
		if (Zotero.platformMajorVersion < 102)
		{
			Ui.opencustomtab6(url, title, tabname, data);
			return;
		}
		
		if(!Object.keys(Ui.tabs).includes(tabname))
        {
			Ui.tabs[tabname] = Zotero_Tabs.add({
				title: "Ze Notes - "+title,
				data: data,
				id: tabname,
				select: false,
				onClose: function(){delete Ui.tabs[this.data.tabname]}
			});
						
			var document = Ui.tabs[tabname].container.ownerDocument;
			Ui.iframes[tabname] = Zotero.createXULElement(document, "browser");
			Ui.tabs[tabname].container.appendChild(Ui.iframes[tabname]);
			Ui.iframes[tabname].setAttribute("class", "reader");
			Ui.iframes[tabname].setAttribute("flex", "1");
			Ui.iframes[tabname].setAttribute("type", "content");
			Ui.loadURI(Ui.iframes[tabname], url);
			var index = Zotero_Tabs._getTab(Ui.tabs[tabname].id).tabIndex;
			Zotero_Tabs._tabs[index]["iconBackgroundImage"] = "url(\""+ZeNotes.icon+"\")";
		}
		else
		{
			var index = Zotero_Tabs._getTab(Ui.tabs[tabname].id).tabIndex;
            Zotero_Tabs._tabs[index]["title"] = "Ze Notes - "+title;
			Ui.loadURI(Ui.iframe, url);
		}
		Zotero_Tabs.select(Ui.tabs[tabname].id);
	}
}