import ZPrefs from '../../Core/ZPrefs';
import Actions from '../../Core/Actions';
import CustomAI from '../../Core/Ai/CustomAI';
import MenuUtils from './MenuUtils';
import React from 'react';

import {FaHtml5, FaFilePdf, FaO, FaC, FaFileImage, FaFile, FaFileExport, FaArrowsRotate, FaEyeSlash, FaRegSquare, FaTableColumns, FaTableList, FaTableCells, FaWrench, FaListCheck}  from "react-icons/fa6";

const CellMenu = {
  show(context: any, dataset: Record<string, any>, event: React.MouseEvent<HTMLTableCellElement, MouseEvent>)
  {
    var target = event.currentTarget || event.target;
    const attachments = JSON.parse((event?.currentTarget as HTMLTableCellElement)?.dataset?.zpaths || "[]"); 
    if(context && attachments.length>0)
    {
      const submenu: Record<string, any> = {};
      
      for(const att of attachments)
      {
        if(!att.filetype)
        {
          continue;
        }
        let icon = FaFile;
        let label = 'Open attachment'
        let iconColor = null;
        if(att.filetype === "text/html") 
        {
          icon = FaHtml5;
          label = 'Open HTML';
        }
        else if (att.filetype === "application/pdf")
        {
          icon = FaFilePdf;
          iconColor = "#f80c04";
          label = 'Open PDF'
        }
        else if(att.filetype.includes("image"))
        {
          icon = FaFileImage;
          label = 'Open Image'
        }
        
        submenu[att.key] = {
          label: label,
          icon: icon,
          iconColor: iconColor,
          data: att,
          onClick: Actions.showattachment
        }
      }
      context.MenuItems.main["showattachedfile"] = {
        label: "Attachment", 
        icon: FaFilePdf,
        iconColor: "#f80c04",
        submenu: submenu
      }
    }
    
    if(context)
    {
      if(dataset.itemtype!="note")
      {
        context.MenuItems.main["createnote"] = {
          label: 'New note', 
          icon: context.MenuItems.icons["note"], 
          onClick: Actions.createnote 
        }
        context.MenuItems.main["sepnote"] = {label: '---'};
      }
      
      context.MenuItems.main["exportas"] = {
        label: "Export",
        onClick: Actions.exportas,
        icon: FaFileExport,
        data: {callback: (value: any)=>{context.setCommonDialogState?.(value)}, table: event?.currentTarget.closest(".main-table")}
      }
      
      if(ZPrefs.get("custom-ai-apikey"))
      {
        context.MenuItems.main["aidatasettings"] = {
          label: 'Ai data settings',
          onClick: Actions.showaidatasettings,
          icon: FaListCheck,
          data: {callback: (value: any)=>{context.setCommonDialogState?.(value)}, table: target?.closest(".main-table")}
        };
        
        context.MenuItems.main["customai"]["label"] = "Using Custom AI";
        context.MenuItems.main["customai"]["icon"] = FaC;
        
        if(target.dataset.itemtype=="note")
        {
          context.MenuItems.main["customai"]["submenu"]["customaicell"]["label"] = "";
          context.MenuItems.main["customai"]["submenu"]["customairow"]["label"] = "";
        }
        context.MenuItems.main["sepai"] = {label: '---'};
        
        // Add context
        Object.keys(context.MenuItems.main["customai"].submenu).forEach(key => {
          context.MenuItems.main["customai"].submenu[key]["data"]["context"] = context;
        });
      }
      
      // Open AI
      ZPrefs.getb("openai-apikey").then((key: string)=>{
        if(key)
        {
          const params = [
            {
              label: "Using OpenAI",
              key: "openai",
              keys: "openai",
              onClick: Actions.openaiprompt,
              icon: FaO,
            },
            {
              label: "Prompt on cell",
              key: "openaicell",
              keys: "openai/submenu/openaicell",
              data: { target: "cell", context: context },
              onClick: Actions.openaiprompt,
              icon: FaRegSquare
            },
            {
              label: "Prompt on row",
              key: "openairow",
              keys: "openai/submenu/openairow",
              data: { target: "row", context: context },
              onClick: Actions.openaiprompt,
              icon: FaTableColumns
            },
            {
              label: "Prompt on column",
              key: "openaicolumn",
              keys: "openai/submenu/openaicolumn",
              data: { target: "column", context: context },
              onClick: Actions.openaiprompt,
              icon: FaTableList
            },
            {
              label: "Prompt on table",
              key: "openaitable",
              keys: "openai/submenu/openaitable",
              data: { target: "table", context: context },
              onClick: Actions.openaiprompt,
              icon: FaTableCells
            },
            {
              label: "---",
              key: "sepai",
              keys: "sepai"
            }
          ];

          MenuUtils.aidata(context, target);
          MenuUtils.insertitems(context.MenuItems.main, context.MenuItems.resetkeys, event, params);

          if(target.dataset.itemtype=="note")
          {
            const params = [
              {key: "openaicell", keys: "openai/submenu/openaicell"},
              {key: "openaicell", keys: "openai/submenu/openairow"},
            ]
            MenuUtils.resetitems(context.MenuItems.main, context.MenuItems.resetkeys, event, params);
          }
        }
      });
      
      // Custom AI
      CustomAI.settinglist().then(settings=>{
        if(Object.keys(settings).length>0)
        {
          MenuUtils.aidata(context, target);
          const params = [
            { label: "---", key: "sepai", keys: "sepai" },
            { label: "---", key: "sepcustomai", keys: "sepcustomai" },
          ]
          MenuUtils.resetitems(context.MenuItems.main, context.MenuItems.resetkeys, event, params);
        }
        
        let i = 0;
        for (const k of Object.keys(settings).sort()) {
          const setting = settings[k];
          const key = `customai${String(i).padStart(2, "0")}`;
          
          if(!setting.use)
          {
            continue;
          }
          
          const params = [
            {
              label: setting.name,
              key: key,
              keys: key,
              icon: FaWrench,
              color: "blue",
            },
            {keys: key+"/submenu/customainote", init: "true"},
            {keys: key+"/submenu/customainotepart", init: "true"},
            {keys: key+"/submenu/customaiannotation", init: "true"},
            {keys: key+"/submenu/customaipartsep", init: "true"},
            // {
              // label: "",
              // key: key,
              // keys: key+"/submenu/customaiannotation",
              // icon: FaWrench,
              // data: {target: "annotation"},
              // onClick: Actions.customaiprompt,
              // init: "true",
            // },
            {
              label: "Prompt on cell", 
              keys: key+"/submenu/customaicell",
              icon: FaRegSquare,
              onClick: Actions.customaiprompt, 
              data: { target: "cell", context, key: k } 
            },
            { 
              label: "Prompt on row", 
              keys: key+"/submenu/customairow",
              icon: FaTableColumns,  
              onClick: Actions.customaiprompt, 
              data: { target: "row", context, key: k } 
            },
            { 
              label: "Prompt on column", 
              keys: key+"/submenu/customaicolumn",
              icon: FaTableList,  
              onClick: Actions.customaiprompt, 
              data: { target: "column", context, key: k } 
            },
            {
              label: "Prompt on table", 
              keys: key+"/submenu/customaitable",
              icon: FaTableCells,  
              onClick: Actions.customaiprompt, 
              data: { target: "table", context, key: k }
            },
            {label: "---", key: "sepcustomai", keys: "sepcustomai"},
          ];
          MenuUtils.insertitems(context.MenuItems.main, context.MenuItems.resetkeys, event, params);
          
                  
          if(target.dataset.itemtype=="note")
          {
            context.MenuItems.main[key]["submenu"][key+"cell"]["label"] = "";
            context.MenuItems.main[key]["submenu"][key+"row"]["label"] = "";
            
            const params = [
              {key: key, keys: key+"/submenu/customaicell"},
              {key: key, keys: key+"/submenu/customairow"},
            ];
            MenuUtils.resetitems(context.MenuItems.main, context.MenuItems.resetkeys, event, params);
          }
          i++;
        }
      })
    }
  }
}

export default CellMenu;