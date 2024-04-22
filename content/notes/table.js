
Table = {
	celldata(td)
	{
		let d = {};
		td.querySelectorAll(".user-note").forEach(div=>{
			if(Object.keys(d).includes("Reader notes") && div.innerText!="")
			{
				d["Reader notes"]+=div.innerText.trim("\n")+"\n";
			}
			else if(div.innerText!="")
			{
				d["Reader notes"]=div.innerText.trim("\n")+"\n";
			}
		});
		
		if(Object.keys(d).includes("Reader notes"))
		{
			d["Reader notes"] = d["Reader notes"].trim("\n")
		}
		
		td.querySelectorAll(".annotation-body").forEach(div=>{
			var annotationcontent = "";
			var author = "";
			var date = "";
			var tag = "";
			var directquotediv = div.querySelector(".direct-quote")
			var annotationcommentdiv = div.querySelector(".annotation-comment");
			var annotationcomments = {};
			
			if(directquotediv!=null)
			{
				annotationcontent = directquotediv.innerText;
				author = directquotediv.parentNode.dataset.author;
				date = directquotediv.parentNode.dataset.date;
				tag = directquotediv.parentNode.dataset.tag;
			}
			author = div.parentNode.dataset.author;
			
			if(annotationcommentdiv!=null)
			{
				annotationcomments = Table.splitusernotes(annotationcommentdiv.innerHTML);	
			}
			
			s = annotationcomments;
			s["Direct quote"] = annotationcontent;
			s["Author"] = author;
			s["Date"] = date;
			s["Tag"] = tag;
			s = this.filter(s);
			
			if(Object.keys(d).includes("Selections"))
			{
				if(Object.keys(s).length>0)
				{
					d["Selections"].push(s);
				}
			}
			else {
				if(Object.keys(s).length>0)
				{
					d["Selections"] = [s];
				}
			}
		});
		
		return d;
	},
	
	rowdata(tr){
		var data = {
			info: {},
			contents: [],
		}
		tr.querySelectorAll("[data-type='info']").forEach(e=>{
			let key = e.dataset.column;
			data["info"][key] = e.innerText;
		});
		tr.querySelectorAll("td").forEach(node=>{
			let d = this.celldata(node);
			let tag = node.dataset.column;
			if(Object.keys(d).length>0)
			{
				d["Part"] = tag;
				data.contents.push(d);
			}
		})
		return data;
	},
	
	tabledata(ref)
	{
		var data = []
		ref.closest("table").querySelectorAll(".zn-data-row").forEach(tr=>{
			data.push(this.rowdata(tr));
		});
		return data;
	},
	
	splitusernotes(usernotes){
		usernotes = usernotes.split("<br xmlns=\"http://www.w3.org/1999/xhtml\" />").join("\n");
		usernotes = usernotes.split("<b xmlns=\"http://www.w3.org/1999/xhtml\">").join(" ");
		usernotes = usernotes.split("</b>").join(" ");
		var r = {};
		var notelist = usernotes.split("\n").filter(function(e){
			return e!="";
		});
		
		if(notelist.length>0)
		{
			if(!notelist[0].endsWith("]"))
			{
				notelist.splice(0, 0, "[Reader notes]");
			}
		}
		
		var key = "";
		
		for(e of notelist)
		{
			e = e.trim();
			if(e.startsWith("[") && e.endsWith("]"))
			{
				key = e.split("[").join(" ").split("]").join(" ").trim();
				if(!Object.keys(r).includes(key))
				{
					r[key] = []
				}
			}
			else
			{
				r[key].push(e);
			}
		}
		
		for(k in r)
		{
			r[k] = r[k].join("\n");
		}		
		return r;
	},
	
	filter(s)
	{
		Object.keys(Zotero.ZeNotes.Filter.excludefields).forEach(field=>{
			let r = Zotero.ZeNotes.Prefs.get("exclude-"+field, false);
			if(r=="true" || r==true)
			{
				delete s[field];
			}
		})
		return s;
	}
}