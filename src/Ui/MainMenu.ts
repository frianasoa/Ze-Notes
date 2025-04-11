import { createXULElement } from "../globals";
import pkg from "../../package.json";
import Garbage from "../Core/Garbage";

type ItemType = {
  id: string;
  label: string;
  icon: string;
  command: () => void;
}

type MainMenuType = {
  rootURI: string | null;
  init(config: {rootURI: string}): void;
  additem(id: string, label: string, icon: string, command: () => void): void;
  additems(items: ItemType[]): void;
  addToAllWindows(callback: (win: Window) => void): void;
  getmenupopup(document: Document): HTMLElement;
};

const MainMenu: MainMenuType = {
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
  
  getmenupopup(document: Document): HTMLElement
  {
    const popupid = pkg.config.slug+'-main-popup';
    const menuid = pkg.config.slug+'-main-menu';
    const sepid = pkg.config.slug+'-main-sep';
    let menupopup = document.getElementById(popupid);
    if(menupopup)
    {
      return menupopup;
    }
    const parent = document.getElementById("menu_ToolsPopup");
    menupopup = createXULElement(document, "menupopup") as HTMLElement;
    menupopup.id = popupid;
    
    const menu = createXULElement(document, "menu");
    menu.setAttribute("class", "menuitem-iconic");
    menu.setAttribute('label', pkg.config.name);
    menu.id = menuid;
    
    const sep = createXULElement(document, "menuseparator");
    sep.id = sepid;
    parent?.appendChild(sep)
    parent?.appendChild(menu);
    menu.appendChild(menupopup);
    
    Garbage.collect(menupopup);
    Garbage.collect(menu);
    Garbage.collect(sep);
    
    return menupopup;
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
			
      const menupopup = MainMenu.getmenupopup(document);
      
      const menuitem = createXULElement(document, "menuitem");
      
      menuitem.id = pkg.config.slug+'-menu';
      menuitem.setAttribute("class", "menuitem-iconic");
      menuitem.setAttribute('label', label);
      menuitem.setAttribute("image", MainMenu.rootURI+"/chrome/content/icons/"+icon);
      menuitem.addEventListener("command", command);
      menupopup.appendChild(menuitem);
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

export default MainMenu;
