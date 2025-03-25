import Request from "../Request";

class Base {
  url: string;
  method: string;
  apikey: string;
  model: string;
  headers: any;
  payload: any;
  format: any;

  constructor(url: string, method: string, apikey: string, model: string, headers: any, payload: any, format: any) {
    this.url = url;
    this.method = method;
    this.apikey = apikey;
    this.model = model;
    this.headers = headers;
    this.payload = payload;
    this.format = format;
  }

  prompt(query: string, data: string) {
    let options: any = `{
			"method": "`+this.method+`",
			"headers": `+this.headers+`,
			"body": `+this.payload+`
		}`;
    options = options
      .replace("${apikey}", this.apikey)
      .replace("${model}", this.model)
      .replace("${prompts}", query.split("\"").join("\\\""))
      .replace("${data}", data.split("\"").join("\\\""))
      .replace("${headers}", this.headers);
    
    try {
      options = JSON.parse(options);
      options["body"] = JSON.stringify(options["body"]);
    } catch (e) {
      throw e;
    }
    
    return Request.send(this.url, options, this.format);
  }
}

export default Base;
