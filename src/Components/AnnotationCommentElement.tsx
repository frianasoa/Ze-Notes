import React, { useEffect, useState } from "react";
import Utils from '../Core/Utils'

type AnnotationCommentElementProps = {
  item: Record<string, any>;
  onContextMenu: (event: React.MouseEvent<HTMLFieldSetElement, MouseEvent>)=>void;
};

const AnnotationCommentElement: React.FC<AnnotationCommentElementProps> = ({ item, onContextMenu }) => {
  const [comments, setComments] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (item.comment) {
      const commentData = Utils.splitcomment(item.comment);
      setComments(commentData);
    }
  }, [item.comment]);
    
  return (
    <>
    {(
      Object.keys(comments).map((title, index) => (
        <fieldset className="sub-fieldset" onContextMenu={onContextMenu} key={index} style={{ marginBottom: '0.5em', border: 'dotted 1px' }}>
          <legend className="annotation-part sub-legend" style={{fontWeight: "bold"}}>{title}</legend>
          <div className="zcontent" data-legend={title} dangerouslySetInnerHTML={{ __html: Utils.sanitizeannotation(comments[title].split("\n").join("<br/>")) }}></div>
        </fieldset>
      ))
    )}
    </>
  );
};

export default AnnotationCommentElement;
