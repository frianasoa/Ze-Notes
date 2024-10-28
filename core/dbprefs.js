DBPrefs = {
	async init(){
		this.DB = new Zotero.DBConnection("zdbprefs");
		await this.create();
	},
	
	async close()
	{
		await this.DB.closeDatabase(true);
	},
	
	async create(){
		var sql = "CREATE TABLE IF NOT EXISTS `preferences` (id INTEGER PRIMARY KEY, key TEXT UNIQUE, value TEXT)";
		return await this.exec(sql);
	},
	
	tojson(res)
	{
		var data = [];
		for(r of res)
		{
			let v = [];
			for(i of Object.keys(r))
			{
				v[i] = r[i]
			}
			data.push(v)
		}
		return data;
	},
	
	async exec(q, values, columns=null)
	{
		return this.DB.queryAsync(q, values).then(res=>{
			let data = [];
			if(typeof res!="undefined")
			{
				for(r of res)
				{
					data.push({
						key: r.key,
						value: r.value
					})
				}
			}
			return data
		}).catch(e=>{Zotero.log(e)});
	},
	
	async set(key, value)
    {
		var q = "INSERT OR IGNORE INTO `preferences`(key, value) VALUES(?, ?)";
		var values = [key, value];
		return this.exec(q, values).then(()=>{
			DBPrefs.update(key, value);
		});
    },
	
	async update(key, value)
    {
		var q = "UPDATE `preferences` SET value=? WHERE key=?";
		var values = [value, key];
		await this.exec(q, values);
    },
	
	async get(key, default_value=null)
    {
		var values = [key];
		var q = "SELECT * FROM  `preferences` WHERE key=?";
		var r = await this.exec(q, values);
		if(r.length>0)
		{
			if(Object.keys(r[0]).includes("value"))
			{
				return r[0].value;
			}
		}
    },
}