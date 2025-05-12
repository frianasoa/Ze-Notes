import pkg from "../../package.json";

const Database = {
	OLDDB: Zotero.DBConnection,
	DB: Zotero.DBConnection,
  version: "v1",
	async open()
	{
		Database.OLDDB = new Zotero.DBConnection("zenotes");
		Database.DB = new Zotero.DBConnection(pkg.config.slug+"-"+Database.version);
		await Database.create();  
	},
	
	async close(permanent=false)
	{
		await Database.OLDDB.closeDatabase(permanent);
    await Database.DB.closeDatabase(permanent);
	},
	
	async create()
	{
		var q1 = "CREATE TABLE IF NOT EXISTS `preferences` (id INTEGER PRIMARY KEY, `key` TEXT UNIQUE, `value` TEXT)";
		var q2 = "CREATE TABLE IF NOT EXISTS `tableoptions` (id INTEGER PRIMARY KEY, collectionid TEXT, key TEXT, value TEXT, UNIQUE(collectionid, key))";
		await Database.DB.queryAsync(q1, []);
		await Database.DB.queryAsync(q2, []);
	},
}

export default Database