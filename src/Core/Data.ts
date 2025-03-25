import Format from './Format'
import Utils from './Utils'

const Data = {
  collectionID: "" as string,
  collectionitems(collectionID: number, visitedCollections: any): _ZoteroTypes.Items[]
  {
    let items: _ZoteroTypes.Items[] = [];
    const collection: any | null = Zotero.Collections.get(collectionID);
    let subcollections: any[] | null = null;
    if (collection) {
      if (visitedCollections.has(collectionID)) {
        return items;
      }
      visitedCollections.add(collectionID);
      items = collection.getChildItems();
      subcollections = collection.getChildCollections(true);
    }

    if(subcollections) {
      for (const subcollectionid of subcollections) {
        items = items.concat(this.collectionitems(subcollectionid, visitedCollections));
      }
    }
    this.collectionID = collectionID+"";
    return items;
  },

  libraryitems(libraryID: number): _ZoteroTypes.Items[] {
    let items: _ZoteroTypes.Items[] = [];
    const collections = Zotero.Collections.getByLibrary(libraryID, true);
    collections.forEach(c => {
      items = items.concat(this.collectionitems(c.id, new Set<number>()));
    });
    return items;
  },

  async items(data: any) {
    let items: _ZoteroTypes.Items[] = [];
    if(data.collection?.id)
    {
      items = this.collectionitems(data.collection.id, new Set<number>());
      this.collectionID = data.collection.id;
    }
    else if (data.group?.id)
    {
      const libraryid = Zotero.Groups.getLibraryIDFromGroupID(data.group.id);
      if(libraryid) {
        items = this.libraryitems(libraryid);
        this.collectionID = "group-"+libraryid;
      }
    }
     else if (data.library?.name)
     {
			items = this.libraryitems(data.library.id);
			this.collectionID = "library-"+data.library.id;
    }

    const rows: any[] = [];
    for(const item of items)
    {
      let formatted = await this.format(item) || {};
      rows.push(formatted);
    }
    return rows;
  },

  async format(item: _ZoteroTypes.Items) {
    const row:zty.Row =
    {
      id: [{type: "native-field", text: item.getID()}],
      itemid: [{type: "native-field", text: item.id}],
      itemtype: Zotero.ItemTypes.getName(item.itemTypeID),
      key: [{type: "native-field", text: item.getField("key")}],
      title: [{type: "native-field", text: Utils.toxhtml(item.getField("title"))}],
      date: [{type: "native-field", text: Format.date(item)}],
      journal: [{type: "native-field", text: Utils.toxhtml(item.getField("publicationTitle"))}],
      source: [{type: "native-field", text: Format.source(item)}],
      zpaths: Format.zpaths(item)
    };

    const tags: Record<string, any> = await Format.tagged(item);

    if(Object.keys(tags).length==0)
    {
      row["NoTags"] = "true";
    }

    for (const tag in tags)
    {
      if (!Object.keys(row).includes(tag))
      {
        row[tag] = [];
      }
      if (Array.isArray(tags[tag]))
      {
        row[tag] = row[tag].concat(tags[tag]);
      }
      else
      {
        row[tag].push(tags[tag]);
      }
    }

    return row;
  }
};

export default Data;
