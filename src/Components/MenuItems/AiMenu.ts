import Actions from "../../Core/Actions";
import MenuUtils from "./MenuUtils";
import ZPrefs from "../../Core/ZPrefs";
import Providers from "../../Core/Ai/Providers";
import {
  FaA,
  FaO,
  FaC,
  FaDiamond,
  FaFish,
  FaRegSquare,
  FaTableColumns,
  FaTableList,
  FaTableCells,
} from "react-icons/fa6";

type AiMenuProvider = {
  id: string;
  label: string;
  icon: any;
  onClick: zty.ContextMenuData["onClick"];
  // Extra fields merged into each entry's data (e.g. the custom AI key).
  extradata?: Record<string, any>;
  enabled: () => Promise<boolean> | boolean;
};

const providers: Record<string, AiMenuProvider> = {
  claude: {
    id: "claude",
    label: "Claude",
    icon: FaA,
    onClick: Actions.claudeprompt,
    enabled: async () => !!(await Providers.apikey(Providers.configs.claude)),
  },
  openai: {
    id: "openai",
    label: "OpenAI",
    icon: FaO,
    onClick: Actions.openaiprompt,
    enabled: async () => !!(await Providers.apikey(Providers.configs.openai)),
  },
  gemini: {
    id: "gemini",
    label: "Gemini",
    icon: FaDiamond,
    onClick: Actions.geminiprompt,
    enabled: async () => !!(await Providers.apikey(Providers.configs.gemini)),
  },
  deepseek: {
    id: "deepseek",
    label: "DeepSeek",
    icon: FaFish,
    onClick: Actions.deepseekprompt,
    enabled: async () => !!(await Providers.apikey(Providers.configs.deepseek)),
  },
  customai: {
    id: "customai",
    label: "Custom AI",
    icon: FaC,
    onClick: Actions.customaiprompt,
    extradata: { key: "custom-ai" },
    enabled: () => !!ZPrefs.get("custom-ai-url", "").trim(),
  },
};

// Shared builders for the AI prompt context-menu blocks that were previously
// copy-pasted per provider in CellMenu, NoteTextMenu, AnnotationQuoteMenu and
// AnnotationCommentMenu.
const AiMenu = {
  providers,

  celltargets: [
    { key: "cell", target: "cell", label: "Prompt on cell", icon: FaRegSquare },
    { key: "row", target: "row", label: "Prompt on row", icon: FaTableColumns },
    { key: "column", target: "column", label: "Prompt on column", icon: FaTableList },
    { key: "table", target: "table", label: "Prompt on table", icon: FaTableCells },
  ] as zty.AiMenuTarget[],

  // Inserts "<provider>/submenu/<provider><target>" prompt entries plus a
  // trailing separator for each listed provider. Not gated by API key —
  // matches the note/quote/comment menus.
  insertprompts(
    context: zty.MenuContext,
    event: React.MouseEvent<HTMLElement, MouseEvent>,
    providerids: string[],
    targets: zty.AiMenuTarget[],
  ) {
    for (const id of providerids) {
      const provider = providers[id];
      const params: any[] = targets.map((t) => ({
        label: t.label,
        key: provider.id + t.key,
        keys: provider.id + "/submenu/" + provider.id + t.key,
        icon: t.icon,
        data: { target: t.target, context: context, ...(t.data ?? {}), ...(provider.extradata ?? {}) },
        onClick: provider.onClick,
      }));
      params.push({
        label: "---",
        key: provider.id + "notesep",
        keys: provider.id + "/submenu/" + provider.id + "notesep",
      });
      MenuUtils.insertitems(context.MenuItems.main, context.MenuItems.resetkeys, event, params);
    }
  },

  // Inserts the cell menu block for each provider: a "Using <provider>"
  // header plus cell/row/column/table prompts, gated by the provider's API
  // key. Sequential awaits keep the insertion order deterministic. On note
  // rows the cell and row prompts are reset (notes have no parent cell/row).
  async insertcellprompts(
    context: zty.MenuContext,
    event: React.MouseEvent<HTMLElement, MouseEvent>,
    target: any,
    providerids: string[],
  ) {
    for (const id of providerids) {
      const provider = providers[id];
      if (!(await provider.enabled())) {
        continue;
      }

      const params: any[] = [
        {
          label: "Using " + provider.label,
          key: provider.id,
          keys: provider.id,
          onClick: provider.onClick,
          icon: provider.icon,
        },
        ...AiMenu.celltargets.map((t) => ({
          label: t.label,
          key: provider.id + t.key,
          keys: provider.id + "/submenu/" + provider.id + t.key,
          data: { target: t.target, context: context, ...(provider.extradata ?? {}) },
          onClick: provider.onClick,
          icon: t.icon,
        })),
      ];

      MenuUtils.aidata(context, target);
      MenuUtils.insertitems(context.MenuItems.main, context.MenuItems.resetkeys, event, params);

      if (target.dataset.itemtype == "note") {
        MenuUtils.resetitems(context.MenuItems.main, context.MenuItems.resetkeys, event, [
          { key: provider.id + "cell", keys: provider.id + "/submenu/" + provider.id + "cell" },
          { key: provider.id + "cell", keys: provider.id + "/submenu/" + provider.id + "row" },
        ]);
      }
    }
  },
};

export default AiMenu;
