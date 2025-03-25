import OpenAI from './OpenAI';
import CustomAI from './CustomAI';
import AiNotes from './AiNotes';

type AiType = {
  OpenAI: typeof OpenAI;
  CustomAI: typeof CustomAI;
  AiNotes: typeof AiNotes;
};

const Ai: AiType = {
  AiNotes,
  CustomAI,
  OpenAI
};

export default Ai;