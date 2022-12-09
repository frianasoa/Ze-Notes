var EXPORTED_SYMBOLS = ["Zotero"];

var Zotero = Components.classes["@zotero.org/Zotero;1"]
    .getService(Components.interfaces.nsISupports)
    .wrappedJSObject;

var zp = Zotero.getActiveZoteroPane()
var document = zp.document;
var window = document.defaultView;
var alert = window.alert;

Zotero.ZeNotes.data = new function()
{
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
                itemlist = itemlist.concat(Zotero.ZeNotes.data.recursiveitems(cc));
            }
        }
        return itemlist;
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
                        creators: Zotero.ZeNotes.data.stringify("creators", creators),
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
                        
                        line[tag] = Zotero.ZeNotes.data.clean(note)+"<span class='notekey'>"+noteid+"</span>";
                        taglist.push(tag);
                    }
                    
                    zenotes.push(line);
                }
                catch {
                    
                }
            }
        }
        var lists = Zotero.ZeNotes.settings.getpref("tag-lists", {show:[], hide:[], sort:[]});
        var sorter = lists.sort.map(function(i) {
            if(i.order=="desc")
            {
                return "-"+i.value;
            }
            else
            {
                return i.value;
            }
        });
        var visibletags = lists.show.map(function(i) {
            return i.value;
        });
        
        return {
            columns: visibletags,
            values: Zotero.ZeNotes.data.sort(zenotes, sorter),
        }
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
    
    this.clean = function(tdtext)
    {
        var re = new RegExp("&lt;&lt;.*&gt;&gt;", "g");
        tdtext = tdtext.replace(re, "");
        return tdtext;
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
        data = data.sort(Zotero.ZeNotes.data.sort_func(sorter));
        return data;
    }
    
    this.get = function()
    {
        var collection = zp.getSelectedCollection();
        var libraryid = zp.getSelectedLibraryID()
        if(collection)
        {
            var items = Zotero.ZeNotes.data.recursiveitems(collection);
            return Zotero.ZeNotes.data.tojson(items);
        }
        else if(libraryid)
        {
            var items = [];
            var collections = Zotero.Collections.getByLibrary(libraryid);
            collections.forEach(collection=>{
                var items_ = Zotero.ZeNotes.data.recursiveitems(collection);
                items = items.concat(items_);
            });
            return Zotero.ZeNotes.data.tojson(items);
        }
    }
}