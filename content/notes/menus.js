Menus = {
	load(){
		this.openTabs = [];
		this.veil = document.createElement("div");
		this.veil.innerHTML = "Loading, please wait ...";
		this.veil.style = "width: 0; height: 0; background-color: rgba(255, 255, 255, 0.7); z-index:1000; position: absolute; top:0; left: 0; text-align: center; vertical-align: middle; display: none;";
		document.getElementById("zn-page-body").appendChild(this.veil);
		
		/**
		Element to hide (row or column)
		*/
		var tohide = "column";
		if(Zotero.ZeNotes.Prefs.get("vertical-table")=="true" || Zotero.ZeNotes.Prefs.get("vertical-table")==true)
		{
			tohide = "row";
		}
		
		$.contextMenu({
            selector: '.context-menu-header', 
            className: "zn-menubar",
            callback: function(key, options) {
                Menus.actions(key, options)
            },
            items: {
                "copycell": {name: "Copy entire cell", icon: "fa-clone"},
                "copysel": {name: "Copy selection", icon: "fa-copy"},
                "copy": {name: "Copy table", icon: "fa-copy"},
                "sep0": "---------",
                "hidecolumn": {name: "Hide "+tohide, icon: "fa-eye-slash"},
                "sep1": "---------",
                "reload": {name: "Refresh page", icon: "fa-sync"},
                "settings": {name: "Open settings", icon: "fa-cog"},
            }
        });
		
		var items0 = {
			"edit": {name: "Edit note", icon: "fa-pencil-alt"},
			"editpdfnote": {name: "Edit annotation", icon: "fa-edit"},
			"sep": "---------",
		}
		
		var items_ai = {}

		if(Zotero.ZeNotes.Prefs.getb("bard-api-key")!="google-translate-key")
		{
			var tlcode = Zotero.ZeNotes.Prefs.get("target-language");
			var tl = "";
			for(a of Languages.list())
			{
				if(tlcode.toUpperCase()==a.code.toUpperCase())
				{
					tl = a.name;
				}
			}
			
			items_ai["translate-google-en"] = {name: "Translate to "+tl+" (Google)", icon: "fa-language"};
			items_ai["sep-ai-02"] = "---------";
		}
		
		if(Zotero.ZeNotes.Prefs.getb("bard-api-key")!="")
		{
			items_ai["paraphrase-bard"] = {name: "Paraphrase annotation (Bard)", icon: "fa-language"};
			items_ai["sep-ai-01"] = "---------";
		}

		var items1 = {
			"showfile": {name: "Show attached files", icon: "fa-file-pdf"},
			"showentry": {name: "Show entry", icon: "fa-file-lines"},
			"sep2": "---------",
			"hidecolumn": {name: "Hide "+tohide, icon: "fa-eye-slash"},
			"deletenote": {name: "Delete note", icon: "fa-trash"},
			"sep3": "---------",
			"copycell": {name: "Copy entire cell", icon: "fa-clone"},
			"copyquote": {name: "Copy direct quote", icon: "fa-copy"},
			"copysel": {name: "Copy selection", icon: "fa-copy"},
			"copy": {name: "Copy table", icon: "fa-copy"},
			"sep4": "---------",
			"reload": {name: "Refresh page", icon: "fa-sync"},
			"settings": {name: "Open settings", icon: "fa-cog"},
			// "quit": {name: "Exit", icon: "fa-xmark"},
		}
		
		var items = Object.assign({}, items0, items_ai);
		items = Object.assign({}, items, items1);
        
        $.contextMenu({
            selector: '.context-menu-one', 
            className: "zn-menubar",
            callback: function(key, options) {
                Menus.actions(key, options)
            },
            items: items,
        });

        $('.context-menu-one').on('click', function(e){
            console.log('clicked', this);
        });
        
        $.contextMenu({
            selector: '.context-menu-two', 
            className: "zn-menubar",
            callback: function(key, options) {
                Menus.actions(key, options)
            },
            items: {
                "showentry": {name: "Show entry", icon: "fa-file-lines"},
                "showfile": {name: "Show attached file", icon: "fa-file-pdf"},
                "hidecolumn": {name: "Hide "+tohide, icon: "fa-eye-slash"},
                "sep1": "---------",
                "copycell": {name: "Copy entire cell", icon: "fa-clone"},
                "copysel": {name: "Copy selection", icon: "fa-copy"},
                "copy": {name: "Copy table", icon: "fa-copy"},
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
                Menus.actions(key, options)
            },
            items: {
                "saveasxls": {name: "Export as xls...", icon: "fa-file-excel"},
                "saveascsv": {name: "Export as csv...", icon: "fa-file-csv"},
                "saveasdoc": {name: "Export as doc...", icon: "fa-file-word"},
                "saveashtml": {name: "Export as html...", icon: "fa-file-code"},
                "saveasmarkdown": {name: "Export as markdown", icon: "fa-markdown", items: {
                    "saveasmarkdownnoicon": {name: "Simple", icon: "fa-markdown"},
                    "saveasmarkdown": {name: "With icon", icon: "fa-markdown"},
                    "sep": "---",
                    "saveasmarkdownhtml": {name: "With html [full]", icon: "fa-markdown"},
                    "saveasmarkdownhtmlicon": {name: "With html [icon]", icon: "fa-markdown"},
                    "saveasmarkdownhtmlnoicon": {name: "With html [no icon]", icon: "fa-markdown"},
                    },
                },
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
                Menus.actions(key, options)
            },
            items: {
                "copy": {name: "Copy table", icon: "fa-copy"},
                "addrow": {name: "Add item", icon: "fa-circle-plus"},
                "sep": "-----",
				"find-in-page": {name: "Find in page", icon: "fas fa-magnifying-glass"},
                "sep2": "-----",
                "preferences": {name: "Preferences", icon: "fa-cog"},
            }
        });
    },
	
	loading(){
		this.veil.style.width = "100%";
		this.veil.style.height = "100%";
		this.veil.style.display = "table-cell";
	},
	
	loaded()
	{
		this.veil.style.width = "0";
		this.veil.style.height = "0";
		this.veil.style.display = "none";
	},
	
	openToPage(attachmentid, annotationpage, annotationkey){
		var attachment = Zotero.Items.get(attachmentid);
		Zotero.OpenPDF.openToPage(attachment, annotationpage, annotationkey);
	},
	
	actions(key, options)
    {
		var tohide = "column";
		var isvertical = Zotero.ZeNotes.Prefs.get("vertical-table");
		if( isvertical=="true" || isvertical==true);
		{
			tohide = "row";
		}
		
		var td = options.$trigger.get(0);
		var column = td.dataset.column;
        var itemid = td.dataset.itemid;
        var itemkey = td.dataset.itemkey;
        var attachmentid = td.dataset.attachmentid;
        var attachmentkey = td.dataset.attachmentkey;
        var annotationkey = td.dataset.annotationkey;
        var annotationpage = td.dataset.annotationpage;
        var annotationpagelabel = td.dataset.pagelabel;
        var annotationid = td.dataset.annotationid;
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
			let win = Zotero.getMainWindow();
			if (win) {
				win.ZoteroPane.selectItems([itemid]);
				win.Zotero_Tabs.select('zotero-pane');
				win.focus();
			}
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
			// New page to prevent page jump back. Will default to original openToPage when Zotero 7 is stable.
			// Zotero.OpenPDF.openToPage(attachment, annotationpagelabel, annotationkey);
			this.openToPage(parseInt(attachmentid), parseInt(annotationpage), annotationkey)
        }
		
		
		else if(key=="translate-google-en")
		{
			if(!annotationkey)
            {
                alert("Annotation not found!");
                return;
            }
			
			if(Zotero.ZeNotes.Prefs.getb("google-translate-key")=="")
			{
				alert("Please set API key first.\nGo to ZeNotes > Settings > General Settings > AI API settings");
				return;
			}
			
			var annotation = Zotero.Items.get(annotationid);
			var currentcomment = annotation.annotationComment;
			if(currentcomment==null)
			{
				currentcomment = "";
			}
			var tl = Zotero.ZeNotes.Prefs.get("target-language");
			Zotero.ZeNotes.Ai.Google.translate(annotation["annotationText"], tl).then(r=>{
				var table = AiUi.createdialog(annotation, currentcomment, r, "g-translate");
				Dialog.open(table, function(){}, "Choose translation [Google]", "close");
			}).catch(r=>{
				var html = "";
				if(Array.isArray(r))
				{
					html = r.join("<br/>");
				}
				else
				{
					html="-"+r;
				}
				Dialog.open(html, function(){
				});
			});
		}
		
		else if(key=="paraphrase-bard")
		{
			if(!annotationkey)
            {
                alert("Annotation not found!");
                return;
            }
			
			if(Zotero.ZeNotes.Prefs.getb("bard-api-key")=="")
			{
				alert("Please set API key first.\nGo to ZeNotes > Settings > General Settings > AI API settings");
				return;
			}
			
			var annotation = Zotero.Items.get(annotationid);
			var currentcomment = annotation.annotationComment;
			if(currentcomment==null)
			{
				currentcomment = "";
			}
			Zotero.ZeNotes.Ai.Bard.paraphrase(annotation["annotationText"]).then(r=>{
				var table = AiUi.createdialog(annotation, currentcomment, r, "bard");
				Dialog.open(table, function(){}, "Choose paraprahse [Bard]", "close");
			}).catch(r=>{
				var html = "";
				if(Array.isArray(r))
				{
					html = r.join("<br/>");
				}
				else
				{
					html="-"+r;
				}
				Dialog.open(html, function(){
				});
			});
		}
		
        else if(key=="showfile")
        {
            this.choosefile(filenames);
        }
        else if(key=="reload")
        {
            Zotero.ZeNotes.Ui.reload();
        }
        else if(key=="settings")
        {
            Zotero.ZeNotes.Ui.openpreferences();
        }
        else if(key=="hidecolumn")
        {
            if(!confirm("You can show hidden "+tohide+" in Edit->Preferences\nDo you want to hide "+column+"?"))
            {
                return;
            }
			
			var c = Zotero.getActiveZoteroPane().getSelectedCollection();
			this.collection = "All documents";
			this.collectionid = "all-documents";
			if(c!=undefined && c.name!=undefined)
			{
				this.collection = c.name;
				this.collectionid = c.id;
			}
			
			Zotero.ZeNotes.Database.hidecolumn(this.collectionid, this.collection, column).then(()=>{
				Zotero.ZeNotes.Ui.reload();
			})
        }
        else if(key=="deletenote")
        {
            if(confirm("Are you sure you want to delete this entry?\n"+column))
            {
                Zotero.Items.erase(notekey).then(function(){
                    // notes.reload();
					Zotero.ZeNotes.Ui.reload();
                });
            }
        }
        
        else if(key=="preferences")
        {
            Zotero.ZeNotes.Ui.openpreferences();
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
		
        else if(key=="find-in-page")
        {
            Find.show();
        }
        
        else if(key=="saveasxls" ){
            Io.download("xls");
        }
        
        else if(key=="saveascsv" ){
            Io.download("csv");
        }
        
        else if(key=="saveashtml"){
            Io.download("html");
        }
        
        else if(key=="saveasmarkdownnoicon"){
            Io.download("markdown", []);
        }
        
        else if(key=="saveasmarkdown"){
            Io.download("markdown", ["link-icon"]);
        }
        
        else if(key=="saveasmarkdownhtml"){
            Io.download("markdown", ["html", "style", "link-icon"]);
        }
        
        else if(key=="saveasmarkdownhtmlicon"){
            Io.download("markdown", ["html", "link-icon"]);
        }
        
        else if(key=="saveasmarkdownhtmlnoicon"){
            Io.download("markdown", ["html"]);
        }
        
        else if(key=="saveasdoc"){
            Io.download("doc");
        }

        else if(key=="close")
        {
            Zotero.ZeNotes.Ui.closetab();
        }
        else
        {
            // alert(key);
        }
    },
	
	async addrow()
    {
        var io = { dataIn: { search: '', name }, dataOut: null, singleSelection: true};
        window.openDialog('chrome://zotero/content/selectItemsDialog.xul','','chrome,modal', io);
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
			
			var notes = await Zotero.ZeNotes.Data.get();
			var usersettings = await Notes.getsettings();
			var columns = notes["selected_tags"];
			columns = Notes.tableutils.removehiddenandsort(columns, usersettings);
			
			var column = "Introduction";
			
			if(notes["selected_tags"].length>0){
				column = notes["selected_tags"][0];
			}
			
			if(columns.length>0)
			{
				column = columns[0]
			}
			
            // var show = Zotero.ZeNotes.settings.lists.show;
            // var column = "";
            // show.some(function(c){
                // column = c.value;
                // return c.type=="tag"
            // });
            this.createnote(itemkey, column);
        }
    },
    
    opennote(itemID, col, parentKey)
    {
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
		
		var noteurl = "chrome://zotero/content/note.xhtml";
		
		if (Zotero.platformMajorVersion < 102) {
			noteurl = "chrome://zotero/content/note.xul";
		}
		
        var io = { itemID: itemID, collectionID: col, parentItemKey: parentKey };
		var win = window.openDialog(noteurl, name, 'chrome,resizable,centerscreen,dialog=false', io);
		
        win.addEventListener("close", function(){
			Zotero.ZeNotes.Ui.reload();
        });
    },
    
    createnote(itemid, column)
    {
        var note = new Zotero.Item('note'); 
		note.setNote("&lt;&lt;"+column+"&gt;&gt;<br/>New note");
        note.parentKey = itemid;
        note.addTag(column);
        note.saveTx().then(function(){
            Menus.opennote(note.id);
        });
    },
	
	savescroll()
    {
        Zotero.ZeNotes.setPref("scrolltop", $('#zn-body-wrapper').scrollTop());
        Zotero.ZeNotes.setPref("scrollleft", $('#zn-body-wrapper').scrollLeft());
    },
    
    copy(elt)
    {
        var range = document.createRange();
        range.selectNode(elt);
        window.getSelection().addRange(range);
        document.execCommand('copy');
    },
	
	choosefile(filenames)
    {
        var ol = document.createElement("ol");
        for(i in filenames)
        {
            var li = document.createElement("li");
            var span = document.createElement("div");
            span.innerHTML = " "+filenames[i].path.split(/[\\/]/).pop()+" ";
			span.className = "z-attachment-name";
            
            var i1 = document.createElement("i");
            var i2 = document.createElement("i");
            
            var extern = document.createElement("a");
            var zot = document.createElement("a");
            
            i1.className = "fa fa-file-pdf";
            i2.className = "fa fa-z";
			
			extern.className = "z-button";
			zot.className = "z-button";
            
            extern.appendChild(i1);
			extern.appendChild(document.createTextNode(" External PDF Reader"));
			
            zot.appendChild(i2);
			zot.appendChild(document.createTextNode(" Zotero PDF Reader"));
            
            extern.dataset.url = filenames[i].path;
            zot.dataset.id = filenames[i].id;
                        
            extern.onmouseover = function(e){
				extern.href = "file:///"+e.target.dataset.url;
            }
            
            zot.onmouseover = function(e){
				zot.href = "#";
            }
			
            extern.onclick = function(e){
				$("#dialog-message").dialog("close");
            }
			
            zot.onclick = function(e){
                var attachment = Zotero.Items.get(e.target.dataset.id)
                Zotero.OpenPDF.openToPage(attachment, 0).then(()=>{
                    $("#dialog-message").dialog("close");
                });
            }
            li.appendChild(span);
            li.appendChild(document.createElement("br"));
            li.appendChild(extern);
            li.appendChild(document.createTextNode("  "));
            li.appendChild(zot);
            ol.appendChild(li);
        };
        this.dialog("Choose file", ol); 
    },
	
	dialog (title, message)
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
}

window.addEventListener("load", function(){
	Menus.load();
})