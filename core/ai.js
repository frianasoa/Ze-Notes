var fetch = Zotero.getMainWindow().fetch;
Ai={
	request(url, options, mode="bard"){
		return fetch(url, options).
		then(res => {
			return res.json()
		})
		.then(data => {
			if(mode=="bard")
			{
				try {
					return Promise.resolve(data.candidates.map(function(v){return v.output}));
				}
				catch(e) {
					return Promise.resolve([data.error.message]);
				}
			}
			else if(mode=="g-translate")
			{
				try {
					// Google translate
					return Promise.resolve(data.data.translations.map(function(e){return e.translatedText}));
				}
				catch(e)
				{
					return Promise.resolve(["Error: "+e]);
				}
			}
			
		}).catch(e=>{
			return Promise.reject(["Error: "+e]);
		});
	}
}

Ai.Bard = {
	async translate(sentence)
	{
		var prompts = "Translate the following sentence.";
		return this.sendprompt(sentence, prompts)
	},
	
	async summarize(sentence, ratio=1/4)
	{
		var prompts = "Summarize the following in about "+Math.round(sentence.split(" ").length*ratio)+" words:"
		return this.sendprompt(sentence, prompts);
	},
	
	async paraphrase(sentence)
	{
		var prompts = "Paraphrase the following:"
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
			"candidate_count": 3 
		}
		
		var options = {
			method: 'POST',
			headers: {
				'Accept': 'application/json',
				"Content-Type": "application/json"
			},
			body: JSON.stringify(payload),
		}
		return Ai.request(url, options, "bard");
	},
}

Ai.Google = {
	translate(sentence, language){
		var apikey = Zotero.ZeNotes.Prefs.getb("google-translate-key");
		var url = "https://translation.googleapis.com/language/translate/v2?key="+apikey+"&target="+language
		
		var payload = {q: sentence};
		
		var options = {
			method: 'POST',
			headers: {
				"Content-Type": "application/json;  charset=utf-8",
				'Accept': 'application/json',
			},
			body: JSON.stringify(payload),
		}
		return Ai.request(url, options, "g-translate");
	},
}