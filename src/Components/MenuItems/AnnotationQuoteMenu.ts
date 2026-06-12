import CustomAiMenu from "./CustomAiMenu";
import AiMenu from "./AiMenu";
import { FaQuoteLeft } from "react-icons/fa6";

const AnnotationQuoteMenu = {
  show(context: any, event: React.MouseEvent<HTMLElement, MouseEvent>) {
    // AI providers
    AiMenu.insertprompts(
      context,
      event,
      ["openai", "gemini", "deepseek", "claude", "customai"],
      [{ key: "quote", target: "quote", label: "Prompt on quote", icon: FaQuoteLeft }],
    );

    // CustomAi multiple
    CustomAiMenu.show(context, event, [
      {
        label: "Prompt on quote",
        key: "customaiquote",
        data: { target: "quote", context: context },
        icon: FaQuoteLeft,
      },
    ]);
  },
};

export default AnnotationQuoteMenu;
