import React from "react";
import MenuItem from "./MenuItem";
import styles from "./Menu.module.css";

type SubMenuProps = {
  submenudata: Record<string, zty.ContextMenuData>;
  submenuPosition: { left: string, right: string, top: string | undefined, position: Position};
  onClick: (event: any) => void; // Function to handle submenu item click
  contextMenuRef?: React.RefObject<HTMLUListElement | null>;
  subMenuLeftRef?: React.RefObject<HTMLDivElement | null>;
  subMenuRightRef?: React.RefObject<HTMLDivElement | null>;
  cellData?: Record<string, any>;
};

const SubMenu: React.FC<SubMenuProps> = ({ submenudata, submenuPosition, onClick, contextMenuRef , subMenuLeftRef, subMenuRightRef, cellData}) => {
  return (
    <ul
      className={styles.ul}
      style={{
        position: submenuPosition.position,
        top: submenuPosition.top,
        left: submenuPosition.left,
        listStyle: "none",
        padding: "0",
        margin: "0",
        zIndex: 1001,
      }}
    >
      {Object.keys(submenudata).map((id, index) => 
        submenudata[id]?.label ? (
          <MenuItem
            key={index}
            data={submenudata[id]}
            contextMenuRef={contextMenuRef}
            onClick={(event) => submenudata[id]?.onClick?.(submenudata[id], cellData!, event)}
          />
        ) : null
      )}
    </ul>
  );
};

export default SubMenu;
