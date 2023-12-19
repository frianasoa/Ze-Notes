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
					return Promise.resolve([data.error.message, JSON.stringify(data)]);
				}
			}
			else if(mode=="gemini-pro")
			{
				try {
					return Promise.resolve(data.candidates.map(function(v){return v.content.parts.map(function(w){return w.text	})}));
				}
				catch(e) {
					try {
						if(data.candidates[0].finishReason=="OTHER")
						{
							return Promise.resolve(["Error: No results found!", JSON.stringify(data)]);
						}
						else
						{
							return Promise.resolve([e, JSON.stringify(data)]);
						}
					}
					catch(e)
					{
						return Promise.resolve([e, JSON.stringify(data)]);
					}
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
					return Promise.resolve(["Error: "+e, JSON.stringify(data)]);
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
					return Promise.resolve(["Error: "+e, JSON.stringify(data)]);
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
					return Promise.resolve(["Error: "+e, JSON.stringify(data)]);
				}
			}
			
			else if(mode=="deepl-translate")
			{
				try {
					return Promise.resolve(data.translations.map(function(e){return e.text}));
				}
				catch(e)
				{
					return Promise.resolve(["Error: "+e, JSON.stringify(data)]);
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
			return Promise.reject(["Error: "+e, JSON.stringify(data)]);
		});
	},
	prompts: {
		cell: "Paraphrase and summarize 'Direct quotes'",
		row: "Summarize the data below into a coherent literature review. Add source for each claim in the form (Author date). ",
		table: "Summarize the data below into a coherent literature review. Add source for each claim in the form (Author date). ",
	}
}

Ai.Bard = {
	async translate(sentence)
	{
		var prompts = "Translate the following sentence.";
		return this.sendprompt(sentence, prompts)
	},
	async batchsummarize(data)
	{
		model = "gemini-pro";
		var prompts = Zotero.ZeNotes.Prefs.get("table-custom-prompt");
		if(prompts=="")
		{
			prompts = "Summarize this list of passages. Add the reference. The input is in json format."
		}
		return this.sendprompt(JSON.stringify(data), prompts, model)
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
	
	async customprompt(sentence, target)
	{
		var model = Zotero.ZeNotes.Prefs.get("bard-model");
		var prompts = Zotero.ZeNotes.Prefs.get(target+"-custom-prompt");
		
		if(prompts=="")
		{
			prompts = Ai.prompts[target];
		}
		
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

Ai.DeepL = {
	translate(sentence, language){
		var apikey = Zotero.ZeNotes.Prefs.getb("deepl-api-key");
		var url = "https://api-free.deepl.com/v2/translate"
		
		var payload = {text: [sentence], target_lang: language.toUpperCase()};
		
		var options = {
			method: 'POST',
			headers: {
				"Authorization": "DeepL-Auth-Key "+apikey,
				"Content-Type": "application/json",
			},
			body: JSON.stringify(payload),
		}
		return Ai.request(url, options, "deepl-translate");
	},
}