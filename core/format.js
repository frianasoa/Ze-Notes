Format = {
	async formatitems(items, tags)
	{
		var lines = [];
		var tagged_items = [];
		for(item of items)
		{
			var notes = await Format.notes(item);
			lines.push(await Format.formatitem(item, notes));
		}
		
		for(line of lines)
		{
			// Add if item has tags
			if(Object.keys(line).some(r=> tags.includes(r)))
			{	
				tagged_items.push(line);
			}
		}
		
		return {
			data: lines,
			columns: ["id", "itemid", "key", "title", "date", "journal", "author", "creators", "filekey"],
			tagged_items: tagged_items,
		}
	},
	
	xmlescape(txt){
		txt = txt.replace(/&/g, '&amp;');
		txt = txt.replace(/<br>/g, '<br/>');
		txt = txt.replace(/<\/br>/g, '<br/>');
		return txt;
	},
	
	async formatitem(item, notes) {
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
		for(c in notes)
		{
			// Check later
			// notes[c] = this.xmlescape(notes[c]);
		}		
		return Object.assign({}, line, notes);
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
	
	async notes(item){
		var values = []
		var selectors = Zotero.ZeNotes.Prefs.get("html-filter");
		var replacement = Zotero.ZeNotes.Prefs.get("html-filter-replacement");

		if(![ANNOTATION, ATTACHMENT, NOTE].includes(item.itemTypeID))
		{
			var nids = item.getNotes(false);
			var pdfids = [];
			try {
				pdfids = item.getAttachments();
			}
			catch(e)
			{
				
			}
			
			var notes = []
			for(id of nids)
			{
				notes.push(Zotero.Items.get(id));
			}
			for(let id of pdfids)
			{
				let attachment = Zotero.Items.get(id);
				if(attachment.isPDFAttachment())
				{
					notes = notes.concat(attachment.getAnnotations());
				}
			}
			
			
			for(note of notes)
			{
				var notetext = "";
				var tags = note.getTags();
				for(tag of tags){
					if(!Object.keys(values).includes(tag.tag))
					{
						values[tag.tag] = "";
					}
					
					if(note.isAnnotation())
					{
						var annotationtext = note["annotationText"];
						if(annotationtext==null)
						{
							annotationtext = "";
						}
						annotationtext = this.escapehtml(annotationtext);
						
						var contents = "&#x201F;"+annotationtext+"&#8221; ("+Format.creatorshort(item)+" "+Format.year(item)+", p. "+note["annotationPageLabel"]+")";
						
						/**
						Not allow html in comments from pdf for now;
						*/
						// comment = Zotero.ZeNotes.Filter.apply(comment, selectors);
						
						var comment = note["annotationComment"];
						
						
						if(comment==null)
						{
							comment = "";
						}
						var comment = this.escapehtml(comment);
						
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
					values[tag.tag]+= notetext;
				};
			}
		}
		return values;
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