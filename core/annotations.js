Annotations = {
	initmenu()
	{
		if (Zotero.platformMajorVersion >= 102) {
			Annotations.addmenus();
		}
		else
		{
			Zotero.Reader._readers.forEach(reader=>{
				Annotations.addmenus6(reader);
			});
			
			Zotero.Reader.zn_open = Zotero.Reader.open;
			Zotero.Reader.open = function(itemID, location, options){
				Zotero.Reader.zn_open(itemID, location, options).then(reader=>{
					Annotations.addmenus6(reader);
				})
			}
		}
	},
	
	newmenus(reader, params){
		reader.menus = {};
		var tlcode = Zotero.ZeNotes.Prefs.get("target-language");
		var tl = "";
		if(tlcode=="")
		{
			tl = "English";
		}
		else 
		{
			for(a of Zotero.ZeNotes.Languages.list())
			{
				if(tlcode.toUpperCase()==a.code.toUpperCase())
				{
					tl = a.name;
					break;
				}
			}
		}
		let label = 'Translate to '+tl+' [Google]';
		
		reader.menus[label] = {
			label: 'Translate to '+tl+' [Google]',
			image: 'fa-language',
			onCommand: function(){
				for(id of params.ids)
				{
					var annotation = reader._item.getAnnotations().filter(function(e){return e.key==id})[0];
					Zotero.ZeNotes.Actions.googletranslate(annotation, true);
				}
			}
		};
		
		if(Zotero.ZeNotes.Prefs.getb("deepl-api-key")!="")
		{
			label = 'Translate to '+tl+' [DeepL]';
			reader.menus[label] = {
				label: label,
				image: "fa-language",
				onCommand: function(){
					for(id of params.ids)
					{
						var annotation = reader._item.getAnnotations().filter(function(e){return e.key==id})[0];
						Zotero.ZeNotes.Actions.deepltranslate(annotation, true);
					}
				}
			};
		}
		
		if(Zotero.ZeNotes.Prefs.getb("bard-api-key")!="")
		{
			label = 'Paraphrase [Bard]';
			reader.menus[label] = {
				label: label,
				image: "fa-arrow-right-arrow-left",
				onCommand: function(){
					for(id of params.ids)
					{
						var annotation = reader._item.getAnnotations().filter(function(e){return e.key==id})[0];
						Zotero.ZeNotes.Actions.bardparaphrase(annotation, true);
					}
				}
			};
		}
		
		if(Zotero.ZeNotes.Prefs.getb("openai-api-key")!="")
		{
			label = 'Paraphrase [ChatGPT]';
			reader.menus[label] = {
				label: label,
				image: "fa-robot",
				onCommand: function(){
					for(id of params.ids)
					{
						var annotation = reader._item.getAnnotations().filter(function(e){return e.key==id})[0];
						Zotero.ZeNotes.Actions.openaiparaphrase(annotation, true);
					}
				}
			};
		}
	},
	addmenus(){
		Zotero.Reader.registerEventListener('createAnnotationContextMenu', (event) => {
			let { reader, params, append } = event;
			Annotations.newmenus(reader, params);
			for(menu of Object.values(reader.menus))
			{				
				append(menu);
			}
		});
	},
	
	addmenus6(reader){
		if(Object.getOwnPropertyNames(reader).includes("zn_createpopup"))
		{
			return;
		}
		reader._item = Zotero.Items.get(reader._itemID);
		reader.zn_createpopup = reader._openAnnotationPopup;
		reader._openAnnotationPopup = function(data) {
			Annotations.newmenus(reader, data)
			reader.zn_createpopup(data);
			
			var popup = Array.from(reader._window.document.querySelectorAll("menupopup")).filter(function(e){
				return e.outerHTML.includes("menuitem label=\"Purple\" class=\"menuitem-iconic\"");
			})[0];
			
			for(label in reader.menus)
			{	
				var menu = reader.menus[label];
				menuitem = reader._window.document.createElement('menuitem');
				menuitem.setAttribute('label', menu.label);
				menuitem.className = 'menuitem-iconic';
				menuitem.setAttribute('image', Annotations.geticon(menu.image));
				menuitem.addEventListener('command', (e) => {
					reader.menus[e.target.label].onCommand();
				});
				popup.appendChild(menuitem);
			}
		}
	},
	geticon(name)
	{
		name = name.replace("fa-", "");
		let url = "chrome://ze-notes/content/lib/fontawesome/6.1.1/svgs/";
		return url+name+".svg"
	}
}