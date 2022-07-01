var Zotero = Components.classes["@zotero.org/Zotero;1"]
    .getService(Components.interfaces.nsISupports)
    .wrappedJSObject;

Components.utils.import("resource://gre/modules/osfile.jsm");
Components.utils.import("resource://gre/modules/Services.jsm");

Zotero.ZNotes.settings = new function()
{
    this.lists = {
        show: [],
        hide: [],
        sort: [],
    }
    
    this.load = function()
    {
        this.lists.show = [];
        var vm = this;
        var alltags = ["id", "key", "title", "date", "journal", "author", "creator"];
        alltags = alltags.concat(Zotero.ZNotes.alltags());
        
        var showtagscached = JSON.parse(Zotero.ZNotes.getPref("tag-list-show", "[]")); 
        var hidetagscached = JSON.parse(Zotero.ZNotes.getPref("tag-list-hide", "[]")); 
        var sorttagscached = JSON.parse(Zotero.ZNotes.getPref("tag-list-sort", "[]")); 
        
        this.lists.show = showtagscached;
        this.lists.hide = hidetagscached;
        this.lists.sort = sorttagscached;
        
        var id = 0;
        alltags.forEach(t=>{
            vm.lists.show.push({
                value: t,
                state: "active",
                id: id,
            });
            id++;
        })
        
        this.refresh("show", this.lists.show);
        this.refresh("hide", this.lists.hide);
        this.refresh("sort", this.lists.sort);
    }
    
    this.reindex = function(data)
    {
        var newdata = [];
        var i = 0;
        data.forEach(d=>{
            d.id = i;
            newdata.push(d);
            i++;
        });
        return newdata;
    }
    
    this.moveitem = function(name, direction)
    {
        var box = document.getElementById("tag-box-"+name);
        var listitem = box._currentItem;
        if(listitem)
        {
            var row = JSON.parse(listitem.getAttribute("data-data"));
            var index0 = this.lists[name].findIndex(i => i.id === row.id);
            if(direction=="up")
            {
                var index1 = Math.max(index0-1, 0);
            }
            else /** Down*/
            {
                var index1 = Math.min(index0+1, this.lists[name].length-1);
            }
            var o1 = this.lists[name][index0];
            var o2 = this.lists[name][index1];
            this.lists[name][index1] = o1;
            this.lists[name][index0] = o2;
            this.refresh(name, this.lists[name]);
            box.ensureIndexIsVisible(index1);
            box.selectedIndex = index1;
        }
    }
    
    this.moveto = function(target_name, source_name, listitem)
    {
        var source = this.lists[source_name];
        var target = this.lists[target_name];
        var row = JSON.parse(listitem.getAttribute("data-data"));
        var index = source.findIndex(i => i.id === row.id);
        source.splice(index, 1);
        target.push(row);
        
        /** Reindex and data*/
        this.lists[source_name] = this.reindex(source);
        this.lists[target_name] = this.reindex(target);
        
        this.refresh("show", this.lists.show);
        this.refresh("hide", this.lists.hide);
        this.refresh("sort", this.lists.sort);
    }
    
    this.moveRight = function()
    {
        var box = document.getElementById("tag-box-show");
        var listitem = box._currentItem;
        if(listitem)
        {
            this.moveto("hide", "show", listitem)
        }
    }
    
    this.moveLeft = function()
    {
        var box = document.getElementById("tag-box-hide");
        var listitem = box._currentItem;
        if(listitem)
        {
            this.moveto("show", "hide", listitem)
        }
    }
    
    this.refresh = function(name, boxdata)
    {
        var vm = this;
        var box = document.getElementById("tag-box-"+name);
        box.innerHTML = "";
        var i = 0;
        boxdata.forEach(data=>{
            /** Add headers */
            if(i==0)
            {
                let listhead = document.createElement("listhead");
                let listcols  = document.createElement("listcols");
                box.appendChild(listhead);
                box.appendChild(listcols);
                
                Object.keys(data).forEach(d=>{
                    let listheader = document.createElement("listheader");
                    let listcol = document.createElement("listcol");
                    listheader.setAttribute("label", d);
                    listhead.appendChild(listheader);
                    listcols.appendChild(listcol);
                });
            }
            
            let listitem = document.createElement("listitem");
            
            listitem.setAttribute("data-data", JSON.stringify(data));
            listitem.addEventListener("dblclick", function(e){
                if(name=="hide")
                {
                    vm.moveto("show", name, e.target);
                }
                else if(name=="show")
                {
                    vm.moveto("hide", name, e.target);
                }
            });

            Object.keys(data).forEach(d=>{
                let listcell = document.createElement("listitem");
                listitem.appendChild(listcell);
                listcell.setAttribute("label", data[d]);
            });
            box.appendChild(listitem);
            i++;
        });
    }
    
    this.init = function()
    {
        this.load();
    }
    
}

window.addEventListener('load', function(e) { Zotero.ZNotes.settings.init(); }, false);


