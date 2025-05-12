import Actions from '../../Core/Actions';
import Icons from "./Icons";
import Tesseract from "../../Core/Ocr/Tesseract";
import {FaT}  from "react-icons/fa6";

const AnnotationImageMenu = {
  show(event: React.MouseEvent<HTMLElement, MouseEvent>, context: any, item: Record<string, any>) {
    let lang = Zotero.Prefs.get('extensions.zenotes.tesseract-language', true);  
    if(!lang){lang = "en"}else{lang = String(lang)}
    const language = Tesseract.langname(lang);
    
    if(context)
    {
      context.MenuItems.main["showannotation"] = {
        label: 'Show annotation',
        icon: Icons.data["annotation"],
        onClick: Actions.showannotation,
        data: {attachmentid: item.attachmentid, annotationid: item.annotationid, annotationpage: item.pagelabel, annotationkey: item.annotationkey}
      }

      context.MenuItems.main["editannotationcomment"] = {
        label: 'Edit annotation comment',
        icon: Icons.data["edit"],
        onClick: Actions.editannotationcomment,
        data: {attachmentid: item.attachmentid, annotationid: item.annotationid, annotationpage: item.pagelabel, annotationcomment: item.comment, annotationkey: item.annotationkey, callback: function(value: any)
          {
            if(context)
            {
              context.setCommonDialogState?.(value);
            }
          }
        }
      }

      if(item.image)
      {
        context.MenuItems.main["ocrannotationimage"] = {
          label: 'OCR annotation image',
          icon: FaT,
          title: "Language used: "+language,
          onClick: Actions.ocrannotation,
          data: {attachmentid: item.attachmentid, annotationid: item.annotationid, annotationpage: item.pagelabel, annotationkey: item.annotationkey, annotationimage: item.image, annotationtext: item.text, service: "Tesseract", callback: function(value: any){
            if(context)
            {
              context.setTranslationDialogState?.(value);
            }
          }}
        }
      }
    }
  }
}

export default AnnotationImageMenu;