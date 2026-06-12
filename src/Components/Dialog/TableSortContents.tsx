import React, { useEffect } from "react";
import TablePrefs from "../../Core/TablePrefs";
import useColumnReorder from "./useColumnReorder";

import {
  FaArrowDownAZ,
  FaArrowDownZA,
  FaAnglesDown,
  FaAnglesUp,
  FaAngleUp,
  FaAngleDown,
} from "react-icons/fa6";

interface TableSortContentsProps {
  item: zty.ContextMenuData;
  celldata: zty.CellData;
  buttons: any;
}

const TableSortContents: React.FC<TableSortContentsProps> = ({ item, celldata, buttons }) => {
  const save = (columns: zty.SortColumn[]) =>
    TablePrefs.set(celldata.collectionid, "table-sort-key", JSON.stringify(columns));

  const { columns, setColumns, dragIndex, persist, handleMove, onDragStart, onDragOver, onDrop } = useColumnReorder(save);

  useEffect(() => {
    // Use an async IIFE to allow await inside useEffect.
    (async () => {

      // Load the saved columns (including order and reversed/hidden state) from TablePrefs.
      let savedColumns: zty.SortColumn[] = [];
      try {
        const saved = await TablePrefs.get(celldata.collectionid, "table-sort-key", "[]");
        savedColumns = JSON.parse(saved);
      } catch (e) {
        console.error("Error parsing saved columns:", e);
      }

      // Get current headers from the item.
      const headers: string[] = item?.data?.headers || [];

      // For any header not present in savedColumns, add it.
      const missing = headers.filter(v => !savedColumns.some(sc => sc.value === v))
        .map(v => ({
          value: v,
          reversed: false,
        }));

      // Merge saved columns with missing ones.
      const merged = [...savedColumns, ...missing].map(col => ({
        ...col
      }));

      setColumns(merged);
    })();
  }, [item, celldata.collectionid]);

  const toggleReversed = (index: number) => {
    const newColumns = [...columns];
    newColumns[index].reversed = !newColumns[index].reversed;
    persist(newColumns);
  };

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        gap: "1em",
      }}
    >
      <div style={{ flex: "1", border: "0", overflowY: "auto" }}>
        {columns.map((column, index: number) => (
          <div
            key={index}
            draggable
            onDragStart={(e) => onDragStart(e, index)}
            onDragOver={onDragOver}
            onDrop={(e) => onDrop(e, index)}
            style={{
              display: "table-row",
              padding: "0.5em",
              borderBottom: "1px solid #ccc",
              backgroundColor: dragIndex === index ? "#f0f0f0" : "transparent",
              cursor: "move",
            }}
          >
            {/* Column 1: value */}
            <span style={{ display: "table-cell", padding: "0 1em", borderBottom: "1px solid #ccc" }}>
              {column.value}
            </span>

            {/* Column 2: icon based on reversed */}
            <span style={{ display: "table-cell", padding: "0 1em", borderBottom: "1px solid #ccc" }}>
              <button onClick={() => toggleReversed(index)}>
                {column.reversed ? <FaArrowDownZA style={{ color: "red" }} title="Click to sort ascending" /> : <FaArrowDownAZ title="Click to sort descending"/>}
              </button>
            </span>

            {/* Column 3: commands */}
            <span style={{ display: "table-cell", padding: "0 1em", borderBottom: "1px solid #ccc" }}>
              <button onClick={() => handleMove("moveToStart", index)} title="Move to start">
                <FaAnglesUp />
              </button>
              <button onClick={() => handleMove("moveUp", index)} title="Move up">
                <FaAngleUp />
              </button>
              <button onClick={() => handleMove("moveDown", index)} title="Move down">
                <FaAngleDown />
              </button>
              <button onClick={() => handleMove("moveToEnd", index)} title="Move to end">
                <FaAnglesDown />
              </button>
            </span>
          </div>
        ))}
      </div>
      <div style={{ textAlign: "right" }}>
        {buttons.map((btn: any, index: number) => (
          <button key={index} onClick={btn.action} style={{ marginLeft: "8px" }}>
            {btn.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default TableSortContents;
