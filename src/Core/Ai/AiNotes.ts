import TablePrefs from '../TablePrefs'
import Actions from '../Actions'

const AiNotes = {
  editnote(item: zty.ContextMenuData, note: any, callback: any, discardable=true)
  {
    const window_ = Zotero.getMainWindow();
    const noteurl = "chrome://zotero/content/note.xhtml";

    const io = { itemID: note.id, collectionID: item.data.collectionid, parentItemKey: item.data.itemkey };

    const name = 'zotero-note-' + item.data.id;

    const win = window_.openDialog(noteurl, name, 'chrome,resizable,centerscreen,dialog=false', io);
    if(!win)
    {
      window_.alert("Could not open note!");
      return;
    }
    win.dataset = win.dataset || {};
    win.dataset.noteid = note.id;
    
    win.addEventListener("close", function(event){
      const target = event.currentTarget || event.target;
      const noteid = (target as Window).dataset.noteid || "";
      if(discardable)
      {
        AiNotes.deletenote(win, noteid, callback);
      }
      else
      {
        callback();
      }
    });
    
    win.addEventListener("load", function(event){
      const target = (event.currentTarget || event.target) as Window;
      target.focus();
      const noteeditor = target.document.getElementById("zotero-note-editor")?.querySelector("#note-editor");
      const ztoolbar = target.document.createElement("div");
      ztoolbar.setAttribute("style", "padding: 0.5em; text-align: right; border-top: solid 1px #ccc;");
      
      
      if(discardable)
      {
        const button = target.document.createElement("button");
        button.dataset.noteid  = note.id;
        button.innerHTML = "Save";
        button.setAttribute("style", "margin-right: 0.3em;");
        button.addEventListener("click", function(e){
          win?.close();
          callback();
        })
        
        const closebutton = target.document.createElement("button");
        closebutton.dataset.noteid  = note.id;
        closebutton.innerHTML = "Discard";
        closebutton.setAttribute("style", "margin-right: 0.3em;");
        closebutton.addEventListener("click", function(e){
          AiNotes.deletenote(win, (e.target as HTMLElement).dataset.noteid || "", callback);
          win?.close();
        })
        ztoolbar.appendChild(button);
        ztoolbar.appendChild(closebutton);
        noteeditor?.parentElement?.parentElement?.appendChild(ztoolbar);
      }
    });
  },
  
  deletenote(win: Window, noteid: string, callback: any)
  {
    const window_ = win || Zotero.getMainWindow();
    if(!noteid)
    {
      window_.alert("Note not found!");
      return;
    }
    
    if(window_.confirm("Are you sure you want to discard this result?"))
    {
      Zotero.Items.erase(parseInt(noteid)).then(function(){
        callback();
      });
    }
    else
    {
      callback();
    }
  },

  async create(item: zty.ContextMenuData, celldata: Record<string, any>, contents:string, callback: any) {
    if(item.data.target=="comment")
    {
      return this.comment(item, celldata, contents, callback);
    }
    else if(item.data.target=="commentpart")
    {
      return this.commentpart(item, celldata, contents, callback);
    }
    else if(item.data.target=="quote")
    {
      return this.quote(item, celldata, contents, callback);
    }
    else if(item.data.target=="note" || item.data.target=="notepart")
    {
      return this.note(item, celldata, contents, callback);
    }
    else if(item.data.target=="cell")
    {
      return this.cellnote(item, celldata, contents, callback);
    }
    else if(item.data.target=="row")
    {
      return this.rownote(item, celldata, contents, callback);
    }
    else if(item.data.target=="column")
    {
      return this.columnnote(item, celldata, contents, callback);
    }
    else if(item.data.target=="table")
    {
      return this.tablenote(item, celldata, contents, callback);
    }
  },
  
  async cellnote(item: zty.ContextMenuData, celldata: Record<string, any>, contents: any, callback: any)
  {
    let note = new Zotero.Item('note');
    note.setNote(contents);
    note.parentID = celldata.itemid;
    note.addTag(celldata.column);
    note.saveTx().then(function(){
      AiNotes.editnote(item, note, callback);
    });
  },
  
  async note(item: zty.ContextMenuData, celldata: Record<string, any>, contents: any, callback: any)
  {
    const note = Zotero.Items.get(item.data.noteid);
    note.setNote(note.getNote()+"<br/><br/>\n\n"+contents);
    note.parentID = celldata.itemid;
    note.addTag(celldata.column);
    note.saveTx().then(function(){
      const discardable = false;
      AiNotes.editnote(item, note, callback, discardable);
    });
  },
  
  async rownote(item: zty.ContextMenuData, celldata: Record<string, any>, contents: any, callback: any)
  {
    let note = new Zotero.Item('note');
    note.setNote(contents);
    note.parentID = celldata.itemid;
    note.addTag("[AI row notes]");
    note.saveTx().then(function(){
      AiNotes.editnote(item, note, callback);
    });
  },
  
  async columnnote(item: zty.ContextMenuData, celldata: Record<string, any>, contents: any, callback: any)
  {
    const parentrow = await this.getrow(celldata.collectionid, celldata.libraryid);
    if(!parentrow)
    {
      Zotero.log("Could not create parent row!");
      return;
    }
    
    let note = new Zotero.Item('note');
    note.setNote(contents);
    note.parentID = parentrow.id;
    note.addTag(celldata.column);
    note.saveTx().then(function(){
      AiNotes.editnote(item, note, callback);
    });
  },
  
  async tablenote(item: zty.ContextMenuData, celldata: Record<string, any>, contents: any, callback: any)
  {
    let note = new Zotero.Item('note');
    note.setNote(contents);
    note.addToCollection(celldata.collectionid);
    note.addTag("[AI table notes]");
    note.saveTx().then(function(){
      AiNotes.editnote(item, note, callback);
    });
  },
  
  async quote(item: zty.ContextMenuData, celldata: Record<string, any>, contents: any, callback: any)
  {
    const annotationid = celldata.target.closest('[data-annotationid]').dataset.annotationid;
    const annotation = Zotero.Items.get(annotationid);
    item.data.annotationcomment = annotation.annotationComment+"<br/><br/>"+contents;
    item.data.annotationid = celldata.target.closest('[data-annotationid]').dataset.annotationid;
    item.data.callback = (value: any) => {
      if(item.data.context)
      {
        item.data.context.setCommonDialogState?.(value);
      }
    }
    Actions.editannotationcomment(item, celldata);
  },
  
  async comment(item: zty.ContextMenuData, celldata: Record<string, any>, contents: any, callback: any)
  {
    const annotationid = celldata.target.closest('[data-annotationid]').dataset.annotationid;
    const annotation = Zotero.Items.get(annotationid);
    item.data.annotationcomment = annotation.annotationComment+"<br/><br/>"+contents;
    item.data.annotationid = celldata.target.closest('[data-annotationid]').dataset.annotationid;
    item.data.callback = (value: any) => {
      if(item.data.context)
      {
        item.data.context.setCommonDialogState?.(value);
      }
    }
    Actions.editannotationcomment(item, celldata);
  },
  
  async commentpart(item: zty.ContextMenuData, celldata: Record<string, any>, contents: any, callback: any)
  {
    const annotationid = celldata.target.closest('[data-annotationid]').dataset.annotationid;
    const annotation = Zotero.Items.get(annotationid);
    item.data.annotationcomment = annotation.annotationComment+"<br/><br/>"+contents;
    item.data.annotationid = celldata.target.closest('[data-annotationid]').dataset.annotationid;
    item.data.callback = (value: any) => {
      if(item.data.context)
      {
        item.data.context.setCommonDialogState?.(value);
      }
    }
    Actions.editannotationcomment(item, celldata);
  },
  
  async getrow(collectionid: number, libraryid: number)
  { 
    const scope = new Zotero.Search({libraryID: libraryid}); 
    scope.addCondition('collectionID', 'is', String(collectionid));
    
    const search = new Zotero.Search();
    search.addCondition('itemType', 'is', "document");
    search.addCondition('title', 'is', "[Ai column notes]");
    search.setScope(scope, true);
    
    const items = await search.search();
    if (items.length > 0) 
    {
      let row = await Zotero.Items.getAsync(items[0]);
      await this.showrow(String(collectionid), row.id);
      return row;
    } else {
      return this.newrow(collectionid);
    }
  },
  
  async showrow(collectionid: string, itemid: number)
  {
    const k = await TablePrefs.get(collectionid, "row-hide-key", "[]");
    const hkeys = JSON.parse(k);
    const index = hkeys.indexOf(String(itemid));
    if (index > -1) {
      hkeys.splice(index, 1);
    }
    return TablePrefs.set(collectionid, "row-hide-key", JSON.stringify([...new Set(hkeys)]));
  },
  
  async newrow(collectionid: number)
  {
    const row = new Zotero.Item("document");
    row.setField("title", "[Ai column notes]");
    await row.saveTx();
    row.addToCollection(collectionid);
    return row;
  }
}

export default AiNotes;

