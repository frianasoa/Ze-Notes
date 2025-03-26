import React from 'react';
import {Zotero_Tabs} from "../../globals";
import Config from "../../Config";
import TablePrefs from "../TablePrefs";
import Exporter from "../Exporter";
import PromptFormat from "../Exporter/PromptFormat";
import Prefs from "../Prefs";
import Google from "../Translation/Google";
import DeepL from "../Translation/DeepL";
import OpenAI from "../Ai/OpenAI";
import CustomAI from "../Ai/CustomAI";
import AiNotes from "../Ai/AiNotes";
import Tesseract from "../Ocr/Tesseract";
import DataSettings from "./DataSettings";
import TranslationElement from "../../Components/Dialog/TranslationElement";
import TableSortContents from "../../Components/Dialog/TableSortContents";
import ColumnSortContents from "../../Components/Dialog/ColumnSortContents";
import AnnotationCommentEditor from "../../Components/Dialog/AnnotationCommentEditor";
import ExportSettingDialog from "../../Components/Dialog/ExportSettingDialog";
import DataSettingDialog from "../../Components/Dialog/DataSettingDialog";
import {FaFolder, FaTag, FaTableCellsLarge, FaHighlighter, FaTags, FaCircleXmark, FaIcons, FaQuoteLeft, FaBook, FaNoteSticky }  from "react-icons/fa6";

type ActionsType = {
	rootURI: string;
  init(config: {rootURI: string}): void;
  reload(item: zty.ContextMenuData | null, celldata: Record<string, any>): void;
  hidecolumn(item: zty.ContextMenuData, celldata: Record<string, any>): void;
  hiderow(item: zty.ContextMenuData, celldata: Record<string, any>): void;
  showcolumn(item: zty.ContextMenuData, celldata: Record<string, any>): void;
  showrow(item: zty.ContextMenuData, celldata: Record<string, any>): void;
  movecolumn(target: string, source: string, collectionid: string): void;
  showitem(item: zty.ContextMenuData, celldata: Record<string, any>): void;
  deletenote(item: zty.ContextMenuData, celldata: Record<string, any>): void;
  createnote(item: zty.ContextMenuData, celldata: Record<string, any>, event: any, contents?: string|null, tags?: string[], noparent?: boolean): void;
  editnote(item: zty.ContextMenuData, celldata: Record<string, any>): void;
  editannotationcomment(item: zty.ContextMenuData, celldata: Record<string, any>): void;
  exportas(item: zty.ContextMenuData, celldata: Record<string, any>): void;
  showaidatasettings(item: zty.ContextMenuData, celldata: Record<string, any>): void;
  showcolumnsortdialog(item: zty.ContextMenuData, celldata: Record<string, any>): void;
  showtablesortdialog(item: zty.ContextMenuData, celldata: Record<string, any>): void;
  filterdata(item: zty.ContextMenuData, celldata: Record<string, any>): void;
  showannotation(item: zty.ContextMenuData, celldata: Record<string, any>): void;
  translateannotation(item: zty.ContextMenuData, celldata: Record<string, any>): void;
  openaiprompt(item: zty.ContextMenuData, celldata: Record<string, any>, event:any): void;
  customaiprompt(item: zty.ContextMenuData, celldata: Record<string, any>, event:any): void;
  ocrannotation(item: zty.ContextMenuData, celldata: Record<string, any>): void;
  ocrnote(item: zty.ContextMenuData, celldata: Record<string, any>): void;
  opensettings(item: zty.ContextMenuData, celldata: Record<string, any>): void;
  showattachment(item: zty.ContextMenuData, celldata: Record<string, any>): void;
  resetwidths(item: zty.ContextMenuData, celldata: Record<string, any>): void;
  filesafename(name: string): string;
};

