import Actions from '../../Core/Actions';
import CustomAI from '../../Core/Ai/CustomAI';
import MenuUtils from './MenuUtils';

const CustomAiMenu = {
  show(context: any, event: React.MouseEvent<HTMLElement, MouseEvent>, param: any)
  {
    const target = event.currentTarget || event.target;
    CustomAI.settinglist().then(settings=>{
      if(Object.keys(settings).length>0)
      {
        MenuUtils.aidata(context, target);
      }
      CustomAiMenu.customai(context, target, settings, param);
    });
  },
    
  customai(context: any, target:any, settings:any, param: any)
  {
    let i = 0;
    for (const k of Object.keys(settings).sort()) {
      const setting = settings[k];
      const key = `customai${String(i).padStart(2, "0")}`;
      
      if(!setting.use)
      {
        continue;
      }
      
      MenuUtils.insert(context.MenuItems.main, target, {
        ...param, 
        keys: key + "/submenu/" + param.key,
        onClick: Actions.customaiprompt,
        data: {target: param.target, context, key: k}
      });
      i++;
    }
  }
}

export default CustomAiMenu;