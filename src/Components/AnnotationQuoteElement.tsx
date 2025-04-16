import React, { useEffect, useState } from "react";
import Utils from '../Core/Utils'
import Color from './Color';
import ZPrefs from '../Core/ZPrefs';
import { emitter } from './EventEmitter';

type AnnotationSelectionElementProps = {
  item: Record<string, any>;
  onContextMenu: (event: React.MouseEvent<HTMLDivElement, MouseEvent>)=>void;
};

const AnnotationQuoteElement: React.FC<AnnotationSelectionElementProps> = ({ item, onContextMenu }) => {
  const [backgroundColor, setBackgroundColor] = useState<string>(item.color);
  
  const addopacity = (newOpacity: number) => {
    const newColor = Color.addopacity(item.color, newOpacity);
    setBackgroundColor(newColor);
  };
  
  /** Move this somewhere up (to parents) if needed */
  // useEffect(()=>{
    // emitter.addListener('opacityChanged', addopacity);
    // return () => {
      // emitter.removeListener('opacityChanged', addopacity);
    // };
  // }, [])
  
  useEffect(() => {
    const opacity = ZPrefs.get("quote-bg-opacity", 255);
    addopacity(opacity);
  }, [item.color]);
  
  return (
    <div onContextMenu={onContextMenu} className="selection zcontent" data-legend="Direct quote" data-annotationid={item.annotationid} style={{background: backgroundColor, border: 'dotted 1px', padding: '0.3em'}}>
      <span className="annotation-quote">“{item.text}”</span>&nbsp;
      <span className="annotation-source">{item.source}</span>
    </div>
  );
};

export default AnnotationQuoteElement;
