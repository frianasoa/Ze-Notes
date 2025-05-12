
const Format = {
  google(data: any) {
    try {
      return [data[0].map((e:any)=>{return e[0]}).join(" ")];
    }
    catch(e)
    {
      try {
        return [data.data.translations.map((e:any)=>{return e.translatedText}).join(" ")];
      }
      catch(e1)
      {
        return [e1];
      }
      return [e];
    }
  },
  
  deepl(data:any)
  {
    try {
      return Promise.resolve(data.translations.map(function(e: any){return e.text}));
    }
    catch(e)
    {
      return Promise.resolve(["Error: "+e, JSON.stringify(data)]);
    }
  }
}

export default Format;