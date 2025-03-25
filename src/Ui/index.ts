import ContextMenu from './ContextMenu';

type UiType = {
  ContextMenu: typeof ContextMenu;
  init(config: {rootURI: string}): void;
};

const Ui: UiType = {
  ContextMenu,
	init({rootURI}:{rootURI: string}) 
	{
		ContextMenu.init({rootURI});
	}
};

export default Ui;