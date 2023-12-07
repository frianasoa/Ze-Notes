Format = {
	async formatitems(items, tags)
	{
		var tagged_items = {};
		var itemlist = {};
		for(item of items)
		{
			var itemnotes = await Format.itemnotes(item);
			itemlist[item.id] = await Format.formatitem(item);			
			for(const tag of tags)
			{
				if(this.hastag(item, tag))
				{
					if(!Object.keys(tagged_items).includes(item.id))
					{
						tagged_items[item.id] = itemlist[item.id];
					}
					
					if(!Object.keys(tagged_items[item.id]).includes(tag))
					{
						if(Object.keys(itemnotes).includes(tag))
						{
							tagged_items[item.id][tag] = itemnotes[tag].join("");
						}
					}
					else
					{
						if(Object.keys(itemnotes).includes(tag))
						{
							tagged_items[item.id][tag]+=itemnotes[tag].join("");
						}
					}
				}
			}
		}
		return {
			data: Object.values(itemlist),
			columns: ["id", "itemid", "key", "title", "date", "journal", "author", "creators", "filekey"],
			tagged_items: Object.values(tagged_items),
		}
	},
	
	
	async itemnotes(item)
	{
		var allnotes = item.getNotes().map(function(id){return Zotero.Items.get(id);});
		try {
			var pdfids = item.getAttachments();
			for(let id of pdfids)
			{
				let attachment = Zotero.Items.get(id);
				if(attachment.isPDFAttachment())
				{
					allnotes = allnotes.concat(attachment.getAnnotations());
				}
			}
		}
		catch(e){}
		var r = {};
		for(note of allnotes)
		{
			var n = await this.formatnote(note);
			for(tag of note.getTags())
			{
				if(!Object.keys(r).includes(tag.tag))
				{
					r[tag.tag] = [n];
				}
				else
				{
					r[tag.tag].push(n);
				}
			}
		}
		return r;
	},
	
	itemtags(item)
	{
		var alltags = []
		var noteids = item.getNotes();
		var pdfids = [];
		try {
			pdfids = item.getAttachments();
		}
		catch(e)
		{
		}
		
		for(let id of pdfids)
		{
			let attachment = Zotero.Items.get(id);
			if(attachment.isPDFAttachment())
			{
				noteids = noteids.concat(attachment.getAnnotations().map(function(e){return e.id}));
			}
		}		
		
		for(id of noteids)
		{
			var note = Zotero.Items.get(id);
			var tags = note.getTags(false);
			for(tag of tags)
			{
				alltags.push(tag.tag);
			}
		}
		return alltags;
	},
	
	hastag(item, tag)
	{
		return this.itemtags(item).includes(tag)
	},
	
	xmlescape(txt){
		txt = txt.replace(/&/g, '&amp;');
		txt = txt.replace(/<br>/g, '<br/>');
		txt = txt.replace(/<\/br>/g, '<br/>');
		return txt;
	},
	
	async formatnote(note)
	{
		var selectors = Zotero.ZeNotes.Prefs.get("html-filter");
		var replacement = Zotero.ZeNotes.Prefs.get("html-filter-replacement");
		var notetext = "";
		if(note.isAnnotation())
		{
			var annotationtext = note["annotationText"];
			if(annotationtext==null)
			{
				annotationtext = "";
			}
			
			if(!this.isvalidxhtml(annotationtext))
			{
				annotationtext = this.escapehtml(annotationtext);
			}
			
			var contents = "&#x201F;"+annotationtext+"&#8221; ("+Format.creatorshort(item)+" "+Format.year(item)+", p. "+note["annotationPageLabel"]+")";
			
			var comment = note["annotationComment"];

			if(comment==null)
			{
				comment = "";
			}
			
			if(!this.isvalidxhtml(comment))
			{
				comment = this.escapehtml(comment);
			}
			
			comment = comment.split("\n").join("<br/>\n");
			
			var annotationpage = JSON.parse(note["annotationPosition"])["pageIndex"];
			
			var color = Zotero.ZeNotes.Utils.addopacity(note["annotationColor"], Zotero.ZeNotes.Prefs.get("bg-opacity"));
			
			let note_ = comment+"<hr style='width: 25%;'/><div id='annotation-"+note["parentItem"].key+"-"+note["key"]+"' class='annotation' data-attachmentkey='"+note["parentItem"].key+"' data-attachmentid='"+note["parentItem"].id+"' data-pagelabel='"+note["annotationPageLabel"]+"' data-annotationpage='"+annotationpage+"' data-annotationid='"+note.id+"' data-annotationkey='"+note["key"]+"' style='background-color:"+color+";'>"+contents+"</div><hr/>";
			notetext+=note_;
		}
		else
		{
			note_ = note.getNote();
			note_ = Zotero.ZeNotes.Filter.apply(note_, selectors, replacement);
			note_ = await Zotero.ZeNotes.Image.render(note_, item);
			
			notetext+=note_+ "<span class='notekey'>"+note.id+"</span><hr/>";
		}
		return notetext;
	},
	
	async formatitem(item) {
		var line = {
			id: item.getID(),
			itemid: item.id,
			key: item.getField("key"),
			title: this.xmlescape(item.getField("title")),
			date: Format.year(item),
			journal: this.xmlescape(item.getField("publicationTitle")),
			author: Format.creatorshort(item)+" ("+Format.year(item)+")",
			creators: Format.creators(item),
			filenames: await Format.filenames(item),
			filekey: Format.filekey(item),
		}
		return line;
	},
	
	year(item) {
        var y = item.getField("date", true).substr(0, 4);
        return y;
    },
	
	filekey(item) {   
        var key = "";
        if(item.itemType=="attachment")
        {
            return key;
        }
		
        var attachmentIDs = [];
		try {
			attachmentIDs = item.getAttachments();
        }
		catch(e)
		{
			
		}
		
        if(attachmentIDs.length>0)
        {
            var attachment = Zotero.Items.get(attachmentIDs[0]);
            key = attachment.key;
        }
        return key;
    },
	
	creatorshort(item) {
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
    },
	
	creators(item) {
        var variable = item.getCreatorsJSON();
        var creators = [];
        for(i in variable)
        {
            var creator = variable[i];
            creators.push(creator.firstName+" "+creator.lastName);
        }
        s = creators.join(", ");
        return s;
    },
	
	async filenames (item) {
        var filenames = [];
        if(item.itemType=="attachment")
        {
            return filenames;
        }
        
		
        var attachmentIDs = [];
        try {
			attachmentIDs = item.getAttachments();
        }
		catch(e)
		{
			
		}
		
		for(let id in attachmentIDs)
        {
            var attachment = Zotero.Items.get(attachmentIDs[id]);
            var path = attachment.attachmentPath;
            var key = attachment.key;
            var zpath = "zotero://open-pdf/library/items/"+key;
            var library =  Zotero.Libraries.get(item.libraryID);
            if(library.isGroup)
            {
                zpath = "zotero://open-pdf/library/"+item.libraryID+"/item/"+key;
            }
            
            if(!Zotero.Attachments.resolveRelativePath(path))
            {
                path = await attachment.getFilePathAsync();
            }
            else
            {
                path = Zotero.Attachments.resolveRelativePath(path);
            }
            
            filenames.push({
                "key": key,
                "path": path,
                "zpath": zpath,
                "id": attachment.id,
            })
        }
        return filenames;
    },
	
	isvalidxhtml(txt)
	{
		txt = "<div>"+txt+"</div>"
		var r = true;
		var parser = null;
		if (Zotero.platformMajorVersion >= 102) {
			parser = new DOMParser();
		}
		else
		{
			parser = Components.classes['@mozilla.org/xmlextras/domparser;1'].createInstance(Components.interfaces.nsIDOMParser);
		}
		
		try {
			var doc = parser.parseFromString(txt, 'application/xhtml+xml');
			const errorNode = doc.querySelector("parsererror");
			if(errorNode)
			{
				r = false;
			}
        }
        catch (error) {
			alert(error);
			r = false
        }
		return r;
	},
	
	escapehtml(s)
	{
		return s
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
	},
}