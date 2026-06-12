import OpenAI from "../Ai/OpenAI";
import Gemini from "../Ai/Gemini";
import DeepSeek from "../Ai/DeepSeek";
import Claude from "../Ai/Claude";

import Reload from "./Reload";
import Visibility from "./Visibility";
import NoteActions from "./NoteActions";
import Ocr from "./Ocr";
import AiPrompt from "./AiPrompt";
import Translate from "./Translate";
import Dialogs from "./Dialogs";
import Cloud from "./Cloud";

type ActionsType = {
	rootURI: string;
  init(config: {rootURI: string}): void;
  reload(item: zty.ContextMenuData | null, celldata: zty.CellData): void;
  hidecolumn(item: zty.ContextMenuData, celldata: zty.CellData): void;
  hiderow(item: zty.ContextMenuData, celldata: zty.CellData): void;
  showcolumn(item: zty.ContextMenuData, celldata: zty.CellData): void;
  showrow(item: zty.ContextMenuData, celldata: zty.CellData): void;
  movecolumn(target: string, source: string, collectionid: string): void;
  showitem(item: zty.ContextMenuData, celldata: zty.CellData): void;
  deletenote(item: zty.ContextMenuData, celldata: zty.CellData): void;
  createnote(item: zty.ContextMenuData, celldata: zty.CellData, event: any, contents?: string|null, tags?: string[], noparent?: boolean): void;
  editnote(item: zty.ContextMenuData, celldata: zty.CellData): void;
  editannotationcomment(item: zty.ContextMenuData, celldata: zty.CellData): void;
  dropboxupload(item: zty.ContextMenuData, celldata: zty.CellData): void;
  dropboxdownload(item: zty.ContextMenuData, celldata: zty.CellData): void;
  exportas(item: zty.ContextMenuData, celldata: zty.CellData): void;
  showaidatasettings(item: zty.ContextMenuData, celldata: zty.CellData): void;
  showcolumnsortdialog(item: zty.ContextMenuData, celldata: zty.CellData): void;
  showtablesortdialog(item: zty.ContextMenuData, celldata: zty.CellData): void;
  filterdata(item: zty.ContextMenuData, celldata: zty.CellData): void;
  showannotation(item: zty.ContextMenuData, celldata: zty.CellData): void;
  translateannotation(item: zty.ContextMenuData, celldata: zty.CellData): void;
  openaiprompt(item: zty.ContextMenuData, celldata: zty.CellData, event:any): void;
  geminiprompt(item: zty.ContextMenuData, celldata: zty.CellData, event:any): void;
  deepseekprompt(item: zty.ContextMenuData, celldata: zty.CellData, event:any): void;
  claudeprompt(item: zty.ContextMenuData, celldata: zty.CellData, event:any): void;
  translate(item: zty.ContextMenuData, celldata: zty.CellData, event:any): void;
  customaiprompt(item: zty.ContextMenuData, celldata: zty.CellData, event:any): void;
  ocrannotation(item: zty.ContextMenuData, celldata: zty.CellData): void;
  ocrnote(item: zty.ContextMenuData, celldata: zty.CellData): void;
  opensettings(item: zty.ContextMenuData, celldata: zty.CellData): void;
  showattachment(item: zty.ContextMenuData, celldata: zty.CellData): void;
  resetwidths(item: zty.ContextMenuData, celldata: zty.CellData): void;
  opentextfinder(item: zty.ContextMenuData, celldata: zty.CellData): void;
  filesafename(name: string): string;
  updatenote(noteid: number, title: string, contents: string): void;
  updateannotation(noteid: number, title: string, contents: string): void;
};

const Actions: ActionsType = {
	rootURI: "",
	init({rootURI}:{rootURI: string})
	{
		this.rootURI = rootURI;
	},

	reload(item: zty.ContextMenuData | null, celldata: zty.CellData)
	{
		Reload.reload(item, celldata);
	},

  ...Visibility,
  ...NoteActions,
  ...Ocr,
  ...Translate,
  ...Dialogs,
  ...Cloud,

  openaiprompt(item: zty.ContextMenuData, celldata: zty.CellData, event: any)
  {
    AiPrompt.runstandard(OpenAI, item, celldata);
  },

  geminiprompt(item: zty.ContextMenuData, celldata: zty.CellData, event: any)
  {
    AiPrompt.runstandard(Gemini, item, celldata);
  },

  deepseekprompt(item: zty.ContextMenuData, celldata: zty.CellData, event: any)
  {
    AiPrompt.runstandard(DeepSeek, item, celldata);
  },

  claudeprompt(item: zty.ContextMenuData, celldata: zty.CellData, event: any)
  {
    AiPrompt.runstandard(Claude, item, celldata);
  },

  customaiprompt(item: zty.ContextMenuData, celldata: zty.CellData, event: any)
  {
    AiPrompt.runcustom(item, celldata);
  },

  filesafename(name: string): string {
    return name
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9\-]/g, "");
  }
};

export default Actions;
