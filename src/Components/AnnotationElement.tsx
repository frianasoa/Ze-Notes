import React, { useEffect, useState, useContext } from "react";
import AnnotationCommentElement from "./AnnotationCommentElement";
import AnnotationQuoteElement from "./AnnotationQuoteElement";
import Actions from '../Core/Actions';
import ZPrefs from '../Core/ZPrefs';
import Languages from '../Core/Translation/Languages';
import DataContext from "./DataContext";
import {FaGoogle, FaD, FaNoteSticky}  from "react-icons/fa6";
import AnnotationImageMenu from './MenuItems/AnnotationImageMenu'
import AnnotationQuoteMenu from './MenuItems/AnnotationQuoteMenu'

type AnnotationElementProps = {
  item: Record<string, any>;
  dataset: Record<string, any>;
};

const annotationicon = "chrome://zotero/skin/itempane/16/attachment-annotations.svg";
const editicon = "chrome://zotero/skin/16/universal/edit.svg";

const AnnotationElement: React.FC<AnnotationElementProps> = ({ item, dataset }) => {
  const [image, setImage] = useState<string | null>(null);

  const context = useContext(DataContext);
  
  const openTranslationDialog = (value: any) => {
    if(context)
    {
      context.setTranslationDialogState?.(value);
    }
  }

  const openCommonDialog = (value: any) => {
    if(context)
    {
      context.setCommonDialogState?.(value);
    }
  }

  // Handle image loading
  useEffect(() => {
    const checkImage = async () => {
      if (await IOUtils.exists(item.image))
      {
        const url = await Zotero.File.generateDataURI(item.image, 'image/png');
        setImage(url);
      }
      else
      {
        setImage(null);
      }
    };

    checkImage();
  }, [item.image]);
  
  const handleImageAnnotationContextMenu = (event: React.MouseEvent<HTMLElement, MouseEvent>) => {
    AnnotationImageMenu.show(event, context, item);
  }

  const handleQuoteContextMenu = (event: React.MouseEvent<HTMLElement, MouseEvent>) => {
    if(context)
    {
      AnnotationQuoteMenu.show(context, event);
      
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
        data: {attachmentid: item.attachmentid, annotationid: item.annotationid, annotationpage: item.pagelabel, annotationcomment: item.comment, annotationkey: item.annotationkey, callback: openCommonDialog, service: "Google"}
      }

      if(item.text)
      {
        const langiso = ZPrefs.get('translation-language', "en");
        const langlabel = Languages.getlabel(String(langiso));
        const deeplkey = ZPrefs.get('deepl-api-key', false);
        
        context.MenuItems.main["septranslate"] = {label: "---"}
        context.MenuItems.main["translateannotation"] = {
          label: 'Translate with Google ('+langlabel+')',
          title: 'Google translate',
          icon: FaGoogle,
          onClick: Actions.translateannotation,
          data: {attachmentid: item.attachmentid, annotationid: item.annotationid, annotationpage: item.pagelabel, annotationkey: item.annotationkey, annotationtext: item.text, callback: openTranslationDialog, service: "Google"}
        }
        
        if(deeplkey)
        {
          context.MenuItems.main["translateannotationwithdeepl"] = {
            label: 'Translate with DeepL ('+langlabel+')',
            title: 'DeepL translate',
            icon: FaD,
            onClick: Actions.translateannotation,
            data: {attachmentid: item.attachmentid, annotationid: item.annotationid, annotationpage: item.pagelabel, annotationkey: item.annotationkey, annotationtext: item.text, callback: openTranslationDialog, service: "DeepL"}
          }
        }
      }
    }
  };

  return (
    <fieldset className="main-fieldset">
      <legend className="main-legend">
        <img className='group-icon' src={annotationicon} style={{backgroundColor:"white", filter: "drop-shadow(0 0 8px rgba(255, 255, 255, 0.1))"}} />
      </legend>
      <div data-type="annotation" >
        {image ? (
          <div>
            <AnnotationCommentElement item={item} dataset={dataset} />
            <img onContextMenu={handleImageAnnotationContextMenu} width="100%" src={image} style={{border: "solid 1px red"}} alt={image} />
          </div>
        ) : item.text ? (
          <div>
            <AnnotationCommentElement item={item} dataset={dataset} />
            <AnnotationQuoteElement onContextMenu={handleQuoteContextMenu} item={item} />
          </div>
        ) : item.comment ? (
          <div>
            <AnnotationCommentElement item={item} dataset={dataset} />
            <AnnotationQuoteElement onContextMenu={handleQuoteContextMenu} item={item} />
          </div>
        ): (
          <div>error: {JSON.stringify(item)}</div>
        )}
      </div>
    </fieldset>
  );
};

export default AnnotationElement;
