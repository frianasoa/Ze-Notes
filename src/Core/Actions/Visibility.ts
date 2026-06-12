import TablePrefs from "../TablePrefs";
import Prefs from "../Prefs";
import Reload from "./Reload";

const Visibility = {
  hidecolumn(item: zty.ContextMenuData, celldata: zty.CellData)
  {
    TablePrefs.get(celldata.collectionid, "hide-key", "[]").then((k: string)=>{
      const hkeys = JSON.parse(k);
      hkeys.push(celldata.column);
      TablePrefs.set(celldata.collectionid, "hide-key", JSON.stringify([...new Set(hkeys)])).then(()=>{
        Reload.reload(item, celldata);
      })
    });
  },

  hiderow(item: zty.ContextMenuData, celldata: zty.CellData)
  {
    TablePrefs.get(celldata.collectionid, "row-hide-key", "[]").then((k: string)=>{
      const hkeys = JSON.parse(k);
      hkeys.push(celldata.itemid);
      TablePrefs.set(celldata.collectionid, "row-hide-key", JSON.stringify([...new Set(hkeys)])).then(()=>{
        Reload.reload(item, celldata);
      })
    });
  },

  showrow(item: zty.ContextMenuData, celldata: zty.CellData)
  {
    TablePrefs.get(celldata.collectionid, "row-hide-key", "[]").then((k: string)=>{
      const hkeys = JSON.parse(k);
      const index = hkeys.indexOf(String(item.data.itemid));
      if (index > -1) {
        hkeys.splice(index, 1);
      }
      TablePrefs.set(celldata.collectionid, "row-hide-key", JSON.stringify([...new Set(hkeys)])).then(()=>{
        Reload.reload(item, celldata);
      })
    });
  },

  showcolumn(item: zty.ContextMenuData, celldata: zty.CellData)
  {
    TablePrefs.get(celldata.collectionid, "hide-key", "[]").then((k: string)=>{
      const hkeys = JSON.parse(k);
      const index = hkeys.indexOf(item.label);
      if (index > -1) {
        hkeys.splice(index, 1);
      }
      TablePrefs.set(celldata.collectionid, "hide-key", JSON.stringify([...new Set(hkeys)])).then(()=>{
        Reload.reload(item, celldata);
      })
    });
  },

  movecolumn(target: string, source: string, collectionid: string) {
    TablePrefs.get(collectionid, "column-sort-key", "[]").then((k: string) => {
      const skeys = JSON.parse(k);
      const indexSource = skeys.indexOf(source);
      const indexTarget = skeys.indexOf(target);

      // Case 1: Source is directly in front of the target -> Swap their positions
      if (indexSource !== -1 && indexTarget === indexSource + 1) {
        // Swap the positions of source and target
        skeys[indexSource] = target;
        skeys[indexTarget] = source;
      } else {
        // Case 2: Regular move logic
        // Remove source column if it exists
        if (indexSource !== -1) {
          skeys.splice(indexSource, 1);
        }

        // Find the updated index of the target column
        const newIndexTarget = skeys.indexOf(target);

        if (newIndexTarget !== -1) {
          // Move source in front of the target
          skeys.splice(newIndexTarget, 0, source);
        } else {
          // Append source to the end if target doesn't exist
          skeys.push(source);
        }
      }

      // Update the table preferences
      TablePrefs.set(collectionid, "column-sort-key", JSON.stringify(skeys)).then(() => {
        Reload.reload();
      });
    });
  },

  resetwidths(item: zty.ContextMenuData, celldata: zty.CellData)
  {
    const keyword = "column-width/"+item.data.collectionid+"/";
    Prefs.deleteRecords(keyword).then(e=>{
      Reload.reload();
    }).catch(e=>{
      Zotero.log("Actions.resetwidths: ");
      Zotero.log(e);
    })
  }
};

export default Visibility;
