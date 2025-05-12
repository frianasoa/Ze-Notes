import Actions from '../../Core/Actions';
import OpenAI from '../../Core/Ai/OpenAI';
import Languages from '../../Core/Translation/Languages';
import ZPrefs from '../../Core/ZPrefs';
import CustomAiMenu from './CustomAiMenu';
import MenuUtils from './MenuUtils';
import {FaQuoteLeft, FaGoogle, FaD}  from "react-icons/fa6";

const AnnotationCommentMenu = {
  show(context: any, event: React.MouseEvent<HTMLElement, MouseEvent>) 
  {
    const target = event.currentTarget || event.target;

    
    // Translation
    const langiso = ZPrefs.get('translation-language', "en");
    const langlabel = Languages.getlabel(String(langiso));
    const deeplkey = ZPrefs.get('deepl-api-key', false);
    
    // Google
    MenuUtils.insertitems(context.MenuItems.main, context.MenuItems.resetkeys, event, 
    [
      {
        label: "Google translate",
        key: "translatewithgoogle",
        keys: "translatewithgoogle",
        icon: FaGoogle,
      },
      {
        label: "Comment to "+langiso.toUpperCase(),
        key: "translatewithgoogle-comment",
        keys: "translatewithgoogle/submenu/comment",
        icon: FaGoogle,
        data: { target: "comment", context: context, service: "Google" },
        onClick: Actions.translate,
      },
      
      {
        label: "Comment part to "+langiso.toUpperCase(),
        key: "translatewithgoogle-commentpart",
        keys: "translatewithgoogle/submenu/commentpart",
        icon: FaGoogle,
        data: { target: "commentpart", context: context, service: "Google" },
        onClick: Actions.translate,
      },
      {
        label: "---",
        key: "septranslate",
        keys: "septranslate"
      }
    ])
    
    // DeepL
    if(deeplkey)
    {
      MenuUtils.insertitems(context.MenuItems.main, context.MenuItems.resetkeys, event, 
      [
        {
          label: "DeepL translate",
          key: "translatewithdeepl",
          keys: "translatewithdeepl",
          icon: FaD,
        },
        {
          label: "Comment to "+langiso.toUpperCase(),
          key: "translatewithdeepl-comment",
          keys: "translatewithdeepl/submenu/comment",
          icon: FaD,
          data: { target: "comment", context: context, service: "DeepL" },
          onClick: Actions.translate,
        },
        {
          label: "Comment part to "+langiso.toUpperCase(),
          key: "translatewithdeepl-commentpart",
          keys: "translatewithdeepl/submenu/commentpart",
          icon: FaD,
          data: { target: "commentpart", context: context, service: "DeepL" },
          onClick: Actions.translate,
        }
      ])
    }
    
    // Gemini
    MenuUtils.insertitems(context.MenuItems.main, context.MenuItems.resetkeys, context, 
    [
      {
        label: "Prompt on comment",
        key: "geminicomment",
        keys: "gemini/submenu/geminicomment",
        icon: FaQuoteLeft,
        data: { target: "comment", context: context },
        onClick: Actions.geminiprompt,
      },
      {
        label: "Prompt on part",
        key: "geminicommentpart",
        keys: "gemini/submenu/geminicommentpart",
        icon: FaQuoteLeft,
        data: { target: "commentpart", context: context },
        onClick: Actions.geminiprompt,
      },
      {
        label: "---",
        key: "gemininotesep",
        keys: "gemini/submenu/gemininotesep"
      }
    ]);
    
    // DeepSeek
    MenuUtils.insertitems(context.MenuItems.main, context.MenuItems.resetkeys, context, 
    [
      {
        label: "Prompt on comment",
        key: "deepseekcomment",
        keys: "deepseek/submenu/deepseekcomment",
        icon: FaQuoteLeft,
        data: { target: "comment", context: context },
        onClick: Actions.deepseekprompt,
      },
      {
        label: "Prompt on part",
        key: "deepseekcommentpart",
        keys: "deepseek/submenu/deepseekcommentpart",
        icon: FaQuoteLeft,
        data: { target: "commentpart", context: context },
        onClick: Actions.deepseekprompt,
      },
      {
        label: "---",
        key: "deepseeknotesep",
        keys: "deepseek/submenu/deepseeknotesep"
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