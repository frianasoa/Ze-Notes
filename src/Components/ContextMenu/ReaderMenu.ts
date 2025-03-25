import CustomAI from "../../Core/Ai/CustomAI"

const ReaderMenu = {
  async init()
  {
    const menus = await ReaderMenu.addcustomai();
    Zotero.Reader.registerEventListener('createAnnotationContextMenu', (event: any) => {
      let { reader, params, append } = event;
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
          append(menu);
        }
      }
    });
  },
  
  async addcustomai()
  {
    const menus = []
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
          Zotero.getMainWindow().alert(JSON.stringify(annotation));
        }
      });
    };
    return menus;
  }
}

export default ReaderMenu;