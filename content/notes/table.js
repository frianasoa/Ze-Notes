
Table = {
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
			let tag = node.dataset.column;
			let d = {};
			node.querySelectorAll(".user-note").forEach(div=>{
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
			
			node.querySelectorAll(".annotation-body").forEach(div=>{
				var annotationcontent = div.querySelector(".direct-quote").innerText;
				var author = div.querySelector(".direct-quote").parentNode.dataset.author;
				var date = div.querySelector(".direct-quote").parentNode.dataset.date;
				var annotationcomments = Table.splitusernotes(div.querySelector(".annotation-comment").innerHTML);	
				s = annotationcomments;
				s["Direct quote"] = annotationcontent;
				s["Author"] = author;
				s["Date"] = date;
				if(Object.keys(d).includes("Selections"))
				{
					d["Selections"].push(s);
				}
				else {
					d["Selections"] = [s];
				}
			});
			
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

		if(!notelist[0].endsWith("]"))
		{
			notelist.splice(0, 0, "[Reader notes]");
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
	}
	
}