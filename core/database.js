Database = 
{
    async create(){
		var sql1 = "CREATE TABLE IF NOT EXISTS `default` (id INTEGER PRIMARY KEY, collectionid TEXT UNIQUE, label TEXT, contents TEXT)";
		var sql2 = "CREATE TABLE IF NOT EXISTS `settings` (id INTEGER PRIMARY KEY, collectionid TEXT UNIQUE, label TEXT, contents TEXT)";
		return this.exec(sql1).then(()=>{
			Promise.resolve(Database.exec(sql2));
		});
	},
	
	async execget(q, values){
		var DB = new Zotero.DBConnection("zenotes");
		return DB.queryAsync(q, values).then(r=>{
			DB.closeDatabase();
			var data = [];
			for(i in r){
				data.push({
					"label": r[i].label,
					"contents": r[i].contents,
					"collectionid": r[i].collectionid,
				});
			}
			return Promise.resolve(data);
		}).catch(e=>{DB.closeDatabase(); return Promise.resolve("error")});
	},
	
	async exec(q, values, columns=null){
		var DB = new Zotero.DBConnection("zenotes");
		return DB.queryAsync(q, values).then(r=>{
			DB.closeDatabase();
			return Promise.resolve(r[0].contents);
		}).catch(e=>{DB.closeDatabase()});
	},
	
    addsetting(collectionid, label, contents)
    {
		var q = "INSERT OR IGNORE INTO `default`(collectionid, label, contents) VALUES(?, ?, ?)";
		var values = [collectionid, label, contents];
		this.exec(q, values).then(()=>{
			Database.updatesetting(collectionid, label, contents);
		});
    },
	
    updatesetting(collectionid, label, contents)
    {
		var q = "UPDATE `default` SET label=?, contents=? WHERE collectionid=?";
		var values = [label, contents, collectionid];
		this.exec(q, values);
    },
	
    async updatesettingvalue(collectionid, field, value)
    {
		var q = "UPDATE `default` SET "+field+"=? WHERE collectionid=?";
		var values = [value, collectionid];
		this.exec(q, values);
    },
    
    deletesetting(collectionid)
    {
		var q = "DELETE FROM `default` WHERE collectionid=?";
		var values = [collectionid];
		this.exec(q, values);
    },

    async getsetting(collectionid)
    {
		var q = "SELECT * FROM  `default` WHERE collectionid=?";
		var values = [collectionid];
        return this.exec(q, values);
    },

    async getsettings()
    {
		var q = "SELECT * FROM  `default`";
        return this.execget(q, []);
    },
	
	async hidecolumn(collectionid, column)
	{
		var data = await this.getsetting(collectionid);
		
		try {
			var data = JSON.parse(data);
			data["hidden"].push(column);
			await this.updatesettingvalue(collectionid, "contents", JSON.stringify(data));
			return Promise.resolve();
		}
		catch(e)
		{
			return Promise.resolve();
		}
	},
	
	async copysettings(scollectionid, dcollectionid, label)
	{
		var q = "INSERT OR REPLACE INTO `default` (label, contents, collectionid) SELECT ?, contents, ? FROM `default` WHERE collectionid = ?"
		var values = [label, dcollectionid, scollectionid];
		return this.exec(q, values)
	}
}