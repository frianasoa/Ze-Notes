import CustomAI from "../../Core/Ai/CustomAI"
import OpenAI from "../../Core/Ai/OpenAI"
import ZPrefs from "../../Core/ZPrefs"
import Google from "../../Core/Translation/Google"
import DeepL from "../../Core/Translation/DeepL"
import Languages from '../../Core/Translation/Languages';

// One entry of the reader annotation context menu.
type ReaderMenuEntry = {
  label: string;
  key: string;
  annotationType: string;
  onCommand: () => void;
  callback: (annotation: Zotero.Item) => void;
};

// Shape of the createAnnotationContextMenu reader event.
type AnnotationContextMenuEvent = {
  reader: { _item: Zotero.Item };
  params: { ids: string[]; itemGroups?: ReaderMenuEntry[][] };
  append: (...menus: ReaderMenuEntry[]) => void;
};

const ReaderMenu = {
  async init()
  {
    const mainaimenu = await ReaderMenu.addmainai();
    const traslatemenu = await ReaderMenu.addtranslate();
    const customaimenu = await ReaderMenu.addcustomai();

    Zotero.Reader.registerEventListener('createAnnotationContextMenu', (event: AnnotationContextMenuEvent) => {
      ReaderMenu.addgroup(event, traslatemenu);
      ReaderMenu.addgroup(event, mainaimenu);
      ReaderMenu.addgroup(event, customaimenu);
    });
  },

  async updateannotation(annotation: Zotero.Item, title: string, text_: string)
  {
    const comment = annotation.annotationComment;
    let text = "";
    if(comment)
    {
      text = comment+"\n\n[["+title+"]]\n"+text_;
    }
    else
    {
      text = "[["+title+"]]\n"+text_;
    }
    annotation.annotationComment = text;
    annotation.saveTx({skipSelect:false}).catch((e: any)=>{throw e;});
  },

  async addgroup(event: AnnotationContextMenuEvent, menus: ReaderMenuEntry[])
  {
    let { reader, params, append } = event;
    let groupedMenus: ReaderMenuEntry[] = [];
    for(const menu of menus)
    {
      let annotation: Zotero.Item | undefined;
      for(const id of params.ids)
      {
        annotation = reader._item.getAnnotations().filter(function(e: Zotero.Item){return e.key==id})[0];
      }

      if(annotation && menu.annotationType==annotation.annotationType)
      {
        const target = annotation;
        menu.onCommand = function(){
          menu.callback(target);
        }
        groupedMenus.push(menu);
      }
    }
    if(!params.itemGroups) {
      params.itemGroups = [];
    }
    params.itemGroups.push(groupedMenus);
    append(...groupedMenus);
  },

  async addtranslate()
  {
    const langiso = String(ZPrefs.get('translation-language', "en"));
    const langlabel = Languages.getlabel(langiso);
    const menus: ReaderMenuEntry[] = [];

    menus.push(
    {
      label: "Translate with Google ("+langlabel+")",
      key: "google-translate",
      annotationType: "highlight",
      onCommand: ()=>{},
      callback: (annotation)=>{
        const text = annotation.annotationText;
        Google.translate(text, langiso).then((res: string[])=>{
          ReaderMenu.updateannotation(annotation, "Translation", res[0]);
        }).catch((e: any)=>{
          Zotero.getMainWindow().alert(e);
        })
      }
    });

    if(ZPrefs.get('deepl-api-key', "").trim())
    {
      menus.push(
      {
        label: "Translate with DeepL ("+langlabel+")",
        key: "deepl-translate",
        annotationType: "highlight",
        onCommand: ()=>{},
        callback: (annotation)=>{
          const text = annotation.annotationText;
          DeepL.translate(text, langiso).then((res: string[])=>{
            ReaderMenu.updateannotation(annotation, "Translation", res[0]);
          }).catch((e: any)=>{
            Zotero.getMainWindow().alert(e);
          })
        }
      });
    }
    return menus;
  },

  async addmainai()
  {
    const menus: ReaderMenuEntry[] = [];

    let models = {data:[]};
    try {models = await OpenAI.models();} catch(e){};
    if(models.data.length>0)
    {
      menus.push({
        label: "Open AI",
        key: "openai",
        annotationType: "highlight",
        onCommand: ()=>{},
        callback: (annotation)=>{
          const text = annotation.annotationText;
          OpenAI.prompt(JSON.stringify({quote: text})).then((res: string[])=>{
            ReaderMenu.updateannotation(annotation, "Open AI", res[0]);
          }).catch((e: any)=>{
            Zotero.getMainWindow().alert(e);
          })
        }
      });
    }

    if(ZPrefs.get("custom-ai-url").trim())
    {
      menus.push(
      {
        label: "Custom AI [default]",
        key: "customai",
        annotationType: "highlight",
        onCommand: ()=>{},
        callback: (annotation)=>{
          const text = annotation.annotationText;
          CustomAI.prompt(JSON.stringify({quote: text}), "custom-ai").then((res: string[])=>{
            ReaderMenu.updateannotation(annotation, "Custom AI default", res[0]);
          }).catch((e: any)=>{
            Zotero.getMainWindow().alert(e);
          })
        }
      });
    }
    return menus;
  },

  async addcustomai()
  {
    const menus: ReaderMenuEntry[] = [];
    const settings = await CustomAI.settinglist();
    for (const key of Object.keys(settings).sort())
    {
      const setting = settings[key];
      if(!setting.use)
      {
        continue;
      }

      menus.push({
        label: setting.name,
        key: key,
        annotationType: "highlight",
        onCommand: ()=>{},
        callback: (annotation)=>{
          const text = annotation.annotationText;
          CustomAI.prompt(JSON.stringify({quote: text}), key).then((res: string[])=>{
            ReaderMenu.updateannotation(annotation, setting.name, res[0]);
          }).catch(e=>{
            Zotero.getMainWindow().alert(e);
          })
        }
      });
    };
    return menus;
  }
}

export default ReaderMenu;
