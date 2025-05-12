import Google from './Google';
import Languages from './Languages';
import DeepL from './DeepL';

type TranslationType = {
  Languages: typeof Languages;
  Google: typeof Google;
  DeepL: typeof DeepL;
};

const Translation: TranslationType = {
  Google,
  DeepL,
  Languages
};

export default Translation;
