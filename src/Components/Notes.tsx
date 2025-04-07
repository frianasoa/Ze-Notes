import React from 'react';
import ReactDOM from 'react-dom/client';
import Table from './Table';
import TablePrefs from '../Core/TablePrefs'

type NotesType = {
  show(win: Window, data: any, collectionID: string, collectionName: string, libraryID: string): void;
  sortdata(data: Record<string, any>[], tablesortkey: any[]): any;
};

const Notes: NotesType = {
  sortdata(data: Record<string, any>[], tablesortkey: any[]): Record<string, any>[] {
    return [...data].sort((a, b) => {
      for (const { value, reversed } of tablesortkey) {
        const extractValue = (item: any) => {
          if (Array.isArray(item) && item.length > 0) {
            return item[0]?.text ?? item[0]?.key ?? item[0]?.value ?? item[0]?.id ?? "";
          }
          return item ?? ""; // Use the raw value otherwise
        };
        const aVal = extractValue(a[value]);
        const bVal = extractValue(b[value]);

        if (aVal < bVal) return reversed ? 1 : -1;
        if (aVal > bVal) return reversed ? -1 : 1;
      }
      return 0; // If all keys are equal, maintain order
    });
  },


  async show(win: Window, data: any, collectionID: string, collectionName: string, libraryID: string) {
    const container = win?.document?.getElementById('main-contents');
    const sortkeys = JSON.parse(await TablePrefs.get(collectionID, "column-sort-key", "[]"));
    const tablesortkeys = JSON.parse(await TablePrefs.get(collectionID, "table-sort-key", "[]"));
    const hidekeys = JSON.parse(await TablePrefs.get(collectionID, "hide-key", "[]"));
    const rowhidekeys = JSON.parse(await TablePrefs.get(collectionID, "row-hide-key", "[]"));

    if(container)
		{
			const root = ReactDOM.createRoot(container);
			globalThis.window = win as Window & typeof globalThis;
			globalThis.document = win.document as Document & typeof globalThis;
			root.render(<div className="main-table-container"><Table data={this.sortdata(data, tablesortkeys)} sortkeys={sortkeys} hidekeys={hidekeys} rowhidekeys={rowhidekeys} collectionid={collectionID} collectionname={collectionName} libraryid={libraryID} /></div>);
		}
  }
};

export default Notes;
