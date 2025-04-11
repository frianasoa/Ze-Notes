import FileExporter from "./FileExporter";
const DataExporter = {
  async exportall(collectionid: number, email: string)
	{
		const collection = Zotero.Collections.get(collectionid)
		if(!collection)
		{
			throw "You can only export a collection!";
		}
		if(collection.getChildItems().length<=0)
		{
			throw "You cannot export an empty collection!";
		}
    return FileExporter.autosave(collection, email);
	},
}

export default DataExporter;