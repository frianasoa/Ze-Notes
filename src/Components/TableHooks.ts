import { useState, useEffect } from 'react';
import Actions from '../Core/Actions';
import Prefs from '../Core/Prefs';
import TablePrefs from '../Core/TablePrefs';

// Hooks extracted from Table.tsx; each owns one self-contained concern.

/** Column drag & drop reordering (persists through Actions.movecolumn). */
export function useColumnDrag(collectionid: string)
{
  const [draggedColumn, setDraggedColumn] = useState<string | null>(null);

  const handleDragStart = (header: string) => {
    setDraggedColumn(header);
  };

  const handleDragOver = (e: React.DragEvent<HTMLTableHeaderCellElement>) => {
    e.preventDefault();
  };

  const handleDrop = (targetHeader: string) => {
    if(draggedColumn && draggedColumn !== targetHeader) {
      Actions.movecolumn(targetHeader, draggedColumn, collectionid);
    }
  };

  return { handleDragStart, handleDragOver, handleDrop };
}

/** Column width persistence: loads saved widths into the header cells. */
export function useColumnWidths(collectionid: string, tableRef: React.RefObject<HTMLTableElement | null>)
{
  const [currentColumnWidth, setCurrentColumnWidth] = useState("200");

  const initColumnWidths = () => {
    const key = "column-width/"+collectionid;
    const allckey = "column-width/"+collectionid+"/-all-columns-";
    Prefs.search(key).then(pref=>{
      var globalColumnWidth = 0;
      if(Object.keys(pref).includes(allckey))
      {
        globalColumnWidth = parseInt(pref[allckey]);
      }

      const cells = Array.from(tableRef?.current?.querySelectorAll("th") ?? []) as HTMLTableCellElement[];
      for(const cell of cells)
      {
        const k = key+"/"+cell.dataset?.column;
        if(Object.keys(pref).includes(k))
        {
          const width = pref[k];
          cell.style.width = `${width}px`;
        }
        else if(globalColumnWidth>0)
        {
          cell.style.width = `${globalColumnWidth}px`;
        }
      }
    });
  }

  useEffect(() => {
    const key = "column-width/"+collectionid+"/-all-columns-";
    Prefs.get(key, "").then(value=>{
      setCurrentColumnWidth(value);
    });
  }, []);

  useEffect(() => {
    initColumnWidths();
  }, []);

  return { currentColumnWidth, initColumnWidths };
}

/** Restores and persists the table scroll position. */
export function useScrollPersistence(collectionid: string, tableRef: React.RefObject<HTMLTableElement | null>)
{
  const doScroll = async ()=>{
    const xkey = "scroll-x/"+collectionid;
    const ykey = "scroll-y/"+collectionid;
    const x = parseInt(await Prefs.get(xkey, "0"));
    const y = parseInt(await Prefs.get(ykey, "0"));

    const div = tableRef?.current?.closest("main") as HTMLDivElement;
    if(div)
    {
      const handleScroll = (event: Event) => {
        Prefs.set(xkey, String(div.scrollLeft));
        Prefs.set(ykey, String(div.scrollTop));
      };
      div.scrollTo(x, y);
      div.addEventListener("scroll", handleScroll);
      return () => {
        div.removeEventListener("scroll", handleScroll);
      };
    }
  }

  useEffect(() => {
    doScroll();
  }, [])
}

/** Loads the saved row filter (all / with tags / without tags). */
export function useTableFilter(collectionid: string)
{
  const [filter, setFilter] = useState('');

  useEffect(() => {
    TablePrefs.get(collectionid, "data-filter").then(filterValue=>{
      setFilter(filterValue);
    })
  }, []);

  return { filter };
}
