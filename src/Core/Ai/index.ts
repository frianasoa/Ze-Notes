import OpenAI from './OpenAI';
import Gemini from './Gemini';
import CustomAI from './CustomAI';
import AiNotes from './AiNotes';

type AiType = {
  OpenAI: typeof OpenAI;
  Gemini: typeof Gemini;
  CustomAI: typeof CustomAI;
  AiNotes: typeof AiNotes;
};

const Ai: AiType = {
  AiNotes,
  CustomAI,
  OpenAI,
  Gemini
};

export default Ai;