import Actions from '../../Core/Actions';
import {FaListCheck}  from "react-icons/fa6";

const MenuUtils = {

  aidata(context: any, target: any)
  {
    context.MenuItems.main["aidatasettings"] = {
      label: 'Ai data settings',
      onClick: Actions.showaidatasettings,
      icon: FaListCheck,
      data: {callback: (value: any)=>{context.setCommonDialogState?.(value)}, table: target?.closest(".main-table")}
    };
    context.MenuItems.main["sepai"] = {label: '---'};
    context.MenuItems.main["sepBaseai"] = {label: '---'};
  },
  
  insertitems(context: any, event: React.MouseEvent<HTMLElement, MouseEvent>, params: any[])
  {
    const target = event.currentTarget || event.target;
    for(const param of params)
    {
      MenuUtils.insert(context, target, param);
    }
  },  
  
  insert(menu: any, target: any, param: any) {
    const keys = param.keys.split("/");
    let currentLevel = menu;
    for (const key of keys) {
      if (!currentLevel[key]) {
        currentLevel[key] = {};
      }
      currentLevel = currentLevel[key];
    }
    currentLevel.label = param.label;
    currentLevel.icon = param.icon;
    currentLevel.onClick = param.onClick;
    currentLevel.data = param.data;
  }
}

export default MenuUtils;