import {FaEye} from "react-icons/fa6";
import Actions from '../../Core/Actions';
import MainMenu from './MainMenu';
import HeaderMenu from './HeaderMenu';
import Icons from './Icons';

const MenuItems: any = {
  icons: Icons.data,
  hiddencolumns: [] as string[],
  hiddenrows: [] as string[],
  main: MainMenu.data,
  header: HeaderMenu.data,
  resetkeys: MainMenu.resetkeys,
  
  init(hiddencolumns: string[], hiddenrows: string[], initColumnWidths:()=>void, collectionid: string) {
    this.resetmain();
    this.hiddencolumns = hiddencolumns;
    this.hiddenrows = hiddenrows;
    this.header.data = {callback: initColumnWidths};
    this.header.showcolumns.submenu = this.hiddencolumns.reduce((acc: any, h: string) => {
      acc[h] = {
        label: h,
        icon: FaEye,
        onClick: Actions.showcolumn
      };
      return acc;
    }, {} as Record<string, zty.ContextMenuData>);
    
    // Rows
    this.header.showrows.submenu = this.hiddenrows.reduce((acc: any, h: any) => {
      acc[h.itemid] = {
        label: h.source,
        title: h.title,
        icon: FaEye,
        data: {itemid: h.itemid},
        onClick: Actions.showrow
      };
      return acc;
    }, {} as Record<string, zty.ContextMenuData>);
    
    
  },
  
  resetmain(menu: any)
  {
    MainMenu.reset(menu);
  }
};

export default MenuItems;
