var EXPORTED_SYMBOLS = ["Zotero"];

var Zotero = Components.classes["@zotero.org/Zotero;1"]
    .getService(Components.interfaces.nsISupports)
    .wrappedJSObject;

Components.utils.import("resource://gre/modules/osfile.jsm");
Components.utils.import("resource://gre/modules/Services.jsm");

var znstr = function(name, params)
{
    return Zotero.ZeNotes.ZNStr(name, params);
}

var alert = function(message)
{
    Services.prompt.alert(null, znstr("general.alert.title"), message);
}

var confirm = function(message)
{
    return Services.prompt.confirm(null, znstr("general.confirm.title"), message);
}

Zotero.ZeNotes.settings = new function()
{
    this.lists = {
        show: [],
        hide: [],
        sort: [],
    }
    
    this.infotags = ["id", "key", "title", "date", "journal", "author", "creator", "itemid"]

    this.saveLists = function()
    {
        Zotero.ZeNotes.setPref("tag-lists", JSON.stringify(this.lists));
    }
    
    this.load = function()
    {
        var vm = this;
        var collection = Zotero.ZeNotes.currentCollection();
        return Zotero.ZeNotes.database.getsettingbycolumn("folder", collection).then(r=>{
            if(r.length>0 && Zotero.ZeNotes.openfromdb==true)
            {
                try {
                    vm.lists = JSON.parse(r[0].contents);
                }
                catch(e)
                {
                    vm.lists = JSON.parse("{\"show\": [], \"hide\": [], \"sort\": []}");
                    alert(e);
                }
                Zotero.ZeNotes.openfromdb=false;
            }
            else
            {
                try {
                    vm.lists = JSON.parse(Zotero.ZeNotes.getPref("tag-lists", "{\"show\": [], \"hide\": [], \"sort\": []}"));
                }
                catch(e)
                {
                    vm.lists = JSON.parse("{\"show\": [], \"hide\": [], \"sort\": []}");
                }
            }
            
            vm.fillsaveman();
            var alltags = vm.infotags;

            alltags = alltags.concat(Zotero.ZeNotes.data.alltags()).filter((v, i, a) => a.indexOf(v) === i);
            
            /** Get list of tags from objects */
            var showtags = vm.lists.show.map(function(i) {
                return i.value;
            });
            
            var hidetags = vm.lists.hide.map(function(i) {
                return i.value;
            });
            
            var sorttags = vm.lists.sort.map(function(i) {
                return i.value;
            }).filter((v, i, a) => a.indexOf(v) === i);
            
            var showhidetags = showtags.concat(hidetags).filter((v, i, a) => a.indexOf(v) === i);
            
            var id = vm.lists.show.length;
            alltags.forEach(t=>{
                var type = "tag";
                if(vm.infotags.includes(t))
                {
                    type = "info"
                }
                
                if(!showhidetags.includes(t))
                {
                    vm.lists.show.push({
                        value: t,
                        type: type,
                        id: id,
                    });
                    id++;
                }
            });
            
            var id = vm.lists.show.length;
            alltags.forEach(t=>{
                if(!sorttags.includes(t))
                {
                    vm.lists.sort.push({
                        value: t,
                        order: "asc",
                        id: id,
                    });
                    id++;
                }
            });
            
            vm.refresh("show", vm.lists.show);
            vm.refresh("hide", vm.lists.hide);
            vm.refresh("sort", vm.lists.sort);
        }).catch(e=>{
            alert("settings.load: "+e);
        });
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
        
        /** Save all lists */
        this.saveLists();
        return newdata;
    }
    
    this.deletefromdb = function()
    {
        var id = document.getElementById("saveman-delete-select").parentNode.value;
        var label = document.getElementById("saveman-delete-select").parentNode.label;
        
        if(id.length==0)
        {
            alert(znstr("settings.delete.error.noselection"));
            return;
        }
        
        if(!confirm(znstr("settings.delete.deleting", [label])))
        {
            return;
        }
        
        Zotero.ZeNotes.database.deletesetting(id).then(r=>{
            this.fillsaveman();
            alert(znstr("settings.delete.deleted", [label]));
        });
    }
    
    this.loadsetting = function(column, value)
    {
        var st = this;
        if(value.length==0)
        {
            alert(znstr("settings.load.select"));
            return new Promise(function(resolve, reject) {
                resolve(false);
            });
        }
        
        return new Promise(function(resolve, reject) {
            Zotero.ZeNotes.database.getsettingbycolumn(column, value).then(r=>{
                for(i in r)
                {
                    var value = r[i].contents;
                    var label = r[i].label+" ("+r[i].folder+")";
                    if(value.length>0)
                    {
                        Zotero.ZeNotes.setPref("tag-lists", value);
                        st.lists = JSON.parse(value);
                        st.refresh("show", st.lists.show);
                        st.refresh("hide", st.lists.hide);
                        st.refresh("sort", st.lists.sort);
                        resolve(label);
                    }
                    else
                    {
                        alert(znstr("settings.load.datacorrupted"));
                        resolve(false);
                    }
                }
            }).catch(e=>{
                resolve(false);
            });
        });
    }
    
    this.loadfromdb = function()
    {
        if(!confirm(znstr("setting.load.confirm")))
        {
            return;
        }
        var id = document.getElementById("saveman-load-select").parentNode.value;
        this.loadsetting("id", id).then(label=>{
            if(label)
            {
                alert(znstr("settings.load.loaded", [label]));
            }
            else
            {
                alert("No loading!");
            }
        }).catch(e=>{
            alert("settings.loadfromdb: "+e);
        });
    }
    
    this.savetodb = function()
    {
        var settings = Zotero.ZeNotes.database.getsettings();
        settings.then(r=>{
            /**
            First check if the layout exist.
            */
            var label = document.getElementById("saveman-save-textbox").value;
            var folder = document.getElementById("saveman-folder-textbox").value;
            var exists=false;
            for(i in r)
            {
                if(r[i].label==label)
                {
                    exists = true;
                }
            }
            
            if(exists)
            {
                var yes = confirm(znstr("settings.save.overwritten"))
                if(!yes)
                {
                    return;
                }
            }

            var contents = JSON.stringify(this.lists);
            if(label.length==0)
            {
                alert(znstr("settings.save.inputname"));
                return
            }
            if(contents.length==0)
            {
                alert(znstr("settings.save.datainvalid"));
                return
            }
            Zotero.ZeNotes.database.addsetting(label, contents, folder).then(v=>{
                this.fillsaveman();
                document.getElementById("saveman-save-textbox").value = "";
                alert(znstr("settings.save.saved", [label]));
            });
        });
        return settings;
    }
    
    this.fillsaveman = function()
    {
        Zotero.ZeNotes.database.getsettings().then(r=>{
            var loadbox = document.getElementById("saveman-load-select");
            var delbox = document.getElementById("saveman-delete-select");
            var folderbox = document.getElementById("saveman-folder-textbox");
            if(folderbox)
            {
                folderbox.value = Zotero.ZeNotes.currentCollection();
            }
            
            /* Remove children */
            if(loadbox)
            {
                while (loadbox.firstChild) {
                    loadbox.firstChild.remove()
                }
                loadbox.parentNode.value = "";
            }
            
            if(delbox)
            {
                while (delbox.firstChild) {
                    delbox.firstChild.remove()
                }
                delbox.parentNode.value = "";
            }
            
            for(let i in r)
            {
                var e1 = document.createElement("menuitem");
                var e2 = document.createElement("menuitem");
                var folder = r[i].folder;
                var label = r[i].label;
                var id = r[i].id;
                
                if(!folder)
                {
                    folder="default";
                }
                
                e1.setAttribute("label", label+" ("+folder+")");
                e1.setAttribute("value", id);
                
                e2.setAttribute("label", label+" ("+folder+")");
                e2.setAttribute("value", id);
                
                if(loadbox)
                {
                    loadbox.appendChild(e1);
                }
                
                if(delbox)
                {
                    delbox.appendChild(e2);
                }
            }
        }).catch(e=>{
            alert("settings.fillsaveman :"+e);
        });
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
            this.lists[name] = this.reindex(this.lists[name]);
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
    
    this.toggleorder = function(name)
    {
        var box = document.getElementById("tag-box-"+name);
        var listitem = box._currentItem;
        if(listitem)
        {
            var row = JSON.parse(listitem.getAttribute("data-data"));
            if(row.order=="desc")
            {
                row.order = "asc";
            }
            else
            {
                row.order = "desc";
            }
            var index = this.lists[name].findIndex(i => i.id === row.id);
            this.lists[name][index] = row;
            
            this.refresh(name, this.lists[name]);
            
            box.ensureIndexIsVisible(index);
            box.selectedIndex = index;
            this.saveLists();
        }
    }
    
    this.refresh = function(name, boxdata)
    {
        var vm = this;
        var box = document.getElementById("tag-box-"+name);
        if(!box)
        {
            return;
        }
        box.innerHTML = "";
        var i = 0;
        var hidecols = ["id"];
        boxdata.forEach(data=>{
            /** Add headers */
            if(i==0)
            {
                let listhead = document.createElement("listhead");
                let listcols  = document.createElement("listcols");
                box.appendChild(listhead);
                box.appendChild(listcols);
                
                Object.keys(data).forEach(d=>{
                    if(!hidecols.includes(d))
                    {
                        let listheader = document.createElement("listheader");
                        let listcol = document.createElement("listcol");
                        listheader.setAttribute("label", d);
                        listhead.appendChild(listheader);
                        listcols.appendChild(listcol);
                    }
                });
                /** Add extra header */
                let listheader = document.createElement("listheader");
                let listcol = document.createElement("listcol");
                listheader.setAttribute("label", "  ");
                listhead.appendChild(listheader);
                listcols.appendChild(listcol);
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
                else if(name=="sort")
                {
                    vm.toggleorder("sort");
                }
            });
            
            /** Create table cells */
            Object.keys(data).forEach(d=>{
                if(!hidecols.includes(d))
                {
                    let listcell = document.createElement("listitem");
                    listitem.appendChild(listcell);
                    listcell.setAttribute("label", data[d]);
                }
            });
            box.appendChild(listitem);
            i++;
        });
    }
    
    this.initializesettings = function()
    {
        var vm = this;
        var folder = Zotero.ZeNotes.currentCollection();
        return new Promise(function(resolve, reject) {
            vm.loadsetting("folder", folder).then(label=>{
                if(label)
                {
                    alert(znstr("settings.load.loaded", [label]));
                    resolve(true);
                }
                else
                {
                    alert("No loading!");
                    resolve(false);
                }
            }).catch(e=>{
                alert("settings.initializesettings :"+e);
                resolve(false);
            });
        });
    }
}


