import Actions from '../../Core/Actions';
import CustomAiMenu from './CustomAiMenu';
import MenuUtils from './MenuUtils';
import {FaPencil, FaRegTrashCan, FaNoteSticky}  from "react-icons/fa6";

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