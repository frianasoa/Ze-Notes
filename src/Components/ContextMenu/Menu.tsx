import React, { useState, useRef, useEffect } from "react";
import MenuItem from "./MenuItem";
import styles from "./Menu.module.css";
import ZPrefs from '../../Core/ZPrefs'

type MenuProps = {
  items: Record<string, zty.ContextMenuData>;
  targetSelector: string;
  handleClick: (c: any) => void;
  handleClose?: () => void;
};

const Menu: React.FC<MenuProps> = ({ items, targetSelector, handleClick, handleClose}) => {
  const [isContextMenuVisible, setContextMenuVisible] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  const [fontSize, setFontSize] = useState<string | number>("0.95em");
  const [cellData, setCellData] = useState({});
  const [adjustedPosition, setAdjustedPosition] = useState<{ x: number; y: number } | null>(null);
  const contextMenuRef = useRef<HTMLUListElement | null>(null);
  const subMenuLeftRef = useRef<HTMLDivElement | null>(null);
  const subMenuRightRef = useRef<HTMLDivElement | null>(null);
  
  
  // Handle outside clicks to close the context menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(event.target as Node)) {
        setContextMenuVisible(false);
        setAdjustedPosition(null);
        handleClose?.();
      }
    };

    window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, []);

  // Handle right-click to open the context menu
  const handleContextMenu = (event: MouseEvent) => {
    const target = event.target as HTMLElement;
    if (!target.closest(targetSelector)) {
      return;
    }
    
    const cdata =  JSON.parse(JSON.stringify((target.closest(targetSelector) as HTMLElement).dataset ||  target.dataset))
    // cdata.table = target.closest(".main-table");
    cdata["target"] = target;
    setCellData(cdata);
    
    event.preventDefault();
    const { clientX, clientY } = event;

    setContextMenuPosition({ x: clientX, y: clientY });
    setContextMenuVisible(true);
  };

  // Adjust the context menu position if it exceeds the viewport size
  useEffect(() => {
    if (isContextMenuVisible && contextMenuRef.current) {
      const menuWidth = contextMenuRef.current.offsetWidth;
      const menuHeight = contextMenuRef.current.offsetHeight;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      // Account for the scrollbar width
      const scrollbarWidth = viewportWidth - document.documentElement.clientWidth;

      let adjustedX = contextMenuPosition.x;
      let adjustedY = contextMenuPosition.y;

      // Check if the menu exceeds the viewport width, considering scrollbar width
      if (contextMenuPosition.x + menuWidth + scrollbarWidth > viewportWidth) {
        // Move the menu to the left of the cursor if it exceeds the viewport width
        adjustedX = contextMenuPosition.x - menuWidth - scrollbarWidth;
      }

      // Check if the menu exceeds the viewport height
      if (contextMenuPosition.y + menuHeight > viewportHeight) {
        adjustedY = viewportHeight - menuHeight - 10; // Keep it within bounds
      }

      setAdjustedPosition({ x: adjustedX, y: adjustedY });
    }
    setFontSize(ZPrefs.get("contextmenu-font-size", "0.95")+"em");
  }, [isContextMenuVisible, contextMenuPosition]);
  
  // Add event listener for right-click (context menu)
  useEffect(() => {
		const cells = window.document.querySelectorAll(targetSelector);
		cells.forEach(cell => {
      cell.addEventListener("contextmenu", handleContextMenu as EventListener);
      cell.addEventListener("contextmenu", handleClick as EventListener);
    });
    
    return () => {
      cells.forEach(cell => {
        cell.removeEventListener("contextmenu", handleContextMenu as EventListener);
        cell.removeEventListener("contextmenu", handleClick as EventListener);
      });
    };
	}, [targetSelector]);


  // Handle menu item click
  const handleMenuItemClick = (item: zty.ContextMenuData) => {
    setContextMenuVisible(false); // Close the menu
    setAdjustedPosition(null); // Reset position
  };

  return (
    <>
      {isContextMenuVisible && (
        <div
          className={styles.menu}
					style={{
						position: "absolute",
						top: adjustedPosition?.y ?? contextMenuPosition.y,
						left: adjustedPosition?.x ?? contextMenuPosition.x,
						visibility: adjustedPosition ? "visible" : "hidden",
            borderRadius: "0.2em",
            fontSize: fontSize,
						zIndex: 1000,
					}}
				>
          <div 
          ref={subMenuLeftRef}
					style = {{
						position: "absolute",
						backgroundColor: "white",
						boxShadow: "0 1px 1px rgba(128, 128, 128, 0.1)",
						borderRadius: "0.2em",
						left: "-100px", 
						width: "100px", 
						padding: "0",
						margin: "0"
					}}
					></div>
          <ul
						ref={contextMenuRef}
            className={styles.ul}
						style = {{
              borderRadius: "0.2em",
              listStyle: "none",
							padding: "0",
							margin: "0",
						}}
          >
          {Object.keys(items).map((id, index) => {
            if (items[id].label) {
              return (
                <MenuItem
                  key={index}
                  contextMenuRef={contextMenuRef}
                  subMenuRightRef={subMenuRightRef}
                  subMenuLeftRef={subMenuLeftRef}
                  cellData={cellData}
                  data={items[id]}
                  onClick={(event) => {
                    handleMenuItemClick(items[id]);
                    items[id]?.onClick?.(items[id], cellData, event);
                    items[id]?.onClose?.();
                    handleClose?.();
                  }}
                />
              );
            }
            return null;
          })}
            
          </ul>
          <div ref={subMenuRightRef}></div>
        </div>
      )}
    </>
  );
};

export default Menu;
