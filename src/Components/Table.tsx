import React, { useState, useEffect, useRef } from "react";
import Shortcuts from "./Shortcuts";
import Loading from "./Loading";
import DataContext from "./DataContext";
import Cell from "./Cell";
import Actions from "../Core/Actions";
import ZPrefs from "../Core/ZPrefs";
import Menu from "./ContextMenu/Menu";
import ColumnResizer from "./ColumnResizer";
import MenuItems from "./MenuItems";
import Dialog from "./Dialog/Dialog";
import TablePrefs from "../Core/TablePrefs";
import { useColumnDrag, useColumnWidths, useScrollPersistence, useTableFilter } from "./TableHooks";
import styles from "./Table.module.css";

import {
  FaArrowsRotate,
  FaEye,
  FaRegEye,
  FaEyeSlash,
  FaArrowDownAZ,
  FaFilePdf,
  FaHtml5,
  FaFile,
  FaVectorSquare,
  FaFileExport,
  FaDropbox,
} from "react-icons/fa6";

type TableProps = {
  data: Array<Record<string, any>>;
  sortkeys: Array<string>;
  hidekeys: Array<string>;
  rowhidekeys: Array<string>;
  collectionid: string;
  collectionname: string;
  libraryid: string;
};

const Table: React.FC<TableProps> = ({
  data,
  sortkeys,
  hidekeys,
  rowhidekeys,
  collectionid,
  collectionname,
  libraryid,
}) => {
  const [translationDialogState, setTranslationDialogState] = useState({
    title: "My dialog",
    children: <p>default</p>,
    isOpen: false,
    buttons: [],
  });

  const [commonDialogState, setCommonDialogState] = useState<Record<string, any>>({
    title: "Annotation editor",
    children: <p>default</p>,
    isOpen: false,
    buttons: [],
  });

  const [tBodyStyle, setTBodyStyle] = useState<string>(styles.tbody);

  const closeTranslationDialog = () => {
    setTranslationDialogState({ title: "", children: <p>Default</p>, isOpen: false, buttons: [] });
  };

  const closeCommonDialog = () => {
    setCommonDialogState({ title: "", children: <p>Default</p>, isOpen: false, buttons: [] });
  };

  /** Init column list */
  const createHeaders = () => {
    // set all existing columns, including tags
    let allheaders_ = [...new Set(data.flatMap(Object.keys))];

    // Filter
    let headers_ = allheaders_.filter((h: string) => !hidekeys.includes(h));

    // Sort
    headers_ = headers_.sort((a: string, b: string) => {
      const indexA = sortkeys.indexOf(a);
      const indexB = sortkeys.indexOf(b);
      return (indexA === -1 ? Infinity : indexA) - (indexB === -1 ? Infinity : indexB);
    });
    if (headers_.length == 0) {
      headers_ = ["__no_column_selected__"];
    }
    return { headers: headers_, allheaders: allheaders_ };
  };

  const makeDataUnique = (data: Array<Record<string, any>>) => {
    if (String(ZPrefs.get("allow-duplicate-rows", false)).toUpperCase() === "TRUE") return data;

    const seen = new Set();
    const uniqueData: Array<Record<string, any>> = [];

    for (const item of data) {
      const key = JSON.stringify(item);
      if (!seen.has(key)) {
        seen.add(key);
        uniqueData.push(item);
      }
    }
    return uniqueData;
  };

  const uniqueData = makeDataUnique(data);
  const h = createHeaders();
  const [allHeaders, setAllHeaders] = useState<string[]>(h["allheaders"]);
  const [allRows, setAllRows] = useState<{ title?: string; itemid?: string; source?: string }[]>(
    uniqueData.map((row) => ({ title: row.title?.[0]?.text, itemid: row.id?.[0]?.text, source: row.source?.[0].text })),
  );
  const [headers, setHeaders] = useState<string[]>(h["headers"]);

  useEffect(() => {
    const columns = createHeaders();
    setAllHeaders(columns["allheaders"]);
    setHeaders(columns["headers"]);
    setAllRows(
      uniqueData.map((row) => ({
        title: row.title?.[0]?.text,
        itemid: row.id?.[0]?.text,
        source: row.source?.[0].text,
      })),
    );
  }, [data, sortkeys, hidekeys]);

  const tableRef = useRef<HTMLTableElement>(null);

  /** Column drag functions */
  const { handleDragStart, handleDragOver, handleDrop } = useColumnDrag(collectionid);

  /** Column width settings */
  const { currentColumnWidth, initColumnWidths } = useColumnWidths(collectionid, tableRef);

  /** Scroll position persistence */
  useScrollPersistence(collectionid, tableRef);

  // Filters
  const { filter } = useTableFilter(collectionid);

  const handleMenuClose = () => {
    MenuItems.resetmain(MenuItems.main);
  };

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {};

  const handleHeaderClick = async (event: React.MouseEvent<HTMLElement>) => {
    // const column = event.currentTarget.dataset.column;
  };

  const [mainMenuItems, setMainMenuItems] = useState<Record<string, zty.ContextMenuData>>({});
  const [headerMenuItems, setHeaderMenuItems] = useState<Record<string, zty.ContextMenuData>>({});
  // Mount-only: the previous [MenuItems] dependency was a static module
  // object, which never changes, so this has always run once.
  useEffect(() => {
    const hiddencolumns = hidekeys.filter((h) => allHeaders.includes(h));

    const hiddenrows = allRows.filter((r) => rowhidekeys.includes(String(r.itemid)));
    MenuItems.init(hiddencolumns, hiddenrows, initColumnWidths, collectionid);

    setMainMenuItems(MenuItems.main);
    setHeaderMenuItems(MenuItems.header);
  }, []);

  const [showSorter, setShowSorter] = useState(false);
  useEffect(() => {
    const legacydisplay = String(ZPrefs.get("legacy-display", false)).toUpperCase() === "TRUE";
    const hidemainlegend = String(ZPrefs.get("hide-main-legend", false)).toUpperCase() === "TRUE";

    if (legacydisplay) {
      setTBodyStyle(styles.legacytbody);
    } else if (hidemainlegend) {
      setTBodyStyle(styles.hidemainlegend);
    } else {
      setTBodyStyle(styles.tbody);
    }
  }, []);

  const openTranslationDialog = (value: any) => {
    setTranslationDialogState?.(value);
  };

  const openCommonDialog = (value: any) => {
    setCommonDialogState?.(value);
  };

  type PropsShowSorterLink = {
    collectionID: string;
  };

  const [currentHideKeys, setCurrentHideKeys] = useState<string[]>(hidekeys);

  useEffect(() => {
    (async () => {
      setCurrentHideKeys(JSON.parse(await TablePrefs.get(collectionid, "hide-key", "[]")));
      const val = ZPrefs.get("always-show-column-sorter", false);
      const alwaysshowcolumnsorter = String(val).toUpperCase() === "TRUE";
      setShowSorter(alwaysshowcolumnsorter);
    })();
  }, [collectionid, headers]);

  /** Column sorter dialog */
  const sorterTriggered = useRef(false);
  useEffect(() => {
    (async () => {
      const hideKeys = JSON.parse(await TablePrefs.get(collectionid, "hide-key", "[]"));
      setCurrentHideKeys(hideKeys);

      const val = ZPrefs.get("always-show-column-sorter", false);
      const alwaysShow = String(val).toUpperCase() === "TRUE";
      setShowSorter(alwaysShow);

      // Auto open sorter once
      if (hideKeys.length === 0 && alwaysShow && !sorterTriggered.current) {
        sorterTriggered.current = true;
        Actions.showcolumnsortdialog(
          {
            label: "Hide unncessary columns then reload",
            state: "active",
            data: { headers, callback: setCommonDialogState },
            iconColor: "",
            textColor: "",
            bgColor: "",
          },
          { collectionid },
        );
      }
    })();
  }, [collectionid, headers]);

  const handleHeaderContextMenu = (event: React.MouseEvent<HTMLElement, MouseEvent>) => {
    var index = "dataall";
    const f = event.currentTarget.dataset.filter;
    if (f == "dataall") {
      index = "dataall";
    } else if (f == "withtags") {
      index = "datawithtags";
    } else if (f == "withouttags") {
      index = "datawithouttags";
    }
    // reset all first
    const datafiltermenu = headerMenuItems.datafilter?.submenu;
    if (datafiltermenu) {
      datafiltermenu["dataall"].iconColor = "";
      datafiltermenu["dataall"].textColor = "";
      datafiltermenu["datawithtags"].iconColor = "";
      datafiltermenu["datawithtags"].textColor = "";
      datafiltermenu["datawithouttags"].iconColor = "";
      datafiltermenu["datawithouttags"].textColor = "";

      datafiltermenu[index].textColor = "#0874ec";
      datafiltermenu[index].iconColor = "#0874ec";
    }

    headerMenuItems.exportas = {
      label: "Export",
      onClick: Actions.exportas,
      icon: FaFileExport,
      data: { callback: openCommonDialog, table: event.currentTarget.closest(".main-table") },
    };

    // If dropbox key exists
    const dropboxclientid = ZPrefs.get("dropbox-client-id", "");
    const dropboxsecret = ZPrefs.get("dropbox-client-secret", "");

    if (dropboxclientid && dropboxsecret) {
      headerMenuItems.dropboxupload = {
        label: "Upload to dropbox",
        onClick: Actions.dropboxupload,
        icon: FaDropbox,
        data: { callback: openCommonDialog, table: event.currentTarget.closest(".main-table") },
      };

      headerMenuItems.dropboxdownload = {
        label: "Download from dropbox",
        onClick: Actions.dropboxdownload,
        icon: FaDropbox,
        data: { callback: openCommonDialog, table: event.currentTarget.closest(".main-table") },
      };
    }

    headerMenuItems.columnsort = {
      label: "Column sort ...",
      state: "active",
      icon: FaArrowDownAZ,
      onClick: Actions.showcolumnsortdialog,
      data: { callback: openCommonDialog, headers: [...new Set(uniqueData.flatMap(Object.keys))] },
    };

    headerMenuItems.tablesort = {
      label: "Table sort ...",
      state: "active",
      icon: FaArrowDownAZ,
      onClick: Actions.showtablesortdialog,
      data: { callback: openCommonDialog, headers: [...new Set(uniqueData.flatMap(Object.keys))] },
    };
  };

  // Column formatting
  const [columnPrefix, setColumnPrefix] = useState<string>("");
  const [columnSuffix, setColumnSuffix] = useState<string>("");

  useEffect(() => {
    (async () => {
      setColumnPrefix(ZPrefs.get("column-prefix", ""));
      setColumnSuffix(ZPrefs.get("column-suffix", ""));
    })();
  }, [collectionid, headers]);

  const getAffix = (t: "prefix" | "suffix", d: string | zty.ItemData[]) => {
    if (!Array.isArray(d)) return t === "prefix" ? columnPrefix : columnSuffix;
    const hasNativeField = d.some((item) => item.type === "native-field");
    if (hasNativeField) return "";
    return t === "prefix" ? columnPrefix : t === "suffix" ? columnSuffix : "";
  };

  const [columnBgColors, setColumnBgColors] = useState<Record<string, string>>({});
  const [columnFgColors, setColumnFgColors] = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      const bg = await TablePrefs.get(collectionid, "column-bgcolor", "{}");
      const fg = await TablePrefs.get(collectionid, "column-fgcolor", "{}");
      try {
        setColumnBgColors(JSON.parse(bg));
        setColumnFgColors(JSON.parse(fg));
      } catch {
        console.warn("Failed to parse column colors");
      }
    })();
  }, [collectionid]);

  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const tableBgColor = String(ZPrefs.get("notes-bg-color", "#ffffff"));
  return (
    <DataContext.Provider
      value={{
        collectionid,
        initColumnWidths,
        MenuItems,
        translationDialogState,
        setTranslationDialogState,
        commonDialogState,
        setCommonDialogState,
        setLoadingMessage,
        setIsLoading,
      }}
    >
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
            background: inherit;
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
            background: ${tableBgColor};
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
      {currentHideKeys.length === 0 && showSorter ? (
        <table className="main-table" ref={tableRef} data-collectionname={collectionname} data-libraryid={libraryid}>
          <thead>
            <tr className={styles.tr}>
              {[headers[0]].map((header: string) => (
                <th
                  key={header}
                  className={header.replace(/[^a-zA-Z0-9-_]/g, "_")}
                  draggable
                  onDragStart={() => handleDragStart(header)}
                  onDragOver={handleDragOver}
                  onDrop={() => handleDrop(header)}
                  onContextMenu={handleHeaderContextMenu}
                  data-column={header}
                  data-filter={filter}
                  data-altcolumn="-all-columns-"
                  data-collectionid={collectionid}
                  data-libraryid={libraryid}
                  style={{
                    backgroundColor: columnBgColors[header] || tableBgColor,
                    color: columnFgColors[header] || "inherit",
                    padding: "0.1em",
                  }}
                >
                  <div style={{ float: "left", width: "98%" }} className="no-export-wrapper">
                    __all_columns_selected__
                  </div>
                  <ColumnResizer
                    item={{
                      column: "-all-columns-",
                      originalcolumn: header,
                      collectionid: collectionid,
                      title: "Resize all columns",
                    }}
                  />
                </th>
              ))}
            </tr>
          </thead>
        </table>
      ) : (
        <table className="main-table" ref={tableRef} data-collectionname={collectionname} data-libraryid={libraryid}>
          <thead>
            <tr className={styles.tr}>
              {headers.map((header: string) => (
                <th
                  key={header}
                  className={header.replace(/[^a-zA-Z0-9-_]/g, "_")}
                  draggable
                  onDragStart={() => handleDragStart(header)}
                  onDragOver={handleDragOver}
                  onDrop={() => handleDrop(header)}
                  onContextMenu={handleHeaderContextMenu}
                  data-column={header}
                  data-filter={filter}
                  data-altcolumn="-all-columns-"
                  data-collectionid={collectionid}
                  data-libraryid={libraryid}
                  style={{
                    color: columnFgColors[header] || "inherit",
                    padding: "0.1em",
                    backgroundColor: columnBgColors[header] || tableBgColor,
                    backgroundClip: "content-box",
                  }}
                >
                  <div
                    style={{ float: "left", margin: "auto", borderRadius: "0.1em", marginLeft: "0.5%", width: "99%" }}
                    className="no-export-wrapper"
                  >
                    {getAffix("prefix", data[0][header])}
                    {header}
                    {getAffix("suffix", data[0][header])}
                  </div>
                  <ColumnResizer
                    item={{
                      column: "-all-columns-",
                      originalcolumn: header,
                      collectionid: collectionid,
                      title: "Resize all columns",
                    }}
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className={tBodyStyle}>
            {uniqueData.map((row, index) => (
              <tr
                className={styles.tr}
                key={index}
                style={{
                  height: "1px",
                  display:
                    ((filter === "withouttags" && row.NoTags === "true") ||
                      (filter === "withtags" && row.NoTags !== "true") ||
                      filter === "all" ||
                      (filter === null && row.NoTags !== "true")) &&
                    !rowhidekeys.includes(String(row.id[0].text))
                      ? ""
                      : "none", // Hide rows that don't match the filter
                }}
              >
                {headers
                  .filter((i: string) => i !== "__no_column_selected__")
                  .map((header: string) => (
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
      )}

      <Menu
        items={mainMenuItems}
        handleClick={handleClick}
        handleClose={handleMenuClose}
        targetSelector=".target-element"
      />
      <Menu items={headerMenuItems} handleClick={handleHeaderClick} targetSelector="th" />

      <Dialog
        title={translationDialogState.title}
        isOpen={translationDialogState.isOpen}
        onClose={closeTranslationDialog}
        buttons={translationDialogState.buttons}
      >
        {translationDialogState.children}
      </Dialog>

      <Dialog
        title={commonDialogState.title}
        isOpen={commonDialogState.isOpen}
        onClose={closeCommonDialog}
        buttons={commonDialogState.buttons}
      >
        {commonDialogState.children}
      </Dialog>

      <Loading visible={isLoading} message={loadingMessage} />
      <Shortcuts />
    </DataContext.Provider>
  );
};

export default Table;
