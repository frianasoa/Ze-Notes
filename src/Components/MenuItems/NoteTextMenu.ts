import Actions from '../../Core/Actions';
import CustomAiMenu from './CustomAiMenu';
import MenuUtils from './MenuUtils';
import Languages from '../../Core/Translation/Languages';
import ZPrefs from '../../Core/ZPrefs';
import {FaPencil, FaRegTrashCan, FaNoteSticky, FaQuoteLeft, FaGoogle, FaD}  from "react-icons/fa6";

const NoteTextMenu = {
  show(context: any, event: React.MouseEvent<HTMLElement, MouseEvent>, item: Record<string, any>) 
  {
    const target = event.currentTarget || event.target;
    const fieldset = event.currentTarget;
    const legend = fieldset.querySelector("legend");
    const title = legend?.innerText ? `‟${legend.innerText}”` : "note part";
    
    // Notes
    MenuUtils.insertitems(context.MenuItems.main, context.MenuItems.resetkeys, event, 
    [
      {
        label: "Edit note",
        key: "editnote",
        keys: "editnote",
        onClick: Actions.editnote,
        icon: FaPencil,
        iconColor: "#faa700",
        data: { noteid: item.noteid, collectionid: context.collectionid, itemkey: item.itemkey }
      },
      {
        label: "Delete note",
        key: "deletenote",
        keys: "deletenote",
        onClick: Actions.deletenote,
        icon: FaRegTrashCan,
        iconColor: "#faa700",
        data: { noteid: item.noteid, collectionid: context.collectionid, itemkey: item.itemkey }
      },
      {
        label: "---",
        key: "sepnote",
        keys: "sepnote",
      }
    ]);
    
    // Translation
    const langiso = ZPrefs.get('translation-language', "en");
    const langlabel = Languages.getlabel(String(langiso));
    const deeplkey = ZPrefs.get('deepl-api-key', false);
    
    // Google
    MenuUtils.insertitems(context.MenuItems.main, context.MenuItems.resetkeys, context, 
    [
      {
        label: "Google translate",
        key: "translatewithgoogle",
        keys: "translatewithgoogle",
        icon: FaGoogle,
      },
      {
        label: "Note to "+langiso.toUpperCase(),
        key: "translatewithgoogle",
        keys: "translatewithgoogle/submenu/note",
        icon: FaGoogle,
        data: { target: "note", context: context, service: "Google", noteid: item.noteid, collectionid: context.collectionid, itemkey: item.itemkey },
        onClick: Actions.translate,
      },
      
      {
        label: "Note part to "+langiso.toUpperCase(),
        key: "translatewithgoogle",
        keys: "translatewithgoogle/submenu/notepart",
        icon: FaGoogle,
        data: { target: "notepart", context: context, service: "Google", noteid: item.noteid, collectionid: context.collectionid, itemkey: item.itemkey},
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
          label: "DeepL translate",
          key: "translatewithdeepl",
          keys: "translatewithdeepl",
          icon: FaD,
        },
        {
          label: "Note to "+langiso.toUpperCase(),
          key: "translatewithdeepl-note",
          keys: "translatewithdeepl/submenu/note",
          icon: FaD,
          data: { target: "note", context: context, service: "DeepL", noteid: item.noteid, collectionid: context.collectionid, itemkey: item.itemkey },
          onClick: Actions.translate,
        },
        {
          label: "Note part to "+langiso.toUpperCase(),
          key: "translatewithdeepl-notepart",
          keys: "translatewithdeepl/submenu/notepart",
          icon: FaD,
          data: { target: "notepart", context: context, service: "DeepL", noteid: item.noteid, collectionid: context.collectionid, itemkey: item.itemkey },
          onClick: Actions.translate,
        }
      ])
    }
    
    // OpenAi
    MenuUtils.insertitems(context.MenuItems.main, context.MenuItems.resetkeys, event, 
    [
      {
        label: "Prompt on note",
        key: "openainote",
        keys: "openai/submenu/openainote",
        icon: FaNoteSticky,
        data: { target: "note", context: context, noteid: item.noteid},
        onClick: Actions.openaiprompt,
      },
      {
        label: "Prompt on part",
        key: "openainotepart",
        keys: "openai/submenu/openainotepart",
        icon: FaNoteSticky,
        data: { target: "notepart", context: context, title: "Prompt on "+title, noteid: item.noteid},
        onClick: Actions.openaiprompt,
      },
      {
        label: "---",
        key: "openainotesep",
        keys: "openai/submenu/openainotesep"
      }
    ]);
    
    // Gemini
    MenuUtils.insertitems(context.MenuItems.main, context.MenuItems.resetkeys, event, 
    [
      {
        label: "Prompt on note",
        key: "gemininote",
        keys: "gemini/submenu/gemininote",
        icon: FaNoteSticky,
        data: { target: "note", context: context, noteid: item.noteid},
        onClick: Actions.geminiprompt,
      },
      {
        label: "Prompt on part",
        key: "gemininotepart",
        keys: "gemini/submenu/gemininotepart",
        icon: FaNoteSticky,
        data: { target: "notepart", context: context, title: "Prompt on "+title, noteid: item.noteid},
        onClick: Actions.geminiprompt,
      },
      {
        label: "---",
        key: "gemininotesep",
        keys: "gemini/submenu/gemininotesep"
      }
    ]);
    
    // DeepSeek
    MenuUtils.insertitems(context.MenuItems.main, context.MenuItems.resetkeys, event, 
    [
      {
        label: "Prompt on note",
        key: "deepseeknote",
        keys: "deepseek/submenu/deepseeknote",
        icon: FaNoteSticky,
        data: { target: "note", context: context, noteid: item.noteid},
        onClick: Actions.deepseekprompt,
      },
      {
        label: "Prompt on part",
        key: "deepseeknotepart",
        keys: "deepseek/submenu/deepseeknotepart",
        icon: FaNoteSticky,
        data: { target: "notepart", context: context, title: "Prompt on "+title, noteid: item.noteid},
        onClick: Actions.deepseekprompt,
      },
      {
        label: "---",
        key: "deepseeknotesep",
        keys: "deepseek/submenu/deepseeknotesep"
      }
    ]);
    
    // Custom Ai default
    MenuUtils.insertitems(context.MenuItems.main, context.MenuItems.resetkeys, event, 
    [
      {
        label: "Prompt on note",
        key: "customainote",
        keys: "customai/submenu/customainote",
        icon: FaNoteSticky,
        data: { target: "note", context: context, noteid: item.noteid, key: "custom-ai"},
        onClick: Actions.customaiprompt,
      },
      {
        label: "Prompt on part",
        key: "customainotepart",
        keys: "customai/submenu/customainotepart",
        icon: FaNoteSticky,
        data: { target: "notepart", context: context, title: "Prompt on "+title, noteid: item.noteid, key: "custom-ai"},
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
        label: "Prompt on note",
        key: "customainote",
        target: "note",
        icon: FaNoteSticky,
        data: { target: "note", context: context, noteid: item.noteid}
      },
      {
        label: "Prompt on part",
        key: "customainotepart",
        target: "notepart",
        icon: FaNoteSticky,
        data: { target: "notepart", context: context, title: "Prompt on "+title, noteid: item.noteid}
      }
    ]);
  }
}

export default NoteTextMenu;