import { useState } from "react";

// Shared state and handlers for the reorderable column lists in
// TableSortContents and ColumnSortContents. Persistence differs per dialog,
// so the caller provides the save callback; the column list is only updated
// once saving succeeds.
export default function useColumnReorder(save: (columns: zty.SortColumn[]) => Promise<unknown>) {
  const [columns, setColumns] = useState<zty.SortColumn[]>([]);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const persist = (newColumns: zty.SortColumn[], cleardrag: boolean = false) => {
    save(newColumns).then(() => {
      setColumns(newColumns);
      if (cleardrag) {
        setDragIndex(null);
      }
    });
  };

  const handleMove = (action: string, index: number) => {
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

    persist(newColumns);
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

    persist(newColumns, true);
  };

  return { columns, setColumns, dragIndex, persist, handleMove, onDragStart, onDragOver, onDrop };
}
