import he from 'he';
import Utils from './Utils'
import ZPrefs from './ZPrefs'

const Format = {
	zpaths(item: _ZoteroTypes.Items): string {
    if(item.isAttachment())
    {
      return "";
    }
    
		return item.getAttachments().map((id: number)=>{
			let attachment = Zotero.Items.get(id)
			let library: any =  Zotero.Libraries.get(item.libraryID);
			if(library.isGroup)
			{
				return {type: "file", value: "zotero://open-pdf/library/"+item.libraryID+"/item/"+attachment.key, key: attachment.key, filetype: attachment.attachmentContentType, id: attachment.id};
			}
			else
			{
				return {type: "file", value: "zotero://open-pdf/library/items/"+attachment.key, key: attachment.key, filetype: attachment.attachmentContentType, id: attachment.id};
			}
		});
	},
  
	date(item: _ZoteroTypes.Items): string 
	{
		var date = item.getField("date", true) || item.getField("issueDate", true) || item.getField("dateEnacted", true) || item.getField("dateDecided", true) || "n.d ";
		return date.substr(0, 4).trim();
	},
  
	source(item: _ZoteroTypes.Items, page: string = "", inline: boolean  = true): string {
		var s = Zotero.Items.getFirstCreatorFromData(item.itemTypeID, item.getCreators()).split("\u2068").join("").split("\u2069").join("");
    if(inline)
    {
      if(page)
      {
        s+=" ("+this.date(item)+", p. "+page+")";
      }
      else
      {
        s+=" ("+this.date(item)+")";
      }
    }
    else
    {
      if(page)
      {
        s+=" "+this.date(item)+", p. "+page+"";
      }
      else
      {       
        s+=" "+this.date(item)+"";
      }
      s = "("+s+")";
    }
    return Utils.toxhtml(s);
	},
	
	async addnotes(data: any, note: any, tags: any, item: _ZoteroTypes.Items, attachmentid: string = "")
	{
		for(const tag of tags)
		{
			if(!Object.keys(data).includes(tag.tag))
			{
				data[tag.tag] = [];
			}
			
			if(note.isAnnotation())
			{
        const image = this.image(note);
				data[tag.tag].push({
          type: "annotation", 
          id: note.id, 
          libraryid: item.libraryID,
          text: Format.clean(note.annotationText), 
          comment: Format.clean(note.annotationComment), 
          attachmentid: attachmentid,
          annotationkey: note.key,
          annotationid: note.id,
          pagelabel: note.annotationPageLabel,
          color: note.annotationColor,
          position: note.annotationPosition,
          source: Format.source(item, note.annotationPageLabel, false),
          image: image
        });
			}
			else if(note.isNote())
			{
          data[tag.tag].push({
            type: "note",
            noteid: note.id,
            itemid: item.id,
            itemkey: item.key,
            text: Utils.toxhtml(note.getNote()),
            libraryid: item.libraryID,
          })
			}
			else
			{
				data[tag.tag].push({type: "empty"});
			}
		}
		return data;
	},
  
  image(item: any)
  {
    const filename = Zotero.Annotations.getCacheImagePath(item);
    return filename;
  },
	
	clean(txt: string): string {
		if(!txt)
		{
      return "";
		}
    txt = he.decode(txt);
    txt = txt.replace("<<", '[[').replace(">>", ']]');
    txt = Utils.toxhtml(txt);
    return txt;
	},
	
	async tagged(item: _ZoteroTypes.Items) 
  {
		const untaggedlabel = ZPrefs.get("untagged-column-label", "") || "Untagged";
    
    var data = {};
		
		// do not include item tags
		// data = await this.addnotes(data, item, item.getTags());
		
		if(!item.isNote())
		{
			var noteids  = item.getNotes(false);
			for(const noteid of noteids)
			{
				var note = Zotero.Items.get(noteid);
				let tags = note.getTags();
				if(tags && tags.length>0)
				{
					data = await this.addnotes(data, note, tags, item);
				}
				else
				{
					data = await this.addnotes(data, note, [{tag: untaggedlabel}], item);
				}
			}
		}
		else
		{
			var note = Zotero.Items.get(item.id);
			let tags = note.getTags();
			if(tags && tags.length>0)
			{
				data = await this.addnotes(data, note, tags, item);
			}
			else
			{
				data = await this.addnotes(data, note, [{tag: untaggedlabel}], item);
			}
		}
		
		// From attachments
		if(!item.isAttachment())
		{
			var attachmentids = item.getAttachments(false);
			for(const attachmentid of attachmentids)
			{
				var attachment = Zotero.Items.get(attachmentid);
				if(attachment.isFileAttachment())
				{
					var annotations = attachment.getAnnotations(false);
					for(const annotation of annotations)
					{
						let tags = annotation.getTags();
						if(tags && tags.length>0)
						{
							data = await this.addnotes(data, annotation, tags, item, attachmentid);
						}
						else
						{
							data = await this.addnotes(data, annotation, [{tag: untaggedlabel}], item, attachmentid);
						}
					}
				}
			}
		}
    return data;
	}
}

export default Format;