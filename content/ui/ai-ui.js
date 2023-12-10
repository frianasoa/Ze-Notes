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
	acceptcandidate(id, currentcomment, annotation)
	{
		var c = document.getElementById(id);
		var comment = c.innerText;
		annotation.annotationComment = currentcomment+"\n\n<b>[Paraphrase]</b>\n"+comment+"\n";
		annotation.saveTx({skipSelect:true}).then(e=>{
			Zotero.ZeNotes.Ui.reload();
		});
	},
	createdialog(candidates)
	{
		var table = document.createElement("table");
		table.id = "zn-bard-table";
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
			
			candidate.id = "bard-paraphrase-"+i;
			candidate.addEventListener("blur", function(e){
				AiUi.savecandidate(e.target.id);
			})
			
			tr.appendChild(candidate);
			candidate.innerHTML = line;
			
			let buttons = document.createElement("td");
			tr.appendChild(buttons);
			
			let edit = document.createElement("i");
			edit.className = "fas fa-pen zn-button";
			edit.dataset.candidateid = "bard-paraphrase-"+i;
			edit.addEventListener("click", function(e){
				AiUi.editcandidate(e.target.dataset.candidateid);
			});
			
			buttons.appendChild(edit);
			
			let accept = document.createElement("i");
			accept.className = "fas fa-check zn-button";
			accept.dataset.candidateid = "bard-paraphrase-"+i;
			accept.title = "Use this candidate."
			accept.addEventListener("click", function(e){
				if(!confirm("Do you want to use this paraprase?"))
				{
					return;
				}
				AiUi.acceptcandidate(e.target.dataset.candidateid, currentcomment, annotation);
			});
			buttons.appendChild(accept);
			i+=1;
		}
		return table;
	}
}