import { useEffect } from "react";
import Prefs from "../Core/Prefs";

const Shortcuts = () => {
  useEffect(() => {
    let zoom = 1.0;
    const minZoom = 0.5;
    const maxZoom = 3.0;
    const step = 0.1;

    const applyZoom = (newZoom: number) => {
      zoom = Math.min(maxZoom, Math.max(minZoom, newZoom));

      // Apply zoom to the table content only, not the entire wrapper
      const table = document.querySelector(".main-table") as HTMLElement;
      const tableHeaders = document.querySelectorAll(".main-table thead th") as NodeListOf<HTMLElement>;

      if (table) {
        // Set font size for the table content
        table.style.fontSize = `${zoom}em`;
        
        // Optionally, adjust headers as well
        // tableHeaders.forEach((header) => {
          // header.style.fontSize = `${zoom}em`;
        // });

        Prefs.set("page-zoom", zoom.toFixed(2));
      }
    };

    const initZoom = async () => {
      const savedZoom = parseFloat(await Prefs.get("page-zoom") || "1.0");
      applyZoom(savedZoom);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && (e.key === "+" || e.key === "=")) {
        e.preventDefault();
        applyZoom(zoom + step);
      } else if (e.ctrlKey && e.key === "-") {
        e.preventDefault();
        applyZoom(zoom - step);
      }
    };

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
        applyZoom(zoom - Math.sign(e.deltaY) * step);
      }
    };

    initZoom();

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("wheel", handleWheel);
    };
  }, []);

  return null;
};

export default Shortcuts;
