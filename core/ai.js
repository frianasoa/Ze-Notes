var fetch = Zotero.getMainWindow().fetch;
Ai={
	request(url, options, mode="bard"){
		return fetch(url, options).
		then(res => {
			return res.json()
		})
		.then(data => {
			if(mode=="text-bison-001")
			{
				try {
					return Promise.resolve(data.candidates.map(function(v){return v.output}));
				}
				catch(e) {
					return Promise.resolve([data.error.message]);
				}
			}
			else if(mode=="gemini-pro")
			{
				// alert(JSON.stringify(data));
				try {
					return Promise.resolve(data.candidates.map(function(v){return v.content.parts.map(function(w){return w.text})}));
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
			else if(mode=="g-translate-free-0")
			{
				try {
					// Google translate without api key
					return Promise.resolve([data[0].map(function(e){return e[0]}).join(" ")]);
				}
				catch(e)
				{
					return Promise.resolve(["Error: "+e]);
				}
			}
			else if(mode=="g-translate-free-1")
			{
				try {
					// Google translate without api key
					return Promise.resolve(data.map(function(e){return e[0]}));
				}
				catch(e)
				{
					return Promise.resolve(["Error: "+e]);
				}
			}
			else if(mode=="bing")
			{
				try {
					// Google translate without api key
					return Promise.resolve(data.map(function(e){return e[0]}));
				}
				catch(e)
				{
					return Promise.resolve(["Error: "+e, JSON.stringify(data)]);
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
	
	async summarize(sentence, ratio=1/3)
	{
		model = Zotero.ZeNotes.Prefs.get("bard-model");
		if(model=="")
		{
			model = "gemini-pro";
		}
		var prompts = "Your are an academic.　Summarize the following in about "+Math.round(sentence.split(" ").length*ratio)+" words:"
		return this.sendprompt(sentence, prompts, model);
	},
	
	async paraphrase(sentence)
	{
		model = Zotero.ZeNotes.Prefs.get("bard-model");
		if(model=="")
		{
			model = "gemini-pro";
		}
		
		var prompts = "Your are an academic. Paraphrase the following. "
		return this.sendprompt(sentence, prompts, model)
	},
	
	async customprompt(sentence)
	{
		var model = Zotero.ZeNotes.Prefs.get("bard-model");
		var prompts = Zotero.ZeNotes.Prefs.get("bard-custom-prompt");
		if(model=="")
		{
			model = "gemini-pro";
		}
		return this.sendprompt(sentence, prompts+" \n\n"+sentence, model)
	},
	
	async sendprompt(sentence, prompts, model) {
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
		
		if(model=="gemini-pro")
		{
			url = "https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key="+apikey;
			
			payload = {
				"contents": 
				[
					{
						"role": "user",
						"parts":[{"text": p}]
					}
				],
				// "temperature": 1.0,
				// "candidate_count": 3 
			}
		}
		
		var options = {
			method: 'POST',
			headers: {
				'Accept': 'application/json',
				"Content-Type": "application/json"
			},
			body: JSON.stringify(payload),
		}

		
		return Ai.request(url, options, model);
	},
}

Ai.Google = {
	translatewithapi(sentence, language){
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
	
	translate(sentence, language, mode="api-key")
	{
		if(mode=="api-key")
		{
			return this.translatewithapi(sentence, language);
		}
		
		else if(mode=="free-0")
		{
			var url = "https://translate.googleapis.com/translate_a/single?client=gtx&dt=t&sl=auto&tl="+language+"&q="+encodeURIComponent(sentence);
			var options = {method: 'POST', headers: {},}
			return Ai.request(url, options, "g-translate-free-0");
		}
		else if(mode=="free-1")
		{
			var url = "https://clients5.google.com/translate_a/t?client=dict-chrome-ex&sl=auto&tl="+language+"&q="+encodeURIComponent(sentence);
			var options = {method: 'POST', headers: {},}
			return Ai.request(url, options, "g-translate-free-1");
		}
	},
}