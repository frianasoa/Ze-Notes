import Notes from './Notes';
import FindBar from './FindBar';
import {emitter} from './EventEmitter';

type ComponentsType = {
  Notes: typeof Notes,
  FindBar: typeof FindBar,
  emitter: typeof emitter,
  
};

const Components: ComponentsType = {
	Notes,
	emitter,
  FindBar
};

export default Components;