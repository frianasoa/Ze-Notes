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
    MenuUtils.insertitems(context.MenuItems.main, context.MenuItems.resetkeys, context, 
    [
      {
        label: "Translate comment ("+langiso.toUpperCase()+")",
        key: "translateannotationcomment",
        keys: "translateannotationcomment",
        icon: FaQuoteLeft,
      },
      {
        label: "Google",
        key: "translateannotationcomment",
        keys: "translateannotationcomment/submenu/google",
        icon: FaGoogle,
        data: { target: "comment", context: context, service: "Google" },
        onClick: Actions.translate,
      },
      
      {
        label: "Translate part ("+langiso.toUpperCase()+")",
        key: "translateannotationpart",
        keys: "translateannotationpart",
        icon: FaQuoteLeft,
      },
      {
        label: "Google",
        key: "translateannotationpart",
        keys: "translateannotationpart/submenu/google",
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
      MenuUtils.insertitems(context.MenuItems.main, context.MenuItems.resetkeys, context, 
      [
        {
          label: "DeepL",
          key: "translateannotationcomment",
          keys: "translateannotationcomment/submenu/deepl",
          icon: FaD,
          data: { target: "comment", context: context, service: "DeepL" },
          onClick: Actions.translate,
        },
        {
          label: "DeepL",
          key: "translateannotationpart",
          keys: "translateannotationpart/submenu/deepl",
          icon: FaD,
          data: { target: "commentpart", context: context, service: "DeepL" },
          onClick: Actions.translate,
        }
      ])
    }
    
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