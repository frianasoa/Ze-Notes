import ContextMenu from './ContextMenu';
import MainMenu from './MainMenu';

type UiType = {
  ContextMenu: typeof ContextMenu;
  MainMenu: typeof MainMenu;
  init(config: {rootURI: string}): void;
};

const Ui: UiType = {
  ContextMenu,
  MainMenu,
	init({rootURI}:{rootURI: string}) 
	{
		ContextMenu.init({rootURI});
		MainMenu.init({rootURI});
	}
};

export default Ui;