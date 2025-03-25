import CustomAiMenu from './CustomAiMenu';
import {FaQuoteLeft}  from "react-icons/fa6";

const AnnotationQuoteMenu = {
  show(context: any, event: React.MouseEvent<HTMLElement, MouseEvent>) 
  {
    const param = {
      label: "Prompt on quote",
      key: "customaiannotation",
      target: "annotation",
      icon: FaQuoteLeft
    }
    CustomAiMenu.show(context, event, param)
  }
}

export default AnnotationQuoteMenu;