import React, { useState, useEffect } from "react";
import Utils from "../../Core/Utils";
import pkg from "../../../package.json";
import TablePrefs from "../../Core/TablePrefs";

import { 
  FaArrowDownAZ, 
  FaArrowDownZA, 
  FaAnglesDown, 
  FaAnglesUp, 
  FaAngleUp, 
  FaAngleDown, 
  FaEye, 
  FaEyeSlash 
} from "react-icons/fa6";

interface TableSortContentsProps {
  item: zty.ContextMenuData;
  celldata: Record<string, any>;
  buttons: any;
}

const TableSortContents: React.FC<TableSortContentsProps> = ({ item, celldata, buttons }) => {
  const [columns, setColumns] = useState<any[]>([]);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  useEffect(() => {
    // Use an async IIFE to allow await inside useEffect.
    (async () => {  
    
      // Load the saved columns (including order and reversed/hidden state) from TablePrefs.
      let savedColumns: any[] = [];
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
      // Also, ensure that every column has the hidden property (if not, set it accordingly).
      const merged = [...savedColumns, ...missing].map(col => ({
        ...col
      }));
  
      setColumns(merged);
    })();
  }, [item, celldata.collectionid]);

  const handleMove = (action: string, index: number) => {
    console.log(`Action ${action} for element at index ${index}`);
    const newColumns = [...columns];

    switch (action) {
      case "moveToEnd": {
        const [endElement] = newColumns.splice(index, 1);
        newColumns.push(endElement);
        break;
      }
      case "moveToStart": {
        const [startElement] = newColumns.splice(index, 1);
        newColumns.unshift(startElement);
        break;
      }
      case "moveUp":
        if (index > 0) {
          [newColumns[index - 1], newColumns[index]] = [newColumns[index], newColumns[index - 1]];
        }
        break;
      case "moveDown":
        if (index < newColumns.length - 1) {
          [newColumns[index + 1], newColumns[index]] = [newColumns[index], newColumns[index + 1]];
        }
        break;
      default:
        break;
    }

    TablePrefs.set(celldata.collectionid, "table-sort-key", JSON.stringify(newColumns)).then(() => {
      setColumns(newColumns);
    });
  };

  const toggleReversed = (index: number) => {
    const newColumns = [...columns];
    newColumns[index].reversed = !newColumns[index].reversed;

    TablePrefs.set(celldata.collectionid, "table-sort-key", JSON.stringify(newColumns)).then(() => {
      setColumns(newColumns);
    });
  };

  // Drag & Drop handlers
  const onDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    setDragIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>, dropIndex: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === dropIndex) return;
    
    const newColumns = [...columns];
    // Remove dragged element
    const [draggedItem] = newColumns.splice(dragIndex, 1);
    // Insert dragged element at the new position
    newColumns.splice(dropIndex, 0, draggedItem);

    TablePrefs.set(celldata.collectionid, "table-sort-key", JSON.stringify(newColumns)).then(() => {
      setColumns(newColumns);
      setDragIndex(null);
    });
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
        {columns.map((column: any, index: number) => (
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
