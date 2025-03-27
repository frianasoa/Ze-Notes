import Actions from '../../Core/Actions';
import CustomAiMenu from './CustomAiMenu';
import MenuUtils from './MenuUtils';
import {FaPencil, FaRegTrashCan, FaNoteSticky}  from "react-icons/fa6";

const NoteTextMenu = {
  show(context: any, event: React.MouseEvent<HTMLElement, MouseEvent>, item: Record<string, any>) 
  {
    context.MenuItems.main["sepnote"] = { label: '---' };
    context.MenuItems.main["editnote"] = {
      label: 'Edit note',
      icon: FaPencil,
      iconColor: "#faa700",
      onClick: Actions.editnote,
      data: { noteid: item.noteid, collectionid: context.collectionid, itemkey: item.itemkey }
    };

    context.MenuItems.main["deletenote"] = {
      label: 'Delete note',
      icon: FaRegTrashCan,
      iconColor: "#faa700",
      onClick: Actions.deletenote,
      data: { noteid: item.noteid, collectionid: context.collectionid, itemkey: item.itemkey }
    };
    
    const fieldset = event.currentTarget;
    const legend = fieldset.querySelector("legend");
    const title = legend?.innerText ? `‟${legend.innerText}”` : "note part";
    
    // OpenAi
    const target = event.currentTarget || event.target;
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
    
    // CustomAi
    const params = [
      {
        label: "Prompt on note",
        key: "customainote",
        target: "note",
        icon: FaNoteSticky
      },
      {
        label: "Prompt on part",
        data: {title: "Prompt on "+title},
        key: "customainotepart",
        target: "notepart",
        icon: FaNoteSticky
      }
    ];
    CustomAiMenu.show(context, event, params)
  }
}

export default NoteTextMenu;