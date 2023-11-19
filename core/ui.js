function alert(msg) {
	Zotero.getMainWindow().alert(msg);
}

Ui = {
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
        var url = "chrome://ze-notes/content/settings/preferences6.xhtml";
        var io = {collection: Zotero.ZeNotes.collection};
        var name = "settingswin"
                Zotero.getMainWindow().openDialog(url, name, 'chrome,titlebar,toolbar,centerscreen,dialog,modal=no,resize,width=900,height=900px', io);
	},
	
	reload(){
		if(Ui.tab!=null)
		{
			Ui.iframe.reload();
		}
	},
	
	closetab()
	{
		Zotero_Tabs.close(Ui.tab.id);
		Ui.tab = null;
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
			Ui.iframe.loadURI(url, {
				triggeringPrincipal: Services.scriptSecurityManager.getSystemPrincipal()
			});
			var index = Zotero_Tabs._getTab(Ui.tab.id).tabIndex;
			Zotero_Tabs._tabs[index]["iconBackgroundImage"] = "url(\""+ZeNotes.icon+"\")";
		}
		else
		{
			var index = Zotero_Tabs._getTab(Ui.tab.id).tabIndex;
            Zotero_Tabs._tabs[index]["title"] = "Ze Notes - "+title;
            Ui.iframe.loadURI(url, {
				triggeringPrincipal: Services.scriptSecurityManager.getSystemPrincipal()
			});
		}
		Zotero_Tabs.select(Ui.tab.id);
	}
}