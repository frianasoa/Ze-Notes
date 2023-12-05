Image = {
	async render(txt, item)
	{
		if(!txt.includes("<img"))
		{
			return txt;
		}
		
		var html = null;
		if (Zotero.platformMajorVersion >= 102) {
			var parser = new DOMParser();
			html = parser.parseFromString(txt, "text/html").body;
		}
		else {
			const parser = Components.classes['@mozilla.org/xmlextras/domparser;1'].createInstance(Components.interfaces.nsIDOMParser);
			html = parser.parseFromString(txt, 'text/html').documentElement;
		}
		
		for(img of html.querySelectorAll("img")) {
			img.style.width = "99%";
			if(img.dataset.attachmentKey)
			{
				let attachment = Zotero.Items.getByLibraryAndKey(item.libraryID, img.dataset.attachmentKey);
				if(attachment) 
				{
					var dataURI = await attachment.attachmentDataURI
					img.setAttribute('src', dataURI);
					img.removeAttribute('data-attachment-key');
					img.removeAttribute('height');
					img.removeAttribute('width');
				}
			}
		}
		return Promise.resolve(html.innerHTML);
	},
}