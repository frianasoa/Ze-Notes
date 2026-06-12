import Actions from "../../Core/Actions";
import CustomAiMenu from "./CustomAiMenu";
import MenuUtils from "./MenuUtils";
import AiMenu from "./AiMenu";
import TranslationMenu from "./TranslationMenu";
import { FaPencil, FaRegTrashCan, FaNoteSticky } from "react-icons/fa6";

const NoteTextMenu = {
  show(context: any, event: React.MouseEvent<HTMLElement, MouseEvent>, item: Record<string, any>) {
    const target = event.currentTarget || event.target;
    const fieldset = event.currentTarget;
    const legend = fieldset.querySelector("legend");
    const title = legend?.innerText ? `‟${legend.innerText}”` : "note part";

    // Notes
    MenuUtils.insertitems(context.MenuItems.main, context.MenuItems.resetkeys, event, [
      {
        label: "Edit note",
        key: "editnote",
        keys: "editnote",
        onClick: Actions.editnote,
        icon: FaPencil,
        iconColor: "#faa700",
        data: { noteid: item.noteid, collectionid: context.collectionid, itemkey: item.itemkey },
      },
      {
        label: "Delete note",
        key: "deletenote",
        keys: "deletenote",
        onClick: Actions.deletenote,
        icon: FaRegTrashCan,
        iconColor: "#faa700",
        data: { noteid: item.noteid, collectionid: context.collectionid, itemkey: item.itemkey },
      },
      {
        label: "---",
        key: "sepnote",
        keys: "sepnote",
      },
    ]);

    // Translation
    const translationdata = { noteid: item.noteid, collectionid: context.collectionid, itemkey: item.itemkey };
    TranslationMenu.insert(context, event, [
      { key: "note", label: "Note", data: translationdata },
      { key: "notepart", label: "Note part", data: translationdata },
    ]);

    // AI providers
    AiMenu.insertprompts(
      context,
      event,
      ["openai", "gemini", "deepseek", "claude", "customai"],
      [
        { key: "note", target: "note", label: "Prompt on note", icon: FaNoteSticky, data: { noteid: item.noteid } },
        {
          key: "notepart",
          target: "notepart",
          label: "Prompt on part",
          icon: FaNoteSticky,
          data: { title: "Prompt on " + title, noteid: item.noteid },
        },
      ],
    );

    // CustomAi multiple
    CustomAiMenu.show(context, event, [
      {
        label: "Prompt on note",
        key: "customainote",
        target: "note",
        icon: FaNoteSticky,
        data: { target: "note", context: context, noteid: item.noteid },
      },
      {
        label: "Prompt on part",
        key: "customainotepart",
        target: "notepart",
        icon: FaNoteSticky,
        data: { target: "notepart", context: context, title: "Prompt on " + title, noteid: item.noteid },
      },
    ]);
  },
};

export default NoteTextMenu;
