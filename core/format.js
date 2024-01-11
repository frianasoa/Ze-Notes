Format = {
	async formatitems(items, tags)
	{
		var tagged_items = {};
		var itemlist = [];
		for(item of items)
		{
			var itemnotes = await Format.itemnotes(item);	
			let itemelement = await Format.formatitem(item);	
			itemlist.push(itemelement);
			for(const tag of tags)
			{
				if(this.hastag(item, tag))
				{					
					if(!Object.keys(tagged_items).includes(item.id))
					{
						tagged_items[item.id] = itemelement;
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
			
			for(const note of this.noteswithouttags(item))
			{
				var tag = "Untagged";
				var n = await this.formatnote(note, tag);
				
				if(!Object.keys(tagged_items).includes(item.id))
				{
					tagged_items[item.id] = itemelement;
				}
				if(!Object.keys(tagged_items[item.id]).includes(tag))
				{
					tagged_items[item.id][tag] = n;
				}
				else
				{
					tagged_items[item.id][tag]+=n;
				}
			}
		}
		return {
			data: itemlist,
			columns: ["id", "itemid", "key", "title", "date", "journal", "author", "source", "creators", "filekey"],
			tagged_items: Object.values(tagged_items),
		}
	},

	async itemnotes(item)
	{
		var allnotes = [];
		if(![NOTE_LABEL].includes(item.itemType))
		{
			allnotes = item.getNotes().map(function(id){return Zotero.Items.get(id);});
		}
		else
		{
			allnotes.push(item);
		}
		
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
			for(tag of note.getTags())
			{
				var n = await this.formatnote(note, tag.tag);
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
		var noteids = [];
		if(![NOTE_LABEL].includes(item.itemType))
		{
			noteids = item.getNotes();
		}
		else
		{
			noteids.push(item.id);
		}
		
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
	
	noteswithouttags(item)
	{
		var notes = [];
		var noteids = [];
		if(![NOTE_LABEL].includes(item.itemType))
		{
			noteids = item.getNotes();
		}
		else
		{
			noteids.push(item.id);
		}
		
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
			
			if(note.getTags(false).length==0)
			{
				notes.push(note);
			}
		}
		return notes;
	},
	
	xmlescape(txt){
		txt = txt.replace(/&/g, '&amp;');
		txt = txt.replace(/<br>/g, '<br/>');
		txt = txt.replace(/<\/br>/g, '<br/>');
		return txt;
	},
	
	async formatnote(note, tag)
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
			
			var contents = "&#x201F;<span class='direct-quote'>"+annotationtext+"</span>&#8221; ("+Format.creatorshort(item)+" "+Format.year(item)+", p. "+note["annotationPageLabel"]+")";
			
			var img = "";
			if(note.annotationType=="image")
			{
				var json = await Zotero.Annotations.toJSON(note);
				if(annotationtext)
				{
					annotationtext = "&#x201F;<span class='direct-quote'>"+annotationtext+"</span>&#8221;";
				}
				var img = "<img width='100%' src='"+json["image"]+"' />";
				
				var contents = annotationtext+"<br/> Source: "+Format.creatorshort(item)+" "+Format.year(item)+", p. "+note["annotationPageLabel"]+"";
			}
			
			var annotationpage = JSON.parse(note["annotationPosition"])["pageIndex"];
			
			var color = Zotero.ZeNotes.Utils.addopacity(note["annotationColor"], Zotero.ZeNotes.Prefs.get("bg-opacity"));
			
			let note_ = "<div class='annotation-body'><div class='annotation-comment'>"+comment+"</div><hr style='width: 25%;'/><div id='annotation-"+note["parentItem"].key+"-"+note["key"]+"' class='annotation' data-attachmentkey='"+note["parentItem"].key+"' data-tag='"+tag+"' data-attachmentid='"+note["parentItem"].id+"' data-pagelabel='"+note["annotationPageLabel"]+"' data-annotationpage='"+annotationpage+"' data-annotationid='"+note.id+"' data-annotationkey='"+note["key"]+"' style='background-color:"+color+";' data-source='"+Format.creatorshortlocale(item)+"' data-author='"+Format.creatorshort(item)+"' data-date='"+Format.year(item)+"'>"+img+	contents+"</div></div><hr/>";
			notetext+=note_;
		}
		else
		{
			note_ = note.getNote();
			note_ = Zotero.ZeNotes.Filter.apply(note_, selectors, replacement);
			note_ = await Zotero.ZeNotes.Image.render(note_, item);
			notetext+="<div class='user-note' data-tag='"+tag+"' data-notekey='"+note.id+"'>"+note_+"</div><hr/>";
		}
		return notetext;
	},
	
	async formatitem(item) {
		return Format.filenames(item).then(filenames=>{
			var line = {
				id: item.getID(),
				itemid: item.id,
				key: item.getField("key"),
				title: this.xmlescape(item.getField("title")),
				date: Format.year(item),
				journal: this.xmlescape(item.getField("publicationTitle")),
				author: Format.creatorshort(item)+" ("+Format.year(item)+")",
				source: Format.creatorshortlocale(item)+" ("+Format.year(item)+")",
				creators: Format.creators(item),
				filenames: filenames,
				filekey: Format.filekey(item),
			}
			return Promise.resolve(line);
		})
	},
	
	year(item) {
		var date;
		for(type of ["date", "issueDate", "dateEnacted", "dateDecided"])
		{
			date = item.getField(type, true);
			if(date)
			{
				break;
			}
		}
        var y = date.substr(0, 4);	
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
		let _and = Zotero.ZeNotes.Prefs.get("display-and", " and ");
		let _etal = Zotero.ZeNotes.Prefs.get("display-etal", " et al.");
		return this.getFirstCreatorFromData(item.itemTypeID, item.getCreators(), _and, _etal);
	},
	
	creatorshortlocale(item) {
		return Zotero.Items.getFirstCreatorFromData(item.itemTypeID, item.getCreators());
    },
	
	getFirstCreatorFromData(itemTypeID, creatorsData, _and, _etal, options) {
		//From Zotero
		if (!options) {
			options = {
				omitBidiIsolates: false
			};
		}
		
		if (creatorsData.length === 0) {
			return "";
		}
		
		var validCreatorTypes = [
			Zotero.CreatorTypes.getPrimaryIDForType(itemTypeID),
			Zotero.CreatorTypes.getID('editor'),
			Zotero.CreatorTypes.getID('contributor')
		];
	
		for (let creatorTypeID of validCreatorTypes) {
			let matches = creatorsData.filter(data => data.creatorTypeID == creatorTypeID)
			if (!matches.length) {
				continue;
			}
			if (matches.length === 1) {
				return matches[0].lastName;
			}
			if (matches.length === 2) {
				let a = matches[0];
				let b = matches[1];
				let args = options.omitBidiIsolates
					? [a.lastName, b.lastName]
					// \u2068 FIRST STRONG ISOLATE: Isolates the directionality of characters that follow
					// \u2069 POP DIRECTIONAL ISOLATE: Pops the above isolation
					: [`\u2068${a.lastName}\u2069`, `\u2068${b.lastName}\u2069`];
				return args.join(_and);
			}
			if (matches.length >= 3) {
				return matches[0].lastName + " " + _etal;
			}
		}
		return "";
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