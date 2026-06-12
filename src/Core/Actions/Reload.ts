import {Zotero_Tabs} from "../../globals";

// Standalone so action submodules can trigger a reload without importing
// the Actions index (avoids import cycles).
const Reload = {
	reload(item: zty.ContextMenuData | null = null, celldata: zty.CellData = {})
	{
		var browserid = "browser"+Zotero_Tabs._getTab(Zotero_Tabs.selectedID).tab.id;
		var browser = Zotero.getMainWindow().document.getElementById(browserid);
		if(browser)
		{
			(browser as any).reload();
		}
	}
};

export default Reload;
