import Actions from '../../Core/Actions';
import CustomAI from '../../Core/Ai/CustomAI';
import MenuUtils from './MenuUtils';

const CustomAiMenu = {
  show(context: any, event: React.MouseEvent<HTMLElement, MouseEvent>, params: any)
  {
    const target = event.currentTarget || event.target;
    CustomAI.settinglist().then(settings=>{
      if(Object.keys(settings).length>0)
      {
        MenuUtils.aidata(context, target);
      }
      CustomAiMenu.customai(context, target, settings, params);
    });
  },
    
  customai(context: any, target:any, settings:any, params: any)
  {
    let i = 0;
    for (const k of Object.keys(settings).sort()) {
      const setting = settings[k];
      const key = `customai${String(i).padStart(2, "0")}`;
      
      if(!setting.use)
      {
        continue;
      }
      
      for(const param of params)
      {
        MenuUtils.insert(context.MenuItems.main, context.MenuItems.resetkeys, target, {
          ...param, 
          keys: key + "/submenu/" + param.key,
          onClick: Actions.customaiprompt,
          data: {...param.data, key: k||param.key},
        });
      }
      
      MenuUtils.insertitems(context.MenuItems.main, context.MenuItems.resetkeys, context, [
        {
          label: "---",
          key: "customaipartsep",
          keys: key + "/submenu/customaipartsep"
        }
      ]);
      i++;
    }
  }
}

export default CustomAiMenu;