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
        if(Zotero.ZeNotes.getPref("scrolltop"))
        {
            $('#zn-body-wrapper').animate({
                scrollTop: Zotero.ZeNotes.getPref("scrolltop", 0),
                scrollLeft: Zotero.ZeNotes.getPref("scrollleft", 0),
            }, 500);
        }
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
                "hidecolumn": {name: "Hide column", icon: "fa-eye-slash"},
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
            var lists = Zotero.ZeNotes.settings.lists;
            var index = lists.show.findIndex(i => i.value === column);
            var row = JSON.stringify(lists.show[index]);
            row.id = lists.hide.length;
            lists.show.splice(index, 1);
            lists.hide.push(JSON.parse(row));
            lists.show = Zotero.ZeNotes.settings.reindex(lists.show);
            lists.hide = Zotero.ZeNotes.settings.reindex(lists.hide);
            Zotero.ZeNotes.settings.lists = lists;
            Zotero.ZeNotes.settings.saveLists();
            notes.reload();
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
        Zotero.ZeNotes.setPref("scrolltop", $('#zn-body-wrapper').scrollTop());
        Zotero.ZeNotes.setPref("scrollleft", $('#zn-body-wrapper').scrollLeft());
        window.location.reload();
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