AiUi = {
	editcandidate(id){
		var c = document.getElementById(id);
		c.contentEditable = "true";
		c.style.backgroundColor = "#efedff";
		c.focus();
	},
	savecandidate(id)
	{
		var c = document.getElementById(id);
		c.contentEditable = "false";
		c.style.backgroundColor = "";
	},
	
	acceptcandidate(id, currentcomment, annotation, mode="bard")
	{
		var c = document.getElementById(id);
		var comment = c.innerText;
		annotation.annotationComment = currentcomment+"\n\n<b>[Paraphrase]</b>\n"+comment+"\n";
		
		if(mode=="g-translate")
		{
			annotation.annotationComment = currentcomment+"\n\n<b>[Translation]</b>\n"+comment+"\n";
		}
		
		annotation.saveTx({skipSelect:true}).then(e=>{
			Zotero.ZeNotes.Ui.reload();
		});
	},
	
	createdialog(annotation, currentcomment, candidates, mode="bard")
	{
		var confirm_message = "Do you want to use this paraprase?";
		if(mode=="g-translate")
		{
			confirm_message = "Do you want to use this translation?"
		}
		var table = document.createElement("table");
		table.id = "zn-ai-table";
		var th = document.createElement("tr");
		table.appendChild(th);
		for(h of ["Candidate", "Content", ""])
		{
			let td = document.createElement("td");
			td.innerHTML = h;
			th.appendChild(td);
		}
		
		var i = 0;
		for(line of candidates)
		{
			let tr = document.createElement("tr");
			table.appendChild(tr);
			
			
			let id = document.createElement("td");
			id.innerHTML = i+1;
			tr.appendChild(id);
			
			let candidate = document.createElement("td");
			
			candidate.id = "ai-candidate-"+i;
			candidate.addEventListener("blur", function(e){
				AiUi.savecandidate(e.target.id);
			})
			
			tr.appendChild(candidate);
			candidate.innerHTML = line;
			
			let buttons = document.createElement("td");
			tr.appendChild(buttons);
			
			let edit = document.createElement("i");
			edit.className = "fas fa-pen zn-button";
			edit.dataset.candidateid = "ai-candidate-"+i;
			edit.addEventListener("click", function(e){
				AiUi.editcandidate(e.target.dataset.candidateid);
			});
			
			buttons.appendChild(edit);
			
			let accept = document.createElement("i");
			accept.className = "fas fa-check zn-button";
			accept.dataset.candidateid = "ai-candidate-"+i;
			accept.title = "Use this candidate."
			accept.addEventListener("click", function(e){
				if(!confirm(confirm_message))
				{
					return;
				}
				AiUi.acceptcandidate(e.target.dataset.candidateid, currentcomment, annotation, mode);
			});
			buttons.appendChild(accept);
			i+=1;
		}
		return table;
	}
}