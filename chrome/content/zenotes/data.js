var EXPORTED_SYMBOLS = ["Zotero"];

var Zotero = Components.classes["@zotero.org/Zotero;1"]
    .getService(Components.interfaces.nsISupports)
    .wrappedJSObject;

var zp = Zotero.getActiveZoteroPane();
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
   
    
    this.creatorshort = function(item)
    {
        
        var creators = item.getCreatorsJSON();
        var author = "";
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
        return author;
    }
    
    this.creators = function(item)
    {
        var variable = item.getCreatorsJSON();
        var creators = [];
        for(i in variable)
        {
            var creator = variable[i];
            creators.push(creator.firstName+" "+creator.lastName);
        }
        s = creators.join(", ");
        return s;
    }
    
    this.year = function(item)
    {
        var y = item.getField("date", true).substr(0, 4);
        return y;
    }
    
    this.filename = function(item)
    {
        var filename = "";                    
        var attachmentIDs = item.getAttachments();
        if(attachmentIDs.length>0)
        {
            var attachment = Zotero.Items.get(attachmentIDs[0]);
            var path = attachment.attachmentPath;
            filename = Zotero.Attachments.resolveRelativePath(path);
        }
        return filename
    }
     
    this.pdfnotes = function(item)
    {
        var notes = [];
        var ids = item.getAttachments();
        for(let id of ids)
        {
            let attachment = Zotero.Items.get(id);
            if(attachment.isPDFAttachment())
            {
                notes = notes.concat(attachment.getAnnotations());
            }
        }
        return notes;
    }
    
    this.tags = function(item)
    {
        var notes = item.getNotes();
        var r = {};
        for(j in notes)
        {
            var noteid = notes[j];
            var n = Zotero.Items.get(noteid);
            var note = n.getNote();
            var tag = "";
            var tags = JSON.parse(JSON.stringify(n)).tags;                
            
            for(let i in tags)
            {
                tag = tags[i]["tag"];
                if(tag=="")
                {
                    tag = "Other";
                }
                if(Object.keys(r).includes(tag))
                {
                    r[tag]+="<hr/>"+Zotero.ZeNotes.data.clean(note)+ "<span class='notekey'>"+noteid+"</span>";
                }
                else
                {
                    r[tag] = Zotero.ZeNotes.data.clean(note)+ "<span class='notekey'>"+noteid+"</span>";
                }
                
            }
        }
        
        /** Add pdf tags */
        var pdfnotes = Zotero.ZeNotes.data.pdfnotes(item);
        for(j in pdfnotes)
        {
            var n = pdfnotes[j];
            var authors = Zotero.ZeNotes.data.creatorshort(item);
            var year = Zotero.ZeNotes.data.year(item);
            var note = n["annotationComment"]+"<h1>Direct quote</h1><div style='background-color:"+n["annotationColor"]+";'>“"+n["annotationText"]+"”</div>("+authors+" "+year+", p. "+n["annotationPageLabel"]+")";
            
            var tags = n.getTags();                
            for(let i in tags)
            {
                tag = tags[i]["tag"];
                if(tag=="")
                {
                    tag = "Other";
                }
                if(Object.keys(r).includes(tag))
                {
                    r[tag]+="<hr/>"+Zotero.ZeNotes.data.clean(note);
                }
                else
                {
                    r[tag] = Zotero.ZeNotes.data.clean(note);
                }
            }
        }
        return r;
    }
    
    this.tojson = function(items)
    {
        var zenotes = [];
        var taglist = [];
        
        for(i in items)
        {
            var item = items[i];
            var tags = Zotero.ZeNotes.data.tags(item);
            var line = {
                id: item.getID(),
                itemid: item.id,
                key: item.getField("key"),
                title: item.getField("title"),
                date: Zotero.ZeNotes.data.year(item),
                journal: item.getField("publicationTitle"),
                author: Zotero.ZeNotes.data.creatorshort(item)+" ("+Zotero.ZeNotes.data.year(item)+")",
                creators: Zotero.ZeNotes.data.creators(item),
                filename: Zotero.ZeNotes.data.filename(item),
            }
            line = Object.assign({},line, tags);
            if(Object.keys(tags).length>0)
            {
                taglist.concat(Object.keys(tags));
                zenotes.push(line);
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
            values: Zotero.ZeNotes.data.sort(zenotes, sorter),
        }
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