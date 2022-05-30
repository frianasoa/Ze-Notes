var Zotero = Components.classes["@zotero.org/Zotero;1"]
    .getService(Components.interfaces.nsISupports)
    .wrappedJSObject;

Components.utils.import("resource://gre/modules/osfile.jsm");
Components.utils.import("resource://gre/modules/Services.jsm");

Zotero.ZNotes.settings = new function()
{
    this.init = function()
    {
        try {
            this.inittags();
            this.initsorttags();
        }
        catch {
            
        }
    }
    
    this.clearlist=function(name)
    {
        var box = document.getElementById("tag-box-"+name);
        while(box.getRowCount()>0)
        {
            box.removeItemAt(0);
        };
    }
    
    this.inittags = function()
    {
        var boxshow = document.getElementById("tag-box-show");
        var boxhide = document.getElementById("tag-box-hide");
        
        let showlisthead = document.createElement("listhead");
        let showlistheader_value = document.createElement("listheader");
        showlisthead.appendChild(showlistheader_value);
        boxshow.appendChild(showlisthead);
        showlistheader_value.setAttribute("label", "Value");
        
        let hidelisthead = document.createElement("listhead");
        let hidelistheader_value = document.createElement("listheader");
        hidelisthead.appendChild(hidelistheader_value);
        boxhide.appendChild(hidelisthead);
        hidelistheader_value.setAttribute("label", "Value");
        
        /** Add default fields */   
        var alltags = Zotero.ZNotes.settings.alltags();

        var cachedhidetags = JSON.parse(Zotero.ZNotes.getPref("hide-tag-list", "[]"));        
        var cachedshowtags = JSON.parse(Zotero.ZNotes.getPref("show-tag-list", "[]")); 
                
        var newtags = alltags.concat(cachedhidetags).filter(x => cachedshowtags.includes(x));        
        boxshow.ondblclick = function(e){
            Zotero.ZNotes.settings.move(e.target);
        }
        
        boxhide.ondblclick = function(e){
            Zotero.ZNotes.settings.move(e.target);
        }
        
        /** Add cached show tag*/
        cachedshowtags.forEach(t=>{
            if(!cachedhidetags.includes(t))
            {
                let listitem = document.createElement("listitem");
                let listcell = document.createElement("listcell");
                listitem.setAttribute("parent", "show");
                
                listcell.setAttribute("label", t);
                listitem.appendChild(listcell);
                boxshow.appendChild(listitem);
            }
        });
        
        /** Add new tags*/
        alltags.forEach(t=>{
            if(!cachedshowtags.includes(t) && !cachedhidetags.includes(t))
            {
                let listitem = document.createElement("listitem");
                listitem.setAttribute("parent", "show");
                
                let listcell = document.createElement("listcell");
                listcell.setAttribute("label", t);
                
                listitem.appendChild(listcell);
                boxshow.appendChild(listitem);
            }
        });
        
        /** Add cached hide tags*/
        cachedhidetags.forEach(t=>{
            if(alltags.includes(t))
            {
                let listitem = document.createElement("listitem");
                listitem.setAttribute("parent", "hide");
                
                let listcell = document.createElement("listcell");
                listcell.setAttribute("label", t);
                
                listitem.appendChild(listcell);
                boxhide.appendChild(listitem);
            }
        });
    }
    
    this.alltags = function()
    {
        var defaultfields = ["id", "key", "title", "date", "journal", "author", "creator"];
        return defaultfields.concat(Zotero.ZNotes.alltags());
    }
    
    this.initsorttags = function()
    {
        this.clearlist("sort");
        var boxsort = document.getElementById("tag-box-sort");
        var cachedsorttags = JSON.parse(Zotero.ZNotes.getPref("sort-tag-list", "[]"));
        var cachedshowtags = JSON.parse(Zotero.ZNotes.getPref("show-tag-list", "[]"));
        var cachedhidetags = JSON.parse(Zotero.ZNotes.getPref("show-tag-list", "[]"));
        var alltags = Zotero.ZNotes.settings.alltags();
        
        
        let listhead = document.createElement("listhead");
        let listheader_value = document.createElement("listheader");
        let listheader_direction = document.createElement("listheader");
        listhead.appendChild(listheader_value);
        listhead.appendChild(listheader_direction);
        boxsort.appendChild(listhead);
        
        listheader_value.setAttribute("label", "Value");
        listheader_direction.setAttribute("label", "Direction");
        
        /** Add cached sort tags*/
        cachedsorttags.forEach(t=>{
            if(alltags.includes(t))
            {
                let listitem = document.createElement("listitem");
                let listcell = document.createElement("listitem");
                let listcell_dir = document.createElement("listitem");
                
                listcell.setAttribute("label", t);
                listcell.setAttribute("parent", "sort");
                
                listitem.appendChild(listcell);
                listitem.appendChild(listcell_dir);
                boxsort.appendChild(listitem);
            }
        });
        
        /** Add cached show tags*/
        cachedshowtags.forEach(t=>{
            if(alltags.includes(t) && !cachedsorttags.includes(t))
            {
                let listitem = document.createElement("listitem");
                listitem.setAttribute("label", t);
                listitem.setAttribute("parent", "sort");
                boxsort.appendChild(listitem);
            }
        });
        
        /** Add other tags*/
        alltags.forEach(t=>{
            if(!cachedsorttags.includes(t) && !cachedshowtags.includes(t))
            {
                let listitem = document.createElement("listitem");
                listitem.setAttribute("label", t);
                listitem.setAttribute("parent", "sort");
                boxsort.appendChild(listitem);
            }
        });
    }
    
    /** Move element up and down within a listbox*/
    this.listMove = function(name, direction="down")
    {
        var box = document.getElementById("tag-box-"+name);
        var listitem = box._currentItem;
        
        if(direction=="down")
        {
            var newindex = box.selectedIndex+1;
            
            if(listitem.selected && newindex<box.getRowCount())
            {
                var item = box.removeItemAt(box.selectedIndex);
                var newitem = box.insertItemAt(newindex, "", item);
                
                item.childNodes.forEach(c=>{
                    let listcell = document.createElement("listcell", c.getAttribute("label"));
                    listcell.setAttribute("label", c.getAttribute("label"));
                    newitem.appendChild(listcell);
                });
                newitem.removeChild(newitem.firstChild);
                
                // newitem.childNodes.forEach(c=>{
                    // newitem.removeChild(c);
                // });
                // box.selectedItem.childNodes.forEach(listcell=>{
                    // newitem.appendChild(listcell);
                // });
                // box.selectedItem = newitem;
                // this.saveLists();
            }
        }
        else if(direction=="up")
        {
            if(listitem.selected)
            {
                var newindex = box.selectedIndex-1;
                if(newindex==-1)
                {
                    newindex=0;
                }
                
                var item = box.removeItemAt(box.selectedIndex);
                var newitem = box.insertItemAt(newindex, item.getAttribute("label")); 
                box.selectedItem = newitem;
                this.saveLists();
            }
        }
    }
    
    this.moveRight = function()
    {
        var boxshow = document.getElementById("tag-box-show");
        var boxhide = document.getElementById("tag-box-hide"); 
        var listitem = boxshow._currentItem;
        if(listitem.selected)
        {
            boxhide.appendChild(listitem);
            boxhide.selectedItem = listitem;
            listitem.setAttribute("parent", "hide");
        }
        this.saveLists();
    }
    
    this.moveLeft = function()
    {
        var boxshow = document.getElementById("tag-box-show");
        var boxhide = document.getElementById("tag-box-hide"); 
        var listitem = boxhide._currentItem;
        if(listitem.selected)
        {
            boxshow.appendChild(listitem);
            boxshow.selectedItem = listitem;
            listitem.setAttribute("parent", "show");
            
        }
        this.saveLists();
    }
    
    this.move = function(listitem=null)
    {
        var boxshow = document.getElementById("tag-box-show");
        var boxhide = document.getElementById("tag-box-hide");        
        if(listitem.getAttribute("parent")=="show")
        {
            boxhide.appendChild(listitem);
            boxhide.selectedIndex = boxhide.getRowCount()-1;
            listitem.click();
            listitem.setAttribute("parent", "hide");
        }
        else
        {
            boxshow.appendChild(listitem);
            boxshow.selectedIndex = boxshow.getRowCount()-1;
            listitem.click();
            listitem.setAttribute("parent", "show");
        }
        this.saveLists();
    }
    
    this.listFromBox = function(name)
    {
        var box = document.getElementById("tag-box-"+name);
        var list = []
        box.querySelectorAll("listitem").forEach(listitem=>{
            list.push(listitem.getAttribute("label"));
        });
        return list;
    }
    
    this.visibletags = function()
    {
        var alltags = Zotero.ZNotes.settings.alltags();
        var cachedhidetags = JSON.parse(Zotero.ZNotes.getPref("hide-tag-list", "[]"));        
        var cachedshowtags = JSON.parse(Zotero.ZNotes.getPref("show-tag-list", "[]"));        
        var tags = [];
        
        /** Add cached show tag*/
        cachedshowtags.forEach(t=>{
            if(!cachedhidetags.includes(t))
            {
                tags.push(t);
            }
        });
        
        /** Add new tags*/
        alltags.forEach(t=>{
            if(!cachedshowtags.includes(t) && !cachedhidetags.includes(t))
            {
                tags.push(t);
            }
        });
        return tags;
    }
    
    this.saveLists = function(names=['hide', 'show', 'sort'])
    {
        names.forEach(name=>{
            Zotero.ZNotes.setPref(name+"-tag-list", JSON.stringify(this.listFromBox(name)));
        });
    }
}

window.addEventListener('load', function(e) { Zotero.ZNotes.settings.init(); }, false);


