import Ui from './Ui';
import Config from './Config';
import Core from './Core';
import Components from './Components';
import ReaderMenu from './Components/ContextMenu/ReaderMenu';

type EngineType = {
  Config: typeof Config;
  Ui: typeof Ui;
  Core: typeof Core;
  Components: typeof Components;
  ReaderMenu: typeof ReaderMenu;
  id: string | null;
  version: string | null;
  rootURI: string | null;
  init(config: { id: string; version: string; rootURI: string}): void;
};

const Engine: EngineType = {
  Config,
  Ui,
	Core,
	Components,
	ReaderMenu,
  id: null,
  version: null,
  rootURI: null,
  init({ id, version, rootURI}: { id: string; version: string; rootURI: string}) 
  {
    this.id = id;
    this.version = version;
    this.rootURI = rootURI;
		this.Ui.init({rootURI});
    this.Core.Server.init();
  }
};

export { Engine };
