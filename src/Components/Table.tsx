import React, {useState, useEffect, useRef} from 'react';
import Shortcuts from './Shortcuts';
import Loading from './Loading';
import DataContext from './DataContext';
import Cell from './Cell';
import Actions from '../Core/Actions'
import Prefs from '../Core/Prefs'
import ZPrefs from '../Core/ZPrefs'
import Menu from './ContextMenu/Menu';
import ColumnResizer from './ColumnResizer'
import MenuItems from './MenuItems'
import Dialog from './Dialog/Dialog'
import TablePrefs from "../Core/TablePrefs";
import styles from "./Table.module.css";

import {FaArrowsRotate, FaEye, FaRegEye, FaEyeSlash, FaArrowDownAZ, FaFilePdf, FaHtml5, FaFile, FaVectorSquare, FaFileExport, FaDropbox} from "react-icons/fa6";

type TableProps = {
  data: Array<Record<string, any>>;
  sortkeys: Array<string>;
  hidekeys: Array<string>;
  rowhidekeys: Array<string>;
  collectionid: string;
  collectionname: string;
  libraryid: string;
};

const Table: React.FC<TableProps> = ({data, sortkeys, hidekeys, rowhidekeys, collectionid, collectionname, libraryid}) => {
  
  const [translationDialogState, setTranslationDialogState] = useState({
    title: "My dialog",
    children: <p>default</p>,
    isOpen: false,
    buttons: []
  });

  const [commonDialogState, setCommonDialogState] = useState<Record<string, any>>({
    title: "Annotation editor",
    children: <p>default</p>,
    isOpen: false,
    buttons: [],
  });
  
  const [tBodyStyle, setTBodyStyle] = useState<string>(styles.tbody);

  const closeTranslationDialog = () =>{
    setTranslationDialogState({title: "", children: <p>Default</p>, isOpen: false, buttons: []});
  }

  const closeCommonDialog = () =>{
    setCommonDialogState({title: "", children: <p>Default</p>, isOpen: false, buttons: []});
  }

  /** Init column list */
  const createHeaders = () => {
    // set all existing columns, including tags
    let allheaders_ = [...new Set(data.flatMap(Object.keys))];

    // Filter
    let headers_ = allheaders_.filter((h:any) => !hidekeys.includes(h))

    // Sort
    headers_ = headers_.sort((a: any, b: any) => {
      const indexA = sortkeys.indexOf(a);
      const indexB = sortkeys.indexOf(b);
      return (indexA === -1 ? Infinity : indexA) - (indexB === -1 ? Infinity : indexB);
    });
    if(headers_.length==0)
    {
      headers_ = ["__no_column_selected__"]
    }
    return {headers: headers_, allheaders: allheaders_};
  };
  const h = createHeaders();
  const [allHeaders, setAllHeaders] = useState<any>(h["allheaders"]);
  const [allRows, setAllRows] = useState<any>(data.map(row => ({title: row.title?.[0]?.text, itemid: row.id?.[0]?.text, source: row.source?.[0].text})));
  const [headers, setHeaders] = useState<any>(h["headers"]);

  useEffect(() => {
    const columns = createHeaders();
    setAllHeaders(columns["allheaders"]);
    setHeaders(columns["headers"]);
    setAllRows(data.map(row => ({title: row.title?.[0]?.text, itemid: row.id?.[0]?.text, source: row.source?.[0].text})));
  }, [data, sortkeys, hidekeys]);

  /** Column drag functions */
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

  const handleMenuClose = () =>{
    MenuItems.resetmain(MenuItems.main);
  }

  const handleClick = (event: any) =>{}

  // Declare this here to use later
  const initColumnWidths = () =>{
    const key = "column-width/"+collectionid;
    const allckey = "column-width/"+collectionid+"/-all-columns-";
    Prefs.search(key).then(pref=>{
      var globalColumnWidth = 0;
      if(Object.keys(pref).includes(allckey))
      {
        globalColumnWidth = parseInt(pref[allckey]);
      }

      const cells = tableRef?.current?.querySelectorAll("th") ?? [];
      for(const cell of cells)
      {
        const k = key+"/"+(cell as any).dataset?.column;
        if(Object.keys(pref).includes(k))
        {
          const width = pref[k];
          (cell as any).style.width = `${width}px`;
        }
        else if(globalColumnWidth>0)
        {
          (cell as any).style.width = `${globalColumnWidth}px`;
        }
      }
    });
  }
  
  /** Header context menu settings */
  const addMenuItem = (menu: any, item: any) => {
    var existingIndex = menu.findIndex((i: any) => i.label === item.label);
    if (existingIndex !== -1)
    {
      menu[existingIndex] = item;
    }
    else
    {
      menu.push(item);
    }
  }
  
  const handleHeaderClick = async (event: any) =>{
    // const column = event.currentTarget.dataset.column;
  };

  /** Column width settings */
  const [currentColumnWidth, setCurrentColumnWidth] = useState("200");
  const [selectedColumnWidth, setSelectedColumnWidth] = useState("200");

  const setColumnWidth = (menuitem: any, celldata: any, event: any) =>{
    const column = menuitem.options.column;
    const value = event.currentTarget.value;

    if(column.includes("-all-columns-"))
    {
      setCurrentColumnWidth(value);
    }
    else
    {
      setSelectedColumnWidth(value);
    }
    const key = "column-width/"+collectionid+"/"+column;
    Prefs.set(key, value);
  }

  const [columnStyles, setColumnStyles] = useState<Record<string, any>>({});
  const generateDynamicStyles = () => {
    return Object.entries(columnStyles)
      .map(([className, width]) => `.${className.replace('column-width/'+collectionid+'/', '').replace(/[^a-zA-Z0-9-_]/g, '_')} { width: ${width}px; }`)
      .join("\n");
  };

  useEffect(() => {
    const key = "column-width/"+collectionid+"/-all-columns-";
    Prefs.get(key, "").then(value=>{
      setCurrentColumnWidth(value);
    });
  }, []);

  /** Init column widths */
  const tableRef = useRef<HTMLTableElement>(null);

  useEffect(() => {
    initColumnWidths();
  }, []);

  const [mainMenuItems, setMainMenuItems] = useState<any>({});
  const [headerMenuItems, setHeaderMenuItems] = useState<any>({});
  useEffect(() => { 
    const hiddencolumns = hidekeys.filter(h => allHeaders.includes(h));
    
    const hiddenrows = allRows.filter((r:any)=>rowhidekeys.includes(String(r.itemid)));
    MenuItems.init(hiddencolumns, hiddenrows, initColumnWidths, collectionid);

    setMainMenuItems(MenuItems.main);
    setHeaderMenuItems(MenuItems.header);
  }, [MenuItems]);

  const doScroll = async ()=>{
    const xkey = "scroll-x/"+collectionid;
    const ykey = "scroll-y/"+collectionid;
    const x = parseInt(await Prefs.get(xkey, "0"));
    const y = parseInt(await Prefs.get(ykey, "0"));

    const div = tableRef?.current?.closest("main") as HTMLDivElement;
    if(div)
    {
      const handleScroll = (event: any) => {
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

  // Filters
  const [filter, setFilter] = useState('');
  const fetchFilter = () => {
    TablePrefs.get(collectionid, "data-filter").then(filterValue=>{
      setFilter(filterValue);
    })
  };

  useEffect(() => {
    fetchFilter();
  }, []);
  
  useEffect(() => {
    const legacydisplay = ZPrefs.get('legacy-display', 'FALSE').toUpperCase()==="TRUE";
    if(legacydisplay)
    {
      setTBodyStyle(styles.legacytbody);
    }
    else
    {
      setTBodyStyle(styles.tbody);
    }
  }, []);

  const openTranslationDialog = (value: any) => {
    setTranslationDialogState?.(value);
  }

  const openCommonDialog = (value: any) => {
    setCommonDialogState?.(value);
  }

  const handleHeaderContextMenu = (event: React.MouseEvent<HTMLElement, MouseEvent>) => {
    var index = "dataall";
    const f = event.currentTarget.dataset.filter;
    if(f=="dataall")
    {
      index = "dataall";
    }
    else if(f=="withtags")
    {
      index = "datawithtags";
    }
    else if(f=="withouttags")
    {
      index = "datawithouttags";
    }
    // reset all first
    headerMenuItems.datafilter.submenu["dataall"].iconColor = "";
    headerMenuItems.datafilter.submenu["dataall"].textColor = "";
    headerMenuItems.datafilter.submenu["datawithtags"].iconColor = "";
    headerMenuItems.datafilter.submenu["datawithtags"].textColor = "";
    headerMenuItems.datafilter.submenu["datawithouttags"].iconColor = "";
    headerMenuItems.datafilter.submenu["datawithouttags"].textColor = "";

    headerMenuItems.datafilter.submenu[index].textColor = "#0874ec";
    headerMenuItems.datafilter.submenu[index].iconColor = "#0874ec";

    headerMenuItems.exportas = {
      label: "Export",
      onClick: Actions.exportas,
      icon: FaFileExport,
      data: {callback: openCommonDialog, table: event.currentTarget.closest(".main-table")}
    }
    
    // If dropbox key exists
    const dropboxclientid= ZPrefs.get('dropbox-client-id', '');
    const dropboxsecret= ZPrefs.get('dropbox-client-secret', '');
    
    if(dropboxclientid && dropboxsecret)
    {
      headerMenuItems.dropboxupload = {
        label: "Upload to dropbox",
        onClick: Actions.dropboxupload,
        icon: FaDropbox,
        data: {callback: openCommonDialog, table: event.currentTarget.closest(".main-table")}
      }
      
      headerMenuItems.dropboxdownload = {
        label: "Download from dropbox",
        onClick: Actions.dropboxdownload,
        icon: FaDropbox,
        data: {callback: openCommonDialog, table: event.currentTarget.closest(".main-table")}
      }
    }

    headerMenuItems.columnsort = {
      label: 'Column sort ...',
      state: 'active',
      icon: FaArrowDownAZ,
      onClick: Actions.showcolumnsortdialog,
      data: {callback: openCommonDialog, headers: [...new Set(data.flatMap(Object.keys))]}
    }

    headerMenuItems.tablesort = {
      label: 'Table sort ...',
      state: 'active',
      icon: FaArrowDownAZ,
      onClick: Actions.showtablesortdialog,
      data: {callback: openCommonDialog, headers: [...new Set(data.flatMap(Object.keys))]}
    }
  }
  
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
	return (
    <DataContext.Provider value={{collectionid, initColumnWidths, MenuItems, translationDialogState, setTranslationDialogState, commonDialogState, setCommonDialogState, setLoadingMessage, setIsLoading}}>
      <style>
        {`
          table.main-table {
            border-collapse: separate;
            border-spacing: 0 0;
            table-layout: fixed;
            width: 100%; /* Ensure the table takes up full width */
            z-index: 1;
            overscroll-behavior: none;
          }

          table.main-table td, table.main-table th {
            border: solid 1px gray;
            padding: 0.3em;
            background: white;
            z-index: 3;
          }

          table.main-table th {
            width: ${currentColumnWidth}px;
          }

          table.main-table th {
            position: sticky;
            top: 0;
            z-index: 4; /* Ensure the header row is above everything else */
            cursor: default;
          }

          /* Make the first column sticky */
          table.main-table th:first-child, table.main-table td:first-child {
            position: sticky;
            left: 0;
            background: white; /* Ensure the background doesn't overlap */
            z-index: 5; /* Ensure the first column is above other table cells */
          }

          table.main-table tr:first-child th:first-child {
              z-index: 6;
          }

          table.main-table td:not(:first-child)
          {
            position: relative;
          }
        `}
      </style>
      <table className="main-table" ref={tableRef} data-collectionname={collectionname} data-libraryid={libraryid}>
        <thead>
          <tr className={styles.tr}>
            {headers.map((header: string) => (
              <th
                key={header}
                className={header.replace(/[^a-zA-Z0-9-_]/g, '_')}
                draggable
                onDragStart={() => handleDragStart(header)}
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(header)}
                onContextMenu={handleHeaderContextMenu}
                data-column={header}
                data-filter={filter}
                data-altcolumn='-all-columns-'
                data-collectionid={collectionid}
                data-libraryid={libraryid}
              >
                <div style={{float: 'left', width: '98%'}} className="no-export-wrapper">{header}</div>
                <ColumnResizer item={{
                  column: '-all-columns-',
                  originalcolumn: header,
                  collectionid: collectionid,
                  title: "Resize all columns"
                }}/>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className={tBodyStyle}>
          {data.map((row, index) => (
            <tr className={styles.tr}
              key={index}
              style={{
                height: '1px',
                display:
                ((filter === 'withouttags' && row.NoTags === "true") ||
                 (filter === 'withtags' && row.NoTags !== "true") ||
                 (filter === 'all') ||
                 (filter === null && row.NoTags !== "true")) &&
                 !rowhidekeys.includes(String(row.id[0].text))
                    ? ''
                    : 'none', // Hide rows that don't match the filter
              }}
            >
              {headers.filter((i: string) => i !== "__no_column_selected__").map((header: string) => (
                <Cell
                  key={header}
                  data={row[header]}
                  dataset={{
                    column: header,
                    collectionid: collectionid,
                    libraryid: libraryid,
                    itemid: row.id[0].text,
                    itemtype: row.itemtype,
                    zpaths: JSON.stringify(row.zpaths),
                    title: 'Resize column "' + header + '"',
                  }}
                />
              ))}
            </tr>
          ))}
        </tbody>

      </table>

      <Menu items={mainMenuItems} handleClick={handleClick} handleClose={handleMenuClose} targetSelector=".target-element" />
      <Menu items={headerMenuItems} handleClick={handleHeaderClick}  targetSelector="th" />

      <Dialog title={translationDialogState.title} isOpen={translationDialogState.isOpen} onClose={closeTranslationDialog} buttons={translationDialogState.buttons}>
        {translationDialogState.children}
      </Dialog>

      <Dialog title={commonDialogState.title} isOpen={commonDialogState.isOpen} onClose={closeCommonDialog} buttons={commonDialogState.buttons}>
        {commonDialogState.children}
      </Dialog>
      
      <Loading visible={isLoading} message={loadingMessage}/>
      <Shortcuts />
    </DataContext.Provider>
  );
};

export default Table;
