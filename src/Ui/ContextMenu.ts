import { createXULElement } from "../globals";
import pkg from "../../package.json";

type ItemType = {
  id: string;
  label: string;
  icon: string;
  command: () => void;
}

type ContextMenuType = {
  rootURI: string | null;
  init(config: {rootURI: string}): void;
  additem(id: string, label: string, icon: string, command: () => void): void;
  additems(items: ItemType[]): void;
  addToAllWindows(callback: (win: Window) => void): void;
};

const ContextMenu: ContextMenuType = {
	rootURI: null,
  init({rootURI}: {rootURI: string})
	{
    this.rootURI = rootURI;
  },
	
	additems(items: ItemType[])
	{
		for(const {id, label, icon, command} of items)
		{
			this.additem(id, label, icon, command);
		}
	},

  additem(id: string, label: string, icon: string, command: (o: any) => void) 
	{
		this.addToAllWindows(function(w)
		{
      if (!w || !w.document)
			{
        return;
      }
			
      const document = w.document;
      const menuitem = createXULElement(document, "menuitem");
      menuitem.setAttribute("id", pkg.config.slug+"-contextmenu-item" + id);
      menuitem.setAttribute("label", label);
      menuitem.setAttribute("image", ContextMenu.rootURI+"/chrome/content/icons/"+icon);
      menuitem.className = "menuitem-iconic";
      menuitem.addEventListener("command", command);

      const collectionMenu = document.getElementById("zotero-collectionmenu");
      if (collectionMenu) {
        collectionMenu.appendChild(menuitem);
      }
    });
  },

  addToAllWindows(callback: (win: Window) => void) {
    const windows = Zotero?.getMainWindows() ?? [];
    for (let win of windows) {
      if (win?.ZoteroPane) {
        callback(win);
      }
    }
  }
};

export default ContextMenu;
