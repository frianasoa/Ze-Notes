Format = {
	async formatitems(items, tags)
	{
		var lines = [];
		var tagged_items = [];
		for(item of items)
		{
			var notes = Format.notes(item);
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
			notes[c] = this.xmlescape(notes[c]);
		}		
		return Object.assign({},line, notes);
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
        var attachmentIDs = item.getAttachments();
        
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
        
        var attachmentIDs = item.getAttachments();
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
	
	notes(item){
		var values = []
		if(![ANNOTATION, ATTACHMENT, NOTE].includes(item.itemTypeID))
		{
			var nids = item.getNotes(false);
			var pdfids = item.getAttachments();
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
				tags.forEach(tag=>{
					if(!Object.keys(values).includes(tag.tag))
					{
						values[tag.tag] = "";
					}
					
					if(note.isAnnotation())
					{
						var contents = "“"+note["annotationText"]+"” ("+Format.creatorshort(item)+" "+Format.year(item)+", p. "+note["annotationPageLabel"]+")";
						var comment = note["annotationComment"];
						
						var annotationpage = JSON.parse(note["annotationPosition"])["pageIndex"];
						
						let note_ = comment+"<div id='annotation-"+note["parentItem"].key+"-"+note["key"]+"' class='annotation' data-attachmentkey='"+note["parentItem"].key+"' data-attachmentid='"+note["parentItem"].id+"' data-pagelabel='"+note["annotationPageLabel"]+"' data-annotationpage='"+annotationpage+"' data-annotationkey='"+note["key"]+"' style='background-color:"+note["annotationColor"]+";'>"+contents+"</div>";
						notetext+=note_;
					}
					else
					{
						note_ = note.getNote();
						notetext+= Format.clean(note_)+ "<span class='notekey'>"+note.id+"</span><hr/>";
					}
					values[tag.tag]+= notetext;
				})
			}
		}
		return values;
	},
	clean(tdtext)
    {
        var re = new RegExp("&lt;&lt;.*&gt;&gt;", "g");
        tdtext = tdtext.replace(re, "");
        tdtext = tdtext.replace("<br>", "<br/>")
		return tdtext;
    }
}