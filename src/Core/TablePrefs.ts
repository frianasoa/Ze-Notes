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
};

export default TablePrefs;
