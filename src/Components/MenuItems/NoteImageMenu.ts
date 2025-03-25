import Actions from '../../Core/Actions';
import Tesseract from "../../Core/Ocr/Tesseract";
import {FaT}  from "react-icons/fa6";

const NoteImageMenu = {
  show(event: Event, context: any, item: Record<string, any>) {
    let lang = Zotero.Prefs.get('extensions.zenotes.tesseract-language', true);  
    if(!lang){lang = "en"}else{lang = String(lang)}
    const language = Tesseract.langname(lang);
    
    context.MenuItems.main["ocrnoteimage"] = {
      label: 'OCR note image',
      title: "language used: "+language,
      icon: FaT,
      onClick: Actions.ocrnote,
      data: {itemkey: item.itemkey, collectionid: context.collectionid, event: event, noteid: item.noteid, notetext: item.text, service: "Tesseract", callback: function(value: any){
        if(context)
        {
          context.setTranslationDialogState?.(value);
        }
      }}
    }
  },
}

export default NoteImageMenu;