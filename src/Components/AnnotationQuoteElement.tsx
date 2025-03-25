import React, { useEffect, useState } from "react";
import Utils from '../Core/Utils'

type AnnotationSelectionElementProps = {
  item: Record<string, any>;
  onContextMenu: (event: React.MouseEvent<HTMLDivElement, MouseEvent>)=>void;
};

const AnnotationQuoteElement: React.FC<AnnotationSelectionElementProps> = ({ item, onContextMenu }) => {    
  return (
    <div onContextMenu={onContextMenu} className="selection zcontent" data-legend="Direct quote" style={{background: item.color, border: 'dotted 1px', padding: '0.3em'}}>
      <span className="annotation-quote">“{item.text}”</span>&nbsp;
      <span className="annotation-source">{item.source}</span>
    </div>
  );
};

export default AnnotationQuoteElement;
