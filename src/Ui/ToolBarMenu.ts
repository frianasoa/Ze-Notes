import { createXULElement } from "../globals";
import pkg from "../../package.json";

type ItemType = {
  id: string;
  label: string;
  icon: string;
  command: () => void;
}

type ToolBarMenuType = {
  rootURI: string | null;
  init(config: {rootURI: string}): void;
  additem(id: string, label: string, icon: string, command: () => void): void;
  additems(items: ItemType[]): void;
  addToAllWindows(callback: (win: Window) => void): void;
};

const ToolBarMenu: ToolBarMenuType = {
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
      const menu = createXULElement(document, "menu");
      menu.setAttribute("id", pkg.config.slug+"-barmenu-item" + id);
      menu.setAttribute("label", label);
      menu.setAttribute("image", ToolBarMenu.rootURI+"/chrome/content/icons/"+icon);
      menu.className = "menuitem-iconic";
      menu.addEventListener("command", command);

      const menubar = document.getElementById("main-menubar");
      if (menubar) {
        menubar.appendChild(menu);
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

export default ToolBarMenu;
