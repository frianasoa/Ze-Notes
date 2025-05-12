import React from 'react';

type FileElementProps = {
  item: Record<string, any>;
};

const FileElement: React.FC<FileElementProps> = ({item}) => {  
  return (
    <fieldset>
    <legend>Attachments</legend>
    <div data-type="file" className="zcontent" data-legend="Attachment">
      <a href={item.value}>{item.key}</a>
    </div>
    </fieldset>
  );
};

export default FileElement;
