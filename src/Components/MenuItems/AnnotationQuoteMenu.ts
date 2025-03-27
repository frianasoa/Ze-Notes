import Actions from '../../Core/Actions';
import CustomAiMenu from './CustomAiMenu';
import MenuUtils from './MenuUtils';
import {FaQuoteLeft}  from "react-icons/fa6";

const AnnotationQuoteMenu = {
  show(context: any, event: React.MouseEvent<HTMLElement, MouseEvent>) 
  {
    CustomAiMenu.show(context, event, {
      label: "Prompt on quote",
      key: "customaiannotation",
      target: "annotation"
    });
    
    // Add openai
    const target = event.currentTarget || event.target;
    MenuUtils.insertitems(context.MenuItems.main, context.MenuItems.resetkeys, context, 
    [
      {
        label: "Prompt on quote",
        key: "openaiannotation",
        keys: "openai/submenu/openaiannotation",
        icon: FaQuoteLeft,
        data: { target: "quote", context: context },
        onClick: Actions.openaiprompt,
      },
      {
        label: "---",
        key: "openainotesep",
        keys: "openai/submenu/openainotesep"
      }
    ]);
  }
}

export default AnnotationQuoteMenu;