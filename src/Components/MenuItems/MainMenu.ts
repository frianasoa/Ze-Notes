import Actions from '../../Core/Actions';
import Icons from "./Icons";
import { FaArrowsRotate, FaEyeSlash, FaRegSquare, FaTableColumns, FaTableList, FaTableCells} from "react-icons/fa6";

const Main = {
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
        openaiannotation:{data: {target: "annotation"}},
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
        customaiannotation:{data: {target: "annotation"}},
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
  
  reset(menu: any)
  {
    // dynamically reset initialized menuitems
    for(const k of Main.resetkeys as string[]) {
      const keys = k.split("/");
      let currentLevel = menu;

      for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        if (!currentLevel[key]) {
          return;
        }
        currentLevel = currentLevel[key];
        if (i === keys.length - 1 && currentLevel.label) {
          currentLevel.label = "";
        }
      }
    }
    
    // Main.data["showannotation"] = {}
    // Main.data["editnote"] = {}
    // Main.data["ocrnoteimage"] = {}
    // Main.data["deletenote"] = {}
    // Main.data["showattachedfile"] = {}
    // Main.data["createnote"] = {}
    // Main.data["sepnote"] = {label: ""}
    // Main.data["translateannotation"] = {}
    // Main.data["translateannotationwithdeepl"] = {}
    // Main.data["septranslate"] = {}
    // Main.data["editannotationcomment"] = {}
    // Main.data["ocrannotationimage"] = {}
    
    // Main.data["openai"]["label"] = "";
    // Main.data["openai"]["submenu"]["openaicell"]["label"] = "Prompt on cell";
    // Main.data["openai"]["submenu"]["openairow"]["label"] = "Prompt on row";
    
    // Main.data["customai"]["label"] = "";
    // Main.data["customai"]["submenu"]["customaicell"]["label"] = "Prompt on cell";
    // Main.data["customai"]["submenu"]["customairow"]["label"] = "Prompt on row";
    
    Main.data["aidatasettings"] = {};
    for(let i = 0; i<20; i++)
    {
      const key = `customai${String(i).padStart(2, "0")}`;
      
      Main.data[key]["label"] = "";
      Main.data[key]["submenu"] ??= {};

      Main.data[key]["submenu"].customaicell ??= {};
      Main.data[key]["submenu"].customaicell.label = "";

      Main.data[key].submenu.customairow ??= {};
      Main.data[key].submenu.customainote ??= {};
      Main.data[key].submenu.customainotepart ??= {};
      Main.data[key].submenu.customaiannotation ??= {};
      
      Main.data[key].submenu.customairow.label = "";    
      Main.data[key].submenu.customainote.label = "";      
      Main.data[key].submenu.customainotepart.label = "";      
      Main.data[key].submenu.customaiannotation.label = "";   
    }
  }
}

export default Main;