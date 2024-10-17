Actions = {
	editannotationcomment(annotation){
		if(!annotation)
		{
			alert("Annotation not found!");
			return;
		}
			
		var currentcomment = annotation.annotationComment;
		if(currentcomment==null)
		{
			currentcomment = "";
		}
			
		var html = document.createElement("div");
		html.style = "width:100%; padding: 0.5em;"
		var value = currentcomment.split("\n").join("<br/>");
		value = value.split("&").join("&amp;")
		html.innerHTML = value;
		html.contentEditable = true;
		
		Dialog.open(html, function(){
			let value = html.innerHTML.split("<br xmlns=\"http://www.w3.org/1999/xhtml\" />").join("\n");
			
			value = value.split(" xmlns=\"http://www.w3.org/1999/xhtml\"").join("");
			value = value.split("<div>").join("");
			value = value.split("</div>").join("\n");
			value = value.split("<br />").join("\n");
			value = value.split("<br/>").join("\n");
			
			value = value.split("&amp;").join("&");
			
			annotation.annotationComment = value;				
			annotation.saveTx({skipSelect:true}).then(e=>{
				Zotero.ZeNotes.Ui.reload();
			});
		}, "Edit annotation comment", "save");
	},
	
	showannotation(attachmentid, annotationpage, annotationkey){
		var attachment = Zotero.Items.get(attachmentid);
		
		if(!attachment)
		{
			alert("Attachment not found");
			return;
		}
		
		if(!annotationkey)
		{
			alert("Annotation not found!");
			return;
		}		
		Zotero.OpenPDF.openToPage(attachment, annotationpage, annotationkey);
	},
	
	googletranslate(annotation, direct=false){
		var tl = Zotero.ZeNotes.Prefs.get("target-language");
		var currentcomment = annotation.annotationComment;
		if(currentcomment==null)
		{
			currentcomment = "";
		}
			
		var mode = "api-key";
		if(Zotero.ZeNotes.Prefs.getb("google-translate-key")=="")
		{
			mode="free-0";
		}
		
		Zotero.ZeNotes.Ai.Google.translate(annotation["annotationText"], tl, mode).then(r=>{
			if(direct)
			{
				annotation.annotationComment = currentcomment+"\n\n<b>[Translation]</b>\n"+r[0]+"\n";
				annotation.saveTx({skipSelect:true}).then(e=>{
				});
				return;
			}
			
			var table = AiUi.createdialog(annotation, currentcomment, r, "g-translate");
			Dialog.open(table, function(){}, "Choose translation [Google]", "close");
		}).catch(r=>{
			var html = "";
			if(Array.isArray(r))
			{
				html = r.join("<br/>");
			}
			else
			{
				html="-"+r;
			}
			Dialog.open(html, function(){
			});
		});
	},
	
	deepltranslate(annotation, direct=false)
	{
		var tl = Zotero.ZeNotes.Prefs.get("target-language");
		var currentcomment = annotation.annotationComment;
		if(currentcomment==null)
		{
			currentcomment = "";
		}
			
		Zotero.ZeNotes.Ai.DeepL.translate(annotation["annotationText"], tl).then(r=>{
			if(direct)
			{
				annotation.annotationComment = currentcomment+"\n\n<b>[Translation]</b>\n"+r[0]+"\n";
				annotation.saveTx({skipSelect:true}).then(e=>{
				});
				return;
			}
			
			var table = AiUi.createdialog(annotation, currentcomment, r, "deepl-translate");
			Dialog.open(table, function(){}, "Choose translation [DeepL]", "close");
		}).catch(r=>{
			var html = "";
			if(Array.isArray(r))
			{
				html = r.join("<br/>");
			}
			else
			{
				html="-"+r;
			}
			Dialog.open(html, function(){
			});
		});
	},
	
	customapitranslate(annotation, direct=false)
	{
		var tl = Zotero.ZeNotes.Prefs.get("target-language");
		var currentcomment = annotation.annotationComment;
		if(currentcomment==null)
		{
			currentcomment = "";
		}
			
		Zotero.ZeNotes.Ai.Custom.translate(annotation["annotationText"], tl).then(r=>{
			if(direct)
			{
				annotation.annotationComment = currentcomment+"\n\n<b>[Translation]</b>\n"+r[0]+"\n";
				annotation.saveTx({skipSelect:true}).then(e=>{
				});
				return;
			}
			
			var name = Zotero.ZeNotes.Prefs.get("custom-api-name");
			var table = AiUi.createdialog(annotation, currentcomment, r, "custom-api-translate");
			Dialog.open(table, function(){}, "Choose translation ["+name+"]", "close");
		}).catch(r=>{
			var html = "";
			if(Array.isArray(r))
			{
				html = r.join("<br/>");
			}
			else
			{
				html="-"+r;
			}
			Dialog.open(html, function(){
			});
		});
	},
	
	openaitranslate(annotation, direct=false)
	{
		var tl = Zotero.ZeNotes.Prefs.get("target-language");
		var currentcomment = annotation.annotationComment;
		if(currentcomment==null)
		{
			currentcomment = "";
		}
			
		Zotero.ZeNotes.Ai.OpenAi.translate(annotation["annotationText"], tl).then(r=>{
			if(direct)
			{
				annotation.annotationComment = currentcomment+"\n\n<b>[Translation]</b>\n"+r[0]+"\n";
				annotation.saveTx({skipSelect:true}).then(e=>{
				});
				return;
			}
			
			var table = AiUi.createdialog(annotation, currentcomment, r, "openai-api-translate");
			Dialog.open(table, function(){}, "Choose translation [Open Ai]", "close");
		}).catch(r=>{
			var html = "";
			if(Array.isArray(r))
			{
				html = r.join("<br/>");
			}
			else
			{
				html="-"+r;
			}
			Dialog.open(html, function(){
			});
		});
	},
	
	bardcustomprompt(data, target, annotation)
	{
		if(Zotero.ZeNotes.Prefs.getb("bard-api-key")=="")
		{
			alert("Please set API key first.\nGo to ZeNotes > Settings > General Settings > AI API settings");
			return;
		}
			
		var customprompt = Zotero.ZeNotes.Prefs.get(target+"-custom-prompt");
		if(!customprompt)
		{
			customprompt = Zotero.ZeNotes.Ai.prompts[target];
		}
			
		var currentcomment = annotation.annotationComment;
		if(currentcomment==null)
		{
			currentcomment = "";
		}
			
		Zotero.ZeNotes.Ai.Bard.customprompt(JSON.stringify(data), target).then(r=>{
			var table = AiUi.createdialog(annotation, currentcomment, r, "bard");
			var model = Zotero.ZeNotes.Prefs.get("bard-model");
			var div = document.createElement("div");
			div.innerHTML = "<h2>Custom prompt</h2> "+customprompt+"<hr/>"+this.displayjson(data);
			try {
				TabbedDialog.open(table, div, function(){}, "Edit and choose a candidate [Bard: "+model+"]", "close");
			}
			catch(e)
			{
				alert(e);
			}
		}).catch(r=>{
			var div = document.createElement("div");
			div.innerHTML = "<h2>Custom prompt</h2> "+customprompt+"<hr/>"+this.displayjson(data);
			var html = "";
			if(Array.isArray(r))
			{
				html = r.join("<br/>");
			}
			else
			{
				html="-"+r;
			}
			TabbedDialog.open(html, div, function(){
			});
		});
	},
	
	openaicustomprompt(data, target, annotation) {
		if(Zotero.ZeNotes.Prefs.getb("openai-api-key")=="")
		{
			alert("Please set API key first.\nGo to ZeNotes > Settings > General Settings > AI API settings");
			return;
		}
		
		var currentcomment = annotation.annotationComment;
		if(currentcomment==null)
		{
			currentcomment = "";
		}
		
		var customprompt = Zotero.ZeNotes.Prefs.get(target+"-custom-prompt");
		if(!customprompt)
		{
			customprompt = Zotero.ZeNotes.Ai.prompts[target];
		}
			
		Zotero.ZeNotes.Ai.OpenAi.customprompt(JSON.stringify(data), target).then(r=>{
			var model = Zotero.ZeNotes.Prefs.get("openai-model");
			var table = AiUi.createdialog(annotation, currentcomment, r, "openai");
			var div = document.createElement("div");
			div.innerHTML = "<h2>Custom prompt</h2> "+customprompt+"<hr/>"+this.displayjson(data);
			try {
				TabbedDialog.open(table, div, function(){}, "Edit and choose a candidate [OpenAi: "+model+"]", "close");
			}
			catch(e)
			{
				alert(e);
			}
		}).catch(r=>{
			var div = document.createElement("div");
			div.innerHTML = "<h2>Custom prompt</h2> "+customprompt+"<hr/>"+this.displayjson(data);
			var html = "";
			if(Array.isArray(r))
			{
				html = r.join("<br/>");
			}
			else
			{
				html="-"+r;
			}
			TabbedDialog.open(html, div, function(){
			});
		});
	},
	
	customapicustomprompt(data, target, annotation) {
		if(Zotero.ZeNotes.Prefs.getb("custom-api-key")=="")
		{
			alert("Please set API key first.\nGo to ZeNotes > Settings > General Settings > AI API settings");
			return;
		}
		
		var currentcomment = annotation.annotationComment;
		if(currentcomment==null)
		{
			currentcomment = "";
		}
		
		var customprompt = Zotero.ZeNotes.Prefs.get(target+"-custom-prompt");
		if(!customprompt)
		{
			customprompt = Zotero.ZeNotes.Ai.prompts[target];
		}
			
		Zotero.ZeNotes.Ai.Custom.customprompt(JSON.stringify(data), target).then(r=>{
			var name = Zotero.ZeNotes.Prefs.get("custom-api-name");
			var model = Zotero.ZeNotes.Prefs.get("custom-api-model");
			var table = AiUi.createdialog(annotation, currentcomment, r, "custom-api");
			var div = document.createElement("div");
			div.innerHTML = "<h2>Custom prompt</h2> "+customprompt+"<hr/>"+this.displayjson(data);
			try {
				TabbedDialog.open(table, div, function(){}, "Edit and choose a candidate ["+name+": "+model+"]", "close");
			}
			catch(e)
			{
				alert(e);
			}
		}).catch(r=>{
			var div = document.createElement("div");
			div.innerHTML = "<h2>Custom prompt</h2> "+customprompt+"<hr/>"+this.displayjson(data);
			var html = "";
			if(Array.isArray(r))
			{
				html = r.join("<br/>");
			}
			else
			{
				html="-"+r;
			}
			TabbedDialog.open(html, div, function(){
			});
		});
	},
	
	bardparaphrase(annotation, direct=false)
	{
		if(Zotero.ZeNotes.Prefs.getb("bard-api-key")=="")
		{
			alert("Please set API key first.\nGo to ZeNotes > Settings > General Settings > AI API settings");
			return;
		}
		
		var currentcomment = annotation.annotationComment;
		if(currentcomment==null)
		{
			currentcomment = "";
		}
		
		Zotero.ZeNotes.Ai.Bard.paraphrase(annotation["annotationText"]).then(r=>{
			if(direct)
			{
				annotation.annotationComment = currentcomment+"\n\n<b>[Paraphrase]</b>\n"+r[0]+"\n";
				annotation.saveTx({skipSelect:true}).then(e=>{
				});
				return;
			}
			
			var table = AiUi.createdialog(annotation, currentcomment, r, "bard");
			var model = Zotero.ZeNotes.Prefs.get("bard-model");
			Dialog.open(table, function(){}, "Edit and choose a paraphrase [Bard: "+model+"]", "close");
		}).catch(r=>{
			var html = "";
			if(Array.isArray(r))
			{
				html = r.join("<br/>");
			}
			else
			{
				html="-"+r;
			}
			if(direct)
			{
				alert(html);
				return;
			}
			Dialog.open(html, function(){
			});
		});
	},
	
	openaiparaphrase(annotation, direct=false)
	{
		if(Zotero.ZeNotes.Prefs.getb("openai-api-key")=="")
		{
			alert("Please set API key first.\nGo to ZeNotes > Settings > General Settings > AI API settings");
			return;
		}
		
		var currentcomment = annotation.annotationComment;
		if(currentcomment==null)
		{
			currentcomment = "";
		}
		
		Zotero.ZeNotes.Ai.OpenAi.paraphrase(annotation["annotationText"]).then(r=>{
			if(direct)
			{
				annotation.annotationComment = currentcomment+"\n\n<b>[Paraphrase]</b>\n"+r[0]+"\n";
				annotation.saveTx({skipSelect:true}).then(e=>{});
				return;
			}
			
			var table = AiUi.createdialog(annotation, currentcomment, r, "gpt");
			var model = Zotero.ZeNotes.Prefs.get("openai-model");
			Dialog.open(table, function(){}, "Edit and choose a paraphrase [OpenAi: "+model+"]", "close");
		}).catch(r=>{
			var html = "";
			if(Array.isArray(r))
			{
				html = r.join("<br/>");
			}
			else
			{
				html="-"+r;
			}
			if(direct)
			{
				alert(html);
				return;
			}
			Dialog.open(html, function(){
			});
		});
	},
	
	customapiparaphrase(annotation, direct=false)
	{
		if(Zotero.ZeNotes.Prefs.getb("custom-api-key")=="")
		{
			alert("Please set API key first.\nGo to ZeNotes > Settings > General Settings > AI API settings");
			return;
		}
		
		var currentcomment = annotation.annotationComment;
		if(currentcomment==null)
		{
			currentcomment = "";
		}
		
		Zotero.ZeNotes.Ai.Custom.paraphrase(annotation["annotationText"]).then(r=>{
			if(direct)
			{
				annotation.annotationComment = currentcomment+"\n\n<b>[Paraphrase]</b>\n"+r[0]+"\n";
				annotation.saveTx({skipSelect:true}).then(e=>{});
				return;
			}
			
			var table = AiUi.createdialog(annotation, currentcomment, r, "gpt");
			var model = Zotero.ZeNotes.Prefs.get("custom-api-model");
			Dialog.open(table, function(){}, "Edit and choose a paraphrase [Custom api: "+model+"]", "close");
		}).catch(r=>{
			var html = "";
			if(Array.isArray(r))
			{
				html = r.join("<br/>");
			}
			else
			{
				html="-"+r;
			}
			if(direct)
			{
				alert(html);
				return;
			}
			Dialog.open(html, function(){
			});
		});
	},
	
	displayjson(json) {
		if (typeof json != 'string') {
			 json = JSON.stringify(json, undefined, 2);
		}
		json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
		json = json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
			var cls = 'json-number';
			if (/^"/.test(match)) {
				if (/:$/.test(match)) {
					cls = 'json-key';
				} else {
					cls = 'json-string';
				}
			} else if (/true|false/.test(match)) {
				cls = 'json-boolean';
			} else if (/null/.test(match)) {
				cls = 'json-null';
			}
			return '<span class="' + cls + '">' + match + '</span>';
		});
		
		json = json.split("\n").join("<br/>").split("  ").join("&#160;&#160;");
		return json;
	}
	
}