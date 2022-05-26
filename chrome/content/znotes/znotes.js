Zotero.ZNotes = new function(){
	this.notewin = null;
    this.init = function(){
        
    };
    this.maximize = function(notewin)
    {
        Zotero.ZNotes.notewin = notewin;
        notewin.resizeTo(screen.width, screen.height);
        notewin.moveTo(0, 0);
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
    this.tojson = function(items)
    {
        var znotes = [];
        var taglist = [];
        for(i in items)
        {
            var item = items[i];            
            
            var notes = item.getNotes();
            if(notes.length>0)
            {
                try {
                    var author = "";
                    var creators = item.getCreatorsJSON();
                    var date = item.getField("date", true).substr(0, 4);
                    var journal = item.getField("publicationTitle");
                    var title = item.getField("title");
                    var key = item.getField("key");
                    var id = item.getID();
                    var filename = "";
                    
                    var attachmentIDs = item.getAttachments();
                    if(attachmentIDs.length>0)
                    {
                        var attachment = Zotero.Items.get(attachmentIDs[0]);
                        var path = attachment.attachmentPath;
                        filename = Zotero.Attachments.resolveRelativePath(path);
                    }
                    
                    if(creators.length==1)
                    {
                        author = creators[0].lastName;
                        
                    }
                    else if(creators.length==2)
                    {
                        author = creators[0].lastName+" and "+creators[1].lastName;
                    }
                    else if(creators.length>0)
                    {
                        author = creators[0].lastName+" et al."
                    }
                    
                    if(date.length>0)
                    {
                        author+=" ("+date+")";
                    }
                    
                    var line = {
                        id: id,
                        key: key,
                        title: title,
                        date: date,
                        journal: journal,
                        author: author,
                        //creators: Zotero.ZNotes.stringify("creators", creators),
                        file: filename,
                    }
                    
                    
                    for(j in notes)
                    {
                        var noteid = notes[j];
                        var n = Zotero.Items.get(noteid);
                        var note = n.getNote();
                        var tag = "";
                        var tags = JSON.parse(JSON.stringify(n)).tags;                
                        
                        if(tags.length>0)
                        {
                            tag = tags[0]["tag"];
                        }
                        
                        if(tag=="")
                        {
                            tag = "Other";
                        }
                        
                        // if(!(tag in line["notes"]))
                        // {
                            // taglist.push(tag);
                            // line["notes"][tag] = [];
                        // }
                        
                        line[tag] = Zotero.ZNotes.clean(note)+"<hr>key:"+noteid;
                        taglist.push(tag);
                    }
                    
                    znotes.push(line);
                }
                catch {
                    
                }
            }
        }
        Object.keys(znotes[0]).forEach(k=>{
            if(!(k in taglist))
            {
                taglist.push(k);
            }
        })
        
        return {
            columns: [...new Set(taglist)],
            values: znotes
        }
    };
    this.getalldata = function()
    {
        var items = [];
        var keys = Zotero.Items._objectKeys;
        for(id in keys)
        {
            var item = Zotero.Items.get(id);
            items.push(item);
        }
        return Zotero.ZNotes.tojson(items);
    }
    
    this.getdata = function()
    {
        var collection = ZoteroPane.getSelectedCollection();
        var items = Zotero.ZNotes.recursiveitems(collection);
        return Zotero.ZNotes.tojson(items);
    };
    
    this.recursiveitems = function(collection)
    {
        var itemlist = [];
        var children = collection.getChildItems();
        for(i in children)
        {
            var child = children[i];
            itemlist.push(child);
        }
        
        if(collection.hasChildCollections())
        {
            var childcollections = collection.getChildCollections();
            for(i in childcollections)
            {
                var cc = childcollections[i];
                itemlist = itemlist.concat(Zotero.ZNotes.recursiveitems(cc));
            }
        }
        return itemlist;
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
    
    this.clean = function(tdtext)
    {
        var re = new RegExp("&lt;&lt;.*&gt;&gt;", "g");
        tdtext = tdtext.replace(re, "");
        return tdtext;
    };
    
    this.reload = function()
    {
        Zotero.ZNotes.notewin.document.getElementById("note-frame").contentWindow.location.reload();
    };
};

// Initialize the utility
window.addEventListener('load', function(e) { Zotero.ZNotes.init(); }, false);