const Actions: ActionsType = {
	rootURI: "",
	init({rootURI}:{rootURI: string})
	{
		this.rootURI = rootURI;
	},

	reload(item: zty.ContextMenuData, celldata: Record<string, any>)
	{
		var browserid = "browser"+Zotero_Tabs._getTab(Zotero_Tabs.selectedID).tab.id;
		var browser = Zotero.getMainWindow().document.getElementById(browserid);
		if(browser)
		{
			(browser as any).reload();
		}
	},

  hidecolumn(item: zty.ContextMenuData, celldata: Record<string, any>)
  {
    TablePrefs.get(celldata.collectionid, "hide-key", "[]").then((k: string)=>{
      const hkeys = JSON.parse(k);
      hkeys.push(celldata.column);
      TablePrefs.set(celldata.collectionid, "hide-key", JSON.stringify([...new Set(hkeys)])).then(()=>{
        Actions.reload(item, celldata);
      })
    });
  },

  hiderow(item: zty.ContextMenuData, celldata: Record<string, any>)
  {
    TablePrefs.get(celldata.collectionid, "row-hide-key", "[]").then((k: string)=>{
      const hkeys = JSON.parse(k);
      hkeys.push(celldata.itemid);
      TablePrefs.set(celldata.collectionid, "row-hide-key", JSON.stringify([...new Set(hkeys)])).then(()=>{
        Actions.reload(item, celldata);
      })
    });
  },

  showrow(item: zty.ContextMenuData, celldata: Record<string, any>)
  {
    TablePrefs.get(celldata.collectionid, "row-hide-key", "[]").then((k: string)=>{
      const hkeys = JSON.parse(k);
      const index = hkeys.indexOf(String(item.data.itemid));
      if (index > -1) {
        hkeys.splice(index, 1);
      }
      TablePrefs.set(celldata.collectionid, "row-hide-key", JSON.stringify([...new Set(hkeys)])).then(()=>{
        Actions.reload(item, celldata);
      })
    });
  },

  showcolumn(item: zty.ContextMenuData, celldata: Record<string, any>)
  {
    TablePrefs.get(celldata.collectionid, "hide-key", "[]").then((k: string)=>{
      const hkeys = JSON.parse(k);
      const index = hkeys.indexOf(item.label);
      if (index > -1) {
        hkeys.splice(index, 1);
      }
      TablePrefs.set(celldata.collectionid, "hide-key", JSON.stringify([...new Set(hkeys)])).then(()=>{
        Actions.reload(item, celldata);
      })
    });
  },

  movecolumn(target: string, source: string, collectionid: string) {
    TablePrefs.get(collectionid, "column-sort-key", "[]").then((k: string) => {
      const skeys = JSON.parse(k);
      const indexSource = skeys.indexOf(source);
      const indexTarget = skeys.indexOf(target);

      // Case 1: Source is directly in front of the target -> Swap their positions
      if (indexSource !== -1 && indexTarget === indexSource + 1) {
        // Swap the positions of source and target
        skeys[indexSource] = target;
        skeys[indexTarget] = source;
      } else {
        // Case 2: Regular move logic
        // Remove source column if it exists
        if (indexSource !== -1) {
          skeys.splice(indexSource, 1);
        }

        // Find the updated index of the target column
        const newIndexTarget = skeys.indexOf(target);

        if (newIndexTarget !== -1) {
          // Move source in front of the target
          skeys.splice(newIndexTarget, 0, source);
        } else {
          // Append source to the end if target doesn't exist
          skeys.push(source);
        }
      }

      // Update the table preferences
      TablePrefs.set(collectionid, "column-sort-key", JSON.stringify(skeys)).then(() => {
        Actions.reload(null, {});
      });
    });
  },

  showitem(item: zty.ContextMenuData, celldata: Record<string, any>)
  {
    Zotero.getMainWindow().ZoteroPane.selectItems([parseInt(celldata.itemid)]);
  },

  deletenote(item: zty.ContextMenuData, celldata: Record<string, any>)
  {
    const window_ = Zotero.getMainWindow();
    if(window_.confirm("Are you sure you want to delete this note?"))
    {
      Zotero.Items.erase(item.data.noteid).then(function(){
        Actions.reload(null, {});
      });
    }
  },

  createnote(item: zty.ContextMenuData, celldata: Record<string, any>, event: any=null, contents: string | null = null, tags: string[]=[], noparent: boolean=false)
  {
    const column = celldata.column;
    const itemid = celldata.itemid;
    let note = new Zotero.Item('note');
    let text = "&lt;&lt;"+celldata.column+"&gt;&gt;<br/>\nNew Note";
    if(contents)
    {
      text = contents;
    }

    note.setNote(text);

    if(noparent)
    {
      note.addToCollection(celldata.collectionid);
    }
    else
    {
      note.parentID = itemid;
    }

    if(tags.length>0)
    {
      for(const tag of tags)
      {
        note.addTag(tag);
      }
    }
    else
    {
      note.addTag(column);
    }

    note.saveTx().then(function(){
      Actions.editnote({data: {noteid: note.id}}, celldata);
    });
  },

  editnote(item: zty.ContextMenuData, celldata: Record<string, any>)
  {
    const window_ = Zotero.getMainWindow();
    const noteurl = "chrome://zotero/content/note.xhtml";
    const noteid = item.data.noteid;

    const io = { itemID: item.data.noteid, collectionID: item.data.collectionid, parentItemKey: item.data.itemkey };

    const name = 'zotero-note-' + item.data.itemid;

    const win = window_.openDialog(noteurl, name, 'chrome,resizable,centerscreen,dialog=false', io);

    win?.addEventListener("close", function(){
      Actions.reload(null, {});
    });
  },

  async opensettings(item: zty.ContextMenuData, celldata: Record<string, any>) {
    Zotero.Utilities.Internal.openPreferences(Config.id);
  },

  async ocrnote(item: zty.ContextMenuData, celldata: Record<string, any>) {
    const collection = Zotero.Items.get(item.data.collectionid);
    const img = (item.data.event.currentTarget || item.data.event.target) as HTMLElement;
    const imagekey = img.dataset.attachmentKey || "";
    const attachmentid = Zotero.Items.getIDFromLibraryAndKey(collection.libraryID, imagekey);

    let attachment = null;
    if(!attachmentid)
    {
      return;
    }
    attachment = Zotero.Items.get(attachmentid);
    const image = attachment?.getFilePath();
    const note = attachment.parentItem;
    let lang = Zotero.Prefs.get('extensions.zenotes.tesseract-language', true);

    if(!lang){lang = "en"} else{lang = String(lang)}

    if (!note || !image) {
      return;
    }
    Tesseract.run(image, lang).then((ocrtext: string) => {
      const children = React.createElement(
        TranslationElement,
        {data: [ocrtext], save: (text)=>{
          // Retrieve the current note's HTML string.
          let currentNoteHTML = note.getNote();

          // Parse the HTML string into a document.
          const parser = new DOMParser();
          const doc = parser.parseFromString(currentNoteHTML, "text/html");

          // Locate the image element by its data-attachment-key.
          const targetImage = doc.querySelector(`img[data-attachment-key="${imagekey}"]`);

          // Create a document fragment containing the OCR text exactly as desired.
          const ocrFragment = doc.createDocumentFragment();
          ocrFragment.appendChild(doc.createElement("br"));
          const boldEl = doc.createElement("b");
          boldEl.textContent = "[OCR]";
          ocrFragment.appendChild(boldEl);
          ocrFragment.appendChild(doc.createElement("br"));
          ocrFragment.appendChild(doc.createTextNode(text));
          ocrFragment.appendChild(doc.createElement("br"));

          if (targetImage) {
            // Insert the OCR content immediately before the image element.
            if (targetImage.parentNode) {
              // targetImage.parentNode.insertBefore(ocrFragment, targetImage);
              targetImage.parentNode.insertBefore(ocrFragment, targetImage.nextSibling);
            }
          } else {
            // If the image wasn't found, just append the OCR content to the body.
            doc.body.appendChild(ocrFragment);
          }

          // Serialize the document back to a string.
          const updatedHTML = doc.body.innerHTML;

          // Save the updated note.
          note.setNote(updatedHTML);
          note.saveTx().then(() => {
            Actions.reload(null, {});
          });
        }}
      );
      item?.data?.callback({
        title: "OCR dialog ["+item.data.service+"]",
        children: children,
        isOpen: true
      });

    }).catch(e=>{
      window.alert("OCR error. status: "+e);
    })
  },

  ocrannotation(item: zty.ContextMenuData, celldata: Record<string, any>)
  {
    Tesseract.run(item.data.annotationimage).then(ocrtext=>{
      const children = React.createElement(
        TranslationElement,
        {data: [ocrtext], save: (text)=>{
          const annotation = Zotero.Items.get(item.data.annotationid);
          const currentcomment = annotation.annotationComment;
          annotation.annotationComment = currentcomment+"\n\n<b>[[OCR]]</b>\n"+text+"\n";
          annotation.saveTx({skipSelect:true}).then(e=>{
            Actions.reload(null, {});
          });
        }}
      );

      item?.data?.callback({
        title: "OCR dialog ["+item.data.service+"]",
        children: children,
        isOpen: true
      });
    }).catch(e=>{
      window.alert("OCR error. status: "+e);
    })
  },

  async customaiprompt(item: zty.ContextMenuData, celldata: Record<string, any>, event: any)
  {
    let target = null;
    let tags = [];
    let noparent = false;

    if(item.data.target=="annotation")
    {
      target = celldata.target.closest(".zcontent");
    }

    if(item.data.target=="note")
    {
      target = celldata.target.closest(".zcontent");
    }

    else if(item.data.target=="cell")
    {
      target = celldata.target.closest("td");
    }

    else if(item.data.target=="row")
    {
      target = celldata.target.closest("tr");
    }

    else if(item.data.target=="column")
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
      target = tr;
    }

    else if(item.data.target=="table")
    {
      target = celldata.target.closest("table");
    }

    if(target)
    {
      const context = item.data.context;
      if(!context)
      {
        return
      }
      context.setLoadingMessage("Loading, please wait...<br/> Or close this window if you want, <br/> and continue working while waiting for a note window to open!");
      context.setIsLoading(true);
      const promptdata = await PromptFormat.data(target, celldata.collectionid);

      CustomAI.prompt(JSON.stringify(promptdata), item.data.key).then((data: any)=>{
        let contents = "[AI output on this "+item.data.target+"]<br/>\n"+data;
        AiNotes.create(item, celldata, contents, ()=>{Actions.reload(null, {})});
        context.setIsLoading(false)
      })
      .catch((e:any)=>{
        window.alert("Error requesting response: \n"+(e.error || e.message || e.code || JSON.stringify(e)));
        context.setIsLoading(false);
      })
    }
  },

  async openaiprompt(item: zty.ContextMenuData, celldata: Record<string, any>, event: any)
  {
    let target = null;
    let tags = [];
    let noparent = false;
    if(item.data.target=="cell")
    {
      target = celldata.target.closest("td");
    }
    else if(item.data.target=="row")
    {
      target = celldata.target.closest("tr");
    }
    else if(item.data.target=="column")
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
      target = tr;
    }
    else if(item.data.target=="table")
    {
      target = celldata.target.closest("table");
    }

    if(target)
    {
      const context = item.data.context;
      if(!context)
      {
        return
      }
      context.setLoadingMessage("Loading, please wait...<br/> Or close this window, <br/> and continue working while waiting for a note window to open!");
      context.setIsLoading(true);
      const promptdata = await PromptFormat.data(target, celldata.collectionid);
      OpenAI.prompt(JSON.stringify(promptdata)).then((data: any)=>{
        let contents = "[AI output on this "+item.data.target+"]<br/>\n"+data;
        AiNotes.create(item, celldata, contents, ()=>{Actions.reload(null, {})});
        context.setIsLoading(false)
      })
      .catch((e:any)=>{
        if(e.status)
        {
          window.alert(e.message);
        }
        context.setIsLoading(false);
      })
    }
  },

  translateannotation(item: zty.ContextMenuData, celldata: Record<string, any>)
  {
    let machine = Google;
    if(item.data.service=="DeepL")
    {
      machine = DeepL;
    }

    const annotation = Zotero.Items.get(item.data.annotationid);
    let lang = Zotero.Prefs.get('extensions.zenotes.translation-language', true) as string;
    machine.translate(item.data.annotationtext, lang || "en").then((data: any)=>{
      const children = React.createElement(
        TranslationElement,
        {data: data, save: (text)=>{
          const currentcomment = annotation.annotationComment || "";
          annotation.annotationComment = currentcomment+"\n\n<b>[[Translation]]</b>\n"+text+"\n";
          annotation.saveTx({skipSelect:true}).then(e=>{
            Actions.reload(null, {});
          });
        }}
      );

      item?.data?.callback({
        title: "Translation dialog ["+item.data.service+"]",
        children: children,
        isOpen: true
      });
    }).catch(e=>{
      window.alert("HTTP error. status: "+(e.status ?? e));
    })
  },

  showannotation(item: zty.ContextMenuData, celldata: Record<string, any>)
  {
    const attachmentid = item.data.attachmentid;
    const annotationpage = item.data.annotationpage;
    const annotationkey = item.data.annotationkey;
    var attachment = Zotero.Items.get(attachmentid);
    if(attachment && annotationkey && annotationpage)
		{
      (Zotero as any).FileHandlers.open(attachment, {
        location: {
          annotationID: annotationkey,
          pageIndex: annotationpage,
        }
      });
    }
    else if(attachment && annotationkey)
    {
      window.alert("The attachment does not seem to have pages. Opening at the last location!");
      (Zotero as any).FileHandlers.open(attachment, {
        location: {
          annotationID: annotationkey
        }
      });
    }
    else
    {
      Zotero.log("Unable to open attachment");
    }
  },

  showattachment(item: zty.ContextMenuData, celldata: Record<string, any>)
  {
    var attachment = Zotero.Items.get(item.data.id);


      /**
        launchURL if linked url instead of imported url
        if(attachment.attachmentLinkMode==Zotero.Attachments.LINK_MODE_LINKED_URL)
      **/
      (Zotero as any).FileHandlers.open(attachment).then((opened:boolean)=>{
        if(!opened)
        {
          const url = attachment.getField('url');
          Zotero.launchURL(url);
        }
      });
  },

  resetwidths(item: zty.ContextMenuData, celldata: Record<string, any>)
  {
    const keyword = "column-width/"+item.data.collectionid+"/";
    Prefs.deleteRecords(keyword).then(e=>{
      Actions.reload(null, {});
    }).catch(e=>{
      Zotero.log("Actions.resetwidths: ");
      Zotero.log(e);
    })
  },

  filterdata(item: zty.ContextMenuData, celldata: Record<string, any>)
  {
    TablePrefs.set(celldata.collectionid, "data-filter", item.data.filter).then((k: any)=>{
      Actions.reload(null, {});
    });
  },

  editannotationcomment(item: zty.ContextMenuData, celldata: Record<string, any>)
  {
    const children = React.createElement(
      AnnotationCommentEditor,
      {html: item.data.annotationcomment, save: (html)=>{
        const annotation = Zotero.Items.get(item.data.annotationid);
        annotation.annotationComment = html;
        annotation.saveTx({skipSelect:true}).then(e=>{
          Actions.reload(null, {});
        });

      }}
    );

    item?.data?.callback({
      title: "Annotation comment editor",
      children: children,
      isOpen: true
    });
  },

  filesafename(name: string): string {
    return name
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9\-]/g, "");
  },

  async showtablesortdialog(item: zty.ContextMenuData, celldata: Record<string, any>)
  {
    const close = () =>{
      item?.data?.callback({
        title: "",
        isOpen: false
      });
    }

    const buttons = [
      {action: ()=>{close(); Actions.reload(item, celldata);}, label: "Reload"},
      {action: ()=>{close()}, label: "Close"},
    ]

    const children = React.createElement(
      TableSortContents,
      {item: item, celldata: celldata, buttons: buttons}
    );

    item?.data?.callback({
      title: "Table sort",
      children: children,
      isOpen: true
    });
  },

  async showcolumnsortdialog(item: zty.ContextMenuData, celldata: Record<string, any>)
  {
    const close = () =>{
      item?.data?.callback({
        title: "",
        isOpen: false
      });
    }
    const allcolumns = item?.data?.headers;
    const buttons = [
      {action: async ()=>{return TablePrefs.set(celldata.collectionid, "hide-key", "[]")}, label: "Show all"},
      {action: async ()=>{return TablePrefs.set(celldata.collectionid, "hide-key", JSON.stringify(allcolumns))}, label: "Hide all"},
      {action: async ()=>{close(); Actions.reload(item, celldata);}, label: "Reload"},
      {action: async ()=>{close()}, label: "Close"},
    ]

    const children = React.createElement(
      ColumnSortContents,
      {item: item, celldata: celldata, buttons: buttons}
    );

    item?.data?.callback({
      title: "Column sort",
      children: children,
      isOpen: true
    });
  },

  async showaidatasettings(item: zty.ContextMenuData, celldata: Record<string, any>)
  {
    const datasettings = DataSettings.generate(item);

    const close = () =>{
      item?.data?.callback({
        title: "",
        isOpen: false
      });
    }

    const handleUpdate = (data: any) =>
    {
      const buttons = [
        {action: ()=>{close()}, label: "Close"},
      ]

      item?.data?.callback({
        title: "AI data settings",
        children: children,
        isOpen: true,
        buttons: buttons
      });
    }

    const children = React.createElement(
      DataSettingDialog,
      {datasettings: datasettings, onUpdate: handleUpdate, collectionid: celldata.collectionid}
    );

    item?.data?.callback({
      title: "AI data settings",
      children: children,
      isOpen: true
    });
  },

  async exportas(item: zty.ContextMenuData, celldata: Record<string, any>)
  {
    const datasettings = DataSettings.generate(item);

    const tablesettings = {
      removetdstyle: {label: "Keep td style", slug: "remove-td-style", options: ["true", "false"], default: "false", icon: FaTableCellsLarge},
      removemainlabels: {label: "Remove main labels", slug: "remove-main-labels", options: ["true", "false"], default: "false", icon: FaTags},
      removesublabels: {label: "Remove sub labels", slug: "remove-sub-labels", options: ["true", "false"], default: "false", icon: FaTag},
      removeempty: {label: "Remove empty elements", slug: "remove-empty-element", options: ["true", "false"], default: "true", icon: FaCircleXmark},
      removeicons: {label: "Remove icons", slug: "remove-group-icons", options: ["true", "false"], default: "false", icon: FaIcons},
      removehighlights: {label: "Remove highlights", slug: "remove-highlights", options: ["true", "false"], default: "false", icon: FaHighlighter},
      createfolder: {label: "Create save folder", slug: "create-folder", options: ["true", "false"], default: "false", icon: FaFolder},
    }

    const close = () =>{
      item?.data?.callback({
        title: "",
        isOpen: false
      });
    }

    const save = async (settings: any)=>{
      const filename = await Exporter.start(item.data.table, item.data.table.dataset.collectionname, settings);
      if(filename)
      {
        Zotero.launchURL("file:///"+filename);
      }
    }

    const handleUpdate = (data: any) =>
    {
      const buttons = [
        {action: ()=>{save(data); close();}, label: "Export"},
        {action: ()=>{close()}, label: "Close"},
      ]

      item?.data?.callback({
        title: "Export setting",
        children: children,
        isOpen: true,
        buttons: buttons
      });
    }

    const children = React.createElement(
      ExportSettingDialog,
      {datasettings: datasettings, tablesettings: tablesettings as Record<string, any>, onUpdate: handleUpdate, collectionid: celldata.collectionid}
    );

    item?.data?.callback({
      title: "Export setting",
      children: children,
      isOpen: true
    });
  }
};

export default Actions;
