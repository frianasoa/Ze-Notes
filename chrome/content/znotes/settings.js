var Zotero = Components.classes["@zotero.org/Zotero;1"]
    .getService(Components.interfaces.nsISupports)
    .wrappedJSObject;

Components.utils.import("resource://gre/modules/osfile.jsm");
Components.utils.import("resource://gre/modules/Services.jsm");

Zotero.ZNotes.settings = new function()
{
    this.init = function()
    {
        this.hidetags();
    }
    
    this.hidetags = function()
    {
        var boxshow = document.getElementById("tag-box-show");
        var boxhide = document.getElementById("tag-box-hide");
        
        var alltags = Zotero.ZNotes.alltags();
        
        /** Add default fields */
        defaultfields = ["id", "key", "title", "date", "journal", "author"]
        alltags = defaultfields.concat(alltags);
        
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
                listitem.setAttribute("label", t);
                listitem.setAttribute("parent", "show");
                boxshow.appendChild(listitem);
            }
        });
        
        /** Add new tags*/
        alltags.forEach(t=>{
            if(!cachedshowtags.includes(t) && !cachedhidetags.includes(t))
            {
                let listitem = document.createElement("listitem");
                listitem.setAttribute("label", t);
                listitem.setAttribute("parent", "show");
                boxshow.appendChild(listitem);
            }
        });
        
        /** Add cached hide tags*/
        cachedhidetags.forEach(t=>{
            if(alltags.includes(t))
            {
                let listitem = document.createElement("listitem");
                listitem.setAttribute("label", t);
                listitem.setAttribute("parent", "hide");
                boxhide.appendChild(listitem);
            }
        });
    }
    
    this.moveUp = function()
    {
        var boxshow = document.getElementById("tag-box-show");
        var listitem = boxshow._currentItem;
        if(listitem.selected)
        {
            var newindex = boxshow.selectedIndex-1;
            var item = boxshow.removeItemAt(boxshow.selectedIndex);
            var newitem = boxshow.insertItemAt(newindex, item.getAttribute("label")); 
            boxshow.selectedItem = newitem;
        }
        this.saveLists();
    }
    
    this.moveDown = function()
    {
        var boxshow = document.getElementById("tag-box-show");
        var listitem = boxshow._currentItem;
        if(listitem.selected)
        {
            var newindex = boxshow.selectedIndex+1;
            var item = boxshow.removeItemAt(boxshow.selectedIndex);
            var newitem = boxshow.insertItemAt(newindex, item.getAttribute("label"));
            boxshow.selectedItem = newitem;
        }
        this.saveLists();
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
            boxhide.selectedIndex = boxhide.children.length-1;
            listitem.click();
            listitem.setAttribute("parent", "hide");
        }
        else
        {
            boxshow.appendChild(listitem);
            boxshow.selectedIndex = boxshow.children.length-1;
            listitem.click();
            listitem.setAttribute("parent", "show");
        }
        this.saveLists();
    }
    
    this.getHideList = function()
    {
        var boxhide = document.getElementById("tag-box-hide");
        var list = []
        boxhide.querySelectorAll("listitem").forEach(listitem=>{
            list.push(listitem.getAttribute("label"));
        });
        return list;
    }
    
    this.getShowList = function()
    {
        var boxshow = document.getElementById("tag-box-show");
        var list = []
        boxshow.querySelectorAll("listitem").forEach(listitem=>{
            list.push(listitem.getAttribute("label"));
        });
        return list;
    }
    
    this.visibletags = function()
    {
        var alltags = Zotero.ZNotes.alltags();
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
    
    this.saveLists = function()
    {
        Zotero.ZNotes.setPref("hide-tag-list", JSON.stringify(this.getHideList()));
        Zotero.ZNotes.setPref("show-tag-list", JSON.stringify(this.getShowList()));
    }
}

window.addEventListener('load', function(e) { Zotero.ZNotes.settings.init(); }, false);


