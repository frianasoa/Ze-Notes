import React, { useState, useEffect } from "react";
import TablePrefs from "../../Core/TablePrefs";
import { 
  FaAnglesDown, 
  FaAnglesUp, 
  FaAngleUp, 
  FaAngleDown, 
  FaEye, 
  FaEyeSlash 
} from "react-icons/fa6";

interface ColumnSortContentsProps {
  item: zty.ContextMenuData;
  celldata: Record<string, any>;
  buttons: any;
}

const ColumnSortContents: React.FC<ColumnSortContentsProps> = ({ item, celldata, buttons }) => {
  const [columns, setColumns] = useState<any[]>([]);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [reload, setReload] = useState<boolean>(true);

  useEffect(() => {
    (async () => {
      // Load hidden columns
      let hiddenColumns: string[] = [];
      try {
        const hiddenStr = await TablePrefs.get(celldata.collectionid, "hide-key", "[]");
        hiddenColumns = JSON.parse(hiddenStr);
      } catch (e) {
        console.error("Error parsing hidden columns:", e);
      }

      // Load saved column order (list of strings)
      let savedColumns: string[] = [];
      try {
        const saved = await TablePrefs.get(celldata.collectionid, "column-sort-key", "[]");
        savedColumns = JSON.parse(saved);
      } catch (e) {
        console.error("Error parsing saved columns:", e);
      }

      // Get headers from the item
      const headers: string[] = item?.data?.headers || [];

      // Convert saved column names to objects with `hidden` state
      const savedColumnsWithObjects = savedColumns.map((col) => ({
        value: col,
        hidden: hiddenColumns.includes(col),
      }));

      // Find missing headers and add them
      const missing = headers
        .filter((v) => !savedColumns.includes(v))
        .map((v) => ({
          value: v,
          hidden: hiddenColumns.includes(v),
        }));

      // Merge saved columns with new ones and update state
      setColumns([...savedColumnsWithObjects, ...missing]);
    })();
  }, [item, celldata.collectionid, reload]);

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

    // Save the updated order
    TablePrefs.set(celldata.collectionid, "column-sort-key", JSON.stringify(newColumns.map(elt => elt.value).filter(Boolean)))
      .then(() => setColumns(newColumns));
  };

  const toggleHidden = (index: number) => {
    const newColumns = [...columns];
    newColumns[index].hidden = !newColumns[index].hidden;

    // Save the new hidden columns list separately
    const hiddenList = newColumns.filter(col => col.hidden).map(col => col.value);
    Promise.all([
      TablePrefs.set(celldata.collectionid, "column-sort-key", JSON.stringify(newColumns.map(elt => elt.value).filter(Boolean))),
      TablePrefs.set(celldata.collectionid, "hide-key", JSON.stringify(hiddenList))
    ]).then(() => setColumns(newColumns));
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
    const [draggedItem] = newColumns.splice(dragIndex, 1);
    newColumns.splice(dropIndex, 0, draggedItem);

    TablePrefs.set(celldata.collectionid, "column-sort-key", JSON.stringify(newColumns.map(elt => elt.value).filter(Boolean)))
      .then(() => {
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
            {/* Column Name */}
            <span style={{ display: "table-cell", padding: "0 1em", borderBottom: "1px solid #ccc" }}>
              {column.value}
            </span>

            {/* Hide/Show Toggle */}
            <span style={{ display: "table-cell", padding: "0 1em", borderBottom: "1px solid #ccc" }}>
              <button onClick={() => toggleHidden(index)}>
                {column.hidden ? <FaEyeSlash title="Click to show column" style={{ color: "red" }} /> : <FaEye  title="Click to hide column" />}
              </button>
            </span>

            {/* Move Buttons */}
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
          <button key={index} onClick={() => {btn.action().then(()=>{setReload(!reload)})}} style={{ marginLeft: "8px" }}>
            {btn.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default ColumnSortContents;
