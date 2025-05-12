import React, { useEffect, useState, useContext } from "react";
import Utils from '../Core/Utils'
import DataContext from "./DataContext";
import AnnotationCommentMenu from './MenuItems/AnnotationCommentMenu'
import {FaNoteSticky}  from "react-icons/fa6";
import Actions from '../Core/Actions';


type AnnotationCommentElementProps = {
  item: Record<string, any>;
  dataset: Record<string, any>;
  onContextMenu?: (event: React.MouseEvent<HTMLFieldSetElement, MouseEvent>)=>void;
};

const AnnotationCommentElement: React.FC<AnnotationCommentElementProps> = ({ item, dataset, onContextMenu }) => {
  const [comments, setComments] = useState<{ [key: string]: string }>({});
  const context = useContext(DataContext);
  useEffect(() => {
    if (item.comment) {
      const commentData = Utils.splitcomment(item.comment);
      setComments(commentData);
    }
  }, [item.comment]);


  const openCommonDialog = (value: any) => {
    if(context)
    {
      context.setCommonDialogState?.(value);
    }
  }

  const handleCommentPartContextMenu = (event: React.MouseEvent<HTMLElement, MouseEvent>) => {
    if(context)
      {
      context.MenuItems.main["showannotation"] = {
        label: 'Show annotation',
        icon: FaNoteSticky,
        onClick: Actions.showannotation,
        data: {attachmentid: item.attachmentid, annotationid: item.annotationid, annotationpage: item.pagelabel, annotationkey: item.annotationkey}
      }

      context.MenuItems.main["editannotationcomment"] = {
        label: 'Edit annotation comment',
        icon: FaNoteSticky,
        onClick: Actions.editannotationcomment,
        data: {attachmentid: item.attachmentid, annotationid: item.annotationid, annotationpage: item.pagelabel, annotationcomment: item.comment, annotationkey: item.annotationkey, callback: openCommonDialog}

      }
      AnnotationCommentMenu.show(context, event);
    }
  }

  return (
    <div className="comment" data-column={dataset.column}>
    {(
      Object.keys(comments).map((title, index) => (
        <fieldset className="sub-fieldset" key={index} style={{ marginBottom: '0.5em', border: 'dotted 1px' }}>
          <legend className="annotation-part sub-legend" style={{fontWeight: "bold"}} data-legend={title}>{title}</legend>
          <div onContextMenu={handleCommentPartContextMenu} className="zcontent" data-legend={title} data-annotationid={item.annotationid} dangerouslySetInnerHTML={{ __html: Utils.sanitizeannotation(comments[title].split("\n").join("<br/>")) }}></div>
        </fieldset>
      ))
    )}
    </div>
  );
};

export default AnnotationCommentElement;
