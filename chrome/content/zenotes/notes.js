var znstr = function(name, params)
{
    return Zotero.ZeNotes.ZNStr(name, params);
}

var notes = new function()
{
    this.init = function()
    {
        var vm = this;
        vm.resize();
        vm.loaddata().then(d=>{
            vm.loadmenu();
            Zotero.ZeNotes.notewin = window;
            window.document.title+=" - in \""+Zotero.ZeNotes.currentCollection()+"\"";
            if(Zotero.ZeNotes.getPref("scrolltop"))
            {
                $('#zn-body-wrapper').animate({
                    scrollTop: Zotero.ZeNotes.getPref("scrolltop", 0),
                    scrollLeft: Zotero.ZeNotes.getPref("scrollleft", 0),
                }, 500);
            }
            
            $("#zn-body-wrapper").bind('scroll', function() {
                notes.savescroll();
            });
        }).catch(e=>{
            alert("notes.init: "+e);
        });
        
        if(Zotero.ZeNotes.openfromdb==true)
        {
            var collection = Zotero.ZeNotes.currentCollection();
            Zotero.ZeNotes.database.getsettingbycolumn("folder", collection).then(r=>{
                if(r.length>0)
                {
                    Zotero.ZeNotes.setPref("tag-lists", r[0].contents);
                }
            }).catch(e=>{
                alert("notes.init: "+e);
            });
        }
    }
    
    this.resize = function()
    {
        resizeTo(screen.availWidth, screen.availHeight);
        moveTo(0, 0);
    }
    
    this.loadmenu = function(){
        $.contextMenu({
            selector: '.context-menu-header', 
            className: "zn-menubar",
            callback: function(key, options) {
                vm.actions(key, options)
            },
            items: {
                "copycell": {name: "Copy entire cell", icon: "fa-clone"},
                "copysel": {name: "Copy selection", icon: "fa-copy"},
                "sep0": "---------",
                "hidecolumn": {name: "Hide column", icon: "fa-eye-slash"},
                "sep1": "---------",
                "reload": {name: "Refresh page", icon: "fa-sync"},
                "settings": {name: "Open settings", icon: "fa-cog"},
            }
        });
        
        $.contextMenu({
            selector: '.context-menu-one', 
            className: "zn-menubar",
            callback: function(key, options) {
                vm.actions(key, options)
            },
            items: {
                "edit": {name: "Edit note", icon: "fa-pencil-alt"},
                "editpdfnote": {name: "Edit annotation", icon: "fa-edit"},
                "sep0": "---------",
                "showfile": {name: "Show attached files", icon: "fa-file-pdf"},
                "showentry": {name: "Show entry", icon: "fa-file-lines"},
                "sep2": "---------",
                "hidecolumn": {name: "Hide column", icon: "fa-eye-slash"},
                "deletenote": {name: "Delete note", icon: "fa-trash"},
                "sep3": "---------",
                "copycell": {name: "Copy entire cell", icon: "fa-clone"},
                "copyquote": {name: "Copy direct quote", icon: "fa-copy"},
                "copysel": {name: "Copy selection", icon: "fa-copy"},
                "sep4": "---------",
                "reload": {name: "Refresh page", icon: "fa-sync"},
                "settings": {name: "Open settings", icon: "fa-cog"},
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
                "copycell": {name: "Copy entire cell", icon: "fa-clone"},
                "copysel": {name: "Copy selection", icon: "fa-copy"},
                "sep4": "---------",
                "reload": {name: "Refresh page", icon: "fa-sync"},
                "settings": {name: "Open settings", icon: "fa-cog"},
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

    this.loaddata = async function()
    {
        var loaded = await Zotero.ZeNotes.settings.load().catch(e=>{
            alert("notes.loaddata: "+e);
        })
        var infotags = Zotero.ZeNotes.settings.infotags;
        var data = await Zotero.ZeNotes.data.get();
        var table = document.createElement("table");
        var trh = document.createElement("tr");
        table.id = "notes-table"
        table.appendChild(trh);

        data["columns"].forEach(c=>{
            var tdh = document.createElement("th");
            tdh.innerHTML = c;
            tdh.className = "context-menu-header";
            tdh.dataset.column = c;
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
                td.dataset.filenames = JSON.stringify(v.filenames);
                td.dataset.filekey = v.filekey;
                td.querySelectorAll(".annotation").forEach(a=>{
                    a.addEventListener("mouseover", function(e){
                        e.target.parentNode.dataset.attachmentid = e.target.dataset.attachmentid;
                        e.target.parentNode.dataset.attachmentkey = e.target.dataset.attachmentkey;
                        e.target.parentNode.dataset.attachmentpage = e.target.dataset.page;
                        e.target.parentNode.dataset.annotationkey = e.target.dataset.key;
                        e.target.parentNode.dataset.annotationdomid = e.target.id;
                    });
                });
                tr.appendChild(td);
            });
        }); 
        document.getElementById("zn-body").appendChild(table);
        
        return loaded;
    }
    
    this.choosefile = function(filenames)
    {
        var ol = document.createElement("ol");
        for(i in filenames)
        {
            var li = document.createElement("li");
            var span = document.createElement("span");
            span.innerHTML = " "+filenames[i].path.split(/[\\/]/).pop()+" ";
            
            var i1 = document.createElement("i");
            var i2 = document.createElement("i");
            
            var extern = document.createElement("button");
            var zot = document.createElement("button");
            
            i1.className = "fa fa-file-pdf";
            i2.className = "fa fa-z";
            
            extern.innerHTML = "External PDF App ";
            extern.appendChild(i1);
            
            zot.innerHTML = "Zotero PDF App ";
            zot.appendChild(i2);
            
            extern.dataset.url = filenames[i].path;
            zot.dataset.id = filenames[i].id;
                        
            extern.onclick = function(e){
                $("#dialog-message").dialog("close");
                window.openDialog("file:///"+e.target.dataset.url);
            }
            zot.onclick = function(e){
                var attachment = Zotero.Items.get(e.target.dataset.id)
                Zotero.OpenPDF.openToPage(attachment).then(()=>{
                    $("#dialog-message").dialog("close");
                });
            }
            li.appendChild(span);
            li.appendChild(document.createTextNode(" "));
            li.appendChild(extern);
            li.appendChild(document.createTextNode(" "));
            li.appendChild(zot);
            ol.appendChild(li);
        };
        this.dialog("Choose file", ol); 
    }
    
    this.dialog = function(title, message)
    {
        document.getElementById("dialog-message").querySelector("#dialog-message-content").innerHTML = "";
        document.getElementById("dialog-message").querySelector("#dialog-message-content").appendChild(message)
        return $("#dialog-message").dialog({
            modal: true,
            title: title,
            width: 700,
            height: 300,
            buttons: {
                Close: function() {
                    $(this).dialog("close");
                }
            }
        });
    }
    
    this.actions = function(key, options)
    {
        var td = options.$trigger.get(0);
        var column = td.dataset.column;
        var itemid = td.dataset.itemid;
        var itemkey = td.dataset.itemkey;
        var attachmentid = td.dataset.attachmentid;
        var attachmentkey = td.dataset.attachmentkey;
        var annotationkey = td.dataset.annotationkey;
        var annotationpage = td.dataset.annotationpage;
        var annotationdomid = td.dataset.annotationdomid;
        
        var filekey = td.dataset.filekey;
        var notekey = td.dataset.notekey;
        
        try
        {
            var filenames = JSON.parse(td.dataset.filenames);
        }
        catch(e)
        {
            var filenames=[];
        }
        
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
        else if(key=="editpdfnote")
        {
            var attachment = Zotero.Items.get(attachmentid);
            if(!annotationkey)
            {
                alert("Annotation not found!");
                return;
            }
            Zotero.OpenPDF.openToPage(attachment, annotationpage, annotationkey).then(opened=>{
            }).catch(e=>{
                alert("notes.actions :"+e);
            });
        }
        else if(key=="showfile")
        {
            this.choosefile(filenames);
        }
        else if(key=="reload")
        {
            Zotero.ZeNotes.reload();
        }
        else if(key=="settings")
        {
            Zotero.ZeNotes.opensettings();
        }
        else if(key=="hidecolumn")
        {
            if(!confirm("You can show hidden columns in Edit->Preferences\nDo you want to hide "+column+"?"))
            {
                return;
            }
            
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
        else if(key=="copyquote")
        {
            var quote = document.getElementById(annotationdomid);
            var range = document.createRange();
            range.selectNode(quote);
            window.getSelection().removeAllRanges();
            window.getSelection().addRange(range);
            document.execCommand("copy");
            window.getSelection().removeAllRanges();
        }
        else if(key=="copysel")
        {
            document.execCommand('copy');
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
            Zotero.ZeNotes.closetab();
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
                alert("Cannot attach a note to '"+type+"'");
                return;
            }
            var show = Zotero.ZeNotes.settings.lists.show;
            var column = "";
            show.some(function(c){
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
        var fromdb = false;
        Zotero.ZeNotes.settings.load();
        Zotero.ZeNotes.setPref("scrolltop", $('#zn-body-wrapper').scrollTop());
        Zotero.ZeNotes.setPref("scrollleft", $('#zn-body-wrapper').scrollLeft());
        window.location.reload();
    }
    
    this.savescroll = function()
    {
        Zotero.ZeNotes.setPref("scrolltop", $('#zn-body-wrapper').scrollTop());
        Zotero.ZeNotes.setPref("scrollleft", $('#zn-body-wrapper').scrollLeft());
    }
    
    this.copy = function(elt)
    {
        var range = document.createRange();
        range.selectNode(elt);
        window.getSelection().addRange(range);
        document.execCommand('copy');
    }
}

window.addEventListener("load", function(e){
    notes.init();
});

window.addEventListener("unload", function(){
    Zotero.ZeNotes.notewin=undefined;
})