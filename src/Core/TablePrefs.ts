import Database from './Database';

const TablePrefs = {
  async set(collectionid: string, key: string, value: string): Promise<void> {
    const q = "INSERT OR REPLACE INTO `tableoptions` (collectionid, key, value) VALUES (?, ?, ?)";
    await Database.DB.queryAsync(q, [collectionid, key, value]); 
  },

  async get(collectionid: string, key: string, default_value: any = null): Promise<any> 
  {
    
    const q = "SELECT value FROM `tableoptions` WHERE `collectionid` = ? AND `key` = ?";
    const values = [collectionid, key];
    const result = await Database.DB.queryAsync(q, values);
    var r;
    if(result && result.length > 0) 
    {
      return (result[0] as any).value;
    }
    
    return default_value;
  },
  
  async migrateone(collectionid: string, contents: string)
  {
    Database.create();
    let hidden = [];
    let order = [];
    let sort = [];
    let reverse = [] as any;

    try {
      ({ hidden, order, sort, reverse } = JSON.parse(contents));
    } catch (e) {};
    
    if(hidden && hidden.length>0)
    {
      await TablePrefs.set(collectionid, "hide-key", JSON.stringify(hidden));
    }
    
    if(order && order.length>0)
    {
      await TablePrefs.set(collectionid, "column-sort-key", JSON.stringify(order));
    }
    
    if(sort && sort.length>0)
    {
      if(!reverse)
      {
        reverse = [];
      }
      
      let tablesortkey = sort.map((value: any) => ({value, reversed: reverse.includes(value)}));
    
      await TablePrefs.set(collectionid, "table-sort-key", JSON.stringify(tablesortkey));
    }
  },
  
  async migrate()
  { 
    const q = 'SELECT "collectionid", "contents" FROM "default"';
    
    const result = await Database.OLDDB.queryAsync(q, []);
    
    if(result && result.length > 0) 
    {
      for(const r of result)
      {
        const collectionid = r["collectionid"];
        const contents = r["contents"];
        await TablePrefs.migrateone(collectionid, contents);
      }
    }
  }
};

export default TablePrefs;
