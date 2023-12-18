Data = {
	log(msg){
		Zotero.getMainWindow().console.log(msg);
	},
	
	async get(){
		var libraryID = Zotero.getActiveZoteroPane().getSelectedLibraryID();
		var keys = await Zotero.Items.getAllKeys(libraryID);
		var selected = Data.collectionchildren(Zotero.getActiveZoteroPane().getSelectedCollection());
		
		var ids = [];
		/**
		Remove the access to all items to speed up
		*/
		
		// keys.forEach(key=>{
			// ids.push(Zotero.Items.getIDFromLibraryAndKey(libraryID, key))
		// });
		var selected_tags = Data.idstotags(selected["ids"])
		var formatted = await Format.formatitems(selected["items"], selected_tags)
		var selecteditems = formatted["data"];
		var taggeditems = formatted["tagged_items"];

		return {
			// "all_tags": Data.idstotags(ids),
			"selected_tags": selected_tags,
			"info_columns": formatted["columns"],
			"selected_items": selecteditems,
			"tagged_items": taggeditems,
		}
	},

	collectionchildren(collection)
	{
		var ids = [];
		var collections = [];
		var items = [];
		if(collection!==undefined)
		{
			items = collection.getChildItems(false, false);
			var collections = collection.getChildCollections();
			
			items.forEach(item=>{
				if(![ANNOTATION_LABEL, ATTACHMENT_LABEL, NOTE_LABEL].includes(item.itemType))
				{
					ids.push(item.id);
				}
			})

			collections.forEach(c=>
			{
				let r = Data.collectionchildren(c);
				r["items"].forEach(item=>{
					if(!ids.includes(item.id))
					{
						ids.push(item.id);
						items.push(item);
					}
				});
			})
		}
		else
		{
			var libraryID = Zotero.getActiveZoteroPane().getSelectedLibraryID();
			collections = Zotero.Collections.getByLibrary(libraryID);
		}
		
		for(collection_ of collections)
		{
			let r = Data.collectionchildren(collection_);
			r["items"].forEach(item=>{
				if(!ids.includes(item.id))
				{
					ids.push(item.id);
					items.push(item);
				}
			});
		}
		
		return {
			"ids": ids,
			"items": items,
		}
	},
	
	idstotags(ids){
		var taglist  = [];
		for(id of ids)
		{
			var item = Zotero.Items.get(id);
			if(item!==false)
			{
				if(![ANNOTATION_LABEL, ATTACHMENT_LABEL, NOTE_LABEL].includes(item.itemType))
				{
					taglist = taglist.concat(Data.notetags(item));
					taglist = taglist.concat(Data.attachmenttags(item));
				}
			}
		}
		taglist = [...new Set(taglist)];
		return taglist;
	},
	
	notetags(item){
		var taglist = [];
		var notes = [];
		if(![NOTE_LABEL].includes(item.itemType))
		{
			notes = item.getNotes();
		}
		else
		{
			notes.push(item.id)
		}
		
		if(notes.length>0)
		{
			for(j in notes)
			{
				var noteid = notes[j];
				var n = Zotero.Items.get(noteid);
				var tags = JSON.parse(JSON.stringify(n)).tags;                
				var tag = "";
				if(tags.length==0)
				{
					taglist.push("Untagged")
				}
				else if(tags.length==1)
				{
					taglist.push(tags[0]["tag"]);
				}
				else
				{
					for(tag of tags)
					{
						taglist.push(tag["tag"]);
					}
				}
			}
		}
		return taglist;
	},
	
	attachmenttags(item){
		var taglist = [];
		var attachments = [];
		try {
			attachments = item.getAttachments();
		}
		catch(e)
		{	
		}
		for(let id of attachments)
		{
			attachment = Zotero.Items.get(id);
			if(attachment.isPDFAttachment()){
				annotations = attachment.getAnnotations();
				for(let n of annotations)
				{
					var tags = n.getTags();
					for(let t of tags)
					{
						taglist.push(t.tag)
					}
					if(tags.length==0)
					{
						taglist.push("Untagged")
					}
				}
			}
		}
		return taglist;
	}
}