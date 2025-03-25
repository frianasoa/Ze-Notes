import ZPrefs from '../../Core/ZPrefs';
import Actions from '../../Core/Actions';
import CustomAI from '../../Core/Ai/CustomAI';
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
      
      ZPrefs.getb("openai-apikey").then((key: string)=>{
        if(key)
        {
          context.MenuItems.main["openai"]["label"] = "Using OpenAI";
          context.MenuItems.main["openai"]["icon"] = FaO;
          context.MenuItems.main["aidatasettings"] = {
            label: 'Ai data settings',
            onClick: Actions.showaidatasettings,
            icon: FaListCheck,
            data: {callback: (value: any)=>{context.setCommonDialogState?.(value)}, table: target?.closest(".main-table")}
          };
          
          if(target.dataset.itemtype=="note")
          {
            context.MenuItems.main["openai"]["submenu"]["openaicell"]["label"] = "";
            context.MenuItems.main["openai"]["submenu"]["openairow"]["label"] = "";
          }
          context.MenuItems.main["sepai"] = {label: '---'};
          
          // Add context
          Object.keys(context.MenuItems.main["openai"].submenu).forEach(key => {
            context.MenuItems.main["openai"].submenu[key]["data"]["context"] = context;
          });
        }
      })
      
      CustomAI.settinglist().then(settings=>{
        
        /** Factor this later*/
        if(Object.keys(settings).length>0)
        {
          context.MenuItems.main["aidatasettings"] = {
            label: 'Ai data settings',
            onClick: Actions.showaidatasettings,
            icon: FaListCheck,
            data: {callback: (value: any)=>{context.setCommonDialogState?.(value)}, table: target?.closest(".main-table")}
          };
          context.MenuItems.main["sepai"] = {label: '---'};
          context.MenuItems.main["sepcustomai"] = {label: '---'};
        }
        
        let i = 0;
        for (const k of Object.keys(settings).sort()) {
          const setting = settings[k];
          const key = `customai${String(i).padStart(2, "0")}`;
          
          if(!setting.use)
          {
            continue;
          }
          
          context.MenuItems.main[key] ??= {};
          context.MenuItems.main[key].submenu ??= {};
          
          context.MenuItems.main[key]["label"] = setting.name;
          context.MenuItems.main[key]["icon"] = FaWrench;
          context.MenuItems.main[key]["color"] = 'blue';

          context.MenuItems.main[key].submenu.customainote ??= { data: { target: "note" } };
          context.MenuItems.main[key].submenu.customaiannotation ??= { data: { target: "annotation" } };
          context.MenuItems.main[key].submenu.customaicell = { 
              label: "Prompt on cell", 
              icon: FaRegSquare,  
              onClick: Actions.customaiprompt, 
              data: { target: "cell", context, key: k } 
          };
          context.MenuItems.main[key].submenu.customairow = { 
              label: "Prompt on row", 
              icon: FaTableColumns,  
              onClick: Actions.customaiprompt, 
              data: { target: "row", context, key: k } 
          };
          context.MenuItems.main[key].submenu.customaicolumn = { 
              label: "Prompt on column", 
              icon: FaTableList,  
              onClick: Actions.customaiprompt, 
              data: { target: "column", context, key: k } 
          };
          context.MenuItems.main[key].submenu.customaitable = { 
              label: "Prompt on table", 
              icon: FaTableCells,  
              onClick: Actions.customaiprompt, 
              data: { target: "table", context, key: k } 
          };
          
          if(target.dataset.itemtype=="note")
          {
            context.MenuItems.main[key]["submenu"][key+"cell"]["label"] = "";
            context.MenuItems.main[key]["submenu"][key+"row"]["label"] = "";
          }

          i++;
        }
      })
      
    }
  }
}

export default CellMenu;