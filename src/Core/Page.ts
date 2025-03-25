import { createXULElement, Zotero_Tabs } from "../globals";
import pkg from "../../package.json";
import Crypto from "./Crypto"

type PageType = {
	tab: any;
	iframe: any;
	rootURI: string | null;
	open(url: string, mode: string): void;
	init(config: {rootURI: string}): void;
	data(): any;
}

const Page: PageType = {
	tab: null,
	iframe: null,
	rootURI: null,
	init({rootURI}: {rootURI: string})
	{
    this.rootURI = rootURI;
  },

	open(url: string, mode: string)
	{
		const data: any = this.data();
		let title = pkg.config.name;
		const tabid = Crypto.SHA256(JSON.stringify(data));
		if(mode=="notes")
		{
			title = "Notes for: "+data.title
		}

		const tabexists = Zotero_Tabs._getTab(tabid).tabIndex>=0;
		if(tabexists)
		{
			Zotero_Tabs.select(tabid);
			const browser = Zotero.getMainWindow().document.getElementById("browser"+tabid);
			if(browser)
			{
				(browser as any).reload();
			}
			return;
		}

		this.tab = Zotero_Tabs.add({
			type: "",
			title: title,
			data: {},
			select: false,
			onClose: function(){Page.tab=null;},
			id: tabid
		});

		const document = this.tab?.container?.ownerDocument;
		this.iframe = createXULElement(document, "browser");
		this.tab.container.appendChild(this.iframe);
		this.iframe.setAttribute("class", "reader");
		this.iframe.setAttribute("flex", "1");
		this.iframe.setAttribute("type", "content");
		this.iframe.setAttribute("data-info", JSON.stringify(data));
		this.iframe.setAttribute("src", url);
		this.iframe.setAttribute("id", "browser"+this.tab.id);
		const index = Zotero_Tabs._getTab(this.tab.id).tabIndex;
		Zotero_Tabs.select(this.tab.id);
		// Zotero.log("tabid: "+this.tab.id);
	},

	data()
	{
    const activepane = Zotero.getActiveZoteroPane();
		var data = {
    collection: {
    	key: activepane.getSelectedCollection()?.key,
    	name: activepane.getSelectedCollection()?.name,
    	id: activepane.getSelectedCollection()?.id
    },
			group: {
			 id: activepane.getSelectedGroup()?.id,
			 name: activepane.getSelectedGroup()?.name
			},
			library: {
				id: activepane?.getSelectedLibraryID(),
				name: ""
			},
			title: "",
      libraryID: activepane?.getSelectedCollection()?.libraryID,
		}

		if(!data.collection.name&&!data.group.name)
		{
			var libraryID = activepane.getSelectedLibraryID();
			const library: any = Zotero.Libraries.get(libraryID);
			data.library.name = library.name;
			data.libraryID = libraryID;
		}
		data.title = data.collection.name||data.group.name||data.library.name;
		return data;
	}
}

export default Page;
