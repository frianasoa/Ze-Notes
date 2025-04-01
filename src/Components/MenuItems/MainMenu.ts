import Actions from '../../Core/Actions';
import Icons from "./Icons";
import { FaArrowsRotate, FaEyeSlash, FaRegSquare, FaTableColumns, FaTableList, FaTableCells} from "react-icons/fa6";

const Main: any = {
  data: {
    showentry: { label: 'Show entry', icon: Icons.data["journal-article"], onClick: Actions.showitem },
    showannotation: {},
    editannotationcomment: {},
    ocrannotationimage: {},
    showattachedfile: {},
    sep1: {label: '---'},
    editnote: {},
    ocrnoteimage: {},
    createnote: {},
    deletenote: {},
    sepnote: {label: '---'},
    
    translateannotation: {},
    translateannotationwithdeepl: {},
    septranslate: {},
    
    openai: {
      submenu: {
        openainote:{data: {target: "note"}},
        openainotepart:{data: {target: "notepart"}},
        openaiquote:{data: {target: "quote"}},
        openainotesep: {label: ""},
        openaicell:{label: "Prompt on cell", icon: FaRegSquare,  onClick: Actions.openaiprompt, data: {target: "cell"}},
        openairow:{label: "Prompt on row", icon: FaTableColumns,  onClick: Actions.openaiprompt, data: {target: "row"}},
        openaicolumn:{label: "Prompt on column", icon: FaTableList,  onClick: Actions.openaiprompt, data: {target: "column"}},
        openaitable:{label: "Prompt on table", icon: FaTableCells,  onClick: Actions.openaiprompt, data: {target: "table"}},
      },
      label: ""
    },
    gemini: {},
    customai: {
      submenu: {
        customainote:{data: {target: "note"}},
        customainotepart:{data: {target: "notepart"}},
        customaiquote:{data: {target: "quote"}},
        customainotesep: {label: ""},
        customaicell:{label: "Prompt on cell", icon: FaRegSquare,  onClick: Actions.customaiprompt, data: {target: "cell", key: "custom-ai"}},
        customairow:{label: "Prompt on row", icon: FaTableColumns,  onClick: Actions.customaiprompt, data: {target: "row", key: "custom-ai"}},
        customaicolumn:{label: "Prompt on column", icon: FaTableList,  onClick: Actions.customaiprompt, data: {target: "column", key: "custom-ai"}},
        customaitable:{label: "Prompt on table", icon: FaTableCells,  onClick: Actions.customaiprompt, data: {target: "table", key: "custom-ai"}},
      },
      label: ""
    },
    
    aidatasettings: {},
    
    sepcustomai: {},
    customai00: {},
    customai01: {},
    customai02: {},
    customai03: {},
    customai04: {},
    customai05: {},
    customai06: {},
    customai07: {},
    customai08: {},
    customai09: {},
    customai10: {},
    customai11: {},
    customai12: {},
    customai13: {},
    customai14: {},
    customai15: {},
    customai16: {},
    customai17: {},
    customai18: {},
    customai19: {},
    sepai: {},
    
    hidecolumn: { label: 'Hide column', icon: FaEyeSlash, iconColor: 'red', onClick: Actions.hidecolumn },
    hiderow: { label: 'Hide row', icon: FaEyeSlash, iconColor: 'red', onClick: Actions.hiderow },
    sep: { label: '---' },
    exportas: {},
    sep2: {label: '---'},
    reloadpage: { label: 'Reload page', icon: FaArrowsRotate, onClick: Actions.reload },
    settings: {label: 'Open settings', icon: Icons.data["settings"], onClick: Actions.opensettings }
  } as any,
  
  resetkeys: [
    "showannotation",
    "editnote",
    "ocrnoteimage",
    "deletenote",
    "showattachedfile",
    "createnote",
    "sepnote",
    "translateannotation",
    "translateannotationwithdeepl",
    "septranslate",
    "editannotationcomment",
    "ocrannotationimage",
    "openai",
    "openai/submenu/openaicell",
    "openai/submenu/openairow",
    "customai",
    "customai/submenu/customaicell",
    "customai/submenu/customairow"
  ],
  
  reset(menu: any = Main.data)
  {
    // add customai items
    for(let i = 0; i<20; i++)
    {
      const key = `customai${String(i).padStart(2, "0")}`;
      if(!Main.resetkeys.includes(key))
      {
        Main.resetkeys.push("aidatasettings");
        Main.resetkeys.push(key);
        Main.resetkeys.push(key+"/submenu/customainote");
        Main.resetkeys.push(key+"/submenu/customainotepart");
        Main.resetkeys.push(key+"/submenu/customaiquote");
        Main.resetkeys.push(key+"/submenu/customaipartsep");  
        Main.resetkeys.push(key+"/submenu/customaicell");
        Main.resetkeys.push(key+"/submenu/customairow");
        Main.resetkeys.push(key+"/submenu/customaicolumn");
        Main.resetkeys.push(key+"/submenu/customaitable");
      }     
    }
    
    // dynamically reset initialized menuitems
    for(const k of Main.resetkeys as string[]) {
      const keys = k.split("/");
      let currentLevel = menu;

      for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        if (!currentLevel[key]) {
          // return;
          currentLevel[key] = {}
        }
        currentLevel = currentLevel[key];
        if (i === keys.length - 1 && currentLevel.label) {
          currentLevel.label = "";
        }
      }
    }
  }
}

export default Main;