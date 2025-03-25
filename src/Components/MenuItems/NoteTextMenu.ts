import Actions from '../../Core/Actions';
import CustomAiMenu from './CustomAiMenu';
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
    
    const param = {
      label: "Prompt on "+title,
      key: "customainotepart",
      target: "note-part",
      icon: FaNoteSticky
    }
    CustomAiMenu.show(context, event, param)
    
    const param2 = {
      label: "Prompt on note",
      key: "customainote",
      target: "note",
      icon: FaNoteSticky
    }
    CustomAiMenu.show(context, event, param2)
  }
}

export default NoteTextMenu;