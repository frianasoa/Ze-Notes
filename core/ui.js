Ui = {
	openpreferences()
	{
		Zotero.Utilities.Internal.openPreferences("zenotes@alefa.net");
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
	
	opentab(url, title)
	{
		if(Ui.tab==null)
        {
			Ui.tab = Zotero_Tabs.add({
				title: "Ze Notes - "+title,
				data: {},
				select: false, // to load window icon
				onClose: function(){Ui.tab=null;}
			});
			document = Ui.tab.container.ownerDocument;
			Ui.iframe = document.createXULElement("browser");
			Ui.iframe.setAttribute("flex", "1");
			Ui.iframe.setAttribute("type", "content");
			Ui.tab.container.appendChild(Ui.iframe);
			
			Ui.iframe.loadURI(url, {
				triggeringPrincipal: Services.scriptSecurityManager.getSystemPrincipal()
			});
			var index = Zotero_Tabs._getTab(Ui.tab.id).tabIndex;
			Zotero_Tabs._tabs[index]["iconBackgroundImage"] = "url(\""+ZeNotes.icon+"\")";
		}
		else
		{
			var index = Zotero_Tabs._getTab(Ui.tab.id).tabIndex;
            Zotero_Tabs._tabs[index]["title"] = "Ze Notes - "+name;
            Ui.iframe.loadURI(url, {
				triggeringPrincipal: Services.scriptSecurityManager.getSystemPrincipal()
			});
		}
		Zotero_Tabs.select(Ui.tab.id);
	}
}