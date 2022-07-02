Zotero.ZeNotes = new function(){
	this.notewin = null;
    
    this.init = function(){
        
    }
    
    this.maximize = function(notewin)
    {
        Zotero.ZeNotes.notewin = notewin;
        notewin.resizeTo(screen.width, screen.height);
        notewin.moveTo(0, 0);
    }
    
    this.show = function(paneID, action) {
        Zotero.ZeNotes.collection = ZoteroPane.getSelectedCollection().name;
        var io = {pane: paneID, action: action}
        window.openDialog('chrome://zenotes/content/notes.xul',
            'notewin',
            'chrome,titlebar,toolbar,centerscreen,dialog,width:900,height:900' + Zotero.Prefs.get('browser.preferences.instantApply', true) ? 'dialog=no' : 'modal', io
        );
    }
    
    this.openPreferenceWindow = function(paneID="", action="") {
        var io = {pane: paneID, action: action}
        window.openDialog('chrome://zenotes/content/settings.xul',
            'znote-settings',
            'chrome,titlebar,toolbar,centerscreen,dialog,width:950' + Zotero.Prefs.get('browser.preferences.instantApply', true) ? 'dialog=no' : 'modal', io
        );
    }
    
    this.stringify = function(mode, variable)
    {
        var s = ""
        if(mode=="creators")
        {
            var creators = [];
            for(i in variable)
            {
                var creator = variable[i];
                creators.push(creator.firstName+" "+creator.lastName);
            }
            s = creators.join(", ");
        }
        return s;
    }
    
    this.tojson = function(items)
    {
        var zenotes = [];
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
                        itemid: item.id,
                        key: key,
                        title: title,
                        date: date,
                        journal: journal,
                        author: author,
                        creators: Zotero.ZeNotes.stringify("creators", creators),
                        filename: filename,
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
                        
                        line[tag] = Zotero.ZeNotes.clean(note)+"<span class='notekey'>"+noteid+"</span>";
                        taglist.push(tag);
                    }
                    
                    zenotes.push(line);
                }
                catch {
                    
                }
            }
        }
        
        var sorter = Zotero.ZeNotes.settings.lists.sort.map(function(i) {
            if(i.order=="desc")
            {
                return "-"+i.value;
            }
            else
            {
                return i.value;
            }
        });

        var visibletags = Zotero.ZeNotes.settings.lists.show.map(function(i) {
            return i.value;
        });
        
        return {
            columns: visibletags,
            values: Zotero.ZeNotes.sort(zenotes, sorter),
        }
    }
    
    this.sort_func = function(fields) 
    {
        return function (a, b) {
            return fields
                .map(function (o) {
                    var dir = 1;
                    if (o[0] === '-') {
                       dir = -1;
                       o=o.substring(1);
                    }
                    if (a[o] > b[o]) return dir;
                    if (a[o] < b[o]) return -(dir);
                    return 0;
                })
                .reduce(function firstNonZeroValue (p,n) {
                    return p ? p : n;
                }, 0);
        }
    }
    
    this.sort = function(data, sorter)
    {
        data = data.sort(this.sort_func(sorter));
        return data;
    }
    
    this.alltags = function()
    {
        var keys = Zotero.Items._objectKeys;
        var taglist = [];
        
        for(id in keys)
        {
            try {
                var item = Zotero.Items.get(id);           
                var notes = item.getNotes();
                if(notes.length>0)
                {
                    for(j in notes)
                    {
                        var noteid = notes[j];
                        var n = Zotero.Items.get(noteid);
                        var tags = JSON.parse(JSON.stringify(n)).tags;                
                        
                        if(tags.length>0)
                        {
                            tag = tags[0]["tag"];
                        }
                        
                        if(tag=="")
                        {
                            tag = "Other";
                        }
                        taglist.push(tag)
                    }
                }
            }
            catch
            {
                
            }
        }
        return [...new Set(taglist)];
    }
    
    this.getalldata = function()
    {
        var items = [];
        var keys = Zotero.Items._objectKeys;
        for(id in keys)
        {
            var item = Zotero.Items.get(id);
            items.push(item);
        }
        return Zotero.ZeNotes.tojson(items);
    }
    
    this.getdata = function()
    {
        var collection = ZoteroPane.getSelectedCollection();
        var items = Zotero.ZeNotes.recursiveitems(collection);
        return Zotero.ZeNotes.tojson(items);
        
    }
    
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
                itemlist = itemlist.concat(Zotero.ZeNotes.recursiveitems(cc));
            }
        }
        return itemlist;
    }
       
    this.clean = function(tdtext)
    {
        var re = new RegExp("&lt;&lt;.*&gt;&gt;", "g");
        tdtext = tdtext.replace(re, "");
        return tdtext;
    }
    
    this.setPref = function(pref, value) {        
        Zotero.Prefs.set('extensions.zenotes.' + pref, value, true);
    }
    
    this.getPref = function(pref, default_value="") {
        var v = Zotero.Prefs.get('extensions.zenotes.' + pref, true);
        if(v==null)
        {
            return default_value;
        }
        return v;
    }
    
    this.reload = function()
    {
        Zotero.ZeNotes.collection = ZoteroPane.getSelectedCollection().name;
        var notewin = Zotero.ZeNotes.notewin;
        if(notewin)
        {
            if(!notewin.document.title.includes(Zotero.ZeNotes.collection))
            {
                notewin.document.title = notewin.document.title+" - "+Zotero.ZeNotes.collection;
            }
            if(notewin.document.getElementById("note-frame").contentWindow)
            {
                notewin.document.getElementById("note-frame").contentWindow.location.reload();
            }
        }
    }
    
    this.exporthtml = function(html)
    {
        style = "<style>";
        style += "td{white-space: pre-wrap;    white-space: -moz-pre-wrap;    white-space: -pre-wrap;    white-space: -o-pre-wrap;    word-wrap: break-word;border: solid 1px; vertical-align: top;padding:0.5em;padding-bottom: 1em;} table{table-layout: fixed; padding:0.5em;border-spacing: 0; border-collapse: collapse; border: solid 1px; width: 100%;}";
        style += "</style>";
        
        html = "<meta http-equiv=Content-Type content='text/html; charset=utf-8'><html><head>"+style+"</head><body>"+html+"</body></html>"
        
        var nsIFilePicker = Components.interfaces.nsIFilePicker;
        var fp =Components.classes["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
        
        /**
            Parent window 
            Zotero.ZeNotes.notewin
        */
        
        fp.defaultString = "ZeNotes - "+Zotero.ZeNotes.collection+".doc";
        fp.init(Zotero.ZeNotes.notewin, "Save to file", nsIFilePicker.modeSave);
        fp.appendFilter("Documents (*.doc)", "*.doc");
        fp.appendFilter("Web page (*.html; *.htm)", "*.html; *.htm");
        fp.defaultExtension="doc";
        
        fp.open(function()
        {
            var outputStream = Components.classes["@mozilla.org/network/file-output-stream;1"].createInstance( Components.interfaces.nsIFileOutputStream);
            outputStream.init(fp.file, 0x04 | 0x08 | 0x20, 420, 0 );
            var converter = Components.classes["@mozilla.org/intl/converter-output-stream;1"].createInstance(Components.interfaces.nsIConverterOutputStream);
            converter.init(outputStream, "UTF-8", 0, 0);
            converter.writeString(html);
            converter.close();
            outputStream.close();
        });
    }
    
    this.exportcsv = function(table)
    {
        var rows = table.querySelectorAll('tr');
        var csv = [];
        var separator = ",";
        for (var i = 0; i < rows.length; i++) {
            var row = [], cols = rows[i].querySelectorAll('td, th');
            for (var j = 0; j < cols.length; j++) {
                var data = cols[j].innerText.replace(/(\r\n|\n|\r)/gm, '').replace(/(\s\s)/gm, ' ')
                data = data.replace(/"/g, '""');
                row.push('"' + data + '"');
            }
            csv.push(row.join(separator));
        }
        var csv_string = csv.join('\n');
        
        var nsIFilePicker = Components.interfaces.nsIFilePicker;
        var fp =Components.classes["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
        
        fp.defaultString = "ZeNotes - "+Zotero.ZeNotes.collection+".csv";
        fp.init(Zotero.ZeNotes.notewin, "Save to file", nsIFilePicker.modeSave);
        fp.appendFilter("CSV (*.csv; *.txt)", "*.csv; *.txt");
        fp.defaultExtension="csv";
        
        fp.open(function()
        {
            var outputStream = Components.classes["@mozilla.org/network/file-output-stream;1"].createInstance( Components.interfaces.nsIFileOutputStream);
            outputStream.init(fp.file, 0x04 | 0x08 | 0x20, 420, 0 );
            var converter = Components.classes["@mozilla.org/intl/converter-output-stream;1"].createInstance(Components.interfaces.nsIConverterOutputStream);
            converter.init(outputStream, "UTF-8", 0, 0);
            converter.writeString(csv_string);
            converter.close();
            outputStream.close();
        });
        
    }
        
    this.exportxls = function(xls)
    {
        var uri = 'data:application/vnd.ms-excel;base64,';
        var template = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>{worksheet}</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--><meta http-equiv="content-type" content="text/plain; charset=UTF-8"/></head><body><table>{table}</table></body></html>';
        var base64 = function(s) { 
            return window.btoa(unescape(encodeURIComponent(s))) 
        }
        var format = function(s, c) { 
            return s.replace(/{(\w+)}/g, function(m, p) { return c[p]; }) 
        }
        var ctx = {worksheet: "data" || 'Worksheet', table: xls}
        // xls = base64(format(template, ctx))
        xls = format(template, ctx)
        
        var nsIFilePicker = Components.interfaces.nsIFilePicker;
        var fp =Components.classes["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
        
        fp.defaultString = "ZeNotes - "+Zotero.ZeNotes.collection+".xls";
        fp.init(Zotero.ZeNotes.notewin, "Save to file", nsIFilePicker.modeSave);
        fp.appendFilter("Documents (*.xls)", "*.xls");
        fp.appendFilter("Web page (*.csv)", "*.csv");
        fp.defaultExtension="xls";

        
        fp.open(function()
        {
              
            var outputStream = Components.classes["@mozilla.org/network/file-output-stream;1"].createInstance( Components.interfaces.nsIFileOutputStream);
            outputStream.init(fp.file, 0x04 | 0x08 | 0x20, 420, 0 );
            var converter = Components.classes["@mozilla.org/intl/converter-output-stream;1"].createInstance(Components.interfaces.nsIConverterOutputStream);
            converter.init(outputStream, "UTF-8", 0, 0);
            converter.writeString(xls);
            converter.close();
            outputStream.close();
        });
    }
    
    this.download = function(type)
    {
        
        if(type=="doc")
        {
            var data = Zotero.ZeNotes.notewin.document.getElementById("note-frame").contentWindow.document.body.innerHTML;
            this.exporthtml(data);
        }
        else if(type=="csv")
        {
            var table = Zotero.ZeNotes.notewin.document.getElementById("note-frame").contentWindow.document.getElementById("notes-table");
            this.exportcsv(table);
        }
        else
        {
            var data = Zotero.ZeNotes.notewin.document.getElementById("note-frame").contentWindow.document.getElementById("notes-table").innerHTML;
            this.exportxls(data);
        }
    }
}

// Initialize the utility
window.addEventListener('load', function(e) { Zotero.ZeNotes.init(); }, false);
