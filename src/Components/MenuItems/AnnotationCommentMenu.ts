import CustomAiMenu from './CustomAiMenu';
import AiMenu from './AiMenu';
import TranslationMenu from './TranslationMenu';
import {FaQuoteLeft}  from "react-icons/fa6";

const AnnotationCommentMenu = {
  show(context: any, event: React.MouseEvent<HTMLElement, MouseEvent>)
  {
    // Translation
    TranslationMenu.insert(context, event, [
      {key: "comment", label: "Comment"},
      {key: "commentpart", label: "Comment part"},
    ]);

    // AI providers (historically no OpenAI block on comments)
    AiMenu.insertprompts(context, event, ["gemini", "deepseek", "claude", "customai"], [
      {key: "comment", target: "comment", label: "Prompt on comment", icon: FaQuoteLeft},
      {key: "commentpart", target: "commentpart", label: "Prompt on part", icon: FaQuoteLeft},
    ]);

    // CustomAi multiple
    CustomAiMenu.show(context, event, [
      {
        label: "Prompt comment",
        key: "customaicomment",
        data: { target: "comment", context: context },
        icon: FaQuoteLeft
      },
      {
        label: "Prompt on part",
        key: "customaicommentpart",
        data: { target: "commentpart", context: context },
        icon: FaQuoteLeft
      }
    ]);
  }
}

export default AnnotationCommentMenu;
