import PromptFormat from "../Exporter/PromptFormat";
import CustomAI from "../Ai/CustomAI";
import AiNotes from "../Ai/AiNotes";
import Reload from "./Reload";

type TargetResolver = (celldata: zty.CellData) => HTMLElement | null;

type RunOptions = {
  // Per-target overrides of the default resolvers; null disables a target.
  resolvers?: Record<string, TargetResolver | null>;
  loadingmessage?: string;
  makecontents?: (data: any, item: zty.ContextMenuData) => string;
  onerror?: (e: any) => void;
};

const STANDARD_LOADING = "Loading, please wait...<br/> Or close this window, <br/> and continue working while waiting for a note window to open!";
const CUSTOM_LOADING = "Loading, please wait...<br/> Or close this window if you want, <br/> and continue working while waiting for a note window to open!";

// Shared implementation behind the per-provider AI prompt actions; replaces
// five near-identical handlers that previously lived in Actions/index.ts.
const AiPrompt = {
  resolvers: {
    comment: (c) => c.target.closest(".comment"),
    commentpart: (c) => c.target,
    quote: (c) => c.target.closest(".zcontent"),
    note: (c) => c.target.closest(".zcontent"),
    notepart: (c) => c.target.closest(".zcontent"),
    cell: (c) => c.target.closest("td"),
    row: (c) => c.target.closest("tr"),
    column: (c) => AiPrompt.columntarget(c),
    table: (c) => c.target.closest("table"),
  } as Record<string, TargetResolver>,

  // Builds a detached row holding a clone of every cell of the column.
  columntarget(celldata: zty.CellData): HTMLElement
  {
    const tr = document.createElement("tr");
    const td = celldata.target.closest("td");
    const table = td.closest("table");
    const columnIndex = td.cellIndex;

    table.querySelectorAll("tr").forEach((row: any) => {
      const targettd = row.cells[columnIndex];
      if (targettd) {
        tr.appendChild(targettd.cloneNode(true));
      }
    });
    return tr;
  },

  resolvetarget(targettype: string, celldata: zty.CellData, custom: Record<string, TargetResolver | null> = {}): HTMLElement | null
  {
    const map = { ...AiPrompt.resolvers, ...custom };
    const resolver = map[targettype];
    return resolver ? resolver(celldata) : null;
  },

  async run(promptfn: (data: string) => Promise<any>, item: zty.ContextMenuData, celldata: zty.CellData, options: RunOptions = {})
  {
    if(!item.data)
    {
      return;
    }

    const target = AiPrompt.resolvetarget(item.data.target, celldata, options.resolvers ?? {});
    if(!target)
    {
      return;
    }

    const context = item.data.context;
    if(!context)
    {
      return;
    }

    const makecontents = options.makecontents ?? ((data: any, item: zty.ContextMenuData) => {
      let contents = "[[AI output on this "+item.data.target+"]]<br/>\n"+data;
      if(item.data.target=="notepart")
      {
        contents = "[[AI output on \""+item.data.title+"\"]]<br/>\n"+data;
      }
      return contents;
    });

    const onerror = options.onerror ?? ((e: any) => {
      if(e.status)
      {
        window.alert(e.message);
      }
    });

    context.setLoadingMessage(options.loadingmessage ?? STANDARD_LOADING);
    context.setIsLoading(true);
    const promptdata = await PromptFormat.data(target, celldata.collectionid);

    promptfn(JSON.stringify(promptdata)).then((data: any)=>{
      AiNotes.create(item, celldata, makecontents(data, item), ()=>{Reload.reload()});
      context.setIsLoading(false)
    })
    .catch((e: any)=>{
      onerror(e);
      context.setIsLoading(false);
    })
  },

  // Standard providers (OpenAI, Gemini, DeepSeek, Claude).
  async runstandard(provider: { prompt(data: string): Promise<any> }, item: zty.ContextMenuData, celldata: zty.CellData)
  {
    return AiPrompt.run((data) => provider.prompt(data), item, celldata);
  },

  // Custom AI keeps its historical quirks: notepart targets the element
  // itself, output is trimmed without a notepart title, and every error is
  // surfaced with details.
  async runcustom(item: zty.ContextMenuData, celldata: zty.CellData)
  {
    return AiPrompt.run((data) => CustomAI.prompt(data, item.data.key), item, celldata, {
      resolvers: { notepart: (c) => c.target },
      loadingmessage: CUSTOM_LOADING,
      makecontents: (data, item) => "[[AI output on this "+item.data.target+"]]<br/>"+String(data).trim(),
      onerror: (e) => {
        window.alert("Error requesting response: \n"+(e.error || e.message || e.code || JSON.stringify(e)));
      },
    });
  }
};

export default AiPrompt;
