import pkg from "../../package.json";

const Database = {
	DB: Zotero.DBConnection,
	async init()
	{
		Database.DB = new Zotero.DBConnection(pkg.config.slug);
		await Database.create();
	},
	
	close()
	{
		Database.DB.closeDatabase(true);
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