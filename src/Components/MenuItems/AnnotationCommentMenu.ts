import Actions from '../../Core/Actions';
import OpenAI from '../../Core/Ai/OpenAI';
import CustomAiMenu from './CustomAiMenu';
import MenuUtils from './MenuUtils';
import {FaQuoteLeft}  from "react-icons/fa6";

const AnnotationCommentMenu = {
  show(context: any, event: React.MouseEvent<HTMLElement, MouseEvent>) 
  {
    const target = event.currentTarget || event.target;

    // Open AI
    MenuUtils.insertitems(context.MenuItems.main, context.MenuItems.resetkeys, context, 
    [
      {
        label: "Prompt on comment",
        key: "openaicomment",
        keys: "openai/submenu/openaicomment",
        icon: FaQuoteLeft,
        data: { target: "comment", context: context },
        onClick: Actions.openaiprompt,
      },
      {
        label: "Prompt on part",
        key: "openaicommentpart",
        keys: "openai/submenu/openaicommentpart",
        icon: FaQuoteLeft,
        data: { target: "commentpart", context: context },
        onClick: Actions.openaiprompt,
      },
      {
        label: "---",
        key: "openainotesep",
        keys: "openai/submenu/openainotesep"
      }
    ]);
    
    // Custom AI default
    MenuUtils.insertitems(context.MenuItems.main, context.MenuItems.resetkeys, context, 
    [
      {
        label: "Prompt on comment",
        key: "customaicomment",
        keys: "customai/submenu/customaicomment",
        icon: FaQuoteLeft,
        data: {target: "comment", context: context, key: "custom-ai"},
        onClick: Actions.customaiprompt,
      },
      {
        label: "Prompt on part",
        key: "customaicommentpart",
        keys: "customai/submenu/customaicommentpart",
        icon: FaQuoteLeft,
        data: {target: "commentpart", context: context, key: "custom-ai"},
        onClick: Actions.customaiprompt,
      },
      {
        label: "---",
        key: "customainotesep",
        keys: "customai/submenu/customainotesep"
      }
    ]);
    
    // CustomAi multiple
    CustomAiMenu.show(context, event, [
      {
        label: "Prompt comment",
        key: "customaicomment",
        data: { target: "comment", context: context },
        icon: FaQuoteLeft
      },
      {
        label: "Prompt on part",
        key: "customaicommentpart",
        data: { target: "commentpart", context: context },
        icon: FaQuoteLeft
      }
    ]);
  }
}

export default AnnotationCommentMenu;