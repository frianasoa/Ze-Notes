var Zotero = Components.classes["@zotero.org/Zotero;1"].getService(Components.interfaces.nsISupports).wrappedJSObject;

var notes = new function()
{
    this.loadmenu = function(){
        $.contextMenu({
            selector: '.context-menu-one', 
            callback: function(key, options) {
                vm.actions(key, options)
            },
            items: {
                "edit": {name: "Edit", icon: "fa-edit"},
                "showentry": {name: "Show entry", icon: "fa-file-lines"},
                "showfile": {name: "Show attached file", icon: "fa-file-pdf"},
                "hidecolumn": {name: "Hide column", icon: "fa-eye-slash"},
                "sep1": "---------",
                "quit": {name: "Exit", icon: "fa-xmark"},
            }
        });

        $('.context-menu-one').on('click', function(e){
            console.log('clicked', this);
        })
        
        /** Context menu for info*/
        var vm = this;
        $.contextMenu({
            selector: '.context-menu-two', 
            callback: function(key, options) {
                vm.actions(key, options)
            },
            items: {
                "showentry": {name: "Show entry", icon: "fa-file-lines"},
                "showfile": {name: "Show attached file", icon: "fa-file-pdf"},
                "hidecolumn": {name: "Hide column", icon: "fa-eye-slash"},
                "sep1": "---------",
                "quit": {name: "Exit", icon: "fa-xmark"},
            }
        });

        $('.context-menu-one').on('click', function(e){
            console.log('clicked', this);
        }); 
    }

    this.loaddata = function()
    {
        var infotags = Zotero.ZNotes.settings.infotags;
        var data = Zotero.ZNotes.getdata();
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
        document.getElementById("content").appendChild(table);
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
            if(filename)
            {
                window.open(filename);
            }
        }
        else if(key=="hidecolumn")
        {
            var lists = Zotero.ZNotes.settings.lists;
            var index = lists.show.findIndex(i => i.value === column);
            var row = JSON.stringify(lists.show[index]);
            row.id = lists.hide.length;
            lists.show.splice(index, 1);
            lists.hide.push(JSON.parse(row));
            lists.show = Zotero.ZNotes.settings.reindex(lists.show);
            lists.hide = Zotero.ZNotes.settings.reindex(lists.hide);
            Zotero.ZNotes.settings.lists = lists;
            Zotero.ZNotes.settings.saveLists();
            Zotero.ZNotes.reload();
        }
        else
        {
            alert(key);
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
            Zotero.ZNotes.reload();
        });
    }
    this.createnote = function(itemid, column)
    {
        var vm = this;
        var note = new Zotero.Item('note'); 
        note.setNote('New note');
        note.parentKey = itemid;
        note.addTag(column);
        note.saveTx().then(function(){
            vm.opennote(note.id);
        });
    }
}

window.addEventListener("load", function(){
    notes.loaddata();
    notes.loadmenu()
})