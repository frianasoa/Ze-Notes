import React, {useContext} from 'react';
import CellMenu from './MenuItems/CellMenu';
import AnnotationElement from './AnnotationElement'
import NoteElement from './NoteElement'
import FileElement from './FileElement'
import NativeFieldElement from './NativeFieldElement'
import ColumnResizer from './ColumnResizer'
import DataContext from "./DataContext";
import {FaHtml5, FaFilePdf, FaO, FaFileImage, FaFile, FaFileExport}  from "react-icons/fa6";

type CellProps = {
  data: string | zty.ItemData[] | any[];
  dataset: Record<string, any>;
  children?: React.ReactNode;
};

const Cell: React.FC<CellProps> = ({ data, dataset, children }) => {
  const context = useContext(DataContext);
  const handleContextMenu = (event: React.MouseEvent<HTMLTableCellElement, MouseEvent>) => {
    CellMenu.show(context, dataset, event);
  };
  
  let html = <></>;

  if (typeof data === 'string' || typeof data === 'number') 
  {
    const displaydata =
      typeof data === 'string'
        ? data.replace(/(&lt;&lt;.*?&gt;&gt;|<<.*?>>)/g, '')
        : data;
    html = <div style={{float: 'left', width: '98%'}} className="no-export-wrapper">{displaydata}</div>;
  }
  else if (Array.isArray(data) || typeof data === 'object') {
    var index = 0;
    html = (
      <div style={{float: 'left', width: '98%'}} className="no-export-wrapper">
        {data.map((item, index) => {
          let c = [];
          if (item.type === 'note') {
            c.push(<NoteElement key={`${index}-note`} item={item} />);
          }
          else if (item.type === 'file') {
            c.push(<FileElement key={`${index}-file`} item={item} />);
          } 
          else if (item.type === 'annotation') 
          {
            c.push(<AnnotationElement key={`${index}-annotation`} item={item} />);
          } else if (item.type === 'empty') {
            c.push(<div key={`${index}-empty`}>-</div>);
          }
          else if (item.type === 'native-field') {
            c.push(<NativeFieldElement key={`${index}-empty`} item={item}/>);
          } else {
            c.push(<div key={`${index}-unknown`}>Unknown type</div>);
          }
          return <React.Fragment key={index}>{c}</React.Fragment>;
        })}
      </div>
    );
  }
  else
  {
    html = <div style={{float: 'left', width: '98%'}} className="no-export-wrapper"> {JSON.stringify(data)}</div>;
  }
  
  html = (
    <td onContextMenu={handleContextMenu} style={{verticalAlign:'top', height: '100%'}} className={"target-element "} {...Object.keys(dataset).reduce((acc, key) => { acc[`data-${key}` as keyof React.HTMLProps<HTMLTableCellElement>] = dataset[key]; return acc; }, {} as React.HTMLProps<HTMLTableCellElement>)}>
    {html}
    <ColumnResizer item={dataset}/>
    </td>
  );
  return html;
};

export default Cell;
