import Notes from './Notes';
import FindBar from './FindBar';

type ComponentsType = {
  Notes: typeof Notes,
  FindBar: typeof FindBar,
};

const Components: ComponentsType = {
	Notes,
  FindBar
};

export default Components;