Zotero.ZNotes = new function(){
	this.notewin = null;
    this.init = function(){
        
    };
    this.maximize = function(notewin)
    {
        Zotero.ZNotes.notewin = notewin;
        notewin.resizeTo(screen.width, screen.height);
        notewin.moveTo(0, 0);
        Zotero.ZNotes.noteframe = document.getElementById("note-frame");
    };
    this.show = function(paneID, action) {
        var io = {pane: paneID, action: action};
        
        window.openDialog('chrome://znotes/content/notes.xul',
            'notewin',
            'chrome,titlebar,toolbar,centerscreen,dialog,width:900,height:900' + Zotero.Prefs.get('browser.preferences.instantApply', true) ? 'dialog=no' : 'modal', io
        );
    };
    
    this.openPreferenceWindow = function(paneID="", action="") {
        var io = {pane: paneID, action: action};
        window.openDialog('chrome://znotes/content/settings.xul',
            'znote-settings',
            'chrome,titlebar,toolbar,centerscreen' + Zotero.Prefs.get('browser.preferences.instantApply', true) ? 'dialog=no' : 'modal', io
        );
    };
    this.data = function()
    {
        return {
            "columns": ["Title", "Date", "Methods", "Regions"],
            "values":[
                {
                    "Title": "XUL templates ",
                    "Date": "2022",
                    "Methods":"Meth",
                    "Regions": "Region",
                },
                {
                    "Title": "title 2",
                    "Date":"2022",
                    "Methods":"Meth 2",
                    "Regions": "Region 2",
                }
            ]
        }
        
    };
    
    this.reload = function()
    {
        Zotero.ZNotes.notewin.document.getElementById("note-frame").contentWindow.location.reload();
    };
    
    this.loaddata = function(noteframe)
    {
        
        
    };
    
    this.loaddatarich = function(notewin)
    {
        var data = Zotero.ZNotes.data();
        
        var listbox = notewin.document.getElementById("note-list");
        
        var listhead = notewin.document.createElement("listhead");
        var listcols = notewin.document.createElement("listcols");
         
        listbox.appendChild(listhead);
        // listbox.appendChild(listcols);
         
        var cmenu = {
            edit: notewin.document.getElementById("context-menu-edit"),
            add: notewin.document.getElementById("context-menu-add"),
        }
        
        cmenu.edit.appendChild(document.createElement("menupopup"))
        cmenu.add.appendChild(document.createElement("menupopup"))
        
        data["columns"].forEach(c=>{
            /** Create columns */
            let listheader = notewin.document.createElement("listheader");
            listheader.setAttribute("label", c);
            listhead.appendChild(listheader);
            
            let listcol = notewin.document.createElement("listcol");
            listcol.setAttribute("flex",  "2");
            listcols.appendChild(listcol);
            
            /** Create edit/add menuitems */
            let medit = notewin.document.createElement("menuitem");
            let madd = notewin.document.createElement("menuitem");
            medit.setAttribute("label", c)
            madd.setAttribute("label", c)
            cmenu.edit.firstChild.appendChild(medit);
            cmenu.add.firstChild.appendChild(madd);
            
        });
        
        /** Create value rows */
        data["values"].forEach(v=>{
            let richlistitem = notewin.document.createElement("richlistitem");
            listbox.appendChild(richlistitem);
            data["columns"].forEach(c=>{
                let listcell = notewin.document.createElement("listcell");
                richlistitem.appendChild(listcell);
                if(c in v){
                    listcell.setAttribute("label", v[c]);
                }
                else
                {
                    listcell.setAttribute("label", " ");
                }
                //listcell.setAttribute("contextmenu", "item-context-menu");
            });
        }); 

    };
    
    this.loaddatatree = function(notewin)
    {
        var data = Zotero.ZNotes.data();
        
        var tree = notewin.document.getElementById("notetree");
        var treecols = notewin.document.createElement("treecols");
        var treechildren = notewin.document.createElement("treechildren");
        tree.appendChild(treecols);
        tree.appendChild(treechildren);
         
        var cmenu = {
            edit: notewin.document.getElementById("context-menu-edit"),
            add: notewin.document.getElementById("context-menu-add"),
        }
        
        
        tree.setAttribute("contextmenu", "item-context-menu");
        
        cmenu.edit.appendChild(document.createElement("menupopup"))
        cmenu.add.appendChild(document.createElement("menupopup"))
        
        data["columns"].forEach(c=>{
            /** Create columns */
            let treecol = notewin.document.createElement("treecol");
            treecol.setAttribute("id", "note-column-"+c);
            treecol.setAttribute("label", c);
            treecol.setAttribute("flex",  "1");
            treecols.appendChild(treecol);
            
            /** Create edit/add menuitems */
            let medit = notewin.document.createElement("menuitem");
            let madd = notewin.document.createElement("menuitem");
            medit.setAttribute("label", c)
            madd.setAttribute("label", c)
            cmenu.edit.firstChild.appendChild(medit);
            cmenu.add.firstChild.appendChild(madd);
            
        });
        
        /** Create value rows */
        data["values"].forEach(v=>{
            let treeitem = notewin.document.createElement("treeitem");
            let treerow = notewin.document.createElement("treerow");
            treechildren.appendChild(treeitem);
            treeitem.appendChild(treerow);
            
            treerow.setAttribute("collapsed", false);
            
            data["columns"].forEach(c=>{
                let treecell = notewin.document.createElement("treecell");
                treerow.appendChild(treecell);
                if(c in v){
                    treecell.setAttribute("label", v[c]);
                }
            });
        }); 
    };
    this.contextmenu = function(e)
    {
        // Zotero.ZNotes.openPreferenceWindow();
        // Zotero.ZNotes.notewin.alert(Object.keys(e.target));
        Zotero.ZNotes.notewin.alert(e.target._lastSelectedRow);
        // e.target.setAttribute("popup", "item-context-menu");
    }
};

// Initialize the utility
window.addEventListener('load', function(e) { Zotero.ZNotes.init(); }, false);
