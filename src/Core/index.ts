import Page from './Page';
import Data from './Data';
import Database from './Database';
import Ai from './Ai';
import Format from './Format';
import Translation from './Translation';
import Ocr from './Ocr';
import ZPrefs from './ZPrefs';
import Prefs from './Prefs';
import TablePrefs from './TablePrefs';
import Utils from './Utils';
import Crypto from './Crypto';
import Server from './Server';
import Garbage from './Garbage';
import Cloud from './Cloud';

type CoreType = {
  Page: typeof Page;
  Data: typeof Data;
  Ai: typeof Ai;
  Database: typeof Database;
  Format: typeof Format;
  Translation: typeof Translation;
  Ocr: typeof Ocr;
  Prefs: typeof Prefs;
  ZPrefs: typeof ZPrefs;
  TablePrefs: typeof TablePrefs;
  Utils: typeof Utils;
  Crypto: typeof Crypto;
  Server: typeof Server;
  Garbage: typeof Garbage;
  Cloud: typeof Cloud;
  init(config: {rootURI: string}): void;
};

const Core: CoreType = {
  Page,
	Data,
	Ai,
	Database,
	Format,
  Translation,
  Ocr,
	Prefs,
	ZPrefs,
	TablePrefs,
	Utils,
	Crypto,
	Server,
	Garbage,
	Cloud,
	init({rootURI}:{rootURI: string}) 
	{
		this.Page.init({rootURI});
	}
};

export default Core;