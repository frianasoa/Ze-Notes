import React, { useContext, useCallback } from "react";
import Prefs from '../Core/Prefs'
import DataContext  from './DataContext'

type ColumnResizerProps = {
  item: Record<string, any>;
};

let previousX = 0;
let currentX = 0;
let currentElementWidth = 0;

const resizeColumn = (td: HTMLTableCellElement, width: number) => {
  const columnIndex = td.cellIndex;    
  const columnname = td.dataset.column;
  const rows = (td.closest("table") as HTMLTableElement)?.rows;    
  for (let row of rows!)
  {
    const cell = (row as HTMLTableRowElement).cells[columnIndex] as HTMLTableCellElement;
    cell.style.width = `${width}px`;
  }
  currentElementWidth = width;
}

const handleMouseMove = (event: any) => {
  currentX = event.clientX;
  event.preventDefault();
}

const handleDragStart = (event: React.DragEvent<HTMLDivElement>) => {
  const window = event.view;
  const document  = window.document;
  document.addEventListener("dragover", handleMouseMove);
};

const handleDrag = (event: React.DragEvent<HTMLDivElement>) => {
  const cursor = event.target as HTMLDivElement;
  var target;
  var allcolumns = false;
  const td = cursor.closest("td") as HTMLTableCellElement;
  const th = cursor.closest("th") as HTMLTableCellElement;
  
  const cursorleft = cursor.getBoundingClientRect().left;
  
  if(td)
  {
    target = td;
  }
  else if(th)
  {
    target = th;
  }
  
  if(target)
  {
    const currentWidth = target.style.width ? parseInt(target.style.width, 10) : target.offsetWidth;
    const delta = currentX-cursorleft;
    const currentCellWidth = target.style.width ? parseInt(target.style.width, 10) : target.offsetWidth;
    const width = currentCellWidth + delta;
    resizeColumn(target, width);
    previousX = currentX;
  }
};

const handleDragEnd = (event: React.DragEvent<HTMLDivElement>, context: any) => {
  const cursor = event.target as HTMLDivElement;
  const td = cursor.closest("td") as HTMLTableCellElement;
  const th = cursor.closest("th") as HTMLTableCellElement;
  const target = th ? th : td;
  
  const window = event.view;
  const document  = window.document;
  document.removeEventListener("dragover", handleMouseMove);
  
  if(currentElementWidth>0)
  {
    const key = "column-width/"+context?.collectionid+"/"+target.dataset.column;
    Prefs.set(key, String(currentElementWidth)); 
  }
  
  if(th)
  {
    const altkey = "column-width/"+context?.collectionid+"/"+th.dataset.altcolumn;
    Prefs.set(altkey, String(currentElementWidth));
  }
  context.initColumnWidths();
};

const ColumnResizer: React.FC<ColumnResizerProps> = ({item}) => { 
  const context = useContext(DataContext);
  
  const dragEndHandler = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    handleDragEnd(event, context);
  }, [context]);
  
  return (
    <div
      className = "no-export"
      style={{
        position: 'absolute',
        right: '-5px',
        width: '5px',
        height: '100%',
        cursor: 'col-resize',
        backgroundColor: 'transparent',
      }}
      title={item.title}
      draggable
      onDragStart={(event) => handleDragStart(event)}
      onDragEnd={(event) => dragEndHandler(event)}
      onDrag={(event) => handleDrag(event)}
    >
    &nbsp;
    </div>
  );
};

export default React.memo(ColumnResizer);
