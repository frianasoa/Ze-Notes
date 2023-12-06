var fetch = Zotero.getMainWindow().fetch;
Ai={
	request(url, options){
		return fetch(url, options).
		then(res => {
			return res.json()
		})
		.then(data => {
			try {
				return Promise.resolve(data.candidates[0].output);
			}
			catch {
				return Promise.resolve("");
			}
		}).catch(e=>{
			return Promise.reject("error: "+e);
		});
	}
}

Ai.Bard = {
	
	async translate(sentence)
	{
		var prompts = "Translate the following sentence.";
		return this.sendprompt(sentence, prompts)
	},
	
	async paraphrase(sentence)
	{
		var prompts = "This task is a literature review. Paraphrase the passage below. Tell with an academic writing tone. Do not add additional explanation."
		return this.sendprompt(sentence, prompts)
	},
	
	async sendprompt(sentence, prompts) {
		var apikey = Zotero.ZeNotes.Prefs.getb("bard-api-key");
		var url = "https://generativelanguage.googleapis.com/v1beta3/models/text-bison-001:generateText?key="+apikey;
		
		var p = prompts+"\n\n"+sentence;
		
		var payload = {
			"prompt": {
				"text": p,	
			},
			"temperature": 1.0,
			"candidate_count": 1 
		}
		
		var options = {
			method: 'POST',
			headers: {
				'Accept': 'application/json',
				"Content-Type": "application/json"
			},
			body: JSON.stringify(payload),
		}
		return Ai.request(url, options);
	},
}