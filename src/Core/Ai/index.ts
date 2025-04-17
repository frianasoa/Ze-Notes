import OpenAI from './OpenAI';
import Gemini from './Gemini';
import DeepSeek from './DeepSeek';
import CustomAI from './CustomAI';
import AiNotes from './AiNotes';

type AiType = {
  OpenAI: typeof OpenAI;
  Gemini: typeof Gemini;
  DeepSeek: typeof DeepSeek;
  CustomAI: typeof CustomAI;
  AiNotes: typeof AiNotes;
};

const Ai: AiType = {
  AiNotes,
  CustomAI,
  OpenAI,
  Gemini,
  DeepSeek
};

export default Ai;