import Database from './Database'

const Prefs = {
  async set(key: string, value: string) 
  {
    const q = "INSERT OR REPLACE INTO `preferences` (key, value) VALUES (?, ?)";
    await Database.DB.queryAsync(q, [key, value]);
  },

  async get(key: string, default_value?: any) 
  {
    const q = "SELECT value FROM `preferences` WHERE key = ?";
    const result = await Database.DB.queryAsync(q, [key]);
    if (result && result.length > 0) 
    {
      return (result[0] as any).value;
    }
    return default_value;
  },
  
  async remove(key: string) {
    const q = "DELETE FROM `preferences` WHERE key = ?";
    await Database.DB.queryAsync(q, [key]);
  },

  async search(keyword: string = "") 
  {
    const r: Record<string, any> = {};
    const q = "SELECT key, value FROM `preferences` WHERE key LIKE ?";
    const searchPattern = `%${keyword}%`;
    const results = await Database.DB.queryAsync(q, [searchPattern]);
    if(!results)
    {
      return r;
    }
    
    for(const result of results)
    {
      const key = (result as any).key;
      const value = (result as any).value;
      r[key as string] = value;
    } 
    return r;
  },
  
  async deleteRecords(keyword: string = "") 
  {
    const slashCount = (keyword.match(/\//g) || []).length;
    if (slashCount < 2) {
      throw new Error("Keyword must contain at least two slashes (/).");
    }
  
    const q = "DELETE FROM `preferences` WHERE key LIKE ?";
    const searchPattern = `%${keyword}%`;

    try {
      const result = await Database.DB.queryAsync(q, [searchPattern]);
      return result;  // Return the result of the query (e.g., affected rows count)
    }
    catch (error) 
    {
      throw error;
    }
  }
}

export default Prefs;
