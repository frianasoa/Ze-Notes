import Actions from '../../Core/Actions';
import MenuUtils from './MenuUtils';
import ZPrefs from '../../Core/ZPrefs';
import {FaGoogle, FaD} from "react-icons/fa6";

type TranslationMenuTarget = {
  key: string;     // submenu key and default target: "cell", "note", "quote", ...
  label: string;   // "Cell", "Note part", ... (becomes "<label> to <ISO>")
  onClick?: zty.ContextMenuData["onClick"]; // defaults to Actions.translate
  data?: Record<string, any>;               // extra entry data
  basedata?: boolean;                        // include {target, context}; default true
};

// Shared builder for the Google/DeepL translation context-menu blocks that
// were previously copy-pasted in CellMenu, NoteTextMenu, AnnotationCommentMenu
// and AnnotationElement.
const TranslationMenu = {
  insert(context: zty.MenuContext, event: React.MouseEvent<HTMLElement, MouseEvent>, targets: TranslationMenuTarget[])
  {
    const langiso = String(ZPrefs.get('translation-language', "en"));
    const deeplkey = ZPrefs.get('deepl-api-key', false);

    const services = [
      { id: "Google", slug: "translatewithgoogle", label: "Google translate", icon: FaGoogle, enabled: true },
      { id: "DeepL", slug: "translatewithdeepl", label: "DeepL translate", icon: FaD, enabled: !!deeplkey },
    ];

    for(const service of services)
    {
      if(!service.enabled)
      {
        continue;
      }

      const params: any[] = [
        {
          label: service.label,
          key: service.slug,
          keys: service.slug,
          icon: service.icon,
        },
        ...targets.map(t => ({
          label: t.label+" to "+langiso.toUpperCase(),
          key: service.slug+"-"+t.key,
          keys: service.slug+"/submenu/"+t.key,
          icon: service.icon,
          data: {
            ...(t.basedata===false ? {} : { target: t.key, context: context }),
            ...(t.data ?? {}),
            service: service.id,
          },
          onClick: t.onClick ?? Actions.translate,
        })),
      ];

      // The separator historically follows the Google block only.
      if(service.id==="Google")
      {
        params.push({label: "---", key: "septranslate", keys: "septranslate"});
      }

      MenuUtils.insertitems(context.MenuItems.main, context.MenuItems.resetkeys, event, params);
    }
  },
};

export default TranslationMenu;
