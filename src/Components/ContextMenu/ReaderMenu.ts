import CustomAI from "../../Core/Ai/CustomAI"
import OpenAI from "../../Core/Ai/OpenAI"

const ReaderMenu = {
  async init()
  {
    const mainaimenu = await ReaderMenu.addmainai();
    const customaimenu = await ReaderMenu.addcustomai();
    
    Zotero.Reader.registerEventListener('createAnnotationContextMenu', (event: any) => {
      ReaderMenu.addgroup(event, mainaimenu);
      ReaderMenu.addgroup(event, customaimenu);
    });
  },
  
  async addgroup(event: any, menus: any)
  {
    let { reader, params, append } = event;
    let groupedMenus: any[] = [];
    for(const menu of menus)
    {
      let annotation:any = {};
      for(const id of params.ids)
      {
        annotation = reader._item.getAnnotations().filter(function(e:any){return e.key==id})[0];
      }
              
      if(menu.annotationType==annotation.annotationType)
      {
        menu.onCommand = function(){
          menu.callback(annotation);
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
  
  async addmainai()
  {
    return [{
      label: "Open AI",
      key: "openai",
      annotationType: "highlight",
      onCommand: ()=>{},
      callback: (annotation: any)=>{
        const text = annotation.annotationText;
        const comment = annotation.annotationComment;
        OpenAI.prompt(JSON.stringify({quote: text})).then((res: any)=>{
          ReaderMenu.updateannotation(annotation, "Open AI", res[0]);
        }).catch((e:any)=>{
          Zotero.getMainWindow().alert(e);
        })
      }
    },
    {
      label: "Custom AI [default]",
      key: "customai",
      annotationType: "highlight",
      onCommand: ()=>{},
      callback: (annotation: any)=>{
        const text = annotation.annotationText;
        CustomAI.prompt(JSON.stringify({quote: text}), "custom-ai").then((res: any)=>{
          ReaderMenu.updateannotation(annotation, "Custom AI default", res[0]);
        }).catch((e:any)=>{
          Zotero.getMainWindow().alert(e);
        })
      }
    }
    ];
  },
  
  async updateannotation(annotation: any, title: string, text_: string)
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
  
  async addcustomai()
  {
    const menus = [] as any[];
    const settings = await CustomAI.settinglist();
    for (const key of Object.keys(settings).sort()) 
    {
      const setting = settings[key];
      if(!setting.use)
      {
        continue;
      }
      const label = setting.name;
      
      menus.push({
        label: setting.name,
        key: key,
        annotationType: "highlight",
        onCommand: ()=>{},
        callback: (annotation: any)=>{
          const text = annotation.annotationText;
          const comment = annotation.annotationComment;
          CustomAI.prompt(JSON.stringify({quote: text}), key).then((res: any)=>{
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