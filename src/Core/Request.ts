const Request = {
  send(url: string, options: any, format:any=(data:any)=>data)
  {
    return fetch(url, options).
		then(async res => {
      if (!res.ok) {
        throw await res.json()
      }
			return res.json()
		})
		.then(data => format(data)).
    catch(async error =>{
      throw error.error?.message || error.error || error.message || JSON.stringify(error);
    })
  }
}

export default Request;