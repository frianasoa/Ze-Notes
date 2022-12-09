var Zotero = Components.classes["@zotero.org/Zotero;1"].getService(Components.interfaces.nsISupports).wrappedJSObject;

var notes = new function()
{
    this.init = function()
    {
        this.resize();
        this.loaddata();
        this.loadmenu();
        Zotero.ZeNotes.notewin = window;
        window.document.title+=" - in \""+Zotero.ZeNotes.collection+"\"";
        
        $('#zn-body-wrapper').animate({
            scrollTop: Zotero.ZeNotes.settings.getpref("scrolltop", 0),
            scrollLeft: Zotero.ZeNotes.settings.getpref("scrollleft", 0)
        });
                
        $("#zn-body-wrapper").bind('scroll', function() {
            notes.savescroll();
        }); 
    }
    
    this.resize = function()
    {
        resizeTo(screen.availWidth, screen.availHeight);
        moveTo(0, 0);
    }
    
    this.loadmenu = function(){
        $.contextMenu({
            selector: '.context-menu-one', 
            className: "zn-menubar",
            callback: function(key, options) {
                vm.actions(key, options)
            },
            items: {
                "edit": {name: "Edit", icon: "fa-edit"},
                "showentry": {name: "Show entry", icon: "fa-file-lines"},
                "showfile": {name: "Show attached file", icon: "fa-file-pdf"},
                "sep0": "---------",
                "hidecolumn": {name: "Hide column", icon: "fa-eye-slash"},
                "deletenote": {name: "Delete note", icon: "fa-trash"},
                "sep1": "---------",
                "copycell": {name: "Copy cell", icon: "fa-eye-slash"},
                // "quit": {name: "Exit", icon: "fa-xmark"},
            }
        });

        $('.context-menu-one').on('click', function(e){
            console.log('clicked', this);
        })
        
        /** Context menu for info*/
        var vm = this;
        $.contextMenu({
            selector: '.context-menu-two', 
            className: "zn-menubar",
            callback: function(key, options) {
                vm.actions(key, options)
            },
            items: {
                "showentry": {name: "Show entry", icon: "fa-file-lines"},
                "showfile": {name: "Show attached file", icon: "fa-file-pdf"},
                "hidecolumn": {name: "Hide column", icon: "fa-eye-slash"},
                "sep1": "---------",
                "copycell": {name: "Copy cell", icon: "fa-eye-slash"},
                // "quit": {name: "Exit", icon: "fa-xmark"},
            }
        });

        $('.context-menu-one').on('click', function(e){
            console.log('clicked', this);
        }); 
        
        /** Menu file items*/
        $.contextMenu({
            selector: '#zn-menu-file',
            trigger: "left",
            className: "zn-menubar",
            callback: function(key, options) {
                vm.actions(key, options)
            },
            items: {
                "saveasxls": {name: "Export as xls...", icon: "fa-file-excel"},
                "saveascsv": {name: "Export as csv...", icon: "fa-file-csv"},
                "saveasdoc": {name: "Export as doc...", icon: "fa-file-word"},
                "saveashtml": {name: "Export as html...", icon: "fa-file-code"},
                "sep": "-----",
                "close": {name: "Exit", icon: "fa-xmark"},
            }
        });
        
        /** Menu edit items*/
        $.contextMenu({
            selector: '#zn-menu-edit',
            trigger: "left",
            className: "zn-menubar",
            callback: function(key, options) {
                vm.actions(key, options)
            },
            items: {
                "copy": {name: "Copy table", icon: "fa-copy"},
                "addrow": {name: "Add row", icon: "fa-circle-plus"},
                "sep": "-----",
                "preferences": {name: "Preferences", icon: "fa-cog"},
            }
        });
    }

    this.loaddata = function()
    {
        var infotags = Zotero.ZeNotes.settings.infotags;
        var data = Zotero.ZeNotes.data.get();
        var table = document.createElement("table");
        var trh = document.createElement("tr");
        table.id = "notes-table"
        table.appendChild(trh);
        
        data["columns"].forEach(c=>{
            var tdh = document.createElement("th");
            tdh.innerHTML = c;
            trh.appendChild(tdh)
        });

        data["values"].forEach(v=>{
            var tr = document.createElement("tr");
            table.appendChild(tr);
            data["columns"].forEach(c=>{
                let td = document.createElement("td");
                
                if(c in v){
                    td.innerHTML = v[c];
                }
                
                if(infotags.includes(c))
                {
                    td.dataset.type = "info";
                    td.className = "context-menu-two info";
                }
                else
                {
                    td.dataset.type = "tag";
                    td.className = "context-menu-one tag";
                }
                
                var span = td.querySelector(".notekey");
                
                if(span)
                {
                    td.dataset.notekey = span.innerText;
                    span.parentNode.removeChild(span);
                }
                else
                {
                    td.dataset.notekey = "";
                }
                
                td.dataset.column = c;
                td.dataset.itemid = v.itemid;
                td.dataset.itemkey = v.key;
                td.dataset.filename = v.filename;
                tr.appendChild(td);
            });
        }); 
        document.getElementById("zn-body").appendChild(table);
    }
    
    this.actions = function(key, options)
    {
        var td = options.$trigger.get(0);
        var column = td.dataset.column;
        var itemid = td.dataset.itemid;
        var itemkey = td.dataset.itemkey;
        var filename = td.dataset.filename;
        var notekey = td.dataset.notekey;
        
        
        if(key=="showentry")
        {
            var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"].getService(Components.interfaces.nsIWindowMediator);
            var lastWin = wm.getMostRecentWindow("navigator:browser");
            if (!lastWin) {
                window.open();
                var newWindow = wm.getMostRecentWindow("navigator:browser");
                var b = newWindow.getBrowser();
                return;
            }
            lastWin.ZoteroPane.selectItem(itemid, false, true);
            lastWin.focus();
        }
        else if(key=="edit")
        {
            if(notekey=="")
            {
                this.createnote(itemkey, column);
            }
            else
            {
                this.opennote(notekey);
            }
        }
        else if(key=="showfile")
        {
            filename = filename.replace("\\", "/");
            if(filename=="false")
            {
                alert("File not found!");
            }
            else
            {
                window.openDialog("file:///"+filename);
            }
            
        }
        else if(key=="hidecolumn")
        {
            // if(!confirm("You can show hidden columns in Edit->Preferences\nDo you want to hide "+column+"?"))
            // {
                // return;
            // }
            
            var lists = Zotero.ZeNotes.settings.getpref("tag-lists", {"show": [], "hide": [], "sort": []});
            var index = lists.show.findIndex(i => i.value === column);
            var row = lists.show[index];
            
            row.id = lists.hide.length;
            lists.show.splice(index, 1);
            lists.hide.push(row);
            lists.show = Zotero.ZeNotes.settings.reindex(lists.show);
            lists.hide = Zotero.ZeNotes.settings.reindex(lists.hide);
            Zotero.ZeNotes.settings.setpref("tag-lists", lists).then(()=>{
                notes.reload();
            });
        }
        else if(key=="deletenote")
        {
            if(confirm("Are you sure you want to delete this entry?\n"+column))
            {
                Zotero.Items.erase(notekey).then(function(){
                    notes.reload();
                });
            }
        }
        
        else if(key=="preferences")
        {
            Zotero.ZeNotes.opensettings();
        }
        else if(key=="copy")
        {
            var table = document.getElementById("notes-table");
            this.copy(table);
        }
        
        else if(key=="copycell")
        {
            this.copy(td);
        }
        
        else if(key=="addrow")
        {
            this.addrow();
        }
        
        else if(key=="saveasxls" ){
            Zotero.ZeNotes.download("xls");
        }
        
        else if(key=="saveascsv" ){
            Zotero.ZeNotes.download("csv");
        }
        
        else if(key=="saveashtml"){
            Zotero.ZeNotes.download("html");
        }
        
        else if(key=="saveasdoc"){
            Zotero.ZeNotes.download("doc");
        }

        else if(key=="close")
        {
            window.close();
        }
        else
        {
            // alert(key);
        }
    }
    
    this.addrow = function()
    {
        var io = { dataIn: { search: '', name }, dataOut: null, singleSelection: true};
        window.openDialog('chrome://zotero/content/selectItemsDialog.xul','','chrome,modal',io);
        var itemid = io.dataOut[0];
            
        if(itemid!=undefined)
        {
            var item = Zotero.Items.get(itemid);
            var itemkey = item.key;
            var type = item.toJSON().itemType
            
            if(["note", "attachment"].includes(type))
            {
                alert("Cannot attach a not to '"+type+"'");
                return;
            }
            var lists = Zotero.ZeNotes.settings.getpref("tag-lists", {"show": [], "hide": [], "sort": []});
            var column = "";
            lists.show.some(function(c){
                column = c.value;
                return c.type=="tag"
            });
            this.createnote(itemkey, column);
        }
    }
    
    this.opennote = function(itemID, col, parentKey)
    {
        var vm = this;
        var pane = Zotero.getActiveZoteroPane();
        if (!pane.canEdit()) {
			pane.displayCannotEditLibraryMessage();
			return;
		}
		
		var name = null;
		
		if (itemID) {
			let w = pane.findNoteWindow(itemID);
			if (w) {
				w.focus();
				return;
			}
			
			// Create a name for this window so we can focus it later
			//
			// Collection is only used on new notes, so we don't need to
			// include it in the name
			name = 'zotero-note-' + itemID;
		}
        var io = { itemID: itemID, collectionID: col, parentItemKey: parentKey };
		var win = window.openDialog('chrome://zotero/content/note.xul', name, 'chrome,resizable,centerscreen,dialog=false', io);
        win.addEventListener("close", function(){
            notes.reload();
        });
    }
    
    this.createnote = function(itemid, column)
    {
        var vm = this;
        var note = new Zotero.Item('note'); 
        note.setNote("&lt;&lt;"+column+"&gt;&gt;<br/>New note");
        note.parentKey = itemid;
        note.addTag(column);
        note.saveTx().then(function(){
            vm.opennote(note.id);
        });
    }
    
    this.reload = function()
    {
        Zotero.ZeNotes.settings.setpref("scrolltop", $('#zn-body-wrapper').scrollTop());
        Zotero.ZeNotes.settings.setpref("scrollleft", $('#zn-body-wrapper').scrollLeft());
        window.location.reload();
    }
    
    this.savescroll = function()
    {
        Zotero.ZeNotes.settings.setpref("scrolltop", $('#zn-body-wrapper').scrollTop());
        Zotero.ZeNotes.settings.setpref("scrollleft", $('#zn-body-wrapper').scrollLeft());
    }
    
    this.copy = function(elt)
    {
        var range = document.createRange();
        range.selectNode(elt);
        window.getSelection().addRange(range);
        document.execCommand('copy');
    }
}

window.addEventListener("load", function(){
    notes.init();
});