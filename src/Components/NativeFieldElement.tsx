import React from "react";

type NativeFieldElementProps = {
  item: Record<string, any>
};

const NativeFieldElement: React.FC<NativeFieldElementProps> = ({ item }) => {    
  return (
    <div className="no-export-wrapper zcontent" data-legend="Field value">
      {item.text}
    </div>
  );
};

export default NativeFieldElement;
