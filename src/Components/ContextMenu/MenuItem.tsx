import SubMenu from './SubMenu'
import Prefs from '../../Core/Prefs'
import React, { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom";
import styles from "./Menu.module.css";

type MenuItemProps = {
  data: zty.ContextMenuData;
  onClick: (event: any) => void;
	contextMenuRef?: React.RefObject<HTMLUListElement | null>;
	subMenuLeftRef?: React.RefObject<HTMLDivElement | null>;
	subMenuRightRef?: React.RefObject<HTMLDivElement | null>;
	cellData?: Record<string, any>;
};

const getWidestChildWidth = (element: React.RefObject<HTMLDivElement | null>) => {
  const parent = element?.current;
  if (!parent) return 0;

  let widestWidth = 0;
  for (const child of Array.from(parent.children)) {
    const childWidth = child.getBoundingClientRect().width;
    if (childWidth > widestWidth) {
      widestWidth = childWidth;
    }
  }
  return widestWidth;
};

const subMenuMinWidth = 175;

const MenuItem: React.FC<MenuItemProps> = ({ data, onClick, contextMenuRef, subMenuLeftRef, subMenuRightRef, cellData}) => {
	const [submenuWidth, setSubmenuWidth] = useState(subMenuMinWidth);
  const [submenuVisible, setSubmenuVisible] = useState(false);
  const [submenuPosition, setSubmenuPosition] = useState<{ left: string, right: string, top: string | undefined, position: Position, overflow: boolean}>({ left: "101%", right: "100%", top: undefined, position: "absolute", overflow: false });
  
  const [elementValues, setElementValues] = useState<Record<string, any>>({});
  
  const menuItemRef = useRef<HTMLLIElement | null>(null);

  // Handle submenu position adjustment when hovering over the menu item
	const windowWidth = window.innerWidth;
  
  // default color
  if(!data.iconColor)
  {
    data.iconColor = "";
  }
  if(!data.textColor)
  {
    data.textColor = "";
  }
  if(!data.bgColor)
  {
    data.bgColor = "";
  }
	
	useEffect(() => {
    if (submenuVisible && menuItemRef.current) {
      const menuItemRect = menuItemRef.current.getBoundingClientRect();
      const contextMenuRect = contextMenuRef?.current?.getBoundingClientRect();
  
      // Check if the submenu overflows the right edge of the window
			if (menuItemRect.right + Math.max(submenuWidth, subMenuMinWidth) > windowWidth) 
			{
        setSubmenuPosition({ left: "0", right: "", top: "0", position: "relative", overflow: true });
				
				if (subMenuLeftRef?.current) 
				{
					setSubmenuWidth(Math.max(getWidestChildWidth(subMenuLeftRef), subMenuMinWidth));
					const left = (contextMenuRect?.left ?? 0) - submenuWidth;
					subMenuLeftRef.current.style.position = "fixed";
					subMenuLeftRef.current.style.top = menuItemRect.top+"px";
					subMenuLeftRef.current.style.left = left+"px";
					subMenuLeftRef.current.style.width = submenuWidth+"px";
				}
      } 
			else 
			{
        setSubmenuPosition({ left: "100%", right: "", top: "0", position: "absolute", overflow: false });
      }
    }
  }, [submenuVisible]);
  
  if(data.label=="---")
  {
    return (
      <li
        className = {styles.li}
        style={{
        padding: "0 0.3em 0 0.3em",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        borderRadius: "0.3em",
        whiteSpace: "nowrap",
        position: "relative",
      }}
      >
        <hr style={{border: '1px solid lightgray', width: '100%'}}/>
      </li>
    );
  }
  
  if(data.type=="slider")
  {
    const value = Prefs.get(data.options.key, "").then(value=>{
      elementValues[data.options.key] = value;
    })
    return (
      <li className = {styles.li}>
          <label title={data.title || data.label}>
          {data.label}<br/>
          <input type="range" min={data.options.min} value={elementValues[data.options.key]??""} max={data.options.max} step={data.options.step} onInput={onClick} />
          </label>
      </li>
    );
  }
  
  return (
    <li
      className = {styles.li}
      ref={menuItemRef}
      onClick={onClick}
      style={{
        padding: "0 0.3em 0 0.3em",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        borderRadius: "0.2em",
        whiteSpace: "nowrap",
        position: "relative"
      }}
      onMouseEnter={(e) => {
					setSubmenuVisible(true);
					// e.currentTarget.style.backgroundColor = "#f0f0f0";
					e.currentTarget.className = styles.lihover;
				}
			}
      onMouseLeave={(e) => {
					setSubmenuVisible(false);
					
					// this resets submenu position
					if(subMenuLeftRef)
					{
						setSubmenuWidth(Math.max(getWidestChildWidth(subMenuLeftRef), subMenuMinWidth));
					}
					// e.currentTarget.style.backgroundColor = "";
					e.currentTarget.className = styles.li;
				}
			}
    >
      {data.icon && typeof data.icon === 'string' && (
        <img
          src={data.icon}
          alt={data.label || "icon"}
          title={data.title || data.label}
          style={{ marginRight: "8px", width: "16px", height: "16px", backgroundColor: "drop-shadow(0px 0px 1px white)" }}
        />
      )}
      
      {data.icon && typeof data.icon !== 'string' && (
        <data.icon style={{color: data.iconColor, marginRight: "8px", width: "16px", height: "16px" }} />
      )}
      
      {!data.icon && (
        <div className={styles.icon} style={{color: data.iconColor, marginRight: "8px", width: "16px", height: "16px" }}></div>
      )}
			
			{
        data.submenu ? (
          <span style={{display: "flex", width: "100%", gap: "0.1em"}}>
            <span style={{flex: "1"}}  title={data.title || data.label}>{data.label} </span>
            <span style={{color: "lightgray"}}>&gt;</span>
          </span>
        ) : 
        <span className={styles.label} style={{color: data.textColor}} title={data.title || data.label}>{data.label}
        </span> 
      }

      {data.submenu && submenuVisible && !submenuPosition.overflow && (
				<SubMenu
					submenudata={data.submenu}
					submenuPosition={submenuPosition}
					onClick={onClick}
					contextMenuRef={contextMenuRef}
					subMenuLeftRef={subMenuLeftRef}
					subMenuRightRef={subMenuRightRef}
          cellData = {cellData}
				/>
			)}
			
      {data.submenu && submenuVisible && subMenuLeftRef?.current && submenuPosition.overflow && ReactDOM.createPortal((
				<SubMenu
					submenudata={data.submenu}
					submenuPosition={submenuPosition}
					onClick={onClick}
					contextMenuRef={contextMenuRef}
					subMenuLeftRef={subMenuLeftRef}
					subMenuRightRef={subMenuRightRef}
          cellData={cellData}
				/>
			), subMenuLeftRef.current)}
    </li>
  );
};

export default MenuItem;
