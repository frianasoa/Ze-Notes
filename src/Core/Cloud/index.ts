import Dropbox from './Dropbox';

type CloudType = {
  Dropbox: typeof Dropbox;
};

const Cloud: CloudType = {
  Dropbox
};

export default Cloud;