import React, { useState, useEffect } from "react";
import styles from "./Dialog.module.css";

interface DialogProps {
  title: string;
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  buttons: any[];
}

const Dialog: React.FC<DialogProps> = ({ title, isOpen, onClose, children, buttons}) => {
  if (!isOpen) return null;

  const [size, setSize] = useState({ width: 600, height: 400 });
  const [position, setPosition] = useState({ x: 100, y: 100 });
  const [dragging, setDragging] = useState(false);
  const [resizing, setResizing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (isOpen) {
      const centerX = (window.innerWidth - size.width) / 2;
      const centerY = (window.innerHeight - size.height) / 2;
      setPosition({ x: centerX, y: centerY });
    }
  }, [isOpen, size.width, size.height]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setDragging(true);
    setStartPos({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (dragging) {
      setPosition({ x: e.clientX - startPos.x, y: e.clientY - startPos.y });
    }
    if (resizing) {
      setSize({
        width: Math.max(200, e.clientX - position.x),
        height: Math.max(150, e.clientY - position.y),
      });
    }
  };

  const handleMouseUp = () => {
    setDragging(false);
    setResizing(false);
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  useEffect(() => {
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  });

  const inline_styles = {
    overlay: {
      position: "fixed" as const,
      top: 0,
      left: 0,
      width: "100vw",
      height: "100vh",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 3000,
    },
    content: {
      position: "absolute" as const,
      top: `${position.y}px`,
      left: `${position.x}px`,
      backgroundColor: "white",
      borderRadius: "0.5em",
      width: `${size.width}px`,
      height: `${size.height}px`,
      padding: "0.2em",
      boxShadow: "0 4px 8px rgba(0, 0, 0, 0.2)",
      cursor: dragging ? "grabbing" : "default",
      display: "flex",
      flexDirection: "column" as const,
    },
    
    header: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      cursor: "grab",
      padding: "0.5em",
      height: "2em",
    },
    closeButton: {
      background: "none",
      border: "none",
      fontSize: "1.5rem",
      cursor: "pointer",
    },
    body: {
      flex: "1",
      overflow: "auto" as const,
      boxSizing: "border-box" as const,
      height: "calc(100% - 2em)",
      padding: "0.5em",
      width: "100%",
    },
    buttonwrapper: {
      textAlign: "right" as const,
      padding: "0.3em",
    },
    resizeHandle: {
      position: "absolute" as const,
      width: "10px",
      height: "10px",
      backgroundColor: "transparent",
      bottom: 0,
      right: 0,
      cursor: "se-resize",
    },
  };

  return (
    <div style={inline_styles.overlay} className={styles.overlay} onClick={onClose}>
      <div
        style={inline_styles.content}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div
          className={styles.header}
          style={inline_styles.header}
          onMouseDown={handleMouseDown}
          onMouseUp={() => setDragging(false)}
        >
          <h3>{title}</h3>
          <button style={inline_styles.closeButton} onClick={onClose}>
            &times;
          </button>
        </div>
        <div 
          className={styles.body}
          style={inline_styles.body}
          >
            {children}
          </div>

        <div style={inline_styles.buttonwrapper}>
          {buttons?.map((button, index) => (
            <button key={index} onClick={button.action}>{button.label}</button>
          ))}
        </div>

        <div
          style={inline_styles.resizeHandle}
          onMouseDown={(e) => {
            setResizing(true);
            e.stopPropagation();
          }}
        />
      </div>
    </div>
  );
};

export default Dialog;
