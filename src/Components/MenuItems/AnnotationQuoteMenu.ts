import Actions from '../../Core/Actions';
import OpenAI from '../../Core/Ai/OpenAI';
import CustomAiMenu from './CustomAiMenu';
import MenuUtils from './MenuUtils';
import {FaQuoteLeft}  from "react-icons/fa6";

const AnnotationQuoteMenu = {
  show(context: any, event: React.MouseEvent<HTMLElement, MouseEvent>) 
  {
    const target = event.currentTarget || event.target;

    // Open AI
    MenuUtils.insertitems(context.MenuItems.main, context.MenuItems.resetkeys, context, 
    [
      {
        label: "Prompt on quote",
        key: "openaiquote",
        keys: "openai/submenu/openaiquote",
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
    
    // Gemini
    MenuUtils.insertitems(context.MenuItems.main, context.MenuItems.resetkeys, context, 
    [
      {
        label: "Prompt on quote",
        key: "geminiquote",
        keys: "gemini/submenu/geminiquote",
        icon: FaQuoteLeft,
        data: { target: "quote", context: context },
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
        label: "Prompt on quote",
        key: "deepseekquote",
        keys: "deepseek/submenu/deepseekquote",
        icon: FaQuoteLeft,
        data: { target: "quote", context: context },
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
        label: "Prompt on quote",
        key: "customaiquote",
        keys: "customai/submenu/customaiquote",
        icon: FaQuoteLeft,
        data: {target: "quote", context: context, key: "custom-ai"},
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
        label: "Prompt on quote",
        key: "customaiquote",
        data: { target: "quote", context: context },
        icon: FaQuoteLeft
      }
    ]);
  }
}

export default AnnotationQuoteMenu;